
# TASK 

I want you to write an example of a database viewer in HTML using my framework called Doubledots.  Use little to none styles. It should have 2 button that on click, display different content on an opening modal. This modal should have a close button that closes the modal.

# FURTHER EXPLANATION 

Doubledots uses attributes in HTML elements to assign events to them. This framework deprecates .addEventListener.

It works by writing a chain of events, starting with a 'trigger' such as click or hover or focus, followed by chaining reactions that are separated with ' : '. 

In this chaining, reactions pass `(e , oi)` which are the event object and the last function's return (oi = output/input).

For example, adding a functionality to an element for it to change a value would be written 'click:checkIfOk:extractData:updateValue'. 

1. The `click` trigger
2. The `checkIfOk` reaction to validate the input
3. The `extractData` reaction to get the new value
4. The `updateValue` reaction to change the value in the DOM

This attribute describes the steps the event has. These reaction names are later defined with their behavior like such: 

```js
    customReaction.define('checkIfOk', (e, oi) => {
    // Perform validation and return
    })
```

IMPORTANT: Leave the content of the definitions as a description of what the reaction does inside a comment, like above.

Categories of reactions

- trigger: (click, in-view)
- filter (read => to break):
- extraction (read => to oi output):
- effect (write => DOM):
- side-effect (write => outside of DOM):
- schedulers (throttle, debounce, setTimeout, ready)
- pure reaction (read only e and oi, make no changes to input argument objects, only produce a new oi output.: (pure functions that turn data from one form into another, or filter or maps that data. It fitlers, but it only filters the input data. Often combined with the :filter into a single reaction).

# DOCS 

This is an abridged version of the docs.

## 3 Chaining definitions

- How to chain reactions
  In doubledots you chain reactions like this:

  `event:reaction1:reaction2:...`. When the `event` triggers, it is first passed to `:reaction1`, then `:reaction2`, etc.etc.

  - Defining custom reactions

  The define function takes in a name and a callback function

  ```html
  <div click:console.log>hello</div>
  <script>
    customReactions.define("log", console.log("Hi"));
  </script>
  ```

- Passed props

  The first reaction in the chain is passed a single argument: the event object. But, when the second reaction is called, it is passed _two_ arguments: the event object _and_ the output of the previous reaction.

  Note. In the documentation, we often refer to the two arguments of the custom reactions as `e` for "event" and `oi` for "output-input".

  ```html
  <p click:get_text:log>Loggin this</p>
  <script>
    customReactions.define("get_text", () => {
      text = this.ownerElement.textContent;
      return text;
    });
    customReactions.define("log", (e, oi) => {
      console.log(oi);
    });
  </script>
  ```

- Using `This` in customReactions.

  Inside a reaction function `this` points to the attribute object (the `Attr`).

  ```html
  <div click:log_name:log_value:log_tagname="hello">sunshine</div>
  <script>
    customReactions.define("log_name", () => console.log(this.name));
    customReactions.define("log_value", () => console.log(this.value));
    customReactions.define("log_tagname", () =>
      console.log(this.ownerElement.tagName)
    );
  </script>
  ```

## 4. Breaking chain reaction

- Ways of breaking the chain

  There are two ways a chain reaction can be broken:

  1. if the custom reaction function `return` a special object `customReaction.break`, or
  2. if the custom reaction function `throws` an `Error`.

- `customReactions.break`
  By returning `customReactions.break`, the custom reaction chain will simply stop running and let the next custom reaction chain continue.

  ```html
  <div click:one:stop:two>hello sunshine</div>
  <script>
    customReactions.define("one", () => console.log("one"));
    customReactions.define("stop", () => customReactions.break);
    customReactions.define("two", () => console.log("two"));
  </script>
  ```

  When somebody `click` on the `<div>`, then:

  1. the `:one` reaction will run and print `one` in the console,
  2. the `:stop` reaction will run and return `customReactions.break`, which
  3. will halt the execution of the reaction chain blocking the `:two` reaction from ever being invoked.

- Filters
  Custom reaction functions that sometimes break the reaction chain are called filters. Filters check the state of for example:

  1. the event,
  2. the attribute `.value`,
  3. the surrounding dom and/or
  4. Some other external source (such as a web database, a sensor, or similar).

  If some state conditions are (not) met, then the filter will `.break` the custom reaction, otherwise it will let the chain reaction continue.

- Filter, parsers, extractors, etc.
  sda


## 5. Event Loop

- Virtual event loop rules.

  1. Only triggers custom reactions and attributes: no `setTimeout` callbacks, no JS MutationObserver. The only callbacks that are not marked with an event are the web component

- Types of events.

  1. Single attribute events.
  2. "elements in all documents" events.
  3. "elements in a single document" events.

  The single attribute events are callbacks on _one_ isolated custom reaction. They replace the need for `setTimeout()`, `MutationObserver`s, loading `<script>`s, and a few others.

  The path for "elements in all documents" and "elements in a single document" events are calculated starting with the "target" element and then listing ancestors. Much the same as the calculation of the path for native events. However, there are slight differences:

  1. HTML doubledots only trigger custom reactions. And custom reactions can only be added to html elements. Therefore, the virtual event loop in doubledots do not include neither the `window`, `document`, nor any `shadowRoot`s in the propagation path.

  2. "Elements in all documents" events propagate fully. They are like `{bubbling: true, composed: true}` in the native sense. Examples of such events are `click` and `error`.

  3. "Elements in a single document" events only propagate to elements within the same document. This means that if the event occurs within a shadowRoot, then it will not trigger any custom reactions inside any other document.

- Propagation sequence.

  Single attribute events do not propagate. They only trigger the *one* custom reaction attribute. But for the element events (both the single document and all documents events), the custom reactions are executed in the following sequence:

  **Pre-propagation:** _global reactions. Each reaction is run in the sequence it was added. _global reactions only run on elements and custom reaction attributes that are connected to the DOM.

  **Propagation:** bubble the path, target and up. The path is calculated at the beginning of the bubble propagation. This means that if you insert an ancestor element in an event reaction, then this element will not be included in the propagation path. However, if you remove an ancestor element, then this change will be registered, and any event reactions on it will not be triggered. And the final note: if an ancestor is added in the _global reaction stage, then those ancestors will trigger the propagation. Also, if a _global reaction removes the target element of the event from the DOM, then that will remove the entire path.

  For each element, the custom reaction attributes are triggered left to right. As with elements in the path, the list of custom reactions are calculated at the beginning of propagation, and then custom reaction attributes can be removed from the list, but not added. 

  **Post-propagation:** After the event has finished bubbling, the default action will be triggered. Default actions are cancellable, ie. if the `e.preventDefault()` has been called on a default action, then no default action reactions will be triggered.


- No more `.stopPropagation()` 

  `.stopPropagation()` and `.stopImmediatePropagation()` is not part of the virtual event loop. The reason for this is that it is a problematic concept when different developers are supposed to collaborate across shadowDom boundaries.

## 6. Async 

- Sync mode
  
  At its core, the virtual event loop is *sync*. This means that any custom reaction will be completed *before* the any other custom reaction is run. You *can* halt *all* execution of custom reactions if you need to wait for a `Promise` inside a custom reaction. You can force the browser to freeze and wait for something, when and if you really want.

```html
<web-comp click:call_web-comp_method>
  <div click:load:define_web-comp="WebComp.js">hello race</div>
</web-comp>
```

If you did this, then the event loop would essentially *halt* all its other operations while waiting for `:load` to complete, thus ensuring that `:call_web-comp_method` would not be triggered until the definition was ready.

- Async mode , `::`
  But, at its fringes, the virtual event loop is also *async*. If you add the empty reaction `":"` in your reaction chain, then the event loop will *not* pause and wait for any `Promise`s in the rest of that reaction chain, but allow the rest of that reaction chain to be run in a thread.
  
  The empty reaction looks like a double colon prefix: `::load`. Essentially the double colon says that if the virtual event loop encounters a `Promise` *after* the `::`, then it will not halt the progression of the event loop, but instead create a thread that the rest of this reaction chain can run in. Between events, the virtual event loop will process and complete these loose threads.

  This means that we in Doubledots would do the following:

  ```html
  <web-comp click::known-element:call_web-comp_method>
    <div click::load:define_web-comp="WebComp.js">hello race</div>
  </web-comp>
  ```

  Here we are add `::` before `::load` and a new `::known-element` reaction. This means that the `::load:define_web-comp` reaction will run in parallel with the event loop. At the same time, the `::known-element:call_web-comp_method` will also run in a thread. This second thread will for example poll to check if the `<web-comp>` has been given a definition yet, or not.

## 7. Default Actions

- Default action reactions
  The virtual event loop has three different custom reactions to control default actions.

  1. `::da`
  2. `:prevent-da`
  3. `:nda`

- `:da`
  You can add your own a default actions by using the `::da` custom reaction. The `::da` must always be preceded by `::`. This is because it is an async that will not continue until the sync event loop has finished the propagation of the event.

  You can add `:da` multiple times. It is *only* the *last default action* from the *top-most* document, that will run.

- `:prevent-da` and `e.preventDefault()`

  To stop the default action, you can use the `:prevent-da` custom reaction. You can also call `e.preventDefault()` inside one of your own custom reactions.

  > Rule of thumb: the `:prevent-da` should be positioned before the `::` async-/thread-mode marker.

  The `:prevent-da` cannot prevent a default action added in document above. Ie. if `:prevent-da` is called from a shadowDom, that will not be able to block a default action added on a child element in the lightDom.

  ```html
  <web-comp>
    <h1 click::da:open="bbc.com">bbc.com</h1>
  </web-comp>

  <script>
  customElements.define("web-comp", class WebComp extends HTMLElement{
    constructor(){
      super();
      this.shadowRoot.innerHTML = 
      `<slot click:prevent-da></slot>`
    }
  });
  </script>
  ```

  If the default action commands from all the documents were equal, then the `<web-comp>` would cancel the default action in the document above. In contrast, in the virtual event loop, default actions are sorted in the hierarchy they are added.

- `:nda` Native Default Action

  By default, native default actions run as normal. However, like your custom `::da`, you can *re-enable* the native default action even after a custom reaction has been added or `:prevent-da` has been called. This enables you to override any `e.preventDefault()` calls taking place inside a shadowDom.

  To re-enable the native default action, a special `:nda` reaction is called. `:nda` *must end* the reaction chain. This reaction can run sync; it doesn't have to run  after `::` in async mode.

  > `:nda` stands for "native default action".

- `:nda` example

  ```html
  <a href="bbc.com" click:is_active:nda>
    <web-comp>
      hello sunshine
    </web-comp>
  </a>
  ```
  Even if a custom reaction inside `<web-comp>` called `.preventDefault()`, the browser would still run the native default action on the event.

- Note on implementation

  ```js
  customReactions.define("da", function(e,i){
    const daDelayer = new Promise();
    e.customDefault(daDelayer);
    return daDelayer;
  });
  ```

  When the virtual event loop processes the default action list, it will `promis.resolve(oi)` on the chosen default action, and `promise.resolve(customReactions.break)` on all the default actions that were prevented or not resolved.

- `Event` implementation

  The below code illustrates how the virtual event loop manages the 

  ```js
  class Event {
    private static prevent = {};
    private static nda = {};
    private defaultActionList = []; 
    preventDefault(){
      this.defaultActionList.push({action: Event.prevent, document: this.currentElement.getRoot()});
    }
    nativeDefault(){
      this.defaultActionList.push({action: Event.nda, document: this.currentElement.getRoot()});
    }
    customDefault(promise, oi){
      //outside check that the attribute is preceeded by `::`
      this.defaultActionList.push({action: this.currentAttribute, document: this.currentElement.getRoot(), promise, oi});
    }

    stopProgation(){
      //after the current element
      //restricted to only work within the current document    
    }

    stopProgationElementOnly(){
      //stop the rest of  the reactions on this element, but let the reactions on ancestor elements run as before
      //restricted to only work within the current document    
    }

    stopImmediateProgation(){
      //current element and rest of document
      //restricted to only work within the current document
    }

    processDefaultActions(){
      //the findTheLastDAofTopMostDocument algorithm is a bit tricky as levels between different slotting web comps play as one.
      //<slotting-a>
      //  <slotting-b>
      //    target
      //
      //the document depth alone between the default action commands inside slotting-a and slotting-b is not sufficient. If there are actions inside slotting-a, they should always win over commands in slotting-b, regardless of document depth.
      const singleDa = this.defaultActionList.filter(findTheLastDAofTopMostDocument);
      const listOfPreventedDas = this.defaultActionList.filter(notSingleDa);
      returns {singleDa, listOfPreventedDas};
    }
  }
  ```


## 8. Custom triggers.

In Doubledots you can also define your own `trigger:`. Triggers are event factories, sort of. Some are atomic and simple, like `set-timeout_10:` or `attr-change_style:` for example. Others are complex state machines like `swipeable` and `drag-n-drop`. In this chapter we start with the simple ones.

- Undefined event triggers: `click:` and `_click:`

  When an event propagates, it will trigger reaction chain that contain the 

- Define a `trigger:`

  To define a trigger is very similar to defining a reaction rule, except that the definition is not a function, but a `class` that `extends Attr`. This is what it looks like:

  ```js
  customReactions.defineTrigger("prefix", class MyTrigger extends Attr{
    upgrade(fullname) {
      this; //=> the attribute node
    }
  });
  ```

  Inside the trigger `class` you must implement *one* function called `upgrade(fullname)`. The `upgrade(fullname){...}` function is the constructor of the trigger.

  The `"prefix"` is the start of the trigger names that this definition will be applied to. No trigger prefix can overlap with another trigger prefix, but the reaction names and rule prefixes are completely separate from the trigger prefixes. 

  The `prefix` *cannot* startsWith `_`, `-`, or `.`. This will cause conflict with `_global` triggers, or come into conflict with HTML parsing of attributes. 

  The `prefix` *should* endsWith either `_` (if it parses name string arguments) or `able` (common for gestures). If the `prefix` does not endsWith the above, it should include either a `_`, or `.` so that it will not overlap with event names.

  The `upgrade(fullname)` callback is called immediately/asap when the trigger is created. Inside the `upgrade(){...}` the `this` is the attribute node that the custom trigger is part of. The argument `fullname` is the full name of the trigger. So, as with reaction rules, it is possible to pass arguments to your triggers as the tail of the trigger name.

- `this.dispatchEvent()` and `this.ownerElement.dispatchEvent()`

  The purpose of triggers is to `dispatchEvent()`. There are two targets that the trigger *should* dispatch events too:
  1. `this` (the attribute)
  2. `this.ownerElement` (the element)

  > It is possible to dispatch events on other targets too, but you should try to avoid this if you can. The golden rule is that triggers dispatch events on either the attribute or element they are attached to.

  Events that are dispatched to an attribute only trigger the reactionchain on that particular attribute. No bubbling. No _global reactions. Triggers that dispatch single attribute only events are therefore "simpler" and "atomic". Technically, the event type name and the trigger name do not have to match, but in practice it is common to give the custom attribute event the same name as the trigger prefix.

  Events that are dispatched on the element will trigger all reactionchains for _global reactions and for trigger names matching its type name on other elements that it bubbles to. For such triggers you should therefore *not* give their custom event's the same type name as the prefix or full name of the trigger. For example, `swipeable` will dispatch `swipe` and `swipe-end` events.

  Triggers that dispatch full, normal, propagating element events are commonly more complex and stateful than triggers that dispatch simple, atomic attribute events. We will therefore discuss these triggers in subsequent chapters and here only focus on simple, atomic, stateless triggers.

  Event type names *cannot* startsWith `_`. Event type names *should not* contain `.` nor `_` and endsWith `able`.

- Simple, atomic, (almost) stateless triggers

  - `attr_xyz:`

    Custom triggers replace all the native Observers in JS. In this example we use the Doubledots implementation of the attribute-change-trigger called `attr_xyz:`. This trigger essentially maps the behavior of `MutationObserver.observe(el, {attribute: true, attributeList: [x,y,z]})` into Doubledots:

    ```html
    <script>
      class AttrTrigger extends Attr{

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
      customReactions.defineTrigger("attr_", IntervalAttr);
      customReactions.defineReaction("log", console.log);
    </script>

    <h1 attr_class:log class="sun shine">hello</h1>
    ```

  - `inview:`

    In this example we use the `IntersectionObserver` to create a custom `inview:` trigger. `inview:` dispatches a new attribute event and triggers the reaction chain on the custom attribute every time the element it is attached to switches from out-of-view to in-view:

    ```html
    <script>
      class InviewTrigger extends Attr{

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
      customReactions.defineTrigger("inview_", IntervalAttr);
      customReactions.defineReaction("hello", _ => console.log("sunshine"));
    </script>

    <div style="height: 130vh">scroll for it</div>
    <h1 inview_1:hello>hello sunshine</h1>
    ```

  - `timeout_x:` 

    The atomic `timeout_x:` trigger dispatches an attribute event type `timeout` that will run its reaction chain once after delay of x ms.

    ```html
    <script>
      class TimeoutTrigger extends Attr{
        async upgrade(timeout_time) {
          const delay = timeout_time.split("_")[1];
          await sleep(delay);
          if(this.isConnected) //Doubledots adds this method to Attr too
            this.dispatchEvent(new Event("timeout"));
        }
      }
      customReactions.defineTrigger("timeout_", TimeoutAttr);
      customReactions.defineReaction("log", console.log);
    </script>

    <h1 timeout_1000:log>hello sunshine</h1>
    ```

    The `timeout_x:` does not use `setTimeout`, but `await sleep()` instead. The reason for this is that Doubledots deprecates `setTimeout()` and instead provides an `await sleep()` instead. There are two reasons why `setTimeout()` is deprecated:
    1. It enables a new event to be added from JS without any trace in the HTML template,
    2. To use `await sleep()` inside `async function`s yield easier to read code.

    However. In Doubledots, it is recommended to use `::sleep_x:` reaction rule instead:

    ```html
    <script>
      customReactions.defineReactionRule(":sleep_", function(sleep_x){
        const delay = parseInt(sleep_x.split("_")[1]);
        return async function(e, oi){
          await sleep(delay);
          return oi;
        }
      });
      customReactions.defineReaction("log", console.log);
    </script>

    <h1 ::sleep_1000:log>hello sunshine</h1>
    ```

    The benefits of using the `::sleep_x` instead of a `timeout_x:` are:
    1. The reaction chain will be added to the event loop. This means that any tooling that illustrate the event loop, will also illustrate when the reaction chain is awaiting the `setTimeout`.
    2. The `::sleep_x` is more versatile. You can add other reactions infront of it, and with one reaction rule you can solve more use-cases than with the `timeout_x:`.

  - `interval_x:`

    ```html
    <script>
      class IntervalTrigger extends Attr{
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
      customReactions.defineTrigger("interval_", IntervalAttr);
      customReactions.defineReaction("log", console.log);
    </script>

    <h1 timeout_1000:log>hello sunshine</h1>
    ```

    The `interval_x:` works better than `timeout_x:` as a trigger. But, we can also implement `interval_x:` using `::sleep_x` and `:..-x`:

    ```html
    <script>
      //customReactions.defineReactionRule(".", dotReactionRule) //see later chapter
      customReactions.defineReactionRule("sleep_", function(sleep_x){
        const delay = parseInt(sleep_x.split("_")[1]);
        return async function(e, oi){
          await sleep(delay);
          return oi;
        }
      });
      customReactions.defineReaction("log", console.log);
    </script>

    <h1 ::sleep_1000:log:..-2>hello sunshine</h1>
    ```

    This implementation is using the `.` reaction rule to step -2 positions in the reaction rule, ie. back to the `:sleep_1000` reaction. This is more difficult to read, and it is easy to make a typo using the `:..-2` loop/goto mechanism. However, the benefit is still:
    1. The reaction chain will be added to the event loop. And it is visible to any tooling that show the state of the event loop.
    2. Again, we only use `:sleep_x` and `:.`, two reaction rules that are part of the Doubledots core (as opposed to `timeout_x:` and `interval_x:` that are not).

- Trigger destruction and cleanup

  In Doubledots, neither attribute nor element nodes can be put back into the DOM once they have been disconnected. In Doubledots, the concept is that if an HTML node is no longer in the DOM, it should be considered garbage.

  This means that:
  1. if an internal callback in a trigger is triggered, and
  2. the trigger attribute is either has no `.ownerElement` or that `.ownerElement.isConnected === false`, then
  3. the trigger should be considered garbage, and
  4. that any active stop, cleanup, or other garbage collection tasks can and should be performed.



- We skip `destructor()`

  >> todo: can we skip this? Will MutationObserver work as a WeakSet allowing elements to be gc'ed? or is the 

  In addition, you *can* implement another function called `destructor()`. The `destructor()` is as the name implies the method called when the trigger is removed.

  The `destructor()` is necessary in *some* custom triggers. No, I think when we can't take attributes and elements in and out of the DOM, this is no longer necessary.

## 9. Defining reactions

- Reaction rules!

  There are two ways to define custom reactions: 
  1. normal reactions (`customReaction.define("name", reaction)`), and
  2. reaction rules (`customReaction.defineRule("prefix", rule)`). 

- HowTo define a reaction rule

  When you define a reaction rule, you pass in two parameters: `prefix` and `rule`.

  1. The `prefix` is a `String` that will be matched against any reaction name. If you for example pass in `"."` as the prefix for a reaction rule, then all reaction names that starts with `"."` such as `.open` or `..` or `.-` will be recognised as belonging to this rule. 

  2. The `rule` is a higher-order function. A higher-order function is a function that returns another function. The `rule` is a function that will be given a single argument: the full name of the reaction that is matched. The `rule` function must return a `Function` object. This output `Function` will then be matched with all subsequent reactions with that specific name.

- When are reaction rules interpreted?

  The virtual event loop will try to interpret the reaction rule into a normal reaction function when it is first encountered.

- Example 1: `toggle-attribute`

  We have a web application with two very similar reactions: `toggle-attribute_hidden` and `toggle-attribute_open`. This is kinda annoying, what we want is to have a single reaction `toggle-attribute` and then pass in the attribute names `hidden` and `open` as arguments. To accomplish this, we can use reaction rules.

  ```html
  <details click:toggle-attr_open>
  <summary click:toggle-attr_hidden>single use open</summary>
  you cannot unsee what you have seen.
  </details>
  <script>
    customReactions.defineRule("toggle-attr_", function(name){
      const attrName = name.split("_").pop();
      return function(e,oi) {
        this.ownerElement.toggleAttribute(name);
      };
    })
  </script>
  ```

  >> Note: since you are using the `_` to separate a required argument, it is beneficial to add `_` to the rule prefix.

- Example 2: `sleep_`

  We want to implement a version of `sleep` so that we don't have to define a new reaction every time we want to change the duration of the sleep function. Again, we can accomplish this with a reaction rule.

  ```html
  <div 
    click:sun_rise::sleep_5000:sun_set:sleep_3000:..-4
    >hello sunshine</div>
  <script>
    customReactions.defineRule("sleep_", function(name){
      const duration = name.split("_").pop();
      return _ => new Promise(r=>setTimeout(r, duration));
    });
    customReactions.defineRule("sun_", function(name){
      const riseOrSet = name.split("_").pop();
      if(riseOrSet === "rise")
        return function(e,oi){
          this.ownerElement.classList.add("sun");
        }
      return function(e,oi){
        this.ownerElement.classList.remove("sun");
      }
    });
    customReactions.defineRule("..", function(name){
      const pos = parseInt(name.substring(2));
      return _ => customReactions.goto(pos);
    });
  </script>
  ```

- Name and rule conflicts

  It is *not* possible to define reaction names and reaction rule prefices that overlap. If you do that, your code will `throw` a `ReactionNameError`. For example:

  ```js
  customReactions.define("attribute-open", ...);
  customReactions.defineRule("attr", ...);  //fails!
  ```

  or

  ```js
  customReactions.defineRule("attr", ...);
  customReactions.define("attribute-open", ...);  //fails!
  ```

  To avoid such naming conflicts, the following conventions are smart to follow:
  1. reaction names that start with `.` and `-` are often used as reaction rules. Avoid having normal reactions start with `.` and `-`. (You can make your own custom reactions for `.` and `-` if you like.)
  2. For reaction rules such as `toggle-attribute_` and `sleep_` keep the `_` as part of the reaction name.
  3. Avoid using short and generic names such as `attr` as reaction rule name. This will likely cause problems.
  4. For normal reactions, try to avoid using both `_` and `.` in the reaction name. For normal reactions, english letters and `-` are most often enough. If you find that a `.` or `_` is necessary in your reaction name, this can be a signal that you might want to write a reaction rule instead of a normal reaction.


## 10. Defining reaction rules

- Defining custom reactions part2

  A reaction function can return anything, and what the reaction function returns will be the `oi` of the next reaction in the chain. And if a reaction function throws an `Error`, then that reaction chain will break and an `Error` event will be added in the event loop. Ok, so far so good.

  In addition, custom reactions can return three special types of values:

  1. `customReaction.break`
  2. `customReactions.goto(int)`
  3. `customReaction.origin(obj)`

  We have already seen how `customReactions.break` as a special return value from a reaction can halt the reaction chain (as expected) without adding an `Error` event to the event loop. So here we will look only at the two others.

- 1. `customReactions.goto(int)`

  To be able to implement control structures such as `if else` and `for`-loops, custom reactions need to be able to control the execution sequence in the custom reaction chain.

  If you `return customReactions.goto(1)`, then the custom reaction chain will skip the next (one) reaction. `return customReactions.goto(3)` will skip the next 3 reactions. For example:

  ```html
  <div click:a:j1:b:j1>hello sunshine</div>
  <script>
    customReactions.define("a", _ => return "a");
    customReactions.define("b", _ => return "b");
    customReactions.define("j1", function(e, oi){
      console.log(oi);
      return customReactions.goto(1);
    });
  </script>
  ```

  The above example will run 
  1. the `:a` reaction that returns `"a"` as the `oi` to the next reaction.
  2. the `:j1` reaction will `console.log` the `oi` input, which is `"a"` and then return a `jump` 1 forward. When such a jump is initiated, the `oi` and `this` remains the same for the reaction coming after the jump as it was coming into the reaction performing the jump. 
  3. the `:b` is then skipped, jumped over.
  4. the second `:j1` is then triggered, with the same `oi` as before the jump, which makes the second `j1` also print `"a"`.
  5. As the second `j1` returns a jump, and this jump goes beyond the scope of the reaction chain, an `ReactionChainError` is `throw`n.

- Reverse jumps

  If you `return customReactions.goto(0)`, then the custom reaction will repeat itself. If you `return customReactions.goto(-1)`, then the custom reaction chain will go back to the previous reaction. `return customReactions.goto(-3)` will go back three places.

  ```html
  <div click:n1:t2:lt64_-2>hello sunshine</div>
  <script>
    customReactions.define("n1", (e,oi) => isNaN(oi) ? 1 : oi);
    customReactions.define("t2", (e,oi) => oi*2);
    customReactions.define("lt64_-2", function(e, oi) {
      if (oi < 64)
        return customReactions.goto(1);
      console.log(oi);
    });
  </script>
  ```

  The above example will run 
  1. the `:n1` will ensure that the `oi` is a number, or start with 1.
  2. the `:t2` will multiply the `oi` with two.
  3. the `:lt64_-2` will check that if the number is less than 64, it will go back two steps to `:n1`.
  4. This creates a loop, that multiplies a number, starting with 1, by 2, until the value is 64 or over.

- 2. `new EventLoop.ReactionOrigin(obj)`

  The `this` object for the custom reaction is by default, and at the start of *every* custom reaction chain, the current reaction attriubte. But. You can change this. In order to change this, you need to have a custom reaction that returns a special `origin` wrapped object.

  If you for example have a customReaction that `return new EventLoop.ReactionOrigin(this.ownerElement)`, then for the next reaction, the `this` of the reaction function will be the element that the custom Reaction is attached to.

- 3. `customReactions.index`

  In addition to `.define` the `customReactions` object has another special property: `.index`. The `.index` is the current position of the execution of the current custom reaction within the custom reaction chain/attribute.

  ```html
  <div click:one:two:three:one>hello sunshine</div>
  ```

  1. During the first run of reaction `:one`, then `customReactions.index == 1`.
  2. During reaction `:two`, then `customReactions.index` is `2`.
  3. During reaciton `:three`, then `3`.
  4. During the second run of reaction `:one`, then finally `4`.

  The `customReactions.index` is not a property you will use all that much. But it can be handy when you need to implement semi control structures and other reflexive or code-oriented functionality. And yes, you are right, it is kinda like the old, deprecate global `event` property.




# STEPS 

1. Layout the html needed for the example. Use minimal to no styles.
2. Breakdown the functionality into it's triggers and reactions.
3. Chain together the attributes and assign it to the corresponding element.


# EXAMPLE

# Demo: How to build a calculator

## 1. Template first

In this example we implement doubledots on a classic calculator. We start with the pure, normal html template and lay it out:

```html

only the calculator, link to the css, table, no custom reaction nor script

<html>
  <head>
    <title>Simple Calculator</title>
    <link rel="stylesheet" href="./calc.css" type="text/css" />
  </head>
  <body>
    <table id="calculator">
      <tr>
        <td id="result"></td>
      </tr>
      <tr>
        <td id="operation"></td>
      </tr>
      <tr>
        <td id="input"></td>
      </tr>
      <tr>
        <td class="operator">C</td>
      </tr>
      <tr>
        <td class="number">1</td>
        <td class="number">2</td>
        <td class="number">3</td>
        <td class="operator">/</td>
      </tr>
      <tr>
        <td class="number">4</td>
        <td class="number">5</td>
        <td class="number">6</td>
        <td class="operator">*</td>
      </tr>
      <tr>
        <td class="number">7</td>
        <td class="number">8</td>
        <td class="number">9</td>
        <td class="operator">-</td>
      </tr>
      <tr>
        <td class="number">0</td>
        <td class="number">.</td>
        <td class="operator">=</td>
        <td class="operator">+</td>
      </tr>
    </table>
  </body>
</html>
```

## 2. Add first reaction

The first reaciton is to add numbers to the input, when we click on a button inside the calculator. First, we do this by adding a the custom reaction `click:add_number` to the container parent that is the closest ancestor to all the elements involved.

```html

<table id="calculator" click:add_number>
  . . .
</table>
<script>
  customReactions.define("add_number", function (e, i) {
    const input = this.ownerElement.querySelector("#input");
    input.innerText += i;
  });
</script>
```

Problems: the reaction doesn't have a check. if you click something other than a number, we have errors.
## 3. add filter

How to fix this? we add a filter in the chain `click:is_number:add_number`

```html
<table id="calculator" click:add_number>
  . . .
</table>
<script>
  customReactions.define("is_number", function (e) {
    if (["result", "operation", "input"].indexOf(e.target.id) >= 0) throw customReactions.break;
    if (e.target.innerText.matches(/0-9/)) return e.target.innerText;
    throw customReactions.break;
  });
  customReactions.define("add_number", function (e, i) {
    const input = this.ownerElement.querySelector("#input");
    input.innerText += i;
  });
</script>
```
## 4. add the operator function

Let's build the entire calculator. Here we need to explain the logic with the previous operator and the hidden result etc. Once the strategy is explained, just add the extra custom reaction definitions, and the custom reaction invocations on the `<table>` element.

```html
<table id="calculator" _keypress:is_number:add_number>
  . . .
</table>
<script>
  customReactions.define("is_operator", function (e) {
    if (["result", "operation", "input"].indexOf(e.target.id) >= 0) throw customReactions.break;
    if (e.type === "keypress") {
      if (e.key === "Esc") return "clear";
      if (["=", "+", "-", "/", "*"].indexOf(e.key) >= 0) return e.key;
    }
    if (e.type === "click") {
      const targetTxt = e.target.innerText;
      if (["=", "+", "-", "/", "*", "clear"].indexOf(targetTxt) >= 0) return targetTxt;
    }
    throw customReactions.break;
  });
  customReactions.define("do_operator", function (e, i) {
    . . . (calculator logic) . . .
  });
</script>
```

## 5. add the keypress functionality

With a calculator you want multiple events. Add reactions for keypress too.

```html
<table id="calculator" _keypress:is_number:add_number>
  . . .
</table>
<script>
  customReactions.define("is_number", function (e) {
    if (["result", "operation", "input"].indexOf(e.target.id) >= 0) throw customReactions.break;
    if (e.type === "keypress" && e.key.matches(/0-9/)) return e.key;
    if (e.type === "click" && e.target.innerText.matches(/0-9/)) return e.target.innerText;
    throw customReactions.break;
  });
  customReactions.define("add_number", function (e, i) {
    const input = this.ownerElement.querySelector("#input");
    input.innerText += i;
  });
</script>
```