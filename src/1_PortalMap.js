export class WeakDictionaryOfSets {
  #dict = Object.create(null);
  #onEmpties = Object.create(null);
  #gcInstance;
  #gcInterval;
  constructor(gc = 10_000) { this.#gcInterval = gc; }
  put(name, value, onEmptyCb) {
    const set = this.#dict[name] ??= new Set();
    set.add(new WeakRef(value));
    this.#onEmpties[name] = onEmptyCb;
    this.#gcInstance ||= this.#gc();
  }
  get(name) {
    if (!this.#dict[name])
      return;
    const set = this.#dict[name];
    let res;
    for (const wr of set) {
      const v = wr.deref();
      if (!v) set.delete(wr);
      else if (res) res.push(v);
      else res = [v];
    }
    return res;
  }
  #gc() {
    this.#gcInstance = setInterval(() => {
      for (const n in this.#dict) {
        const set = this.#dict[n];
        for (const wr of set)
          if (!wr.deref())
            set.delete(wr);
        if (set.size === 0) {
          this.#onEmpties[n]?.();
          delete this.#dict[n];
          delete this.#onEmpties[n];
        }
      }
      if (!Object.keys(this.#dict).length)
        this.#gcInstance = clearInterval(this.#gcInstance);
    }, this.#gcInterval);
  }
}

const Resolver = Symbol("Resolver");
const PromiseResolver = r => Object.assign(new Promise(f => r = f), { [Resolver]: r });

function checkFunction(func) {
  if (typeof func !== "function")
    return `not a function, but a ` + typeof func;
  let txt = func.toString();
  if (!/^(async\s+|)(\(|[^([]+=)/.test(txt))  //alternative a
    return;
  txt = txt.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, ''); //remove comments
  //ATT!! `${""}this` only works when "" is removed before ``
  txt = txt.replace(/(["'])(?:(?=(\\?))\2.)*?\1/g, '');   //remove "'-strings
  txt = txt.replace(/(`)(?:(?=(\\?))\2.)*?\1/g, '');   //remove `strings
  if (/\bthis\b/.test(txt))                      //the word this
    return 'arrow function with "this"';
}

function verifyPortalDefinition(Portal) {
  if (!(Portal instanceof Object))
    throw `not an object, but a ` + typeof Portal;
  let { onFirstConnect, onReConnect, onMove, onDisconnect, reaction } = Portal;
  if (!onFirstConnect && !reaction)
    throw `missing both .onFirstConnect and .reaction`;
  if (!onFirstConnect && (onDisconnect || onReConnect || onMove))
    throw `missing .onFirstConnect, but defining either onMove, onReConnect, or .onDisconnect.`;
  if (onDisconnect && !onReConnect)
    throw `missing .onReConnect, but defining .onDisconnect.`;
  Portal = Object.freeze({ onFirstConnect, onDisconnect, onMove, onReConnect, reaction });
  for (let [k, v] of Object.entries(Portal))
    if (v && (v = checkFunction(v)))
      throw `.${k} is ${v}`;
  return Portal;
}

export class PortalMap {

  #portals = Object.create(null);
  #portalRequests = Object.create(null);
  #portalUnresolved = Object.create(null);

  define(name, Portal) {
    if (!name.match(/^[a-z][a-z0-9]*$/))
      throw new SyntaxError(`Illegal portal name: '${name}'.`);
    if (name in this.#portalUnresolved)
      throw new ReferenceError(`Trying to define portal twice: ${name}.`);
    this.#portalUnresolved[name] = Portal;
    this.#definePortal(name, Portal);
  }

  #definePortal(name, Portal) {
    if (Portal instanceof Promise)
      return Portal.err(e => e).then(P => this.#definePortal(name, P));
    try {
      this.#portals[name] = verifyPortalDefinition(Portal);
      window.eventLoopCube?.connectPortal(name, this.#portals[name]);
    } catch (err) {
      this.#portals[name] = new TypeError(`Portal '${name}': ${err.message}`);
    } finally {
      this.#portalRequests[name]?.[Resolver](this.#portals[name]);
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