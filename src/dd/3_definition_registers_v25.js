class DefinitionsMap {

  #root;
  #type;
  constructor(root, type) {
    this.#root = root;
    this.#type = type;
  }

  get root() {
    return this.#root;
  }

  get type() {
    return this.#type;
  }

  #definitions = {};
  #rules = {};

  /**
   * @param {*} name 
   * @param {Promise => {HOFunction => {Promise => {Attr, Function}} } || {rule, defs }} Def
   */
  #setRule(name, Def) {
    DoubleDots.cube?.("defineRule", { type: this.#type, root: this.#root, name, Def });
    this.#rules[name] = Def.rule ?? Def;
    if (!Def.defs)
      return;
    const defs = Object.entries(Def.defs);
    if (Object.keys(defs).some(fullname => !fullname.startsWith(name)))
      throw new SyntaxError(`defineRule(name, {defs}) naming mismatch: !"${fullname}".startsWith("${name}")`);
    for (let [fullname, def] of defs)
      this.#setDef(fullname, def);
  }

  #setDef(name, Def) {
    DoubleDots.cube?.("define", { type: this.#type, root: this.#root, name, Def });
    return this.#definitions[name] = Def;
  }

  defineRule(prefix, FunFun) {
    if (!prefix.match(/^[a-z0-9_\.-]+$/))
      throw new SyntaxError(`reaction and trigger rule names can only contain /^[a-z0-9_\.-]+$/: ${prefix}`);
    for (let r of Object.keys(this.#rules))
      if (r.startsWith(prefix) || prefix.startsWith(r))
        throw new SyntaxError(`rule/rule conflict: trying to add '${prefix}' when '${r}' exists.`);
    for (let fullname of Object.keys(this.#definitions))
      if (fullname.startsWith(prefix))
        throw new SyntaxError(`rule/name conflict: trying to add '${prefix}' when '${fullname}' exists.`);
    this.#setRule(prefix, FunFun);
    FunFun instanceof Promise && FunFun
      .then(newFunFun => this.#setRule(prefix, newFunFun))
      .catch(err => this.#setRule(prefix, err));
  }

  //Def can be either a class Attr, Function, or Promise.
  define(fullname, Def) {
    if (!fullname.match(/^[a-z0-9_\.-]+$/))
      throw new SyntaxError(`reaction and trigger names can only contain /^[a-z0-9_\.-]+$/: ${fullname}`);
    if (fullname in this.#definitions)
      throw new SyntaxError(`name/name conflict: '${fullname}' already exists.`);
    for (let r of Object.keys(this.#rules))
      if (fullname.startsWith(r))
        throw new SyntaxError(`name/rule conflict: trying to add '${fullname}' when rule '${r}' exists.`);
    this.#setDef(fullname, Def);
    Def instanceof Promise && Def
      .then(newDef => this.#setDef(fullname, newDef))
      .catch(err => this.#setDef(fullname, err));
  }

  #checkViaRule(fullname) {
    for (let [rule, FunFun] of Object.entries(this.#rules))
      if (fullname.startsWith(rule))
        return FunFun instanceof Error ? FunFun :
          typeof FunFun == "function" ? FunFun(fullname) :
            (async _ => (await FunFun, this.get(fullname)))(); //Promise
  }

  get(fullname) {
    return this.#definitions[fullname] ??= this.#checkViaRule(fullname);
  }
}

function TriggerSyntaxCheck(DefMap) {
  return class TriggerMap extends DefMap {
    defineRule(name, FunFun) {
      if (!name.match(/[a-z_].*/))
        throw new SyntaxError(`Trigger names must begin with /[a-z_]/, not '${name}'.`);
      return super.defineRule(name, FunFun);
    }

    define(name, Def) {
      if (!name.match(/[a-z_].*/))
        throw new SyntaxError(`Trigger names must begin with /[a-z_]/, not '${name}'.`);
      return super.define(name, Def);
    }
  };
}

function ReactionThisInArrowCheck(DefMap) { //todo add this to Reaction maps?
  return class ReactionMapNoThisInArrow extends DefMap {
    define(fullname, Def) {
      DoubleDots.ThisArrowFunctionError.check(Def);
      super.define(fullname, Def);
    }
  };
}

Object.defineProperties(Document.prototype, {
  Reactions: {
    get: function () {
      const map = new DefinitionsMap(this, "Reactions");
      Object.defineProperty(this, "Reactions", { value: map, enumerable: true });
      return map;
    }
  },
  Triggers: {
    get: function () {
      const TriggerMap = TriggerSyntaxCheck(DefinitionsMap);
      const map = new TriggerMap(this, "Triggers");
      Object.defineProperty(this, "Triggers", { value: map, enumerable: true });
      return map;
    }
  }
});
Object.defineProperties(ShadowRoot.prototype, {
  Reactions: { get: function () { return document.Reactions; } },
  Triggers: { get: function () { return document.Triggers; } },
});

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