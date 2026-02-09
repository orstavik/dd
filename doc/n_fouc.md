# FOUC and DoubleDots

Flash of unstyled content (FOUC) happens when the browser first creates one view on screen based on a certain DOM, and then almost immediately afterwards changes this view abruptly due to quickly succeeding changes in the underlying DOM.

## FOUC and CSS

The prototypical reason for FOUC would be to first load the main document with a minimal, raw set of CSS styles. This takes 100ms. The browser then creates a view based on the raw CSS styles, at 111ms. In parallel a maximal, beautiful set of CSS styles are loaded. However, this process takes more time, and so the beautiful CSS styles are not added until 222ms. So, from 0 to 111ms white nothingness fills the screen; from 111-222ms a raw, buggly-wuggly "homepage" appears; from 222ms and onwards the beautiful web page. The FOUC is the flash of something uggly the user perceives between 111ms and 222ms.

To counter this, CSS is "blocking". Whenever the browser encounters a CSS stylesheet, it will not render any subsequent elements on screen until it has loaded all the CSS styles. This ensures that if you add CSS *before* the elements that need it, the browser will *wait* with presenting the web page. In our example above, there would be white nothingness from 0 to 222ms, and then after 222ms the beautiful web page. Slower to first paint (no intermediate paint at 111ms), but no uggly, disorienting, user-confusing FOUC. Because CSS *blocks*, the problem with FOUC is not associated with CSS.

## FOUC and scripts

Scripts *also* create FOUC. We can illustrate this with *two* classic examples:

**Upgrade web components**. Imagine an HTML document with a `<web-comp>` element. It is easy if you try. The document, with all the style sheets, loads and presents on screen after 222ms. But all scripts are `defer`red. Thus, the script with the `customElements.define("web-comp", ...)` has not yet run, and thus `<web-comp>` has no `.shadowRoot` nor `:host{...}` styles set from within yet. Only after 333ms has the browser gotten to the `<web-comp>` defining script, which *dramatically* changes the view of the page as `<web-comp>` shifts *from* `display: inline` and emptyness *to* say `display: grid` with a whole bunch of `.shadowRoot` content elements. So, from 0 to 222ms the screen is white; from 222ms to 333ms the screen shows a disorienting, partially styled and filled something; from 333ms the screen shows the expected result.

**Dynamically loaded content**. Imagine a web shop product page. It isn't hard to do. The product page lists 42 products. The web shop server app presents the generic product page, and then a script loads a json object with 42 products that is dynamically added to the page. The generic, empty page is presented after 200ms. Then we wait. And wait. And after 3456ms 42 products *flash* onto the screen. (Yes, this is a flash of "stale content", not "unstyled content". But the principles remain the same.)

Both examples follow established best practices. Yet, both examples FOUC up. What's up? Browsers make a compromise when to make *first paint*. They want *all* the web pages out there to render asap, so to minimize load time, but they want to avoid disorienting FOUC. Simply put we can say the compromise is to do *first paint* at parser-end and before `defer`red scripts. The web component definition and the dynamically loaded content fall outside this first paint point. FOUC.

## Back to the future! `<script>` 

First. It is *nothing wrong* with your compliance with established standards. You are being a good boy when you `defer` the scripts that define your web components. The problem is that most scripts with web component definitions function as stylesheet. They *should be* blocking. So. We need to **rewrite** best practices to *fit* web component definitions (and dynamically loading content).

For web component upgrades, we need to go back to sync `<script>`s. We move away from "upgrading" the `<web-comp>` from a `defer`red script. Instead, we ensure that `<web-comp>` is defined *before* the browser can render any `<web-comp>`s. This will ensure that the `shadowRoot` and `:host {...}` styles are ready before *first paint point*, avoiding any disorienting "empty `display: inline`" becoming "populated `display: grid`" FOUC sitautions. Using *parser blocking* `<script>` is currently the only way to do so.

## `<script>` flux capacitors

Here are the techniques used to make blocking `<script>` *less blocking*:

1. Server Push. Server Push allows the server to send .js files immediately with the .html file. This will most often enable the `<script src="./WebComp.js">` to load quickly with the .html page, so to make the blocking no more than it has too.

2. Inline the `<script>` code. Use webpack or similar design-time tool to inline the text of the web comp definition in the .html document.

3. Server-side rendering. Make the app on the server inline the web comp definition run-time on the server. This is an inferior choice to 1. and 2. for static resources, but this strategy can also be employed to dynamically loaded content.

4. Spinner. Load a temporary view until ready. 

