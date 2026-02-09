# State machines

Key to creating manageable and scalable apps is to correctly identify and compose with good state machines. This is something Doubledots takes great pride in, and a lot of the more complex functionality in Doubledots is oriented towards making state machines simple, transparent, safe, and reusable.

## Defining words about events

We need to disect the term "event". In HTML and JS, "event" refers to both a general abstract concept meaning "something suddenly occuring" *and* the technical representation of that occurrence describing *both* a data package being created to signify something that happened *and* the processing cycle that the event loop performs when presented with such a data package. To make things a little easier to understand, we will here use the terms:
* "happening": *only* the abstract general concept of something suddenly occuring; 
* "occurrence": the technical representation of a happening, ie. the data package and its processing cycle, that has *not* been packaged as an `Event` and *not yet sent to the event loop*;
* "event": a happening that *is* packaged as an `Event` and *already sent to the event loop*;
* "propagation": the processing cycle of an element event that include _global reactions, bubbling, and default actions;
* "element event": an event that is dispatched to an element and that bubbles;
* "attribute event": an event that does not propagate, but *only* triggers the reaction chain of the attribute.

## Different types of state machines in DoubleDots

In DoubleDots we have four different types of state machines:
1. Reaction state machines
2. Atomic trigger state machines 
3. Gesture trigger state machines
4. Complex state machines

Reaction state machines are the best. They are **easy to implement**, **simple to use**, and **indifferent to conflict**. They problem is that they can only be used when the following criteria are met:
1. They must be triggered by ***a single `Event`*** (already packaged and propagating).
2. They are *do NOT immediately react* to external mutations of their state. Reaction state machines *most often* expose their state externally; reaction state machines often work in concert with other reaction state machines that all mutate the same state; but reaction state machines are not responding to each when they change shared state, they all respond exclusively to that single event trigger.

Atomic trigger state machines are great too. They are **highly reuseable**, **ok to implement if you have to** (code by examples and you will make them safely and rapidly), very **simple to use** and **nip conflicts in the bud**. But as with reaction state machines, the atomic trigger state machines only suit a limited use-case:
1. The must be triggered by ***only off-DOM occurences***. The job of the atomic trigger state machines is essentially to turn occurrences into events, usually attribute events.
2. They *CAN immediately react* to external state changes. But atomic trigger state machines are possessive about their state. CSS rules and other reactions are encouraged to *read* their state, but other reactions are expected to *NOT write* to their state.

Gesture trigger state machines is a gift in DoubleDots. First, they help developers *understand* the concepts of more complex state machines on the web. Second, they provide a semi-grammatical means of describing such state machines that enable developers to abstract away much of the complexity of implementing such state machines. Finally, and most importantly, they handle conflicts really well. They are conflict averse, and when conflicts are likely to arise, they can follow established conventions such as the default action pattern to find amicable compromises with third party code. The use-cases they work with are:
1. triggered by multiple events.
2. triggered by different events at different times.
3. they *CAN immediately react* to external state changes. But, even more than atomic trigger state machines, they expect external reactions to *ONLY read*, and *NOT write* to their state.

## Philosophical thoughts

State machines are everywhere in the browser. And in code in general. As an implementable, abstract concept it is up there with objects, functions, and lists. It is fundamental. And global. However, as opposed to the other concepts mentioned, state machines are rarely grammaticalized: there is no special syntax to support state machines, no reserved `statemachine` word in JS, etc. Why is that? Why are objects, functions, and lists often supported in syntax, but not state machines?

I don't really have a good answer to that. I am not sure. Because many state machine structures could easily be grammaticalized: enum structures for state, custom tables to illustrate transistions between states, etc. But. I have found that a good strategy to *understand* state machines, and to *build better* state machines, and to *avoid* conflicts when using state machines is to leave this question open. And to let this question guide you: if state machines were a syntactic structure, what would that syntactic structure look like and why?







## old categories. Don't use them.

When we look at state machines in the web browser, there are three binary categories that are helpful in order to understand them.

1. **single trigger** vs. **multi trigger** state machine: Do the state machine listen to only one *trigger type*? If yes: single trigger statemachine. Do the state machine listen for multiple types of triggers? multi trigger state machine. An example of a multi trigger state machine is "hover" that listens for both `mouseenter` and `mouseleave`.

