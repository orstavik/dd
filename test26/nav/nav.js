//todo should we put this into the EventLoopCube?? eventLoopCube.getTriggers(portalName); ??
// class AttrWeakSet extends Set {
//   static #bigSet = new Set(); //wr => AttrWeakSet
//   static #key;
//   static GC = 10_000;

//   static gc() {                               //todo we can no longer rely on isConnected to determine activity..
//     let active, l;                            //todo we should also have an iterator here i think. the current iterator doesn't deref?
//     for (let wr of AttrWeakSet.#bigSet) {
//       if (l = wr.deref())
//         for (let a of l)
//           a.isConnected ? (active = true) : (l.delete(a), a.remove());
//       else
//         AttrWeakSet.#bigSet.delete(wr);

//     }
//     !active && (AttrWeakSet.#key = clearInterval(AttrWeakSet.#key));
//   }

//   constructor(...args) {
//     super(...args);
//     AttrWeakSet.#bigSet.add(new WeakRef(this));
//   }

//   add(at) {
//     AttrWeakSet.#key ??= si(AttrWeakSet.gc, AttrWeakSet.GC);
//     super.add(at);
//   }
// }

//should we do it manually in the DOM??
//<body dcl:nav>...</body>
//<div click:nav>...</div>

const triggers = new Set();
const triggersEmpty = new Set();
function external(url) {
  if (url.origin !== window.location.origin) return true;
  for (let t of triggersEmpty)
    if (!t.ownerElement.isConnected)
      triggersEmpty.delete(t);
  if (!triggersEmpty.size) return false;
  const specNav = triggersEmpty.values().next().value;
  const [whitelist, ...blacklist] = specNav.value.split(";");
  if (whitelist && !url.pathname.startsWith(whitelist)) return true;
  return blacklist.filter(Boolean).some(p => url.pathname.startsWith(p));
}

const NAV = {
  onFirstConnect: function () {
    this.name.indexOf(":") > -1 ?
      triggers.add(this) :
      triggersEmpty.add(this);
  },
  reaction: function (e) {
    if (typeof e === "string")
      e = new URL(e, location.href);
    if (e instanceof URL) {
      if (external(e))
        return;
      history.pushState(null, null, e.href);
      return eventLoop.dispatchBatch(LocationEvent(), triggers);
    }
    if (e.defaultPrevented)
      return;
    if (e.type === "popstate") //we capture this one.. do we now??
      e.preventDefault();
    if (e.type === "click") {  //should this be done as click:nav  ?? not internally??
      const a = e.target.closest("a[href]");
      if (!a)
        return;
      const url = new URL(a.href, location.href);
      if (external(url))
        return;
      e.preventDefault();
      const target = a.getAttribute("target");
      if (target?.toLowerCase() === "_blank")// todo fix the logic here so all the target values are handled correctly.  && target !== "_self" && target !== "_top") //todo
        return window.open(url.href, target);
      history.pushState(null, null, url);
    }
    eventLoop.dispatchBatch(LocationEvent(), triggers);
    //if it is a click event
    //if it is a popstate event
    //if it is a hashchange event

    const settings =  ?? ;
    eventLoopCube.dispatch(new URL(location.href), [...triggers]);
  }
}

let active;


export class Nav extends AttrCustom {
  upgrade() {
    if (!active) {
      for (let e of ["click", "popstate"])
        document.documentElement.setAttribute(`${e}:${this.trigger}`);
      active = true;
    }
    triggers.add(this);
    this.dispatchEvent(LocationEvent());
  }
  remove() {
    triggers.delete(this);
  }
}

export function nav(e) {
  if (typeof e === "string") {
    const url = new URL(e, location.href);
    if (external(url))
      return;
    history.pushState(null, null, url.href);
    return eventLoop.dispatchBatch(LocationEvent(), triggers);
  }
  if (e.defaultPrevented)
    return;
  else if (e.type === "click") {  //should this be done as click:nav  ?? not internally??
    const a = e.target.closest("a[href]");
    if (!a)
      return;
    const url = new URL(a.href, location.href);
    if (external(url))
      return;
    e.preventDefault();
    const target = a.getAttribute("target");
    if (target?.toLowerCase() === "_blank")// todo fix the logic here so all the target values are handled correctly.  && target !== "_self" && target !== "_top") //todo
      return window.open(url.href, target);
    history.pushState(null, null, url);
  }
  eventLoop.dispatchBatch(LocationEvent(), triggers);
}