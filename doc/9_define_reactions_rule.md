# Reaction rules!

There are two ways to define custom reactions: 
1. normal reactions (`customReaction.define("name", reaction)`), and
2. reaction rules (`customReaction.defineRule("prefix", rule)`). 

## Todo

1. allow for definition names to be the same as rule names. And overlap between rules and definitions??

## HowTo define a reaction rule

When you define a reaction rule, you pass in two parameters: `prefix` and `rule`.

1. The `prefix` is a `String` that will be matched against any reaction name. If you for example pass in `"."` as the prefix for a reaction rule, then all reaction names that starts with `"."` such as `.open` or `..` or `.-` will be recognised as belonging to this rule. 

2. The `rule` is a higher-order function. A higher-order function is a function that returns another function. The `rule` is a function that will be given a single argument: the full name of the reaction that is matched. The `rule` function must return a `Function` object. This output `Function` will then be matched with all subsequent reactions with that specific name.

## When are reaction rules interpreted?

The virtual event loop will try to interpret the reaction rule into a normal reaction function when it is first encountered.

## Example 1: `toggle-attribute`

We have a web application with two very similar reactions: `toggle-attribute_hidden` and `toggle-attribute_open`. This is kinda annoying, what we want is to have a single reaction `toggle-attribute` and then pass in the attribute names `hidden` and `open` as arguments. To accomplish this, we can use reaction rules.

```html
<details click:toggle-attr_open>
<summary click:toggle-attr_hidden>single use open</summary>
you cannot unsee what you have seen.
</details>
<script>
  customReactions.defineRule("toggle-attr_", function(name){
    const attrName = name.split("_").pop();
    return function(e,oi) {
      this.ownerElement.toggleAttribute(name);
    };
  })
</script>
```

>> Note: since you are using the `_` to separate a required argument, it is beneficial to add `_` to the rule prefix.

## Example 2: `sleep_`

We want to implement a version of `sleep` so that we don't have to define a new reaction every time we want to change the duration of the sleep function. Again, we can accomplish this with a reaction rule.

```html
<div 
  click:sun_rise::sleep_5000:sun_set:sleep_3000:..-4
  >hello sunshine</div>
<script>
  customReactions.defineRule("sleep_", function(name){
    const duration = name.split("_").pop();
    return _ => new Promise(r=>setTimeout(r, duration));
  });
  customReactions.defineRule("sun_", function(name){
    const riseOrSet = name.split("_").pop();
    if(riseOrSet === "rise")
      return function(e,oi){
        this.ownerElement.classList.add("sun");
      }
    return function(e,oi){
      this.ownerElement.classList.remove("sun");
    }
  });
  customReactions.defineRule("..", function(name){
    const pos = parseInt(name.substring(2));
    return _ => customReactions.goto(pos);
  });
</script>
```

## Example 3: mirpo remembers another one

1. command and flags in bash? do we have something similar?
2. can we pass arguments to our reactions? Or are the arguments always only `e, oi`?

## Name and rule conflicts

It is *not* possible to define reaction names and reaction rule prefices that overlap. If you do that, your code will `throw` a `ReactionNameError`. For example:

```js
customReactions.define("attribute-open", ...);
customReactions.defineRule("attr", ...);  //fails!
```

or

```js
customReactions.defineRule("attr", ...);
customReactions.define("attribute-open", ...);  //fails!
```

To avoid such naming conflicts, the following conventions are smart to follow:
1. reaction names that start with `.` and `-` are often used as reaction rules. Avoid having normal reactions start with `.` and `-`. (You can make your own custom reactions for `.` and `-` if you like.)
2. For reaction rules such as `toggle-attribute_` and `sleep_` keep the `_` as part of the reaction name.
3. Avoid using short and generic names such as `attr` as reaction rule name. This will likely cause problems.
4. For normal reactions, try to avoid using both `_` and `.` in the reaction name. For normal reactions, english letters and `-` are most often enough. If you find that a `.` or `_` is necessary in your reaction name, this can be a signal that you might want to write a reaction rule instead of a normal reaction.
