(() => {
  // src/1_PortalMap.js
  var Resolver = Symbol("Resolver");
  var PromiseResolver = (r) => Object.assign(new Promise((f) => r = f), { [Resolver]: r });
  function checkArrowThis(func) {
    if (!(typeof func === "function"))
      return new ReferenceError(`.reaction is not a function: '${func}'`);
    let txt = func.toString();
    if (!/^(async\s+|)(\(|[^([]+=)/.test(txt))
      return func;
    txt = txt.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, "");
    txt = txt.replace(/(["'])(?:(?=(\\?))\2.)*?\1/g, "");
    txt = txt.replace(/(`)(?:(?=(\\?))\2.)*?\1/g, "");
    if (/\bthis\b/.test(txt))
      return new SyntaxError(`Arrow function reaction contains "this": ${func}`);
    return func;
  }
  var PortalMap = class {
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
        return Portal.catch((err) => err).then((Def) => this.#definePortal(name, Def));
      if (!(Portal instanceof Object))
        throw new TypeError(`Portal '${name}' must be an object.`);
      let { onConnect, onDisconnect, reaction, parseArguments, properties, value } = Portal;
      Portal = { onConnect, onDisconnect, reaction, parseArguments, properties, value };
      if (!onConnect && !reaction)
        throw new TypeError(`Portal '${name}' must have either a .onConnect or .reaction property.`);
      if (!onConnect && (properties || value))
        throw new TypeError(`Portal '${name}' must have .onConnect if it defines .properties or .value.`);
      const promises = [onConnect, onDisconnect, reaction, parseArguments, properties, value].filter((o) => o instanceof Promise);
      if (promises.length)
        return this.#portals[name] = Promise.all(promises).catch((err) => err).then((_) => this.#definePortal(name, Portal));
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
        const set = function(str) {
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
  };

  // src/2_EventLoopCube.js
  function* walkAttributes(root) {
    if (root.attributes)
      yield* Array.from(root.attributes);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    for (let n; n = walker.nextNode(); ) {
      yield* Array.from(n.attributes);
      if (n.shadowRoot)
        yield* walkAttributes(n.shadowRoot);
    }
  }
  var MicroFrame = class {
    #i = 1;
    #inputs;
    constructor(event, at) {
      this.at = at;
      this.root = at.ownerElement.getRootNode();
      this.event = event;
      this.names = at.name.split(":");
      this.#inputs = [event];
    }
    getState() {
      return { at: this.at, event: this.event, inputs: this.#inputs, i: this.#i, names: this.names };
    }
    run() {
      for (let re = this.names[this.#i]; re !== void 0; re = this.names[this.#i]) {
        const portal = this.root.portals.get(re);
        if (portal === null)
          return this.#endError(new Error("portal is null: " + re));
        if (portal instanceof Error)
          return this.#endError(portal);
        if (portal instanceof Promise)
          return portal.finally((_) => this.run());
        if (portal.reaction === null)
          return this.#endError(new Error("reaction is null: " + re));
        try {
          const res = portal.reaction.apply(this.at, this.#inputs);
          this.#inputs.unshift(res);
          if (res instanceof Promise)
            return res.then((oi) => this.#runSuccess(oi)).catch((err) => this.#endError(err)).finally((_) => this.run());
          this.#runSuccess(res);
        } catch (err) {
          return this.#endError(err);
        }
      }
    }
    #endError(err) {
      console.error(err);
      this.#inputs.unshift(err);
      this.#i = this.names.length;
    }
    #runSuccess(res) {
      this.#inputs[0] = res;
      this.#i = res === EventLoopCube2.Break ? this.names.length : this.#i + 1;
    }
  };
  var ConnectFrame = class {
    #state;
    #value;
    constructor(at) {
      this.at = at;
      this.portal = at.ownerElement.getRootNode().portals.get(at.name);
      this.#init();
      this.disconnect = this.portal.onDisconnect;
    }
    getState() {
      return {
        at: this.at,
        state: this.#state,
        value: this.#value
      };
    }
    async #init() {
      this.#state = "awaiting portal";
      this.portal = await this.portal;
      this.#state = "at disconnected while awaiting portal";
      if (!this.at.ownerElement.isConnected) return;
      this.#state = "portal null";
      if (this.portal === null) return;
      this.#state = "onConnect null";
      if (this.portal.onConnect == null) return;
      this.#state = "portal definition error";
      if (this.portal instanceof Error) return this.#value = this.portal;
      this.#state = "setting properties and calling onConnect";
      try {
        if (this.portal.properties)
          Object.defineProperties(this.at, this.portal.properties);
        this.#value = this.portal.onConnect.call(this.at);
        if (this.#value instanceof Promise) {
          this.#state = "awaiting onConnect";
          await this.#value;
        }
        this.#state = "connected";
      } catch (err) {
        this.#value = err;
        this.#state = "error calling onConnect or setting properties";
      }
    }
    async disconnect() {
      this.#state = "could not disconnect because not properly connected";
      if (this.#state !== "connected") return;
      this.#state = "calling disconnect on ConnectFrame that doesn't have onDisconnect.";
      if (this.portal.onDisconnect == null) return;
      try {
        this.#state = "calling onDisconnect";
        this.#value = this.portal.onDisconnect.call(this.at);
        if (this.#value instanceof Promise) {
          this.#state = "awaiting onDisconnect";
          await this.#value;
        }
        this.#state = "disconnected";
      } catch (err) {
        this.#value = err;
        this.#state = "error calling onDisconnect";
      }
    }
  };
  var EventLoopCube2 = class _EventLoopCube {
    static defaultCleanupFilter = (row) => {
    };
    constructor(disconnectInterval = 1e3, cleanupInterval = 3e3) {
      setInterval((_) => this.disconnect(), disconnectInterval);
      setInterval((_) => this.cleanup(), cleanupInterval);
    }
    static Break = Symbol("Break");
    #cube = [];
    //[...events : [...microFrames]]
    #I = 0;
    #J = 0;
    #active = false;
    #atToConnectFrames = /* @__PURE__ */ new WeakMap();
    get state() {
      return this.#cube.map((row) => row.getState?.() || row.map((mf) => mf.getState()));
    }
    #loop(newRow) {
      this.#cube.push(newRow);
      if (this.#active)
        return;
      this.#active = true;
      for (; this.#I < this.#cube.length; this.#I++) {
        const row = this.#cube[this.#I];
        for (; this.#J < row.length; this.#J++)
          row[this.#J].run();
        this.#J = 0;
      }
      this.#active = false;
      return;
    }
    dispatch(e, at) {
      this.#loop([new MicroFrame(e, at)]);
    }
    dispatchBatch(e, iter) {
      this.#loop([...iter].map((at) => new MicroFrame(e, at)));
    }
    connect(at) {
      if (this.#atToConnectFrames.has(at))
        return;
      const frame = new ConnectFrame(at);
      this.#atToConnectFrames.set(at, frame);
      this.#cube.push(frame);
    }
    disconnect() {
      for (let frame of this.#cube)
        if (frame instanceof ConnectFrame)
          frame.disconnect?.call(frame.at);
    }
    async cleanup(filter = _EventLoopCube.defaultCleanupFilter) {
      const keeps = this.#cube.slice(0, this.#I).filter(filter);
      this.#cube = [...keeps, this.#cube[this.#I]];
      this.#I = keeps.length;
    }
    connectBranch(...els) {
      for (let el of els)
        for (const at of walkAttributes(el))
          this.connect(at);
    }
  };

  // src/3_monkeyPatchAppendElements.js
  function monkeyPatchAppendElements(onNodesConnected) {
    function insertArgs(og, ...args) {
      if (!this.isConnected) return og.call(this, ...args);
      const res = og.call(this, ...args);
      onNodesConnected(...args);
      return res;
    }
    function insertArgs0(og, ...args) {
      if (!this.isConnected) return og.call(this, ...args);
      const res = og.call(this, ...args);
      onNodesConnected(args[0]);
      return res;
    }
    function insertArgs1(og, ...args) {
      if (!this.isConnected) return og.call(this, ...args);
      const res = og.call(this, ...args);
      onNodesConnected(args[1]);
      return res;
    }
    function range_surroundContent(og, ...args) {
      if (!this.isConnected) return og.call(this, ...args);
      const res = og.call(this, ...args);
      onNodesConnected(args[0]);
      return res;
    }
    function element_replaceWith(og, ...args) {
      if (!this.isConnected) return og.call(this, ...args);
      const res = og.call(this, ...args);
      onNodesConnected(...args);
      return res;
    }
    function parentnode_replaceChildren(og, ...args) {
      if (!this.isConnected) return og.call(this, ...args);
      const res = og.call(this, ...args);
      onNodesConnected(...args);
      return res;
    }
    function innerHTMLsetter(og, ...args) {
      if (!this.isConnected) return og.call(this, ...args);
      const res = og.call(this, ...args);
      onNodesConnected(...this.children);
      return res;
    }
    function outerHTMLsetter(og, ...args) {
      if (!this.isConnected) return og.call(this, ...args);
      const sibs = [...this.parentNode.children];
      const res = og.call(this, ...args);
      const sibs2 = [...this.parentNode.children].filter((n) => !sibs.includes(n));
      onNodesConnected(...sibs2);
      return res;
    }
    function insertAdjacentHTML_DD(og, position, ...args) {
      if (!this.isConnected) return og.call(this, position, ...args);
      let root, index;
      if (position === "afterbegin")
        root = this, index = 0;
      else if (position === "beforeend")
        root = this, index = this.children.length;
      else if (position === "beforebegin")
        root = this.parentNode, index = Array.prototype.indexOf.call(root.children, this);
      else if (position === "afterend")
        root = this.parentNode, index = Array.prototype.indexOf.call(root.children, this) + 1;
      const childCount = root.children.length;
      const res = og.call(this, position, ...args);
      const addCount = root.children.length - childCount;
      const newRoots = Array.from(root.children).slice(index, index + addCount);
      onNodesConnected(...newRoots);
      return res;
    }
    const map = [
      [Element.prototype, "append", insertArgs],
      [Element.prototype, "prepend", insertArgs],
      [Element.prototype, "before", insertArgs],
      [Element.prototype, "after", insertArgs],
      [Document.prototype, "append", insertArgs],
      [Document.prototype, "prepend", insertArgs],
      [DocumentFragment.prototype, "append", insertArgs],
      [DocumentFragment.prototype, "prepend", insertArgs],
      [Node.prototype, "appendChild", insertArgs0],
      [Node.prototype, "insertBefore", insertArgs0],
      [Node.prototype, "replaceChild", insertArgs0],
      [Range.prototype, "insertNode", insertArgs0],
      [Element.prototype, "insertAdjacentElement", insertArgs1],
      [Element.prototype, "replaceWith", element_replaceWith],
      [Element.prototype, "replaceChildren", parentnode_replaceChildren],
      [Document.prototype, "replaceChildren", parentnode_replaceChildren],
      [DocumentFragment.prototype, "replaceChildren", parentnode_replaceChildren],
      [Range.prototype, "surroundContents", range_surroundContent],
      [Element.prototype, "insertAdjacentHTML", insertAdjacentHTML_DD],
      [Element.prototype, "innerHTML", innerHTMLsetter],
      [ShadowRoot.prototype, "innerHTML", innerHTMLsetter],
      [Element.prototype, "outerHTML", outerHTMLsetter]
    ];
    for (const [obj, prop, monkey] of map) {
      let monkey2 = function(...args) {
        return monkey.call(this, og, ...args);
      };
      const d = Object.getOwnPropertyDescriptor(obj, prop);
      const og = d.value || d.set;
      Object.defineProperty(
        obj,
        prop,
        Object.assign({}, d, { [d.set ? "set" : "value"]: monkey2 })
      );
    }
  }

  // src/4_Portals.js
  var I = {
    onConnect: function() {
      eventLoopCube.dispatch(null, this);
    }
  };

  // dd.js
  var PORTALS = new PortalMap();
  Object.defineProperty(Document.prototype, "portals", { value: PORTALS });
  Object.defineProperty(ShadowRoot.prototype, "portals", { value: PORTALS });
  document.portals.define("i", I);
  var eventLoopCube2 = window.eventLoopCube = new EventLoopCube2(1e3, 3e3);
  window.EventLoopCube = EventLoopCube2;
  monkeyPatchAppendElements(eventLoopCube2.connectBranch.bind(eventLoopCube2));
  document.readyState !== "loading" ? eventLoopCube2.connectBranch(document.documentElement) : document.addEventListener("DOMContentLoaded", (_) => eventLoopCube2.connectBranch(document.documentElement));
})();
