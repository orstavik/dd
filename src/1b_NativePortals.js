// const dcl = new Set(["dcl"]); //'DOMContentLoaded' is special because it is uppercase..
const DocumentOnlyEvents = new Set(['readystatechange', 'pointerlockchange', 'pointerlockerror', 'freeze', 'prerenderingchange', 'resume', 'visibilitychange']);
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
const allNames = new Set(["dcl", ...DocumentOnlyEvents, ...WindowOnlyEvents, ...DomEvents]);
const isReservedName = name => allNames.has(name) && new TypeError(`Cannot define native event name as portal '${name}'.`);

const ElementEvent = NAME => Object.freeze({
  onFirstConnect: function () {
    this.ownerElement.addEventListener(NAME, e => eventLoopCube.dispatch(e, this));
  },
  reaction: function () {
    this.ownerElement.dispatchEvent(Object.assign(new Event(NAME, { bubbles: true })));
  }
});
const DocumentEvent = NAME => Object.freeze({
  onFirstConnect: function () {
    this.ownerElement.getRootNode().addEventListener(NAME, e => eventLoopCube.dispatch(e, this));
  },
  reaction: function () {
    this.ownerElement.getRootNode().dispatchEvent(Object.assign(new Event(NAME, { bubbles: true })));
  }
});
const WindowEvent = NAME => Object.freeze({
  onFirstConnect: function () {
    window.addEventListener(NAME, e => eventLoopCube.dispatch(e, this));
  },
  reaction: function () {
    window.dispatchEvent(Object.assign(new Event(NAME, { bubbles: true })));
  }
});

const cache = {};
const getNativeEvent = name => {
  if (name in cache)
    return cache[name];
  const portal = name.split(/[._:]/)[0];
  return cache[name] = cache[portal] ??
    (DomEvents.has(portal) ? ElementEvent(portal) :
      WindowOnlyEvents.has(portal) ? WindowEvent(portal) :
        DocumentOnlyEvents.has(portal) ? DocumentEvent(portal) :
          portal === "dcl" ? DocumentEvent("DOMContentLoaded") :
            undefined);
}

export function NativePortalMap(PortalMap) {
  return class NativePortalMap extends PortalMap {
    define(name, Portal) { return isReservedName(name) || super.define(name, Portal); }
    getReaction(name) { return getNativeEvent(name) ?? super.getReaction(name); }
    get(name) { return getNativeEvent(name) ?? super.get(name); }
  }
}