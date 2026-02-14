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
//.defaultPrevented => returns <element|Request|Function|false>. The .defaultPrevented tells us if a default action has been
//associated with an event. This echoes native behavior in that if *no* default action is added, then false is returned,
//but if another default action has been added, truthy is returned. 
//Native default action for navigation and xhr is special and yields a Request object.
//Custom default actions return the function that will be called at the end of the event propagation.
//Other native default actions return the element associated with the action:
//  toggle and focus: element to be focused or toggled.
//  form input, select, textarea: the element who has default action associated with an event.
//    Edge case: "Enter" on <input type=checkbox> and <input type=color>.
//    Browser behavior sometimes can interpret "Enter" as select. 
//    In this system, "Enter" is *always* treated as a <form submit>.
//    "Space to select, enter to submit" is the rule.
//
//.preventDefault(cb) => add a default action that will run at the end of the event propagation.
//If the event bubbles, the default action will be added as a last event listener on the window for the same event.
//If the event does not bubble, the default action will be added on the uppermost target.

function getFormRequest(submitter) {
  const form = submitter.tagName === 'FORM' ? submitter : submitter.form;
  if (!form) return;
  const method = (submitter.getAttribute('formmethod') || form.getAttribute('method') || 'GET').toUpperCase();
  if (method === "DIALOG")
    return form.closest("dialog");
  const formData = new FormData(form);
  form !== submitter && submitter.name && formData.append(submitter.name, submitter.value);
  const action = submitter.getAttribute('formaction') || form.getAttribute('action') || window.location.href;
  const enctype = submitter.getAttribute('formenctype') || form.getAttribute('enctype') || 'application/x-www-form-urlencoded';
  let referrerPolicy = form.getAttribute('referrerpolicy') || undefined;
  const rel = form.getAttribute('rel');
  if (rel && rel.toLowerCase().split(' ').includes('noreferrer'))
    referrerPolicy = 'no-referrer';
  const credentials = "include";
  const init = { method, credentials, referrerPolicy };
  const url = new URL(action, window.document.baseURI);
  if (method === "GET") {
    url.search = new URLSearchParams(formData);
    return new Request(url, init);
  }
  if (enctype === 'multipart/form-data')
    return new Request(url, { ...init, body: formData });
  if (enctype === 'text/plain')
    return new Request(url, {
      ...init,
      body: [...formData].map(([k, v]) => `${k}=${v}`).join('\r\n'),
      headers: { 'Content-Type': 'text/plain' }
    });
  return new Request(url, { ...init, body: new URLSearchParams(formData) });
}

const EnterSubmitInputsMatch = `input:not([type]),
input[type=text],input[type=search],input[type=url],input[type=tel],input[type=email],input[type=password],input[type=number],
input[type=date],input[type=month],input[type=week],input[type=time],input[type=datetime-local],
input[type=checkbox],input[type=radio],input[type=color]`;

function keydownIntent(composedPath, currentTarget, event) {
  for (let target of composedPath) {
    if (target.matches("textarea")) return target;
    if (event.key == 'Enter' && target.matches("a[href], button, input[type=submit], input[type=reset], input[type=button], input[type=image]"))
      return clickIntent(composedPath, currentTarget, event);
    if (event.key == 'Enter' && target.form && target.matches(EnterSubmitInputsMatch))
      return getFormRequest(
        target.form.querySelector("button:not([type]), button[type=submit], input[type=submit], input[type=image]") ??
        target.form);
    if (target.matches("form, input, select, textarea, button"))
      return target;
    if (target === currentTarget) return;
  }
}

function clickIntent(composedPath, currentTarget) {
  for (let target of composedPath) {
    try {
      if (target.matches("a[href], area[href]") && target.href)
        return new Request(target.href, { method: "GET", referrerPolicy: target.referrerPolicy });
      if (target.form && target.matches("input[type=submit], input[type=reset], button[type=submit], button[type=reset]"))
        return getFormRequest(target);
      if (target.matches("details>summary:first-of-type"))
        return target.parentElement;
      if (target.matches("dialog[open]"))
        return target;
      if (target.matches("label") && target.control)
        return target.control;
      if (target.matches("input, select, textarea"))
        return target;
      if (target === currentTarget)
        return;
    } catch (cause) {
      //prints errors to console, the browser will run as if nothing happened. as it does normally too.
      console.error(new Error("Native default action looks wrong: " + target.outerHTML, { cause }));
    }
  }
}

const NativeIntents = {
  click: clickIntent,
  mousedown: clickIntent,
  keydown: event => event.key === "Enter" ? keydownIntent(event.composedPath(), event.currentTarget, event) : undefined
}

const DefaultAction = Symbol("defaultAction");
const DefaultActionCaller = Symbol("defaultActionCaller");
const DefaultActionListener = function (e) { e[DefaultAction].call(e[DefaultActionCaller]); }

export function DefaultActionMonkey(EventPrototype = Event.prototype) {
  Object.defineProperties(EventPrototype, {
    stopPropagation: { value: () => { throw new ReferenceError("e.stopPropagation() is deprecated."); } },
    stopImmediatePropagation: { value: () => { throw new ReferenceError("e.stopImmediatePropagation() is deprecated."); } }
  });

  const preventDefaultOG = EventPrototype.preventDefault;
  Object.defineProperty(EventPrototype, "defaultPrevented", {
    get: function () {
      return (this[DefaultAction] ??= NativeIntents[this.type]?.(this.composedPath(), this.currentTarget, this)) || false;
    }
  });
  Object.defineProperty(EventPrototype, "preventDefault", {
    value: function (newCb) {
      preventDefaultOG.call(this);
      this[DefaultActionCaller] = this.currentTarget;
      const oldCb = this[DefaultAction];
      this[DefaultAction] = newCb || false;
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