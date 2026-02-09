# `AttrCustom`

DoubleDots implement a `class AttrCustom extends Attr`. All triggers *must be* subclasses `AttrCustom`.

## Implementation

```js
class AttrCustom extends Attr {

  get trigger() {
    this.#updateTriggerReactions();
    return this.trigger;
  }

  get reactions(){
    this.#updateTriggerReactions();
    return this.reactions;
  }

  isConnected(){
    return this.ownerElement.isConnected();
  }
  
  remove() {
    return this.ownerElement.removeAttribute(this.name);
  }

  getRootNode(...args) {
    return this.ownerElement?.getRootNode(...args);
  }

  #updateTriggerReactions(){
    const [trigger, ...reactions] = this.name.split(":");
    Object.defineProperties(this, {
      "trigger": {value: trigger, enumerable: true, configurable: false},
      "reactions": {value: reactions, enumerable: true, configurable: false},
    });
  }
}
```

`#updateTriggerReactions()` improves speed. It works by setting `.trigger` and `.reactions` on the object instance upon first request. The `.trigger` and `.reactions` properties are non-configurable as `.name` is non-configurable.