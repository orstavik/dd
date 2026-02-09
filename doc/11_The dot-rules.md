# The `.dot` reaction rule, aka. KebabReflection

KebabReflection enable DoubleDots developers to access for example:
1. the `.value` on an attribute,
2. properties on events such as `.time-stamp` or `.x` on `PointerEvent`s,  
3. methods such as `.dispatch-event` and `.first-element-child` on `HTMLElement`s,
4. custom methods on web components or native elements such as `<dialog>.showModal()`, and 
5. methods and properties on state-machine attributes.

When you need to have your custom name space for reactions associated with an HTML node such as a state-machine attribute or a web component, then using `:.kebab-reflection` is very helpful and makes a lot of sense for the developer.

## 1. Implementation

```js
class DotReactionRuleError extends SyntaxError{ } //todo implement
customReactions.defineRule(".", function(name){
  if (name===".")
    return (e, oi) => oi || customReactions.break;
  if (name==="..")
    return (e, oi) => oi && customReactions.break;
  if (name === "..0")
    throw new DotReactionRuleError("`:..0` is an illegal jump.");

  const [_, jump] = name.matches(/^\.\.([-]?[1-9][\d]*)$/) || [];
  if (jump)
    return (e, oi) => oi ? new EventLoop.ReactionJump(jump) : oi;

  const [_, kebab] = name.matches(/\.([a-z][a-z0-9_-]*)/) || [];
  if (kebab) {
    const [prop, ...args] = kebab.split("_");
    const cName = prop.replace(/(-\w)/g, m=> m[1].toUpperCase());
    return function(e, oi) {
      const p = this[cName];
      if (p instanceof Function){
        args.replaceAll(i => i === "e" ? e : i === "oi" ? oi : i);
        return p.call(this, ...args);
      }
      if (!args.length)
        return p;
      if (args.length === 1)
        this[cName] = args[0];
      throw new DotReactionRuleError(`this.${cName} is not a function, but still given 2 args: ${args}.`);
    };
  }
  throw new DotReactionRuleError(`The name: "{name}" doesn't match the "."rule`);
});
```

# TODO 

Change `:..` to `:f.` the "f-dot" or "filter-dot".

Change `:..num` to `:j.` the "j-dot" or "jump-dot".

## The default filter reaction `:.:` and `:..:`

The default dot-rule handles `:.` as a filter that breaks if the input is `falsy`. If the Link to the definition of falsy on mdn. If the `oi` input is truey, then the `:.` will let the `oi` "pass through".

The `:..` works the same way, but in reverse. If the `oi` is `falsy`, the reaction just lets it through; if the `oi` is `truey`, then the reaction will break.

## jump! `:..3` and `..-2` 

The `:..` specifies a jump. It is useful to implement control structures. The `:..X` where X must be a positive or negative integer. If the `oi` is falsy, then the jump will not happen.

>> todo! when we have negative jumps, ie. looping, then we are going to be writing in space. We would need to stash the content overwritten somewhere else. We don't like loops..
>> todo? add a falsy jump? `:.._-3` for example?

## To `:.kebab-reflection_arg_arg` is to `this.kebabReflection("arg", "arg")`

We look at some examples:
1. `:.-alpha-zeta_fo-o_bar`
2. `:.beta-gamma_3`
3. `:.delta`
4. `:.4`

The `:.-alpha-zeta_fo-o_e` is split into:
1. `-alpha-zeta` snake name. Converted into a KebabCase property `AlphaZeta`.
2. `_fo-o_bar` string arguments. Converted into string array, with `"e"` replaced with `e` and `"oi"` with `oi`: `["fo-o", "e"]`.

The `:.beta-gamma_3` is split into:
1. `beta-gamma` snake name. Converted into a KebabCase property `betaGamma`.
2. `_3` string arguments. Converted into string array `["3"]`.

The `:.delta` is split into:
1. `delta` snake name. Converted into a KebabCase property `delta`.
2. empty string arguments.

The `:.4` is split into:
1. `4`. Think of it as an array index.
2. empty string arguments.

There are four valid situations:
1. The KebabCase property is a `function`. This function will be called with the `this` origin as `this` and the string arguments array or empty array as arguments. In the arguments, strings `"e"` will be replaced with the `e`, and strings `"oi"` will be replaced with the `oi` (outputInput argument). E.g. `this.AlphaZeta("fo-o", e)`, `this.betaGamma("3")`, or `this.delta()`;

2. The KebabCase property is *not* `function` and the string arguments has ***a single*** item. This will be interpreted as a setter, e.g. `return this.betaGamma = "3"`.

3. The KebabCase property is *not* `function` and the string arguments is ***empty***. This will ge interpeted as a getter, e.g. `return this.delta`.

4. The KebabCase property is an `Object` and the string arguments is ***empty***. This will be interpreted as a getter, an array lookup, e.g. `return this[4]`.

```html
<h1 click:.toggle-attribute_open>hello sunshine</h1>
```

## The `.dot` rule and `StateMachineAttr`

The `StateMachineAttr` **depends** on the `.dot` rule. In order to avoid having the complex state machines spawn custom reaction names, it needs to be able to use some kind of reflection to access the method names on the `StateMachineAttr` instance. The `class` name in JS provides a namespace for uniquely identifiable methods, and so by combining the `.dot` rule with the `class` namespace encapsulation, we can generate complex statemachines that use their own names *without* bleeding various reaction names to an outside namespace.

## The `.dot` rule is an *op*tional, *op*inionated *op*erator

Is it optional? Yes. The `.dot`-reactions is a reaction rule. Semantics. Semantics is optional. Words you can choose not to utter. A word whose meaning you can define on your own terms. Reaction rules are super easy to exclude and write your own versions of. So if you don't like the logic and feel of the `.dot`-reactions, that is 100% ok. You are truly welcome to implement your own! The system is built that way:D 

But if you include this `.dot` rule, do you then have to use it? Nope. You can still make as many custom reactions that use reflection and/or `return` `customReactions.goto()`/`customReactions.break`.

However. This `.dot` rule reserves the `.` prefix. So with the `.dot` rule included, you cannot make your own custom reactions whose name begins with `.`.

Ok, but let's hear the dirt! How is the `.dot` rule *opinionated*? There are many dubious choices made in how the `.dot` rule has chosen to interpret its text. For example, the `.dot` rule KebabReflective method replaces two special words `"e"` and `"oi"` with the two input arguments. This can definitively be confusing. The `.dot` rule doesn't support `"_"` in method names, not even at the beginning of their name. Sorry Python developers. Furthermore, choices are made concerning jump and filter syntax too. There are good, alternative routes dot taken.

But, and this is a big but! When we implement a set of custom state machines that spawn and orchestrate their own reaction chains, we *had to have* some *globally available* rules that enable us to both:
* *dynamically move the `this` origin* (the `-dash` rule) and
* *reflectively invoke methods on `this`* (the `.dot` rule).  

The reason we *had to*, is that the alternative to moving `this` and reflective method invocation is to *flush the namespace with a myriad of custom reactions*. This is simply a significantly worse choice, especially for readability, but also for maintainability when making custom state machines. So, the `StateMachineAttr` we use to implement so many of our standard gestures and other complex state machines *voluntarily* chose to depend on the `.dot` and `-dash` rule. So, the big but is that the option to *not* use `.dot` and/or `-dash` (or break certain aspects of them), comes with the penalty of loosing access to the DoubleDots standard registry of gestures and other fun, complex state machines. Sorry. We simply had to break some eggs to make those omeletts.
