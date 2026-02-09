# `onclick` and global native handler attributes

HTML has its own old custom reaction handlers that are available in the DOM. There are several problems with these native in-html event listeners.
0. They allow you to run pure js code that has not been vetted in your application. 
1. You can only have one per event.
2. You directly interpret js from the value of the attribute.
3. You are missing the ability to declare your own triggers.
4. The structure of the reaction chain is missing.
5. The `::` which highlights which of the reactions should run sync and which should run async is missing.

## Strategies for handling `onclick` handlers

1. make them illegal by throwing an `Error` everytime an attribute named `on`+native event name is discovered. This is the best strategy as `onclick` handlers are neither easy to read and based on the unsafe evaluation of text as code.

2. whenever an `onclick` event handler is added, switch it out with `click:on` instead. This creates a more uniform structure, but then it is better to define the `customReactions` by other means.

3. add additional check in the virtual event loop that will recognize `onclick` as if it was `click:on`. This provides backwards compatibility, but not something that is likely needed or something that should be encouraged to build on.

## The `:on` reaction

Regardless of strategy, if you want to implement a custom reaction `:on` in doubledots, this is how you would do it:

```javascript
async function getHandler(txt){
  const urlBlob = URL.createObjectURL(new Blob([`export default function(e){${txt}}`], {type : 'text/javascript'}));
  const module = await fetch(urlBlob);
  return module.default;
}

customReactions.define("on", async function(e){
  const handler = await getHandler(this.value);
  return handler.call(this, e);
});
```

The problem is that `eval(function(e){...})` and `new Function("e", ...)` are not allowed in JS anymore. The workaround employed above is using the `import` with a urlBlob instead. This will at least invoke the text code in a module context. Slightly safer? maybe not. Slightly more cumbersome? Yes. Slightly. Slightly less efficient? Yes, very much so. Are we seeing some of the problems of the native global handlers from this approach? Yes.

A slightly more efficient version is this:

```javascript
const handlerCache = {};
async function handlerTextToFunction(txt){
  const urlBlob = URL.createObjectURL(new Blob([`export default function(e){${txt}}`], {type : 'text/javascript'}));
  const module = await fetch(urlBlob);
  return module.default;
}

async function getHandler(txt){
  const cache = handlerCache[txt];
  if (cache)
    return cache;
  return handlerCache[txt] = await handlerTextToFunction(txt);
}

customReactions.define("on", async function(e){
  const handler = await getHandler(this.value);
  return handler.call(this, e);
});
```

However, the problem with this one is that the event loop (native and virtual), is forced to wait for a `Promise` even when the required function has already been parsed and cached. This is because `async` in front of `function` *always* will make the function return a `Promise`, even when it doesn't need to.

## The most efficient `:on` reaction

Thus, to make the most efficient version of `:on`, we must make the two outermost functions work with `Promise`s directly. Like so:

```javascript
async function handlerTextToFunction(txt){
  const urlBlob = URL.createObjectURL(new Blob([`export default function(e){${txt}}`], {type : 'text/javascript'}));
  const module = await fetch(urlBlob);
  return module.default;
}

const handlerCache = {};
function getHandler(txt){
  const cache = handlerCache[txt];
  if (cache)
    return cache;
  const p = handlerTextToFunction(txt);
  handlerCache[txt] = p;
  p.then(func => handlerCache[txt] = func);
  return p;
}

customReactions.define("on", function(e) {
  const handler = getHandler(this.value);
  if (handler instanceof Function)
    return handler.call(this, e);
  return handler.then(func => func.call(this.e));
});
```

Here, the reaction function(s) will not encounter or work with a `Promise` when the specific version of the function has not been changed. It is not likely that you will encounter many such situations, but if you do, the goal of this description of `:on` is that you will have a point of reference that is easy to understand as to how you can implement a caching function call that avoids creating `Promise`s when they are not needed.
