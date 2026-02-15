//DEFAULT ACTIONS
//
//A default action is an action that the user, developer, and browser agrees to do as a result of an event.
//The native default actions that are registered are not visible during event propagation.
//This makes it hard for other gesture libraries to interact with the native events and default actions.
//
//To patch this, we expose the native default actions that has *up to the current point in the bubbling phase*
//has been associated to an event using only native html elements/attributes + browser behavior + user intent.
//
//In addition, we open the `.preventDefault()` and `.defaultPrevented` properties to allow other event listeners
//to mark that they have added a default action to an event. This makes it possible for multiple event listeners
//that don't know about each other to a) don't add a default action if a user and another developer has agreed to
//add another default action closer-to-the-target than my gesture/default action exists, and b) inspect what other
//default action has been added natively/by another library, and based on that information choose to override the 
//default action (that, yes, is closer to the target, but no, for some other reason, is deemed less relevant to the
//user intent).
//
//.preventDefault(cb) => add a default action that will run at the end of the event propagation.
//If the event bubbles, the default action will be added as a last event listener on the window for the same event.
//If the event does not bubble, the default action will be added on the uppermost target.
//
//
//Exposing native default actions:  .defaultPrevented => <Function|undefined|false>
//
//.defaultPrevented marks developer/third-party-developer/browser-developer intent.
//a default action is something that a developer (or browser) has interpreted a user interaction to mean.
//
//if somebody called .preventDefault(), then .defaultPrevented is undefined.
//if somebody called .preventDefault(cb), then .defaultPrevented is that cb.
//if nobody called .preventDefault(), then .defaultPrevented will be a function iff
//the browser will associate a default action for this event upto the currentTarget or false.
//Thus, .defaultPrevented tells us if a default action has been associated with an event hitherto in propagation. 
//This expands, but mirrors, the browsers except that now .defaultPrevented will
//give us the callback when a default action will run, and undefined will always mean that no default action will run.
//
//Native defaultAction cb function objects has a .element property that points to the element that triggers the default action.
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

const DefaultActions = {
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

function nativeDefaultAction() {
  const da = super.defaultPrevented;
  if (da === undefined || da instanceof Function)
    return da;
  if (!DefaultActions[this.type])
    return false;
  const { matcher, actions } = DefaultActions[this.type];
  for (let el = this.composedPath()[0]; el; el = el !== this.currentTarget && el.assignedSlot ?? el.parentElement ?? el.parentNode?.host)
    if (el.matches(matcher)) {
      const defaultAction = (actions, element) => {
        if (!this.defaultPrevented && Date.now() - this.timeStamp < 150 && eventLoop.hasFocus(this))
          for (let m in actions)
            if (element.matches(m))
              actions[m](element, this);
      }
      defaultAction.element = el;
      return defaultAction;
    }
}

Object.defineProperty(MouseEvent.prototype, "defaultPrevented", { get: nativeDefaultAction });
Object.defineProperty(KeyboardEvent.prototype, "defaultPrevented", { get: nativeDefaultAction });

const DefaultAction = Symbol("defaultAction");
const DefaultActionCaller = Symbol("defaultActionCaller");
const DefaultActionListener = function (e) { e[DefaultAction].call(e[DefaultActionCaller]); }

export function DefaultActionMonkey(EventPrototype = Event.prototype) {
  const preventDefaultOG = EventPrototype.preventDefault;
  Object.defineProperty(EventPrototype, "defaultPrevented", {
    get: function () { return DefaultAction in this ? this[DefaultAction] : false; }
  });
  Object.defineProperty(EventPrototype, "preventDefault", {
    value: function (newCb) {
      newCb ||= undefined;
      preventDefaultOG.call(this);
      this[DefaultActionCaller] = this.currentTarget;
      const oldCb = this[DefaultAction];
      this[DefaultAction] = newCb;
      if ((oldCb instanceof Function) === (newCb instanceof Function))
        return;
      const lastTarget = this.bubbles ? window :
        !this.composed ? this.target : //there is a super edge case where focus events can travel multiple shadowRoots, but not sure if that applies anymore.
          this.target.getRootNode() === document ? this.target :
            this.composedPath().find(el => el.getRootNode() === document);
      oldCb instanceof Function && lastTarget.removeEventListener(this.type, DefaultActionListener, { once: true });
      newCb instanceof Function && lastTarget.addEventListener(this.type, DefaultActionListener, { once: true });
    }
  });
}