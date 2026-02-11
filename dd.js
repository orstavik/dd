import { PortalMap } from "./src/1_PortalMap.js";
import { EventLoopCube } from "./src/2_EventLoopCube.js";
import { monkeyPatchAppendElements } from "./src/3_monkeyPatchAppendElements.js";
import { I } from "./src/4_Portals.js";

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