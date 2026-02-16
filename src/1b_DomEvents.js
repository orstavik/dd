const DomEvents = ['touchstart', 'touchmove', 'touchend', 'touchcancel', 'beforexrselect', 'abort', 'beforeinput', 'beforematch', 'beforetoggle',
  'blur', 'cancel', 'canplay', 'canplaythrough', 'change', 'click', 'close', 'contentvisibilityautostatechange', 'contextlost', 'contextmenu',
  'contextrestored', 'cuechange', 'dblclick', 'drag', 'dragend', 'dragenter', 'dragleave', 'dragover', 'dragstart', 'drop', 'durationchange',
  'emptied', 'ended', 'error', 'focus', 'formdata', 'input', 'invalid', 'keydown', 'keypress', 'keyup', 'load', 'loadeddata', 'loadedmetadata',
  'loadstart', 'mousedown', 'mouseenter', 'mouseleave', 'mousemove', 'mouseout', 'mouseover', 'mouseup', 'mousewheel', 'pause', 'play', 'playing',
  'progress', 'ratechange', 'reset', 'resize', 'scroll', 'securitypolicyviolation', 'seeked', 'seeking', 'select', 'slotchange', 'stalled',
  'submit', 'suspend', 'timeupdate', 'toggle', 'volumechange', 'waiting', 'webkitanimationend', 'webkitanimationiteration', 'webkitanimationstart',
  'webkittransitionend', 'wheel', 'auxclick', 'gotpointercapture', 'lostpointercapture', 'pointerdown', 'pointermove', 'pointerrawupdate',
  'pointerup', 'pointercancel', 'pointerover', 'pointerout', 'pointerenter', 'pointerleave', 'selectstart', 'selectionchange', 'animationend',
  'animationiteration', 'animationstart', 'transitionrun', 'transitionstart', 'transitionend', 'transitioncancel', 'copy', 'cut', 'paste', 'command',
  'scrollend', 'scrollsnapchange', 'scrollsnapchanging', 'beforecopy', 'beforecut', 'beforepaste', 'search', 'fullscreenchange', 'fullscreenerror',
  'webkitfullscreenchange', 'webkitfullscreenerror'];
const NonBubblingEvents = new Set(['focus', 'blur', 'load', 'unload', 'error', 'abort', 'mouseenter', 'mouseleave',
  'scroll', 'scrollend', 'scrollsnapchange', 'scrollsnapchanging']);
const ComposedEvents = new Set(['click', 'auxclick', 'dblclick', 'mousedown', 'mouseup', 'focus', 'blur',
  'pointerdown', 'pointerup', 'pointercancel', 'pointerover', 'pointerout', 'pointerenter', 'pointerleave']);
const PassiveEvents = new Set(["wheel", "mousewheel", "touchstart", "touchmove"]);

function getTriggersComposedBubble(type, el) {
  let attrs, first;
  for (; el; el = el.assignedSlot ?? el.parentElement ?? el.parentNode.host)
    if (el[EventLoopCube.PORTAL]?.[type])
      for (let at of el.attributes)
        if (EventLoopCube.portalNames(at.name)[0] === type)
          !first ? (first = at) : (attrs ??= [first]).push(at);
  return attrs ?? first;
}
function getTriggersComposedTarget(type, el) {
  let attrs, first;
  for (; el; el = el.assignedSlot ?? el.getRootNode()?.host)
    if (el[EventLoopCube.PORTAL]?.[type])
      for (let at of el.attributes)
        if (EventLoopCube.portalNames(at.name)[0] === type)
          !first ? (first = at) : (attrs ??= [first]).push(at);
  return attrs ?? first;
}
function getTriggersBubble(type, el) {
  let attrs, first;
  for (; el && el instanceof HTMLElement; el = el.parentElement)
    if (el[EventLoopCube.PORTAL]?.[type])
      for (let at of el.attributes)
        if (EventLoopCube.portalNames(at.name)[0] === type)
          !first ? (first = at) : (attrs ??= [first]).push(at);
  return attrs ?? first;
}
function getTriggersTarget(type, el) {
  let attrs, first;
  if (el[EventLoopCube.PORTAL]?.[type])
    for (let at of el.attributes)
      if (EventLoopCube.portalNames(at.name)[0] === type)
        !first ? (first = at) : (attrs ??= [first]).push(at);
  return attrs ?? first;
}

function Portal(TYPE, reaction) {
  const passive = PassiveEvents.has(TYPE);
  const bubbles = !NonBubblingEvents.has(TYPE);
  const composed = ComposedEvents.has(TYPE);
  const propagationPath =
    (bubbles && composed) ? getTriggersComposedBubble :
      composed ? getTriggersComposedTarget :
        bubbles ? getTriggersBubble :
          getTriggersTarget;
  const listener = function (e) {
    e.stopImmediatePropagation();
    const atOrAttrs = propagationPath(TYPE, e.currentTarget);
    atOrAttrs instanceof Array ?
      eventLoopCube.dispatchBatch(e, atOrAttrs) :
      eventLoopCube.dispatch(e, atOrAttrs);
  };

  reaction ??= function () {
    this.ownerElement.dispatchEvent(new Event(TYPE, { bubbles, composed, cancelable: !passive }));
  }
  return {
    onFirstConnect: function () { this.ownerElement.addEventListener(TYPE, listener, { passive: passive || this.name.includes("_passive") }); },
    reaction,
  };
}
const Portals = Object.create(null);
Portals.click = Portal("click", function () { this.ownerElement.click() });
Portals.submit = Portal("submit", function () { this.ownerElement.requestSubmit() });

for (let type of DomEvents)
  Portals[type] ??= Portal(type);

export { Portals };