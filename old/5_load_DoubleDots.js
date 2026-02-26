import { monkeyPatch } from "./1_DoubleDots.js";
const Specializers = {
  "DocumentFragment.prototype.cloneNode": Node.prototype.cloneNode,
  "HTMLTemplateElement.prototype.insertAdjacentHTML": Element.prototype.insertAdjacentHTML,
  "HTMLTemplateElement.prototype.innerHTML": Object.getOwnPropertyDescriptor(Element.prototype, "innerHTML").set,
};
for (let [path, superior] of Object.entries(Specializers))
  monkeyPatch(path, superior);

// const state = [...document.querySelectorAll("*")];
//1. Since the DoubleDots is the only script.
//   The DoubleDots then runs so, we can just iterate on the main document.
//   Listen for the native DCL, and then upgrade the branch of the document.
//2. the adding HTML template methods. innerHTML + insertAdjacentHTML.
//3. setAttribute.
//   remember to disallow override-x attribute names immutable. Anything that starts with `override-` is illegal from setAttribute? yes.
//4. AttrUnknown upgradeUpgrade
//   1. It can only happen when new Trigger Defs are added to the main document.Triggers. 
//      This is because the shadowRoot.Triggers are locked post register time.
//5. WaitForItAttr. Promise Definitions.

(function (Element_p, ShadowRoot_p) {
  const Element_innerHTML_OG = Object.getOwnPropertyDescriptor(Element_p, "innerHTML").set;
  const innerHTML_DD_el = function innerHTML_DD(val) {
    Element_innerHTML_OG.call(this, val);
    AttrCustom.upgradeBranch(...this.children); //todo untested fix from project
  };

  const ShadowRoot_innerHTML_OG = Object.getOwnPropertyDescriptor(ShadowRoot_p, "innerHTML").set;
  const innerHTML_DD_sr = function innerHTML_DD(val) {
    ShadowRoot_innerHTML_OG.call(this, val);
    AttrCustom.upgradeBranch(...this.children); //todo untested fix from project
  };

  const insertAdjacentHTMLOG = Element_p.insertAdjacentHTML;
  function insertAdjacentHTML_DD(position, ...args) {
    //todo test the different versions here
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
    insertAdjacentHTMLOG.call(this, position, ...args);
    const addCount = root.children.length - childCount;
    const newRoots = Array.from(root.children).slice(index, index + addCount);
    AttrCustom.upgradeBranch(...newRoots);
  }

  const setAttributeOG = Element_p.setAttribute;
  const getAttributeNodeOG = Element_p.getAttributeNode;
  function setAttribute_DD(name, value) {
    //0. syntax error for "override-"
    if (name.startsWith("override-"))
      throw new SyntaxError("You can only set [override-xyz] attributes on elements in HTML template: " + name);
    //1. treat the normal normal
    // if (!name.includes(":"))
      // return setAttributeOG.call(this, name, value);
    //2. if the name is DoubleDots
    let at = getAttributeNodeOG.call(this, name);
    if (at) {
      at.value !== value && (at.value = value);
      return;
    }
    setAttributeOG.call(this, name, value);
    at = getAttributeNodeOG.call(this, name);
    AttrCustom.upgrade(at);
  }
  const mainOverrides = {
    "Element.prototype.innerHTML": innerHTML_DD_el,
    "ShadowRoot.prototype.innerHTML": innerHTML_DD_sr,
    "Element.prototype.insertAdjacentHTML": insertAdjacentHTML_DD,
    "Element.prototype.setAttribute": setAttribute_DD,
  };
  for (let [path, func] of Object.entries(mainOverrides))
    monkeyPatch(path, func);
})(Element.prototype, ShadowRoot.prototype);

(function () {
  //todo we need the innerHTML and insertAdjacentHTML and setAttribute to be added to the nativeMethods.

  const EMPTY = [];
  //JS injections is allowed when we
  //1) move elements within the same rootNode (no upgrade of AttrCustom)
  //2) move elements from one DocumentFragment to another (no upgrade of AttrCustom)
  //3) inject elements *from* DocumentFragments to an .isConnected element (DO upgrade of AttrCustom)
  //* otherwise just fail.
  function checkRoot(root, child, r = root.getRootNode(), cr = child?.getRootNode()) {
    if (root.isConnected && child instanceof DocumentFragment)
      return [...child.children];
    if (root.isConnected && (child instanceof Element) && (cr instanceof DocumentFragment))
      return [child];
    if (!(child instanceof Element) || cr === r || (cr instanceof DocumentFragment && r instanceof DocumentFragment))
      return EMPTY;
    throw new DoubleDots.InsertElementFromJSError(root, child);
  }

  function sameRootFirstArg(child) {
    return checkRoot(this, child);
  }
  function sameRootSecond(_, child) {
    return checkRoot(this, child);
  }
  function sameRootSpreadArg(...args) {
    const r = this.getRootNode();
    return args.map(child => checkRoot(this, child, r)).flat();
  }

  function verifyAndUpgrade(OG, verify) {
    return function (...args) {
      const upgrades = verify.call(this, ...args);
      const res = OG.apply(this, args);
      upgrades.length && AttrCustom.upgradeBranch(...upgrades);
      return res;
    };
  }

  const Mask = {
    "Node.prototype.insertBefore": sameRootFirstArg,
    "Node.prototype.appendChild": sameRootFirstArg,
    "Element.prototype.after": sameRootSpreadArg,
    "Element.prototype.before": sameRootSpreadArg,
    "Element.prototype.insertAdjacentElement": sameRootSecond,
    "Element.prototype.append": sameRootSpreadArg,
    "Element.prototype.prepend": sameRootSpreadArg,
    "Document.prototype.append": sameRootSpreadArg,
    "Document.prototype.prepend": sameRootSpreadArg,
    "DocumentFragment.prototype.append": sameRootSpreadArg,
    "DocumentFragment.prototype.prepend": sameRootSpreadArg,
    //replaceChild
  };

  for (let [path, verify] of Object.entries(Mask))
    monkeyPatch(path,
      verifyAndUpgrade(path.split(".").reduce((o, p) => o[p], window), verify));
})();

export function loadDoubleDots(aelOG) {
  if (document.readyState !== "loading")
    return AttrCustom.upgradeBranch(document.htmlElement);
  aelOG.call(document, "DOMContentLoaded", _ => AttrCustom.upgradeBranch(document.documentElement));
}