Known steps:

1. make the layout of a calculator. This can likely be stolen from template on the web, just find one with a simple template. Use the two lines variant, 1 = state, 2 = input. That is the simplest to make.

2. add reactions to the different buttons.

We need to break the task down in the different steps. We need to explain what happens in the different steps. I think that we should be able to create the calculator now.

### QUESTIONS

A. How would we pass an argument to a function? If an event is similar to another it is common for a function to be derived that needs a variable to assign the function's behaviour. Defining the same funtion multiple times would be bloated. 

>> add the value either in an attribute on the element/parentElement or elsewhere in the dom, for example, or hardcode it in the custom reaction def.

>> static arguments can be passed as part of the name, so to speak. look for tutorial on how to write script higher-order custom reaction functions.

B. Can customReactions access the event? Data could be retrieved from attributes rather than variables.

>> yes. The `e` is the first argument passed to the custom reaction function.

C. What considerations are beeing taken for accessibility of disabled people? Some page readers use semantics to read page parts out loud.

>> except from the example with replacing the `<a href>` tag with `click:open`, html doubledots only add info to the dom, it doesn't remove it. So. For accessibility readers and the like, this more stateful dom will be easier to adapt for accessiblity concerns.

D. How can I add eventlisteners to the window? such as scroll or keypresses.

>> global event listeners: `_scroll`, and `_keypress`.

E. Is it .parentElement or .ownerElement? When should each be made?

>> the `this` is the attribute, *not* the element. And thus the `this.ownerElement` is from the custom reaction attribute => element. (todo should we implement `.element` and `.parent`..)

F. How does the chaining of operators work? What are the connectors available? Is there a template to follow when using events conditionally?

>> See a chapter on chaining and the (`e`, `i`) and `i` input (and the third argument position. No, this we implement as a .getter on the `Attr` prototype!! 
`function(){ return this.ownerElement.attributes.indexOf(this)});`

Currently only click events are defined.

Part 1: simple calculator
First, we implement using small functions we write directly.

Part 2: scientific calculator
For scientific calculator, we import the Math.js lib and a couple of functions from there to illustrate how external libraries can be used in the system.
Math.js library is used for evaluations.


### Strategy: development

1. made the template. and that wasn't hard, it was nice to see the code, and you got the buttons and screen visible in the browser.

2. and then, we have buttons. press the button with a `click` and then add the value to the screen.

3. but we added the calculation also as string. js allows this, but it is a little `eval()`-ish. and so, we want to do it the calculator way. add numbers to the end of input, and when press a operator button, do the operator on the result, input and set the new value in the result only. 

3b. Lesson learned. Don't be too afraid of making a new customReaction. They are like little kittens. One is not enough, and you don't want to swarm your appartment with them, but having a handful in one basket is nice and cosy.

4. what about keypresses? yes! we do keypresses, and here we can do them globally. Or on a wrapping `<form>` if our calculator doesn't have the entire web page to itself. Yes, global listeners are nice, and then we use a single reaction to execute the functions.
>> redundancy? Yes, maybe. If we want, we can convert the keypresses into button presses. That would follow the logic of our development process. But! We can also convert the button presses to keypresses. That would be nicer.

5. And we are learning as we go. We actually want the custom reactions to listen on a `<form>` element around the table. And then we want the clicks to be transferred so that it can work against the children with particular `id` values. That will be a nice and clean loopkup structure, not accidentally mixing itself up with the dom.
