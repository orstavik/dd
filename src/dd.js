import { PortalMap } from "./1_PortalMap.js";
import { EventLoopCube } from "./2_EventLoopCube.js";
import { monkeyPatchAppendElements } from "./3_monkeyPatchAppendElements.js";
import { I } from "./4_Portals.js";

const PORTALS = new PortalMap();
Object.defineProperty(Document.prototype, "portals", { value: PORTALS });
Object.defineProperty(ShadowRoot.prototype, "portals", { value: PORTALS });
document.portals.define("i", I);

const eventLoopCube = window.eventLoopCube = new EventLoopCube(1000, 3000);
window.EventLoopCube = EventLoopCube;
monkeyPatchAppendElements(eventLoopCube.connectBranch.bind(eventLoopCube));
document.readyState !== "loading" ?
  eventLoopCube.connectBranch(document.documentElement) :
  document.addEventListener("DOMContentLoaded", _ =>
    eventLoopCube.connectBranch(document.documentElement));

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