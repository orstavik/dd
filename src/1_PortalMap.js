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

function verifyPortalDefinition(name, Portal) {
  if (!(Portal instanceof Object))
    throw new TypeError(`Portal Definition is not an object.`);
  let { onFirstConnect, onReConnect, onMove, onDisconnect, reaction } = Portal;
  if (!onFirstConnect && !reaction)
    throw new TypeError(`Portal Definition must have either a .onFirstConnect or .reaction property.`);
  if (!onFirstConnect && (onDisconnect || onReConnect || onMove))
    throw new TypeError(`Portal Definition must have .onFirstConnect if it defines onMove, onReConnect, or .onDisconnect.`);
  if (onDisconnect && !onReConnect)
    throw new TypeError(`Portal Definition must have .onReConnect if it defines .onDisconnect.`);
  return { name, onFirstConnect, onDisconnect, onMove, onReConnect, reaction };
}

export class PortalMap {

  #portals = Object.create(null);
  #portalRequests = Object.create(null);

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
      Portal = verifyPortalDefinition(name, Portal);
      const promises = Object.values(Portal).filter(o => o instanceof Promise);
      if (promises.length) await Promise.all(promises);
      Object.values(Portal).filter(o => typeof o === "function").forEach(checkArrowThis);
      this.#portals[name] = Portal;
      window.eventLoopCube?.connectPortal(name, Portal);
    } catch (err) {
      this.#portals[name] = new TypeError(`Error defining portal '${name}': ${err.message}`);
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