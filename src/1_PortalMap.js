//this is the attribute itself for all functions.
// const PortalDefinition = {
//   value: function(newValue,oldValue){ ... },
//   onFirstConnect: function(){...}, //always returns undefined
//   onMove: function(){...}, //always returns undefined
//   onReConnect: function() {...}, //always returns undefined
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

  #portals = Object.create(null);
  #portalRequests = Object.create(null);
  #root;

  setDocument(root) { this.#root = root; }

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
      let { onFirstConnect, onDisconnect, reaction, parseArguments, properties, value } = Portal;
      Portal = { onFirstConnect, onDisconnect, onMove, onReConnect, reaction, parseArguments, properties, value };
      if (!onFirstConnect && !reaction)
        throw new TypeError(`Portal Definition must have either a .onFirstConnect or .reaction property.`);
      if (!onFirstConnect && (properties || value || onDisconnect || onReConnect || onMove))
        throw new TypeError(`Portal Definition must have .onFirstConnect if it defines onMove, onReConnect, .properties, .value, or .onDisconnect.`);
      const promises = [onFirstConnect, onDisconnect, reaction, parseArguments, properties, value].filter(o => o instanceof Promise);
      if (promises.length)
        await Promise.all(promises);
      reaction && checkArrowThis(reaction);
      onFirstConnect && checkArrowThis(onFirstConnect);
      onMove && checkArrowThis(onMove);
      onReConnect && checkArrowThis(onReConnect);
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
      Portal = { name, onFirstConnect, onDisconnect, onMove, onReConnect, reaction, parseArguments, properties };
    } catch (err) {
      Portal = new TypeError(`Error defining portal '${name}': ${err.message}`);
    }
    this.#portals[name] = Portal;
    window.eventLoopCube.connectPortal(name, Portal, this.#root);     //TriggerReactionRaceCondition
    if (this.#portalRequests[name]) {                                 //TriggerReactionRaceCondition
      this.#portalRequests[name][Resolver](Portal);                   //TriggerReactionRaceCondition
      delete this.#portalRequests[name];
    }
  }

  get(portalName) {
    return this.#portals[portalName];
  }
  getReaction(portalName) {
    return this.#portals[portalName] ?? (this.#portalRequests[portalName] ??= PromiseResolver());
  }
}
/**
 * TriggerReactionRaceCondition
 * -------------------------------------------------------------------------
 * Ensure that when a new portal is registered, that the triggers for that portal 
 * in the DOM always trigger *before* any .reaction requests.
 * -------------------------------------------------------------------------
 * 
 * If both a reaction and trigger awaits the same portal definition, then
 * the reaction is often registered first in the FIFO microtask queue.
 * However, portals always function reaction => triggers (not the other way round).
 * This means that we always want all the portal's triggers to be ready before we run any of the portal's reactions.
 */