# Demo: building infinite scroll with doubledots.

In this demo we will build an infinite scroll functionality that relies on observing a loader element.

## 1. Template

We make a basic template for the functionality.

```html
<body>
  <h1>Infinite Scroll Example</h1>

  <div id="grid"></div>
  <div inView:loadmore>Loading</div>
</body>
```