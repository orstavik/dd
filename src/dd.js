// import { } from "./1_DoubleDots.js";
// import { Attr, Intersection, Resize } from "./2_AttrCustom_v26.js";
import { PortalMap } from "./3_PortalMap.js";
import { EventLoopCube } from "./4_EventLoopCube.js";
import { monkeyPatchAppendElements } from "./5_monkeyPatchAppendElements.js";

const PORTALS = new PortalMap();
Object.defineProperty(Document.prototype, "portals", { value: PORTALS });
Object.defineProperty(ShadowRoot.prototype, "portals", { value: PORTALS });

document.portals.define("i", {
  onConnect: function () { eventLoopCube.dispatch("i", this); },
});

//setting up event loop cube
const eventLoopCube = window.eventLoopCube = new EventLoopCube(1000, 3000);

//we are getting all the triggers 
monkeyPatchAppendElements(eventLoopCube.connectBranch.bind(eventLoopCube));
(function loadDoubleDots() {
  if (document.readyState !== "loading")
    return eventLoopCube.connectBranch(document.documentElement);
  document.addEventListener("DOMContentLoaded", _ => eventLoopCube.connectBranch(document.documentElement));
})();

// function shimRequestIdleCallback(setTimeoutOG = window.setTimeout) {
//   window.requestIdleCallback ??= function requestIdleCallback(cb, { timeout = Infinity } = {}) {
//     const callTime = performance.now();
//     return setTimeoutOG(_ => {
//       const start = performance.now();
//       cb({
//         didTimeout: (performance.now() - callTime) >= timeout,
//         timeRemaining: () => Math.max(0, 50 - (performance.now() - start))
//       });
//     }, 16);
//   };
//   window.cancelIdleCallback ??= clearTimeout;
// }
// shimRequestIdleCallback(setTimeout);









// import * as define from "../../x/define/v25x.js";
// import * as template from "../../x/template/v25.js";
// import * as wait from "../../x/wait/v1.js";
//todo this should probably be Wait_ too
//Wait_100:do-something:at.repeat //which would enable us to have a set timeout

// document.definePortal("template", template);
// document.definePortal("define", define);
// document.definePortal("wait", wait);
// document.definePortal("prevent-default", { reactions: {i => (eventLoop.event.preventDefault(), i)] });
// document.definePortal("log", { log: function (...i) { console.log(this, ...i); return i[0]; } });
// document.definePortal("debugger", { debugger: function (...i) { console.log(this, ...i); debugger; return i[0]; } });

// loadDoubleDots(EventTarget.prototype.addEventListener);
//adding colors