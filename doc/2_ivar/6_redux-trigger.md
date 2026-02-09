# Demo: single-state-trigger

Having the DOM be the single state is not always possible. The reason is that the DOM is also the view. So, if you need to show the same state in two different places, then you need to *either* have one state in the dom be *mirrored* by another element (possible, the DOM stays as the single state) *or* you have a single state outside of the dom be mirrored in two places (a redux style single state application). If the connections between the different states are complex (which they quickly become), then the best course of action is likely to have *one* state function as a non-viewable model (serializable in the dom or transient outside dom) up at the root of the document and then have it mirrored into several different locations. 

Redux

1. state: trigger. As a singleton callback. It will register a :reaction too, with the same name? And then it will register.
2. A trigger/reaction pair.
3. So the reaction receives production, and then the triggers register for callbacks. And the triggers dispatch the subscriptions.

We need two different reaction receivers
:state-update, and :state-setup.

This is a callback trigger.
It has a reaction that triggers the callbacks. Or it can poll an internet resource.

Actually. We should have different types of triggers:
1. Observer triggers.
2. Timer triggers. Can be better than :sleep reactions because they are removed and not in the event loop if not needed. So they are a variation around the same theme.
3. Callback triggers. Like redux.
4. Custom poll trigger. Polling a network resource. Or a server resource.
5. Socket trigger? I am not sure, but i think sockets can fit nicely here.
6. StateMachineAttr. Conductor of orchestra of reactions state machine.



The _global reactions are a means of getting reactions situated in the dom to react to global events or events in other branches of the dom. The _global reactions are run for any event with the same name at the beginning of propagation. The sequence between _global reactions for the same event is first-added-first-serve, ie. it does often, but not necessarily follow the sequence of the elements in the dom depth-first.

The great thing about the _global reactions is that they allow us to *subscribe* real easy. This means that we can quite easily set up a redux style store.

A single state system like redux consists of primarily 3 entities:
1. The `store`. The store contains the single state (a big JSON object). The store receives input of changes. The store processes these inputs to fit them in the store JSON object. The store then ensures certain aspects of the data unit, such as immutability (read-only) and preparing the object for identity-matching. Finally, the store will dispatch an event.

2. The "subscribers". The subscribers are reactions to changes in the data store. In DoubleDots these subscribers will listen for _global events that signify changes in the data store. In DoubleDots you can choose if you want the store to filter the events and reactions, or if you want the subscribing reactions to do it. In DoubleDots you can also choose if you want to create your own triggers for reactions, or if you just want to use _global events.

3. The "state changers". These are reactions that produce the events with the state changes that the store is listening for. These reactions can be driven by external web resources or user input. The state changers just create events with new data that intended to be merged into the store's single state.

> The main problem for such a system is primarily how to *efficiently* trigger only the relevant subscribers. Out of the box DoubleDots offer *two* mechanisms for creating such efficient triggers: _global reactions and custom triggers. This syntactic support means that implementing your own and importing existing redux-style state machines is super simple and easy.

## Example: todo list

Let's construct a demo for an interactive to-do list using the Doubledots framework. We will focus on the store and the subscribers, as this is where the interesting parts are. This demonstration will implement the functionality for adding, updating, and reacting to changes in a to-do list.

## HTML Structure

The todo list will be represented as an ordered list (`<ol>`) where each item (`<li>`) is editable and has a unique ID. We'll also include a mechanism for adding new items to the list.

```html
<div>
  <input type="text" placeholder="Add new todo" />
  <button>Add</button>
  <ol>
    <li editable="true" id="task37">wash the dog</li>
    <li editable="true" id="task45">wash the car</li>
    <li editable="true" id="task21">wash the clothes</li>
    <li editable="true" id="task911">seek help, filthy man</li>
  </ol>
</div>
```

## Adding Doubledots Reactions

Our goal is to create a system that unifies the state in the app in a single JSON object. To create a single source of truth. We then want this single state to be immutable and read-only and checking equality using fast identity-checks. We then want to trigger updates of the view in the DOM to asap so that what is presented on screen matches the reality in the single state. We divide these reactions into 3 sections: the store, the subscribers, and the state changers.

### The `:store`

The redux state machine is actually quite simple. Because we control the new-state producers, we can ensure that all the state changers come in the form of a single event: `new-state`. This means that we can make our state-machine as a simple reaction.

Our store uses memoization to enable fast, simple, and secure state management. It will then dispatch an event `state-change` that the subscribers can pick up and react to using a _global listener. 

### The `state-change:` subscribers 

The `state-change:` reactions will a) filter based on equality of previous input and only when the value has changed b) effect a change based on the incoming data. 

### The `new-state` producers

As a reaction to a user action, a couple of reaction chains will produce `new-state` events. These events will bubble up to the `:store` that we have placed on the `#todoApp` element.

## The full picture

```html
<div state-change:store:dispatch-update>
  <input type="text" placeholder="Add new todo" />
  <button click:extract-new-task:dispatch-change:clear-prev>Add</button>
  <ol 
  change:extract-edit-task:dispatch-change
  _state-change:filter-identity:update-inner
  >
    <li editable="true" id="task37">wash the dog</li>
    <li editable="true" id="task45">wash the car</li>
    <li editable="true" id="task21">wash the clothes</li>
    <li editable="true" id="task911">seek help, filthy man</li>
  </ol>
</div>
```

## Implementing the reactions

```js
//producer land
customReactions.define("extract-new-tast", function(e,oi) {
  return {"task.*": this.previousSiblingElement.text}
});
customReactions.define("dispatch-change", function(e,oi) {
  const e = new Event("new-change");
  e.data = oi;
  this.ownerElement.dispatchEvent(e);
  return oi;
});
customReactions.define("clear-prev", function(e,oi) {
  this.previousSiblingElement.text ="";
  return oi;
});
customReactions.define("extract-edit-task", function(e,oi) {
  return {`task.${e.target.id}`: e.target.innerText};
});
//subscriber land
const idFilter = new WeakMap();
customReactions.define("filter-identity", function(e,oi) {
  if (e.data === idFilter.get(this))
    return customReactions.break;
  return e.data;
});
customReactions.define("update-inner", function(e,oi) {
  // take the full 
});
//store land
customReactions.define("store", function(e, oi) {

});
customReactions.define("dispatch-update", function(e, oi) {
  const e = new Event("state-change");
  e.data = oi;
  document.documentElement.dispatchEvent(e);
  return oi;
});
```
1. **Adding new To-do Items:** When the "Add" button is clicked, a new to-do item is created and appended to the list. This uses a simple click reaction.

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