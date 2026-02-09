import { } from "./1_DoubleDots.js";
import { } from "./2_AttrCustom_v25x.js";
import { } from "./3_definition_registers_v25x.js";
import { } from "./4_eventLoop_v25x.js";
import { loadDoubleDots } from "./5_load_DoubleDots_v25.js";
import * as define from "../../x/define/v25x.js";
import * as template from "../../x/template/v25.js";
import * as wait from "../../x/wait/v1.js";
//todo this should probably be Wait_ too
//Wait_100:do-something:at.repeat //which would enable us to have a set timeout

document.definePortal("i", {
  "I": class AttrEmpty extends AttrCustom {
    upgrade() { eventLoop.dispatch(new Event(this.trigger), this); }
  }
});

document.definePortal("template", template);
document.definePortal("define", define);
document.definePortal("wait", wait);
// document.definePortal("prevent-default", { reactions: {i => (eventLoop.event.preventDefault(), i)] });
document.definePortal("log", { log: function (...i) { console.log(this, ...i); return i[0]; } });
document.definePortal("debugger", { debugger: function (...i) { console.log(this, ...i); debugger; return i[0]; } });

loadDoubleDots(EventTarget.prototype.addEventListener);
//adding colors