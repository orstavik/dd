const BooleanOG = Boolean, NumberOG = Number, StringOG = String;
export const PrimitiveConstructors = {
  Boolean: function Boolean(arg) {
    if (new.target)
      throw new Error(`Replace "new Boolean(${arg})" with "Boolean(${arg})".`);
    return BooleanOG(arg);
  },
  Number: function Number(arg) {
    if (new.target)
      throw new Error(`Replace "new Number(${arg})" with "Number(${arg})".`);
    return NumberOG(arg);
  },
  String: function String(arg) {
    if (new.target)
      throw new Error(`Replace "new String(${arg})" with "String(${arg})".`);
    return StringOG(arg);
  },
};

const attachShadowOG = Element.prototype.attachShadow;
export function attachShadowAlwaysOpen(...args) {
  (args[0] ??= {}).mode = "open";
  return attachShadowOG.call(this, ...args);
}

const d = function deprecated() {
  throw new Error("Deprecated in DoubleDots strict.");
};

export const DoubleDotDeprecated = {
  "Element.prototype.hasAttributeNS": d,
  "Element.prototype.getAttributeNS": d,
  "Element.prototype.setAttributeNS": d,
  "Element.prototype.removeAttributeNS": d,
  "Element.prototype.setAttributeNode": d,
  "Element.prototype.removeAttributeNode": d,
  "Element.prototype.getAttributeNodeNS": d,
  "Element.prototype.setAttributeNodeNS": d,
  //     "outerHTML"
  "Event.prototype.stopPropagation": d,
  "Event.prototype.stopImmediatePropagation": d,
  "EventTarget.prototype.addEventListener": d,
  "EventTarget.prototype.removeEventListener": d,
  //.dispatchEvent
  "window.setTimeout": d,
  "window.clearTimeout": d,
  "window.setInterval": d,
  "window.clearInterval": d,
  "window.event": d,
  //must add "async sleep(ms)" first
  //MutationObserver
  //ResizeObserver
  //IntersectionObserver
  "Document.prototype.importNode": d,
  "Document.prototype.currentScript": d,
  "Document.prototype.write": d,
  // "createRange" //todo research
};
/*
"HTMLElement.prototype": {
  adoptionCallback: problematicDeprecationMethod, needs to highJack the HTMLElement constructor actually.
}
*/