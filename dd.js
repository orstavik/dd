(() => {
  var __defProp = Object.defineProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // src/0_UrlLocationSegments.js
  function segments() {
    return this.pathname.split("/").slice(1);
  }
  function patchSegments(...protos) {
    for (let proto of protos)
      if (proto)
        Object.defineProperty(proto, "segments", { get: segments, configurable: true });
  }

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
          const body = [...formData].map(([k2, v2]) => `${k2}=${v2}`).join("\r\n");
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
        "a[href],area[href]": (t2) => t2.cloneNode().click(),
        "form :is([type=submit],[type=image],button:not([type]))": (el) => el.form?.submit(el),
        "label": (t2) => (_2) => t2.control?.focus(),
        "summary": (t2) => (_2) => t2.parentElement?.tagName === "DETAILS" && t2.parentElement.toggleAttribute("open"),
        "[type=reset]": (t2) => (_2) => t2.form?.reset(),
        "[type=checkbox],[type=radio]": (t2) => (_2) => t2.toggleAttribute("checked"),
        "option": (t2) => (_2) => t2.parentElement.value = t2.value,
        //todo this seems weak
        "*": (t2) => t2.focus()
      }
    },
    //todo lots to add here, like tabbing around and stuff.
    keydown: {
      matcher: "a[href], area[href], input, textarea, [contenteditable=true], button[type=submit], button[type=reset], form button:not([type])",
      actions: {
        "a[href],area[href]": (t2, e2) => (e2.key === "Enter" || e2.key === " ") && t2.cloneNode().click(),
        //space toggles, enter submits. But we don't include checkbox, radio, color...
        ":is(input,button):not([type=button],[type=reset],[type=file],[type=color],[type=range],[type=checkbox],[type=radio],[type=hidden])": (t2, e2) => e2.key === "Enter" && t2.form?.submit(t2),
        "select": (t2) => t2.toggleAttribute("open"),
        //todo does this work?
        "*": (t2) => t2.hasFocus || t2.focus()
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
          for (let m2 in actions2)
            if (element.matches(m2))
              actions2[m2](element, this);
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
        const v2 = wr.deref();
        if (!v2) set.delete(wr);
        else if (res) res.push(v2);
        else res = [v2];
      }
      return res;
    }
    #gc() {
      this.#gcInstance = setInterval(() => {
        for (const n2 in this.#dict) {
          const set = this.#dict[n2];
          for (const wr of set)
            if (!wr.deref())
              set.delete(wr);
          if (set.size === 0) {
            this.#onEmpties[n2]?.();
            delete this.#dict[n2];
            delete this.#onEmpties[n2];
          }
        }
        if (!Object.keys(this.#dict).length)
          this.#gcInstance = clearInterval(this.#gcInstance);
      }, this.#gcInterval);
    }
  };
  function memoizeAsync(fn, maxLimit = 1e4) {
    let cache = /* @__PURE__ */ Object.create(null);
    let size = 0;
    const keepCount = Math.floor(maxLimit / 2);
    return function(strArg) {
      const cached = cache[strArg];
      if (cached !== void 0)
        return cached;
      if (size > maxLimit) {
        const newCache = /* @__PURE__ */ Object.create(null);
        let i3 = keepCount;
        for (const key in cache) {
          if (!i3--) break;
          newCache[key] = cache[key];
        }
        cache = newCache;
        size = keepCount;
      }
      size++;
      let res = fn(strArg);
      if (res instanceof Promise)
        res = res.then(
          (result) => cache[strArg] = result,
          (cause) => cache[strArg] = new Error(fn.name + ": " + strArg, { cause })
        );
      return cache[strArg] = res;
    };
  }
  var Resolver = Symbol("Resolver");
  var PromiseResolver = (r2) => Object.assign(new Promise((f2) => r2 = f2), { [Resolver]: r2 });
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
  function verifyPortalDefinition(Portal4) {
    if (!(Portal4 instanceof Object))
      throw `not an object, but a ` + typeof Portal4;
    let { onFirstConnect, onReConnect, onMove, onDisconnect, reaction } = Portal4;
    if (!onFirstConnect && !reaction)
      throw `missing both .onFirstConnect and .reaction`;
    if (!onFirstConnect && (onDisconnect || onReConnect || onMove))
      throw `missing .onFirstConnect, but defining either onMove, onReConnect, or .onDisconnect.`;
    if (onDisconnect && !onReConnect)
      throw `missing .onReConnect, but defining .onDisconnect.`;
    Portal4 = Object.freeze({ onFirstConnect, onDisconnect, onMove, onReConnect, reaction });
    for (let [k2, v2] of Object.entries({ onFirstConnect, onDisconnect, onMove, onReConnect }))
      if (v2 &&= checkFunction(v2))
        throw `.${k2} is ${v2}`;
    return Portal4;
  }
  var PortalMap = class {
    #portals = /* @__PURE__ */ Object.create(null);
    #portalRequests = /* @__PURE__ */ Object.create(null);
    #portalUnresolved = /* @__PURE__ */ Object.create(null);
    define(name, Portal4) {
      if (!name.match(/^[a-z][a-z0-9-]*$/))
        throw new SyntaxError(`Illegal portal name: '${name}'.`);
      if (name in this.#portalUnresolved)
        throw new ReferenceError(`Trying to define portal twice: ${name}.`);
      this.#portalUnresolved[name] = Portal4;
      this.#definePortal(name, Portal4);
    }
    #definePortal(name, Portal4) {
      if (Portal4 instanceof Promise)
        return Portal4.err((e2) => e2).then((P2) => this.#definePortal(name, P2));
      try {
        this.#portals[name] = verifyPortalDefinition(Portal4);
        window.eventLoopCube?.connectPortal(name, this.#portals[name]);
      } catch (cause) {
        this.#portals[name] = new TypeError(`Portal '${name}': ${cause.message}`, { cause });
      } finally {
        this.#portalRequests[name]?.[Resolver](this.#portals[name]);
        delete this.#portalRequests[name];
      }
    }
    get(portalName) {
      return this.#portals[portalName];
    }
    getWithCallback(portalName) {
      return this.#portals[portalName] ?? (this.#portalRequests[portalName] ??= PromiseResolver());
    }
    getReaction = memoizeAsync((reactionName) => {
      const portalName = reactionName.split(/[._]/)[0];
      const portal = this.#portals[portalName] ?? (this.#portalRequests[portalName] ??= PromiseResolver());
      return portal instanceof Promise ? portal.then((p2) => getReaction(p2, reactionName, portalName)) : getReaction(portal, reactionName, portalName);
    });
  };
  function getReaction(portal, reactionName, portalName) {
    if (portal instanceof Error)
      return portal;
    if (!portal.reaction)
      return new TypeError(`Portal '${portalName}': Reaction '${reactionName}': No reaction defined.`);
    try {
      const reaction = portal.reaction(reactionName);
      return reaction instanceof Promise ? reaction.then((r2) => r2, (cause) => new TypeError(`Portal '${portalName}': Reaction '${reactionName}': ${cause.message}`, { cause })) : reaction;
    } catch (cause) {
      return new TypeError(`Portal '${portalName}': Reaction '${reactionName}': ${cause.message}`, { cause });
    }
  }

  // src/1c_WindowDocumentEvents.js
  var TRIGGERS = new WeakDictionaryOfSets();
  function portalDispatch(e2) {
    const res = TRIGGERS.get(e2.type);
    res && eventLoopCube.dispatchBatch(e2, res);
  }
  function Portal(NAME, root = document) {
    return {
      onFirstConnect: function() {
        TRIGGERS.put(NAME, this, (_2) => root.removeEventListener(NAME, portalDispatch));
        root.addEventListener(NAME, portalDispatch);
      },
      reaction: (NAME2) => () => portalDispatch(new Event(NAME2))
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

  // src/1d_navigationViewport.js
  var t;
  if ("undefined" != typeof window && window.navigation) {
    const e2 = window.navigation;
    !function(t2) {
      if (!t2) throw new Error("Expected Navigation");
    }(e2), t = e2;
  }
  function e(t2) {
    return /* @__PURE__ */ function(t3) {
      return !!t3;
    }(t2) && ("string" == typeof t2.type || "symbol" == typeof t2.type);
  }
  var n = class extends Error {
    constructor(t2) {
      super("AbortError" + (t2 ? `: ${t2}` : "")), this.name = "AbortError";
    }
  };
  function i(t2) {
    return t2 instanceof Error && "AbortError" === t2.name;
  }
  var r = class extends Error {
    constructor(t2) {
      super("InvalidStateError" + (t2 ? `: ${t2}` : "")), this.name = "InvalidStateError";
    }
  };
  function o(t2) {
    return e(t2) && function(t3) {
      return t3.hasOwnProperty("signal");
    }(t2) && function(t3) {
      return /* @__PURE__ */ function(t4) {
        return "object" == typeof t4;
      }(t3) && "boolean" == typeof t3.aborted && "function" == typeof t3.addEventListener;
    }(t2.signal);
  }
  function s(t2, e2) {
    if (o(t2) && t2.signal.aborted && e2 instanceof Error && i(e2)) return true;
  }
  var a = Symbol.for("@opennetwork/environment/events/target/listeners");
  var c = Symbol.for("@opennetwork/environment/events/target/listeners/ignore");
  var u = Symbol.for("@opennetwork/environment/events/target/listeners/match");
  var h = Symbol.for("@opennetwork/environment/events/target/listeners/this");
  var l = Symbol.for("@opennetwork/environment/events/descriptor");
  function d(t2, e2, n2) {
    const i3 = function(t3) {
      return /* @__PURE__ */ function(t4) {
        return !!t4;
      }(t3) && true === t3[l];
    }(n2) ? n2 : void 0;
    return (n3) => i3 ? i3 === n3 : (!e2 || e2 === n3.callback) && t2 === n3.type;
  }
  function f(t2) {
    return "function" == typeof t2;
  }
  var g = Symbol.for("@virtualstate/navigation/event-target/descriptors");
  var v = class {
    [g] = [];
    [c] = /* @__PURE__ */ new WeakSet();
    get [a]() {
      return [...this[g] ?? []];
    }
    [u](t2) {
      const e2 = this[a], n2 = [.../* @__PURE__ */ new Set([...e2 ?? [], ...this[g] ?? []])].filter((e3) => e3.type === t2 || "*" === e3.type).filter((t3) => !this[c]?.has(t3)), i3 = "string" == typeof t2 ? this[`on${t2}`] : void 0;
      return "function" == typeof i3 && f(i3) && n2.push({ type: t2, callback: i3, [l]: true }), n2;
    }
    addEventListener(t2, e2, n2) {
      const i3 = { ...n2, isListening: () => !!this[g]?.find(d(t2, e2)), descriptor: { [l]: true, ...n2, type: t2, callback: e2 }, timestamp: Date.now() };
      i3.isListening() || this[g]?.push(i3.descriptor);
    }
    removeEventListener(t2, e2, n2) {
      if (!f(e2)) return;
      const i3 = this[a] ?? this[g] ?? [], r2 = i3.findIndex(d(t2, e2, n2));
      if (-1 === r2) return;
      const o2 = this[g]?.findIndex(d(t2, e2, n2)) ?? -1;
      -1 !== o2 && this[g]?.splice(o2, 1);
      const s2 = i3[r2];
      s2 && this[c]?.add(s2);
    }
    hasEventListener(t2, e2) {
      if (e2 && !f(e2)) return false;
      return (this[g]?.findIndex(d(t2, e2)) ?? -1) > -1;
    }
  };
  var p = class extends v {
    [h];
    constructor(t2 = void 0) {
      super(), this[h] = t2;
    }
    async dispatchEvent(t2) {
      const i3 = this[u]?.(t2.type) ?? [];
      if (o(t2) && t2.signal.aborted) throw new n();
      const r2 = e(a2 = t2) && false !== a2.parallel;
      var a2;
      const c2 = [];
      for (let e2 = 0; e2 < i3.length; e2 += 1) {
        const n2 = i3[e2], a3 = (async () => {
          n2.once && this.removeEventListener(n2.type, n2.callback, n2), await n2.callback.call(this[h] ?? this, t2);
        })();
        if (r2) c2.push(a3);
        else {
          try {
            await a3;
          } catch (e3) {
            s(t2, e3) || await Promise.reject(e3);
          }
          if (o(t2) && t2.signal.aborted) return;
        }
      }
      if (c2.length) {
        const e2 = (await Promise.allSettled(c2)).filter((t3) => "rejected" === t3.status);
        if (e2.length) {
          let n2 = e2;
          if (o(t2) && t2.signal.aborted && (n2 = n2.filter((e3) => !s(t2, e3.reason))), 1 === n2.length) throw await Promise.reject(n2[0].reason), n2[0].reason;
          if (n2.length > 1) throw new AggregateError(n2.map(({ reason: t3 }) => t3));
        }
      }
    }
  };
  var y = { EventTarget: p, AsyncEventTarget: p, SyncEventTarget: p };
  var m = y.EventTarget || y.SyncEventTarget || y.AsyncEventTarget;
  var w = class extends p {
    constructor(...t2) {
      if (super(), m) {
        !function(t3) {
          if ("function" != typeof t3) throw new Error("Could not load EventTarget implementation");
        }(m);
        const { dispatchEvent: e2 } = new m(...t2);
        this.dispatchEvent = e2;
      }
    }
  };
  var b = class extends w {
    addEventListener(t2, e2, n2) {
      return function(t3) {
        if ("function" != typeof t3) throw new Error("Please us the function variant of event listener");
      }(e2), super.addEventListener(t2, e2, "boolean" == typeof n2 ? { once: n2 } : n2);
    }
    removeEventListener(t2, e2, n2) {
      return function(t3) {
        if ("function" != typeof t3) throw new Error("Please us the function variant of event listener");
      }(e2), super.removeEventListener(t2, e2);
    }
  };
  var E = "crypto" in globalThis && "function" == typeof globalThis.crypto.randomUUID ? globalThis.crypto.randomUUID.bind(globalThis.crypto) : () => Array.from({ length: 5 }, () => `${Math.random()}`.replace(/^0\./, "")).join("-").replace(".", "");
  var S = Symbol.for("@virtualstate/navigation/getState");
  var k = Symbol.for("@virtualstate/navigation/entry/navigationType");
  var x = Symbol.for("@virtualstate/navigation/entry/knownAs");
  var T = Symbol.for("@virtualstate/navigation/entry/setState");
  function L(t2) {
    return "number" == typeof t2 || "boolean" == typeof t2 || "symbol" == typeof t2 || "bigint" == typeof t2 || "string" == typeof t2;
  }
  function P(t2) {
    return !(!t2 && !L(t2));
  }
  var I = class extends b {
    #t;
    #e;
    get index() {
      return "number" == typeof this.#t ? this.#t : this.#t();
    }
    key;
    id;
    url;
    sameDocument;
    get [k]() {
      return this.#n.navigationType;
    }
    get [x]() {
      const t2 = new Set(this.#n[x]);
      return t2.add(this.id), t2;
    }
    #n;
    get [a]() {
      return [...super[a] ?? [], ...this.#n[a] ?? []];
    }
    constructor(t2) {
      super(), this.#n = t2, this.key = t2.key || E(), this.id = E(), this.url = t2.url ?? void 0, this.#t = t2.index, this.sameDocument = t2.sameDocument ?? true, this.#e = t2.state ?? void 0;
    }
    [S]() {
      return this.#n?.getState?.(this);
    }
    getState() {
      let t2 = this.#e;
      if (!P(t2)) {
        const e2 = this[S]();
        P(e2) && (t2 = this.#e = e2);
      }
      return void 0 === t2 || L(t2) ? t2 : ("function" == typeof t2 && (console.warn("State passed to Navigation.navigate was a function, this may be unintentional"), console.warn("Unless a state value is primitive, with a standard implementation of Navigation"), console.warn("your state value will be serialized and deserialized before this point, meaning"), console.warn("a function would not be usable.")), { ...t2 });
    }
    [T](t2) {
      this.#e = t2;
    }
  };
  function U(t2) {
    let e2, n2;
    const i3 = new Promise((t3, i4) => {
      e2 = t3, n2 = i4;
    });
    return R(e2), R(n2), { resolve: e2, reject: n2, promise: t2 ? i3.catch(t2) : i3 };
  }
  function R(t2) {
    if (!t2) throw new Error("Value not provided");
  }
  var C = "undefined" != typeof AbortController ? AbortController : void 0;
  if (!C) throw new Error("AbortController expected to be available or polyfilled");
  var D = C;
  function j(t2) {
    return A(t2) && "function" == typeof t2.then;
  }
  function O(t2, e2 = "Expected value") {
    if (!t2) throw new Error(e2);
  }
  function N(t2) {
    return "rejected" === t2.status;
  }
  function A(t2) {
    return !!t2;
  }
  var F = { EVENT_INTERCEPT_HANDLER: "You are using a non standard interface, please update your code to use event.intercept({ async handler() {} })\nThis will be removed when the first major release of @virtualstate/navigation is published" };
  var q = false;
  var $ = true;
  function _(t2, ...e2) {
    if (!q) try {
      $ ? console.trace(F[t2], ...e2) : console.warn(F[t2], ...e2);
    } catch {
    }
  }
  var M = Symbol.for("@virtualstate/navigation/rollback");
  var W = Symbol.for("@virtualstate/navigation/unset");
  var K = Symbol.for("@virtualstate/navigation/transition/parentEventTarget");
  var z = Symbol.for("@virtualstate/navigation/transition/deferred/finished");
  var B = Symbol.for("@virtualstate/navigation/transition/deferred/committed");
  var G = Symbol.for("@virtualstate/navigation/transition/navigationType");
  var J = Symbol.for("@virtualstate/navigation/transition/entries/initial");
  var Y = Symbol.for("@virtualstate/navigation/transition/entries/finished");
  var Q = Symbol.for("@virtualstate/navigation/transition/index/initial");
  var X = Symbol.for("@virtualstate/navigation/transition/index/finished");
  var Z = Symbol.for("@virtualstate/navigation/transition/entry");
  var tt = Symbol.for("@virtualstate/navigation/transition/isCommitted");
  var et = Symbol.for("@virtualstate/navigation/transition/isFinished");
  var nt = Symbol.for("@virtualstate/navigation/transition/isRejected");
  var it = Symbol.for("@virtualstate/navigation/transition/known");
  var rt = Symbol.for("@virtualstate/navigation/transition/promises");
  var ot = Symbol.for("@virtualstate/navigation/intercept");
  var st = Symbol.for("@virtualstate/navigation/transition/isOngoing");
  var at = Symbol.for("@virtualstate/navigation/transition/isPending");
  var ct = Symbol.for("@virtualstate/navigation/transition/isAsync");
  var ut = Symbol.for("@virtualstate/navigation/transition/wait");
  var ht = Symbol.for("@virtualstate/navigation/transition/promise/resolved");
  var lt = Symbol.for("@virtualstate/navigation/transition/rejected");
  var dt = Symbol.for("@virtualstate/navigation/transition/beforeCommit");
  var ft = Symbol.for("@virtualstate/navigation/transition/commit");
  var gt = Symbol.for("@virtualstate/navigation/transition/finish");
  var vt = Symbol.for("@virtualstate/navigation/transition/start");
  var pt = Symbol.for("@virtualstate/navigation/transition/start/deadline");
  var yt = Symbol.for("@virtualstate/navigation/transition/error");
  var mt = Symbol.for("@virtualstate/navigation/transition/finally");
  var wt = Symbol.for("@virtualstate/navigation/transition/abort");
  var bt = Symbol.for("@virtualstate/navigation/transition/intercept/options/commit");
  var Et = Symbol.for("@virtualstate/navigation/transition/commit/isManual");
  var St = class extends w {
    finished;
    committed;
    from;
    navigationType;
    [ct] = false;
    [bt];
    #n;
    [z] = U();
    [B] = U();
    get [at]() {
      return !!this.#i.size;
    }
    get [G]() {
      return this.#n[G];
    }
    get [J]() {
      return this.#n[J];
    }
    get [Q]() {
      return this.#n[Q];
    }
    get [Et]() {
      return !(!this[bt]?.includes("after-transition") && !this[bt]?.includes("manual"));
    }
    [Y];
    [X];
    [tt] = false;
    [et] = false;
    [nt] = false;
    [st] = false;
    [it] = /* @__PURE__ */ new Set();
    [Z];
    #i = /* @__PURE__ */ new Set();
    #r = false;
    #o = new D();
    get signal() {
      return this.#o.signal;
    }
    get [rt]() {
      return this.#i;
    }
    constructor(t2) {
      super(), this[bt] = [], this[z] = t2[z] ?? this[z], this[B] = t2[B] ?? this[B], this.#n = t2;
      const e2 = this.finished = this[z].promise, i3 = this.committed = this[B].promise;
      e2.catch((t3) => t3), i3.catch((t3) => t3), this.from = t2.from, this.navigationType = t2.navigationType, this[Y] = t2[Y], this[X] = t2[X];
      const r2 = t2[it];
      if (r2) for (const t3 of r2) this[it].add(t3);
      this[Z] = t2[Z], this.addEventListener(ft, this.#s, { once: true }), this.addEventListener(gt, this.#a, { once: true }), this.addEventListener(ft, this.#c, { once: true }), this.addEventListener(gt, this.#u, { once: true }), this.addEventListener(yt, this.#h, { once: true }), this.addEventListener(wt, () => {
        if (!this[et]) return this[lt](new n());
      }), this.addEventListener("*", this[Z].dispatchEvent.bind(this[Z])), this.addEventListener("*", t2[K].dispatchEvent.bind(t2[K]));
    }
    rollback = (t2) => {
      if (this.#r) throw new r("Rollback invoked multiple times: Please raise an issue at https://github.com/virtualstate/navigation with the use case where you want to use a rollback multiple times, this may have been unexpected behaviour");
      return this.#r = true, this.#n.rollback(t2);
    };
    #c = () => {
      this[tt] = true;
    };
    #u = () => {
      this[et] = true;
    };
    #a = () => {
      this[z].resolve(this[Z]);
    };
    #s = () => {
      this.signal.aborted || this[B].resolve(this[Z]);
    };
    #h = (t2) => this[lt](t2.error);
    [ht] = (...t2) => {
      for (const e2 of t2) this.#i.delete(e2);
    };
    [lt] = async (t2) => {
      if (this[nt]) return;
      this[nt] = true, this[wt]();
      const e2 = this[G];
      if (("string" == typeof e2 || e2 === M) && (await this.dispatchEvent({ type: "navigateerror", error: t2, get message() {
        return t2 instanceof Error ? t2.message : `${t2}`;
      } }), e2 !== M && !((n2 = t2) instanceof Error && "InvalidStateError" === n2.name || i(t2)))) try {
        await this.rollback()?.finished;
      } catch (n3) {
        throw new r("Failed to rollback, please raise an issue at https://github.com/virtualstate/navigation/issues");
      }
      var n2;
      this[B].reject(t2), this[z].reject(t2);
    };
    [ot] = (t2) => {
      const e2 = this, n2 = function() {
        if (!t2) return;
        if (j(t2)) return _("EVENT_INTERCEPT_HANDLER"), t2;
        if ("function" == typeof t2) return _("EVENT_INTERCEPT_HANDLER"), t2();
        const { handler: n3, commit: i4 } = t2;
        i4 && "string" == typeof i4 && e2[bt].push(i4);
        if ("function" != typeof n3) return;
        return n3();
      }();
      if (this[st] = true, !n2) return;
      this[ct] = true;
      const i3 = n2.then(() => ({ status: "fulfilled", value: void 0 })).catch(async (t3) => (await this[lt](t3), { status: "rejected", reason: t3 }));
      this.#i.add(i3);
    };
    [ut] = async () => {
      if (!this.#i.size) return this[Z];
      try {
        const t2 = [...this.#i], e2 = (await Promise.all(t2)).filter((t3) => "rejected" === t3.status);
        if (e2.length) {
          if (1 === e2.length) throw e2[0].reason;
          if ("undefined" != typeof AggregateError) throw new AggregateError(e2.map(({ reason: t3 }) => t3));
          throw new Error();
        }
        return this[ht](...t2), this[at] ? this[ut]() : this[Z];
      } catch (t2) {
        throw await this.#h(t2), await Promise.reject(t2);
      } finally {
        await this[gt]();
      }
    };
    [wt]() {
      this.#o.signal.aborted || (this.#o.abort(), this.dispatchEvent({ type: wt, transition: this, entry: this[Z] }));
    }
    [gt] = async () => {
      this[et] || await this.dispatchEvent({ type: gt, transition: this, entry: this[Z], intercept: this[ot] });
    };
  };
  function kt(t2) {
    const e2 = function() {
      try {
        if ("undefined" != typeof window && window.location) return window.location.href;
      } catch {
      }
    }() ?? "https://html.spec.whatwg.org/";
    return new URL((t2 ?? "").toString(), e2);
  }
  var xt = class {
    type;
    from;
    navigationType;
    constructor(t2, e2) {
      if (this.type = t2, !e2) throw new TypeError("init required");
      if (!e2.from) throw new TypeError("from required");
      this.from = e2.from, this.navigationType = e2.navigationType ?? void 0;
    }
  };
  var Tt = class {
    type;
    canIntercept;
    canTransition;
    destination;
    downloadRequest;
    formData;
    hashChange;
    info;
    signal;
    userInitiated;
    navigationType;
    constructor(t2, e2) {
      if (this.type = t2, !e2) throw new TypeError("init required");
      if (!e2.destination) throw new TypeError("destination required");
      if (!e2.signal) throw new TypeError("signal required");
      this.canIntercept = e2.canIntercept ?? false, this.canTransition = e2.canIntercept ?? false, this.destination = e2.destination, this.downloadRequest = e2.downloadRequest, this.formData = e2.formData, this.hashChange = e2.hashChange ?? false, this.info = e2.info, this.signal = e2.signal, this.userInitiated = e2.userInitiated ?? false, this.navigationType = e2.navigationType ?? "push";
    }
    commit() {
      throw new Error("Not implemented");
    }
    intercept(t2) {
      throw new Error("Not implemented");
    }
    preventDefault() {
      throw new Error("Not implemented");
    }
    reportError(t2) {
      throw new Error("Not implemented");
    }
    scroll() {
      throw new Error("Not implemented");
    }
    transitionWhile(t2) {
      return this.intercept(t2);
    }
  };
  var Lt = Symbol.for("@virtualstate/navigation/formData");
  var Pt = Symbol.for("@virtualstate/navigation/downloadRequest");
  var It = Symbol.for("@virtualstate/navigation/canIntercept");
  var Ut = Symbol.for("@virtualstate/navigation/userInitiated");
  var Rt = Symbol.for("@virtualstate/navigation/originalEvent");
  function Ct() {
  }
  function Dt(t2) {
    const { commit: e2, currentIndex: n2, options: i3, known: o2, currentEntry: s2, transition: a2, transition: { [J]: c2, [Z]: u2, [ot]: h2 }, reportError: l2 } = t2;
    let { transition: { [G]: d2 } } = t2, f2 = [...c2];
    const g2 = new Set(o2);
    let v2 = -1, p2 = n2;
    if (d2 === M) {
      const { index: t3 } = i3 ?? { index: void 0 };
      if ("number" != typeof t3) throw new r("Expected index to be provided for rollback");
      v2 = t3, p2 = t3;
    } else "traverse" === d2 || "reload" === d2 ? (v2 = function(t3, e3) {
      const n3 = e3.index;
      return -1 !== n3 ? n3 : -1;
    }(0, u2), p2 = v2) : "replace" === d2 ? -1 === n2 ? (d2 = "push", v2 = n2 + 1, p2 = v2) : (v2 = n2, p2 = n2) : (v2 = n2 + 1, p2 = v2);
    if ("number" != typeof v2 || -1 === v2) throw new r("Could not resolve next index");
    if (!u2.url) throw console.trace({ navigationType: d2, entry: u2, options: i3 }), new r("Expected entry url");
    const y2 = { url: u2.url, key: u2.key, id: u2.id, index: v2, sameDocument: u2.sameDocument, getState: () => u2.getState() };
    let m2 = false;
    const w2 = kt(s2?.url), b2 = new URL(y2.url);
    if (w2.hash !== b2.hash) {
      const t3 = new URL(w2.toString());
      t3.hash = "";
      const e3 = new URL(b2.toString());
      e3.hash = "", m2 = t3.toString() === e3.toString();
    }
    let E2;
    const { resolve: S2, promise: k2 } = function() {
      let t3, e3, n3 = false, i4 = "pending";
      const r2 = new Promise((r3, o3) => {
        t3 = (t4) => {
          i4 = "fulfilled", n3 = true, r3(t4);
        }, e3 = (t4) => {
          i4 = "rejected", n3 = true, o3(t4);
        };
      });
      return O(t3), O(e3), { get settled() {
        return n3;
      }, get status() {
        return i4;
      }, resolve: t3, reject: e3, promise: r2 };
    }();
    function x2() {
      O(E2, "Expected contextToCommit"), S2(e2(E2));
    }
    const T2 = new D(), L2 = new Tt("navigate", { signal: T2.signal, info: void 0, ...i3, canIntercept: i3?.[It] ?? true, formData: i3?.[Lt] ?? void 0, downloadRequest: i3?.[Pt] ?? void 0, hashChange: m2, navigationType: i3?.navigationType ?? ("string" == typeof d2 ? d2 : "replace"), userInitiated: i3?.[Ut] ?? false, destination: y2 }), P2 = i3?.[Rt], I2 = a2[wt].bind(a2);
    if (P2) {
      const t3 = P2;
      L2.intercept = function(e3) {
        return t3.preventDefault(), h2(e3);
      }, L2.preventDefault = function() {
        return t3.preventDefault(), I2();
      };
    } else L2.intercept = h2, L2.preventDefault = I2;
    L2.transitionWhile = L2.intercept, L2.commit = x2, l2 && (L2.reportError = l2), L2.scroll = Ct, P2 && (L2.originalEvent = P2);
    const U2 = new xt("currententrychange", { from: s2, navigationType: L2.navigationType });
    let R2 = [], C2 = [], j2 = [];
    const N2 = c2.map((t3) => t3.key);
    if (d2 === M) {
      const { entries: t3 } = i3 ?? { entries: void 0 };
      if (!t3) throw new r("Expected entries to be provided for rollback");
      f2 = t3, f2.forEach((t4) => g2.add(t4));
      const e3 = f2.map((t4) => t4.key);
      C2 = c2.filter((t4) => !e3.includes(t4.key)), j2 = f2.filter((t4) => !N2.includes(t4.key));
    } else if ("replace" === d2 || "traverse" === d2 || "reload" === d2) {
      f2[y2.index] = u2, "traverse" !== d2 && R2.push(u2), "replace" === d2 && (f2 = f2.slice(0, y2.index + 1));
      const t3 = f2.map((t4) => t4.key);
      C2 = c2.filter((e3) => !t3.includes(e3.key)), N2.includes(u2.id) && (j2 = [u2]);
    } else if ("push" === d2) {
      let t3 = false;
      if (f2[y2.index] && (f2 = f2.slice(0, y2.index), t3 = true), f2.push(u2), j2 = [u2], t3) {
        const t4 = f2.map((t5) => t5.key);
        C2 = c2.filter((e3) => !t4.includes(e3.key));
      }
    }
    let A2;
    return g2.add(u2), (R2.length || j2.length || C2.length) && (A2 = { updatedEntries: R2, addedEntries: j2, removedEntries: C2 }), E2 = { entries: f2, index: p2, known: g2, entriesChange: A2 }, { entries: f2, known: g2, index: p2, currentEntryChange: U2, destination: y2, navigate: L2, navigationType: d2, waitForCommit: k2, commit: x2, abortController: T2 };
  }
  function jt(t2) {
    if ("undefined" != typeof CustomEvent && "string" == typeof t2.type) {
      if (t2 instanceof CustomEvent) return t2;
      const { type: n2, detail: i3, ...r2 } = t2, o2 = new CustomEvent(n2, { detail: i3 ?? r2 });
      return Object.assign(o2, r2), function(t3, n3) {
        if (!e(t3)) throw new Error("Expected event");
        if (void 0 !== n3 && t3.type !== n3) throw new Error(`Expected event type ${String(n3)}, got ${t3.type.toString()}`);
      }(o2, t2.type), o2;
    }
    return t2;
  }
  var Ot = Symbol.for("@virtualstate/navigation/setOptions");
  var Nt = Symbol.for("@virtualstate/navigation/setEntries");
  var At = Symbol.for("@virtualstate/navigation/setCurrentIndex");
  var Ft = Symbol.for("@virtualstate/navigation/setCurrentKey");
  var qt = Symbol.for("@virtualstate/navigation/getState");
  var $t = Symbol.for("@virtualstate/navigation/setState");
  var Ht = Symbol.for("@virtualstate/navigation/disposeState");
  var Vt = class extends b {
    #l = 0;
    #d = [];
    #f = /* @__PURE__ */ new Set();
    #g = -1;
    #v;
    #p = /* @__PURE__ */ new WeakSet();
    #y = "";
    #m = void 0;
    #n = void 0;
    get canGoBack() {
      return !!this.#d[this.#g - 1];
    }
    get canGoForward() {
      return !!this.#d[this.#g + 1];
    }
    get currentEntry() {
      return -1 === this.#g ? (this.#m || (this.#m = new I({ getState: this[qt], navigationType: "push", index: -1, sameDocument: false, url: this.#y.toString() })), this.#m) : this.#d[this.#g];
    }
    get transition() {
      const t2 = this.#v;
      return t2?.signal.aborted ? void 0 : t2;
    }
    constructor(t2 = {}) {
      super(), this[Ot](t2);
    }
    [Ot](t2) {
      this.#n = t2, this.#y = kt(t2?.baseURL), this.#d = [], t2.entries && this[Nt](t2.entries), t2.currentKey ? this[Ft](t2.currentKey) : "number" == typeof t2.currentIndex && this[At](t2.currentIndex);
    }
    [Ft](t2) {
      const e2 = this.#d.findIndex((e3) => e3.key === t2);
      -1 !== e2 && (this.#g = e2);
    }
    [At](t2) {
      t2 <= -1 || t2 >= this.#d.length || (this.#g = t2);
    }
    [Nt](t2) {
      this.#d = t2.map(({ key: t3, url: e2, navigationType: n2, state: i3, sameDocument: r2 }, o2) => {
        return new I({ getState: this[qt], navigationType: (s2 = n2, "reload" === s2 || "push" === s2 || "replace" === s2 || "traverse" === s2 ? n2 : "push"), sameDocument: r2 ?? true, index: o2, url: e2, key: t3, state: i3 });
        var s2;
      }), -1 === this.#g && this.#d.length && (this.#g = 0);
    }
    [qt] = (t2) => this.#n?.getState?.(t2) ?? void 0;
    [$t] = (t2) => this.#n?.setState?.(t2);
    [Ht] = (t2) => this.#n?.disposeState?.(t2);
    back(t2) {
      if (!this.canGoBack) throw new r("Cannot go back");
      const e2 = this.#d[this.#g - 1];
      return this.#w("traverse", this.#b(e2, { ...t2, navigationType: "traverse" }));
    }
    entries() {
      return [...this.#d];
    }
    forward(t2) {
      if (!this.canGoForward) throw new r();
      const e2 = this.#d[this.#g + 1];
      return this.#w("traverse", this.#b(e2, { ...t2, navigationType: "traverse" }));
    }
    goTo(t2, e2) {
      return this.traverseTo(t2, e2);
    }
    traverseTo(t2, e2) {
      const n2 = this.#d.find((e3) => e3.key === t2);
      if (n2) return this.#w("traverse", this.#b(n2, { ...e2, navigationType: "traverse" }));
      throw new r();
    }
    #E = (t2) => {
      const e2 = this.currentEntry?.url;
      return !e2 || (n2 = new URL(e2), i3 = new URL(t2), n2.origin === i3.origin);
      var n2, i3;
    };
    navigate(t2, e2) {
      let n2 = this.#y;
      this.currentEntry?.url && (n2 = this.currentEntry?.url);
      const i3 = new URL(t2, n2).toString();
      let r2 = "push";
      "auto" !== e2?.history && e2?.history ? "push" !== e2?.history && "replace" !== e2?.history || (r2 = e2?.history) : i3 === this.currentEntry?.url && (r2 = "replace");
      const o2 = this.#S({ getState: this[qt], url: i3, ...e2, sameDocument: this.#E(i3), navigationType: r2 });
      return this.#w(r2, o2, void 0, e2);
    }
    #b = (t2, e2) => this.#S({ ...t2, getState: this[qt], index: t2?.index ?? void 0, state: e2?.state ?? t2?.getState(), navigationType: t2?.[k] ?? ("string" == typeof e2?.navigationType ? e2.navigationType : "replace"), ...e2, get [x]() {
      return t2?.[x];
    }, get [a]() {
      return t2?.[a];
    } });
    #S = (t2) => {
      const e2 = t2.key || ("replace" === t2.navigationType ? this.currentEntry?.key : void 0), n2 = new I({ ...t2, key: e2, index: t2.index ?? (() => this.#d.indexOf(n2)) });
      return n2;
    };
    #w = (t2, e2, n2, i3) => {
      if (e2 === this.currentEntry) throw new r();
      if (this.#d.findIndex((t3) => t3.id === e2.id) > -1) throw new r();
      return this.#k(t2, e2, n2, i3);
    };
    #k = (t2, e2, n2, i3) => {
      const r2 = n2 ?? new St({ from: this.currentEntry, navigationType: "string" == typeof t2 ? t2 : "replace", rollback: (t3) => this.#x(r2, t3), [G]: t2, [J]: [...this.#d], [Q]: this.#g, [it]: [...this.#f], [Z]: e2, [K]: this }), { finished: o2, committed: s2 } = r2;
      return this.#T(r2), (() => this.#L(t2, e2, r2, i3))().catch((t3) => {
      }), { committed: s2, finished: o2 };
    };
    #T = (t2) => {
      this.#p.add(t2);
    };
    #L = (t2, e2, n2, i3) => {
      try {
        return this.#l += 1, this.#P(t2, e2, n2, i3);
      } finally {
        this.#l -= 1;
      }
    };
    #x = (t2, e2) => {
      const n2 = t2[J], i3 = t2[Q], r2 = n2[i3], o2 = r2 ? this.#b(r2, e2) : void 0, s2 = { ...e2, index: i3, known: /* @__PURE__ */ new Set([...this.#f, ...n2]), navigationType: o2?.[k] ?? "replace", entries: n2 }, a2 = o2 ? M : W, c2 = o2 ?? this.#S({ getState: this[qt], navigationType: "replace", index: s2.index, sameDocument: true, ...e2 });
      return this.#w(a2, c2, void 0, s2);
    };
    #P = (t2, e2, n2, i3) => {
      let o2 = t2;
      const s2 = _t();
      s2 && e2.sameDocument && "string" == typeof o2 && s2?.mark?.(`same-document-navigation:${e2.id}`);
      let a2 = false, c2 = false;
      const { currentEntry: u2 } = this;
      this.#v?.finished?.catch((t3) => t3), this.#v?.[z]?.promise?.catch((t3) => t3), this.#v?.[B]?.promise?.catch((t3) => t3), this.#v?.[wt](), this.#v = n2;
      const h2 = n2.dispatchEvent({ type: vt, transition: n2, entry: e2 }), l2 = ({ entries: t3, index: e3, known: i4 }) => {
        n2.signal.aborted || (this.#d = t3, i4 && (this.#f = /* @__PURE__ */ new Set([...this.#f, ...i4])), this.#g = e3, this[$t](this.currentEntry));
      }, d2 = async (t3) => {
        if (c2) return;
        const i4 = [n2.dispatchEvent(jt({ type: dt, transition: n2, entry: e2 }))];
        if (n2.signal.aborted) return;
        c2 = true, l2(t3);
        const { entriesChange: r2 } = t3;
        i4.push(n2.dispatchEvent(jt({ type: ft, transition: n2, entry: e2 }))), r2 && i4.push(this.dispatchEvent(jt({ type: "entrieschange", ...r2 }))), await Promise.all(i4);
      }, f2 = async () => {
        if (await h2, "number" != typeof i3?.index || !i3.entries) throw new r();
        const t3 = this.entries(), n3 = t3.map((t4) => t4.key), o3 = i3.entries.map((t4) => t4.key), s3 = t3.filter((t4) => !o3.includes(t4.key)), c3 = i3.entries.filter((t4) => !n3.includes(t4.key));
        return await d2({ entries: i3.entries, index: i3.index, known: i3.known, entriesChange: s3.length || c3.length ? { removedEntries: s3, addedEntries: c3, updatedEntries: [] } : void 0 }), await this.dispatchEvent(jt({ type: "currententrychange" })), a2 = true, e2;
      }, g2 = () => {
        if (t2 === W) return f2();
        const r2 = Dt({ currentEntry: u2, currentIndex: this.#g, options: i3, transition: n2, known: this.#f, commit: d2, reportError: n2[lt] }), s3 = new Promise(queueMicrotask);
        let c3 = [];
        const h3 = function* (t3) {
          const i4 = new Promise(queueMicrotask), { currentEntryChange: r3, navigate: s4, waitForCommit: c4, commit: h4, abortController: l4 } = t3, d3 = l4.abort.bind(l4);
          if (n2.signal.addEventListener("abort", d3, { once: true }), "string" == typeof o2 || o2 === M) {
            const t4 = u2?.dispatchEvent(jt({ type: "navigatefrom", intercept: n2[ot], transitionWhile: n2[ot] }));
            t4 && (yield t4);
          }
          "string" == typeof o2 && (yield n2.dispatchEvent(s4));
          n2[Et] || h4();
          yield c4, e2.sameDocument && (yield n2.dispatchEvent(r3));
          a2 = true, "string" == typeof o2 && (yield e2.dispatchEvent(jt({ type: "navigateto", intercept: n2[ot], transitionWhile: n2[ot] })));
          yield v2(), n2[rt].size || (yield i4);
          yield n2.dispatchEvent({ type: pt, transition: n2, entry: e2 }), yield n2[ut](), n2.signal.removeEventListener("abort", d3), yield n2[gt](), "string" == typeof o2 && (yield n2.dispatchEvent(jt({ type: "finish", intercept: n2[ot], transitionWhile: n2[ot] })), yield n2.dispatchEvent(jt({ type: "navigatesuccess", intercept: n2[ot], transitionWhile: n2[ot] })));
        }(r2)[Symbol.iterator](), l3 = { [Symbol.iterator]: () => ({ next: () => h3.next() }) };
        async function g3() {
          const t3 = [...c3];
          if (t3.length) {
            c3 = [];
            const e3 = (await Promise.all(t3)).filter(N);
            if (1 === e3.length) throw await Promise.reject(e3[0]);
            if (e3.length) throw new AggregateError(e3, e3[0].reason?.message);
          } else n2[st] || await s3;
        }
        return async function t3() {
          for (const e3 of l3) {
            if (j(e3) && c3.push(Promise.allSettled([e3]).then(([t4]) => t4)), n2[Et] || a2 && n2[ct]) return g3().then(t3);
            if (n2.signal.aborted) break;
          }
          if (c3.length) return g3();
        }().then(() => n2[st] ? void 0 : s3).then(() => e2);
      }, v2 = async () => this.#I();
      return Promise.allSettled([(() => {
        try {
          return g2();
        } catch (t3) {
          return Promise.reject(t3);
        }
      })()]).then(async ([t3]) => {
        "rejected" === t3.status && await n2.dispatchEvent({ type: yt, error: t3.reason, transition: n2, entry: e2 }), await v2(), await n2.dispatchEvent({ type: mt, transition: n2, entry: e2 }), await n2[ut](), this.#v === n2 && (this.#v = void 0), e2.sameDocument && "string" == typeof o2 && (s2.mark(`same-document-navigation-finish:${e2.id}`), s2.measure(`same-document-navigation:${e2.url}`, `same-document-navigation:${e2.id}`, `same-document-navigation-finish:${e2.id}`));
      }).then(() => e2);
    };
    #I = async () => {
      for (const t2 of this.#f) {
        if (-1 !== this.#d.findIndex((e3) => e3.id === t2.id)) continue;
        this.#f.delete(t2);
        const e2 = jt({ type: "dispose", entry: t2 });
        this[Ht](t2), await t2.dispatchEvent(e2), await this.dispatchEvent(e2);
      }
    };
    reload(t2) {
      const { currentEntry: e2 } = this;
      if (!e2) throw new r();
      const n2 = this.#b(e2, t2);
      return this.#w("reload", n2, void 0, t2);
    }
    updateCurrentEntry(t2) {
      const { currentEntry: e2 } = this;
      if (!e2) throw new r("Expected current entry");
      e2[T](t2.state), this[$t](e2);
      const n2 = new xt("currententrychange", { from: e2, navigationType: void 0 }), i3 = jt({ type: "entrieschange", addedEntries: [], removedEntries: [], updatedEntries: [e2] });
      return Promise.all([this.dispatchEvent(n2), this.dispatchEvent(i3)]);
    }
  };
  function _t() {
    return "undefined" != typeof performance ? performance : { now: () => Date.now(), mark() {
    }, measure() {
    } };
  }
  var Mt;
  function Wt() {
    return t || (Mt || (Mt = new Vt()));
  }
  var Kt = JSON;
  var Bt = Symbol.for("@virtualstate/navigation/location/checkChange");
  var Gt = Symbol.for("@virtualstate/navigation/location/awaitFinished");
  var Jt = Symbol.for("@virtualstate/navigation/location/transitionURL");
  var Yt = Symbol.for("@virtualstate/navigation/location/url");
  var Qt = class {
    #n;
    #U;
    constructor(t2) {
      this.#n = t2, this.#U = t2.navigation;
      const e2 = () => {
        this.#R = void 0, this.#y = void 0;
      };
      this.#U.addEventListener("navigate", () => {
        const t3 = this.#U.transition;
        t3 && function(t4) {
          return B in t4;
        }(t3) && t3[B].promise.then(e2, e2);
      }), this.#U.addEventListener("currententrychange", e2);
    }
    #C = /* @__PURE__ */ new WeakMap();
    #R;
    #y;
    get [Yt]() {
      if (this.#R) return this.#R;
      const { currentEntry: t2 } = this.#U;
      if (!t2) return this.#y = kt(this.#n.baseURL), this.#y;
      const e2 = this.#C.get(t2);
      if (e2) return e2;
      const n2 = new URL(t2.url ?? "https://html.spec.whatwg.org/");
      return this.#C.set(t2, n2), n2;
    }
    get hash() {
      return this[Yt].hash;
    }
    set hash(t2) {
      this.#D("hash", t2);
    }
    get host() {
      return this[Yt].host;
    }
    set host(t2) {
      this.#D("host", t2);
    }
    get hostname() {
      return this[Yt].hostname;
    }
    set hostname(t2) {
      this.#D("hostname", t2);
    }
    get href() {
      return this[Yt].href;
    }
    set href(t2) {
      this.#D("href", t2);
    }
    get origin() {
      return this[Yt].origin;
    }
    get pathname() {
      return this[Yt].pathname;
    }
    set pathname(t2) {
      this.#D("pathname", t2);
    }
    get port() {
      return this[Yt].port;
    }
    set port(t2) {
      this.#D("port", t2);
    }
    get protocol() {
      return this[Yt].protocol;
    }
    set protocol(t2) {
      this.#D("protocol", t2);
    }
    get search() {
      return this[Yt].search;
    }
    set search(t2) {
      this.#D("search", t2);
    }
    #D = (t2, e2) => {
      const n2 = this[Yt].toString();
      let i3;
      "href" === t2 ? i3 = new URL(e2, n2) : (i3 = new URL(n2), i3[t2] = e2);
      const r2 = i3.toString();
      n2 !== r2 && this.#j(i3, () => this.#U.navigate(r2));
    };
    replace(t2) {
      return this.#j(t2, (t3) => this.#U.navigate(t3.toString(), { history: "replace" }));
    }
    reload() {
      return this.#O(this.#U.reload());
    }
    assign(t2) {
      return this.#j(t2, (t3) => this.#U.navigate(t3.toString()));
    }
    [Jt](t2, e2) {
      return this.#j(t2, e2);
    }
    #j = async (t2, e2) => {
      const n2 = this.#R = "string" == typeof t2 ? new URL(t2, this[Yt].toString()) : t2;
      try {
        await this.#O(e2(n2));
      } finally {
        this.#R === n2 && (this.#R = void 0);
      }
    };
    [Gt](t2) {
      return this.#O(t2);
    }
    #O = async (t2) => {
      if (this.#y = void 0, !t2) return;
      const { committed: e2, finished: n2 } = t2;
      await Promise.all([e2 || Promise.resolve(void 0), n2 || Promise.resolve(void 0)]);
    };
    #N = () => {
      const t2 = this[Yt], e2 = t2.toString(), n2 = this.#U.currentEntry?.url;
      if (e2 !== n2) return this.#j(t2, () => this.#U.navigate(e2));
    };
    [Bt]() {
      return this.#N();
    }
  };
  var Xt = Symbol.for("@virtualstate/navigation/history/state");
  var Zt = class extends Qt {
    #n;
    #U;
    constructor(t2) {
      super(t2), this.#n = t2, this.#U = t2.navigation;
    }
    get length() {
      return this.#U.entries().length;
    }
    scrollRestoration = "manual";
    get state() {
      const t2 = this.#U.currentEntry?.getState();
      return "string" == typeof t2 || "number" == typeof t2 || "boolean" == typeof t2 ? t2 : this.#n[Xt] ?? void 0;
    }
    back() {
      const t2 = this.#U.entries()[(this.#U.currentEntry?.index ?? -1) - 1], e2 = t2?.url;
      if (!e2) throw new r("Cannot go back");
      return this[Jt](e2, () => this.#U.back());
    }
    forward() {
      const t2 = this.#U.entries()[(this.#U.currentEntry?.index ?? -1) + 1], e2 = t2?.url;
      if (!e2) throw new r("Cannot go forward");
      return this[Jt](e2, () => this.#U.forward());
    }
    go(t2) {
      if ("number" != typeof t2 || 0 === t2 || isNaN(t2)) return this[Gt](this.#U.reload());
      const e2 = this.#U.entries(), { currentEntry: n2 } = this.#U;
      if (!n2) throw new Error(`Could not go ${t2}`);
      const i3 = e2[n2.index + t2];
      if (!i3) throw new Error(`Could not go ${t2}`);
      const r2 = i3.key;
      return this[Gt](this.#U.traverseTo(r2));
    }
    replaceState(t2, e2, n2) {
      return n2 ? this[Jt](n2, (e3) => this.#U.navigate(e3.toString(), { state: t2, history: "replace" })) : this.#U.updateCurrentEntry({ state: t2 });
    }
    pushState(t2, e2, n2) {
      return n2 ? this[Jt](n2, (e3) => this.#U.navigate(e3.toString(), { state: t2 })) : this.#U.updateCurrentEntry({ state: t2 });
    }
  };
  var te = "undefined" == typeof window ? void 0 : window;
  var ee = "undefined" == typeof self ? void 0 : self;
  var ne = "__@virtualstate/navigation/key";
  var ie = "__@virtualstate/navigation/meta";
  function re(t2) {
    return A(t2) && true === t2[ie];
  }
  function oe(t2) {
    return A(t2) && re(t2[ne]);
  }
  function se(t2, e2 = le.limit) {
    let n2 = t2.entries();
    return "number" == typeof e2 && (n2 = n2.slice(-e2)), n2.map(({ id: t3, key: e3, url: n3, sameDocument: i3 }) => ({ id: t3, key: e3, url: n3, sameDocument: i3 }));
  }
  function ae(t2, e2, n2 = le.limit) {
    return { [ie]: true, currentIndex: e2.index, key: e2.key, entries: se(t2, n2), state: e2.getState() };
  }
  function ce(t2, e2, n2 = le.limit) {
    return { [ne]: ae(t2, e2, n2) };
  }
  function ue(t2, e2, n2, i3, r2) {
    !function() {
      if ("undefined" == typeof sessionStorage) return;
      try {
        const i4 = (e3 = ce(t2, n2, r2), Kt.stringify(e3));
        sessionStorage.setItem(n2.key, i4);
      } catch {
      }
      var e3;
    }();
  }
  function he(t2, e2) {
    return function() {
      const n2 = function() {
        const e3 = t2.originalState ?? function() {
          try {
            return t2.state;
          } catch {
            return;
          }
        }();
        return A(e3) ? e3 : void 0;
      }();
      return oe(n2) ? n2[ne].key !== e2.key ? void 0 : n2[ne].state : void 0;
    }() ?? function() {
      if ("undefined" == typeof sessionStorage) return;
      try {
        const n2 = sessionStorage.getItem(e2.key);
        if (!n2) return;
        const i3 = (t3 = n2, Kt.parse(t3));
        if (!A(i3)) return;
        if (!oe(i3)) return;
        return i3[ne].state;
      } catch {
        return;
      }
      var t3;
    }();
  }
  var le = Object.freeze({ persist: true, persistState: true, history: true, limit: 50, patch: true, interceptEvents: true });
  function de(t2) {
    return A(t2) && "function" == typeof t2[Nt] && "function" == typeof t2[Ft];
  }
  function fe(t2, e2) {
    e2.addEventListener("click", (n2) => {
      if (n2.target?.ownerDocument === e2.document) {
        const i3 = ge(n2);
        A(i3) && function(n3, i4) {
          !function() {
            if (0 !== (r2 = n3).button || r2.defaultPrevented || r2.metaKey || r2.altKey || r2.ctrlKey || r2.shiftKey) return;
            var r2;
            O(n3);
            const o2 = i4.getAttribute("target");
            if (o2) {
              if ("_blank" === o2) return;
              if (o2 !== e2.name) return;
            }
            const s2 = { history: "auto", [Ut]: true, [Pt]: i4.download, [Rt]: n3 };
            t2.navigate(i4.href, s2);
          }();
        }(n2, i3);
      }
    }), e2.addEventListener("submit", (n2) => {
      if (n2.target?.ownerDocument === e2.document) {
        const i3 = ve(n2);
        A(i3) && function(n3, i4) {
          !function() {
            if (n3.defaultPrevented) return;
            const r2 = n3.submitter && "formMethod" in n3.submitter && n3.submitter.formMethod ? n3.submitter.formMethod : i4.method;
            if ("dialog" === r2) return;
            const o2 = n3.submitter && "formAction" in n3.submitter && n3.submitter.formAction ? n3.submitter.formAction : i4.action, s2 = i4.getAttribute("target");
            if (s2) {
              if ("_blank" === s2) return;
              if (s2 !== e2.name) return;
            }
            let a2;
            try {
              a2 = new FormData(i4);
            } catch {
              a2 = new FormData(void 0);
            }
            const c2 = "get" === r2 ? new URLSearchParams([...a2].map(([t3, e3]) => e3 instanceof File ? [t3, e3.name] : [t3, e3])) : void 0, u2 = "post" === r2 ? a2 : void 0, h2 = new URL(o2, t2.currentEntry.url);
            c2 && (h2.search = c2.toString());
            const l2 = n3;
            O(l2);
            const d2 = { history: "auto", [Ut]: true, [Lt]: u2, [Rt]: l2 };
            t2.navigate(h2.href, d2);
          }();
        }(n2, i3);
      }
    });
  }
  function ge(t2) {
    return we(pe(t2), "a[href]:not([data-navigation-ignore])");
  }
  function ve(t2) {
    return we(pe(t2), "form:not([data-navigation-ignore])");
  }
  function pe(t2) {
    if (!t2.composedPath) return t2.target;
    return t2.composedPath()[0] ?? t2.target;
  }
  function ye(t2, e2, n2) {
    !function() {
      if (function(t3) {
        try {
          Object.defineProperty(t3, "navigation", { value: n2 });
        } catch (t4) {
        }
        if (!t3.history) try {
          Object.defineProperty(t3, "history", { value: e2 });
        } catch (t4) {
        }
      }(t2), t2 !== te) return;
      if (ee) try {
        Object.defineProperty(ee, "navigation", { value: n2 });
      } catch (t3) {
      }
      if ("undefined" != typeof globalThis) try {
        Object.defineProperty(globalThis, "navigation", { value: n2 });
      } catch (t3) {
      }
    }(), function() {
      if (!t2.PopStateEvent) return;
      const e3 = t2.PopStateEvent.prototype;
      if (!e3) return;
      const n3 = Object.getOwnPropertyDescriptor(e3, "state");
      Object.defineProperty(e3, "state", { ...n3, get() {
        const t3 = n3.get.call(this);
        return oe(t3) ? t3[ne].state : t3;
      } }), Object.defineProperty(e3, "originalState", { ...n3 });
    }(), function() {
      if (e2 instanceof Zt) return;
      const t3 = new Zt({ navigation: n2 }), i3 = t3.pushState.bind(t3), r2 = t3.replaceState.bind(t3), o2 = t3.go.bind(t3), s2 = t3.back.bind(t3), a2 = t3.forward.bind(t3), c2 = Object.getPrototypeOf(e2), u2 = { pushState: { ...Object.getOwnPropertyDescriptor(c2, "pushState"), value: i3 }, replaceState: { ...Object.getOwnPropertyDescriptor(c2, "replaceState"), value: r2 }, go: { ...Object.getOwnPropertyDescriptor(c2, "go"), value: o2 }, back: { ...Object.getOwnPropertyDescriptor(c2, "back"), value: s2 }, forward: { ...Object.getOwnPropertyDescriptor(c2, "forward"), value: a2 } };
      Object.defineProperties(c2, u2);
      const h2 = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(e2), "state");
      Object.defineProperty(e2, "state", { ...h2, get: () => t3.state }), Object.defineProperty(e2, "originalState", { ...h2 });
    }();
  }
  function me(t2 = le) {
    const { persist: e2, persistState: n2, history: i3, limit: o2, patch: s2, interceptEvents: a2, window: c2 = te, navigation: u2 } = { ...le, ...t2 }, h2 = e2 || n2, l2 = c2 ?? te, d2 = t2.history && "boolean" != typeof t2.history ? t2.history : function(t3 = te) {
      if (void 0 !== t3) return t3.history;
    }(l2);
    if (!d2) return function(t3) {
      const e3 = [{ key: E() }], n3 = t3 ?? new Vt({ entries: e3 }), i4 = new Zt({ navigation: n3 });
      return { navigation: n3, history: i4, apply() {
        de(t3) && !n3.entries().length && t3[Nt](e3);
      } };
    }();
    O(l2, "window required when using polyfill with history, this shouldn't be seen");
    const f2 = l2.location, g2 = d2?.state;
    let v2 = { [ie]: true, currentIndex: -1, entries: [], key: "", state: void 0 };
    oe(g2) && (v2 = g2[ne]);
    let p2 = v2.entries;
    const y2 = !(!c2 && !i3 || !d2);
    if (!p2.length) {
      let t3, e3;
      f2?.href && (t3 = f2.href), oe(g2) || re(g2) || (e3 = g2);
      const n3 = E();
      p2 = [{ key: n3, state: e3, url: t3 }], v2.key = n3, v2.currentIndex = 0;
    }
    const m2 = { entries: p2, currentIndex: v2?.currentIndex, currentKey: v2?.key, getState(t3) {
      if (y2) return he(d2, t3);
    }, setState(t3) {
      y2 && t3.sameDocument && ue(w2, 0, t3, 0, o2);
    }, disposeState(t3) {
      y2 && function(t4, e3) {
        e3 && "undefined" != typeof sessionStorage && sessionStorage.removeItem(t4.key);
      }(t3, h2);
    } }, w2 = u2 ?? new Vt(m2), b2 = d2?.pushState.bind(d2), S2 = d2?.replaceState.bind(d2), k2 = d2?.go.bind(d2);
    return { navigation: w2, history: d2, apply() {
      if (de(w2) && w2[Ot](m2), y2) {
        const t3 = /* @__PURE__ */ new Set(), i4 = /* @__PURE__ */ new Set();
        w2.addEventListener("navigate", (t4) => {
          if (t4.destination.sameDocument) {
            if (w2.transition instanceof St) {
              const { transition: e3 } = w2, { destination: n3 } = t4;
              e3.addEventListener(dt, () => {
                e3[st] || ("push" === e3.navigationType ? f2.href = n3.url : "reload" === e3.navigationType && f2.reload(), e3[wt]());
              }, { once: true });
            }
          } else t4.intercept({ commit: "after-transition", async handler() {
            queueMicrotask(() => {
              t4.signal.aborted || function() {
                if (A(t4.originalEvent)) {
                  const e3 = ge(t4.originalEvent);
                  if (e3) return function(t5) {
                    const e4 = t5.cloneNode();
                    e4.setAttribute("data-navigation-ignore", "1"), e4.click();
                  }(e3);
                  {
                    const e4 = ve(t4.originalEvent);
                    if (e4) return function(t5) {
                      const e5 = t5.cloneNode();
                      e5.setAttribute("data-navigation-ignore", "1"), e5.submit();
                    }(e4);
                  }
                }
                f2.href = t4.destination.url;
              }();
            });
          } });
        }), w2.addEventListener("currententrychange", ({ navigationType: e3, from: n3 }) => {
          const { currentEntry: r2, transition: s3 } = w2;
          if (!r2) return;
          const { key: a3, url: c3 } = r2;
          if (i4.delete(a3) || !r2?.sameDocument) return;
          const u3 = ce(w2, r2, o2);
          switch (e3 || "replace") {
            case "push":
              return b2(u3, "", c3);
            case "replace":
              return S2(u3, "", c3);
            case "traverse":
              const e4 = r2.index - n3.index;
              return t3.add(a3), k2(e4);
          }
        }), l2.addEventListener("popstate", (s3) => {
          const { state: a3, originalState: c3 } = s3, u3 = c3 ?? a3;
          if (!oe(u3)) return;
          const { [ne]: { key: h3 } } = u3;
          if (t3.delete(h3)) return;
          let l3;
          i4.add(h3);
          try {
            l3 = w2.traverseTo(h3).committed;
          } catch (t4) {
            if (t4 instanceof r && !e2) return;
            throw t4;
          }
          (e2 || n2) && l3.then((t4) => {
            const e3 = ce(w2, t4, o2);
            S2(e3, "", t4.url);
          }).catch(() => {
          });
        });
      }
      if (a2 && fe(w2, l2), s2 && ye(l2, d2, w2), !d2.state) {
        const t3 = ce(w2, w2.currentEntry, o2);
        S2(t3, "", w2.currentEntry.url);
      }
    } };
  }
  function we(t2, e2) {
    let n2 = t2 ? t2.matches instanceof Function ? t2 : t2.parentElement : void 0;
    for (; n2; ) {
      if (n2.matches(e2)) return O(n2), n2;
      n2 = n2.parentElement ?? n2.getRootNode()?.host;
    }
    return;
  }
  var be = Wt();
  if (function(e2 = Wt()) {
    const n2 = globalThis;
    return e2 !== t && !Object.hasOwn(n2, "navigation") && "undefined" != typeof window;
  }(be)) try {
    !function(t2 = le) {
      const { apply: e2, navigation: n2 } = me(t2);
      e2();
    }({ navigation: be });
  } catch (t2) {
    console.error("Failed to apply polyfill"), console.error(t2);
  }
  var TRIGGERS2 = new WeakDictionaryOfSets();
  function portalDispatch2(e2) {
    const res = TRIGGERS2.get(e2.type);
    res && eventLoopCube.dispatchBatch(e2, res);
  }
  function Portal2(name, root, eventname, reaction) {
    reaction ??= (NAME) => () => portalDispatch2(new Event(eventname));
    return {
      onFirstConnect: function() {
        TRIGGERS2.put(name, this, (_2) => root.removeEventListener(eventname, portalDispatch2));
        root.addEventListener(eventname, portalDispatch2);
      },
      reaction
    };
  }
  var Portals2 = /* @__PURE__ */ Object.create(null);
  Portals2["viewport-resize"] = Portal2("viewport-resize", window.visualViewport, "resize");
  Portals2["viewport-scroll"] = Portal2("viewport-scroll", window.visualViewport, "scroll");
  Portals2.orientation = Portal2("orientation", screen.orientation, "change", (href) => globalThis.navigation.navigate(href));
  Portals2.navigate = Portal2("navigate", globalThis.navigation, "navigate");

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
        for (let at2 of el.attributes)
          if (at2.trigger === type)
            !first ? first = at2 : (attrs ??= [first]).push(at2);
      }
    return attrs ?? first;
  }
  function getTriggersComposedTarget(type, el) {
    let attrs, first;
    for (; el; el = el.assignedSlot ?? el.getRootNode()?.host)
      if (el[EventLoopCube.PORTAL]?.[type]) {
        for (let at2 of el.attributes)
          if (at2.trigger === type)
            !first ? first = at2 : (attrs ??= [first]).push(at2);
      }
    return attrs ?? first;
  }
  function getTriggersBubble(type, el) {
    let attrs, first;
    for (; el && el instanceof HTMLElement; el = el.parentElement)
      if (el[EventLoopCube.PORTAL]?.[type]) {
        for (let at2 of el.attributes)
          if (at2.trigger === type)
            !first ? first = at2 : (attrs ??= [first]).push(at2);
      }
    return attrs ?? first;
  }
  function getTriggersTarget(type, el) {
    let attrs, first;
    if (el[EventLoopCube.PORTAL]?.[type]) {
      for (let at2 of el.attributes)
        if (at2.trigger === type)
          !first ? first = at2 : (attrs ??= [first]).push(at2);
    }
    return attrs ?? first;
  }
  function Portal3(TYPE, reaction) {
    const passive = PassiveEvents.has(TYPE);
    const bubbles = !NonBubblingEvents.has(TYPE);
    const composed = ComposedEvents.has(TYPE);
    const propagationPath = bubbles && composed ? getTriggersComposedBubble : composed ? getTriggersComposedTarget : bubbles ? getTriggersBubble : getTriggersTarget;
    const listener = function(e2) {
      e2.stopImmediatePropagation();
      const atOrAttrs = propagationPath(TYPE, e2.currentTarget);
      atOrAttrs instanceof Array ? eventLoopCube.dispatchBatch(e2, atOrAttrs) : eventLoopCube.dispatch(e2, atOrAttrs);
    };
    reaction ??= (NAME) => function() {
      this.ownerElement.dispatchEvent(new Event(TYPE, { bubbles, composed, cancelable: !passive }));
    };
    return {
      onFirstConnect: function() {
        this.ownerElement.addEventListener(TYPE, listener, { passive: passive || this.name.includes("_passive") });
      },
      reaction
    };
  }
  var Portals3 = /* @__PURE__ */ Object.create(null);
  Portals3.click = Portal3("click", (NAME) => function() {
    this.ownerElement.click();
  });
  Portals3.submit = Portal3("submit", (NAME) => function() {
    this.ownerElement.requestSubmit();
  });
  for (let type of DomEvents)
    Portals3[type] ??= Portal3(type);

  // src/2_EventLoopCube.js
  var DOTS = /* @__PURE__ */ Object.create(null);
  var PORTALS = /* @__PURE__ */ Object.create(null);
  setInterval((_2) => {
    Object.keys(DOTS).length > 5e3 && (DOTS = /* @__PURE__ */ Object.create(null));
    Object.keys(PORTALS).length > 5e3 && (PORTALS = /* @__PURE__ */ Object.create(null));
  }, 5e3);
  Object.defineProperties(Attr.prototype, {
    dots: { get: function() {
      return DOTS[this.name] ??= this.name.split(":");
    } },
    trigger: { get: function() {
      return PORTALS[this.dots[0]] ??= this.dots[0].split(/[._]/)[0];
    } }
  });
  var MicroFrame = class _MicroFrame {
    #inputs = [];
    #i = 0;
    #end;
    constructor(at2, portals2 = at2.ownerElement.getRootNode()?.portals) {
      this.at = at2;
      this.portals = portals2;
    }
    getState() {
      return { at: this.at, inputs: this.#inputs, i: this.#i, end: this.#end };
    }
    next(input) {
      if (input instanceof Error) return this.#end = input;
      if (input !== void 0) this.#inputs.unshift(input);
      this.#i++;
      return this.run();
    }
    run() {
      for (; this.#i < this.at.dots.length; this.#i++) {
        let res = this.portals.getReaction(this.at.dots[this.#i]);
        if (res instanceof Promise)
          return res.finally((_2) => this.run());
        if (res instanceof Function) {
          try {
            res = res.apply(this.at, this.#inputs);
            if (res instanceof Promise)
              return res.then((r2) => this.next(r2), (e2) => this.next(e2));
          } catch (err) {
            res = err;
          }
        }
        if (res instanceof Error) return this.#end = res;
        if (res !== void 0) this.#inputs.unshift(res);
      }
      return this.#end = true;
    }
    static make(at2) {
      return new _MicroFrame(at2);
    }
  };
  var ConnectFrame = class _ConnectFrame {
    #state;
    #value;
    constructor(type, at2, value, portal) {
      this.type = type;
      this.#state = type;
      this.at = at2;
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
    static make(type, portal, at2, value) {
      const res = new _ConnectFrame(type, at2, value, portal);
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
      setInterval((_2) => this.disconnect(), disconnectInterval);
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
        const event = row[0];
        for (this.#J = 1; this.#J < row.length; this.#J++)
          row[this.#J].next?.(event);
      }
      this.#active = false;
      return;
    }
    dispatch(e2, at2) {
      this.#loop([e2, MicroFrame.make(at2)]);
    }
    dispatchBatch(e2, attrs) {
      this.#loop([e2, ...attrs.map(MicroFrame.make)]);
    }
    disconnect() {
      for (let at2 of this.#disconnectables.keys())
        if (!at2.ownerElement.isConnected) {
          const portal = this.#disconnectables.get(at2);
          ConnectFrame.make("onDisconnect", portal, at2, portal.onDisconnect?.call(at2));
          this.#disconnectables.delete(at2);
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
        if (!(top instanceof Element) || !top.hasAttributes() && !top.children.length)
          continue;
        const task = !top[_EventLoopCube.PORTAL] ? "doFirstConnect" : top.isConnected ? "doMove" : "doReConnect";
        for (let el = top, subs = top.getElementsByTagName("*"), i3 = 0; el; el = subs[i3++]) {
          if (task === "doFirstConnect") {
            if (!el.hasAttributes())
              continue;
            el[_EventLoopCube.PORTAL] = /* @__PURE__ */ Object.create(null);
            for (let at2 of el.attributes) {
              const portalName = at2.trigger;
              const portal = portalMap.get(portalName);
              el[_EventLoopCube.PORTAL][portalName] ||= false;
              if (portal?.onFirstConnect) {
                const res = portal.onFirstConnect.call(at2);
                const frame = ConnectFrame.make("onFirstConnect", portal, at2, res);
                if (res !== _EventLoopCube.Cancel) {
                  frames.push(frame);
                  el[_EventLoopCube.PORTAL][portalName] = portal;
                  el[_EventLoopCube.MOVEABLES] ||= !!portal.onMove;
                  el[_EventLoopCube.RECONNECTABLES] ||= !!portal.onReconnect;
                  portal.onDisconnect && this.#disconnectables.set(at2, portal);
                }
              }
            }
          } else if (task === "doMove") {
            if (el[_EventLoopCube.MOVEABLES])
              for (let portalName in el[_EventLoopCube.PORTAL]) {
                const portal = el[_EventLoopCube.PORTAL][portalName];
                if (portal?.onMove) {
                  for (let at2 of el.attributes)
                    if (at2.trigger === portalName)
                      frames.push(ConnectFrame.make("onMove", portal, at2, portal.onMove.call(at2)));
                }
              }
          } else if (task === "doReConnect") {
            if (el[_EventLoopCube.RECONNECTABLES])
              for (let portalName in el[_EventLoopCube.PORTAL]) {
                const portal = el[_EventLoopCube.PORTAL][portalName];
                if (portal?.onReconnect) {
                  for (let at2 of el.attributes)
                    if (at2.trigger === portalName)
                      frames.push(ConnectFrame.make("onReConnect", portal, at2, portal.onReconnect.call(at2)));
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
            for (let at2 of el2.attributes)
              if (_EventLoopCube.portalNames(at2.name)[0] === portalName)
                frames.push(ConnectFrame.make("onFirstConnect", portal, at2, portal.onFirstConnect.call(at2)));
          }
        }
      frames.length && this.#loop(frames);
    }
    static Cancel = new Error("EventLoopCube.Cancel");
    static PORTAL = Symbol("portals");
    static MOVEABLES = Symbol("moveables");
    static RECONNECTABLES = Symbol("reconnectables");
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
      const sibs2 = [...this.parentNode.children].filter((n2) => !sibs.includes(n2));
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
      const d2 = Object.getOwnPropertyDescriptor(obj, prop);
      const og = d2.value || d2.set;
      Object.defineProperty(
        obj,
        prop,
        Object.assign({}, d2, { [d2.set ? "set" : "value"]: monkey2 })
      );
    }
  }

  // src/4_Portals.js
  var Portals_exports = {};
  __export(Portals_exports, {
    i: () => i2,
    log: () => log,
    prevent: () => prevent,
    state: () => state
  });
  var i2 = {
    onFirstConnect: function() {
      eventLoopCube.dispatch(null, this);
    }
  };
  var prevent = {
    reaction: (NAME) => (...args) => (args.at(-1).preventDefault(), EventLoopCube.Void)
  };
  var log = {
    reaction: (NAME) => function(...args) {
      console.log(this, ...args);
    }
  };
  var StateTriggers = new WeakDictionaryOfSets();
  var OldStates = /* @__PURE__ */ Object.create(null);
  var Props = Symbol("props");
  var state = {
    onFirstConnect: function() {
      const [portal, ...props] = this.dots[0].split("_");
      OldStates[portal] ??= /* @__PURE__ */ Object.create(null);
      if (props.length)
        this[Props] = props;
      StateTriggers.put(portal, this, (_2) => OldStates[portal] = void 0);
    },
    reaction: (NAME) => {
      const [portal, ...props] = NAME.split("_");
      return function(...args) {
        const oldState = OldStates[portal];
        let newState, changed;
        for (let i3 = 0; i3 < props.length; i3++) {
          const prop = props[i3];
          const arg = args[i3];
          if (oldState[prop] !== arg) {
            newState = Object.assign(newState ?? /* @__PURE__ */ Object.create(null), oldState, { [prop]: arg });
            (changed ??= []).push(prop);
          }
        }
        if (!newState) return;
        OldStates[portal] = Object.freeze(newState);
        let res;
        for (const trigger of StateTriggers.get(portal))
          if (!trigger[Props] || trigger[Props].some((prop) => changed.includes(prop)))
            (res ??= []).push(trigger);
        eventLoopCube.dispatchBatch(newState, res);
      };
    }
  };

  // src/dd.js
  patchSegments(URL.prototype, globalThis.Location?.prototype);
  FormSubmitRequestFix(HTMLFormElement.prototype, HTMLButtonElement.prototype, HTMLInputElement.prototype);
  exposeNativeDefaultAction();
  window.EventLoopCube = EventLoopCube2;
  document.portals = new PortalMap();
  Object.defineProperty(ShadowRoot.prototype, "portals", { value: document.portals });
  var portals = {
    ...Portals,
    ...Portals3,
    ...Portals2,
    ...Portals_exports
  };
  for (let [k2, v2] of Object.entries(portals))
    document.portals.define(k2, v2);
  function init() {
    const cube = EventLoopCube2.init(window, document.documentElement);
    monkeyPatchAppendElements((...args) => cube.connectBranch(...args));
  }
  document.readyState !== "loading" ? init() : document.addEventListener("DOMContentLoaded", init);
})();
//# sourceMappingURL=dd.js.map
