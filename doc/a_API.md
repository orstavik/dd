# API of DoubleDots

## MonkeyPatched

### Partially deprecated JS methods

## `setTimeout`/`setInterval`

`setTimeout` and `setInterval` are deprecated. And so is `clearTimeout` and `clearInterval`. They are all replaced by a single `async` function `sleep(ms)` added to `window`.

The reason `setTimeout` (and `setInterval`) are deprecated is: 
1. When a callback is sent to `setTimeout`, the browser will run the callback in a new, separate frame (macro task).
2. This macro-task is not simple for the virtual event loop to intercept.
3. But if we instead `await sleep(10)` inside a `trigger:` or a `:reaction`, then the virtual event loop can control this async behavior in the same way as all the other async functions in the browser.

### How to implement `setInterval` using `await sleep()`?

To implement `setinterval` using `await sleep()`, you make your own custom `for` or `while` loop around the delayed callback code. Here is an example:

```js
function doAtRegularInterval(){
  console.log("hello sunshine");
}

setInterval(doAtRegularInterval, 1000); //old way, deprecated

async function myReaction() {//new way
  //...
  while (true) {
    await sleept(1000);
    doAtRegularInterval();
  }
  //...
}
```

### The `sleep`/`setTimeout` monkey-patch

```js
(function(setTimeoutOG, setIntervalOG, clearTimeoutOG, clearIntervalOG){
  window.sleep = async ms=>new Promise(r=>setTimeoutOG(r, ms));
  const msg = " is deprecated, use 'await sleep(ms)'."
  window.setTimeout = _=> {throw SyntaxError("setTimeout" + msg)};
  window.setInterval = _=> {throw SyntaxError("setInterval" + msg)};
  window.clearTimeout = _=> {throw SyntaxError("clearTimeout" + msg)};
  window.clearInterval = _=> {throw SyntaxError("clearInterval" + msg)};
})(setTimeout, setInterval, clearTimeout, clearInterval);
```



### `Event.prototype`

* `Event.stopPropagation()`: or this could be altered so that it only works within the current document, and we can have 
1. `stopPropagationImmediately()` for the currentDocument.
2. `stopPropagation()` after the current element reactions.
3. `stopPropagationOnElement()` for only the currentElement.


### `Node.prototype`

1. `Node.append()` and `Node.prepend()` and the other js methods that enable you to attach a single or set of js elements to another element. These methods will first run through and check that the `toBeAddedElement.getRoot() === toBeAppendedElement.getRoot()`, ie. that the elements added are only moved, not coming from the js space.

### `Element.prototype`

* `.outerHTML`: can no longer be used to `set` HTML content, only to read from the DOM.


## Deprecated JS methods

2. `document.createElement` and `document.createAttribute`.