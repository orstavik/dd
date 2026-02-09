Based on the detailed examples and concepts provided in the `reactions.json` file, let's construct a demo for an interactive to-do list using the Doubledots framework, focusing on the request for a reaction state machine that acts as a redux-replacer. This demonstration will implement the functionality for adding, updating, and reacting to changes in a to-do list.

### HTML Structure

We'll start by defining the HTML structure. The to-do list will be represented as an ordered list (`<ol>`) where each item (`<li>`) is editable and has a unique ID. We'll also include a mechanism for adding new items to the list.

```html
<div id="todoApp">
  <input type="text" id="newTodo" placeholder="Add new todo" />
  <button id="addTodo">Add</button>
  <ol id="todoList">
    <!-- To-do items will be added here -->
  </ol>
</div>
```

### Adding Doubledots Reactions

Next, we'll use Doubledots to add dynamic functionality to the to-do list. Our goal is to create a system where updates to the list items trigger changes that are handled efficiently, with minimal updates to the existing object, and events are dispatched to react to these changes.

1. **Adding New To-do Items:** When the "Add" button is clicked, a new to-do item is created and appended to the list. This uses a simple click reaction.

2. **Editing To-do Items:** Each to-do item (`<li>`) is editable. Changes to an item's content will trigger an update reaction chain. The list (`<ol>`) element listens for these changes and acts accordingly.

3. **Reacting to Changes:** Upon any change, a memoized function updates the internal state of the to-do list with minimal changes. Subsequently, update events are dispatched for all changed reactions.

```html
<script>
customReactions.define('addTodo', function() {
  const newTodoText = document.getElementById('newTodo').value;
  if(newTodoText) {
    const todoList = document.getElementById('todoList');
    const newTodoItem = document.createElement('li');
    newTodoItem.contentEditable = true;
    newTodoItem.id = 'todo-' + (todoList.children.length + 1);
    newTodoItem.innerText = newTodoText;
    todoList.appendChild(newTodoItem);
    document.getElementById('newTodo').value = ''; // Reset input field
  }
});

customReactions.define('updateTodo', function(e) {
  // Logic to handle the updated to-do item.
  // This could involve updating an internal model and dispatching events for changed items.
});

document.getElementById('addTodo').setAttribute('click:addTodo', '');
document.getElementById('todoList').setAttribute('change:updateTodo', '');
</script>
```

In the above script:
- The `addTodo` reaction is defined to handle adding new to-do items to the list.
- The `updateTodo` reaction would contain logic to handle changes to individual to-do items. This could involve updating an internal data model and dispatching events to notify other parts of the application about the change.
- The `setAttribute` method is used to attach these reactions to the respective elements. Note: This pseudocode assumes the existence of a custom API for attaching reactions, which would be part of the Doubledots framework.

This example demonstrates how to use Doubledots to create a dynamic, interactive to-do list application. The focus is on leveraging custom reactions to manage user interactions and application state in a declarative and efficient manner.