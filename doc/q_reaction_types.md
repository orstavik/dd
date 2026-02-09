# Types of :reactions

List of different reaction types
1. filter (read => to break):
2. extraction (read => to oi output):
3. effect (write => DOM):
4. side-effect (write => outside of DOM):
5. transformer (pure reaction, only works with `oi` or `e`)
6. control (if-loop-goto)
7. Monad (move the position of `this`)

## filter and extractor

In essence filters is control reaction, an if, that will break a reaction chain if a condition is not met. Filters are also hybrids, as they read state, most often from the event `e` or a nearby source in the DOM. But, filters is such a common recurrence, that it is given its own name.

extractor reactions *read* data. They get state. From somewhere.

:extractor functionality is often included in a :filter. Use that state as part of filtering. Or as input to an effect.

DOM locations to extract data from:
1. The event `e`. But this extraction is often redundant as the event is the first argument to all reactions. So, extracting event info is often done directly in a :filter or :effect or :transformer.
2. DOM. Attribute values and text of preferably as close relatives as possible, or special global elements whose purpose is to store state. Like <meta elements. Wide searches in the dom should we try to avoid.

External locations to extract data from:
1. `fetch` a web resource.
2. Url / Location.
3. Cookies.
4. Local storage. Server resources.
5. Sensors.

## Dom-extractor.

Question: How do we get the *data* from the business logic into the custom reaction functions? We get only the `e` and the mystical `oi`, but i need something simple like a productId for adding an iten to a shoppinglist. How do i get that? 

Answer: you use/make an extractor, ie. a type of custom reaction whose job it is to extract data from the DOM or some other source.

## effects and mutator

mutator effect (write) reactions
In DOM.
1a. attribute toggle
1b. Css class toggle
.innerText
.innerHTML. aka HTMX.

Outside DOM
1. `fetch` a web resource.
2. Url / Location.
3. Cookies.
4. Local storage. Server resources.
5. Motors.


## :transformers

:transformers turn data from one form into another; :transformers *should be* pure functions. They *should* only read the `e` and/or `oi` as input, make no changes to input arguments, and only produce a new `oi` output. Transformers are often included in the :effects / :mutators. However, if you recognize that you successfully can pull out a chunky, reusable :transformer from one or more of your :effects, then that will likely lead to much clearer and better code.

## :control and :monad reactions

control reaction. returns a goto or a break. It is used to implement filters, if/else, loops, etc. :filters is a very common form of `if`-like :control reactions.

:monad reaction. returns a new object that will be the `this` for the next reaction in the chain. They move the origin of the reaction chain, not unlike the translocation that can take place when monads chain their function calls.


## rant about JSON

In the world of web development anno 2024, there is a strong common consensus that the application state should be in json and that html is only the application view. HTML is for layout only. State is json. You mix this view with a pattern like MVC for example, and M=>json, V=>html, C=>js. This consensus is not necessarily helpful. Most of the time, the HTML holds the state, as a redundant copy of the JSON. Or. The json is a redundant copy of the state in the DOM. There are problems here. Problems that are not necessarily easily solved by either following the consensus or breaking it. State. State management and redundancy can be really difficult issues to solve.
