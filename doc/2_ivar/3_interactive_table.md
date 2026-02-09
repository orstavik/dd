# Demo: Sortable table

Can we make Excel using Doubledots? In 5 lines of code? not really.. But! Can we make a sortable table in... around 25? Don't know. Let's try:D

The sortable table works like this. Each column in the sortable table has a header. When you `click` on that header, then the table will be sorted based on the values of that column. Ascending and descending. To make this work, the sortable table needs to move the `<tr>` up and down based on their value. And presto! Your little database turned `<table>` is suddenly a fully featured web app This is a common feature in many web applications, especially those that display tabular data, such as reports, lists, or databases.

## 1. HTML template only

We need a `<table>`, a row with column headers `<th>`, and rows with data fields `<td>`. We include a `data-sort` attribute on each `<th>` element to specify the column it represents.

```html
<table id="myTable">
 <thead>
    <tr>
      <th data-sort="name">Name</th>
      <th data-sort="age">Age</th>
      <th data-sort="city">City</th>
    </tr>
 </thead>
 <tbody>
    <tr>
      <td>Alice</td>
      <td>30</td>
      <td>New York</td>
    </tr>
    <tr>
      <td>Bob</td>
      <td>25</td>
      <td>Los Angeles</td>
    </tr>
    <tr>
      <td>Charlie</td>
      <td>35</td>
      <td>Chicago</td>
    </tr>
 </tbody>
</table>
```

## 2. adding custom reactions

We add a custom reactions on the `<tr>` in the `<thead>`.

```html
<table id="myTable">
 <thead click:-t:filter-data-sort:toggle-attr_desc:-next:sort-table>
    <tr >
      <th data-sort="name">Name</th>
      <th data-sort="age">Age</th>
      <th data-sort="city">City</th>
    </tr>
 </thead>
 <tbody>
    <tr>
      <td>Alice</td>
      <td>30</td>
      <td>New York</td>
    </tr>
 ...
```

* `click:-t:filter-data-sort:toggle-attr_desc:-next:sort-table`

This is a *chain* of 5 reactions that all will be triggered when a `click` is registered within the `<tr>` that house the `<th>`:
1. `:-t` transpose the origin of the reaction chain (ie. `this`) to the `e.target`.
2. `:filter-data-sort` extracts the `data-sort` and `desc` attributes' value, and `break` the reaction chain if none present.
3. `:toggle-attr_desc` toggles the `desc` attribute on/off on the `this` element (which the first reaction set to the `e.target`). The `:toggle-attr_desc` lets the `oi` argument just pass through it.
4. `:-next` transposes the origin to `currentElement.nextSiblingElement`, ie. `<tbody>`.
5. `:sort-table` receives the `oi` with the `data-sort` and `desc` value, and does *the work* of sorting its `<tr>` children up and down.

## 3. Defining the reactions

Next, we'll define a custom reaction in JavaScript that handles the sorting logic. Reaction 1. `:-t`, `:toggle-attr_desc`, and 4. `:-next` are given us by the dash `:-` and `:toggle-attr_desc` reaction rules, so we skip these.

```js
customReactions.define("filter-data-sort", function(){
  if(!this.hasAttribute("data-sort"))
    return customReactions.break;
  return [this.getAttribute("data-sort"), this.getAttribute("desc")];
});

customReactions.define("sort-table", function(e, oi) {
  const [sortKey, desc] = oi;
  const rows = Array.from(this.querySelectorAll("tr"));
  rows.sort((a, b) => {
    const one = a.querySelector(`data-sort="${sortKey}"`).textContent;
    const two = b.querySelector(`data-sort="${sortKey}"`).textContent;
    return one.localeCompare(two) * (desc ? -1 : 1);
  });
  rows.forEach(row => this.appendChild(row));
});
```

Nice! We can make a sortable table in DoubleDots with only 15 lines of code defining JS functions.

## Notes about DoubleDots

There are a couple of things to note here.
1. The `oi` output-input argument in the reaction chain is useful to contain state that is meant for the reaction chain only. The `oi` is the `return` value of one `:reaction` that becomes the second argument for the next `:reaction`.
2. We select the `<thead>` as the location for the reaction chain. This gives us the best balanced position between the (multiple) locations of the trigger(s) and the single location of the effect.
3. The use of the `:-` dash rule gives us the ability to connect to the relevant locations in the DOM fairly easily.
4. DoubleDots does *not* enable you to connect *loose* JS elements to the DOM. But. DoubleDots allows for moving elements *within* the same document root. So, if you need to add elements, use `.innerHTML`; if you need to remove elements, they will be removed permanently; and if you need to move elements, add them to their new location without removing them first.