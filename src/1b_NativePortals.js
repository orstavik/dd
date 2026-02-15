const DocumentOnlyEvents = new Set(['DOMContentLoaded', 'readystatechange', 'pointerlockchange', 'pointerlockerror', 'freeze', 'prerenderingchange',
  'resume', 'visibilitychange']);
const WindowOnlyEvents = new Set(['appinstalled', 'beforeinstallprompt', 'afterprint', 'beforeprint', 'beforeunload', 'hashchange', 'languagechange',
  'message', 'messageerror', 'offline', 'online', 'pagehide', 'pageshow', 'popstate', 'rejectionhandled', 'storage', 'unhandledrejection', 'unload',
  'devicemotion', 'deviceorientation', 'deviceorientationabsolute', 'pageswap', 'pagereveal', 'YouTubeIframeAPIReady']);
const DomEvents = new Set(['touchstart', 'touchmove', 'touchend', 'touchcancel', 'beforexrselect', 'abort', 'beforeinput', 'beforematch', 'beforetoggle',
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
  'webkitfullscreenchange', 'webkitfullscreenerror']);
const ReservedNames = new RegExp("^(" + ["dcl", ...DocumentOnlyEvents, ...WindowOnlyEvents, ...DomEvents].join("|") + ")[._$]");

const NonBubblingEvents = new Set(['focus', 'blur', 'load', 'unload', 'error', 'abort', 'mouseenter', 'mouseleave',
  'scroll', 'scrollend', 'scrollsnapchange', 'scrollsnapchanging']);
const ComposedEvents = new Set(['click', 'auxclick', 'dblclick', 'mousedown', 'mouseup', 'focus', 'blur',
  'pointerdown', 'pointerup', 'pointercancel', 'pointerover', 'pointerout', 'pointerenter', 'pointerleave']);
const PASSIVE = /^(wheel|mousewheel|touchstart|touchmove)[._$]/;
const EventsWithDefaultActions = new Set(['click', 'auxclick', 'dblclick', 'mousedown', 'mouseup', 'focus', 'blur',
  'pointerdown', 'pointerup', 'pointercancel', 'pointerover', 'pointerout', 'pointerenter', 'pointerleave', 'submit',
  'reset', 'change', 'input', 'keydown', 'keypress', 'keyup', 'cut', 'copy', 'paste', 'drop', 'dragover', 'dragenter',
  'dragleave', 'dragstart', 'dragend', 'drag', 'dragstart', 'dragend', 'dragover', 'dragenter', 'dragleave', 'drag']);

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
function Trigger(eventName, bubbles, composed, cancelable) {
  const propagationPath = (bubbles && composed) ? getTriggersComposedBubble :
    composed ? getTriggersComposedTarget :
      bubbles ? getTriggersBubble :
        getTriggersTarget;
  return function (e) {
    e.stopImmediatePropagation();
    const atOrAttrs = propagationPath(eventName, e.currentTarget);
    if (cancelable) {
      if (!(atOrAttrs instanceof Array)) atOrAttrs = [atOrAttrs];
      atOrAttrs.push(new MicroCallback(e => e.defaultAction?.()));
    }
    atOrAttrs instanceof Array ?
      eventLoopCube.dispatchBatch(e, atOrAttrs) :
      eventLoopCube.dispatch(e, atOrAttrs);
  };
}
const ListenerCache = Object.create(null);

function makeDefinition(NAME) {
  let EVENT = NAME.split(/[_.]/)[0];
  if (DomEvents.has(EVENT)) {
    const passive = !NAME.includes("_active") && PASSIVE.test(EVENT);
    const bubbles = !NonBubblingEvents.has(EVENT);
    const composed = ComposedEvents.has(EVENT);
    const listener = ListenerCache[NAME] ??= Trigger(EVENT, bubbles, composed);
    const cancelable = !passive;
    return Object.freeze({
      onFirstConnect: function () { this.ownerElement.addEventListener(EVENT, listener, { passive }); },
      reaction:
        EVENT === "click" ? function () { this.ownerElement.click(); } :
          EVENT === "submit" ? function () { this.ownerElement.requestSubmit(); } :
            function () { this.ownerElement.dispatchEvent(new Event(EVENT, { bubbles, composed, cancelable })); }
    });
  }
  if (WindowOnlyEvents.has(EVENT))
    return Object.freeze({
      onFirstConnect: function () { window.addEventListener(EVENT, dispatchEvent); },
      reaction: function () { window.dispatchEvent(new Event(EVENT)); }
    });
  if (EVENT === "dcl") EVENT = "DOMContentLoaded";
  if (DocumentOnlyEvents.has(EVENT))
    return Object.freeze({
      onFirstConnect: function () { document.addEventListener(EVENT, dispatchEvent); },
      reaction: function () { document.dispatchEvent(new Event(EVENT)); }
    });
  return false;
}

const CACHE = Object.create(null);
export function NativePortalMap(PortalMap) {
  return class NativePortalMap extends PortalMap {
    define(name, Portal) {
      if (ReservedNames.test(name))
        throw new SyntaxError(`native event name '${name}' is already defined.`);
      return super.define(name, Portal);
    }
    getReaction(name) {
      return (CACHE[name] ??= makeDefinition(name)) || super.getReaction(name);
    }
    get(name) {
      return (CACHE[name] ??= makeDefinition(name)) || super.get(name);
    }
  }
}