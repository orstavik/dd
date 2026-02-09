# Default actions

First. You have heard the term many times. "Default actions". You know that the default action of a `click` on a link is to open that web page. Second. You know that you can stop them by calling `e.preventDefault()`. So you can stop the opening of web pages. And maybe you have even stopped the opening of the context menu by calling `e.preventDefault()` on the `contextmenu` event. PopQuiz: do you know if there is a `click` event for a `rightclick` mouse button? Or is a rightclick event *only* followed by a `contextmenu` event? Confused yet?

My point with this little introduction/digression was to illustrate the vagueness that surrounds the concept of default actions. You are not alone in feeling wobly when talking about default actions. And I am here to comfort you:) Because it is not you; it is them! Default actions are poorly documented. They are in the so-called "domain of the browser developers". That means that in principle the browsers developers could attach their own, and it would be fine with the agreed upon "rules of the web". But of course the world doesn't work like that. So what the "domain of the browser developers" mean is that the browser developers can do them slightly different if they want to/have to, and that they therefore don't need to document them. How can you do a `rightclick` on a mac that has only one mouse button?

## Default actions in the virtual event loop

A default action in the virtual event loop is *one* function that will be run *immediately after* an element event has finished bubbling. It is a **post-propagation** callback.

In the virtual event loop, you can add and remove a default action continuously. This means that you can *add* a default action A, then *prevent* the default action, then *add* a new default action B. It creates a **default action list**: `[A, -, B]`.

The default action list enables the developer to read the event loop at different times and recognize what default actions commands where given for any event. This list also enables the developer to re-add a default action after `:prevent-da` has been called.

The default action list is slightly more complex than illustrated above, because it also keeps track about in *which* document the default action command was made. This means that default action commands in *lower*, slotting web components will *loose* to default action commands made in a higher up lightDom.

When the virtual event loop finishes bubbling the event, it will process the default action list in the following manner:
1. `pop()` the **last default action** from the default action list.
2. run through the rest of the default action list and mark the actions as `prevented`.
3. run the last default action.

## Default action reactions

The virtual event loop has three different custom reactions to control default actions.

1. `::da`
2. `:prevent-da`
3. `:nda`

### `:da`

You can add your own a default actions by using the `::da` custom reaction. The `::da` must always be preceded by `::`. This is because it is an async that will not continue until the sync event loop has finished the propagation of the event.

You can add `:da` multiple times. It is *only* the *last default action* from the *top-most* document, that will run.

### `:prevent-da` and `e.preventDefault()`

To stop the default action, you can use the `:prevent-da` custom reaction. You can also call `e.preventDefault()` inside one of your own custom reactions.

> Rule of thumb: the `:prevent-da` should be positioned before the `::` async-/thread-mode marker. It makes sense if you think about it. Or read the chapter about `::` async/thread mode.

There is something important to note about default actions. The `:prevent-da` cannot prevent a default action added in document above. Ie. if `:prevent-da` is called from a shadowDom, that will not be able to block a default action added on a child element in the lightDom.

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

If the default action commands from all the documents were equal, then the `<web-comp>` would cancel the default action in the document above. This type of behavior is too hidden. Cloaked. Sneaky. So, in the virtual event loop, default actions are sorted in the hierarchy they are added.

### `:nda` Native Default Action

By default, native default actions run as normal. However, like your custom `::da`, you can *re-enable* the native default action even after a custom reaction has been added or `:prevent-da` has been called. This enables you to override any `e.preventDefault()` calls taking place inside a shadowDom.

To re-enable the native default action, a special `:nda` reaction is called. `:nda` *must end* the reaction chain. This reaction can run sync; it doesn't have to run  after `::` in async mode.

> `:nda` stands for "native default action", but it is also a reminder that the inner workings of the native default actions are as hidden and magical to us  regular developers as if they were sealed behind an Non-Disclosure Agreement.

### `:nda` example

```html
<a href="bbc.com" click:is_active:nda>
  <web-comp>
    hello sunshine
  </web-comp>
</a>
```
Even if a custom reaction inside `<web-comp>` called `.preventDefault()`, the browser would still run the native default action on the event.

>> There is a problem with timing of native default actions. If a native event has native default actions, then a macro-task break should occur in the virtual event loop *before* the next event is processed. This break will enable the browser to correctly time the native default action. This break can be achieved by adding a `nextTick` (using ratechange) at the end of the event loop cycle when `:nda` is encountered.

## Note on implementation

```js
customReactions.define("da", function(e,i){
  const daDelayer = new Promise();
  e.customDefault(daDelayer);
  return daDelayer;
});
```

When the virtual event loop processes the default action list, it will `promis.resolve(oi)` on the chosen default action, and `promise.resolve(customReactions.break)` on all the default actions that were prevented or not resolved.

### `Event` implementation

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
