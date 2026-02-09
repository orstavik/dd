# Choosing the location of reaction chains

>> "DOM accessor" is the mechanism a DOM node is found by.

Many reaction chains involve several elements. The trigger event for the reaction chain occurs on one element; then the reaction chain needs to extract data and filter the event based on a second and/or third element; and then finally the reaction chain aim to effect a change in the DOM on yet a forth or fifth element. But which of these elements should the trigger and custom reaction chain be added to?
Always the trigger element? Always the lowest, shared ancestor? Are all solutions equal?

Once you get into writing DoubleDots reactions, you quite quickly get a feel for how best to do this. But there are universal rules to follow, that are more concrete than one might think. The concept of these rules is to minimize the "cost" of the reaction chain, for all reactions, and taking all the involved nodes into account. And below are the rules of thumb that help us do that.

## 1. Use local DOM accessors (not global)

Reactions should use **local** DOM accessors, not global DOM accessors. An example of a "local DOM accessor" is `this.ownerElement`. We are starting with an `Attr` node (whose location is the locale), and then going one step to the parent DOM node, the `.ownerElement`. And example of a "global DOM accessor" is `document.body` and `document.querySelector("#super-local-id")`. These accessors find the element using the *global* `document`, even though we inside the `querySelector()` rely on a highly specific, assumed unique semantic selector.

We use the DOM accessors to find nodes that we wish a.o. extract data from or effect change to. If the accessors these reactions use are local, the reactions will be:
1. safer (less chance of another element suddenly being given the same `#product-id` by accident),
2. portable (you can use the same reaction to identical usecases such as a sequence of list items, recurrent DOM branch structures, etc.),
3. reusable (the reaction becomes a generic mechanism you can reuse in multiple locations and apps for related, but not identical usecases, e.g. toggle an attribute on a parentNode),
4. modular and encapsulated (the boundaries of the local accessors form a small compartment, and the nodes and accessor bindings within this compartment resemble modules).

`e.target` *can be* both a *global* and *local* accessor, depending on the location of the trigger and target. If the trigger element is (near) a leaf node in its document context, then the `e.target` can be considered local because the `e.target` *must* be near by. However, if the trigger is far above, then `e.target` is *global*. For example:

```html
<body click:reaction1_on_e.target>
  ...a wast big DOM with lots of clickables...
  <div click:reaction2_on_e.target>
    <img />
    <h4>subtitle</h4>
  </div>
  ...more wast DOM...
</body>
```

In the example above, `e.target` for `:reaction1` would be global. It would capture lots of varied `click` events that could almost anything. However, in `:reaction2` `e.target` would be local. `:reaction2` would know the `click` came from one of two elements (`<img>`/`<h4>`), could easily filter the event and assume a lot about the context and "meaning" of the `click` event.

## 2. Use generic DOM accessors (not semantic)

Reactions should use generic DOM accessors, not semantic DOM accessors. An example of a "generic DOM accessor" is `this.ownerElement`, `.parentNode`, `.previousSiblingElement`, and `.firstChildElement`. An exaple of a "semantic DOM accessor" is `this.querySelector("input[type='radiobutton']")` or `if (this.parentNode.tagName === "DETAILS")`

Generic DOM accessors are:
1. less redundant (if we change the name of a CSS class, the type of an element, we would not need to go into the code of the reactions to update similar semantic names used there), 
2. portable, and
3. reusable.

For semantic DOM accessors, we can 1) separate between static and dynamic semantics, and 2) measure ambiguity of the semantic reference:
1. the `type` of an element is very static. The type remains fixed while an element is in the DOM.
2. attribute names and css class names are semi-static. You can add and remove them, but you are not meant to change them.
3. attribute value and element text are dynamic. You should expect them to change.

Ambiguity is harder to quantify. If your app is suffers from "divities", the `<div>` element `.tagName` gives you little but ambiguity. However, if you only have a single `<main>` or use `<h4>` only for a specific purpose, then the `.tagName` is distinctive. These same judgments apply to other semantic markers. And the scope of the interpretation also becomes critical, hence the importance of local, not global accessors.

## 3. Calculate reactionchain cost

This is not an exact equation, but it can easily give you some idea about which element you would like to place your triggers and reaction chains.

1. Find all the "involved elements" that are involved in your trigger:reaction-chain.
2. Find shortest local, generic path between the involved elements (e.g. `.parentNode`, `.nextSiblingElement`, `.firstChildElement`, and similar).
3. Find one step local, semantic paths between the elements (e.g.`.children[X]`, `this.querySelector(":root > input")`, `.parentNode.tagName === "DETAILS"`).
4. Find multi-step local, semantic paths between the elements (e.g. "nearest `<form>` ancestor", "descendant with css class `.check-it-out`").
5. Global, semantic accessors.

For each likely candidate position, you try to set up an equation that produce the minimal output when: 
1. the element itself has value 0.
2. local, generic paths have weight 1,2,4,8 per step,
However, the `.parentNode` is better than `.firstChild` which in turn is better than `.nextSiblingElement`.
3. semantic paths have weight 2,4,8,16 per step. Here we are considering `this.querySelector("descendant")` and a similar ancestor search query. A single step semantic path would be: `this.querySelector(":root > childSelection")` and `.parentNode.matches(parentSelection)`. 
4. global, semantic accessors have weight 10.
5. don't know how to fully quantify the cost of `e.target`. It is more than 1. and 2. similar to 3?

For a candidate reaction chain location, you can then summarize a single location "cost". You can then multiply this cost with the number of elements that you need to attach this listener to (capped at 100).

If the candidate element is also heavily overloaded with lots of other reactionchains, then add 1,2,3,4,5.. for every other reaction on that element.

And, when comparing two otherwise equal candidate elements, the candidate *nearest* the `e.target` *always* wins. 

You likely will never do any such calculation, of course. But seeing the "idea" of how to do this can help you see that:
1. selecting the `.parentNode` and use its `.nextSiblingElement` is better than,
2. selecting the `.parentNode.parentNode` and use its `.lastChild`.
3. Both use only local, generic accessors, but the second option has a double step and is also higher in the DOM.


## Example of what to avoid

11. Uncles? Cousins? hm.. Maybe outside of the circle of trust?
https://www.youtube.com/watch?v=QHJGoZpFeM8
12. Search from the `document` or `body`. This is not a short link. Try to keep things in the family. `document.querySelector("cannot-find-family[is]:not(.in.phone-book)")` 


8. The 4.5th shortest line is to a direct ancestor clearly marked by type, attribute or css class. An example is to find the first ancestor that is a `<form>` or `[open]`. However, there is no equivalent to `.querySelector()` for searching up the ancestor chain. This makes lines to direct ancestors feel longer than descendants. They are not easy to write in code. However, they are very simple. An ancestor is a straight singular line. Ancestor queries are simple, just not easy (cf. Rich Hickey). So, don't let the lack of ease in making the code for the connection deter you from making reactions that rely on them.

### Radio buttons pattern

Radio buttons is an example pattern. It is not the best pattern. Rarely used elsewhere, and for a reason. So try not to build lots of radio-button-patterns into your code. However, if you must, use the element type that is the shared ancestor as the location for you reaction chains, and then query descendants by type and attribute (cf. `<form>.querySelector('input[type="radiobutton"]')`). This approach also enables you to add only a single `click:` reaction on the `<form>` instead of adding a `click:` reaction to each and every `<input type=radiobutton>`.

* When children? When we have an event, that bubbles naturally, then it is easy to append a listener on the ancestor ).

