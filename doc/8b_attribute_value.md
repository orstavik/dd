# Attribute `.value`

All attributes can have a `.value`. The `.value` must be a `String`, and this `.value` is visible in HTML template and the dynamic DOM as the `="something"` after the attribute name. Examples include:
* `<div hello="sunshine">`
* `<h1 attribute-name="value">`
* `<h2 click:open="https://bbc.com">` (urls are commonly specified in the value)
* `<h3 number-attribute=42>` (even though it looks like 42 is a number, **all attribute values are always `String`s in HTML**)
* `<h4 can-i:do_this='[{"json":"imagine how big this can be. Since it's \"limitless\"."}]'>` (This is likely not what you want, you might want to consider `<script type="application/json">` instead.)

## Accessing the `.value` from a `:reaction`

At the outset of a reaction chain, `this` is the attribute with the reaction inside a custom reaction `function`. If the origin of the reaction chain has not been changed, then simply refering to `this.value` can both read or write.

```html
<h1 click:hello="sunshine">hello</h1>
<script>
customReactions.define("hello", function(){
  console.log("hello", this.value);
  this.value = "more sunshine";
});
</script>
```

>> How can we access `.value` when the `this` origin has changed? If a previous custom reaction in the chain has moved the `this` origin, then simply access `e.currentAttribute.value` instead of `this.value`. The `e.currentAttribute` is the "current attribute" whose reactions are currently being processed.

## Accessing the `.value` from a `trigger:`

The trigger is a `class` that `extends Attr`. The trigger: *becomes* and augments the attribute object, and so inside the `upgrade(fullname)` and any other method in the trigger `class`, `this` is the attribute and `this.value` is the attribute value.

```html
<h1 wait-for-it:log-value>hello</h1>
<script>
  customReactions.defineTrigger("wait-for-it", class WaitForIt extends Attr{
    async upgrade(fullname){
      this.value = "sunshine";
      await sleep(5000);
      this.dispatchEvent(new Event(fullname));
    }
  });
  customReactions.define("log-value", function() {
    console.log(this.value);
  });
</script>
```

## `customReaction.defineRule` vs `.value`

An alternative to the `.value` for triggers and reactions is to use `_arguments` and name-parsing (in the `upgrade`). The upside of `_arguments` is that each trigger and reaction can have their own, within the same reaction chain. The downside with `_arguments` is that they are *static*: once the custom reaction is added to the DOM, you can't change the value of the `_arguments`. They are read-only.

The upside of the `.value` is that it can be read and changed at any time. The attribute `.value` is both read and write. The downside of the `.value` is that each trigger:reaction-chain *share* only one.

Therefore, the rule of thumb is:
1. If you can, prefer the use of `_arguments` in trigger and reaction rule definitions. Examples include numbers and simple names for css classes and attributes.
2. If you can, make triggers: and :reactions that do not need to read the `.value`.
3. If a reaction/trigger uses the `.value`, then this basically prohibits the use of this reaction with other triggers/reactions that also use `.value`. There can be only one.

In a reaction chain *one* trigger and *several* reactions are strung together into a single unit: the attribute. This attribute has one, single `.value` property. And this means that the trigger and all the reactions *must share* a single `.value`. This is the real problem with `.value`.

## When to use and how to share `.value`?

Above we have looked at several alternatives to using `.value`. And we saw that there is a problem that the trigger and all reactions *share* `.value` in a reaction chain. So does that mean that we never use it? And, if we use `.value`, how would triggers and reactions share the use of it?

The answers are:
1. We most definitely still use the `.value`. After all, it is super handy. Primarily we use the `.value` for a) state machine triggers/reactions and b) complex arguments such as `url`s, `/regex/`, `json`, etc. that do not fit as rule `_arguments` (because they use special characters).
2. But, when a trigger or reaction uses the `.value`, it does **NO SHARING**. It is super selfish. It writes and reads to the `.value` as if it was alone in the reaction chain. It is on you, the DoubleDots developer, to ensure that there is *only one* selfish, `.value`-hogging trigger/reaction per chain.

## Other alternatives for storing state

If you still find that your reaction chain *must* include two triggers or reactions that both require a `.value`, for example you might have a filter that needs regex and an effect that needs a url, you can resort to these two alternatives:

1. The *other* `.value`, as in **another attributes' `.value`** on the same element. You can do this by adding a pure `data-something` attribute on your element, or by using another (likely ancestor or header) element with a special purpose attribute, such as `<base href="going.places.com">`.
2. The `.innerText` of another element, such as `<script  type="application/json">{"your":"json here"}</script>`. Here you can use `JSON.parse(scriptEl.innerText)` to read, and `scriptEl.innerText = JSON.stringify(txt)` to write to the element.

>> The lack of syntactic support for multiple values per reaction chain should be considered a *limitation* of DoubleDots. There is no principle reason why it wouldn't be nice to have one value per trigger/reaction, instead of one value per reaction chain. However, DoubleDots is built within the syntax of HTML attributes, and HTML attributes have only one value. So, there is no "hidden meaning" or "best practice" behind the construct of "multiple reactions share one value"; it is purely a coincidence.
