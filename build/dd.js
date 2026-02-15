(() => {
  // src/1_PortalMap.js
  var Resolver = Symbol("Resolver");
  var PromiseResolver = (r) => Object.assign(new Promise((f) => r = f), { [Resolver]: r });
  function checkArrowThis(func) {
    if (!(typeof func === "function"))
      throw new ReferenceError(`.reaction is not a function: '${func}'`);
    let txt = func.toString();
    if (!/^(async\s+|)(\(|[^([]+=)/.test(txt))
      return;
    txt = txt.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, "");
    txt = txt.replace(/(["'])(?:(?=(\\?))\2.)*?\1/g, "");
    txt = txt.replace(/(`)(?:(?=(\\?))\2.)*?\1/g, "");
    if (/\bthis\b/.test(txt))
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
  var PortalMap = class {
    #portals = /* @__PURE__ */ Object.create(null);
    #portalRequests = /* @__PURE__ */ Object.create(null);
    #root;
    constructor(root) {
      this.#root = root;
    }
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
        const promises = Object.values(Portal).filter((o) => o instanceof Promise);
        if (promises.length) await Promise.all(promises);
        Object.values(Portal).filter((o) => typeof o === "function").forEach(checkArrowThis);
        this.#portals[name] = Portal;
        window.eventLoopCube.connectPortal(name, Portal, this.#root);
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
  };

  // src/1b_NativePortals.js
  var DocumentOnlyEvents = /* @__PURE__ */ new Set(["readystatechange", "pointerlockchange", "pointerlockerror", "freeze", "prerenderingchange", "resume", "visibilitychange"]);
  var WindowOnlyEvents = /* @__PURE__ */ new Set([
    "appinstalled",
    "beforeinstallprompt",
    "afterprint",
    "beforeprint",
    "beforeunload",
    "hashchange",
    "languagechange",
    "message",
    "messageerror",
    "offline",
    "online",
    "pagehide",
    "pageshow",
    "popstate",
    "rejectionhandled",
    "storage",
    "unhandledrejection",
    "unload",
    "devicemotion",
    "deviceorientation",
    "deviceorientationabsolute",
    "pageswap",
    "pagereveal",
    "YouTubeIframeAPIReady"
  ]);
  var DomEvents = /* @__PURE__ */ new Set([
    "touchstart",
    "touchmove",
    "touchend",
    "touchcancel",
    "beforexrselect",
    "abort",
    "beforeinput",
    "beforematch",
    "beforetoggle",
    "blur",
    "cancel",
    "canplay",
    "canplaythrough",
    "change",
    "click",
    "close",
    "contentvisibilityautostatechange",
    "contextlost",
    "contextmenu",
    "contextrestored",
    "cuechange",
    "dblclick",
    "drag",
    "dragend",
    "dragenter",
    "dragleave",
    "dragover",
    "dragstart",
    "drop",
    "durationchange",
    "emptied",
    "ended",
    "error",
    "focus",
    "formdata",
    "input",
    "invalid",
    "keydown",
    "keypress",
    "keyup",
    "load",
    "loadeddata",
    "loadedmetadata",
    "loadstart",
    "mousedown",
    "mouseenter",
    "mouseleave",
    "mousemove",
    "mouseout",
    "mouseover",
    "mouseup",
    "mousewheel",
    "pause",
    "play",
    "playing",
    "progress",
    "ratechange",
    "reset",
    "resize",
    "scroll",
    "securitypolicyviolation",
    "seeked",
    "seeking",
    "select",
    "slotchange",
    "stalled",
    "submit",
    "suspend",
    "timeupdate",
    "toggle",
    "volumechange",
    "waiting",
    "webkitanimationend",
    "webkitanimationiteration",
    "webkitanimationstart",
    "webkittransitionend",
    "wheel",
    "auxclick",
    "gotpointercapture",
    "lostpointercapture",
    "pointerdown",
    "pointermove",
    "pointerrawupdate",
    "pointerup",
    "pointercancel",
    "pointerover",
    "pointerout",
    "pointerenter",
    "pointerleave",
    "selectstart",
    "selectionchange",
    "animationend",
    "animationiteration",
    "animationstart",
    "transitionrun",
    "transitionstart",
    "transitionend",
    "transitioncancel",
    "copy",
    "cut",
    "paste",
    "command",
    "scrollend",
    "scrollsnapchange",
    "scrollsnapchanging",
    "beforecopy",
    "beforecut",
    "beforepaste",
    "search",
    "fullscreenchange",
    "fullscreenerror",
    "webkitfullscreenchange",
    "webkitfullscreenerror"
  ]);
  var allNames = /* @__PURE__ */ new Set(["dcl", ...DocumentOnlyEvents, ...WindowOnlyEvents, ...DomEvents]);
  var isReservedName = (name) => allNames.has(name) && new TypeError(`Cannot define native event name as portal '${name}'.`);
  var ListenerCache = /* @__PURE__ */ Object.create(null);
  var PASSIVE = /^(wheel|mousewheel|touchstart|touchmove)(?!-prevents)$/;
  function domEventOptions(NAME) {
    if (PASSIVE.test(NAME)) return { passive: true };
  }
  var ElementEvent = (NAME) => Object.freeze({
    onFirstConnect: function () {
      this.ownerElement.addEventListener(NAME, ListenerCache[NAME] ??= (e) => eventLoopCube.dispatch(e, this), domEventOptions(NAME));
    },
    reaction: function () {
      this.ownerElement.dispatchEvent(Object.assign(new Event(NAME, { bubbles: true })));
    }
  });
  var DocumentEvent = (NAME) => Object.freeze({
    onFirstConnect: function () {
      this.ownerElement.getRootNode().addEventListener(NAME, ListenerCache[NAME] ??= (e) => eventLoopCube.dispatch(e, this));
    },
    reaction: function () {
      this.ownerElement.getRootNode().dispatchEvent(Object.assign(new Event(NAME, { bubbles: true })));
    }
  });
  var WindowEvent = (NAME) => Object.freeze({
    onFirstConnect: function () {
      window.addEventListener(NAME, ListenerCache[NAME] ??= (e) => eventLoopCube.dispatch(e, this));
    },
    reaction: function () {
      window.dispatchEvent(Object.assign(new Event(NAME, { bubbles: true })));
    }
  });
  var CACHE = /* @__PURE__ */ Object.create(null);
  var getNativeEvent = (NAME) => {
    if (NAME in CACHE)
      return CACHE[NAME];
    const portal = NAME.split(/[._:]/)[0];
    return CACHE[NAME] = CACHE[portal] ?? (DomEvents.has(portal) ? ElementEvent(portal) : WindowOnlyEvents.has(portal) ? WindowEvent(portal) : DocumentOnlyEvents.has(portal) ? DocumentEvent(portal) : portal === "dcl" ? DocumentEvent("DOMContentLoaded") : void 0);
  };
  function NativePortalMap(PortalMap3) {
    return class NativePortalMap extends PortalMap3 {
      define(name, Portal) {
        return isReservedName(name) || super.define(name, Portal);
      }
      getReaction(name) {
        return getNativeEvent(name) ?? super.getReaction(name);
      }
      get(name) {
        return getNativeEvent(name) ?? super.get(name);
      }
    };
  }

  // src/2_EventLoopCube.js
  var NameCache = /* @__PURE__ */ Object.create(null);
  var portalNames = (attrName) => NameCache[attrName] ??= attrName.split(":").map((n) => n.split(/[._]/)[0]);
  setInterval((_) => Object.keys(NameCache).length > 5e3 && (NameCache = /* @__PURE__ */ Object.create(null)), 5e3);
  var MicroFrame = class {
    #i = 1;
    #inputs;
    constructor(event, at) {
      this.at = at;
      this.root = at.ownerElement.getRootNode();
      this.event = event;
      this.names = at.name.split(":");
      this.portalNames = portalNames(at.name);
      this.#inputs = [event];
    }
    getState() {
      return { at: this.at, event: this.event, inputs: this.#inputs, i: this.#i, names: this.names };
    }
    run() {
      for (let re = this.names[this.#i]; re !== void 0; re = this.names[this.#i]) {
        const portal = this.root.portals.getReaction(this.portalNames[this.#i]);
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
  var ConnectFrame = class _ConnectFrame {
    #state;
    #value;
    constructor(type, at, value, portal) {
      this.type = type;
      this.#state = type;
      this.at = at;
      this.portal = portal;
      this.#value = value;
    }
    async update() {
      this.#state = "awaiting value";
      try {
        this.#value = await this.#value;
        this.#state = this.type;
      } catch (err) {
        this.#value = err;
        this.#state = "error onFirstConnect";
      }
    }
    static make(type, portal, at, value) {
      const res = new _ConnectFrame(type, at, value, portal);
      if (value instanceof Promise)
        res.update();
      return res;
    }
    getState() {
      return {
        type: this.type,
        at: this.at,
        state: this.#state,
        value: this.#value
      };
    }
  };
  var EventLoopCube2 = class _EventLoopCube {
    static defaultCleanupFilter = (row) => {
    };
    constructor(disconnectInterval = 1e3, cleanupInterval = 3e3) {
      setInterval((_) => this.disconnect(), disconnectInterval);
    }
    static Break = Symbol("Break");
    #cube = [];
    //[...events : [...microFrames]]  //todo in a more efficient world, this would be a single flat array.
    #I = 0;
    #J = 0;
    #active = false;
    #disconnectables = /* @__PURE__ */ new Map();
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
          row[this.#J].run?.();
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
    disconnect() {
      for (let at of this.#disconnectables.keys())
        if (!at.ownerElement.isConnected) {
          const portal = this.#disconnectables.get(at);
          ConnectFrame.make("onDisconnect", portal, at, portal.onDisconnect?.call(at));
          this.#disconnectables.delete(at);
        }
    }
    async cleanup(filter = _EventLoopCube.defaultCleanupFilter) {
      const keeps = this.#cube.slice(0, this.#I).filter(filter);
      this.#cube = [...keeps, ...this.#cube.slice(this.#I)];
      this.#I = keeps.length;
    }
    connectBranch(...els) {
      const portalMap = els[0]?.ownerDocument.portals;
      const frames = [];
      for (let top of els) {
        const task = !top[PORTALS] ? "doFirstConnect" : top.isConnected ? "doMove" : "doReConnect";
        for (let el = top, subs = top.getElementsByTagName("*"), i = 0; el; el = subs[i++]) {
          if (task === "doFirstConnect") {
            if (!el.hasAttributes())
              continue;
            el[PORTALS] = /* @__PURE__ */ Object.create(null);
            for (let at of el.attributes) {
              const portalName = portalNames(at.name)[0];
              const portal = portalMap.get(portalName);
              el[PORTALS][portalName] ??= void 0;
              if (portal?.onFirstConnect) {
                const res = portal.onFirstConnect.call(at);
                const frame = ConnectFrame.make("onFirstConnect", portal, at, res);
                if (res !== _EventLoopCube.Cancel) {
                  frames.push(frame);
                  el[PORTALS][portalName] = portal;
                  el[MOVEABLES] ||= !!portal.onMove;
                  el[RECONNECTABLES] ||= !!portal.onReconnect;
                  portal.onDisconnect && this.#disconnectables.set(at, portal);
                }
              }
            }
          } else if (task === "doMove") {
            if (el[MOVEABLES])
              for (let portalName in el[PORTALS]) {
                const portal = el[PORTALS][portalName];
                if (portal?.onMove) {
                  for (let at of el.attributes)
                    if (portalNames(at.name)[0] === portalName)
                      frames.push(ConnectFrame.make("onMove", portal, at, portal.onMove.call(at)));
                }
              }
          } else if (task === "doReConnect") {
            if (el[RECONNECTABLES])
              for (let portalName in el[PORTALS]) {
                const portal = el[PORTALS][portalName];
                if (portal?.onReconnect) {
                  for (let at of el.attributes)
                    if (portalNames(at.name)[0] === portalName)
                      frames.push(ConnectFrame.make("onReConnect", portal, at, portal.onReconnect.call(at)));
                }
              }
          }
        }
      }
      frames.length && this.#loop(frames);
    }
    //todo the eventLoop should have a root! That is the problem.. I think this is a better fix!
    connectPortal(portalName, portal, root) {
      if (!root[PORTALS]) return;
      const frames = [];
      for (let el2 of root.getElementsByTagName("*"))
        if (portalName in el2[PORTALS]) {
          if (el2[PORTALS][portalName] = true) {
            for (let at of el2.attributes)
              if (portalNames(at.name)[0] === portalName)
                frames.push(new ConnectFrame(portal, at));
          }
        }
      frames.length && this.#loop(frames);
    }
  };
  var PORTALS = Symbol("portals");
  var MOVEABLES = Symbol("moveables");
  var RECONNECTABLES = Symbol("reconnectables");

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
      let monkey2 = function (...args) {
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
    onFirstConnect: function () {
      eventLoopCube.dispatch(null, this);
    }
  };

  // src/dd.js
  var eventLoopCube2 = window.eventLoopCube = new EventLoopCube2(1e3, 3e3);
  window.EventLoopCube = EventLoopCube2;
  monkeyPatchAppendElements((...args) => eventLoopCube2.connectBranch(...args));
  var PortalMap2 = NativePortalMap(PortalMap);
  document.portals = new PortalMap2(document);
  Object.defineProperty(ShadowRoot.prototype, "portals", { value: document.portals });
  document.portals.define("i", I);
  document.readyState !== "loading" ? eventLoopCube2.connectBranch(document.documentElement) : document.addEventListener("DOMContentLoaded", (_) => eventLoopCube2.connectBranch(document.documentElement));
})();
