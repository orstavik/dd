# The definition registries and how they work

DoubleDots keeps a separate registry for triggers, reactions, and reaction rules. *And* DoubleDots keeps a separate registry for triggers for *every* `document` and `shadowRoot` *instance* (not type) in the DOM. In this chapter, we will look at:

1. *how* definitions are added to the registries,
2. *what* the three types of definition registries look like,
3. *how* definitions are retrieved from each registry, and *the default priority* of shadowDom over lightDom, 
4. *how* lightDom can break this default bottom-up definition priority and *replace* shadowDom definitions with its own.
5. *when* defintions can be added to the registries,

## 1. How to define reactions, reaction rules, and triggers? 

3 methods are used to define reactions, reaction rules, and triggers:

* `.defineReaction("name", function(e){...})`
* `.defineRule("prefix", function(fullname){...})`
* `.defineTrigger("prefix", class X extends Attr{...})`

These 3 methods are added to the `Document.prototype`, so you can do:

```js
document.defineReactionRule("toggle_open", function(e, oi){
  const el = this.ownerElement;
  if(el.hasAttribute("open"))
    el.removeAttribute("open");
  else
    el.setAttribute("open", "");
});
```

And these 3 methods also added to `ShadowRoot.prototype`, so you can also do:

```js
class WebComp extends HTMLElement{
  constructor(){
    const shadowRoot = this.attachShadow();
    shadowRoot.defineReactionRule("toggle_", function(fullname){
      const name = fullname.split("_")[1];
      return function(e, oi){
        const el = this.ownerElement;
        if(el.hasAttribute(name))
          el.removeAttribute(name);
        else
          el.setAttribute(name, "");
      };
    })
  }
}
```

## 2. What does the registries look like?

The reaction, reaction rule, and trigger regristries are *read-only*, proxied dictionaries that point from a name/prefix to a `function`/`class` (or `Promise` that will resolve into such a `function`/`class`):

```js
document.reactions = {
  "toggle-open": function(e, oi){...},
  "has-active": `Promise=>function(e,oi){...}`
}
//similar dictionaries for reaction rules and triggers
```

1. The reaction rule registry also ensures that each reaction rule caches its output per name per root. This means that each identical reaction rule is *only* invoked *once*.

2. The registries ensure that async functions that generate reactions or triggers update automatically.

3. The 3 registries also ensure that *no* overlapping definition will exist under the same `document` or `shadowRoot`. For example:
    * if you first do `document.defineTrigger("interval_5", ...)` and then later `document.defineTrigger("interval_50", ...)` (or vice versa), then the trigger registry will throw a `SyntaxError` on the second `defineTrigger` because `interval_5` and `interval_50` both begin with `interval_5`.
    * if you first do `root.defineReaction("toggle_open", ...)` and then `root.defineReactionRule("toggle_", ...)`, the reaction rule registry will throw a `SyntaxError` because the reaction name `toggle_open` overlaps/starts with the reaction rule `toggle_`.

## 3. How are definitions queried?

Definitions are queried in *two* ways:
1. Whenever a potential trigger or reaction is encountered by the virtual event loop, it will find the `root` of the attribute and query it for the `reaction` or `trigger`.
2. By manually calling `root.getReaction("fullname")` and `root.getTrigger("fullname")` from within a trigger or reaction function.

When asked for a definition, the *default* behavior of the document `root`s is to:
1. first, use its own definition (if it can),
2. second, use its parent root's definition,
3. third, use its grandparent's definition, etc., ending with the `document`.

* the `document` has no parent root, so this recursive use of ancestors definition applies to `shadowRoot`.

When the reaction rule registry and the trigger registry are asked for a definition for a given name, they will simply see if the name starts with one of their prefixes: `fullname.startsWith(rulePrefix)`. 

## 4. How to override shadowDom definitions?

The *default* priority of shadowRoot definitions *before* lightDom definitions ensures that web component developers can set up and define their own triggers and reactions, and pass those reactions with their web component, *without* those definitions leaking out into the lightDom and causing namespace conflicts and definition mayhem. That is nice.

