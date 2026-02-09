Let's create an example of how to build a shopping cart using Doubledots. This will demonstrate the interactive aspects of a webpage where users can add items to their shopping cart, reflecting a typical e-commerce functionality.

### 1. HTML Template

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

### 2. Adding Functionality with Doubledots

Next, we incorporate Doubledots triggers and reactions directly into our HTML to add functionality.

```html
<div id="products" click:add_to_cart>
  <!-- Product items -->
</div>
<script>
  customReactions.define('is_product_button', function (e) {
    // Check if clicked element is a 'Add to Cart' button
    if (e.target.className.includes('add-to-cart')) return e.target;
    throw customReactions.break;
  });

  customReactions.define('add_to_cart', function (e, clickedButton) {
    const productID = clickedButton.closest('.product').getAttribute('data-id');
    const cart = document.querySelector('#cart-items');
    // Add the product to the cart UI based on the productID
  });
</script>
```

### 3. Explanation of Functionality

- When a user clicks on an "Add to Cart" button within the `#products` div, the click event triggers the `add_to_cart` reaction chain.
- The `is_product_button` reaction acts as a filter to ensure that only clicks on the "Add to Cart" buttons are processed. It checks if the clicked element has a class `add-to-cart`. If not, it halts the chain.
- The `add_to_cart` reaction is responsible for adding the item to the cart. It finds the parent `.product` div of the clicked button to get the product's ID, then updates the cart's UI by appending the product information to the `#cart-items` div.

### 4. Role of Different Reactions

- **Trigger:** The `click` event on the "Add to Cart" buttons.
- **Filter:** The `is_product_button` reaction filters out clicks that are not on the "Add to Cart" buttons.
- **Extractor:** Not explicitly used in this example, but in a more complex scenario, you might extract data like product details from the event context.
- **Mutator/Effect:** The `add_to_cart` reaction modifies the DOM by adding the selected product to the cart.
- **Side-effect:** Not used in this example, but you could have reactions that, for example, send data to a server.
- **Scheduler:** Not used in this example, but could involve delaying a reaction, like debouncing multiple clicks.
- **Pure Reaction:** Not explicitly shown here, but a pure reaction might involve calculating the total cost without side effects, purely based on input data.