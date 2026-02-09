import { monkeyPatch } from "./1_DoubleDots.js";
import { } from "./dd.js";
import { console as CONSOLE } from "./7_logging.js"; //todo this should be in /x/ folder
import { PrimitiveConstructors, attachShadowAlwaysOpen, DoubleDotDeprecated } from "./8_strict_deprecation.js";
import { cube, cubes } from "../../x/cube/v1.js";

//adding logging
Object.assign(CONSOLE, { cube, cubes });
Object.assign(DoubleDots, CONSOLE);
for (let [name, func] of Object.entries(CONSOLE))
  document.Reactions.define(name, func);

//DEPRECATIONS
for (let [path, func] of Object.entries(PrimitiveConstructors))
  monkeyPatch(path, func);
monkeyPatch("Element.prototype.attachShadow", attachShadowAlwaysOpen);
for (let [path, deprecate] of Object.entries(DoubleDotDeprecated))
  monkeyPatch(path, deprecate, deprecate);

//1. DoubleDots doesn't treat objects made using new as primitives.
//You can remove this restriction if you have a 3rd party library that
//use such objects, and these libraries will still work ok.
//But if you make stuff from scratch, 
//stay away from "new String/Number/Boolean()".
//2. DoubleDots MUST access full .composedPath for all events.
//3. Deprecate lots of the native methods
