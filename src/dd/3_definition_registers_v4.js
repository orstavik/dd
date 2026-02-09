class DefinitionError extends DoubleDots.DoubleDotsError {
  constructor(msg, fullname, rule, RuleFun) {
    super(msg);
    this.fullname = fullname;
    this.rule = rule;
    this.RuleFun = RuleFun;
  }
}

class TriggerNameError extends DefinitionError {
  constructor(fullname) {
    super(`Trigger name/prefix must begin with english letter or '_'.\n${fullname} begins with '${fullname[0]}'.`);
  }

  static check(name) {
    if (!name.match(/[a-z_].*/))
      throw new TriggerNameError(name);
  }
}

class DefinitionNameError extends DefinitionError {
  constructor(name) {
    super(`DoubleDots definition names and rule prefixes can only contain /^[a-z0-9_\.-]*$/: ${name}`);
  }
  static check(name) {
    if (!name.match(/^[a-z0-9_\.-]*$/))
      throw new DefinitionNameError(name);
  }
}

class AsyncDefinitionError extends DefinitionError {
  constructor(msg, fullname, rule, RuleFun) {
    super(msg, fullname, rule, RuleFun);
    //side-effect in constructor!!
    document.documentElement.dispatchEvent(new ErrorEvent(this));
  }
}

