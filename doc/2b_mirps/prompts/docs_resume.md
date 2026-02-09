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


## 11. Dot rules / The `.` rules

```js
customReactions.defineRule(".", function(name){
  if (name===".")
    return (e, oi) => oi || customReactions.break;

  if (name==="..")
    return (e, oi) => oi && customReactions.break;

  const [_, jump] = name.matches(/\.\.(d+)/) || [];
  if (jump) //att! no goto(0)
    return (e, oi) => oi ? customReactions.goto(jump) : oi;
    
  const [_, kName] = name.matches(/\.(a-z-)/) || [];
  if (kName) {
    const cName = kName.replace(/(-\w)/g, m=> m[1].toUpperCase());
    return function(e, oi) {
      const p = this[cName];
      return p instanceof Function ? p.call(oi) : p;
    };
  }
  throw new SyntaxError(`The name: "{name}" doesn't match the "."rule`);
});
```

- The default filter reaction `:.:` and `:..:`

  The default dot-rule handles `:.` as a filter that breaks if the input is `falsy`. If the Link to the definition of falsy on mdn. If the `oi` input is truey, then the `:.` will let the `oi` "pass through".

  The `:..` works the same way, but in reverse. If the `oi` is `falsy`, the reaction just lets it through; if the `oi` is `truey`, then the reaction will break.

- The `:..3` jump

  The `:..` specifies a jump. It is useful to implement control structures. The `:..X` where X must be a positive or negative integer. If the `oi` is falsy, then the jump will not happen.

  >> todo. should jump be triggered on truey, falsey, or always?

- To `:.kebab-reflection` is to `this.kebabReflection(oi)`

  The `:.-a-z` turns the reaction name after `.` into a camelCase property name. The reaction will then look for the property on the `this` object for the reaction. If the property is a function, it will call it, using the `oi` as the only argument. Otherwise, it will simply return the property value.

  Kebab reflection primarily enable doubledots developers to access:
  1. the `.value` on attributes,
  2. methods such as `.dispatch-event` and `.first-element-child` on `HTMLElement`s,
  3. properties on events such as `.time-stamp` and `.x` on `PointerEvent`s,  
  4. custom methods on web components or other html element based modules, and 
  5. methods and properties on state-machine attributes.

  When you need to have your custom name space for reactions associated with an HTML node such as a state-machine attribute or a web component, then using `:.kebab-reflection` is very helpful and makes a lot of sense for the developer.

- Have your cake and eat it

  The `:.`-rule only reserves the `.` as the first character of reaction names. You can still make your own custom reactions that return `customReactions.goto()` and `customReactions.break` or that does method invocation on html nodes any way you would like. And, if you don't like the logic and feel of the `.`-reactions, simply exclude it. That is the benefit of having this functionality implemented as reaction rule, and not hard coded into the syntax of html doubledots.

## 12. Dash rules / The `-` rules

```js
customReactions.defineRule("-", function(name){
  if (name==="-") {
    return function(e, oi){
      if (oi instanceof Object)
        return new EventLoop.ReactionOrigin(oi);
      throw new DashReactionError(`"${oi}" is not an Object.`);
    }
  }
  if (name==="-e")
    return e => new EventLoop.ReactionOrigin(e);
  if (name==="-t")
    return e => new EventLoop.ReactionOrigin(e.target);
  if (name==="-a")
    return e => new EventLoop.ReactionOrigin(e.currentAttribute);
  if (name==="-el")
    return e => new EventLoop.ReactionOrigin(e.currentElement);
  if (name==="-p")
    return e => new EventLoop.ReactionOrigin(e.currentElement.parentNode);
  if (name==="-pp")
    return e => new EventLoop.ReactionOrigin(e.currentElement.parentNode.parentNode);
  if (name[1] === "-")
    throw new ReactionError(`--something is not supported yet: ${name}`);
  name = name.substring(1);
  return function(e,oi) {
    for (let attr of e.currentElement.attributes)
      if (attr.name.replace(":", "_").startsWith(name))
        return new EventLoop.ReactionOrigin(attr);
  }
});
```

- The `:-` dash reaction

  The purpose of the dash reaction is to move the origin of the reaction chain to either an HTMLElement and an HTML attribute (here collectively called html nodes as they are the only `Node` types that are visible in HTML template).

  TODO the `:-` rules should be nested. The `:-pp-_input_radiobutton` will do `e.currentElement.parentNode.parentNode.querySelector("input[radiobutton]")`.

  If they are nested, then we can keep the rule origin static?

  The default implementation of the `:-` rule *shortcuts* are **static**. This means that the shortcuts are ignores the current `this` and instead interprets the origin as if they were the first reaction in the chain, always. 

  The default implementation of the `:-` rule *queries* are **dynamic**. This means that the `:-` querries use the current `this` to find the 

  This is a choice. This can cause confusion. The alternative would have been a **dynamic** interpretation of the `:-` rule. This might cause less confusion in some settings, and enable more complex searches.. such as This would enable more, but could cause more problems as there is no   But a choice was made. Having the `:-` shortcuts 

- List of `:-` shortcuts

  There is a set of `:-` shorthands that sets a specific objects as the `this` origin of the next reaction:
  1. `:-` => `oi` (fails if `!(oi instanceof Object)`.)
  2. `:-e` => `e`
  3. `:-t` => `e.target` (in the same document, it does not step into any shadowDoms.)
  4. `:-el` => `.currentElement`
  5. `:-p` => `.currentElement.parentNode`
  6. `:-pp` => `.currentElement.parentNode.parentNode` 
  7. `:-prev` => `.currentElement.previousSiblingElement`
  8. `:-next` => `.currentElement.nextSiblingElement`
  8. `:-first` => `.currentElement.nextSiblingElement`
  8. `:-last` => `.currentElement.nextSiblingElement`
  9. `:-a` => `.currentAttribute` (this works as a reset for origin transposition.)

  >> Note: The `:-p`, `:-pp`, `:-next`, `:-prev`, `:-first`, and `:-last` rules are static: they are interpreted against the initial `element` at the beginning of the reaction chain, not the current, interpreted `this` that may fluctuate up and down and round and about in the reaction state.  It is a valid choice to implement another `:-` 

- List of `:-`-queries.

  todo add query selector for children.
  todo add query selector up the ancestor chain,

  1. `:-attribute_name` => finds the first attribute on the `.currentElement` that starts with `attribute-name` where any `:` in the attribute name is treated as a `_`.

  >> Note: For the first :reaction in the chain, this is equivalent to the `:-` as the first reaction is passed the `e` as both the `e` and `oi` argument.

- Have your cake and eat it

  If you want, you can always create your own custom reactions that alters the origin of the reaction chain by returning an object wrapped in `new EventLoop.ReactionOrigin(obj)`. It is also possible to not implement the default `-` dash rule, or implement your own version of the `-` dash rule.

  Thus, different developers can use different objects as their origin root for their reaction chain. It is therefore possible to go to a more jQuery, Set/monadic style if you want. 

  The use and combination of dash and dot reactions was originally built to support ease of implementation of gestures where gestures create children reactions that quickly need to transpose their reactions onto the gesture state machine reaction, and where the gesture state machine also needs to hide the definition of its own reaction within its own namespace, so as to not flood the global reaction registry with possible many longwinded and likely overlapping custom reaction functions.

- Chains, monads, nested functions, or what?

  A chain reaction is just a sequence of custom reaction functions called one after another. Simple. And some of you might have encountered similar structures as function chaining and monads. For example in JS arrays and jQuery. Or you might recognize them as a series of linearly nested functions.
  
  It is possible to argue that the custom reactions are monadic. The monad would be the attribute itself, and the custom reactions are then mapped against this attribute. The attribute (with the `oi` property) gives a viewpoint/pin-hole-frame of the DOM, and each reaction alters the underlying state. Not unlike a monad. Sure.

  But. Personally. I think that the conceptual model `trigger => filter => effect` is a more useful perspective. This perspective readily describe what you will be making 95% of the time. And this structure will make your code concise, readable and super effective.

  In addition to such normal custom reaction chains, you have a second type `attr-change:machine="state"` reaction. These statemachines we will return to shortly.


## 13. Schedulers

## 14. Load times

## 15. State machine

- State machines

State machines are everywhere in the browser. And a key to creating manageable and scalable application is to correctly identify and to be able to reuse proper statemachines. This is something Doubledots take great pride in. A lot of the more complex functionality of Doubledots is oriented towards making statemachines simple, transparent, safe, and reusable.

When we look at state machines in the web browser, there are three binary categories that are helpful in order to understand them.

1. **single-trigger** vs. **multi-trigger** state machine: Do the state machine listen to only one *trigger type*? If so, it is a "single-trigger" statemachine. If the state machine listens to multiple types of triggers, such as a "hover" that listens for both `mouseenter` and `mouseleave`, then it is a multitrigger statemachine.

2. **Simple** vs. **Complex**: Do the state machine have *more than* two states? If they have *three or more* states, we call them **complex**. If they only have *two* states, we call them **simple**. (If they only have one state, they are not statemachines, but just a simple reaction(chain)).

3. **Gestures** vs. "plain statemachines": Gestures are statemachines that react to UI events and describe the state of user interaction. They are commonly complex, multi-trigger, and focus on dispatching events, but exceptions do exists to all these rules: `click` is simple, a naive `doubleclick` is single-trigger, `hover` outputs no events, only update CSS (pseudo) class.

- Examples of single trigger state machines

If a statemachine only has a single trigger type, it can and *should be* implemented as a reaction(chain). These statemachines *commonly* toggles a css class or attribute on an element. They can be complex and switch between several different states as for example form validation can do, but this has not such a big impact on implementation strategy as the variety of trigger types do. Single trigger state machines should be implemented using a single reaction (rule).

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

- Examples of gestures

1. Drag-and-Drop Interfaces: In drag-and-drop interactions, the draggable elements and drop targets go through a series of states: idle, dragging, over a target, and dropped.

2. `click` and `press`

3. Swipe and fling and pinch and pan

In this chapter we will only look at the simpler 

- Demo: `hover` state switches

In this example we will illustrate a statemachine spread out over two custom reactions, working in sync, to update a state on another attribute.  we will implement a hover reaction for our html with doubledots that updates the hover attribute on an element.

```html
<h1 mouseenter:hover-on mouseleave:hover-off>Hello sunshine</h1>
<script>
customReaction.define('hover-on', function() {
  this.ownerElement.classList.add('hover');
});
customReaction.define('hover-off', function() {
  this.ownerElement.classList.remove('hover');
});
</script>
```

>> old text: A "hover" statemachine listens for UI events, and you can easily see that statemachine dispatching "hover" events if you want to. However, a "hover" statemachine is both small, simple, and would commonly only listen for UI events, update a css (pseudo) class or attribute, and it would commonly *not* dispatch events. Therefore, the term statemachin (simple, non event oriented effects) would better fit "hover" than the term gesture (complex, mostly event oriented effects).

And done! Two triggers tracks the mouse movements entering and leaving an element and add/remove a css class `hover` on the element.

This is fine. But if there are more than just *two* triggers involved, this can quickly become unwieldy. To tackle more complex scenarios, we use custom triggers set up as state machines.

- Example gesture: `trippleclickable`

`trippleclickable` is a small statemachine dispatches a custom event `trippleclick` when a user clicks an element three times in quick succession.

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
    else if (this.count == 2){
      lastTime = count = 0;
      this.ownerElement.dispatchEvent(new MouseEvent("trippleclick", e));
    } else{
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

- `click:tripplable`

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


-  Example gesture: `longpressable`

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



## 16. Gestures