2. **Binary** vs. **multistate** state machines: if a state machine only switch between *two* states, its binary. If they have three or more, multistate. (If they only have one state, they are not statemachines, but just a simple reaction).

3. **reaction** vs. **trigger** state machines. Most single trigger state machines can be implemented as a reaction or reaction rule. Most multi trigger state machines are implemented as triggers. But exceptions exists.


When to use what?
1. single trigger? yes. single trigger for an existing dom event? yes. Expose state to be controlled/written to by others? no. => then it is a reaction. multistate or binary doesn't matter. The internal state of the reaction is not meant to be written to by others. It can store it in a place where that is possible, but the soft rule is that its state is not open for outside control/direction.

The rest of the reactions are triggers.

2. single or multiple triggers? doesn't matter. binary or multiple states? doesn't matter. Triggered *only* by the occurrence of events that are not propagating in the dom?  yes. (this can be timers (sleep, raf), observers (mutationObserver), a custom callback generator/event emitter that is not a DOM propagating event). Controllable by outside reactions? yes. => Simple trigger state (no gesture). Since it is triggered by occurrenced not propagating in the DOM, it doesn't need to spawn any custom listeners. The outside control is supported by the `changeCallback(oldValue)`.

3. multiple triggers? yes. multiple triggers for dom events? yes. binary or multistate? doesn't matter. triggered by outside-dom occurrences too? doesn't matter. Controllable by outside reactions? doesn't matter. => Gesture. complex beast.

## Examples of reaction state machines

```html
<div click:toggle_open>hello sunshine</div>
```

If you can, you should implement your state machines as reactions. Reaction based state machines typically have only a single trigger type. The `click:toggle_open` above is an example of a super simple single trigger, binary, reaction state machine. These statemachines *commonly* toggles a css class or attribute on an element.

Reaction state machine are not restricted to binary states. They can be multistate. Input validation in forms is an example of a single trigger state machine that can switch between several states. Single trigger state machines should be implemented using a single reaction (rule).

Examples of single-trigger state machines:
1. Form Validation: HTML form elements can have different states, such as valid, invalid, pristine, dirty, touched, and untouched. These states can be managed by JavaScript to provide real-time feedback to the user. For instance, a form field might start in a pristine state, transition to dirty once edited, and then become valid or invalid based on the input's conformance to validation rules. If you can accomplish your validation task only triggered by `change` or `input` for example, then use a reaction (rule).

2. Media Player Controls: A media player on a web page has states like play, pause, stop, fast forward, and rewind. Interacting with the controls transitions the media player between these states. For example, clicking the play button transitions the player from the paused state to the playing state. State machines such as media players are commonly implemented as shadowRoot in a web component. But if you want, you most likely can implement this as single-trigger statemachine on `click` for example. 

3. Accordion Menus: An accordion menu has states for each section, such as expanded or collapsed. Clicking on a section header might toggle the state, expanding or collapsing the corresponding content area. The native `<details>` element is an example of such a statemachine. 

4. Tabbed Interfaces: In a tabbed interface, each tab can be considered a state. Clicking a tab changes the active state, showing the content associated with that tab and hiding the others.

5. Dropdown Menus: A dropdown menu has at least two states: open and closed. Interacting with the dropdown (e.g., clicking or hovering) transitions it between these states.

6. Modal Dialogs: A modal dialog is either open or closed. Opening the dialog changes the state of the application by overlaying the dialog above the main content and often disabling interaction with the underlying page until the dialog is closed.

7. CSS Pseudo-Classes: As you mentioned, CSS pseudo-classes like :hover, :active, :focus, and :checked represent different states of an element based on user interaction. These states can be styled differently to provide visual feedback.

8. Animation States: CSS animations and transitions can be considered state machines, where an element transitions between states defined by keyframes or changes in properties.

9. Online/Offline Status: Web applications can react to the browser's online and offline events, changing state accordingly to provide feedback to the user or to queue actions until connectivity is restored.

## `trippleclick`: trigger or reaction?

