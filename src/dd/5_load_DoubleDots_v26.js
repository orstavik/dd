const setTimeoutOG = window.setTimeout;
//shim requestIdleCallback
(function () {
  window.requestIdleCallback ??= function (cb, { timeout = Infinity } = {}) {
    const callTime = performance.now();
    return setTimeoutOG(_ => {
      const start = performance.now();
      cb({
        didTimeout: (performance.now() - callTime) >= timeout,
        timeRemaining: () => Math.max(0, 50 - (performance.now() - start))
      });
    }, 16);
  };
  window.cancelIdleCallback ??= clearTimeout;
})();

//gc of downgraded elements
const dGrade = (function () {

  function idleCallback(options = {}) {
    return new Promise(r => { requestIdleCallback(deadline => r(deadline), options); });
  }

  function removeAttr(el) {
    for (const at of DoubleDots.walkAttributes(el)) {
      try {
        at.remove?.();
      } catch (e) {
        console.warn(`Error during garbagecollection: ${Object.getPrototypeOf(n.attributes[0]).name}.remove()`, e);
      }
    }
  }

  const dGrade = new Set();

  (async function () {
    while (true) {
      const deadline = await idleCallback();
      const ns = Array.from(dGrade);
      for (let i = 0; i < ns.length && (dGrade.size > 99 || deadline.timeRemaining() > 33); i++)
        removeAttr(ns[i]), dGrade.delete(ns[i]);
      await new Promise(r => setTimeoutOG(r, 3000 / (dGrade.size + 1))); // i:100 => 30ms  /  i:1 => 3000ms
    }
  })();
  return dGrade;
})();

function upgradeBranch(...els) {
  for (let el of els)
    for (const at of DoubleDots.walkAttributes(el))
      AttrCustom.upgrade(at);
}

