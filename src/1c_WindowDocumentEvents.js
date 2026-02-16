class WeakDictionaryOfSets {
  #dict = Object.create(null);
  #onEmpties = Object.create(null);
  #gcInstance;
  #gcInterval;
  constructor(gc = 10_000) { this.#gcInterval = gc; }
  put(name, value, onEmptyCb) {
    const set = this.#dict[name] ??= new Set();
    set.add(new WeakRef(value));
    this.#onEmpties[name] = onEmptyCb;
    this.#gcInstance ||= this.#gc();
  }
  get(name) {
    if (!this.#dict[name])
      return;
    const set = this.#dict[name];
    let res;
    for (const wr of set) {
      const v = wr.deref();
      if (!v) set.delete(wr);
      else if (res) res.push(v);
      else res = [v];
    }
    return res;
  }
  #gc() {
    this.#gcInstance = setInterval(() => {
      for (const n in this.#dict) {
        const set = this.#dict[n];
        for (const wr of set)
          if (!wr.deref())
            set.delete(wr);
        if (set.size === 0) {
          this.#onEmpties[n]?.();
          delete this.#dict[n];
          delete this.#onEmpties[n];
        }
      }
      if (!Object.keys(this.#dict).length)
        this.#gcInstance = clearInterval(this.#gcInstance);
    }, this.#gcInterval);
  }
}

const triggerMap = new WeakDictionaryOfSets();

function portalDispatch(e) {
  const res = triggerMap.get(e.type);
  res && eventLoopCube.dispatchBatch(e, res);
}

function Portal(NAME, root = document) {
  return {
    onFirstConnect: function () {
      triggerMap.put(NAME, this, _ => root.removeEventListener(NAME, portalDispatch));
      root.addEventListener(NAME, portalDispatch);
    },
    reaction: () => portalDispatch(new Event(NAME)),
  };
}

const DocumentOnlyEvents =
  ['readystatechange', 'pointerlockchange', 'pointerlockerror', 'freeze', 'prerenderingchange', 'resume', 'visibilitychange'];
const WindowOnlyEvents = ['appinstalled', 'beforeinstallprompt', 'afterprint', 'beforeprint', 'beforeunload', 'hashchange', 'languagechange',
  'message', 'messageerror', 'offline', 'online', 'pagehide', 'pageshow', 'popstate', 'rejectionhandled', 'storage', 'unhandledrejection', 'unload',
  'devicemotion', 'deviceorientation', 'deviceorientationabsolute', 'pageswap', 'pagereveal', 'YouTubeIframeAPIReady'];

const Portals = Object.create(null);
Portals.dcl = Portal("DOMContentLoaded", document);
for (let type in DocumentOnlyEvents)
  Portals[type] = Portal(type, document);
for (let type in WindowOnlyEvents)
  Portals[type] = Portal(type, window);

export { Portals };