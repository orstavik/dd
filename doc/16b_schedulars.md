# Schedular reactions

Schedulars are reactions that primarily *filter* or *delay* the execution in a reaction chain. They do not have to have a state, but they often do. This state is *often* transient, meaning that it *only* exists in JS memory; but schedulars *might* decided to write to the DOM such as a slow debouncer toggling a CSS class when active, to enable visual queues highlighting a process being actively delayed or already being executed.

This means that schedulars are a subset of reaction state machines. There are no black and white lines between schedulars and reaction state machines. Schedulars are reaction state machines whose *primary purpose* is to:
1. control the time when a reaction chain will continue, and/or
2. *if* the reaction chain will continue or not (filter).

Schedulars *can*, but *often do not*:
1. write to the DOM such as toggling CSS classes or attributes, or
2. dispatch new events, such as `:tripple_`.

## `::r` the `::ready` reaction


## `:debounce_` rule
```js
    // custom reaction implementation of debounce, time = 1000ms
    const sleepers = new WeakMap();
    const last = new WeakMap();
    customReactions.define("debounce", async function (e, oi) {
      const key = e.currentAttribute;
      let sleeper = sleepers.get(key);
      if (!sleeper) sleepers.put(key, (sleeper = new Promise((r) => setTimeout(r, 1000))));
      const kk = new Object();
      last.put(key, kk);
      await sleeper;
      sleepers.delete(key);
      const check = kk === last.get(key);
      last.delete(key);
      return check ? oi : customReactions.break;
    });

    // custom reaction rule implementation of debounce, time = 1000ms
    customReactions.defineRule("debounce_", function (name) {
      const active = new WeakSet();
      const delay = name.split("_")[1];
      return function (e, oi) {
        const key = e.currentAttribute;
        if (active.has(key)) return customReactions.break;
        active.add(key);
        return new Promise((r) => setTimeout(r, delay)).then(() => {
          active.delete(key);
          return oi;
        });
      };
    });
```

## `:throttle_` rule

```js
//regular reaction implementation of throttle, cap = 1000ms
const active = new WeakSet();
customReactions.define("throttle", async function (e, oi) {
  const key = e.currentAttribute;
  if (active.has(key)) return customReactions.break;
  active.add(key);
  await new Promise((r) => setTimeout(r, 1000));
  active.delete(key);
  return oi;
});

// custom reaction rule implementation of throttle, throttle_cap = 1000ms
customReactions.defineRule("throttle_", function (name) {
  const active = new WeakSet();
  const delay = name.split("_")[1];
  return function (e, oi) {
    const key = e.currentAttribute;
    if (active.has(key)) return customReactions.break;
    active.add(key);
    return new Promise((r) => setTimeout(r, delay)).then(() => {
      active.delete(key);
      return oi;
    });
  };
});
```


## todo Look to RxJS