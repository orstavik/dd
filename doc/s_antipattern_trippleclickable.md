# Antipattern: `trippleclickable`

## Trigger based state machine: `trippleclickable`

The simple `click` is a gesture that listens for multiple events, so at first glance, the `trippleclick` seems apt for a trigger state machine. We therefore make `trippleclickable`: a small trigger based state machine that dispatches a custom event `trippleclick` when a user `click` on an element three times in quick succession.

```html
<div trippleclick:log>
  <h1 trippleclickable_300>hello sunshine</h1>
</div>

<script>
class TrippleClickable extends Attr {
  private let lastTime=0;
  private let count=0;
  private let duration;
  private static const child = "click:--trippleclickable:.click";
  
  upgrade(name) {
    this.duration = parseInt(name.split("_")[1]) || 300;
    this.ownerElement.setAttribute(child);
  }

  remove() {
    this.ownerElement.removeAttribute(child);
    super.remove();
  }

  click(e) {
    if(!this.isConnected))
      return this.remove();
    const now = performance.now();
    if(now-lastTime>duration)
      lastTime = count = 0;
    else if (this.count == 2) {
      lastTime = count = 0;
      this.ownerElement.dispatchEvent(new MouseEvent("trippleclick", e));
    } else {
      lastTime = now;
      this.count++;
    }
  }
}
customReaction.defineTrigger('trippleclickable_', TrippleClickable);
customReaction.defineReaction('log', console.log);
</script>
```

Here is how it works:
1. On the `<h1>` element a `trippleclickable_` gesture/statemachine is added. 
2. The `trippleclickable_` statemachine will spawn a child custom reaction on its `element` called `click:--trippleclickable:.click`.
3. The `click:--trippleclickable:.click` is the active arm of the statemachine. Whenever a `click` event happens on the element, then first the `:--trippleclickable` uses the `-`rule to transpose the origin of the reaction chain to the `trippleclickable_` attribute/statemachine. Once the location of the reaction chain has moved to the statemachine, the reaction chain uses the `.` rule to access and call the `click()` method on the statemachine, passing it the `(e, oi)` arguments.
4. The statemachine now gets all the `click` events, registers their time and duration between them, and if three `click` events has occured since its last inception, then it will dispatch a `trippleclick` `MouseEvent` on its `.ownerElement`.

> There is also some slight cleanup taking place. If the `click` is registered *after* the element has been removed from the DOM, then the statemachine attribute will remove itself and its spawned `click:` reaction. The same happens if another script removes only the `trippleclickable` statemachine, then this will be intercepted by the `remove()` function. Doubledots implements `.remove()` as part of its extension of the platform, and all methods of removing just a single attribute from the DOM is routed through this method.
