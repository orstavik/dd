# trigger: state machines

Trigger state machines should be used for off-dom events. If the state machine is only triggered by a single type of in-dom events, then it should not be based on a trigger:, but as a :reaction. State machines orchestrating several different in-dom events are *also trigger: based*, but we implement those as `StateMachineAttr` sub classes (see next chapter).

------------------
|hello|something |
------------------

So. How is state managed by triggers? And what would the alternative stragies of a) transient state, b) owned state, and c) shared state look like, in triggers?

## Transient state triggers

When we expose the native js observers such as `MutationObserver`, `IntersectionObserver`, and `ResizeObserver`, we do so using transient state triggers.

### `in-view:`

In this example we use a trigger state machine to handle the fading of items according the visibility of children.

```html
<div>
  <div id="1" in-view:change-vis>Item 1</div>
  <div id="2" in-view:change-vis>Item 2</div>
  <div id="3" in-view:change-vis>Item 3</div>
</div>

<script>

  class InView extends Attr {
    private observer = new IntersectionObserver(items => {
      for (let i of items)
        if (i.isIntersecting)
          this.dispatchEvent(new Event("in-view"));
    });

    upgrade() {
      this.observer.observe(this.ownerElement);
      //todo check if the element is already in-view,
      //todo because the intersectionObserver doesn't trigger a default event.
    }
  }

  customReaction.defineTrigger("in-view", InView);
  customReaction.defineReaction("change-vis", function(e, oi){
    this.ownerElement.style.opacity = 1;
    return oi;
  });
</script>
```


### `trippleclickable:` anti-pattern

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

Here is how it is made:
1. The state machine is added to the parent element, this is so as to be triggered by it's children. It has the necesary variables for its logic and a `child` attribute that will be placed where it is invoked, defined on the upgrade method. We also define the `click` method and the logic that fires the `trippleclick` event.
2. On the `<h1>` element a `trippleclickable_` gesture/statemachine is added.
3. The `trippleclickable_` statemachine will spawn a child custom reaction on its `element` called `click:--trippleclickable:.click`. This attribute is defined on the state machine.
4. The `click:--trippleclickable:.click` is the active arm of the statemachine. Whenever a `click` event happens on the element, then first the `:--trippleclickable` uses the `-`rule to transpose the origin of the reaction chain to the `trippleclickable_` attribute/statemachine. Once the location of the reaction chain has moved to the statemachine, the reaction chain uses the `.` rule to access and call the `click()` method on the statemachine, passing it the `(e, oi)` arguments.
5. The statemachine now gets all the `click` events, registers their time and duration between them, and if three `click` events has occured since its last inception, then it will dispatch a `trippleclick` `MouseEvent` on its `.ownerElement`.
6. This event is caught by the parrent element, logging to console.


## Go over defining trigger state machines

Trigger state machines are defined by extending the Attr class. They are placed in the attribute chain just like a normal (??) trigger. When the event is fired, depending on the logic implemented, the event chain will fire or not.

Let's look at the next example, taken from the previous documentation on state machines (LINK).


## Caveats


//todo how do we do the internal listeners for these global events?
//todo you run the global events for all listeners, but then if the event is composed:false,
//todo then you only run the global listeners for the same document.
//todo that means that we register global listeners *both* on the document *and* the shadowroot,
//todo and then the virtual event loop will look at the composed prop on the event, to see which registry it is going to use. nice.



## Examples


### `apiReady:`

In this example, we will fire an event when an API call has been completed to display the data.

```html
<div server-update:overwrite-inner="https://example.com/newNews">
  <div>Spinner fills the place in the beginning, overwritten on first newNews update</div>
</div>
<script>

  class ServerUpdate extends Attr {
    async upgrade() {
      const respone = await fetch(this.value);
      const json = await response.json();
      const e = new Event("server-update");
      e.news = json;
      this.dispatchEvent(e);
    }
  }
  customReactions.defineTrigger("server-update", ServerUpdate);
  customReactions.define("overwrite-inner", function(e) {
    this.innerHTML = `
    <div>
      <h1>${e.news.title}</h1>
      <p>${e.news.text}</p>
      <p>${e.news.date}</p>
    </div>`;
  });
</script>
```

## Example redux

immutability and identity checks.

```html
<script>
  let state = {};
  setInterval(async function(){
    const newState = await (await fetch("bbc.com")).json();   
    //{alice: ["hello"], bob: ["sunshine"], cat: 42}
    
    //1. we reuse as many of the nested objects in the big json tree as possible.
    //   we use the JSON.stringify hack, and here we hard code a structure, one level deep.
    const keys = ["alice", "bob", "cat"];
    let changed = false;
    for (let key of keys) {
      const old = JSON.stringify(state[key]);
      const nevv = JSON.stringify(newState[key]);
      if (old===nevv)
        newState[key] = oldState[key];
      else
        changed = true;
    }
    if(!changed)
      newState = oldState;

    //2. use identity checks (fast) for selecting callbacks
    if(newState.bob !== state.bob)
      document.documentElement.dispatchEvent("store_bob", {composed:true});
    if(newState.alice !== state.alice)
      document.documentElement.dispatchEvent("store_alice", {composed:true});
    if(newState.cat !== state.cat)
      document.documentElement.dispatchEvent("store_cat", {composed:true});
  }, 1000);

</script>

<h1 _store_bob:update-my-branch>
  - filter object identity.
</h1>
<div _store_alice:update-my-branch>
  text goes here
</div>
```