Object.assign(DoubleDots, {
  DefinitionError,
  TriggerNameError,
  DefinitionNameError,
  AsyncDefinitionError
});

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

  #setRule(name, Def) {
    DoubleDots.cube?.("defineRule", { type: this.#type, root: this.#root, name, Def });
    return this.#rules[name] = Def;
  }

  #setDef(name, Def) {
    DoubleDots.cube?.("define", { type: this.#type, root: this.#root, name, Def });
    return this.#definitions[name] = Def;
  }

  defineRule(prefix, FunFun) {
    //FunFun can be either a Function that given the prefix will produce either a class or a Function.
    //FunFun can also be a Promise.
    DefinitionNameError.check(prefix);
    for (let r of Object.keys(this.#rules))
      if (r.startsWith(prefix) || prefix.startsWith(r))
        throw new DefinitionError(`rule/rule conflict: trying to add '${prefix}' when '${r}' exists.`);
    for (let fullname of Object.keys(this.#definitions))
      if (fullname.startsWith(prefix))
        throw new DefinitionError(`rule/name conflict: trying to add '${prefix}' when '${fullname}' exists.`);
    // this.#ruleRE = new RegExp(`^(${Object.keys(this.#rules).join("|")}).*`, "g");
    this.#setRule(prefix, FunFun);
    FunFun instanceof Promise && FunFun
      .then(newFunFun => this.#setRule(prefix, newFunFun))
      .catch(err => this.#setRule(prefix, new AsyncDefinitionError(err, null, prefix)));
  }

  define(fullname, Def) {
    //Def can be either a class or a Function.
    //Def can also be a Promise.
    DefinitionNameError.check(fullname);
    if (fullname in this.#definitions)
      throw new DefinitionError(`name/name conflict: '${fullname}' already exists.`);
    for (let r of Object.keys(this.#rules))
      if (fullname.startsWith(r))
        throw new DefinitionError(`name/rule conflict: trying to add '${fullname}' when rule '${r}' exists.`);
    this.#setDef(fullname, Def);
    Def instanceof Promise && Def
      .then(newDef => this.#setDef(fullname, newDef))
      .catch(err => this.#setDef(fullname, new AsyncDefinitionError(err, fullname)));
  }

  #processRule(fullname, rule, FunFun) {
    if (FunFun instanceof Promise)
      return this.#definitions[fullname] = FunFun
        .then(newFunFun => (FunFun = newFunFun)(fullname))
        .catch(err => new AsyncDefinitionError(err, null, rule, null))
        .then(newDef => this.#setDef(fullname, newDef))
        .catch(err => this.#setDef(fullname, new AsyncDefinitionError(err, fullname, rule, FunFun)));

    try {
      if (FunFun instanceof Error)
        throw FunFun;
      const Def = this.#setDef(fullname, FunFun(fullname));
      Def instanceof Promise && Def
        .then(newDef => this.#setDef(fullname, newDef))
        .catch(err => this.#setDef(fullname, new AsyncDefinitionError(err, fullname, rule, FunFun)));
      return Def;
    } catch (err) {
      throw this.#setDef(fullname, new DefinitionError(err, fullname, rule, FunFun));
    }
  }

  #checkViaRule(fullname) {
    // alternative logic using a regex to match the name. Not sure this is better
    // for (let [_, prefix] of fullname.matchAll(this.#ruleRE))
    //   return this.#definitions[fullname] = this.#rules[prefix](fullname);
    for (let [rule, FunFun] of Object.entries(this.#rules))
      if (fullname.startsWith(rule))
        return this.#processRule(fullname, rule, FunFun);
  }

  get(fullname) {
    return this.#definitions[fullname] || this.#checkViaRule(fullname);
  }
}

/**
 * Whenever you request an unknown definition, 
 * you get an UnknownDefinition Promise.
 * When later a matching definition is added,
 * this promise will resolve with the new definition.
 * If this promise is rejected from the outside,
 * The UnknownDefinitionsMap will automatically clean
 * itself up.
 * 
 * To avoid memory leaks with !isConnected attributes,
 * a 10sec loop checks the UnknownDefinitions and removes 
 * any disconnected Promises.
 */
class UnknownDefinition extends Promise {
  static make(attr) {
    let resolve, reject;
    const promise = new UnknownDefinition((a, b) => {
      resolve = a;
      reject = b;
    });
    return Object.assign(promise, { resolve, reject, attr });
  }
}

const setTimeoutOG = setTimeout;
class PromiseMap {
  unknowns = {};
  #interval;

  make(fullname, attr) {
    const p = UnknownDefinition.make(attr);
    (this.unknowns[fullname] ??= []).push(p);
    p.catch(_ => this.remove(fullname, p));
    this.#interval || this.#cleanLoop();
    return p;
  }

  async #cleanLoop() {
    this.#interval = true;
    while (true) {
      await new Promise(r => setTimeoutOG(r, 10000));
      const all = Object.entries(this.unknowns);
      if (!all.length)
        return this.#interval = false;
      for (let [fullname, promises] of all)
        for (let p of promises.filter(p => !p.attr.isConnected))
          this.remove(fullname, p);
    }
  }

  remove(fullname, p) {
    const promises = this.unknowns[fullname];
    if (!promises)
      return;
    const i = promises.indexOf(p);
    if (i < 0)
      return;
    promises.splice(i, 1);
    !promises.length && delete this.unknowns[fullname];
  }

  complete(fullname) {
    const promises = this.unknowns[fullname];
    delete this.unknowns[fullname];
    for (let p of promises || [])
      try { p.resolve(); } catch (_) { } //Att!! handle errors outside
  }
  completeRule(rule) {
    for (let fullname in this.unknowns)
      if (fullname.startsWith(rule))
        this.complete(fullname);
  }
}

class UnknownDefinitionsMap extends DefinitionsMap {
  #unknowns = new PromiseMap();
  define(fullname, Def) {
    super.define(fullname, Def);
    this.#unknowns.complete(fullname);
  }

  defineRule(rule, FunClass) {
    super.defineRule(rule, FunClass);
    this.#unknowns.completeRule(rule);
  }

  //todo add attr
  get(fullname, attr) {
    return super.get(fullname) ?? this.#unknowns.make(fullname, attr);
  }
}

class DefinitionsMapLock extends DefinitionsMap {
  #lock;
  defineRule(rule, FunFun) {
    if (this.#lock)
      throw new DefinitionError("ShadowRoot too-late definition error for rule: " + rule);
    return super.defineRule(rule, FunFun);
  }

  define(name, Def) {
    if (this.#lock)
      throw new DefinitionError("ShadowRoot too-late definition error for definition: " + name);
    return super.define(name, Def);
  }

  get(name, attr) {
    this.#lock = true;
    return super.get(name, attr);
  }
}

//this map inherits
class DefinitionsMapDOM extends DefinitionsMapLock {
  get parentMap() {
    return this.root.host?.getRootNode()?.[this.type];
  }

  get(name, attr) {
    return super.get(name, attr) ?? this.parentMap.get(name, attr);
  }
}

class DefinitionsMapDOMOverride extends DefinitionsMapDOM {

  #cache = {};
  #rule;

  /**
   * "name|prefix.*|another-name|prefix2_.*"
   * and is simply wrapped in ^(...) to complete the regex query.
   */
  get rule() {
    if (this.#rule !== undefined)
      return this.#rule;
    const rider = this.root.host.getAttribute("override-" + this.type.toLowerCase());
    return this.#rule = rider && new RegExp(`^(${rider})$`);
  }

  /**
   * @param {string} name 
   * @returns {Definition} if the name has been overridden above.
   */
  overrides(name, attr) {
    return this.#cache[name] ??= this.parentMap?.overrides?.(name, attr) || this.rule?.exec(name) && super.get(name, attr);
  }

  /**
   * First, we check if there is an override root. If there is, we redirect the query directly to that root instead.
   * Second, we try to use our own definitions, and then inherited definitions.
   * @param {string} name 
   * @returns DefinitionsMap from the document that overrides the definition name 
   */
  get(name, attr) {
    return this.overrides(name, attr) || super.get(name, attr);
  }
}

function TriggerSyntaxCheck(DefMap) {
  return class TriggerMap extends DefMap {
    defineRule(prefix, FunFun) {
      TriggerNameError.check(prefix);
      super.defineRule(prefix, FunFun);
    }

    define(fullname, Def) {
      TriggerNameError.check(fullname);
      super.define(fullname, Def);
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
      const map = new UnknownDefinitionsMap(this, "Reactions");
      Object.defineProperty(this, "Reactions", { value: map, enumerable: true });
      return map;
    }
  },
  Triggers: {
    configurable: true,
    get: function () {
      const TriggerMap = TriggerSyntaxCheck(UnknownDefinitionsMap);
      const map = new TriggerMap(this, "Triggers");
      Object.defineProperty(this, "Triggers", { value: map, enumerable: true });
      return map;
    }
  }
});
Object.defineProperties(ShadowRoot.prototype, {
  Reactions: {
    configurable: true,
    get: function () {
      const map = new DefinitionsMapDOMOverride(this, "Reactions");
      Object.defineProperty(this, "Reactions", { value: map, enumerable: true });
      return map;
    }
  },
  Triggers: {
    configurable: true,
    get: function () {
      const TriggerMap = TriggerSyntaxCheck(DefinitionsMapDOMOverride);
      const map = new TriggerMap(this, "Triggers");
      Object.defineProperty(this, "Triggers", { value: map, enumerable: true });
      return map;
    }
  }
});

document.Triggers.define("_", AttrEmpty);

Object.assign(DoubleDots, {
  DefinitionsMap,
  DefinitionsMapLock,
  DefinitionsMapDOM,
  DefinitionsMapDOMOverride,
  UnknownDefinitionsMap,
  UnknownDefinition,
});
