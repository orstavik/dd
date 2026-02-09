# Chain reactions and custom reaction definitions (part 1)

The **name** of custom reactions and triggers can only contain: a) **lowercase** english letters, `.`, `-`, and `_` (regex `/[a-z_\.-]/`). This is because the reaction and trigger names will be written as HTML attributes in the DOM, separated by `:`, and these are then the only characters left that are legal in HTML attribute names.

>> NO capital letters! `<h1 inView:>hello</h1>` is exactly the same as `<h1 inview:>hello</h1>`. This means that you *can* write capital letters in your DoubleDots HTML template, but the machine will treat it as if it were in lowercase only.

## 1. Chain reactions

In DoubleDots you chain can reactions: `event:reaction1:reaction2:...`. When the `event` triggers, it is first passed to `:reaction1`, then `:reaction2`, etc.etc.

```html
<div click:get_date:add_two_days:subtract_one_month>hello</div>
```

When a reaction is called, it is passed *two* arguments: `e` *and* the output of the previous reaction, the `oi`. The `oi` is the return value of the previous reaction in the chain. 

> For the first reaction in the chain the `oi` is `undefined`.

## 2. Defining custom reactions

To define a custom reaction, you register a name and a callback function in the `customReactions` register. The callback function is a regular js function with *two* arguments, `(e, oi)`.
  
```html
<p click:get-text:log>Hello sunshine</p>
<script>
  customReactions.define("get-text", () => {
    return this.ownerElement.textContent;
  });
  customReactions.define("log", (e,oi) =>console.log(oi));
</script>
```

In the example above, we see:
1. the `:get-text` returns the `.textContent` of the element,
2. this return value becomes the second input argument to the next reaction,
3. so when `:log` prints its `oi`, it will print the `.textContent` of the owner element (in this particular reaction chain).

## 3. `this` in customReactions

At the start of the reaction chain, the `this` inside a custom reaction points to the attribute object (the `Attr`). The reason `this` is the attribute is:
1. the attribute's `.value`,
2. you can reach the element uniquely with `.ownerElement`.


```html
<div click:log_name:log_value:log_tagname="hello">
  sunshine
</div>

<script>
  customReactions.define("log_name", () => console.log(this.name));
  customReactions.define("log_value", () => console.log(this.value));
  customReactions.define("log_tagname", 
    () => console.log(this.ownerElement.tagName)
  );
</script>
```

This can be a little confusing because customReactions look a lot like normal event listeners, and in an event listener the `this` points to the element the listener is associated with. But. Since the element has many attributes, there is no direct way to find out exactly which custom attribute was triggered with the element as origin. Thus, with `this` being the attribute, then all relevant properties of a custom reaction can be reached using normal dom node traversal (ie. `this.ownerElement`, `this.value`, `this.ownerElement.parentNode.querySelector(..)` etc.). If `this` pointed to the element, then we would need to add some special context attribute or parameter to the custom reaction function to tell it where the `.value` associated with the custom reaction is.

In advanced DoubleDots syntax, you can change the `this` in your custom reaction chains. This is quite easy and simple once you get the hang of it. But until you get there, just think of `this` as always being the attribute node, and not the element node.

## 4. Can i use existing functions as custom reactions?

Yes! No problem. The function will then be passed the `e` and `oi` as arguments, but if that works for your function, your function will work as a reaction:

```html
<p click:get-text:log>Hello sunshine</p>
<script>
  customReactions.define("get-text", () => {
    return this.ownerElement.textContent;
  });
  // customReactions.define("log", (e, oi) => console.log(e, oi));
  customReactions.define("log", console.log);
</script>
```

When the virtual event loop inside doubledots invoke the reaction, it does so by `.call`-ing the registered function with the `Attr` object that is the custom reaction as the `this` object and passing it the trigger `Event` as the first argument, and the output (if any) from the previous reaction `oi` as the second argument. 

In practice, this excludes all methods (ie. functions that rely on and use `this` inside). But if the function doesn't use `this` and has an argument structure that fits with the `(e, oi)` argument list, then it is no problem just defining that function as a custom reaction.
