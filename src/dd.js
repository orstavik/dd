import { DefaultActionMonkey } from "./0_EventDefaultAction.js";
import { PortalMap } from "./1_PortalMap.js";
import { NativePortalMap } from "./1b_NativePortals.js";
import { EventLoopCube } from "./2_EventLoopCube.js";
import { monkeyPatchAppendElements } from "./3_monkeyPatchAppendElements.js";
import { I } from "./4_Portals.js";

DefaultActionMonkey(Event.prototype);
const eventLoopCube = window.eventLoopCube = new EventLoopCube(1000, 3000);
window.EventLoopCube = EventLoopCube;
monkeyPatchAppendElements((...args) => eventLoopCube.connectBranch(...args));

const PortalMap2 = NativePortalMap(PortalMap);
document.portals = new PortalMap2(document);
Object.defineProperty(ShadowRoot.prototype, "portals", { value: document.portals });
// Object.defineProperty(ShadowRoot.prototype, "portals", { get: function () { return this.portals ??= new PortalMap2(this); } });

document.portals.define("i", I);

document.readyState !== "loading" ?
  eventLoopCube.connectBranch(document.documentElement) :
  document.addEventListener("DOMContentLoaded", _ =>
    eventLoopCube.connectBranch(document.documentElement));

// import * as wait from "../../x/wait/v1.js";
//todo this should probably be Wait_ too
//Wait_100:do-something:at.repeat //which would enable us to have a set timeout

// document.definePortal("template", template);
// document.definePortal("wait", wait);
// document.definePortal("prevent-default", { reactions: {i => (eventLoop.event.preventDefault(), i)] });
// document.definePortal("log", { log: function (...i) { console.log(this, ...i); return i[0]; } });
// document.definePortal("debugger", { debugger: function (...i) { console.log(this, ...i); debugger; return i[0]; } });

// loadDoubleDots(EventTarget.prototype.addEventListener);
//adding colors