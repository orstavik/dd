# `StateMachineAttr`

>> TODO rename gesture to `StateMachineAttr` in other files.

Some state machines, such as gestures, needs to listen for multiple different types of events. The state machine might begin its life cycle with 3 active listeners. It then switches to another state that do not need 2 of the previous listeners, but needs to add 4 more. Then, it switches again, removing all the existing ones, before adding two new listeners. Before it switches back again to one of the previous states. `click` is a fairly simple such state machine. `swipe` is another complex example. UI events is a common platform for such state machines, but there are examples of such complexities outside the UI world too, such as custom `document-ready-to-do-this-or-that` events.

These state machines essentially conduct an orchestra of listeners: ***they spawn and destroy listeners dynamically***. Auch.. That is complex code activities. It requires a lot of boiler plate code. And it is highly error prone. But fear not! To address these problems DoubleDots have implemented a special `class StateMachineAttr` that `extends Attr`. `StateMachineAttr` dramatically simplify coding gestures and similar state machines. And it dramatically improves their safety and reusability.  

We start with a simple `hover:` example.

## `hover:`

This example illustrate a gesture `StateMachineAttr` called `hover:`. `hover:` toggles a CSS class `.hover` on the `ownerElement` to closely echo the `:hover` pseudo-class. In addition, `hover:` also dispatch an event `hover` on the element.

```js
class Hover extends StateMachineAttr {

  upgrade(fullname){
    super.upgrade(fullname);
    this.off();
  }

  //switch(e){} //todo you are not allowed to add any method called switch
  
  on(e) {
    this.ownerElement.classList.add("hover");
    this.ownerElement.dispatch(new e.constructor("hover", e));
    return e;
  }

  off(e){
    this.ownerElement.classList.remove("hover");
    return e;
  }

  static stateMachine() {
    return {
      "": [
        ["mouseenter", "on", "on"]
      ],
      "on": [
        ["mouseleave", "off", ""]
      ]
    };
  }
}
customReactions.defineTrigger("hover", Hover);
```

There are a couple of things to notice:
1. `class Hover extends StateMachineAttr`. There is a custom, builtin `class` in the standard version of DoubleDots called `StateMachineAttr`. This depends on a specific version of the `-` and `.` reaction rules.
2. The `upgrade(fullname){ ... }` ***must call*** `super.upgrade(fullname);` as its first call. This is so important that the default `StateMachineAttr` will `throw SyntaxError` if this is not done.
3. The subclass of `StateMachineAttr` must implement a `static stateMachine()` method. If not, it will again `throw SyntaxError`. More on the ``
4. There are two methods `on(e)` and `off(e)`. These methods function as targets for the transition description in the `static stateMachine()`. See that they `return e`, ie. something not falsy, it could be 1, to tell the system that the transition should be completed, and not aborted. If the transition method returns `falsy`, then the transition will not continue.

## Declaring the state machine

The `static stateMachine()` returns the declaration of the `stateMachine` as a JSON object.

```js
static stateMachine = {
  "": [["mouseenter", "on", "on"]],
  "on": [["mouseleave", "off", ""]]
};
```

The *keys* in the `stateMachine` (`""` and `"on"`) are the different states, the values is a list of transitions. Each transition is a list with three items: `[trigger, method, nextState]`.

The default state is `""`, and this state is required. If there is given an unknown state at startup (that `.toLowerCase()` cannot fix), then the `""` is the state reverted to.

## Processing of the `stateMachine`

When the `StateMachineAttr` is first instantiated, the transitions in the `stateMachine` will be converted into a trigger:chain-reaction strings:

```js
{
  "": [["mouseenter", "on", "on"]],
  "on": [["mouseleave", "off", ""]]
}
//becomes
{
  "": ["mouseenter:--hover:.on:.switch_on"]],
  "on": [["mouseleave:--hover:.off:.switch"]]
}
```

The first reaction chain `mouseenter:--hover:.on:.switch_on`, works as follows:
1. `mouseenter` triggers the reaction chain.
2. `:--hover` uses the dash `-` reaction rule to move the origin `this` to the first attribute that starts with `hover`. This will move the `this` to the `class Hover extends StateMachineAttr` instance.
3. `:.on` uses the dot `.` reaction rule to invoke the `on(e)` method on the new `this` attribute object we just moved to.
!!! todo update the `.dot` rule to enable filter reactions that will enable *falsy* outputs to be interpreted as `customReaction.break`.!!!
4. `:..switch_on` uses the `.` reaction rule to invoke `switch("on")` on the `this` attribute we are on.
!!! todo update the `.dot` rule to enable string parameter passing.!!!

## The `stateMachine` in action

When the `StateMachineAttr` is active, it does the following:
1. at startup, the attribute will:
  1. ensure that no reactions listed under one of its states are present on the element. If they are, it will simply remove them.
  2. it will then parse its `.value` and find a matching state (using `.toLowerCase()` if necessary), and
  3. it will then add all the reactions listed under that state.