Deciding whether to implement a state machine as a trigger: or :reaction can be difficult:
1. does the state machine spawn and remove different event listeners? If yes, then you should implement it as a trigger.
2. does the state machine dispatch multiple attribute events? If yes, then you should also implement it as a trigger.
3. Is it a binary or multistate state machine? This doesn't really matter. Both trigger and reaction state machines can handle multiple states.
4. Is it single or multi trigger? If it is single trigger, it is likely a reaction; if it is multi trigger, it is likely a trigger.

Having said that, appearances can still deceive. Let's look at `trippleclick` as an example.

### Trigger based state machine: `trippleclickable`

The simple `click` is a gesture that listens for multiple events, so at first glance, the `trippleclick` seems apt for a trigger state machine. We therefore make `trippleclickable`: a small trigger based state machine that dispatches a custom event `trippleclick` when a user `click` on an element three times in quick succession.

```html
<div trippleclick:log>
  <h1 trippleclickable_300>hello sunshine</h1>
</div>

<script>
class TrippleClickable extends Attr {
  private let lastTime=0;
  private let count=0;
  private let duration;
  private static const child = "click:--trippleclickable:.click";
  
  upgrade(name) {
    this.duration = parseInt(name.split("_")[1]) || 300;
    this.ownerElement.setAttribute(child);
  }

  remove() {
    this.ownerElement.removeAttribute(child);
    super.remove();
  }

  click(e) {
    if(!this.isConnected))
      return this.remove();
    const now = performance.now();
    if(now-lastTime>duration)
      lastTime = count = 0;
    else if (this.count == 2) {
      lastTime = count = 0;
      this.ownerElement.dispatchEvent(new MouseEvent("trippleclick", e));
    } else {
      lastTime = now;
      this.count++;
    }
  }
}
customReaction.defineTrigger('trippleclickable_', TrippleClickable);
customReaction.defineReaction('log', console.log);
</script>
```

Here is how it works:
1. On the `<h1>` element a `trippleclickable_` gesture/statemachine is added. 
2. The `trippleclickable_` statemachine will spawn a child custom reaction on its `element` called `click:--trippleclickable:.click`.
3. The `click:--trippleclickable:.click` is the active arm of the statemachine. Whenever a `click` event happens on the element, then first the `:--trippleclickable` uses the `-`rule to transpose the origin of the reaction chain to the `trippleclickable_` attribute/statemachine. Once the location of the reaction chain has moved to the statemachine, the reaction chain uses the `.` rule to access and call the `click()` method on the statemachine, passing it the `(e, oi)` arguments.
4. The statemachine now gets all the `click` events, registers their time and duration between them, and if three `click` events has occured since its last inception, then it will dispatch a `trippleclick` `MouseEvent` on its `.ownerElement`.

> There is also some slight cleanup taking place. If the `click` is registered *after* the element has been removed from the DOM, then the statemachine attribute will remove itself and its spawned `click:` reaction. The same happens if another script removes only the `trippleclickable` statemachine, then this will be intercepted by the `remove()` function. Doubledots implements `.remove()` as part of its extension of the platform, and all methods of removing just a single attribute from the DOM is routed through this method.

## `click:tripplable`

The `trippleclickable` is complex. It spawns 
We can also implement the `trippleclickable` as a custom reaction rule, instead of a trigger. The reason we can do that is that we only have a single trigger event for our statemachine.

```html
<div trippleclick:log>
  <h1 trippleclickable_300>hello sunshine</h1>
</div>

<script>
customReaction.defineReactionRule('trippleable_', function(name){
  const duration = parseInt(name.split("_")[1]) || 300;
  return function(e, oi){
    const [count, lastTime] = this.value?.split("_") || [0, 0];
    const now = new Date().getTime();
    if(now-lastTime>duration)
      this.value = "0_0";
    else if(count == 2){
      this.value = "0_0";
      this.ownerElement.dispatchEvent(new MouseEvent("trippleclick", e));
    } else 
      this.value = `${count+1}_${now}`;
  }
});
customReaction.defineReaction('log', console.log);
</script>
```

As you might see, this is simpler and better. We make an assumption here that we are alone in using the attribute `.value`. This can be a good choice, for simplicity and transparency. But you could just as easily have stored the values in a `WeakMap()` using the `attribute` as key.


## Example gesture: `longpressable`

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

