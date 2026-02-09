Certainly! Let's dive into the example of creating interactive tables with the Doubledots framework. This example will demonstrate how to implement a sortable table where users can click on column headers to sort the table by that column. This is a common feature in many web applications, especially those that display tabular data, such as reports, lists, or databases.

### Explanation

The goal of this example is to create a table that users can interact with to sort its contents. This is achieved by adding custom attributes to the table headers (`<th>` elements) that define the sorting behavior. When a user clicks on a header, the table's data is sorted based on the corresponding column, and the table is updated to reflect the new order.

### Code Example

First, let's define the HTML structure for our table. We'll include a `data-sort` attribute on each `<th>` element to specify the column it represents.

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

Next, we'll define a custom reaction in JavaScript that handles the sorting logic. This reaction will be triggered when a user clicks on a table header (`<th>` element) with a `data-sort` attribute.

```javascript
customReactions.define("click:sortTable", function(e) {
 e.preventDefault(); // Prevent the default click action
 const table = this.ownerElement;
 const sortKey = this.getAttribute("data-sort");
 const rows = Array.from(table.querySelectorAll("tbody tr"));

 // Sort the rows based on the sortKey
 rows.sort((a, b) => {
    const aValue = a.querySelector(`td[data-sort="${sortKey}"]`).textContent;
    const bValue = b.querySelector(`td[data-sort="${sortKey}"]`).textContent;
    return aValue.localeCompare(bValue);
 });

 // Update the table body with the sorted rows
 const tbody = table.querySelector("tbody");
 rows.forEach(row => tbody.appendChild(row));
});
```

Finally, we need to ensure that our custom reaction is applied to the table headers. We can do this by adding the `click:sortTable` attribute to each `<th>` element in our HTML.

```html
<th click:sortTable data-sort="name">Name</th>
<th click:sortTable data-sort="age">Age</th>
<th click:sortTable data-sort="city">City</th>
```

### How It Works

When a user clicks on a table header, the `click:sortTable` reaction is triggered. This reaction prevents the default click action, retrieves the `data-sort` attribute value to determine which column to sort by, and then sorts the table rows based on the values in that column. After sorting, the table body is updated to reflect the new order of the rows.

This example demonstrates how the Doubledots framework can be used to create interactive and dynamic web content with minimal JavaScript, focusing on enhancing the user experience through intuitive interactions.