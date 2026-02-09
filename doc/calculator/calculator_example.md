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
