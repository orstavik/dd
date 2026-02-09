# `<script>`, `:import`, and parsing DoubleDots

DoubleDots is a **great** way to understand the intricacies of loading scripts in browsers:

* `<script>` = `:import`
* `<script async>` = `::import`
* `<script defer>` = `:prefetch` + `dcl::import`

## `<script>` x3

There are three different types of `<script>`s in HTML:
1. `<script>` **sync**
2. `<script async>`
3. `<script defer>` and `<script type="module">`

The "normal" `<script>` (without `async`, `defer`,  or `type="module"`) is the old-school **blocking** script. Blocking scripts are bad because they *pause* the rendering (parser) of the main document until the `<script>` has loaded and run. This makes the page much slower to load, and modern, best practices recommend *never* to use "plain" `<script>`s (or put blocking `<script>`s at the tail end of the document `...</body>`).

To fix blocking scripts the browsers first attempt was `<script async>`. `<script async>` are `fetch`ed in parallel with the parser rendering the main document. Often, the parser will have finished rendering the main document before the network has fetched `<script async>`. And then `<script async>` will not pause the loading of the main document. But. If the `<script async>` is fetched and prepped *before* the parser finishes, then `<script async>` will *also pause* the rendering of the main document while the browser *runs* the `<script async>`. This is also bad. The network part of `<script async>` is non-blocking, but the `<script async>` might both run before the parser finishes and *pause* the main document, and after the parser has completed. This is a loose-loose situation: the async script cannot expect anything about the state of the main document, and the rendering of the main document might still be delayed *before* it is needed.

The browsers' *second* attempt at fixing blocking scripts was `<script defer>` (`<script type="module">` simply `defer` by default). `<script defer>` has a simpler logic: `<script defer>` are fetched and prepped asap, but they are not invoked until right after the parser has finished: (parser complete, then `<script defer>`, and then `DOMContentLoaded` event). This is win-win: the browser will load and prep the scripts in the background in parallel with setting up the main document, but wait until the parser has just completed before loading the script. The `<script defer>` can therefore assume that the DOM is completed, and the `<script defer>` will not block the parser.

## `<script>` vs `import()`

The `import()` method is the way you load a script from JS. Is there a difference between `<script>` and `import()`?

* With `import()` you cannot pause the parser like you can with `<script>` sync. Simply put, `import()` works in `defer` mode. So.. yes? But, if you follow best practices and *only* use `<script defer>`, then this difference doesn't matter. So, if all `<script defer>` and you don't intentionally wish to block rendering of the main document, then no.

* With `<script>` you can take the `<script>` element out of the DOM again. You cannot *undo* `import()`. But, is this really different? Does the browser remove any JS code when you *undo* adding the `<script>` element? The answer is no. The loading of `<script>` is just as irreversible as `import()`. Being able to *remove* `<script>` elements gives a false impression of the state of the JS landscape.

## `import()` and `:import`

DoubleDots provide an `:import` reaction by default. The `:import` reaction essentially calls the js `import()` method. If the reaction chain attribute has a `.value`, then the `:import` reaction will consider that `.value` a URL and `import()` that file. Otherwise, the `:import` will assume that it is given a script text as its `oi` argument, and `import()` that script text. This behavior of "first script from URL, second script from text input" echoes "first `src`, second `.innerText`" behavior of `<script>`. 

The `:import` returns the output of the `import()` function as its `return` value.

## `<script>` in DoubleDots

Loading scripts in DoubleDots:
1. There should be *a single* `<script>` tag in a DoubleDots HTML document, and that should be the DoubleDots script. Depending on the usecase should be loaded *sync* using `<script src="DoubleDots.js">`, or deffered `<script defer src="DoubleDots.js">`.
2. All other scripts should be loaded using a reaction such as `:import`. The `<script>` tag can *only* be used to load the DoubleDots framework.

For more, see the chapter on FOUC.