(function () {

  function setAttribute_DD(og, name, value) {
    const at = this.getAttributeNode(name);
    if (at) {
      at.value !== value && (at.value = value);
      return;
    }
    const res = og.call(this, name, value);
    this.isConnected && AttrCustom.upgrade(this.getAttributeNode(name));
    return res;
  }

  function upgradeables(parent, ...args) {
    if (dGrade.has(parent.getRootNode({ composed: true })))
      throw new Error("Downgraded objects cannot get new objects. Is pointless.");

    const res = [];
    if (!parent.isConnected) {
      for (const a of args) {
        if (a.isConnected)
          throw new Error("Downgraded objects cannot be reinjected. Here, you are taking an upgraded object and trying to add it in a notYetUpgraded element branch.");
        if (dGrade.has(a.getRootNode({ composed: true })))
          throw new Error("Downgraded objects cannot be reinjected.");
      }
      return res;
    }
    const ctx = parent.getRootNode();
    for (const a of args) {
      if (a.isConnected) {
        if (a.getRootNode() !== ctx)
          throw new Error("Adoption is illegal in DD.");

      } else {
        if (dGrade.has(a.getRootNode({ composed: true })))
          throw new Error("Downgraded objects cannot be reinjected.");
        res.push(a);
      }
    }
    return res;
  }

  function insertArgs(og, ...args) {
    if (dGrade.has(this.getRootNode({ composed: true })))
      throw new Error("Downgraded objects cannot be changed. Is pointless.");
    const toBeUpgraded = upgradeables(this, ...args);
    const res = og.call(this, ...args);
    upgradeBranch(...toBeUpgraded);
    return res;
  }
  function insertArgs0(og, ...args) {
    if (dGrade.has(this.getRootNode({ composed: true })))
      throw new Error("Downgraded objects cannot be changed. Is pointless.");
    const toBeUpgraded = upgradeables(this, args[0]);
    const res = og.call(this, ...args);
    upgradeBranch(...toBeUpgraded);
    return res;
  }
  function insertArgs1(og, ...args) {
    if (dGrade.has(this.getRootNode({ composed: true })))
      throw new Error("Downgraded objects cannot be changed. Is pointless.");
    const toBeUpgraded = upgradeables(this, args[1]);
    const res = og.call(this, ...args);
    upgradeBranch(...toBeUpgraded);
    return res;
  }
  function removesArgs0(og, ...args) {
    if (dGrade.has(this.getRootNode({ composed: true })))
      throw new Error("Downgraded objects cannot be changed. Is pointless.");
    if (!this.isConnected) return og.call(this, ...args);
    const n = args[0];
    const res = og.call(this, ...args);
    n instanceof Element && !n.isConnected && dGrade.add(n);
    return res;
  }
  function removesArgs1(og, ...args) {
    if (dGrade.has(this.getRootNode({ composed: true })))
      throw new Error("Downgraded objects cannot be changed. Is pointless.");
    if (!this.isConnected) return og.call(this, ...args);
    const n = args[1];
    const res = og.call(this, ...args);
    n instanceof Element && !n.isConnected && dGrade.add(n);
    return res;
  }
  function range_surroundContent(og, ...args) {
    if (dGrade.has(this.getRootNode({ composed: true })))
      throw new Error("Downgraded objects cannot be changed. Is pointless.");
    const toBeUpgraded = upgradeables(this, args[0]); //needed to validate the args[0]
    if (!this.isConnected)
      return og.call(this, ...args);
    const removables = args[0].children.length && [...args[0].children];
    const res = og.call(this, ...args);
    removables && dGrade.add(...removables.filter(n => !n.isConnected));
    upgradeBranch(...toBeUpgraded);
    return res;
  }
  function removeThis(og, ...args) {
    if (dGrade.has(this.getRootNode({ composed: true })))
      throw new Error("Downgraded objects cannot be changed. Is pointless.");
    if (!this.isConnected) return og.call(this, ...args);
    const res = og.call(this, ...args);
    dGrade.add(this);
    return res;
  }
  function removeChildren() {
    if (dGrade.has(this.getRootNode({ composed: true })))
      throw new Error("Downgraded objects cannot be changed. Is pointless.");
    if (!this.isConnected) return og.call(this, ...args);
    const removables = this.children.length && [...this.children];
    const res = og.call(this, ...args);
    removables && dGrade.add(...removables.filter(n => !n.isConnected));
    return res;
  }
  function element_replaceWith(og, ...args) {
    if (dGrade.has(this.getRootNode({ composed: true })))
      throw new Error("Downgraded objects cannot be changed. Is pointless.");
    const toBeUpgraded = upgradeables(this, ...args);
    const wasConnected = this.isConnected;
    const res = og.call(this, ...args);
    if (wasConnected) {
      dGrade.add(this);
      upgradeBranch(...toBeUpgraded);
    }
    return res;
  }
  function parentnode_replaceChildren(og, ...args) {
    if (dGrade.has(this.getRootNode({ composed: true })))
      throw new Error("Downgraded objects cannot be changed. Is pointless.");
    const toBeUpgraded = upgradeables(this, ...args);
    const removables = this.isConnected && this.children.length && [...this.children];
    const res = og.call(this, ...args);
    removables && dGrade.add(...removables.filter(n => !n.isConnected));
    upgradeBranch(...toBeUpgraded);
    return res;
  }
  function innerHTMLsetter(og, ...args) {
    if (dGrade.has(this.getRootNode({ composed: true })))
      throw new Error("Downgraded objects cannot be changed. Is pointless.");
    if (!this.isConnected) return og.call(this, ...args);
    const removables = this.children?.length && [...this.children];
    const res = og.call(this, ...args);
    removables && dGrade.add(...removables);
    upgradeBranch(...this.children);
    return res;
  }
  function outerHTMLsetter(og, ...args) {
    if (dGrade.has(this.getRootNode({ composed: true })))
      throw new Error("Downgraded objects cannot be changed. Is pointless.");
    if (!this.isConnected || !this.parentNode) return og.call(this, ...args);
    const sibs = [...this.parentNode.children];
    const res = og.call(this, ...args);
    dGrade.add(this);
    const sibs2 = [...this.parentNode.children].filter(n => !sibs.includes(n));
    upgradeBranch(...sibs2);
    return res;
  }
  function innerTextSetter(og, ...args) {
    if (dGrade.has(this.getRootNode({ composed: true })))
      throw new Error("Downgraded objects cannot be changed. Is pointless.");
    if (!this.isConnected) return og.call(this, ...args);
    const removables = this.children.length && [...this.children];
    const res = og.call(this, ...args);
    removables && dGrade.add(...removables.filter(n => !n.isConnected));
    return res;
  }
  function textContentSetter(og, ...args) {
    if (this.nodeType !== Node.ELEMENT_NODE && this.nodeType !== Node.DOCUMENT_FRAGMENT_NODE)
      return og.call(this, ...args);
    if (dGrade.has(this.getRootNode({ composed: true })))
      throw new Error("Downgraded objects cannot be changed. Is pointless.");
    if (!this.isConnected) return og.call(this, ...args);
    const removables = this.children.length && [...this.children];
    const res = og.call(this, ...args);
    removables && dGrade.add(...removables);
    return res;
  }
  function insertAdjacentHTML_DD(og, position, ...args) {
    if (dGrade.has(this.getRootNode({ composed: true })))
      throw new Error("Downgraded objects cannot be changed. Is pointless.");
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
    upgradeBranch(...newRoots);
    return res;
  }

  const map = [
    [Element.prototype, "setAttribute", setAttribute_DD],

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

    [Node.prototype, "removeChild", removesArgs0],
    [Node.prototype, "replaceChild", removesArgs1],
    [Range.prototype, "deleteContents", removeChildren],
    [Range.prototype, "extractContents", removeChildren],
    [Element.prototype, "remove", removeThis],

    [Element.prototype, "replaceWith", element_replaceWith],
    [Element.prototype, "replaceChildren", parentnode_replaceChildren],
    [Document.prototype, "replaceChildren", parentnode_replaceChildren],
    [DocumentFragment.prototype, "replaceChildren", parentnode_replaceChildren],

    [Range.prototype, "surroundContents", range_surroundContent],

    [Element.prototype, "insertAdjacentHTML", insertAdjacentHTML_DD],

    [Element.prototype, "innerHTML", innerHTMLsetter],
    [ShadowRoot.prototype, "innerHTML", innerHTMLsetter],
    [Element.prototype, "outerHTML", outerHTMLsetter],
    [Node.prototype, "textContent", textContentSetter],
    [HTMLElement.prototype, "innerText", innerTextSetter],
  ];

  for (const [obj, prop, monkey] of map) {
    const d = Object.getOwnPropertyDescriptor(obj, prop);
    const og = d.value || d.set;
    function monkey2(...args) {
      return monkey.call(this, og, ...args);
    }
    Object.defineProperty(obj, prop,
      Object.assign({}, d, { [d.set ? "set" : "value"]: monkey2 }));
  }
})();

export function loadDoubleDots(aelOG) {
  if (document.readyState !== "loading")
    return upgradeBranch(document.htmlElement);
  aelOG.call(document, "DOMContentLoaded", _ => upgradeBranch(document.documentElement));
}