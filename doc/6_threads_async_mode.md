# Threads and async mode `::`

The ability to run functions such as network requests in the background without causing the entire functionality of the browser to freeze, is great. In JS anno 2024, this is done via `async function` s. `async functions` essentially start a thread that it will run in, so that the browser can continue performing other tasks.

## 1. Problem: Async race condition

To illustrate the problem with the threaded nature of JS, let us take a look at an example. 

```html
<web-comp click:call_web-comp_method>
  <div click:load:define_web-comp="WebComp.js">hello race</div>
</web-comp>
```
//todo convert the :reaction into `onclick`.

We imagine that we have a `<web-comp>` that we only load and define the definition of when we `click` on one of its child nodes. Also, when the `<web-comp>` is `click`ed, there will be a reaction run that rely on one of the methods of that web component. Now:

1. We *know* that the event listener that loads and defines the web component inside the web component is run *before* the event listener on the event listener that rely on this definition.
2. We also *know* that the event listener that loads the WebComp runs inside an async event listener function, so there will be no problem with the loading and defining function causing the browser to freeze.
3. So. Everything should be fine. The `:call_web-comp_method` is triggered after the `:define_web-comp` listener, ensuring that the definition is loaded before it is used. And the `async`ability will ensure that the browser doesn't freeze while loading the network resource.

Not quite. Many of you will probably have already seen the problem. Because the `:load:define_web-comp` listener is async, it will be threaded. This happens as soon as the browser encounters its first `await` (even when that `await` does not need to wait for a `Promise`). And this means that the event loop will spawn a micro task for the first event listener `:load:define_web-comp`, and hurry onwards to the next event listener *before* the resource has been loaded and defined. So. When the second listener is started, the definition of the `<web-comp>` has not yet been loaded, and `:call_web-comp_method` will fail. It is a race condition. Caused by a misunderstanding of the threaded nature of async event listeners. So. The event loop only fains single-threadedness. It isn't really.

## 2. The *sync* virtual event loop

At its core, the virtual event loop is *sync*. This means that any custom reaction will be completed *before* the any other custom reaction is run. Yes, you heard right! You *can* halt *all* execution of custom reactions if you need to wait for a `Promise` inside a custom reaction. You can force the browser to freeze and wait for something, when and if you really want.

```html
<web-comp click:call_web-comp_method>
  <div click:load:define_web-comp="WebComp.js">hello race</div>
</web-comp>
```

If you did this, then the event loop would essentially *halt* all its other operations while waiting for `:load` to complete, thus ensuring that `:call_web-comp_method` would not be triggered until the definition was ready.

## 3. The *async*, threaded virtual event loop `::`

But, at its fringes, the virtual event loop is also *async*. If you add the empty reaction `::` in your reaction chain, then the event loop will *not* pause and wait for any `Promise`s in the rest of that reaction chain, but allow the rest of that reaction chain to be run in a thread.

The empty reaction looks like a double colon prefix: `::load`. Essentially the double colon says that if the virtual event loop encounters a `Promise` *after* the `::`, then it will not halt the progression of the event loop, but instead create a thread that the rest of this reaction chain can run in. Between events, the virtual event loop will process and complete these loose threads.

This means that we in Doubledots would do the following:

```html
<web-comp click::known-element:call_web-comp_method>
  <div click::load:define_web-comp="WebComp.js">hello race</div>
</web-comp>
```

Here we are add `::` before `::load` and a new `::known-element` reaction. This means that the `::load:define_web-comp` reaction will run in parallel with the event loop. At the same time, the `::known-element:call_web-comp_method` will also run in a thread. This second thread will for example poll to check if the `<web-comp>` has been given a definition yet, or not.

## Why `::`?

The ability to see *when* event listeners run in sync and async mode is *extremely* beneficial.

The ability to *force* the event loop and execution to wait for a system critical resource is also *very nice*, when you need it.

Furthermore, having the event loop work this way enables tooling to with great clarity illustrate what threads are active when and why. And when these threads resolve. You can imagine it as follows:
1. the event loop as a stack of cards. 
2. Each event is a card. Everything that happens is an event. And each event has finished propagating before the next one runs.
3. For each event, you have a numbered list of reactionchains.
4. Each reactionchain is split in `:`-separated reactions.

Furthermore, to make it easier to read:
5. Every completed reaction that has completed is highlighted in green.
6. Every failing reaction that throws an `Error` is highlighted in red.
7. Every post-fail reaction in the same reaction chain as a failed reaction is highlighted in orange.
8. Every non-run reaction that is not run because a previous reaction returned `customReactions.break` is highlighted in grey.

And then, the really good stuff:
9. Every reaction that is started as a thread, ie. a reaction after `::` that returns a promise and that the browser has spawned into a thread is marked darkblue.
10. Once the darkblue reaction resolves, the reaction is marked with light blue.

This means that at any time, you can look at all the cards in the loop and see:
* what threads are currently active? all the lightblue reactions.
* what are the reactions that will follow these reactions? All the non-highlighted reactions that follow the reaction.
* Race condition? Yes, please, 'cause I want to see(!!) them:D