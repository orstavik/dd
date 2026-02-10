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
  return func;
}

export class DefinitionsMap {

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
      return Portal.then(Def => this.#definePortal(name, Def));

    if (!(Portal instanceof Object))
      throw new TypeError(`Portal '${name}' must be an object.`);
    let { onConnect, onDisconnect, reaction, parseArguments, properties } = Portal;
    if (!onConnect && !reaction)
      throw new TypeError(`Portal '${name}' must have either a .onConnect or .reaction property.`);
    if (reaction instanceof Promise)
      reaction.then(checkArrowThis).catch(e => e).then(res => Portal.reaction = res);
    if (onConnect instanceof Promise)
      onConnect.then(checkArrowThis).catch(e => e).then(res => Portal.onConnect = res);
    if (onDisconnect instanceof Promise)
      onDisconnect.then(checkArrowThis).catch(e => e).then(res => Portal.onDisconnect = res);
    if (parseArguments instanceof Promise)
      parseArguments.then(checkArrowThis).catch(e => e).then(res => Portal.parseArguments = res);
    this.#portals[name] = { onConnect, onDisconnect, reaction, parseArguments, properties };
    if (name in this.#requested) {
      this.#requested[name][Resolver](this.#portals[name]);
      delete this.#requested[name];
    }
  }

  get(name) {
    return this.#portals[name] ?? (this.#requested[name] ??= PromiseResolver());
  }
}

const PORTALS = new DefinitionsMap();
Object.defineProperty(Document.prototype, "portals", { value: PORTALS });
Object.defineProperty(ShadowRoot.prototype, "portals", { value: PORTALS });