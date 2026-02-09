# Custom `trigger:`s

The triggers in DoubleDots are small anchors that will capture an event and then pass this event to the first reaction in the chain.   you make a reaction chain  provide a sequence of 

## 1. Listener triggers: `click:`

The trigger is primarily event listeners. Whenever an event propagates in the DOM, any trigger with the *same name* as the event type, will trigger its reaction chain. For example, if the user `click` on an element inside another element that has a `click:` trigger, then the reaction chain behind the `click:` trigger will run when the event bubbles past the `ownerElement`.

```html
<div click:say-hi>
  <h1>hello sunshine</h1>
<div>
```

## 2. _global listener triggers:  `_click:`

If you prefix the trigger name with an `_`, you turn the event listener into a ***_global trigger*** (aka global event listener). For example:

```html
<div _click:say-hi>
  <h1>hello sunshine</h1>
<div>
<div>
  <h1>hello world</h1>
</div>
```

If you in the example above `click` on *hello world*

_global triggers are:
1. triggered by *any* event that will hit that would have propagated past any other element in that `document`. 

 will be triggered when any event of that type propagates the DOM, regardless if  is *any* event listener Normal HTML and DOM events do not offer _global event 

## Define a `trigger:` 

> Note! The first charachter in a trigger name must be a lower case english letter: `a-z`. Trigger names cannot begin with `.`,  `-`, nor `_` (the first two are illegal HTML, and the `_` is reserved for *global* triggers in DoubleDots).

In Doubledots you can also define your own `trigger:`. Triggers are event factories, sort of. Some are atomic and simple, like `set-timeout_10:` or `attr-change_style:` for example. Others are complex state machines like `swipeable` and `drag-n-drop`. In this chapter we start with the simple ones.

To define a trigger is very similar to defining a reaction rule, except that the definition is not a function, but a `class` that `extends AttrCustom`. This is what it looks like:

```js
customReactions.defineTrigger("prefix", class MyTrigger extends AttrCustom{
  upgrade(fullname) {
    this; //=> the attribute node
  }
});
```

## 3. The `upgrade(fullname){...}` constructor

