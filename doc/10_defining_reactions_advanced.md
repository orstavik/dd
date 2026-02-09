# Defining custom reactions part2

A reaction function can return anything, and what the reaction function returns will be the `oi` of the next reaction in the chain. And if a reaction function throws an `Error`, then that reaction chain will break and an `Error` event will be added in the event loop. Ok, so far so good.

In addition, custom reactions can return three special types of values:

1. `customReaction.break`
2. `customReactions.goto(int)`
3. `customReaction.origin(obj)`

We have already seen how `customReactions.break` as a special return value from a reaction can halt the reaction chain (as expected) without adding an `Error` event to the event loop. So here we will look only at the two others.

## 1. `customReactions.goto(int)`

To be able to implement control structures such as `if else` and `for`-loops, custom reactions need to be able to control the execution sequence in the custom reaction chain.

If you `return customReactions.goto(1)`, then the custom reaction chain will skip the next (one) reaction. `return customReactions.goto(3)` will skip the next 3 reactions. For example:

```html
<div click:a:j1:b:j1>hello sunshine</div>
<script>
  customReactions.define("a", _ => return "a");
  customReactions.define("b", _ => return "b");
  customReactions.define("j1", function(e, oi){
    console.log(oi);
    return customReactions.goto(1);
  });
</script>
```

The above example will run 
1. the `:a` reaction that returns `"a"` as the `oi` to the next reaction.
2. the `:j1` reaction will `console.log` the `oi` input, which is `"a"` and then return a `jump` 1 forward. When such a jump is initiated, the `oi` and `this` remains the same for the reaction coming after the jump as it was coming into the reaction performing the jump. 
3. the `:b` is then skipped, jumped over.
4. the second `:j1` is then triggered, with the same `oi` as before the jump, which makes the second `j1` also print `"a"`.
5. As the second `j1` returns a jump, and this jump goes beyond the scope of the reaction chain, an `ReactionChainError` is `throw`n.

### Reverse jumps

If you `return customReactions.goto(0)`, then the custom reaction will repeat itself. If you `return customReactions.goto(-1)`, then the custom reaction chain will go back to the previous reaction. `return customReactions.goto(-3)` will go back three places.

```html
<div click:n1:t2:lt64_-2>hello sunshine</div>
<script>
  customReactions.define("n1", (e,oi) => isNaN(oi) ? 1 : oi);
  customReactions.define("t2", (e,oi) => oi*2);
  customReactions.define("lt64_-2", function(e, oi) {
    if (oi < 64)
      return customReactions.goto(1);
    console.log(oi);
  });
</script>
```

The above example will run 
1. the `:n1` will ensure that the `oi` is a number, or start with 1.
2. the `:t2` will multiply the `oi` with two.
3. the `:lt64_-2` will check that if the number is less than 64, it will go back two steps to `:n1`.
4. This creates a loop, that multiplies a number, starting with 1, by 2, until the value is 64 or over.

## 2. `new EventLoop.ReactionOrigin(obj)`

The `this` object for the custom reaction is by default, and at the start of *every* custom reaction chain, the current reaction attriubte. But. You can change this. In order to change this, you need to have a custom reaction that returns a special `origin` wrapped object.

If you for example have a customReaction that `return new EventLoop.ReactionOrigin(this.ownerElement)`, then for the next reaction, the `this` of the reaction function will be the element that the custom Reaction is attached to.

## 3. `customReactions.index`

In addition to `.define` the `customReactions` object has another special property: `.index`. The `.index` is the current position of the execution of the current custom reaction within the custom reaction chain/attribute.

```html
<div click:one:two:three:one>hello sunshine</div>
```

1. During the first run of reaction `:one`, then `customReactions.index == 1`.
2. During reaction `:two`, then `customReactions.index` is `2`.
3. During reaciton `:three`, then `3`.
4. During the second run of reaction `:one`, then finally `4`.

The `customReactions.index` is not a property you will use all that much. But it can be handy when you need to implement semi control structures and other reflexive or code-oriented functionality. And yes, you are right, it is kinda like the old, deprecate global `event` property.

