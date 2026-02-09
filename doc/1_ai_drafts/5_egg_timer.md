For this demo, we'll design an interactive egg timer using DoubleDots. This example will demonstrate the use of `sleep(ms)` to emulate `setInterval` functionality, perform complex DOM mutations, and manage state across components with custom triggers and reactions.

## 1. HTML Setup

We start with a basic HTML layout for the egg timer. It includes divs for setting the timer, showing the countdown, and a button to start/restart the timer. The set time div is editable and formatted as MM:SS.

```html
<div id='eggTimer'>
  <div contenteditable='true' id='setTime'>05:00</div>
  <div id='countDown'>05:00</div>
  <button click:activate>Start/Restart</button>
</div>
```

## 2. Adding Reactions and Functionality

The button's `click:activate` reaction toggles the `active` attribute on `#eggTimer`. When activated, we initiate a countdown from the set time to zero, updating every second.

```html
<div id='eggTimer' interval_:filter_parent_active:decrement_time:sleeps_1>
  <div contenteditable='true' id='setTime'>05:00</div>
  <div id='countDown'>05:00</div>
  <button click:activate>Start/Restart</button>
</div>
```

The `interval_` custom trigger on the parent div starts the countdown process, first checking if the timer is active with `:filter_parent_active`, then decrementing the countdown time with `:decrement_time`, and finally pausing for a second with `:sleeps_1` before repeating.

## 3. Defining Reactions

Next, we define the necessary reactions and rules:

```js
// Toggle active attribute
customReactions.define('activate', function(e) {
  this.ownerElement.toggleAttribute('active');
  const setTimeText = this.ownerElement.querySelector('#setTime').innerText;
  this.ownerElement.querySelector('#countDown').innerText = setTimeText;
});

// Filter reaction to check if the parent is active
customReactions.define('filter_parent_active', function() {
  if(!this.ownerElement.hasAttribute('active')) {
    throw customReactions.break;
  }
});

// Reaction to decrement the countdown time
customReactions.define('decrement_time', function() {
  const countDown = this.ownerElement.querySelector('#countDown');
  let [minutes, seconds] = countDown.innerText.split(':').map(Number);
  if(seconds === 0) {
    if(minutes === 0) {
      this.ownerElement.removeAttribute('active'); // Stop the timer
      throw customReactions.break;
    }
    minutes--;
    seconds = 59;
  } else {
    seconds--;
  }
  countDown.innerText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
});

// Sleep for 1 second
customReactions.define('sleeps_1', async function() {
  await sleep(1000);
});
```

## 4. Explanation

- When the user clicks the "Start/Restart" button, the `activate` reaction toggles the `active` attribute on the egg timer, resets the countdown based on the set time, and initiates the countdown.
- The `interval_` trigger, combined with `:filter_parent_active`, ensures the countdown only proceeds if the timer is active.
- The `:decrement_time` reaction calculates and updates the countdown every second.
- The `:sleeps_1` reaction pauses the countdown loop for one second between updates, creating an interval effect.

This demo effectively uses the `sleep(ms)` function to replace `setInterval` with a more flexible, event-driven approach suitable for complex interactions like an egg timer.