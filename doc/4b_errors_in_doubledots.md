# `Error`s in DoubleDots

DoubleDots is *not* an imperative programming language. It is declarative language.

## `error` events

DoubleDots handle errors by dispatching `events`. But. Dispatching events are costly. So, how does this effect the design of error management in DoubleDots?

**Design-time errors** are errors you can *fix design-time*. For these errors, *memory and compute cost* is *not* an issue. The main problem with these errors is to **hightlight** them enough, so that they are *caught design-time* and thus can be fixed in time. But. `error` events are easy to identify, print to console as `Error` messages. So, here `error` events fit well.

**Critical run-time errors** are errors you cannot *fix design-time*. Critical errors mean that they threaten the functioning of the app, or the validity of data, or something else that is critical. Critical means that the user and/or the developer *should be* notified.

To notify the user is super costly. To notify the user of a critical error require producing an error message where the **user can see it** (ie. **not** the `console.error`. `console.error` is only for design-time errors, it means nothing in user-land nor run-time-developer-land). Compared to the cost of mutating the DOM (in resources), then dispatching an `error` via the event loop is *low*. Also, the simplicity of `error` events in the event loop enables simpler structures *for showing the user critical errors*, thus lowering the bar for such errors to actually be shown.

To notify the developer about errors is super costly. It both takes a lot of resources, network requests, server-reads and logging etc. These "logging on server costs" dwarfs the cost of `error` events in the event loop. Furthermore, logging run-time errors on the server is very complex. It is one of the more problematic technical tasks of apps. Therefore often skipped. The simplicity of `error` events in the event loop again enables more than it disables in this case.

**Non critical run-time errors** are errors that don't really require notifying the user nor the developer about run-time. They are only relevant for adding the `console.error` for the developer when he/she test-runs his system.

## `warn` events

1. alert the user of something causing the program to misbehave. So the user knows something is wrong, doesn't just get confused.
2. alert the developer of something wrong run-time. logging on the server. These errors should cause a reaction either in bugfixing or follow on the user using the app.

1 and 2 require an `error` event because we need to side-effect to the visible dom or to network logging. This cannot happen in client-side console.log, because this is not visible to user nor developer.

3. alert developer of something wrong during development. This can be console.logged, but should likely also be an `error` event, because they are difficult to say for certain will not suddenly occcur run-time.

If the error is neither 1,2,3, then we can do console.log. But then it is also likely to just be something to squash.

But. Warn. We might want to have errors that should warn, and errors that should alert. This can be used to have a select test user (or say random()/100 of users send warnings to server. This will enable serious errors to always be logged, while not so serious errors can be sampled. For perfection.)

## What types of errors occur in DoubleDots? 

DoubleDots produce errors in *two* situations:
1. When an illegal attribute is added to the DOM. `DoubleDots.SyntaxError`s.
2. when a reaction fails due to problems in the code.

3. This is no longer true. The iteration will just ignore a reaction if the attribute(or owner element) is no longer connected to the DOM.
4. Are there other scenarios?

### 1. Adding illegal attributes

There are some syntactic rules for what attributes should look like. Here is a **blacklist** of illegal reactionChain constructs (in `RegExp`):

1. `:$` => Attributes cannot end with `:`. Attributes *can* end with `:catch` as this will prevent the the error event from being dispatched.
2. `^[\.-]` => Attributes cannot begin with `.` or `-`. Many browsers do not allow it. The same rule is added to definition of triggers:.
3. `:::` => Attribute cannot contain a double empty.
4. `::*::` => Attribute cannot contain a two empties.

### 2. the reaction js functions `throw`s

A network request fails. Commonly, these sitaution threaten the sequentiality of the app state and/or the validity of data. They need to either be explicitly managed, or otherwise handled.

## the builtin `:catch` reaction rule

DoubleDots provide builtin reaction `:catch` to handle errors. `:catch` handle run-time reaction errors only, of course. If there is a `:catch`, then there was an implied `:try`. You can also `:catch` an error thrown in another `:catch` => `:throw_a:catch_a:throw_b:catch_b`. If you have a `:catch` at the end of the reaction chain, then that will simply cause the `error` not to be thrown.

You can specify the error type to be captured. This will `:catch_-syntax-error` will only capture `SyntaxError` errors. `:catch` catches everything.

Errors caught will not produce error messages nor error events. They will only leave an error trace in eventloop register.

`:do-something:catch:do-something-else:catch:this-is-run-finally`.

## List of `error`s

add number for dates and versions.