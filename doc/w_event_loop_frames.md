# Event loop frames

The HTML DoubleDots runtime has a single flow of control: the `eventLoop`.

The `eventLoop` is an array of `MacroTask`s. The `MacroTask` contains:
1. the `target`,
2. the `composedPath` at the time of propagation start,
3. the `event`, and
4. the table of `MicroTasks` per element-attribute in the `composedPath` that fits with the `event.type`. 

Each `MicroTask` contains:
1. the `attribute`,

and the lists of:

2. reaction names,
3. `input` arguments for each reaction,
4. `return` `output` values,
5. reaction `origins`.

## The EventLoop rubics cube

The `eventLoop` is only a list of macro tasks. You can think of it as a stack of cards, where each card is a `MacroTask`.

### MacroFrame is a DOM snapshot

The `MacroTask` is conceptually a snapshot of the DOM: a table of elements and list of attributes. The list of elements is frozen once the `MacroTask` begins. The list of attributes are frozen once the element is first checked for matching attributes.

```json
[
  { html: [ at42, at99 ] },
  { body: [ at67 ] },
  { div: [] },
  { h1: [ at12 ] },
]
```

### MicroFrame is an execution snapshot

The `MicroTask` is the context of execution of each reaction. It records the input, output, and origin (`this`) for each reaction call.

```json
[
  {name1, at, event, output1},
  {name2, at, output1, output2},
  {name3, output2, output1, output3},
]
```
