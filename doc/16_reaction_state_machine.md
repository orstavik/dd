# Reaction state machines

If you can, you should implement your state machines as reactions. Reaction based state machines are triggered by a single event type.

Reaction state machines are not restricted to binary states. They can be multistate. Input validation in forms is an example of a single trigger state machine that can switch between several states. Single trigger state machines should be implemented using a single reaction (rule).

## External state state machines

The simplest type of reaction state machines work on an "external state". These reaction state machines may switch on/off a CSS class, *another* attribute's value or the same or another element. Below is an example of a super simple single event triggered, external state, reaction state machine: `click:parent-toggle_open`. This state machine uses an external state (the `[open]` attribute on the parent element), and will flip this attribute on/off whenever the event `click` hits the element.

```html
<div click:toggle_open>hello sunshine</div>
```

Other examples of external state state machines include:

1. Form Validation: HTML form elements can have different states, such as valid, invalid, pristine, dirty, touched, and untouched. These states can be managed by JavaScript to provide real-time feedback to the user. For instance, a form field might start in a pristine state, transition to dirty once edited, and then become valid or invalid based on the input's conformance to validation rules. If you can accomplish your validation task only triggered by `change` or `input` for example, then use a reaction (rule).

3. Accordion Menus: An accordion menu has states for each section, such as expanded or collapsed. Clicking on a section header might toggle the state, expanding or collapsing the corresponding content area. The native `<details>` element is an example of such a statemachine. 

4. Tabbed Interfaces: In a tabbed interface, each tab can be considered a state. Clicking a tab changes the active state, showing the content associated with that tab and hiding the others.

5. Dropdown Menus: A dropdown menu has at least two states: open and closed. Interacting with the dropdown (e.g., clicking or hovering) transitions it between these states.

6. Modal Dialogs: A modal dialog is either open or closed. Opening the dialog changes the state of the application by overlaying the dialog above the main content and often disabling interaction with the underlying page until the dialog is closed.

7. CSS (Pseudo-)Classes: CSS pseudo-classes like :hover, :active, :focus, and :checked represent different states of an element based on user interaction. These states can be styled differently to provide visual feedback.

9. Online/Offline Status: Web applications can react to the browser's online and offline events, changing state accordingly to provide feedback to the user or to queue actions until connectivity is restored.

## Transient state reactions

Some state machines only save their state in JS memory. This memory is wiped out whenever a snapshot of the HTML application is made (ie. `document.documentElement.outerHTML`). However, for many state machines this is what you would expect.

### Example: `:tripple_`

We can implement `trippleclick` as a custom reaction. And even better, we can implement a `:tripple_` reaction rule that can generated a `tripple-x` event for *any* event that occur within a specific timeframe. As long as there is only one "event" that we need to listen to, this is *very* straight forward.

```html
<div tripple-click:log>
  <h1 click:tripple_300>hello sunshine</h1>
</div>

<script>
  const weakState = new WeakMap();
customReaction.defineReactionRule('tripple_', function(name){
  const maxTime = parseInt(name.split("_")[1]) || 300;
  return function(e, oi){
    const now = new Date().getTime();
    let [count, lastTime] = weakState.get(this) || [0, now];
    if((now-lastTime) < maxTime)
      count++;
    else if(count == 3) {
      weakState.remove(this);
      this.ownerElement.dispatchEvent(new e.constructor("tripple-"+e.type, e));
    } else 
      weakState.put(this, [count, lastTime]);
  }
});
customReaction.defineReaction('log', console.log);
</script>
```

## Owned state state machine

Finally, some reaction state machines will wish to expose and control their own state. These state machines will distinguish themselves by following a soft rule that the `.value` of a reaction chain should only be controlled by a single trigger/reaction: the `.value` of a reaction chain should not be written to by other reactions, neither within or outside the reaction chain. We can think of it as they try to claim *ownership* their own external state.

### todo switch this example with another 

We can implement `trippleclick` as a custom reaction. And even better, we can implement a `:tripple_` reaction rule that can generated a `tripple-x` event for *any* event that occur within a specific timeframe. As long as there is only one "event" that we need to listen to, this is *very* straight forward.

```html
<div tripple-click:log>
  <h1 click:tripple_300>hello sunshine</h1>
</div>

<script>
customReaction.defineReactionRule('tripple_', function(name){
  const duration = parseInt(name.split("_")[1]) || 300;
  return function(e, oi){
    const [count, lastTime] = this.value?.split("_") || [0, 0];
    const now = new Date().getTime();
    if(now-lastTime>duration)
      this.value = "0_0";
    else if(count == 2){
      this.value = "0_0";
      this.ownerElement.dispatchEvent(new e.constructor("tripple-"+e.type, e));
    } else 
      this.value = `${count+1}_${now}`;
  }
});
customReaction.defineReaction('log', console.log);
</script>
```

As can be seen, this type of reaction state machines implicitly rely on themselves being the only one that write to their `.value`. 

## Tandem reaction state machines

To illustrate how reaction state machines can work in pairs, we will make a simple `hover` using two reaction state machines.

```html
<h1 mouseenter:hover-on mouseleave:hover-off>Hello sunshine</h1>
<script>
customReaction.define('hover-on', function(e) {
  this.ownerElement.dispatchEvent(new e.constructor("hover", e));
  this.ownerElement.classList.add('hover');
});
customReaction.define('hover-off', function(e) {
  this.ownerElement.classList.remove('hover');
});
</script>
```

The example above illustrate how you can orchestrate a simple two trigger state machine as two reaction chains. It works. It is simple. And if it ain't broken, why fix it?

But. What if you need to observe different triggers? What if the states the reactions are switching start diversifying? What if the reactions to different triggers change from state to state? At that time, having reaction state machines working in concert is *not good*. In these instances you *need* something else: a `StateMachineAttr`.(link to chpater)



## Examples of reaction state machines

ToDo find out where to place these.
Examples of single-trigger state machines:

2. Media Player Controls: A media player on a web page has states like play, pause, stop, fast forward, and rewind. Interacting with the controls transitions the media player between these states. For example, clicking the play button transitions the player from the paused state to the playing state. State machines such as media players are commonly implemented as shadowRoot in a web component. But if you want, you most likely can implement this as single-trigger statemachine on `click` for example. 


8. Animation States: CSS animations and transitions can be considered state machines, where an element transitions between states defined by keyframes or changes in properties.

