//Edge case 1: "Enter" on <input type=checkbox|radio|color>.
//    Browser behavior sometimes can interpret "Enter" as select. 
//    In this system, "Enter" is *always* treated as a <form submit>.
//    "Space to select, enter to submit" is the rule.
//Edge case 2: <button|input type=button> browser-developer associates no action with this thing.
//    However, the convention is that this will have an intent by the developer/3.party-developer, 
//    thus avoiding submit on click/enter default actions.
//
//INCLUSIVE .actions!! We do ALL the .actions that match an element, not just the first match.

const NativeDefaultActions = {
  click: {
    matcher: "a[href], area[href], label, button[type=submit], button[type=reset], input, option, select, textarea," +
      "[contenteditable=true], [tabindex], form button:not([type]), details>summary:first-of-type",
    actions: {
      "a[href],area[href]": t => t.cloneNode().click(),
      "form :is([type=submit],[type=image],button:not([type]))": el => el.form?.submit(el),
      "label": t => _ => t.control?.focus(),
      "summary": t => _ => t.parentElement?.tagName === "DETAILS" && t.parentElement.toggleAttribute("open"),
      "[type=reset]": t => _ => t.form?.reset(),
      "[type=checkbox],[type=radio]": t => _ => t.toggleAttribute("checked"),
      "option": t => _ => t.parentElement.value = t.value, //todo this seems weak
      "*": t => t.focus(),
    },
  },
  //todo lots to add here, like tabbing around and stuff.
  keydown: {
    matcher: "a[href], area[href], input, textarea, [contenteditable=true], button[type=submit], button[type=reset], form button:not([type])",
    actions: {
      "a[href],area[href]":
        (t, e) => (e.key === "Enter" || e.key === " ") && t.cloneNode().click(),  //space toggles, enter submits. But we don't include checkbox, radio, color...
      ":is(input,button):not([type=button],[type=reset],[type=file],[type=color],[type=range],[type=checkbox],[type=radio],[type=hidden])":
        (t, e) => (e.key === "Enter") && t.form?.submit(t),
      "select": t => t.toggleAttribute("open"), //todo does this work?
      "*": t => t.hasFocus || t.focus(), //adding or removing the enter character, we don't do,
    },
  }
}

function getNativeDefaultAction() {
  if (!this.isTrusted || this.defaultPrevented || !(this.type in NativeDefaultActions))
    return;
  //no custom defaultAction set, no .preventDefault() called, and we have native settings for this event.
  const { matcher, actions } = NativeDefaultActions[this.type];
  for (let el = this.composedPath()[0]; el; el = el !== this.currentTarget && (el.assignedSlot ?? el.parentElement ?? el.parentNode?.host))
    if (el.matches(matcher)) {
      const defaultAction = (actions, element) => {
        for (let m in actions)
          if (element.matches(m))
            actions[m](element, this);
      }
      defaultAction.element = el;
      defaultAction.native = true;
      return defaultAction;
    }
}
export function exposeNativeDefaultAction(
  MouseEventProto = MouseEvent.prototype,
  // KeyboardEventProto = KeyboardEvent.prototype
) {
  Object.defineProperty(MouseEventProto, "defaultAction", { get: getNativeDefaultAction });
  // Object.defineProperty(KeyboardEventProto, "defaultAction", { get: getNativeDefaultAction, set: function (v) { super.defaultAction = v; } });
}