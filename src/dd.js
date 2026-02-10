// import { } from "./1_DoubleDots.js";
import { Attr, Intersection, Resize } from "./2_AttrCustom_v26.js";
import { DefinitionsMap } from "./3_definition_registers_v26.js";
import { EventLoopCube } from "./4_eventLoopCube_v26.js";
import { connectBranch, monkeyPatch, GC_doubleDots, shimRequestIdleCallback } from "./5_load_DoubleDots_v26.js";

const PORTALS = new DefinitionsMap();
Object.defineProperty(Document.prototype, "portals", { value: PORTALS });
Object.defineProperty(ShadowRoot.prototype, "portals", { value: PORTALS });

document.portals.define("i", {
  onConnect: _ => window.eventLoopCube.dispatch("i", this),
});

window.eventLoopCube = new EventLoopCube();

shimRequestIdleCallback(window.setTimeout);
setInterval(GC_doubleDots, 1000);
monkeyPatch();

(function loadDoubleDots() {
  if (document.readyState !== "loading")
    return connectBranch([document.documentElement]);
  document.addEventListener("DOMContentLoaded", _ => connectBranch([document.documentElement]));
})();


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