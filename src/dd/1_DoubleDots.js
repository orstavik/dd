const OG = {};

export function monkeyPatch(path, valueOrSet, get) {
  const dots = path.split(".");
  const prop = dots.pop();
  const proto = dots.reduce((o, p) => o[p], window);
  let desc = Object.getOwnPropertyDescriptor(proto, prop);
  if (!desc)
    for (let p = Object.getPrototypeOf(proto); p; p = Object.getPrototypeOf(p))
      if (desc = Object.getOwnPropertyDescriptor(p, prop))
        break;
  const key = desc.value ? "value" : "set";
  OG[path] ??= desc[key];
  desc[key] = valueOrSet;
  get && key === "set" && (desc.get = get);
  Object.defineProperty(proto, prop, desc);
}

export function nativeMethods(path) {
  return OG[path] ?? path.split(".").reduce((o, p) => o[p], window);
}

const dce = document.createElement;
const ael = EventTarget.prototype.addEventListener;
const si = setInterval;
const st = setTimeout;

async function sleep(ms) {
  return await new Promise(r => st(r, ms));
}

function nextTick(cb) {
  const a = dce.call(document, "audio");
  ael.call(a, "ratechange", cb);
  a.playbackRate = 2;
}

class AttrWeakSet extends Set {
  static #bigSet = new Set(); //wr => AttrWeakSet
  static #key;
  static GC = 10_000;

