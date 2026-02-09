## Todo

1. Short list of deprecated functions
2. Short list of monkey-patched functions
3. short list of API functions

## Demos

Assumed easy:
A. Calculator

B. Htmx

* Redux. The act of having _global listeners where the event is global, needs to be filtered for relevance, and then should enact a reaction on an element in the dom. So the event listeners should be associated with the "place" in the state where the effect will occur, not associated with the element where the state change/event is triggered.

C. `_first-interactive:` event. `_ready:` event. etc. These events are generated as statemachines. Most often we want the chain that follows to run async, as a thread: `_ready::then-something`. Similar to dcl events. Global  statemachines should be added to one of the top elements: `<html :first-interactivable>`, or `<head :my-kind-of-ready>`.

D. `:`, `:wait-for-it::` reactions. onLoad reactions that wait for all  the definitions to be loaded before it runs.


Assumed hard:

* Json to template. React. Template engines. This is probably the main JS task in the web. I can imagine that somewhere between 25-50% of all js code on the web is written to tackle this task. The state data coming from the server ALWAYS needs to be massaged. You want it not to, ref HTMX, but you end up doing it still. What type of function that you want, what format coming in, and how you want that format to be made into HTML, that is something that needs to be written. But. If you have a declarative template language like handlebars, hyperHTML or something similar, then you can add those functions as reactions easily in the dom. The problem is where to put the html template code, but that is always a problem.

B. Stateful gestures

C. Stateful functions

D. Chained reactions where more than one reaction needs the attr value.

Questions


A. Can we combine filters ?
