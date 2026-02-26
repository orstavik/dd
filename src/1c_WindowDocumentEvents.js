import { WeakDictionaryOfSets } from "./1_PortalMap.js";

const TRIGGERS = new WeakDictionaryOfSets();

function portalDispatch(e) {
  const res = TRIGGERS.get(e.type);
  res && eventLoopCube.dispatchBatch(e, res);
}

function Portal(NAME, root = document) {
  return {
    onFirstConnect: function () {
      TRIGGERS.put(NAME, this, _ => root.removeEventListener(NAME, portalDispatch));
      root.addEventListener(NAME, portalDispatch);
    },
    reaction: NAME => () => portalDispatch(new Event(NAME)),
  };
}

const DocumentOnlyEvents =
  ['readystatechange', 'pointerlockchange', 'pointerlockerror', 'freeze', 'prerenderingchange', 'resume', 'visibilitychange'];
const WindowOnlyEvents = ['appinstalled', 'beforeinstallprompt', 'afterprint', 'beforeprint', 'beforeunload', 'hashchange', 'languagechange',
  'message', 'messageerror', 'offline', 'online', 'pagehide', 'pageshow', 'popstate', 'rejectionhandled', 'storage', 'unhandledrejection', 'unload',
  'devicemotion', 'deviceorientation', 'deviceorientationabsolute', 'pageswap', 'pagereveal'];

const Portals = Object.create(null);
Portals.dcl = Portal("DOMContentLoaded", document);
Portals.youtubeiframeapiready = Portal("YouTubeIframeAPIReady", window);
for (let type of DocumentOnlyEvents)
  Portals[type] = Portal(type, document);
for (let type of WindowOnlyEvents)
  Portals[type] = Portal(type, window);

export { Portals };