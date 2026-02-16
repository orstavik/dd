(() => {
  // src/0_FormSubmitRequestFix.js
  function FormSubmitRequestFix(HTMLFormElementProto = HTMLFormElement.prototype, HTMLButtonElementProto = HTMLButtonElement.prototype, HTMLInputElementProto = HTMLInputElement.prototype) {
    const submitOG = HTMLFormElementProto.submit;
    Object.defineProperty(HTMLFormElementProto, "submit", {
      value: function(submitter) {
        if (!submitter || formaction in submitter)
          return submitOG.call(this);
        const { formaction, formmethod, formenctype, formtarget } = submitter;
        const { action, method, enctype, target } = this;
        if (formaction && formaction !== action) this.action = formaction;
        if (formmethod && formmethod !== method) this.method = formmethod;
        if (formenctype && formenctype !== enctype) this.enctype = formenctype;
        if (formtarget && formtarget !== target) this.target = formtarget;
        submitOG.call(this);
        if (formaction && formaction !== action) this.action = action;
        if (formmethod && formmethod !== method) this.method = method;
        if (formenctype && formenctype !== enctype) this.enctype = enctype;
        if (formtarget && formtarget !== target) this.target = target;
      }
    });
    Object.defineProperty(HTMLFormElementProto, "request", {
      value: function() {
        if (this.method === "dialog")
          return;
        let { method, action, enctype, credentials = "include", rel } = this;
        const referrerPolicy = rel?.toLowerCase().split(" ").includes("noreferrer") && "no-referrer";
        if (method === "get") {
          action = new URL(action);
          action.search = new URLSearchParams(formData);
          return new Request(action, { method, credentials, referrerPolicy });
        } else if (enctype === "multipart/form-data") {
          return new Request(action, { method, credentials, referrerPolicy, body: new FormData(this) });
        } else if (enctype === "text/plain") {
          const body = [...formData].map(([k, v]) => `${k}=${v}`).join("\r\n");
          return new Request(action, { method, credentials, referrerPolicy, body, headers: { "Content-Type": "text/plain" } });
        }
        throw new Error("Cannot get the request for the given method : enctype: " + method + " : " + enctype);
      }
    });
    function submitterRequest() {
      const request = (this.type === "submit" || this.type === "image") && this.form?.request;
      if (!request) return;
      if (this.formaction) request.url = this.formaction;
      if (this.formmethod) request.method = this.formmethod;
      if (this.formenctype) request.enctype = this.formenctype;
      return request;
    }
    Object.defineProperty(HTMLButtonElementProto, "request", { value: submitterRequest });
    Object.defineProperty(HTMLInputElementProto, "request", { value: submitterRequest });
  }

  // src/0_NativeDefaultActions.js
  var NativeDefaultActions = {
    click: {
      matcher: "a[href], area[href], label, button[type=submit], button[type=reset], input, option, select, textarea,[contenteditable=true], [tabindex], form button:not([type]), details>summary:first-of-type",
      actions: {
        "a[href],area[href]": (t) => t.cloneNode().click(),
        "form :is([type=submit],[type=image],button:not([type]))": (el) => el.form?.submit(el),
        "label": (t) => (_) => t.control?.focus(),
        "summary": (t) => (_) => t.parentElement?.tagName === "DETAILS" && t.parentElement.toggleAttribute("open"),
        "[type=reset]": (t) => (_) => t.form?.reset(),
        "[type=checkbox],[type=radio]": (t) => (_) => t.toggleAttribute("checked"),
        "option": (t) => (_) => t.parentElement.value = t.value,
        //todo this seems weak
        "*": (t) => t.focus()
      }
    },
    //todo lots to add here, like tabbing around and stuff.
    keydown: {
      matcher: "a[href], area[href], input, textarea, [contenteditable=true], button[type=submit], button[type=reset], form button:not([type])",
      actions: {
        "a[href],area[href]": (t, e) => (e.key === "Enter" || e.key === " ") && t.cloneNode().click(),
        //space toggles, enter submits. But we don't include checkbox, radio, color...
        ":is(input,button):not([type=button],[type=reset],[type=file],[type=color],[type=range],[type=checkbox],[type=radio],[type=hidden])": (t, e) => e.key === "Enter" && t.form?.submit(t),
        "select": (t) => t.toggleAttribute("open"),
        //todo does this work?
        "*": (t) => t.hasFocus || t.focus()
        //adding or removing the enter character, we don't do,
      }
    }
  };
  function getNativeDefaultAction() {
    if (!this.isTrusted || this.defaultPrevented || !(this.type in NativeDefaultActions))
      return;
    const { matcher, actions } = NativeDefaultActions[this.type];
    for (let el = this.composedPath()[0]; el; el = el !== this.currentTarget && (el.assignedSlot ?? el.parentElement ?? el.parentNode?.host))
      if (el.matches(matcher)) {
        const defaultAction = (actions2, element) => {
          for (let m in actions2)
            if (element.matches(m))
              actions2[m](element, this);
        };
        defaultAction.element = el;
        defaultAction.native = true;
        return defaultAction;
      }
  }
  function exposeNativeDefaultAction(MouseEventProto = MouseEvent.prototype) {
    Object.defineProperty(MouseEventProto, "defaultAction", { get: getNativeDefaultAction });
  }

  // src/1_PortalMap.js
  var WeakDictionaryOfSets = class {
    #dict = /* @__PURE__ */ Object.create(null);
    #onEmpties = /* @__PURE__ */ Object.create(null);
    #gcInstance;
    #gcInterval;
    constructor(gc = 1e4) {
      this.#gcInterval = gc;
    }
    put(name, value, onEmptyCb) {
      const set = this.#dict[name] ??= /* @__PURE__ */ new Set();
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
  };
  var Resolver = Symbol("Resolver");
  var PromiseResolver = (r) => Object.assign(new Promise((f) => r = f), { [Resolver]: r });
  function checkFunction(func) {
    if (typeof func !== "function")
      return `not a function, but a ` + typeof func;
    let txt = func.toString();
    if (!/^(async\s+|)(\(|[^([]+=)/.test(txt))
      return;
    txt = txt.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, "");
    txt = txt.replace(/(["'])(?:(?=(\\?))\2.)*?\1/g, "");
    txt = txt.replace(/(`)(?:(?=(\\?))\2.)*?\1/g, "");
    if (/\bthis\b/.test(txt))
      return 'arrow function with "this"';
  }
  function verifyPortalDefinition(Portal3) {
    if (!(Portal3 instanceof Object))
      throw `not an object, but a ` + typeof Portal3;
    let { onFirstConnect, onReConnect, onMove, onDisconnect, reaction } = Portal3;
    if (!onFirstConnect && !reaction)
      throw `missing both .onFirstConnect and .reaction`;
    if (!onFirstConnect && (onDisconnect || onReConnect || onMove))
      throw `missing .onFirstConnect, but defining either onMove, onReConnect, or .onDisconnect.`;
    if (onDisconnect && !onReConnect)
      throw `missing .onReConnect, but defining .onDisconnect.`;
    Portal3 = Object.freeze({ onFirstConnect, onDisconnect, onMove, onReConnect, reaction });
    for (let [k, v] of Object.entries(Portal3))
      if (v && (v = checkFunction(v)))
        throw `.${k} is ${v}`;
    return Portal3;
  }
  var PortalMap = class {
    #portals = /* @__PURE__ */ Object.create(null);
    #portalRequests = /* @__PURE__ */ Object.create(null);
    #portalUnresolved = /* @__PURE__ */ Object.create(null);
    define(name, Portal3) {
      if (!name.match(/^[a-z][a-z0-9]*$/))
        throw new SyntaxError(`Illegal portal name: '${name}'.`);
      if (name in this.#portalUnresolved)
        throw new ReferenceError(`Trying to define portal twice: ${name}.`);
      this.#portalUnresolved[name] = Portal3;
      this.#definePortal(name, Portal3);
    }
    #definePortal(name, Portal3) {
      if (Portal3 instanceof Promise)
        return Portal3.err((e) => e).then((P) => this.#definePortal(name, P));
      try {
        this.#portals[name] = verifyPortalDefinition(Portal3);
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
  };

  // src/1c_WindowDocumentEvents.js
  var TRIGGERS = new WeakDictionaryOfSets();
  function portalDispatch(e) {
    const res = TRIGGERS.get(e.type);
    res && eventLoopCube.dispatchBatch(e, res);
  }
  function Portal(NAME, root = document) {
    return {
      onFirstConnect: function() {
        TRIGGERS.put(NAME, this, (_) => root.removeEventListener(NAME, portalDispatch));
        root.addEventListener(NAME, portalDispatch);
      },
      reaction: () => portalDispatch(new Event(NAME))
    };
  }
  var DocumentOnlyEvents = ["readystatechange", "pointerlockchange", "pointerlockerror", "freeze", "prerenderingchange", "resume", "visibilitychange"];
  var WindowOnlyEvents = [
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
    "pagereveal"
  ];
  var Portals = /* @__PURE__ */ Object.create(null);
  Portals.dcl = Portal("DOMContentLoaded", document);
  Portals.youtubeiframeapiready = Portal("YouTubeIframeAPIReady", window);
  for (let type of DocumentOnlyEvents)
    Portals[type] = Portal(type, document);
  for (let type of WindowOnlyEvents)
    Portals[type] = Portal(type, window);

  // src/1b_DomEvents.js
  var DomEvents = [
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
  ];
  var NonBubblingEvents = /* @__PURE__ */ new Set([
    "focus",
    "blur",
    "load",
    "unload",
    "error",
    "abort",
    "mouseenter",
    "mouseleave",
    "scroll",
    "scrollend",
    "scrollsnapchange",
    "scrollsnapchanging"
  ]);
  var ComposedEvents = /* @__PURE__ */ new Set([
    "click",
    "auxclick",
    "dblclick",
    "mousedown",
    "mouseup",
    "focus",
    "blur",
    "pointerdown",
    "pointerup",
    "pointercancel",
    "pointerover",
    "pointerout",
    "pointerenter",
    "pointerleave"
  ]);
  var PassiveEvents = /* @__PURE__ */ new Set(["wheel", "mousewheel", "touchstart", "touchmove"]);
  function getTriggersComposedBubble(type, el) {
    let attrs, first;
    for (; el; el = el.assignedSlot ?? el.parentElement ?? el.parentNode.host)
      if (el[EventLoopCube.PORTAL]?.[type]) {
        for (let at of el.attributes)
          if (EventLoopCube.portalNames(at.name)[0] === type)
            !first ? first = at : (attrs ??= [first]).push(at);
      }
    return attrs ?? first;
  }
  function getTriggersComposedTarget(type, el) {
    let attrs, first;
    for (; el; el = el.assignedSlot ?? el.getRootNode()?.host)
      if (el[EventLoopCube.PORTAL]?.[type]) {
        for (let at of el.attributes)
          if (EventLoopCube.portalNames(at.name)[0] === type)
            !first ? first = at : (attrs ??= [first]).push(at);
      }
    return attrs ?? first;
  }
  function getTriggersBubble(type, el) {
    let attrs, first;
    for (; el && el instanceof HTMLElement; el = el.parentElement)
      if (el[EventLoopCube.PORTAL]?.[type]) {
        for (let at of el.attributes)
          if (EventLoopCube.portalNames(at.name)[0] === type)
            !first ? first = at : (attrs ??= [first]).push(at);
      }
    return attrs ?? first;
  }
  function getTriggersTarget(type, el) {
    let attrs, first;
    if (el[EventLoopCube.PORTAL]?.[type]) {
      for (let at of el.attributes)
        if (EventLoopCube.portalNames(at.name)[0] === type)
          !first ? first = at : (attrs ??= [first]).push(at);
    }
    return attrs ?? first;
  }
  function Portal2(TYPE, reaction) {
    const passive = PassiveEvents.has(TYPE);
    const bubbles = !NonBubblingEvents.has(TYPE);
    const composed = ComposedEvents.has(TYPE);
    const propagationPath = bubbles && composed ? getTriggersComposedBubble : composed ? getTriggersComposedTarget : bubbles ? getTriggersBubble : getTriggersTarget;
    const listener = function(e) {
      e.stopImmediatePropagation();
      const atOrAttrs = propagationPath(TYPE, e.currentTarget);
      atOrAttrs instanceof Array ? eventLoopCube.dispatchBatch(e, atOrAttrs) : eventLoopCube.dispatch(e, atOrAttrs);
    };
    reaction ??= function() {
      this.ownerElement.dispatchEvent(new Event(TYPE, { bubbles, composed, cancelable: !passive }));
    };
    return {
      onFirstConnect: function() {
        this.ownerElement.addEventListener(TYPE, listener, { passive: passive || this.name.includes("_passive") });
      },
      reaction
    };
  }
  var Portals2 = /* @__PURE__ */ Object.create(null);
  Portals2.click = Portal2("click", function() {
    this.ownerElement.click();
  });
  Portals2.submit = Portal2("submit", function() {
    this.ownerElement.requestSubmit();
  });
  for (let type of DomEvents)
    Portals2[type] ??= Portal2(type);

  // src/2_EventLoopCube.js
  var MicroFrame = class _MicroFrame {
    #i = 1;
    #inputs;
    constructor(event, at) {
      this.at = at;
      this.root = at.ownerElement.getRootNode();
      this.event = event;
      this.names = at.name.split(":");
      this.portalNames = EventLoopCube2.portalNames(at.name);
      this.#inputs = [event];
    }
    #checkLegalTail(type) {
      const i = this.names.indexOf("");
      if (i <= this.#i)
        return;
      this.event.preventDefault();
      const errorNames = [...this.names];
      errorNames[this.#i] += " >>awaits here<< ";
      errorNames[i - 1] += " >>defaultAction start<< ";
      throw new Error("A defaultAction is left behind an async reaction while " + type + ".\n" + errorNames.join(":"));
    }
    get result() {
      return this.#inputs[0];
    }
    getState() {
      return { at: this.at, event: this.event, inputs: this.#inputs, i: this.#i, names: this.names };
    }
    async run() {
      let portal;
      for (let re = this.names[this.#i]; re !== void 0; re = this.names[++this.#i]) {
        if (re === "") {
          this.#inputs.unshift(EventLoopCube2.DefaultAction);
          this.#i++;
          if (this.root.portals.getReaction(this.portalNames[this.#i]) instanceof Promise) {
            portal = new Error(`Asynchronous defaultActions: ":${this.names[this.#i]}" not yet loaded in "${this.at.name}"`);
            break;
          }
        }
        portal = this.root.portals.getReaction(this.portalNames[this.#i]);
        if (portal instanceof Promise) {
          this.#checkLegalTail("loading definition");
          portal = await portal;
        }
        if (portal instanceof Error) break;
        if (portal.reaction === null) {
          portal = new Error("reaction is null: " + re);
          break;
        }
        this.#inputs.unshift(portal.reaction.apply(this.at, this.#inputs));
        if (this.#inputs[0] instanceof Promise) {
          this.#checkLegalTail("executing function");
          try {
            this.#inputs[0] = await this.#inputs[0];
          } catch (err) {
            this.#inputs[0] = err;
          }
          if (this.#inputs[0] instanceof Error) break;
        }
        if (this.#inputs[0] === EventLoopCube2.Cancel) break;
        if (this.#inputs[0] === EventLoopCube2.Void) this.#inputs.shift();
      }
      if (portal instanceof Error) {
        console.error(portal);
        this.#inputs.unshift(portal);
      }
      return this.#inputs[0];
    }
    static make(e, at) {
      return new _MicroFrame(e, at);
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
    static init(owner, root) {
      const cube = new _EventLoopCube(root, 1e3, 3e3);
      owner.eventLoopCube = cube;
      cube.#root = root;
      cube.connectBranch(root);
      return cube;
    }
    #root;
    #cube;
    //[...events : [...microFrames]]  //todo in a more efficient world, this would be a single flat array.
    #I = 0;
    #J = 0;
    #active = false;
    #disconnectables = /* @__PURE__ */ new Map();
    constructor(disconnectInterval = 1e3, cleanupInterval = 3e3) {
      this.#cube = [];
      setInterval((_) => this.disconnect(), disconnectInterval);
    }
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
        if (row[0].event?.cancelable) {
          for (let j = this.#J - 1; j >= 0; j--)
            if (row[j].result === _EventLoopCube.DefaultAction) {
              const defActRes = row[j].run();
              if (defActRes === _EventLoopCube.Cancel)
                continue;
              defActRes.then?.((res) => {
                if (res === _EventLoopCube.Cancel)
                  throw new Error("defaultActions returned EventLoopCube.Cancel asynchronously: " + row[j].at.name);
              });
            }
        }
        this.#J = 0;
      }
      this.#active = false;
      return;
    }
    dispatch(e, at) {
      e && this.#active && this.#cube[this.#I]?.[0].event === e ? this.#cube[this.#I].push(MicroFrame.make(e, at)) : this.#loop([MicroFrame.make(e, at)]);
    }
    dispatchBatch(e, attrs) {
      e && this.#active && this.#cube[this.#I]?.[0].event === e ? this.#cube[this.#I].push(...attrs.map((at) => MicroFrame.make(e, at))) : this.#loop(attrs.map((at) => MicroFrame.make(e, at)));
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
        const task = !top[_EventLoopCube.PORTAL] ? "doFirstConnect" : top.isConnected ? "doMove" : "doReConnect";
        for (let el = top, subs = top.getElementsByTagName("*"), i = 0; el; el = subs[i++]) {
          if (task === "doFirstConnect") {
            if (!el.hasAttributes())
              continue;
            el[_EventLoopCube.PORTAL] = /* @__PURE__ */ Object.create(null);
            for (let at of el.attributes) {
              const portalName = _EventLoopCube.portalNames(at.name)[0];
              const portal = portalMap.get(portalName);
              el[_EventLoopCube.PORTAL][portalName] ||= false;
              if (portal?.onFirstConnect) {
                const res = portal.onFirstConnect.call(at);
                const frame = ConnectFrame.make("onFirstConnect", portal, at, res);
                if (res !== _EventLoopCube.Cancel) {
                  frames.push(frame);
                  el[_EventLoopCube.PORTAL][portalName] = portal;
                  el[_EventLoopCube.MOVEABLES] ||= !!portal.onMove;
                  el[_EventLoopCube.RECONNECTABLES] ||= !!portal.onReconnect;
                  portal.onDisconnect && this.#disconnectables.set(at, portal);
                }
              }
            }
          } else if (task === "doMove") {
            if (el[_EventLoopCube.MOVEABLES])
              for (let portalName in el[_EventLoopCube.PORTAL]) {
                const portal = el[_EventLoopCube.PORTAL][portalName];
                if (portal?.onMove) {
                  for (let at of el.attributes)
                    if (_EventLoopCube.portalNames(at.name)[0] === portalName)
                      frames.push(ConnectFrame.make("onMove", portal, at, portal.onMove.call(at)));
                }
              }
          } else if (task === "doReConnect") {
            if (el[_EventLoopCube.RECONNECTABLES])
              for (let portalName in el[_EventLoopCube.PORTAL]) {
                const portal = el[_EventLoopCube.PORTAL][portalName];
                if (portal?.onReconnect) {
                  for (let at of el.attributes)
                    if (_EventLoopCube.portalNames(at.name)[0] === portalName)
                      frames.push(ConnectFrame.make("onReConnect", portal, at, portal.onReconnect.call(at)));
                }
              }
          }
        }
      }
      frames.length && this.#loop(frames);
    }
    connectPortal(portalName, portal) {
      const frames = [];
      for (let el2 of this.#root.getElementsByTagName("*"))
        if (el2[_EventLoopCube.PORTAL]?.[portalName] === false) {
          if (el2[_EventLoopCube.PORTAL][portalName] = portal) {
            for (let at of el2.attributes)
              if (_EventLoopCube.portalNames(at.name)[0] === portalName)
                frames.push(ConnectFrame.make("onFirstConnect", portal, at, portal.onFirstConnect.call(at)));
          }
        }
      frames.length && this.#loop(frames);
    }
    static Cancel = Symbol("Cancel");
    static Void = Symbol("void");
    static DefaultAction = Symbol("DefaultAction");
    static PORTAL = Symbol("portals");
    static MOVEABLES = Symbol("moveables");
    static RECONNECTABLES = Symbol("reconnectables");
    static portalNames = (attrName) => NameCache[attrName] ??= attrName.split(":").map((n) => n.split(/[._]/)[0]);
  };
  var NameCache = /* @__PURE__ */ Object.create(null);
  setInterval((_) => Object.keys(NameCache).length > 5e3 && (NameCache = /* @__PURE__ */ Object.create(null)), 5e3);

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
  var TRIGGERS2 = new WeakDictionaryOfSets();
  var I = {
    onFirstConnect: function() {
      eventLoopCube.dispatch(null, this);
    }
  };
  var prevent = {
    reaction: (...args) => (args.at(-1).preventDefault(), EventLoopCube.Void)
  };
  function dispatchNav() {
    const navs = TRIGGERS2.get("nav")?.filter((at) => at.ownerElement?.isConnected);
    navs?.length && eventLoopCube.dispatchBatch(location, navs);
  }
  var Nav = {
    onFirstConnect: function() {
      TRIGGERS2.put("nav", this);
    },
    reaction: function(...args) {
      const e = args.at(-1);
      if (!e.eventPhase)
        return;
      if (e.type === "popstate")
        return dispatchNav("nav");
      const defaultActionElement = e.defaultAction?.element;
      if (!defaultActionElement)
        return EventLoopCube.Cancel;
      const href = defaultActionElement.href ?? defaultActionElement.request?.url;
      if (!href)
        return EventLoopCube.Cancel;
      const url = new URL(href);
      if (url.origin !== location.origin)
        return;
      const controller = this.ownerElement.getRootNode().querySelector("[data-nav]");
      if (controller) {
        const [whitelist, ...blacklist] = controller.getAttribute("data-nav").split(" ").map((s) => s.trim());
        if (!url.pathname.startsWith(whitelist))
          return;
        if (blacklist.some((bl) => url.pathname.startsWith(bl)))
          return;
      }
      e.preventDefault();
      history.pushState({}, "", url);
      dispatchNav();
    }
  };
  var log = {
    reaction: function(...args) {
      console.log(this, ...args);
    }
  };

  // src/dd.js
  FormSubmitRequestFix(HTMLFormElement.prototype, HTMLButtonElement.prototype, HTMLInputElement.prototype);
  exposeNativeDefaultAction();
  window.EventLoopCube = EventLoopCube2;
  document.portals = new PortalMap();
  Object.defineProperty(ShadowRoot.prototype, "portals", { value: document.portals });
  for (let [k, v] of Object.entries(Portals))
    document.portals.define(k, v);
  for (let [k, v] of Object.entries(Portals2))
    document.portals.define(k, v);
  document.portals.define("i", I);
  document.portals.define("prevent", prevent);
  document.portals.define("nav", Nav);
  document.portals.define("log", log);
  function init() {
    const cube = EventLoopCube2.init(window, document.documentElement);
    monkeyPatchAppendElements((...args) => cube.connectBranch(...args));
  }
  document.readyState !== "loading" ? init() : document.addEventListener("DOMContentLoaded", init);
})();
//# sourceMappingURL=dd.js.map