5. Pause paint point. Mark `<body hidden load:show>` or `<main style="display: none" load:remove_style>` and then remove these marks when the web comp definition has loaded.

6. Duplicate style in a CSS file in the main document. You can add a CSS style for that web component that duplicate future behavior (and remove it once no longer necessary):

```html
<style>
  web-comp{ display: block; /* and lots of other duplicated styles */ }
</style>
```

## DoubleDots and FOUC

How to handle the flux capacitors in DoubleDots?

1. `DoubleDots.js` must run *first*.

2. Use the `:import` reactions to load all other scripts. DoubleDots `throw Error` if it finds *more than one* `<script>` in the main document.

3. If you need to *block* the rendering of a particular web-component, then do:
   1. make sure you use a sync `<script>` tag for DoubleDots. This can most commonly be added near the end of the document, but if you want to be sure, you must add the sync `<script src="DoubleDots.js">` *before* the web-component.
   2. ensure that you `:import:define-element_web-comp="./WebComp.js"` on the element.  The `DoubleDots.js` script uses a `MutationObserver` to trigger *all* empty `:reactions` *before* first paint point. If the `:import:define-element_...` is written sync, then this will function as close to a blocking `<script>` as possible.
   3. make sure the `./WebComp.js` is server-pushed with the .html documents, or add `<link rel="prefetch" href="./WebComp.js">` to the `<head>` of the .html document.

4. Else, you do *not* need to block rendering, then load `<script defer src="./DoubleDots.js">` at the `<head>` of the .html document.

## `:paint-pause`

What we would like is an *explicit* way to declare a `<script defer>` to pause *first paint*. Imagine a `paint-pause` attribute for `<scripts>`. If this attribute was added to a script, as in `<script defer paint-pause>`, then the browser could be specifically told to pause the paint until after this deferred script was loaded.

In DoubleDots we can pause the paint of the main document for individual defintions. This essentially takes manual control of the first paint point. We do this by creating a custom reaction pair called `:paint-pause` and `:paint`.

```html
<web-comp :paint-pause::import:define-element:paint="./WebComp.js">hello</web-comp>
<comp-web :paint-pause::import:define-element:paint="./CompWeb.js">sunshine</comp-web>
```

The above composition works by:
1. `:paint-pause` sets `<body hidden>`. For each extra `:paint-pause` called, it essentially just ups a `ppc` counter.
2. `::import:define-element` then loads and defines the two different web components in async, thread mode. But because `<body hidden>`, no render will happen while this is going on.
3. Then, when each definition ends, the `ppc` counts down 1. When all the `:paint-pause` are counted down, `hidden` is removed from the `<body>`.

Below is the definitions for the :reactions.

```js
(function(){
  let ppc = 0;
  customReactions.define("paint-pause", function(e, oi){
    ppc++;
    document.body.setAttribute("hidden");
    return oi;
  });
  customReactions.define("paint", function(e, oi){
    if(!(--ppc))
      document.body.removeAttribute("hidden");
    return oi;
  });
  customReactions.define("import", async function(e, oi){
    if(this.value)
      return await import(this.value);
    if(typeof oi !== "string" || !(oi instanceof String))
      throw new SyntaxError(":import require either a url value or text input")
    const blob = new Blob([oi], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    return await import(url);
  });
  customReactions.define("define-element", function(e, oi){
    const tagName = this.ownerElement.tagName;
    const exportName = ("-" + tagName).replace(/-([a-z])/g, g => g[1].toUpperCase());
    if(!(exportName in oi))
      throw new SyntaxError(`:define-element for ${tagName} must get a valid oi with module['${exportName}'].\nOtherwise, use :define-element_tagName_exportNameKebabCase`);
    customElements.define(tagName, oi[exportName]);
  });
})();
```

## Philosophy: when the "timeline" in HTML and the DOM diverge

HTML template is read left-right (depth-first). This means that the human reader encounter `<script>` elements in the same chronological sequence, and so the human developer intuit the `<script>` elements are *called* by the machine in the same order. This left-right, depth-first chronological bias applies to other *immediate* callbacks in HTML such as the empty, load `:reactions`.

The `async`/`defer` attributes on `<script>`s break this expectation. And the variety of alternative callback times, sync/async/defer, makes it hard for the human interlocutor to keep track of what happens when. We can think of these threads as causing conceptual fraying: instead of a solid line going left to right across the text, the text becomes a cactus with time vectors sticking out. The `::` async reaction in DoubleDots behaves in the same way (although the virtual event loop seeks to remedy this by keeping track of pins from within the solid thread).
