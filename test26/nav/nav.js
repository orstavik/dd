const NAV = {
  onConnect: function () {
    
  },
  reaction: function () {
    
  },
  onDisconnect: function () {
    
  }
}

const triggers = new DoubleDots.AttrWeakSet();
let active;

const LocationEvent = _ => Object.assign(new Event("location"), { [Event.data]: new URL(location) });
let specNav;
function external(url) {
  if (url.origin !== window.location.origin) return true;
  const [whitelist, ...blacklist] = specNav?.value?.split(";");// slightly inefficient
  if (whitelist && !url.pathname.startsWith(whitelist)) return true;
  return blacklist.filter(Boolean).some(p => url.pathname.startsWith(p));
}

export class Nav extends AttrCustom {
  upgrade() {
    if (!this.reactions.length && this.value) //naive, no check of overlaps
      return specNav = this;
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
  if (!triggers.size) {
    for (let e of ["click", "popstate", "hashchange"])
      document.htmlElement.removeAttribute(`${e}:${eventLoop.reaction.name}`);
    //todo check that this eventLoop.reaction.name is correct
    active = false;
    return;
  }
  if (e.defaultPrevented)
    return;
  if (e.type === "popstate") {
    e.preventDefault();
  } else if (e.type === "click") {
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