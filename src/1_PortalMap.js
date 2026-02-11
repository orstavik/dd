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
    return new ReferenceError(`.reaction is not a function: '${func}'`);
  let txt = func.toString();
  if (!/^(async\s+|)(\(|[^([]+=)/.test(txt))  //alternative a
    return func;
  txt = txt.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, ''); //remove comments
  //ATT!! `${""}this` only works when "" is removed before ``
  txt = txt.replace(/(["'])(?:(?=(\\?))\2.)*?\1/g, '');   //remove "'-strings
  txt = txt.replace(/(`)(?:(?=(\\?))\2.)*?\1/g, '');   //remove `strings
  if (/\bthis\b/.test(txt))                      //the word this
    return new SyntaxError(`Arrow function reaction contains "this": ${func}`);
  return func;
}

export class PortalMap {

  #portals = {};
  #requested = {};

  define(name, Portal) {
    if (!name.match(/^[a-z][a-z0-9]*$/))
      throw new SyntaxError(`Illegal portal name: '${name}'.`);
    if (name in this.#portals)
      throw new ReferenceError(`Trying to define portal twice: ${name}.`);
    this.#definePortal(name, Portal);
  }

  #definePortal(name, Portal) {
    this.#portals[name] = Portal;
    if (Portal instanceof Promise)
      return Portal.catch(err => err).then(Def => this.#definePortal(name, Def));

    if (!(Portal instanceof Object))
      throw new TypeError(`Portal '${name}' must be an object.`);

    let { onConnect, onDisconnect, reaction, parseArguments, properties, value } = Portal;
    Portal = { onConnect, onDisconnect, reaction, parseArguments, properties, value };
    if (!onConnect && !reaction)
      throw new TypeError(`Portal '${name}' must have either a .onConnect or .reaction property.`);
    if (!onConnect && (properties || value))
      throw new TypeError(`Portal '${name}' must have .onConnect if it defines .properties or .value.`);

    const promises = [onConnect, onDisconnect, reaction, parseArguments, properties, value].filter(o => o instanceof Promise);
    if (promises.length)
      return this.#portals[name] = Promise.all(promises).catch(err => err).then(_ => this.#definePortal(name, Portal));

    reaction = reaction && checkArrowThis(reaction);
    onConnect = onConnect && checkArrowThis(onConnect);
    onDisconnect = onDisconnect && checkArrowThis(onDisconnect);
    parseArguments = parseArguments && checkArrowThis(parseArguments);
    value = value && checkArrowThis(value);
    for (let prop in Portal)
      if (Portal[prop] instanceof Error)
        this.#portals[name] = new ReferenceError(`Portal ${name} .${prop} failed to produce`, Portal[prop]);

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

    this.#portals[name] = { name, onConnect, onDisconnect, reaction, parseArguments, properties };
    if (name in this.#requested) {
      this.#requested[name][Resolver](this.#portals[name]);
      delete this.#requested[name];
    }
  }

  portalNameCache = {};
  get(fullName) {
    const name = this.portalNameCache[fullName] ??= fullName.split(/[._:]/)[0];
    return this.#portals[name] ?? (this.#requested[name] ??= PromiseResolver());
  }
}