Inside the trigger `class` you must implement *one* function called `upgrade(fullname)`. The `upgrade(fullname){...}` function is the constructor of the trigger (and if it wasn't impossible to invoke constructors using reflection in JS, it would have been called the `constructor(...)` too). 

The `"prefix"` is the start of the trigger names that this definition will be applied to. No trigger prefix can overlap with another trigger prefix, but the reaction names and rule prefixes are completely separate from the trigger prefixes. 

The `prefix` *cannot* startsWith `_`, `-`, or `.`. This will cause conflict with `_global` triggers, or come into conflict with HTML parsing of attributes. 

The `prefix` *should* endsWith either `_` (if it parses name string arguments) or `able` (common for gestures). If the `prefix` does not endsWith the above, it should include either a `_`, or `.` so that it will not overlap with event names.

The `upgrade(fullname)` callback is called immediately/asap when the trigger is created. Inside the `upgrade(){...}` the `this` is the attribute node that the custom trigger is part of. (In a previous version of Doubledots, custom triggers were named custom attributes, but we have changed this to make it clearer that the trigger is not the full attribute, but only part of it.) The argument `fullname` is the full name of the trigger. So, as with reaction rules, it is possible to pass arguments to your triggers as the tail of the trigger name.

## `this.dispatchEvent()` and `this.ownerElement.dispatchEvent()`

The purpose of triggers is to `dispatchEvent()`. There are two targets that the trigger *should* dispatch events too:
1. `this` (the attribute)
2. `this.ownerElement` (the element)

> It is possible to dispatch events on other targets too, but you should try to avoid this if you can. The golden rule is that triggers dispatch events on either the attribute or element they are attached to.

Events that are dispatched to an attribute only trigger the reactionchain on that particular attribute. No bubbling. No _global reactions. Triggers that dispatch single attribute only events are therefore "simpler" and "atomic". Technically, the event type name and the trigger name do not have to match, but in practice it is common to give the custom attribute event the same name as the trigger prefix.

### What to name the events?

When naming events, observe these guidelines:
1. All event names *must* be lower case.
2. All event names *must* begin with an english letter `a-z`.
3. Element event names *should not* end with `able`.

The first and second rule are required so that it will be possible to add triggers for these events in the DOM. The `_` is preserved for global event triggers, and therefore adding `_` on the event would force it to only run globally. In HTML, it is illegal to start an attribute name with `.` and `-`. Therefore, if you start an event type name with either `.` or `-` it would be impossible to add regular triggers for those events.

The third (soft) rule is there to prevent conflicts between gestures and their events. For example: You name a trigger `swipeable:`. This trigger dispatches events with type `swipe` and `swipe-end`. These events will not trigger the `swipeable:` trigger, because `swipe` and `swipeable` are different names. If you had named the trigger `swipe:`, then when this trigger dispatched an event with type `swipe`, then that event would have triggered the event generating triggers reaction chain (if it has any). That is most likely not what you want.

## Simple, atomic, (almost) stateless triggers

Triggers that dispatch full, normal, propagating element events are commonly more complex and stateful than triggers that dispatch simple, atomic attribute events. We will therefore discuss these triggers in subsequent chapters and here only focus on simple, atomic, stateless triggers.

### `attr_xyz:`

Custom triggers replace all the native Observers in JS. In this example we use the Doubledots implementation of the attribute-change-trigger called `attr_xyz:`. This trigger essentially maps the behavior of `MutationObserver.observe(el, {attribute: true, attributeList: [x,y,z]})` into Doubledots:

```html
<script>
  class AttrTrigger extends AttrCustom{

    async upgrade(attr_xyz) {
      const [_, ...list] = attr_xyz.split("_");
      const mo = new MutationObserver(mrs=>{
        if (!this.isConnected)
          return mo.disconnect();
        for (let mr of mrs) {
          const e = new Event("attr");
          //e.changedAttributes = {name: oldValue,...};
          this.dispatchEvent(e);
        }
      });
      const settings = list.length? 
        {attribute: true, attributeList: list} :
        {attribute: true};
      mo.observe(this.ownerElement, settings);
    }
  }
  customReactions.defineTrigger("attr_", AttrTrigger);
  customReactions.defineReaction("log", console.log);
</script>

<h1 attr_class:log class="sun shine">hello</h1>
```

### `inview:`

In this example we use the `IntersectionObserver` to create a custom `inview:` trigger. `inview:` dispatches a new attribute event and triggers the reaction chain on the custom attribute every time the element it is attached to switches from out-of-view to in-view:

```html
<script>
  class InviewTrigger extends AttrCustom{

    async upgrade(inview_thresholdPerc) {
      const threshold = parseInt(inview_thresholdPerc.split("_")[1]) / 100;
      const iso = new IntersectionObserver(_ => {
        if (!this.isConnected)
          return iso.disconnect();
        this.dispatchEvent(new Event("inview"));
      });
      const options = { threshold, root: null, rootMargin: '0px' };
      iso.observe(this.ownerElement, options);
    }
  }
  customReactions.defineTrigger("inview_", InviewAttr);
  customReactions.defineReaction("hello", _ => console.log("sunshine"));
</script>

<div style="height: 130vh">scroll for it</div>
<h1 inview_1:hello>hello sunshine</h1>
```

### `timeout_x:` 

The atomic `timeout_x:` trigger dispatches an attribute event type `timeout` that will run its reaction chain once after delay of x ms.

```html
<script>
  class TimeoutTrigger extends AttrCustom{
    async upgrade(timeout_time) {
      const delay = timeout_time.split("_")[1];
      await sleep(delay);
      if(this.isConnected) //Doubledots adds this method to AttrCustom too
        this.dispatchEvent(new Event("timeout"));
    }
  }
  document.defineTrigger("timeout_", TimeoutTrigger);
  document.defineReaction("log", console.log);
</script>

<h1 timeout_1000:log>hello sunshine</h1>
```

The `timeout_x:` does not use `setTimeout`, but `await sleep()` instead. The reason for this is that Doubledots deprecates `setTimeout()` and instead provides an `await sleep()` instead. There are two reasons why `setTimeout()` is deprecated:
1. It enables a new event to be added from JS without any trace in the HTML template,
2. To use `await sleep()` inside `async function`s yield easier to read code.

However. In Doubledots, it is recommended to use `::sleep_x:` reaction rule instead:

```html
<script>
  document.defineReactionRule("sleep_", function(sleep_x){
    const delay = parseInt(sleep_x.split("_")[1]);
    return async function(e, oi){
      await sleep(delay);
      return oi;
    }
  });
  document.defineReaction("log", console.log);
</script>

<h1 ::sleep_1000:log>hello sunshine</h1>
```

The benefits of using the `::sleep_x` instead of a `timeout_x:` are:
1. The reaction chain will be added to the event loop. This means that any tooling that illustrate the event loop, will also illustrate when the reaction chain is awaiting the `setTimeout`.
2. The `::sleep_x` is more versatile. You can add other reactions infront of it, and with one reaction rule you can solve more use-cases than with the `timeout_x:`.

### `interval_x:`

```html
<script>
  class IntervalTrigger extends AttrCustom{
    async upgrade(timeout_time) {
      const delay = timeout_time.split("_")[1];
      while (true) {
        await sleep(delay);
        if (!this.isConnected)
          return;
        this.dispatchEvent(new Event("interval"));
      }
    }
  }
  document.defineTrigger("interval_", IntervalTrigger);
  document.defineReaction("log", console.log);
</script>

<h1 timeout_1000:log>hello sunshine</h1>
```

The `interval_x:` works better than `timeout_x:` as a trigger. But, we can also implement `interval_x:` using `::sleep_x` and `:..-x`:

```html
<script>
  //document.defineReactionRule(".", dotReactionRule) //see later chapter
  document.defineReactionRule("sleep_", function(sleep_x){
    const delay = parseInt(sleep_x.split("_")[1]);
    return async function(e, oi){
      await sleep(delay);
      return oi;
    }
  });
  document.defineReaction("log", console.log);
</script>

<h1 ::sleep_1000:log:..-2>hello sunshine</h1>
```

This implementation is using the `.` reaction rule to step -2 positions in the reaction rule, ie. back to the `:sleep_1000` reaction. This is more difficult to read, and it is easy to make a typo using the `:..-2` loop/goto mechanism. However, the benefit is still:
1. The reaction chain will be added to the event loop. And it is visible to any tooling that show the state of the event loop.
2. Again, we only use `:sleep_x` and `:.`, two reaction rules that are part of the Doubledots core (as opposed to `timeout_x:` and `interval_x:` that are not).

## Trigger destruction and cleanup

In Doubledots, neither attribute nor element nodes can be put back into the DOM once they have been disconnected. In Doubledots, the concept is that if an HTML node is no longer in the DOM, it should be considered garbage.

This means that:
1. if an internal callback in a trigger is triggered, and
2. the trigger attribute is either has no `.ownerElement` or that `.ownerElement.isConnected === false`, then
3. the trigger should be considered garbage, and
4. that any active stop, cleanup, or other garbage collection tasks can and should be performed.



## We skip `destructor()`? 

No.. I think we include `.remove()` and make that overrideable.

>> todo: can we skip this? Will MutationObserver work as a WeakSet allowing elements to be gc'ed? or is the 

In addition, you *can* implement another function called `destructor()`. The `destructor()` is as the name implies the method called when the trigger is removed.

The `destructor()` is necessary in *some* custom triggers. No, I think when we can't take attributes and elements in and out of the DOM, this is no longer necessary.