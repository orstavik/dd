import { WeakDictionaryOfSets } from "./1_PortalMap.js";
// const TRIGGERS = new WeakDictionaryOfSets();
//this is the attribute itself for all functions.
// const PortalDefinition = {
//   onFirstConnect: function(){...}, //always returns undefined
//   onMove: function(){...}, //always returns undefined
//   onReConnect: function(){...}, //always returns undefined
//   onDisconnect: function(){...}, //always returns undefined
//   reaction: NAME => function(...args){...}, //can return a special thing to end the chain. otherwise whatever.
// }
// all functions have this as the attribute node.
// onFirstConnect, onMove, onReConnect are triggered when the attribute is (re-)added/moved to the DOM.
// onDisconnect is garbageCollected, so you don't know when that happens.
// reaction(...args) gets the previous output of the trigger and previous reactions, in reverse sequence

const Attr = {
  onFirstConnect() {
    const varName = this.name.split("_")[1];
    const action = !varName ?
      ([mr]) => EventLoopCube.dispatch(mr) :
      ([mr]) => mr.name.startsWith(varName) && EventLoopCube.dispatch(mr, this);
    const observer = new MutationObserver(action);
    observer.observe(this.ownerElement, { attributes: true, attributeOldValue: true });
  },
  reaction(...args) {
    //if the reaction has arguments, then it is a setter
    //if it has no arguments, then it is a getter
  }
}
/**
 * works out of the box using:
 * 
 * documents.Triggers.define("content-box", AttrResize);
 * documents.Triggers.define("border-box", AttrResize);
 * documents.Triggers.define("device-pixel-content-box", AttrResize);
 */
const Resize = {
  onFirstConnect() {
    const box = ["content-box", "border-box", "device-pixel-content-box"].includes(this.name) ? this.name : "content-box";
    this._observer = new ResizeObserver(([mr]) => eventLoop.dispatch(mr, this));
    this._observer.observe(this.ownerElement, { box });
  }
}

/**
 * AttrIntersection is the main base for IntersectionObserver.
 * With AttrIntersection we can deprecate IntersectionObserver.
 * All other IntersectionObserver triggers should use AttrIntersection.
 */
const Intersection = {
  onFirstConnect() {
    const options = this.name.split("_").slice(1);
    const isOff = options.includes("off");

    this._observer = new IntersectionObserver(([mr]) => eventLoop.dispatch(mr, this), { options });
    this._observer.observe(this.ownerElement);
  }
}
const i = {
  onFirstConnect: function () { eventLoopCube.dispatch(null, this); },
}
const prevent = {
  reaction: NAME => (...args) => (args.at(-1).preventDefault(), EventLoopCube.Void),
}


// function dispatchNav() {
//   const navs = TRIGGERS.get("nav")?.filter(at => at.ownerElement?.isConnected);
//   navs?.length && eventLoopCube.dispatchBatch(location, navs);
// }
// const Nav = {
//   onFirstConnect: function () { TRIGGERS.put("nav", this); },
//   reaction: NAME => function (...args) {
//     const e = args.at(-1);
//     if (!e.eventPhase)
//       return;
//     if (e.type === "popstate")
//       return dispatchNav("nav");
//     const defaultActionElement = e.defaultAction?.element;
//     if (!defaultActionElement)
//       return EventLoopCube.Cancel;
//     const href = defaultActionElement.href ?? defaultActionElement.request?.url;
//     if (!href)
//       return EventLoopCube.Cancel;
//     //We have a navigation event, that is meant for :nav:. After this point we commit, and we no longer EventLoopCube.Cancel.
//     const url = new URL(href);
//     if (url.origin !== location.origin)
//       return;


// const controller = this.ownerElement.getRootNode().querySelector("[data-nav]");
// if (controller) {
//   const blacklist = controller.getAttribute("data-nav").split(" ").map(s => s.trim());
//   if (blacklist.some(bl => url.pathname.startsWith(bl)))
//     return;
// }



//     e.preventDefault();
//     history.pushState({}, "", url);
//     dispatchNav();
//   },
// };

const log = {
  reaction: NAME => function (...args) { console.log(this, ...args); },
}

const StateTriggers = new WeakDictionaryOfSets();
const OldStates = Object.create(null);
const Props = Symbol("props");

const state = {
  onFirstConnect: function () {
    const [portal, ...props] = this.dots[0].split("_");
    OldStates[portal] ??= Object.create(null);
    if (props.length)
      this[Props] = props;
    StateTriggers.put(portal, this, _ => OldStates[portal] = undefined);
  },
  reaction: NAME => {
    const [portal, ...props] = NAME.split("_");
    return function (...args) {
      const oldState = OldStates[portal];
      let newState, changed;
      for (let i = 0; i < props.length; i++) {
        const prop = props[i];
        const arg = args[i];
        if (oldState[prop] !== arg) {
          newState = Object.assign(newState ?? Object.create(null), oldState, { [prop]: arg });
          (changed ??= []).push(prop)
        }
      }
      if (!newState) return;
      OldStates[portal] = Object.freeze(newState);
      let res;
      for (const trigger of StateTriggers.get(portal))
        if (!trigger[Props] || trigger[Props].some(prop => changed.includes(prop)))
          (res ??= []).push(trigger);
      eventLoopCube.dispatchBatch(newState, res);
    }
  }
}

export {
  prevent,
  i,
  // Attr,
  // Intersection,
  // Resize,
  state,
  // Nav,
  log,
};