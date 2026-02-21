//DEFAULT ACTION   //.defaultAction = <Function|undefined>
//
//.defaultPrevented (the native default action has been cancelled)
//.preventDefault() (cancel the native default action)
//.cancelable       (the native default action can be cancelled)
//
//A default action is an action that the user, developer, and browser agrees to do as a result of an event.
//The native default actions that are registered are not visible during event propagation.
//This makes it hard for other gesture libraries to interact with the native events and default actions.
//The .defaultAction function has a .element property that points to the element that triggers the default action.
//
//The native default action must be cancelled in addition if it is not to run.
//
//To patch this, we expose the native .defaultActions registered up to the *currentTarget*.
//.defaultAction marks developer/third-party-developer intent.
//a default action is something that a developer (or browser) has interpreted a user interaction to mean.
//
//att!! In this setup, we don't run updateEventListenerForDefaultAction(event, oldCb, newCb). !!
//By default, the .defaultAction is scheduled to run at the end of the event propagation:
// - event.bubbles: the default action will be added as an event listener on the window for the same event.
// - !event.bubbles: the default action will be added on the uppermost target.
//

function updateEventListenerForDefaultAction(event, oldCb, newCb) {
  if (!!oldCb === !!newCb)
    return;
  const lastTarget = event.bubbles ? window :
    !event.composed ? event.target : //there is a super edge case where focus events can travel multiple shadowRoots, but not sure if that applies anymore.
      event.target.getRootNode() === document ? event.target :
        event.composedPath().find(el => el.getRootNode() === document);
  oldCb && lastTarget.removeEventListener(event.type, oldCb, { once: true });
  newCb && lastTarget.addEventListener(event.type, newCb, { once: true });
}

const DefaultAction = Symbol("defaultAction");
export function EventDefaultAction(EventPrototype = Event.prototype) {
  Object.defineProperty(EventPrototype, "defaultAction", {
    get: function () { return this[DefaultAction]; },
    set: function (newCb) {
      if (!this.eventPhase)
        throw new Error(".defaultAction can only be set during sync propagation.");
      if (!(newCb === undefined || newCb instanceof Function))
        throw new Error("newCb must be a function or undefined");
      // this.preventDefault();
      if (newCb) newCb.element = this.currentTarget;
      // const oldCb = this[DefaultAction];
      this[DefaultAction] = newCb;
      // return updateEventListenerForDefaultAction(this, oldCb, newCb);
      //In this code, we don't want the event listener, as we handle event propagation manually.
    }
  });
}