  static gc() {                               //todo we can no longer rely on isConnected to determine activity..
    let active, l;                            //todo we should also have an iterator here i think. the current iterator doesn't deref?
    for (let wr of AttrWeakSet.#bigSet) {
      if (l = wr.deref())
        for (let a of l)
          a.isConnected ? (active = true) : (l.delete(a), a.remove());
      else
        AttrWeakSet.#bigSet.delete(wr);

    }
    !active && (AttrWeakSet.#key = clearInterval(AttrWeakSet.#key));
  }

  constructor(...args) {
    super(...args);
    AttrWeakSet.#bigSet.add(new WeakRef(this));
  }

  add(at) {
    AttrWeakSet.#key ??= si(AttrWeakSet.gc, AttrWeakSet.GC);
    super.add(at);
  }
}

const nativeEvents = (function () {
  function extractHandlers(obj) {
    return Object.keys(obj)
      .filter(k => k.startsWith("on"))
      .map(k => k.substring(2).toLowerCase());
  }
  const eOn = extractHandlers(Element.prototype);
  const hOn = extractHandlers(HTMLElement.prototype);
  const wOn = extractHandlers(window);
  const dOn = extractHandlers(Document.prototype);

  const e = [...eOn, ...hOn].filter((a, i, ar) => ar.indexOf(a) === i);
  const w = wOn.filter(x => !e.includes(x));
  const d = dOn.filter(x => !e.includes(x) && !w.includes(x));
  //todo should I switch the difference between window and document?
  const result = { element: e, window: w, document: d };
  result.element.push("touchstart", "touchmove", "touchend", "touchcancel");
  result.document.push("DOMContentLoaded");
  Object.values(result).forEach(Object.freeze);
  Object.freeze(result);
  return result;
})();

function kebabToPascal(str) {
  return str.replace(/-[a-z]/g, c => c[1].toUpperCase());
}

function pascalToKebab(str) {
  return str.replace(/[A-Z]/g, c => '-' + c.toLowerCase());
}

/**
* This method is just as bad as eval. But, 
* if you use this during development, and 
* then switch to a static Reaction Trigger in production,
* then you will be fine.
* 
* @param {string} The body of the function to be created from the string.
* @returns Function 
*/
async function importBasedEval(codeString) {
  codeString = "export default " + codeString.trim();
  const blob = new Blob([codeString], { type: 'application/javascript' });
  const url = URL.createObjectURL(blob);
  const module = await import(url);
  URL.revokeObjectURL(url);
  return module.default;
}

/**
 * todo this concept is now being replaced by more use of portals? a better structure?
 * miniQuerySelector
 * 
 * Converts miniQuerySelector given in super limited DoubleDots notation
 * into a valid css querySelector.
 * 
 * For example: 
 *     my-element.foo.bar_attr-hello.._sunshine_active
 * =>  my-element.foo.bar[attr-hello\:$="sunshine"][active]
 * 
 * @param {string} doubledot: 
 * @returns {string} querySelector
 */
function miniQuerySelector(doubledot) {
  let [q, ...attrs] = doubledot.split("_");
  for (let i = 0; i <= attrs.length - 1; i += 2) {
    const name = attrs[i].replaceAll("..", "\\:");
    const val = i <= attrs.length ? `$="${attrs[i + 1]}"` : "";
    q += `[${name}${val}]`;
  }
  return q;
};

function* up(el, q = "*") {
  for (let p = el.parentElement; p; p = p.parentElement)
    if (q === "*" || p.matches(q))
      yield p;
}
function* left(el, q = "*") {
  for (let s = el.previousElementSibling; s; s = s.previousElementSibling)
    if (q === "*" || s.matches(q))
      yield s;
}
function* right(el, q = "*") {
  for (let s = el.nextElementSibling; s; s = s.nextElementSibling)
    if (q === "*" || s.matches(q))
      yield s;
}
function* roots(el) {
  for (let r = el.getRootNode(); r; r = r.host?.getRootNode())
    yield r;
}
function* hosts(el, q = "*") {
  for (let h = el.getRootNode().host; h; h = h.getRootNode().host)
    if (q === "*" || h.matches(q))
      yield h;
}
function* downwide(el, q = "*") {
  for (let d, queue = [...el.children]; d = queue.shift(); queue.push(...el.children))
    if (q === "*" || d.matches(q))
      yield d;
}

class DoubleDotsError extends Error {
  constructor(msg, at) {
    super(msg);
    //todo handle at
  }
}

class ThisArrowFunctionError extends DoubleDotsError {
  constructor(Func) {
    super("arrow function with `this`.");
  }
  static check(Definition) {
    // if(Definition.hasOwnProperty('prototype'))  //better alternative than a
    //   return false;
    let txt = Definition.toString();
    if (!/^(async\s+|)(\(|[^([]+=)/.test(txt))  //alternative a
      return;
    txt = txt.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, ''); //remove comments
    //ATT!! `${"`"}this` only works when "" is removed before ``
    txt = txt.replace(/(["'])(?:(?=(\\?))\2.)*?\1/g, '');   //remove "'-strings
    txt = txt.replace(/(`)(?:(?=(\\?))\2.)*?\1/g, '');   //remove `strings
    if (/\bthis\b/.test(txt))                      //the word this
      throw new ThisArrowFunctionError(Definition);
  }
}

function* walkAttributes(root) {
  if (root.attributes)
    yield* Array.from(root.attributes);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  for (let n; n = walker.nextNode();) {
    yield* Array.from(n.attributes);
    if (n.shadowRoot)
      yield* walkAttributes(n.shadowRoot);
  }
}

window.DoubleDots = {
  nativeMethods,
  monkeyPatch,

  DoubleDotsError,
  ThisArrowFunctionError,
  DeprecationError: class DeprecationError extends DoubleDotsError { },
  MissingReaction: class MissingReaction extends DoubleDotsError { },
  DisconnectedError: class DisconnectedError extends DoubleDotsError { },
  TriggerUpgradeError: class TriggerUpgradeError extends DoubleDotsError {
    constructor(at, error) {
      super(at);
      //todo
    }

  },
  AttrWeakSet,
  walkAttributes,
  nextTick,
  sleep,
  nativeEvents,
  kebabToPascal,
  pascalToKebab,
  up, left, right, roots, hosts, downwide,
  importBasedEval,
  miniQuerySelector
};
