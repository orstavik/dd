# Demo: egg timer and `tick_:`

Tick, tock, tick, tock, egg timer in DoubleDots! How do we do `tick`-ing (timed intervals) in DoubleDots? And can we learn something about `setInterval` from seeing the DoubleDots parallel? This demo implements an egg timer using `tick_:`. `tick_:` is made using an infinite loop and `sleep(ms)`. The example also extracts data from the DOM, mutates the DOM, and manages in-DOM-state across components with custom triggers and reactions.

## 1. HTML Setup

We start with a basic HTML layout for the egg timer. It includes `div`s for setting the timer, showing the countdown, and a button to start/restart the timer. The two `div` for setting and counting down the time are on format `MM:SS`; set time is `editable`.

```html
<div id='eggTimer'>
  <div id='setTime' contenteditable='true'>05:00</div>
  <div id='countDown'>05:00</div>
  <button click:activate>Start/Restart</button>
</div>
```

## 2. Custom trigger: `tick_x:`

The app above needs a custom trigger. There is no event that tells us when *one* second has passed, and so we need a custom trigger to transpose the passage of time into an event in the DOM.

```js
customReactions.defineTrigger('tick_', class Interval extends Attr{
  upgrade(fullname) {
    this._time = Number(fullname.split("_")[1]);
    if (isNaN(this._time))
      throw new SyntaxError("tick_x: only accepts numbers as its 'x' argument.");
    //this.run() is triggered from changeCallback()
  }

  async run() {
    while (this.value) {
      this.dispatchEvent(new Event("tick"));
      await sleep(this._time);
    }
  }

  changeCallback(oldValue){
    if(oldValue) //already running
      return;
    if(!this.value) //we don't need to run it when we are stopping it
      return;
    this.run(); //it wasn't running, and now it is started.
  }
});
```

There is a problem with `tick_:`. We most likely need to turn it on and off. The timer is easy to stop: before we dispatch a new `tick`, we simply sets the `tick_:`s value to falsy. However, (re)starting the `tick_x:` is slightly more problematic: we need to be alerted when the attribute gets a `.value`. Fortunately, there is a builtin callback function in the trigger `class` called `changeCallback(oldValue)`. This method reacts to every *change* in the `.value`. This means that we only need to check if we should `run()` the `tick_x:` trigger when the trigger gets a new `.value`.

> Note. The `changeCallback()` is also triggered when `upgrade()` is triggered, so we only need to start the `tick`s from a single location.

## 3. Adding Reactions and Functionality

We add:
1. `click:copy-prevprev-prev:previous-tick-on` to the `<button>`. This copies the `.innerText` of the 2x`.previousSiblingElment` to the 1x`.prevousSiblingElement`. And then toggle the `tick_x:`'s attribute value on `previousSiblingElement`.
2. `tick_1000:countdown_1` on the `#countDown`. This will tick once every `1000`ms when it is on, and then `countdown_1` per second.

```html
<div id='eggTimer'>
  <div contenteditable='true' id='setTime'>05:00</div>
  <div id='countDown' tick_1000:countdown_1>05:00</div>
  <button click:copy-prevprev-prev:previous-tick-on>Start/Restart</button>
</div>
```

The app will then work as follows: When the user clicks the "Start/Restart" button, the countdown is reset and then started. Or reset, and then stopped.

## 3. Defining Reactions

Next, we define the necessary reactions and rules:

```js
customReactions.define('copy-prevprev-prev', function() {
  const prev = this.ownerElement.previousSiblingElement;
  prev.innerText = prev.previousSiblingElement.innerText;
});
customReactions.define('copy-prevprev-prev', function() {
  const prev = this.ownerElement.previousSiblingElement;
  const ticker = prev.getAttribute('tick_1000:countdown_1');
  ticker.value = ticker.value ? "" : "on";
});
customReactions.define('countdown_1', function() {
  const [_,m,s] = this.innerText.match(/(\d)+:(\d)+/);
  let time = m*60 + s;
  time -= 1;
  if(time < 0)
    time = 0;
  const min = math.floor(time/60).toString().padStart(2, '0');
  const sec = (time%60).toString().padStart(2, '0');
  innerText = `${min}:${sec}`;
});
```

## 4. `tick_x:` is stateful, and not very reactive

If you have a timer that should *always* be on, and *never* turned on/off during the applications life cycle, then `tick_x:` could have been made substantially simpler. However, most use-cases for `tick_x:` (and `setInterval` by extension) are stateful. They require the ticker be turned on/off dynamically. With `setInterval` this involves storing the intervalId number in memory calling `clearTimeout` on it. This is not per se difficult in js, but the problem can arise when you need to access this functionality from within a location in the DOM. For `tick_x:`, this require other triggers pulling the switch by toggling the attributes `.value`, and then internally using the `changeCallback()` and managing this reactive trigger to start or stop the inner infinite loop.

So. Even though it is human to *feel* that the `setInterval` is simple, it is *actually* stateful and therefore *much more* complex to integrate into your app than a simple non-stateful reaction-chain.
