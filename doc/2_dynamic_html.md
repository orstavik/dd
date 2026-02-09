## HTML changing HTML

The primary usecase for HTML doubledots is to add simple reactions that change the HTML document dynamically. Here are a few examples:

### Example 1: toggle attributes

A common, simple, yet powerful way to change the DOM is to add, remove, and toggle attributes on elements. We can do this to for example hide/show the content of child nodes.

This is exactly what the native `<details><summary>` do. When the `open` attribute is added to the `<details>` element (ie. `<details open>`), then all the childNodes of the `<details>` element will be visible; when there is no `open` attribute on the `<details>` element, then only the first `<summary>` child element will be visible. When the user `click`  on the `<summary>` element, this toggles the `open` attribute on the parent `<details>` element.

We can easily simulate this behavior with doubledots and apply it to any parent-child element pairs.

```html
<script src="www.htmldoubledots.com/topdoubledots.js"></script>
<script>
  customReactions.define("toggle_closed", function() {
    this.ownerElement.parentElement.toggle("closed");
  });
</script>

<style>
  [closed] > :not(:first-child) { display: none; }
</style> 

<div>
  <h3 click:toggle_closed>click to open/close</h3>
  <p>Here is some hideable content</p>
  <p>Here is some more hideable stuff</p>
</div>
```

As you might have noticed, we inverted the behavior of the html attribute from `open` to `closed`. Why? Well, if we *show* all the children by default (ie. when no attribute is present), that makes sense when you *only* see the html template. This behavior would mirror that of HTML if there was no JS nor CSS present.

You might also see that we in the CSS template *exclude* the `:first-child` when hiding children. This might seem a little strange at first glance: why not just hide all the children?" But, the answer is quite straight forward: we need to have the clickable element with the `click:toggle_closed` reaction visible for us to have something to click on to toggle the view back on.

### Example 3: changing text

Can doubledots change the DOM? You betya!

```html
<script src="www.htmldoubledots.com/topdoubledots.js"></script>
<script>
  customReactions.define("plus_one", function() {
    const el = this.ownerElement;
    el.innerText = parseInt(el.innerText) + 1;
  });
</script>

<p>can we add to the meaning of life?</p>
<div click:plus_one>42/div>
```

### Example 4: changing DOM

To illustrate how we can change the DOM, we will make a TODO list. If  you `click` on any item in the list, you will move that item to the top of the list. If you right-click (ie. `contextmenu`) on an item, then that item will be moved from the TODO list and over to a DONE list.

```html
<script src="www.htmldoubledots.com/topdoubledots.js"></script>
<script>
  customReactions.define("up", function(e){
    const el = this.ownerElement;
    const parent = el.parentNode;
    parent.prepend(el);
  });
  customReactions.define("done", function(e){
    const el = this.ownerElement;
    const parent = el.parentNode;
    const uncle = parent.nextElementSibling || parent.previousElementSibling;
    uncle.append(el);
  });
</script>

<ol>
  <lh>TODO</lh>
  <li click:up contextmenu:done>buy milk</li>
  <li click:up contextmenu:done>cut the grass</li>
  <li click:up contextmenu:done>walk the dog</li>
</ol>
<ol>
  <lh>DONE</lh>
</ol>
```

