# Problems with the native event loop

The main flow of control an HTML application is the event loop. The event loop is a queue. An event occurs, and it is added to the queue. The browser then executes each event, one by one.

To react to an event, the developer can add functions called "event listeners" for different types of events to different elements in the DOM. When the browser executes an event, the browser first will find the "path" for the event. The path is the "target" of the event and all the ancestor nodes of the target. The browser then "propagates" over this list of DOM nodes and calls the event listeners for that event on each node in the path.

There are several (unnecessary) complexities in the way the native event loop is set up:

### 1. Keep you `compose`ure..

1. The way the browser creates the path is tricky. First, some events are so-called "not composed", and when the browser makes the path for these events, the path will stop at the nearest document or shadowRoot node. But the path will include the elements in the shadowRoot of other web components that "slot" in the event. For some focus events, at least in some older versions of the browser, the non-composed events could be stopped on a higher shadowRoot one or two level up, but still not include some or more higher ligthDoms.

### 2. down and up and was that `AT_TARGET`?

2. Once the path is set up, the browser will first go _down_ the path in a so-called capture phase, and then _up_ the path in the so-called bubble phase. Most developers only concern themselves with the bubble phase, but because the event loop enables both, slicky capture event listeners might sneak into a developers code-base and cause strange behavior.

### 3. did you capture that non-bubbling thing?

3. In addition, the browser enable _some_ events to bubble, while others are so-called non-bubbling events. Non-bubbling events should in theory not bubble, and so one might be exused for thinking that such events will only trigger event listeners on the target node itself. Or, that the path for such event listeners only includes one element: the target. But. Not so. The non-bubbling target focus only applies to the bubbling phase. Thus, event listeners for non-bubbling events will trigger in the capture phase on ancestors of the target. And! When the target is inside a web component, then the host node of that web component will also be considered "a target", and not an ancestor, and thus the non-bubbling events will be "reverse bubbling in the capture phase" and "ancestor host nodes are targets, not and not parent nodes". Non-bubbling frobscottle.

### 4. the many different levels of macro and micro tasks.

4. For some native events the event listeners get their own macro task. Some don't. What does "getting your own macro task" mean you say? And which events gets what? All good questions! When an event listener gets a macro task, it means that any micro task that completes during the execution of that event listener will be run before the next macro task, ie. before the next event listener for that event is run. Same DOM node or not. Microtasks are such things as MutationObserver callbacks, web component callbacks, and promise resultion or errors. The events that gets a macro task for their running are usually UI events such as `click` and `keypress`, but I don't know of any consensus or autorative list where this is written down.

### 5. (You must) make your own `setTimeout(.., 0)`

5. `setTimeout` are also macro tasks that are queued in the event loop. But they cause no event propagation, and they are added using callback structure, not event listeners. There are also special rules regarding the timeout callbacks, such as the 4ms minimum delay, and low priority, meaning that if you want to call a *true* `setTimeout(.., 0)`, you need to do:
```javascript
function setTimeout0(cb){
  const a = document.createElement("audio");
  a.onratechange = cb;
  a.playbackRate = 2;
}
```

### 6. `<script>` is an event. actually.

6. When a `<script>` runs, it also is given a macro task: the running of a script is a task in the event loop. In Firefox this /script/ macro task/event is preceeded by a regular `beforescriptexecute` event, while in the other browsers, you can only intercept this event by adding a MutationObserver to the node onto which the event is added. 

### 7. Custom events are always nested events

7. Custom events, that are dispatched using `.dispatchEvent(..)` are *not* added to the event loop. They are not "event" in the "event loop" meaning of the word. They do *not* get their own macro task, and they run *before* the native event which triggered them are finished. This means that if you in a `click` event listener dispatch your own `custom-event`, then maybe a handful of `click` event listeners will run, then a handfull of `custom-event` listeners, and then some more `click` event listeners for the same, original `click` event. Nested niceness. But. With all super convoluted systems, it is the possibility to know super intricate trivia and cool tricks: You only need to do a `setTimeout0(()=>element.dispatchEvent(customEvent))` to dispath a custom event *properly*.

### 8. Are the elements in `path` semi static, stale, or dynamic?

8. When the propagation path is calculated, you cannot later add new elements to the path (such as by inserting a new ancestor), nor remove elements from the propagation path (such as by moving the current target to another branch of the dom). This makes sense, this kind of move-during-event-propagation would be super confusing and could easily turn into infinite loops. But, at the same time, it causes the path to sometimes become a "stale" representation of the DOM, somewhat dynamic (updated anew for each event), but still static (if the DOM changes during propagation, this change doesn't affect which elements' listeners will be invoked).

### 9. Are the listeners on the `currentElement` static, stale, or dynamic?

9. The same problem with semi-stale dynamic ability applies to listeners per element. If you add another event listener to the currentTarget of an event, then that listener will not run on the same event. However, if you remove a later event listener on the same element for the same event, then that event listener will *not* run. This makes sense in practice, and rarely cause any problems, but it is still small-print-details that specify a series of special points in time, ie. when-path-is-calculated and when-listeners-on-an-element-is-gotten, that the developer should take into account when adding and removing event listeners during propagation, or (re)moving elements in the current propagation path.

### 10. Which `Event`s are there?

`Event`s are taboo. They are *completely* surrounded by silence. Take for example a simple question such as "which `events` *could* the browser dispatch on an `Element`? There is no such list? Why? Because different browsers don't all dispatch the same events? Ok.. But could I please get this information from the individual system my code is running on? No? Why not? ... Hello? Anybody here??

### 11. `Event` priority

I've heard rumors that the browser will prioritize and run some events before others. For example, I've heard that `setTimeout` are given low priority. Can somebody please *confirm* this for me? No? Is there really *no* information about the implied priority of tasks in the browser's event loop? Nothing?!

>> ### 12. Why so many different `Event` emitters?

>> Why so many systems for calllbacks? Why can't everything be events? Why can't everything in the DOM be events? Why does `WebSocket`s that has nothing to do with the DOM and *only* lives in JS land emit `Event` and `extends EventTarget`? While we need an `Observer` for reacting to an element coming into view or reacting to attributes changing? Why can't `WebSocket`s use a simple callback structure, while all things in the DOM use events? Why do we need so many different systems? In different places?

>> ### 13. `ErrorEvent`

>> What are the possible `error` events that I can catch in the event loop? Can somebody *please, please* give me an overview of the errors I can pick up via the event loop? `error` and `unhandledrejection`? And why could you not have added `error` in the `unhandledrejection` event name. I don't know how many times I have struggled to find that `error` event name..

There is an *utter* lack of information about the event loop. This not only leaves you guessing, but it makes you *question your questioning*. Am I doing something wrong when I have questions about native events? The effect of the *eventLoop taboo* is FUDing. Fear of sequence irregularities. Lingering Uncertainty after failed research into the topic. Doubting yourself for not finding any answers. And this FUDing is *completely inappropriate*. Simple facts about EXISTENCE and SEQUENCE of events is literally the metaphorical heart beat of the web run time! 😱 It is like JS trying to keep a secret if && or ?: comes first (which i always look up btw;) 

## Event loop mysteries



## Event loop model

## JS Loop vs DD Loop

## Error handling


Where can i see this priority between tasks? 

