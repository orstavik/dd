//this is the attribute itself for all functions.
// const PortalDefinition = {
//   value: function(newValue,oldValue){ ... },
//   onConnect: function(){...}, //always returns undefined
//   onDisconnect: function(){...}, //always returns undefined
//   reaction: function(...args){...}, //can return a special thing to end the chain. otherwise whatever.
//   parseArguments: function(fullName){...}, //returns an array of something or undefined
//   properties: {dict}, // these properties will be Object.assign() on the node.
// }

const Resolver = Symbol("Resolver");
const PromiseResolver = r => Object.assign(new Promise(f => r = f), { [Resolver]: r });

function checkArrowThis(func) {
  if (!(typeof func === "function"))
    throw new ReferenceError(`.reaction is not a function: '${func}'`);
  let txt = func.toString();
  if (!/^(async\s+|)(\(|[^([]+=)/.test(txt))  //alternative a
    return;
  txt = txt.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, ''); //remove comments
  //ATT!! `${""}this` only works when "" is removed before ``
  txt = txt.replace(/(["'])(?:(?=(\\?))\2.)*?\1/g, '');   //remove "'-strings
  txt = txt.replace(/(`)(?:(?=(\\?))\2.)*?\1/g, '');   //remove `strings
  if (/\bthis\b/.test(txt))                      //the word this
    throw new SyntaxError(`Arrow function reaction contains "this": ${func}`);
}

export class PortalMap {

  #portals = {};

  define(name, Portal) {
    if (!name.match(/^[a-z][a-z0-9]*$/))
      throw new SyntaxError(`Illegal portal name: '${name}'.`);
    if (name in this.#portals && !this.#portals[name][Resolver])
      throw new ReferenceError(`Trying to define portal twice: ${name}.`);
    this.#definePortal(name, Portal);
  }

  async #definePortal(name, Portal) {
    try {
      if (Portal instanceof Promise)
        Portal = await Portal;
      if (!(Portal instanceof Object))
        throw new TypeError(`Portal Definition is not an object.`);
      let { onConnect, onDisconnect, reaction, parseArguments, properties, value } = Portal;
      Portal = { onConnect, onDisconnect, reaction, parseArguments, properties, value };
      if (!onConnect && !reaction)
        throw new TypeError(`Portal Definition must have either a .onConnect or .reaction property.`);
      if (!onConnect && (properties || value || onDisconnect))
        throw new TypeError(`Portal Definition must have .onConnect if it defines .properties, .value, or .onDisconnect.`);
      const promises = [onConnect, onDisconnect, reaction, parseArguments, properties, value].filter(o => o instanceof Promise);
      if (promises.length)
        await Promise.all(promises);
      reaction && checkArrowThis(reaction);
      onConnect && checkArrowThis(onConnect);
      onDisconnect && checkArrowThis(onDisconnect);
      parseArguments && checkArrowThis(parseArguments);
      value && checkArrowThis(value);
      if (value) {
        properties ??= {};
        const OG = Object.getOwnPropertyDescriptor(Attr.prototype, "value");
        const OGset = OG.set;
        const set = function (str) {
          const oldValue = this.value;
          OGset.call(this, str);
          value.call(this, str, oldValue);
        };
        properties.value = { ...OG, set };
      }
      Portal = { name, onConnect, onDisconnect, reaction, parseArguments, properties };
    } catch (err) {
      Portal = new TypeError(`Error defining portal '${name}': ${err.message}`);
    }
    if (!this.#portals[name])
      return this.#portals[name] = Portal;
    this.#portals[name][Resolver](Portal);             //ATT!!  TriggerReactionRaceCondition
    queueMicrotask(_ => this.#portals[name] = Portal); //ATT!!  TriggerReactionRaceCondition  STAGE 2
  }

  portalNameCache = {};
  getTrigger(fullName) {
    const name = this.portalNameCache[fullName] ??= fullName.split(/[._:]/)[0];
    return this.#portals[name] ??= PromiseResolver();
  }
  getReaction(fullName) {
    const res = this.getTrigger(fullName);
    return res[Resolver] ?
      res.then(portal => queueMicrotask(_ => portal)) : //ATT!!  TriggerReactionRaceCondition STAGE 1
      res;
  }
}
/**
 * TriggerReactionRaceCondition
 * -------------------------------------------------------------------------
 * How to ensure that portals always trigger queued .onConnected before any .reactions for the same portal?
 * -------------------------------------------------------------------------
 * 
 * If both a reaction and trigger awaits the same portal definition, then
 * the reaction is often registered first in the FIFO microtask queue.
 * However, portals always function reaction => triggers (not the other way round).
 * This means that we always want all the portal's triggers to be ready before we run any of the portal's reactions.
 * 
 * STAGE 1: Ensure that any already queued reactions are put at the end of the microtask queue.
 * STAGE 2: Ensure that any reactions encountered *sync* in the eventLoopCube loop() are queued until after the already
 * queued triggers are started.
 * STAGE 3: NOT fixed. If any triggers for this reaction are added during the running of the setup stage, 
 * they will be run after any added sync reactions. 
 */