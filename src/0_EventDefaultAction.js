//DEFAULT ACTION   //.defaultAction => <Function|undefined>
//
//A default action is an action that the user, developer, and browser agrees to do as a result of an event.
//The native default actions that are registered are not visible during event propagation.
//This makes it hard for other gesture libraries to interact with the native events and default actions.
//
//
//To patch this, we expose the native .defaultActions registered up to the *currentTarget* in bubbling phase propagation.
//.defaultAction marks developer/third-party-developer/browser-developer intent.
//a default action is something that a developer (or browser) has interpreted a user interaction to mean.
//
//.defaultAction => returns a function object. this is the cb() that will be called at the end of the event propagation.
//.defaultAction = falsy. essentially the same as calling .preventDefault.
//.defaultAction = cb. sets a new callback to be run *after* at the *end* of the propagation path.
//
//End of propagation is:
//If the event bubbles, the default action will be added as an event listener on the window for the same event.
//If the event does not bubble, the default action will be added on the uppermost target.
//
//All defaultAction objects are cb function objects has a .element property that points to the element that triggers the default action.
//
//Custom default actions return the function that will be called at the end of the event propagation.
//Edge case 1: "Enter" on <input type=checkbox|radio|color>.
//    Browser behavior sometimes can interpret "Enter" as select. 
//    In this system, "Enter" is *always* treated as a <form submit>.
//    "Space to select, enter to submit" is the rule.
//Edge case 2: <button|input type=button> browser-developer associates no action with this thing.
//    However, the convention is that this will have an intent by the developer/3.party-developer, 
//    thus avoiding submit on click/enter default actions.
//
//INCLUSIVE .actions!! We do ALL the .actions that match an element, not just the first match.

const DefaultAction = Symbol("defaultAction");

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
  if (super.defaultAction || this.defaultPrevented || !(this.type in NativeDefaultActions))
    return super.defaultAction;
  //no custom defaultAction set, no .preventDefault() called, and we have native settings for this event.
  const { matcher, actions } = NativeDefaultActions[this.type];
  for (let el = this.composedPath()[0]; el; el = el !== this.currentTarget && el.assignedSlot ?? el.parentElement ?? el.parentNode?.host)
    if (el.matches(matcher)) {
      const defaultAction = (actions, element) => {
        if (!this.defaultAction && Date.now() - this.timeStamp < 150 && eventLoop.hasFocus(this))
          for (let m in actions)
            if (element.matches(m))
              actions[m](element, this);
      }
      defaultAction.element = el;
      return defaultAction;
    }
}

Object.defineProperty(MouseEvent.prototype, "defaultAction", { get: getNativeDefaultAction, set: function (v) { super.defaultAction = v; } });
Object.defineProperty(KeyboardEvent.prototype, "defaultAction", { get: getNativeDefaultAction, set: function (v) { super.defaultAction = v; } });

export function EventDefaultAction(EventPrototype = Event.prototype) {
  Object.defineProperty(EventPrototype, "defaultAction", {
    get: function () { return this[DefaultAction]; },
    set: function (newCb) {
      if (!this.eventPhase)
        throw new Error(".defaultAction can only be set during sync propagation.");
      if (!(newCb === undefined || newCb instanceof Function))
        throw new Error("newCb must be a function or undefined");
      this.preventDefault();
      if (newCb) newCb.element = this.currentTarget;
      const oldCb = this[DefaultAction];
      this[DefaultAction] = newCb;
      if (!!oldCb === !!newCb) return;
      const lastTarget = this.bubbles ? window :
        !this.composed ? this.target : //there is a super edge case where focus events can travel multiple shadowRoots, but not sure if that applies anymore.
          this.target.getRootNode() === document ? this.target :
            this.composedPath().find(el => el.getRootNode() === document);
      oldCb && lastTarget.removeEventListener(this.type, oldCb, { once: true });
      newCb && lastTarget.addEventListener(this.type, newCb, { once: true });
    }
  });
}