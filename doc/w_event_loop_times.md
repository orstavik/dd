# Event loop times

## 1. queue-time

At **queue-time** the `event` and the `target` is added to the event loop queue as a coming task. If the event loop is currently empty (nothing is going on), then the task is run immediately. If the event loop is busy doing something else, the task waits in the queue. These per-event tasks in the event loop are called macro-tasks in HTML.

In DoubleDots all callbacks are queued as such event/macro-tasks. In DoubleDots you can think of queue-time as when `dispatchEvent()` is called. In native HTML it is much more confusing, see other chapter.

## 2. propagate-time

At **propagate-time** the `composedPath` is calculated.

Below is an example in native HTML/js that illustrate this behavior. A non-cancellable default action of two fast `click`s is to queue a `dblclick` event. And the cancellable default action of a `click` on a `<summary>` is to toggle the `[open]` attribute on the `<details>` parent. *When* the `[open]` attribute is changed, this queues another native event `toggle` in the eventLoop. *Both* the `dblclick` and the `toggle` event tasks are queued during the `click` event. And when we *move* the `target` during the `dblclick` event, then we see that the `composedPath()` has changed when the `toggle` event runs. This illustrates that the `composedPath()` is calculated at start-propagation-time, not queue-time.

```html
<details>
  <summary>dblclick me</summary>
  hello sunshine
</details>

<script>
  const el = document.querySelector("details");
  el.addEventListener("click", e => console.log(e.type, e.composedPath()));
  el.addEventListener("dblclick", e => el.remove());
  el.addEventListener("dblclick", e => console.log(el.hasAttribute("open")));
  el.addEventListener("dblclick", e => console.log(e.type, e.composedPath()));
  el.addEventListener("toggle", e => console.log(e.type, e.composedPath()));
</script>
```

Outputs:

```
click    [summary, details, body, html, document, Window]
toggle   [details, body, html, document, Window]
click    [summary, details, body, html, document, Window]
dblclick [summary, details, body, html, document, Window]
toggle   [details]
```

The `composedPath` is a list of all the ancestor nodes beginning with the `target`. The `composePath` can be restricted to the document (`composed: false`) or go past `shadowRoot` boundaries both *down* into slotting shadowDoms and *up* into ancestor lightDoms.

## 3. next-attribute

During propagation, each step is to locate the next attribute ready for propagation. Whenever we search an element, the list of matching attributes are frozen at first request.

## 4. run-reaction-chain

When the first reaction on a matching attribute is run, the `attr` is passed in as reaction `origin` and the `event` as the `input`.

## 5. run-reaction

1. If the attribute is `!.isConnected`, then stop the reaction chain. Without `error`.
2. process builtin reactions `::try:catch:finally`.
2. If no function definition matches the reaction name, then stop the reaction chain. With a `DoubleDotsReactionError`.
3. call reaction function with the `origin` and the `input`. 
4. if the reaction `throw`s, then stop the reaction chain. With a `DoubleDotsReactionError`.
5. if the reaction `return`s a new `ReactionOrigin` or `ReactionJump`, update the `MicroTask` state.
6. if the reaction `return`s a promise, 
  1. in sync mode: stop the reaction, while waiting for the promise. handle promise resolve/catch, then restart the loop once promise is handled.
  2. in async thread mode: continue the loop, while waiting for the promise. handle promies resolve/catch, then continue the `MicroTask` process.

## 6. Reactions stop on `isConnected === false`.

In DoubleDots all elements and attributes are *immediately* considered *garbage* when they are disconnected from the DOM. This means that DoubleDots can and should stop any reaction from running when either the custom attribute or the owner element of that custom attribute becomes `.isConnected === false`.

Before all `:reactions` are invoked, `.isConnected` is checked. This must happen before all reactions as each previous reaction can have removed either the element or the attribute from the DOM.

When reaction chains are cancelled, no `error` should be dispatched.

When reaction chains are aborted because a previous reaction has removed either the `element` or the `attribute`, and still more reactions remain, then this should come as a surprise and should throw an `error`. Todo implement this error.
