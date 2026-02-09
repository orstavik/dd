# Trigger: for native events

## 1. `click:` and other event listeners

All the native events are available as triggers in DoubleDots. The native events triggers come in 3 different forms:

**Normal**, element-event triggers such as `click:`. A `click:` is called when a `click` event bubbles up the DOM past the element/attribute. The `click:` in many ways resemble the old `onclick` event handlers.

**Global**, attribute-event triggers such as `click_g:` and `click_pg:` are `g`lobal listeners. The global triggers attach event listener on the main `document`/`window`. The `click_g:` triggers *before* the `click` event bubbles, and the `click_pg:` triggers *after* the `click` event has finished bubbling (and finished its default action).

**Local**, attribute-event triggers such as `click_l:` and `click_pl:` are `l`ocal listeners on the document root. The local triggers attach event listeners on the nearest `shadowRoot`, or `document`. `click_l:` triggers *before* bubbling; `click_pl:` triggers *after*.

Both **global** and **local** triggers are invoked in *random* order, not document-order. In practice, the sequence is commonly first registered, first called, but this can be changed depending on which implemententation of virtual event loop you are using.

## 2. Native event restrictions

### `window` only

Some events such as `beforeunload` and `online` are only dispatched on the `window`. If you try to add a normal or local trigger for such events will throw a `DoubleDotsSyntaxError` (ie. `online_:` and `:online_l` is not allowed).

### `document` only 

Some events such as `DOMContentLoaded` and `readystatechange` exists only on the main `document` and do not propagate past the `window` neither in capture or bubble phase. DoubleDots treat these events as if they were global only, same as `window` only events, but will under the hood attach the native event listener on the `document`. Technically speaking, you would be correct to label them `_l` for custom attributes added in the main document, but to keep things internally consistent in DoubleDots notation, they require the use of `_g` and will `throw` a `DoubleDotsSyntaxError` if they are added as `readystatechange_:` or `readystatechange_l:`.

### `composed: false` => local only

There is no technical way to identify which native event types are `composed: false` and thus in practice can *only* be triggered by *local* global triggers. If a native event is *always* `composed: false`, DoubleDots *could* throw a `DoubleDotsSyntaxError` for such events such as `toggle_g:` and `slotchange_pg:`. However, as there is no systematic way to achieve this, DoubleDots do not implement such as syntax check. This means that for example `slotchange_g:` will not throw an Error, but instead just never be triggered.

### `bubbles: false` => before bubbling only

The native events that do not bubble, do not accept *post-bubbling* triggers. This means that triggers such as `load_pl:` and `load_pg:` will simply never be called. DoubleDots *could* throw a `DoubleDotsSyntaxError` for such events (`mouseenter_pg:`). However, as there is no way to identify this systematically, DoubleDots does so far not implement such checks and will accept such ineffectual triggers being added to the DOM.

### `slotchange` matroschka

There is a bug with native `composed: false` events: they will propagate *down* into the shadowRoot of web components that slot in elements in the path. DoubleDots do not follow this practice. Non-composed events such as `slotchange` and `toggle` will *not* bubble past elements in slotting web components.

## 3. native event trigger sequence:

```
1. click_g
2. click_l, arbitrary sequence inside each document, but processed in groups of callbacks per document top=>down.
3. click
4. click_pl, arbitrary sequence inside each document, but processed in groups of callbacks per document bottom=>up.
5. click_pg 
```

Note. Sometimes, the post-local triggers *can* be called before bubbling. If a click hits an element inside a shadowRoot that doesn't have a regular `click:` trigger on one of the elements in the path, but *do*  have a post-local trigger `click_pl:` within its root node, and there is a normal `click:` trigger on an element in the path further up in a lightDom, then the `click_pl:` triggers on documents beneath the lowest most normal element target, will be run *before* bubbling.

## 4. How to filter global events for "local-only"

we don't really need it?

we add a filter `click:local-only` that will check that the `composedTarget === target`. We need the `composedTarget`, and this we  and the `target`. Do we need 


## 5. Implementation

```js
const register = {
  g: {"click": new WeakRefSet()},
  pg: {},
  l: {},
  pl: {},
}

function runEvents(type, path) {
  const g = path.last === window || path.last === document;
  const roots = path.filter(n => n instanceof ShadowRoot || n === document);
  itit  
}

class NativeEventTrigger extends AttrCustom {

  upgrade(type){
    Object.defineProperties(this, {
      type: { configurable: false, value: type },
      __l: { configurable: false, value: e => this.onEvent(e) }
    });
    DoubleDots.nativeMethods.addEventListener.call(this.__t, this.__l, true);
  }

  remove(){
    DoubleDots.nativeMethods.removeEventListener.call(this.__t, this.__l, true);
    super.remove();
  }

  onEvent(e) {
    if(!this.isConnected)
      return this.remove();
    e.stopImmediatePropagation();
    runEvents(this.type, e.composedPath());
  }
}

class GlobalLocalTrigger extends NativeEventTrigger {
  upgrade(type_mode) {
    const [type, mode] = type_mode.split("_");
    super.upgrade(type);
    register[mode][type].push(this);
  }

  remove(){
    register[mode][type].remove(this);
    super.remove();
  }
}

class NativeEventTrigger extends NativeEventTrigger {
  get __t() { return this.ownerElement; }
}

class WindowTrigger extends GlobalLocalTrigger {
  get __t() { return window; }
}

class DocumentTrigger extends NativeEventTrigger {
  get __t() { return document; }
}

class LocalTrigger extends NativeEventTrigger {
  get __t() { 
    const r = this.getRootNode();
    if(r === document)
      throw new DoubleDotsSyntaxError("Local triggers can only be used inside shadowRoots. In the main document, you must use ${this.type}_g or ${this.type}_pg.");
    return r;
  }
}

class NativeEventSyntaxErrorTrigger extends AttrCustom {
  upgrade(name){
    throw `${name} is only a document or window event, and so cannot be listened for on the element itself.`;
  }
}
```

They work differently. The upgrade will bind one of these versions to itself. And make an internal property. We can make it non-configurable. This checks isConnected and then removes the listener if garbage. The .remove() with super.remove() also removes the listener. No other removal is necessary.

The normal does a dispatch on the root target, the other does dispatch on the attribute. If we use capture non-capture, the only thing is the r after the bubble. We can skip this edge case for now. Let it fr happen before some bubbles in some rare instances.

## Discovering native events

Make the sif, make the list of types. Then, iterate the lists and add different rules.


## go through chapter 8 and take out what is needed from it. Examples.


## WeakRefSet