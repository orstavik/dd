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
  #requested = {};

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
    const promise = this.#portals[name];
    if (!promise)
      return this.#portals[name] = Portal;
    promise[Resolver](Portal);  //#1 this requires that the use of the getReaction is delayed a microTask tick, so that triggers run first.
    queueMicrotask(() => this.#portals[name] = Portal);
  }

  portalNameCache = {};
  get(fullName) {
    const name = this.portalNameCache[fullName] ??= fullName.split(/[._:]/)[0];
    return this.#portals[name] ??= PromiseResolver();
  }
}