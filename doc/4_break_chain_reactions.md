# Breaking chain reactions

There are two ways a chain reaction can be broken:
1. if the custom reaction function `return` a special object `customReaction.break`, or
2. if the custom reaction function `throws` an `Error`.

## 1. `customReactions.break`

By returning `customReactions.break`, the custom reaction chain will simply stop running and let the virtual event loop continue.

```html
<div click:one:stop:two>hello sunshine</div>
<script>
customReactions.define("one", ()=> console.log("one"));
customReactions.define("stop", ()=> customReactions.break);
customReactions.define("two", ()=> console.log("two"));
</script>
```

When somebody `click` on the `<div>`, then:
1. the `:one` reaction will run and print `one` in the console,
2. the `:stop` reaction will run and return `customReactions.break`, which
3. will halt the execution of the reaction chain blocking the `:two` reaction from ever being invoked.

>> Note! Remember to **return** `customReactions.break`, do NOT throw it.

## 2. `Error`s in reactions

Like when you return a `customReaction.break`, any uncaught `Error`s that occur inside a reaction function will also breaks the reaction chain. But, unlike the `customReaction.break`s, these uncaught `Error`s will also spawn a `error` event that will be dispatched to the virtual event loop. This `error` event will have several properties that might be useful when debugging:
1. `.reaction`: the custom reaction attribute from where the `Error` occured,
2. `.index`: the reaction function that `throw` the `Error`,
3. `.oi`: the input to that reaction function,
4. `.triggerEvent`: the `event` passed into the custom reaction, and
5. `.error`: the JS `Error` object thrown.

```html
<body error:log_error>
<div click:one:error:two>hello sunshine</div>
<script>
  function logName(e){
    const reactionName = this.name.split(":")[customReaction.index];
    console.log(reactionName);
    return reactionName;
  }
customReactions.define("one", logName);
customReactions.define("error", function()=>{throw new Error("omg");});
customReactions.define("two", logName);
customReactions.define("log_error", function(e){
  console.error(e.reaction.name); 
  console.error(e.reaction.index); 
  console.error(e.reaction.event); 
  console.error(e.reaction.oi); 
  console.error(e.reaction.error); 
});
</script>
</body>
```

## 3. Filters are like if-reactions

Custom reaction functions that sometimes break the reaction chain are called filters. Filters check the state of for example:

1. the event,
2. the attribute `.value`,
3. the surrounding dom (such as another attribute or the content of the `.ownerElement` or another ancestor, sibling, descendant, and/or querySelected element), and/or
4. Some other external source (such as a web database, a sensor, or similar).

If some state conditions are (not) met, then the filter will `.break` the custom reaction, otherwise it will let the chain reaction continue.

A filter is not limited to `.break`-ing the reaction chain. If you want, and you often do, you can let the filter extract and parse and reduce state data the way you need. The ready-made state view can then be passed to the next reaction to work with (as it's second `oi` argument).

```html
<p 
  click:words_with_o:log
  click:words_with_x:log
  click:words_with_e:log
>hello sunshine</p>
<script>
  function words_with(str, c){
    return str.split(" ").filter(w => w.indexOf(c) >= 0);
  }
  customReactions.define("words_with_o", function(){
    const o_words = words_with(this.ownerElement.innerText,"o");
    if(!o_words.length)
      return customReactions.break;  
    return o_words;
  });
  customReactions.define("words_with_x", function(){
    const x_words = words_with(this.ownerElement.innerText,"x");
    if(!x_words.length)
      return customReactions.break;  
    return x_words;
  });
  customReactions.define("words_with_e", function(){
    const e_words =  words_with(this.ownerElement.innerText,"e");
    if(!e_words.length)
      return customReactions.break;  
    return e_words;
  });
</script>
```