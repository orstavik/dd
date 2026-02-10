Event.data = Symbol("Event data");
class EventLoopError extends DoubleDots.DoubleDotsError { }

class MicroFrame {
  #i = 0;
  #inputs;

  constructor(event, at) {
    this.at = at;
    this.event = event;
    this.#inputs = [event[Event.data] ?? event];
  }

  toJSON() {
    return { at: this.at, event: this.event, inputs: this.#inputs, i: this.#i };
  }

  getReaction() {
    return this.at.reactions[this.#i];
  }

  getReactionIndex() {
    return this.#i;
  }

  /**
   * @returns <undefined> when the task is emptied, or is awaiting in async mode, 
   * which both means that the event loop can continue.
   * @returns <this> current task when the task is not emptied 
   * and we must wait for it in sync mode.
   */
  run(threadMode = false) {
    for (let re = this.getReaction(); re !== undefined; re = this.getReaction()) {
      //1. process native reactions
      if (re === "") {
        threadMode = true;
        this.#runSuccess(this.#inputs[0]);
        continue;
      }
      //todo this one
      if (re.startsWith("catch"))
        continue;

      //2. check isConnected
      try {
        if (!this.at.isConnected)
          throw new EventLoopError("Disconnected: " + this.at);
        //todo should this be an error??

        const func = this.at.initDocument.getReaction(re, this.at);
        if (func instanceof Promise) {
          if (threadMode) {
            func.finally(_ => __eventLoop.asyncContinue(this));
            return;
          } else {
            func.finally(_ => __eventLoop.syncContinue());
            return this;
          }
        }

        if (func instanceof Error)
          throw func;

        const res = func.apply(this.at, this.#inputs);
        this.#inputs.unshift(res);
        if (res instanceof Promise) {
          if (threadMode) {
            res.then(oi => this.#runSuccess(oi))
              .catch(error => this.#runError(error))
              .finally(_ => __eventLoop.asyncContinue(this));
            return; //continue outside loop
          } else {
            res.then(oi => this.#runSuccess(oi))
              .catch(error => this.#runError(error))
              .finally(_ => __eventLoop.syncContinue());
            //todo these sync delays needs to have a max timeout.
            //todo thus, we need to have some max timers
            return this; //halt outside loop
          }
        }
        this.#runSuccess(res);
      } catch (error) {
        this.#runError(error);
      } finally {
        //todo update the loop and res here,
      }
      //todo or here?
    }
  }

  #runError(error) {
    console.error(error);
    this.#inputs[0] = error;
    const catchKebab = "catch_" + error.constructor.name.replace(/[A-Z]/g, '-$&').toLowerCase();
    for (this.#i++; this.#i < this.at.reactions.length; this.#i++)
      if (this.at.reactions[this.#i] === "catch" || this.at.reactions[this.#i] === catchKebab)
        return;

    // this.#i = this.at.reactions.length;
    const target = this.at.isConnected ? this.at.ownerElement : document.documentElement;
    //todo add the at + reactionIndex + self + input to the ErrorEvent, so that we know which attribute caused the error
    //todo or just the at, and then just read the data from the _eventLoop?
    target.dispatchEvent(new ErrorEvent("error", { error }));
  }

  #runSuccess(res) {
    this.#inputs[0] = res;
    this.#i = res === EventLoop.Break ? this.at.reactions.length : this.#i + 1;
  }
}

class __EventLoop {
  #stack = [];
  #syncTask;
  task;

  //todo clean the continue process. but do so after testing framework is up and running
  syncContinue() {
    this.task = this.#syncTask;
    // DoubleDots.cube?.("task-sync", this.task);
    this.#syncTask = this.task.run();
    this.#loop();
  }

  //asyncContinue is allowed while we are waiting for the sync task
  asyncContinue(task) {
    // DoubleDots.cube?.("task-async", task);
    (this.task = task).run(true);
    this.#loop();
  }

  #loop() {
    while (!this.#syncTask && this.#stack[0]) {
      const { event, iterator } = this.#stack[0];
      for (let attr of iterator) {
        this.task = new MicroFrame(event, attr);
        //if task.run() not emptied, abort to halt eventloop
        if (this.#syncTask = this.task.run())
          return ;//DoubleDots.cube?.("task-sync-break", this.#syncTask);
        // DoubleDots.cube?.("task", this.task);
      }
      this.#stack.shift();
    }
    return ;//DoubleDots.cube?.("task-empty", {});
  }

  batch(event, iterable) {
    const iterator = iterable[Symbol.iterator]();
    if (this.#stack.push({ event, iterator }) === 1)
      this.#loop();
    else
      ;//DoubleDots.cube?.("task-queued", {});
  }
}

globalThis.__eventLoop = new __EventLoop();

class EventLoopCube {

  static Break = Symbol("Break");

  get event() { return __eventLoop.task?.event; }
  get attribute() { return __eventLoop.task?.at; }
  // get portal() { return __eventLoop.task?.portal; } //todo we should be able to get something like this.
  get reaction() { return __eventLoop.task?.getReaction(); }
  get reactionIndex() { return __eventLoop.task?.getReactionIndex() ?? -1; }

  dispatchBatch(event, iterable) {
    __eventLoop.batch(event, iterable);
  }
  dispatch(event, attr) {
    __eventLoop.batch(event, [attr]);
  }
  connect(at) {
    //todo register this in the event loop cube stack as a task.
    const portal = at.ownerElement.getRootNode().portals.get(at.name);
    if (portal === null || portal.onConnect == null)
      return;                             //if portal === null, then trigger inactive, we simply abort onConnect
    if (portal instanceof Promise)        //just try again when the portal has resolved.
      return portal.then(p => at.ownerElement.isConnected && doOnConnect(at, p));

    if (portal instanceof Error)
      return console.error("Error connecting trigger: " + at + " portal definition error: " + portal.message);
    if (portal.properties)
      Object.defineProperties(at, portal.properties);
    portal.onConnect.call(at);
    if ("onDisconnect" in portal) {
      const set = downGrades.get(portal) ?? new Set();
      set.add(at);
      downGrades.set(portal, set);
    }
  }
  disconnect(at, portal) {
    //todo register this in the event loop cube stack as a task.
    portal.onDisconnect.call(at);
  }
};
