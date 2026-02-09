
## TASK ##

I want you to give me ideas for examples I can use as use cases in HTML using my framework called Doubledots.  I want only a short description of each example with its possible reactions.

## FURTHER EXPLANATION ##

Doubledots uses attributes in HTML elements to assign events to them.

It works by writing a chain of events, starting with a 'trigger' such as click or hover or focus, followed by chaining reactions that are separated with ' : '. 

In this chaining, reactions pass `(e , oi)` which are the event object and the last function's return (oi = output/input).

For example, adding a functionality to an element for it to change a value would be written 'click:checkIfOk:extractData:updateValue'. 

1. The `click` trigger
2. The `checkIfOk` reaction to validate the input
3. The `extractData` reaction to get the new value
4. The `updateValue` reaction to change the value in the DOM

This attribute describes the steps the event has. These reaction names are later defined with their behavior like such: 

```js
    customReaction.define('checkIfOk', (e, oi) => {
    // Perform validation and return
    })
```

IMPORTANT: Leave the content of the definitions as a description of what the reaction does inside a comment, like above.

Categories of reactions

- trigger: (click, in-view)
- filter (read => to break):
- extraction (read => to oi output):
- effect (write => DOM):
- side-effect (write => outside of DOM):
- schedulers (throttle, debounce, setTimeout, ready)
- pure reaction (read only e and oi, make no changes to input argument objects, only produce a new oi output.: (pure functions that turn data from one form into another, or filter or maps that data. It fitlers, but it only filters the input data. Often combined with the :filter into a single reaction).

## STEPS ##

1. Layout the html needed for the example. Use minimal to no styles.
2. Breakdown the functionality into it's triggers and reactions.
3. Chain together the attributes and assign it to the corresponding element.


## EXAMPLE ##

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