But. The lightDom *uses* and *controls* the shadowDom. And sometimes the lightDom needs to make adjustments to the behavior of the shadowDom to reuse safely with minimal effort. To achieve this with reaction and trigger definitions, three special attributes `override-reaction` and `override-trigger` can be used. Here is how they work:

1. The value of the `override-reaction` and `override-trigger` are regex rules. They are used to match reaction names that will be defined from the lightDom in which the override was set. That means that they are `|`-separated names with `.*` for rules.
2. Whenever a `shadowRoot` is instantiated, it will check all the ancestor host nodes for such `override-reaction` and `override-trigger` attributes. If it finds such a rule, then it will add that rule to its own registry, but replace its own root for that rule, with that hostNode's root. 

## 5. *When* to add definitions and overrides? 

There are ***no*** time limits for when you can add definitions on the `document`. So that is simple. The only time limits that exists are for adding definitions inside `shadowRoot`s and adding `override-x` attributes on the host nodes of shadowRoots.

1. The `override-x` attributes can *only* be added at the same time the element is added to the DOM. The `.setAttribute(name, value)` *filters* away any attempt to add `override-reaction` and `override-trigger` *after* the element has been created. This works in DoubleDots *because* HTML elements can only be added as HTML template text, which enables attributes to *always* be appendable *at creation-time*.

2. You ***must define all reaction and reaction rules inside the `shadowRoot` before any reaction is queried***, directly or indirectly by the event loop. This applies to triggers as well, you must define all triggers before the first trigger is requested from that `shadowRoot` instance. This means that you need to call the `shadowRoot.defineXYZ` in the `constructor()` or `connectedCallback()` of your web component. You *can* provide these functions with a `Promise` that will resolve to a reaction `function`, rule `function`, or trigger `class`, but the *`name`/`prefix`* **must be registered asap**.

Why the haste? Why the deadline? *Consistency*. Let's imagine a couple of scenarios where there were you could add definitions and overrides to `shadowRoot`s and `hostNode`s at any time.

1. Let's say that you inside the shadowRoot `fetch`ed a definition from a web resource. For the first element of your web component type, this fetch took a long time, and the element therefore retrieved the defintion from the `document`. But then a new web comp instance of the same type was added to the DOM later on. This time, the `fetch` was cached, and so this web component ended up using the `shadowRoot`s definition. Not good. Better ensure that *all* definitions inside the `shadowRoot` are registered by *`name`/`prefix`* first, so that every instance of the web component knows its definition at the outset. (Also, doing the definitions at the beginning of a web components running code is good practice, and so there is a "follow good practices" benefit of doig it this way as well.)

2. Let's say that you added the `override-reaction="handle-click|delay"` attribute to an element *after* a little while. These two reactions are used to process some `click` events inside the `shadowRoot`. Now, these reactions might have been queried already, and if they have, they would have been added in the internal registry of that `shadowRoot`. But. They might not have too. If no `click` had been made, no definition might yet have been queried. And so the `override-reaction` attribute might still work. Again, not good. Better ensure that *all* overrides are known *before* the internal definition registries crank up. And, since the developer in the lightDom should know about all such needed overrides at the outset of the reaction, then again, specifying the needed overrides at the same time that you specify the type that you need is only good practice and clean house-keeping.
 
## 6. Algorithm overview for shadowRoot definitions

1. *before* HTML template is added to the `shadowRoot`, all definitions are registered by name/prefix. You can register `Promise`s that resolve into a `function` or `class` definition. The good time is *immediately* after `this.attachShadow()`, which usually is in the `constructor()` or `connectedCallback()`.
2. When the virtual event loop first encounters the need for a trigger or reaction definition for that node, it will make a map of all the `override-x` attributes of all the ancestor `hostNode`s.
3. The virtual event loop will then have both its own registry and the ancestor root registries and the override map needed to figure out which definition it should use for any reaction and trigger name. Any unknown definition can only be gotten from the `document` at a later point.
4. For overlapping rules between the `override` map and the definition registries, the highest root in the overlap map wins. The override map are expected to hold such overlaps, if there is *no* overlap, then the `override-x` attribute is unnecessary.
5. After the base root for a trigger or reaction definition name has been identified, then definition will be queried from that root, and its parent root if that root doesn't have any, and then its grandparent root, etc., all the way up to `document`.
