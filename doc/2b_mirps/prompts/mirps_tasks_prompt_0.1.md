
## TASK ##

I want you to write an example of a modal in HTML using my framework called Doubledots.  Use little to none styles. It should have 2 button that on click, display different content on an opening modal. This modal should have a close button that closes the modal.

## FURTHER EXPLANATION ##

Doubledots uses attributes in HTML elements to assign events to them. This framework deprecates .addEventListener.

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

# Demo: How to build a calculator

## 1. Template first

In this example we implement doubledots on a classic calculator. We start with the pure, normal html template and lay it out:

```html

only the calculator, link to the css, table, no custom reaction nor script

<html>
  <head>
    <title>Simple Calculator</title>
    <link rel="stylesheet" href="./calc.css" type="text/css" />
  </head>
  <body>
    <table id="calculator">
      <tr>
        <td id="result"></td>
      </tr>
      <tr>
        <td id="operation"></td>
      </tr>
      <tr>
        <td id="input"></td>
      </tr>
      <tr>
        <td class="operator">C</td>
      </tr>
      <tr>
        <td class="number">1</td>
        <td class="number">2</td>
        <td class="number">3</td>
        <td class="operator">/</td>
      </tr>
      <tr>
        <td class="number">4</td>
        <td class="number">5</td>
        <td class="number">6</td>
        <td class="operator">*</td>
      </tr>
      <tr>
        <td class="number">7</td>
        <td class="number">8</td>
        <td class="number">9</td>
        <td class="operator">-</td>
      </tr>
      <tr>
        <td class="number">0</td>
        <td class="number">.</td>
        <td class="operator">=</td>
        <td class="operator">+</td>
      </tr>
    </table>
  </body>
</html>
```

## 2. Add first reaction

The first reaciton is to add numbers to the input, when we click on a button inside the calculator. First, we do this by adding a the custom reaction `click:add_number` to the container parent that is the closest ancestor to all the elements involved.

```html

<table id="calculator" click:add_number>
  . . .
</table>
<script>
  customReactions.define("add_number", function (e, i) {
    const input = this.ownerElement.querySelector("#input");
    input.innerText += i;
  });
</script>
```

Problems: the reaction doesn't have a check. if you click something other than a number, we have errors.
## 3. add filter

How to fix this? we add a filter in the chain `click:is_number:add_number`

```html
<table id="calculator" click:add_number>
  . . .
</table>
<script>
  customReactions.define("is_number", function (e) {
    if (["result", "operation", "input"].indexOf(e.target.id) >= 0) throw customReactions.break;
    if (e.target.innerText.matches(/0-9/)) return e.target.innerText;
    throw customReactions.break;
  });
  customReactions.define("add_number", function (e, i) {
    const input = this.ownerElement.querySelector("#input");
    input.innerText += i;
  });
</script>
```
## 4. add the operator function

Let's build the entire calculator. Here we need to explain the logic with the previous operator and the hidden result etc. Once the strategy is explained, just add the extra custom reaction definitions, and the custom reaction invocations on the `<table>` element.

```html
<table id="calculator" _keypress:is_number:add_number>
  . . .
</table>
<script>
  customReactions.define("is_operator", function (e) {
    if (["result", "operation", "input"].indexOf(e.target.id) >= 0) throw customReactions.break;
    if (e.type === "keypress") {
      if (e.key === "Esc") return "clear";
      if (["=", "+", "-", "/", "*"].indexOf(e.key) >= 0) return e.key;
    }
    if (e.type === "click") {
      const targetTxt = e.target.innerText;
      if (["=", "+", "-", "/", "*", "clear"].indexOf(targetTxt) >= 0) return targetTxt;
    }
    throw customReactions.break;
  });
  customReactions.define("do_operator", function (e, i) {
    . . . (calculator logic) . . .
  });
</script>
```

## 5. add the keypress functionality

With a calculator you want multiple events. Add reactions for keypress too.

```html
<table id="calculator" _keypress:is_number:add_number>
  . . .
</table>
<script>
  customReactions.define("is_number", function (e) {
    if (["result", "operation", "input"].indexOf(e.target.id) >= 0) throw customReactions.break;
    if (e.type === "keypress" && e.key.matches(/0-9/)) return e.key;
    if (e.type === "click" && e.target.innerText.matches(/0-9/)) return e.target.innerText;
    throw customReactions.break;
  });
  customReactions.define("add_number", function (e, i) {
    const input = this.ownerElement.querySelector("#input");
    input.innerText += i;
  });
</script>
```