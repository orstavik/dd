# Demo: Build a theme toggle.

In this basic demo we will implement a theme toggle for our html with doubledots.

## 1. Template

We set up a basic html to see the results from our toggle. 

```html
<body>
  <h1>Theme Toggle Example</h1>

  <button click:themeTogle>Toggle Theme</button>
</body>
```

## 2. Define reaction

We manage the toggle by defining a reaction that when triggered, will toggle the 'dark' class.

```html
  <script>
    customReaction.define('themeTogle', () => {
      document.body.classList.toggle('dark')
    })
  </script>
```

And done! The themeTogle reaction can be assigned to other events aswell.


<!-- Should this example be continued? We could add a window event that when on load, checks cache for a preference stored previously, or browser preferences. -->