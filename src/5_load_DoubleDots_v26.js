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

function connectBranch(els) {
  for (let el of els)
    for (const at of walkAttributes(el))
      window.eventLoopCube.connect(at);
}

function monkeyPatch() {

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
    const parentRoot = parent.getRootNode();
    return args.filter(a => {
      if (a.isConnected && a.getRootNode() != parentRoot)
        throw new Error("Adoption is illegal in DD.");
      // if(a.isConnected) to move nodes around is allowed, but you don't get a onConnect callback
      return !a.isConnected;
    });
  }

  function insertArgs(og, ...args) {
    const toBeUpgraded = this.isConnected && upgradeables(this, ...args);
    const res = og.call(this, ...args);
    this.isConnected && connectBranch(toBeUpgraded);
    return res;
  }
  function insertArgs0(og, ...args) {
    const toBeUpgraded = this.isConnected && upgradeables(this, args[0]);
    const res = og.call(this, ...args);
    this.isConnected && connectBranch(toBeUpgraded);
    return res;
  }
  function insertArgs1(og, ...args) {
    const toBeUpgraded = this.isConnected && upgradeables(this, args[1]);
    const res = og.call(this, ...args);
    this.isConnected && connectBranch(toBeUpgraded);
    return res;
  }
  function range_surroundContent(og, ...args) {
    const toBeUpgraded = this.isConnected && upgradeables(this, args[0]); //needed to validate the args[0]
    if (!this.isConnected)
      return og.call(this, ...args);
    const res = og.call(this, ...args);
    this.isConnected && connectBranch(toBeUpgraded);
    return res;
  }
  function element_replaceWith(og, ...args) {
    const toBeUpgraded = this.isConnected && upgradeables(this, ...args);
    const wasConnected = this.isConnected;
    const res = og.call(this, ...args);
    if (wasConnected) {
      this.isConnected && connectBranch(toBeUpgraded);
    }
    return res;
  }
  function parentnode_replaceChildren(og, ...args) {
    const toBeUpgraded = this.isConnected && upgradeables(this, ...args);
    const res = og.call(this, ...args);
    this.isConnected && connectBranch(toBeUpgraded);
    return res;
  }
  function innerHTMLsetter(og, ...args) {
    if (!this.isConnected) return og.call(this, ...args);
    const res = og.call(this, ...args);
    this.isConnected && connectBranch(this.children);
    return res;
  }
  function outerHTMLsetter(og, ...args) {
    if (!this.isConnected || !this.parentNode) return og.call(this, ...args);
    const sibs = [...this.parentNode.children];
    const res = og.call(this, ...args);
    const sibs2 = [...this.parentNode.children].filter(n => !sibs.includes(n));
    this.isConnected && connectBranch(sibs2);
    return res;
  }
  function innerTextSetter(og, ...args) {
    if (!this.isConnected) return og.call(this, ...args);
    const res = og.call(this, ...args);
    this.isConnected && connectBranch(this.children);
    return res;
  }
  function textContentSetter(og, ...args) {
    if (this.nodeType !== Node.ELEMENT_NODE && this.nodeType !== Node.DOCUMENT_FRAGMENT_NODE)
      return og.call(this, ...args);
    if (!this.isConnected) return og.call(this, ...args);
    const res = og.call(this, ...args);
    this.isConnected && connectBranch(this.children);
    return res;
  }
  function insertAdjacentHTML_DD(og, position, ...args) {
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
    this.isConnected && connectBranch(newRoots);
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
}

export {
  connectBranch,
  monkeyPatch,
}