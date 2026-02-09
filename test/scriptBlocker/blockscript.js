(function(setAttribute, getAttribute) {

  function pauseScript(el) {
    setAttribute.call(el, ":src", getAttribute.call(el, "src"));
    setAttribute.call(el, "src");
  }

  if ('onbeforescriptexecute' in document) {
    document.addEventListener("beforescriptexecute", function (e) {
      e.preventDefault();     //both stops are needed in FF
      pauseScript(e.target);
    });
    return;
  }

  const mo = new MutationObserver(function(mrs) {
    const el = mrs[mrs.length - 1].target;
    if (el.tagName === "SCRIPT")
      pauseScript(el);  
  });
  mo.observe(document.body || document.documentElement, 
    { childList: true, subtree: true });
  document.addEventListener("readystatechange", 
    _ => document.readyState !== "loading" && mo.disconnect());
})(Element.prototype.setAttribute, Element.prototype.getAttribute);
