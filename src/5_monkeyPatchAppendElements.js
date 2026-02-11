export function monkeyPatchAppendElements(onNodesConnected) {

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
    const sibs2 = [...this.parentNode.children].filter(n => !sibs.includes(n));
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
    [Element.prototype, "outerHTML", outerHTMLsetter],
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
}