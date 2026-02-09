# DoubleDots' syntax

DoubleDots enables you to adding custom attributes to your HTML template. The main syntax of DoubleDots prescrive how you shape custom attributes. HTML only allow ***lowercase*** `/[a-z_:][a-z0-9_-.:]*/` in their attribute names.

## Hard rule `:` - the doubledot

1. A custom attribute is any and all attributes that include a `:`.

2. The `:` is used to split the custom attribute into *one* trigger followed by a list of reactions. The list of reactions can be empty.

The `:` is *only* and *always* used to split trigger and reactions. You *cannot* use `:` in triggers and reactions.

## Hard rule `a-z_0-9.-` - doubledot names

1. Triggers and reactions can *only ever* contain `a-z0-9_-.`. ***English lowercase characters***, digits `0-9`, and `_-.`. This is because HTML attributes can only contain `a-z0-9_-.:`, and `:` doubledot is already reserved for splitting triggers and reactions.
2. The first character of trigger names must be `a-z_`. ***English lowercase characters or `_`***. This is because HTML attribute names *can't startWith digits, `.` nor `-`*.

## Hard rule "No `this` in arrow functions"

You *cannot* use `this` in arrow functions in DoubleDots. You *can* use arrow functions that do not reference `this` inside. The reason for this hard limit is that the virtual event loop cannot override the `this` in arrow functions when invoking reactions. Therefore, if you attempt to define a reaction with an arrow function that use `this` inside, you will get an error, often a silent one or an error in the subsequent reaction. These errors are so confusing that DoubleDots have made this restriction.

If you need, you *can* still define your reactions as *both* closures and bound functions (`.bind(this)`) that use outside variables. This can be useful in some complex state-oriented reactions such as schedulars. But for normal reactions, try to use as pure functions as possible.

## Soft rule `..` - lowered doubledot

`..` is called a lowered doubledot. The lowered doubledot is considered a psynonym for the (raised) normal `:` doubledot: when you see a `..`, you should be able to replace it with `:` and get the exact same behavior (the difference being the doubledot engine running the reaction as a chain of smaller reactions). Similarly, if you *lower* doubledot `:` to `..`, then some DoubleDot trigger and reaction rules will *merge* and *inline* the two reactions into one.

This is an experimental feature. For now, it is up to the trigger and reaction rule to implement this. But try to avoid using `..` in your DoubleDot names to allow for this behavior.

## Soft rule `_` - doubledot arguments and doubledot alternative

1. `_` at the *beginning* of a trigger or reaction name is the doubledot *alternative* marker. The `_` at the beginning of the name should mean that you get an alternative behavior of the same reaction. For example, the `_click` is a *global* `click` trigger. It is up to the trigger and reaction definitions and rules to define what *alternative* means, but it is commonly easily understandable.

2. `_` *inside* a trigger or reaction name is the doubledot *argument* marker. This is used by trigger and reaction rules to pass in semi-static arguments that adjust the behavior of the reaction. 