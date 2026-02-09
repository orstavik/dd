# The empty-trigger `:`

```html
<h1 :hello>sunshine</h1>
```

In normal HTML only `<img>`, `<iframe>`, `<script>`, and a few others gets a `load` event. This event is *heavy*: it doesn't bubble, but it still propagates in the DOM. In DoubleDots however, *all elements* gets a ligthweight, attribute load-event: the empty-trigger `:`. You can think of it as all elements getting element specific `onload` attributes.

These are the rules for the empty load-trigger `:`:
1. The empty-trigger `:` dispatches an attribute event with an empty `type=""`. As an attribute event, the empty-event *only* triggers its own reaction chain; it doesn't propagate.
2. When the empty-trigger `:` reaction chain is written in the template when the element is created, then the empty-event is added to the virtual event loop immediately after element creation.
3. If you add a reaction chain with the empty-trigger using `setAttribute()`, then the empty-event is added to the virtual event loop *immediately*, inside the `setAttribute()` method.
4. The empty-trigger `:` is only triggered *once*. 

Whenever you wish to *call a reaction* when the element has just been created, or immediately, all you do is add a reaction chain with an empty-trigger.

## 1. Example: `:import:define`

The empty-trigger is often used to add reactions meant to augment the element when it is created. Examples of such augmentation can be to populate its content, style it, start a state machine, or even import that custom element's definition.

```html
<web-comp :import:define="WebComp.js">Hello web-comp</web-comp>
```

In the example above, we want to import and define a web component at the same time as we add it to the DOM. We do this by adding the empty-trigger which is queued at the same time the element is created. We then import a web component definition from a url, and this definition is then defined (for the current element).

## 2. `:` race conditions: problems with `:import:define`

It would be nice if life were as simple as above. But life is slightly more complex than this. 

1. The `:import:define` reaction chain above is *sync*. It will block the event loop. You must therefore at least do: `::import:define` which allows the browser to *thread* the reaction so the `:import` doesn't need to block all others.
2. The `:import` and `:define` can often included with your distribution, but you might have opted for a barebones DoubleDots version, and then you need to ensure that you do not run the reaction chain until *all* reactions are loaded, defined, and ready. To do that, you would add the `:r` reaction: `::r:import:define`.
3. Inside a `shadowRoot` you *cannot* use template based `:import:define` for reactions, rules, and triggers. Sorry. In `shadowRoot` context, you *must* define reactions, rules, and triggers from JS *after* the call `attachShadow` and *before* the HTML template is added to the shadowRoot.

```html
<web-comp ::r:import:define="WebComp.js">Hello web-comp</web-comp>
```

Because the `:import` and `:define` reactions might not be ready at the time of initialization, triggering the reaction chain *immidiatly* might be unfulfillable. If triggered *before* both `:import` and `:define` have been registered, teh event loop will come up empty-handed looking for them. When that happens, the event loop fails, `throw` an `ReactionNotFoundError`, and quits the reaction chain. As `:` empty-trigger is only triggered *once*, that is a problem. So what we most likely *mean* when we think *immediately*, is *asap*: as soon as the custom reactions in the chain are ready, then do reactions.

### `::r:reaction`

You should think of the empty-trigger as being used *with* the `:r` reaction by default. If in doubt, do `::r:hello:sunshine` and *not* `:hello:sunshine`.

The `:r` reaction is *always* included. It is one of the very few builtin DoubleDots reactions. For more on the `:r` reaction, see the chapter on schedulers.


## 3. `:`, `.connectedCallback()`, and others

When added with the template, the `:` is timed *more or less* like the `.connectedCallback()`. And as DoubleDots prohibits elements from be added to the DOM more than once, *both* will be called only *once* per element. However, the `connectedCallback()` is a callback used from within the shadowDom; the `:` is used from the lightDom. And the `.connectedCallback()` only applies to web components, while the `:` applies to all elements.

When added with the template, the `:` is timed *more or less* like the `.enter()` in React. If React *also* had prohibited elements from be added to the DOM more than once, as DoubleDots do, `enter()`  would also have been called only *once* per element. And, as `connectedCallback()`, the `enter()` callback is used from within the React component (the shadow), while the `:` is used from the lightDom. `enter()` is also therefore only applicable to React components, while `:` can be applied to all elements.
