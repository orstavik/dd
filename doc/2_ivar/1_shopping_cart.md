# Demo: Shoppingcart

How to build a shopping cart using Doubledots? Easy! Set up the html template a shoppingcart, add the custom reactions you need, and then define them. This demo shows how you can extract data from the dom, and then use this data to add elements to the DOM. And how you can use Doubledots in your moneymaking schemes.

## 1. HTML Template

First, we start with a simple HTML layout. This template includes a list of products and a cart where items will be listed as they are added.

```html
<html>
  <head>
    <title>Shopping Cart Example</title>
    <link rel='stylesheet' href='./style.css' type='text/css' />
  </head>
  <body>
    <div id="products">
      <div class="product" data-id="1">
        Product 1 <button class="add-to-cart">Add to Cart</button>
      </div>
      <div class="product" data-id="2">
        Product 2 <button class="add-to-cart">Add to Cart</button>
      </div>
      <!-- Add more products as needed -->
    </div>
    <div id="cart">
      <h2>Shopping Cart</h2>
      <div id="cart-items"></div>
    </div>
  </body>
</html>
```

Note that we have a button for each item, but that the `data-id` are attached to a different element.

## 2. Adding our first trigger:reaction

Next, we incorporate our initial custom reaction: `click:add_to_cart`. To find out where to place it, we try to find a balance between the following requirements:
1. *as close as possible* to the `target` of the `trigger:` event,
2. *as close as possible* to any element that we need to either extract data from or mutate, and
3. encompasses as many different trigger events as possible.


In the template above, that is the `<div id="products" click:add_to_cart>`. This element is:
1. the grandparent of the `<button>` target node (not super close, but ok),
2. The parent of the `<div class="product"..>` elements that we need to extract the `data-id` attribute value from (parent node is close), and
3. this grandparent will capture all the `click` events from all the `<button class="add-to-cart">` elements (many-events => one-trigger, nice).

```html
  <body>
    <div id="products" click:add_to_cart>
      <div class="product" data-id="1">
        Product 1 <button class="add-to-cart">Add to Cart</button>
      </div>
      <div class="product" data-id="2">
        Product 2 <button class="add-to-cart">Add to Cart</button>
      </div>
```

Balance struck!

## 3. Analyzing the reaction chain

The custom reactions usually perform many functions. When we first start analyzing a reaction, there are three different functions we look for:

1. :filter. Do we need to ensure that the trigger we are receiving is *meant for* this reaction? This is especially true when we place the trigger on an ancestor of the `target` element of an event, such as in this case.

2. :extractor. What data does the custom reaction need? In this example, we need to find the `data-id` near the button pressed.

3. :transformer. Do we need to transform the data in any way before we do something with it? Here is your chance to make those excellent *puuuuure* functions.

4. :effect or :side-effect. We likely want the reaction to do something with the data extracted. What and where?

In this example, we need to:
1. filter the `click` event so as to only accept `click`s on `<button class="add-to-cart">` elements. => `:is-add-button`

2. extract data from that button `target` => `:get-data-id`

3. make the template for the product in the shopping cart => `:make-cart-product`

4. add this product(id) to the cart => `:add-to-cart`

```html
  <body>
    <div id="products" click:is-add-button:get-data-id:make-cart-product:add-to-cart>
      <div class="product" data-id="1">
        Product 1 <button class="add-to-cart">Add to Cart</button>
      </div>
      <div class="product" data-id="2">
        Product 2 <button class="add-to-cart">Add to Cart</button>
      </div>
```

## 4. Defining the reaction

The last step is to define the reactions.

```js
// check if target is `button.add-to-cart`
customReactions.define('is-add-button', function (e) {
  if(!(e.target.matches("button.add-to-cart")))
    return customReactions.break;
});
// get data-id
customReactions.define('get-data-id', function (e) {
  return e.target.parentNode.getAttribute("data-id");
});
// make the template to put in the shopping cart
customReactions.define('make-cart-product', function (e, oi) {
  return `<cart-product data-id="${oi}">Product #${oi}</cart-product>`;
});
// add to cart
customReactions.define('add-to-cart', function (e, oi) {
  this.nextSiblingElement.insertAdjacentHtml("before-end", oi);
});
```

## 5. shopping cart symposium

```html
<html>
  <head>
    <title>Shopping Cart Example</title>
    <link rel='stylesheet' href='./style.css' type='text/css' />
  </head>
  <body>
    <div id="products">
      <div class="product" data-id="1">
        Product 1 <button class="add-to-cart">Add to Cart</button>
      </div>
      <div class="product" data-id="2">
        Product 2 <button class="add-to-cart">Add to Cart</button>
      </div>
      <!-- Add more products as needed -->
    </div>
    <div id="cart">
      <h2>Shopping Cart</h2>
      <div id="cart-items"></div>
    </div>
  </body>
  <script>
    // check if target is `button.add-to-cart`
    customReactions.define('is-add-button', function (e) {
      if(!(e.target.matches("button.add-to-cart")))
        return customReactions.break;
    });
    // get data-id
    customReactions.define('get-data-id', function (e) {
      return e.target.parentNode.getAttribute("data-id");
    });
    // make the template to put in the shopping cart
    customReactions.define('make-cart-product', function (e, oi) {
      return `<cart-product data-id="${oi}">Product #${oi}</cart-product>`;
    });
    // add to cart
    customReactions.define('add-to-cart', function (e, oi) {
      this.nextSiblingElement.querySelector("#cart-items"*.insertAdjacentHtml("before-end", oi);
    });
  </script>
</html>
```

1. When a user `click:` on an "Add to Cart" button within `div#products`, the `click` triggers the reaction chain.
2. First the `:is-add-button` filter ensures that the chain is only reacting to the relevant buttons.
3. Then the `:get-data-id` uses the `target` of the `click` event to find the `data-id` attribute on the correct `div.product` element.
4. Then the `:make-cart-product` processes the `id` to generate the right template we need to update the DOM.
5. And finally, the `:add-to-cart` effect updates the `div#cart-items` to add the item to the cart.

## 6. What did we learn?

- **triggers:** enable us to react to native events.
- **:filters** use the event, the DOM, and other sources to ensure that we are only reacting to relevant events.
- **:extractors** helps us find the data that we need, most often from the DOM or the event.
- **:transformers** can convert the data that we are working on into the form we need.
- **:effects** uses data from the reaction chain to modify the DOM.