## `game:` state machine

Here, we have a game as a state machine, that needs to orchestrate different `click` listeners, along with a timer. we first make it as a reaction state machine, and then we make it as a `StateMachineAttr`. I guess this is fun? :)

1. we make it quite simple, with a transient timer. This is buggy though, because it is difficult to stop
2. second, we replace it with a `::sleep_1000:count_down:..-2`. This is a loop that we can take out, when we don't need it
3. we finally move into a `StateMachineAttr` that makes a nice and tidy class for everything.

In this custom trigger, we will finish a game after a loss or timeout. We will change styles and handle the according logic.

```html
<div click:game-states="waiting">
  <h3>Guess the number!</h3>
  <h2>waiting...</h2>
  <div>
    <div guess>1</div>
    <div guess>2</div>
    <div guess>3</div>
  </div>
  <button start>Start Game</button>
</div>
<script>

customReactions.define("game-states", function(e){
  const state = this.value;
  //verifying owned state
  if(["waiting", "active"].indexOf(state) < 0)
    this.value = state = "waiting";
  
  //using some transient state for good measure
  let rightChoice = -1;
  
  //transition 1
  if (state === "waiting" && e.target.hasAttribute("start")){
    this.value = "active";
    rightChoice = Math.floor(Math.random()*3);
    
    //handling a second event transiently, as a separate thread managed internally
    //this threading is hacky..
    (async () => {
      for (let i = 0; i<5; i++){
        this.ownerElement.querySelector("h2").innerText = 5-i;
        await sleep(1000);
        if (this.value !== "active")
          return;
      }
      this.ownerElement.querySelector("h2").innerText = "you lost";
      this.value = "waiting";
      rightChoice = -1;
    })();

  //transition 2
  } else if(state === "active" && e.target.hasAttribute("guess")){
    this.value = "waiting";
    if (e.target.innerText === rightChoice)
      this.ownerElement.querySelector("h2").innerText = "you won";
    else 
      this.ownerElement.querySelector("h2").innerText = "you lost";
    rightChoice = -1;
  }
});

class GameChange extends Attr {
  private let status = "idle"
  private let options = [1,2,3]
  private let correct

  upgrade(){}

  remove(){
    this.ownerElement.removeAttribute();
    super.remove()
  }

  start(){
    // Start the game
    this.status = "playing";
    //choose a random number from the options array
    this.correct = this.options[Math.floor(Math.random() * this.options.length)]; 
    //start timmer
  }

  guess(){
    // Check if the guess is correct
    if (/* condition for correct guess */) {
      // Handle correct guess logic
    } else {
      // Handle wrong guess logic
      this.loss();
    }
  }

  loss(){
    // Handle loss logic
    this.status = "lost";
  }

  win(){
    // Handle win logic
    this.status = "won";
  }
}

</script>
```

- interval loop. retrieve those from the chapter 8?
- callbacks

1. single or multiple triggers? doesn't matter. binary or multiple states? doesn't matter. Triggered _only_ by the occurrence of events that are not propagating in the dom? yes. (this can be timers (sleep, raf), observers (mutationObserver), a custom callback generator/event emitter that is not a DOM propagating event). Controllable by outside reactions? yes. => Simple trigger state (no gesture). Since it is triggered by occurrenced not propagating in the DOM, it doesn't need to spawn any custom listeners. The outside control is supported by the `changeCallback(oldValue)`.


## How to `.dispatchEvent()`

1. be aware of the distinction between dispatching ont the element and the attributes. If you want only to trigger the single reaction chain, do that. If it is something that is happing in the dom, then dispatch on the element. Try to go with attribute first, you can always add to the element later.

2. The `Event`. This is a pure data thing. The `Event` class can have methods to just process data in it, like calculate the angle of a swipe event, but that is a pure function and it should be based only on pure data from the event itself.

3. We don't use the `CustomEvent` interface. Yeah, they say we should, but.. why?? Don't see the point. The `.detail` is not good, why wrap the pure data differently than the native events.

4. There is a trick. Use the `new e.constructor(newname, e)` when one event is triggering the dispatch of another event. This essentially clones the original event, with all its data, but gives it a new type and new timestamp. 

5. Do this if you need to add properties to the event that the previous trick didn't cover.
```js
const e = new Event("type");
e.prop1 = "hello";
e.prop2 = "sunshine";
```
