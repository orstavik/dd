import { patchSegments } from "./0_UrlLocationSegments.js";
import { FormSubmitRequestFix } from "./0_FormSubmitRequestFix.js";
import { exposeNativeDefaultAction } from "./0_NativeDefaultActions.js";
// import { EventDefaultAction } from "./0_EventDefaultAction.js";
import { PortalMap } from "./1_PortalMap.js";
import { Portals as GlobalEvents } from "./1c_WindowDocumentEvents.js";
import { Portals as DomEvents } from "./1b_DomEvents.js";
import { EventLoopCube } from "./2_EventLoopCube.js";
import { monkeyPatchAppendElements } from "./3_monkeyPatchAppendElements.js";
import { I, prevent, Nav, log } from "./4_Portals.js";

patchSegments(URL.prototype, globalThis.Location?.prototype);
FormSubmitRequestFix(HTMLFormElement.prototype, HTMLButtonElement.prototype, HTMLInputElement.prototype);
exposeNativeDefaultAction();
window.EventLoopCube = EventLoopCube;

// const PortalMap2 = NativePortalMap(PortalMap);
document.portals = new PortalMap();
Object.defineProperty(ShadowRoot.prototype, "portals", { value: document.portals });
// Object.defineProperty(ShadowRoot.prototype, "portals", { get: function () { return this.portals ??= new PortalMap2(this); } });
const portals = {
  ...GlobalEvents,
  ...DomEvents,
  i: I,
  prevent: prevent,
  nav: Nav,
  log: log,
}
for (let [k, v] of Object.entries(portals))
  document.portals.define(k, v);

function init() {
  const cube = EventLoopCube.init(window, document.documentElement);
  monkeyPatchAppendElements((...args) => cube.connectBranch(...args));
  //todo filter on the document here? if the root is a shadowRoot, we just ignore it?
}

document.readyState !== "loading" ? init() : document.addEventListener("DOMContentLoaded", init);

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