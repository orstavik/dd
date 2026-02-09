function ddToJs(n) {
  return n.replace(/-[a-z]/g, m => m[1].toUpperCase()).replace(".", "$$").replace("-", "$_");
}

class DefinitionsMap {

  static checkName(name) {
    const portal = name.match(/^([a-z][a-z0-9]*)([a-z0-9_.-]*[^_.-])?$/);
    if (!portal)
      throw new SyntaxError(`Illegal reaction/trigger name: '${name}'.`);
    return portal[1];
  }

  #portals = {};
  #define(name, Def) {
    this.#portals[name] = Def;
    DoubleDots.cube?.("define", { name, Def });
    if (Def instanceof Promise)
      return Def.then(Def => this.#define(name, Def))
        .catch(err => this.#define(name, err));
  }

  define(name, Portal) {
    if (name in this.#portals)
      throw new ReferenceError(`Trying to redefine portal: ${name}.`);
    this.#define(name, Portal);
  }

  #cache = {};
  #tryPortal(fullname, portalName) {
    const Portal = this.#portals[portalName];
    if (!Portal) //accessed before definition will set as blank.
      return this.#cache[fullname] = this.#portals[portalName] = undefined;
    if (Portal instanceof Error)
      return this.#cache[fullname] = Portal;
    if (Portal instanceof Promise)
      return this.#cache[fullname] = (async _ => (await Portal, this.#tryPortal(fullname, portalName)))();

    //at this point we should have a working portal.
    //First, direct definition
    const jsName = ddToJs(fullname);
    let Def = Portal[jsName];
    if (Def instanceof Promise)
      return this.#cache[fullname] = (async _ => (await Portal, this.#tryPortal(fullname, portalName)))();
    if (Def)
      return this.#cache[fullname] = Def;

    //Second, try rule
    let ruleName = jsName.match(/^[a-z0-9]+(_|$$|$_)/);
    if (!ruleName)
      throw new ReferenceError(`Reaction/trigger '${fullname}' has no matching definition.`);
    ruleName = ruleName[0];
    const Rule = Portal[ruleName];
    if (!Rule)
      throw new ReferenceError(`Reaction/trigger '${fullname}' has no matching definition.`);
    if (Rule instanceof Error)
      return this.#cache[fullname] = Rule;
    if (Rule instanceof Promise)
      return this.#cache[fullname] = (async _ => (await Rule, this.#tryPortal(fullname, portalName)))();
    if (typeof Rule != "function")
      return this.#cache[fullname] = new TypeError(`Rule '${ruleName}' did not produce a function/Attr. typeof Rule: ${typeof Rule}. Portal: ${portalName}.`);
    try {
      Def = Rule(fullname);
      if (Def instanceof Promise)
        return this.#cache[fullname] =
          Def.then(Def => this.#cache[fullname] = Def)
            .catch(err => this.#cache[fullname] = err);
      return this.#cache[fullname] = Def;
    } catch (err) {
      return this.#cache[fullname] = err;
    }
  }

  getReaction(name) {
    if (name in this.#cache) return this.#cache[name];
    const portalName = DefinitionsMap.checkName(name);
    return this.#tryPortal(name, portalName);
  }

  getTrigger(name) {
    const trigger = "-" + name;
    if (trigger in this.#cache) return this.#cache[trigger];
    const portalName = DefinitionsMap.checkName(name);
    return this.#tryPortal(trigger, portalName);
  }
}

function ReactionThisInArrowCheck(DefMap) { //todo add this to Reaction maps?
  return class ReactionMapNoThisInArrow extends DefMap {
    define(fullname, Def) {
      DoubleDots.ThisArrowFunctionError.check(Def);
      super.define(fullname, Def);
    }
  };
}

const definitionsMap = new DefinitionsMap();
const dp = definitionsMap.define.bind(definitionsMap);
const gr = definitionsMap.getReaction.bind(definitionsMap);
const gt = definitionsMap.getTrigger.bind(definitionsMap);

Object.defineProperty(Document.prototype, "definePortal", { value: dp });
Object.defineProperty(Document.prototype, "getReaction", { value: gr });
Object.defineProperty(Document.prototype, "getTrigger", { value: gt });
Object.defineProperty(ShadowRoot.prototype, "definePortal", { value: dp });
Object.defineProperty(ShadowRoot.prototype, "getReaction", { value: gr });
Object.defineProperty(ShadowRoot.prototype, "getTrigger", { value: gt });

DoubleDots.DefinitionsMap = DefinitionsMap;

//Best practice: define before use. The limitation is that the call to define them *must* come before the first call to use them.
//1. For static defintions and use, just define all functions on top of the document, before use.
//   This can be checked by tooling up front.
//2. You can also dynamically define and use defintions and rules.
//   You only need to define the dynamically created methods before you add them as triggers in the document, 
//   or access them as reactions.
//
//* Note! Definitions can be loaded async! So you only need to specify from where you are going to get the definition,
//   you don't need the ready definition for it to work.