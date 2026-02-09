# Demo: `<details open>` vs. `click:hidden`

The native `<details>` and `<summary>` HTML elements are a good example of recurring problem, being given what feels like a kinda convoluted solution. The problem with the native `<details>` and `<summary>` solution is not that it doesn't work, but:
1. you might want to use your own HTML elements, and not `<details><summary>`,
2. you might need to control the trigger events so as to hide on `doubleclick` or `keypress[h]`,
3. you might wish to hide only a single piece of content, hide everything, trigger the hiding from outside the container element, or
4. something else.

So, in that sense, the main problem with `<details>` and `<summary>` is that the technique solves a subset of all the tightly connected click-to-show-hide usecases.

Doubledots to the rescue!

## 1. HTML Layout

First, we need to create the basic HTML structure. We'll have a container that acts as our dropdown, and within it, a summary element that when clicked, reveals or hides the content.

```html
<div>Thinking ahead</div>
<div id="container">
  <div class="one">One</div>
  <div class="two">Two</div>
  <div class="three">Three!</div>
</div>
```

## 2. Adding Functionality with Doubledots

Let's add a custom reaction that echo that of `<details><summary>`.

```html
<style>
  :not([open]):not([click:parent-toggle-open]) { display: none; }
</style>
<div>Thinking ahead</div>
<div id="container">
  <div class="one" click:parent-toggle-open>One</div>
  <div class="two">Two</div>
  <div class="three">Three!</div>
</div>
```

A `click` on `div.one` will toggle the attribute `open` on the container element, which in turn will turn on/off the display of all non-first children. Nice. But. There are so many other alternatives too. Let's make some more:

### hide (and unhide) next element

```html
<div click:next-toggle-hidden>Thinking ahead</div>
<div id="container">
  <div class="one">One</div>
  <div class="two">Two</div>
  <div class="three">Three!</div>
</div>
```

A `click` will toggle the `hidden` attribute on the next element.

### `doubleclick` to show a select few

```html
<style>
  :not([even]) .even { display: none; }
</style>
<div>Thinking ahead</div>
<div id="container" doubleclick:toggle-even>
  <div class="one odd">One</div>
  <div class="two even">Two</div>
  <div class="three odd">Three</div>
  <div class="four even">Four</div>
  <div class="three odd">Five!</div>
</div>
```

Here, we use both a different trigger `doubleclick:` that more selectivly shows and hides elements. 

## 3. defining reactions

As there are many alternative use-cases for show-hide-toggles, there are many ways to implement them. Let's make some variants around the first `click:parent-toggle-open` example.

### A simple, all-in-one `:parent-toggle-open`

The first alternative is to just straight ahead implement a single reaction.

```html
...
<div id="container">
  <div class="one" click:parent-toggle-open>One</div>
  <div class="two">Two</div>
  ...
</div>
<script>
  customReactions.define("parent-toggle-open", function(){
    this.ownerElement.parentNode.attributes.toggleAttribute("open");
  });
</script>
```

### A dash and a rule

Another alternative is to use the dash rule (`:-xyz`) and add our own `toggle-attr_` rule. Here, we are using two rules that you will find quickly becoming part of your core reaction rule registry. To see more about the `:-` dash rule, see the chapter on it; the `toggle-attr_` rule is implement in the example:

```html
...
<div id="container">
  <div class="one" click:-p:toggle-attr_open>One</div>
  <div class="two">Two</div>
  ...
</div>
<script>
  customReactions.defineRule("toggle-attr_", function(name){
    name = name.split("_")[1];
    return function(e, oi){
      this.toggleAttribute(name);
      return oi;
    };
  });
</script>
```

## What `rules` to follow?

There are different ways to code. And different opinions on what makes for the most readable examples. But, regardless of which path you choose, it is useful to learn more about how reaction rules, and especially their use, can create dependencies in your code.

In the example above, the `toggle-attr_` rule is implicitly using an `element` as `this`. When the reaction chain starts, the `this` is the origin attribute, and you *must* at some point *before* the `:toggle-attr_` reaction have another reaction that sets the origin `this` of the reaction chain to an element. Thus, there has to be a previous reaction like the `:-p` that has moved the reaction chain's origin to an element.

This creates a dependency from the `:toggle-attr_` rule to:
* at minimum an "origin moving reaction style", or
* more likely extensive use of the `:-` dash rule.

So, there is no strong dependency from the `:toggle-attr_` rule to the `:-` rule, but there is a soft dependency.
