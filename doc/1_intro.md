# Basic concept of _HTML doubledots_ (or `HTML:` or just "doubledots")

This framework enables you to write a full web application using only html. It does so by extending html attributes using `:` so that they can function as for example small event listeners.

## Example 1: `event:reaction`

In simplified terms, the `href` attribute of the `<a>` element acts as an event listener. When you wrap text or other elements in your code as 

```html
<a href="bbc.com"><div>hello bbc</div></a>
```

The "link" represented by the `<a>` element and `href` attribute, will listen to `click` events within, and then tell the browser to open the web page whose link is in the `href` attribute's value. The link. Most, if not all, functionality on any modern web page can be viewed as such an event reaction. An event occurs, and then a function is run as a reaction to that event. 

Keeping things simple for now, we illustrate this "event" => "reaction function" as an `event:reaction` pair. The `<a href="bbc.com"><div>...</div></a>` event listener could therefore be understood as the `<div click:open="bbc.com">` where `click:open` represents the `event:reaction` pair. 

```html
<div click:open="bbc.com">hello bbc</div>
```

## What about normal, native attributes?

DoubleDots *only* work with attributes with `:`. All other attributes such as `src`, `href`, `class`, `id`, etc., that do not include the `:` character are simply ignored by DoubleDots.

## Example 2: `document.defineReaction("open", ...)`

That sounds nice, you say. But how in the world would this work in practice? Well, to make this work is actually quite simple. You need only to do two steps:
1. load `<script src="html_doubledots.js">` at the top of your `.html` file, and
2. define the custom reaction "open" in a javascript code.

```html
<script src="www.htmldoubledots.com/topdoubledots.js"></script>
<script>
  document.defineReaction("open", function(e){
    window.open(this.value);
  });
</script>

<div click:open="bbc.com">hello bbc</div>
```

Ok, still a little fudgy. No problem! It is quite easy:)

1. `<script src="www.htmldoubledots.com/topdoubledots.js"></script>` loads the doubledots framework. We recommend using `topdoubledots.js` and importing the framework at the beginning of your `.html` document, but you can also append `enddoubledots.js` near the bottom of your `.html` file, if you want.

2. The `topdoubledots.js` file  implements the special `attribute` => `eventListener` functionality. Now, you can listen for events via attributes by writing `click:do_something`, `offline:do_something_else`, `mousemove:another_action`, etc. etc. All the native events, or custom events, will now find and trigger the new `<element event:reaction>` attributes in your `.html` document.

## Example 3: how to filter and chain reactions

Now, in our .html document, we can add event listeners for any event (such as `click:`) and react to them (such as `open`). That is nice. But what else can we do?

```html
<div click:is_active:open="bbc.com">hello bbc</div>
```

In the example above, we add two reactions inside the same doubledot attribute: `is_active` and `open`. We are making a chain of reactions. Where each reaction can break the chain.

We can imagine the example above behaving as following: When a `click` event occurs, the `is_active` performs a check. If the `<div>` element is active, then continue and `open` the attribute value `bbc.com`. If the `<div>` element is not active, then break and do _not_ open bbc.com.

We can implement this as follows:

```html
<script src="www.htmldoubledots.com/topdoubledots.js"></script>
<script>
  document.defineReaction("open", e => window.open(this.value));
  document.defineReaction("is_active", function(e) {
    if (this.ownerElement.hasAttribute("off"))
      throw customReactions.break;
  });
</script>

<div click:is_active:open="bbc.com">hello bbc</div>
<div off click:is_active:open="foxnews.com">hello fox news</div>
```

Some technical details:
1. You can chain as many reactions as you would like to the reaction chain.
2. To break the chain reaction, you need to `throw` the special `customReactions.break` error. This might seem a little cumbersome, agree, but you will come to like it a little later on. Trust me. But the essence of the special break is that it frees your code to _freely_ `return` and `throw` _anything you want_.

>> this example 'click:open' is doing the same thing as the 'a href' would do. It is not doing something new.