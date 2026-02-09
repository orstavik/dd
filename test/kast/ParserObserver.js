//this will give you 
class ParserObserver {
  #cbs = [];
  #mo;

  #start(){
    const now = document.querySelectorAll("*");
    for (let cb of this.#cbs)
      cb(now);
    if (document.readyState !== "loading")
      return;
    this.#mo = new MutationObserver(function(mrs){
      const el = mrs[mrs.length - 1].target;
      if(el.tagName !== "SCRIPT")
        return;
      for (let cb of this.#cbs)
        cb(mrs.map(mr => [...mr.addedNodes]).flat());      
    });
  }
  
  observe(cb){
    this.#cbs.push(cb);
    this.#cbs.length === 1 && (async _ => this.#start())(); //queue microtask
  }

  disconnect(){
    this.#mo.disconnect();
  }
}