2. Each of these reactions will then enable the state machine to be triggered at the right time and run one of its methods during transition. If the transition method return `falsy`, then the transition will not complete. If it returns `truey`, then the transition will move to the final step.
3. The `:..switch_next-state-name` calls a method on the `StateMachineAttr` super class passing it the next state name.
4. The `switch()` method will automatically remove the reaction chains used for that state and add reaction chains needed for the next state.
5. And that is it.  

## Use-case limitations of `StateMachineAttr`

The current implementation of the `StateMachineAttr` is **dependent** on the `.dot` and `-dash` rules. The `StateMachineAttr` and the `.dot` and `-dash` rule should be considered an add-on, a dialect of DoubleDots.

The current implementation of the `StateMachineAttr` is also limited to adding reactions to the same element. It also makes choices about calling just a single method on the state machine attribute per transition, and what returning `falsy`/`truthy` means for these methods.

However. The `StateMachineAttr` and the `.dot` and `-dash` rules are *optional*. You can make your own set. We recommend that you start by modifying the current set, but if you find gold setting up your reaction rules and/or state machines following a different pattern, we would very much like to hear about it. And maybe follow your path:)


## The implementation of `StateMachineAttr`

>> todo, the empty triggers *must* end with `:`. So that `<div hover=something>` will not trigger the construction of a hover trigger, you must have `<div hover:=something>` for the upgrade process to run.

```js
class StateMachineAttr extends Attr {
  //3. there can only be one instance of a `StateMachineAttr`Attr on the same element.
  upgrade(fullname) {
    if (this.name.indexOf(":") !== this.name.length-1) 
      throw new SyntaxError(`StateMachineAttr ${fullname} cannot contain reactions: ${this.name}`);
    for (let at of this.ownerElement.attributes)
      if (at !== this && at instanceof this.prototype.constructor)
        throw new SyntaxError(`Two StateMachineAttr of the same type ${this.constructor.name} on the same element`);

    //todo do a syntactic check of the toString() of this.constructor.prototype.upgrade (and that recursively) startsWith("super.upgrade(")
    //todo do a syntactic check that none of the sub classes override switch().
    //todo add a generator yield structure that return the prototypes up to StateMachineAttr.
    
    const stateMachine = this.constructor.stateMachine;
    if (!stateMachine[""])
      throw new SyntaxError(`${this.constructor.name}.stateMachine must return an object with a default, empty-string state.`);
    this._transitions = {};
    for (let [k,v] of stateMachine.entries())
      this._transitions[k] = v.map(([t,m,s]) => `${t}:--${fullname}:.${m}:..switch_${s}`);
    this.switch(state);
  }

  switch(state) {
    for (let rs of this._transitions.values())
      for (let r of rs)
        this.ownerElement.removeAttribute(r);
    this.state = state;
    for (let r of this._transitions[state])
      this.ownerElement.setAttribute(r);
  }

  destructor() {
    for (let r of this._transitions[this.state])
      this.ownerElement.removeAttribute(r);
  }
}
```




## Compare `longpressable` with and without `StateMachineAttr`

>> todo make the comparison


The `longpressable` state machine dispatches a custom event `longpress` when a user presses and holds an element for a minimum specified duration without releasing.

```html
<div longpress:log>
  <button longpressable_500>Hello sunshine</button>
</div>
<script>
class LongPressable extends Attr {
  private let downTime;
  private let duration;
  private static const downer = "mousedown:--longpressable:.down";
  private static const upper = "mouseup:--longpressable:.up";

  upgrade(name) {
    this.duration = name.split("_")[1] || 500;
    this.ownerElement.setAttribute(downer);
  }

  down(e) {
    if(e.button !== 1)
      return;
    downTime = e.timestamp;
    this.ownerElement.removeAttribute(downer);
    this.ownerElement.setAttribute(upper);
  }

  up(e) {
    if(e.button !== 1)
      return;
    this.ownerElement.removeAttribute(upper);
    this.ownerElement.setAttribute(downer);
    if(e.timestamp - downTime > this.duration)
      this.dispatchEvent(new MouseEvent("longpress", e));
    downTime = 0;
  }
}

customReaction.defineTrigger('log', (event) => {
  console.log('Long press detected:', event);
});
</script>
```

`trippleclickable` and `longpressable` do much the same. But there is one thing worth noting the in `longpressable` example: the alternating `upper` and `downer` spawned listeners.

When the `longpressable` statemachine begins, it starts with the `down` listener. As with the `trippleclickable`, the spawned listener uses the `-` and `.` rules to transpose and call a method on the statemachine attribute. But when the `mousedown` event triggers the `down(e)` method, the statemachine will not only register a new state, but also remove a spawned listener and add a new one.



## Other Examples of `StateMachineAttr`s

1. Drag-and-Drop Interfaces: In drag-and-drop interactions, the draggable elements and drop targets go through a series of states: idle, dragging, over a target, and dropped.

3. Swipe and fling and pinch and pan


## How to tackle conflicts between overlapping gestures?

1. When is something a drag and when is it a click?
2. should both state machines produce events?
3. use the native `click..` and default action 

