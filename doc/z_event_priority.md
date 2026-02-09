# Event priority

## Is life too boring? Nuke the moon!

Over time, the native event loop has become stratified. At the beginning there was a single planet (the planet being the DOM) and a single moon orbiting that planet (the moon being event(s) and the orbit the event loop). Then. Somebody decided that it might be a good idea to nuke the moon. Twice! Boom! Boom! And what was before a very tidy thing: one moon in orbit around a planet, became something completely different: one broken-ass moon orbiting that same planet, but now with a myriad of smaller fragments orbit the moon, in different tempo and bumping into each other. Each of these small fragments of course being micro tasks, `Promise` async threadbits, and custom events being run nestedly.

Ok. So the picture isn't as orderly as it once was. The event loop, which before was this nice single threaded single moon orbiting that planet, is now like a clusterf..k of shrapnel hurtling around the earth and each other just waiting to perforate anything that is sent their way. Isj.. Not good.

But. Why? Why on earth would somebody do that? Nuke the moon, what were they thinking?! Why?? 

There were not *one* reason, but *two*. Or, most people say it was one reason. But from the viewpoint of the virtual event loop, I think there are two good reasons for it, and so I list those.

1. asyncability: letting the main application function while waiting for async operations such as network requests run in the background.
2. event priority: letting some events get higher priority while pausing less frequent events.

Asyncability has been talked about before. Enough. So I will just say that the ability to "step into async, thread mode" is good. Doubledots support it, both in a literal and principal sense. But event priority is less understood. Another one of the "domain of the browser developers". So we need to talk a little bit about it here.

## Event priority

1. Custom events.

When the ability to dispatch your own custom events arose in the browser, they decided that such events should be given top priority. If the web developer decided that something was worth being dispatched as an event, then that event should come first in line. Actually, it was given such priority that it would run even before the current event was finished. Nestedly. 

Personally, I think that was the wrong choice. Custom, developer made events could have been added first in the event loop. If you during a `click` event `.dispatchEvent(myCustomAlert)`, you could let the all the `click` event listeners finish first, and then process the `myCustomAlert` listeners. But ok. Nuke it!

2. Micro tasks.

A `MutationObserver` registers callback functions that are to run after a change in the DOM occurs. `MutationObserver` callbacks are *intended* to be "micro tasks": small automatic operations such as adding or removing a css class to an element depending on a certain DOM make up.

If these functions lag, then small changes that only update the view to make it align with the state of the application will lag. And so, it was decided that these changes should all be updated before the next event "macro macro task" be let loose. Can we build it? Yes! Yes we can!

It is important to note, that the micro tasks essentially are non-propagating tasks that instead of being put in a different queue (micro task queue), could have been just considered top-priority events, where each event only triggers a single callback (no propagation). But. That would have been plain vanilla. Too easy to spec and build.

3. `setTimeout(callback, 0is4)`

In the other end of the scale, we find events that should be deprioritized. `setTimeout` is one of them. Since these callbacks are functions that the developers actively mark as "something that can wait", the browser should let other events sneak past it in the event loop. Sure. That is nice.

But. Due to the wild wild nature of the web, the moon nuking engineers also found that the web at a certain point in time worked better if `setTimeout(.., 0)` actually meant `setTimeout(.., 4)`. This is just another example of how the browsers control the priority of events behind the scenes.

### Virtual event loop priority

So. When we now create a virtual event loop, we can control now explicitly control the priority of events. Wee can say that we want events to be processed in the following tiers. Thus, even though mutation observers are added to the virtual event loop, we can still specify that we want them to sneak before some other events, but not others.

And, we also need to specify that started, threaded reactions that are ready to continue, should continue before the next event is dispatched in the virtual event loop.

The event loop tiers should look something like this:
1. targetedMutationObservers
1. low level, high priority system events (element-created, most likely targeting a framework/foundational code.)
2. errors (`error` to be handled early) (ok, you are just going to log it, and that you could do dead last, but you might have done some correcting actions, and those would have been good to do early.)
2. custom events (`my-data-update`)
3. ui events (`click` etc.)
3. system events (`readystatechange`)
4. rafs (you can wait just a little)
4. timeouts (you can wait for a long time)

There are other problems too. Some events run as a single macro task (less important ones, todo find an example again); some events run each event listener as a macro task (`click`). This means that some events process micro tasks such as MutationObservers in between event listeners, and some don't. We can think of these `click` event listeners as... a meso task? Something in between a micro and macro task. But this level, I believe is folly. No one (in the sense of faaar below 1% of developers) will either know or intuit such behavior. But. If you are still bored, it is fireworks to be had watching that nuke do its thing on the moon.