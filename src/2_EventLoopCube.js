function* walkAttributes(root) {
  if (root.attributes)
    yield* Array.from(root.attributes);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  for (let n; n = walker.nextNode();) {
    yield* Array.from(n.attributes);
    if (n.shadowRoot)
      yield* walkAttributes(n.shadowRoot);
  }
}

class MicroFrame {
  #i = 1;
  #inputs;

  constructor(event, at) {
    this.at = at;
    this.root = at.ownerElement.getRootNode();
    this.event = event;
    this.names = at.name.split(":");
    this.#inputs = [event];
  }

  getState() {
    return { at: this.at, event: this.event, inputs: this.#inputs, i: this.#i, names: this.names, };
  }

  run() {
    for (let re = this.names[this.#i]; re !== undefined; re = this.names[this.#i]) {
      const portal = this.root.portals.getReaction(re);
      if (portal === null)
        return this.#endError(new Error("portal is null: " + re));
      if (portal instanceof Error)
        return this.#endError(portal);
      if (portal instanceof Promise)
        return portal.finally(_ => this.run());
      if (portal.reaction === null)
        return this.#endError(new Error("reaction is null: " + re));
      try {
        const res = portal.reaction.apply(this.at, this.#inputs);
        this.#inputs.unshift(res);
        if (res instanceof Promise)
          return res.then(oi => this.#runSuccess(oi))
            .catch(err => this.#endError(err))
            .finally(_ => this.run());
        this.#runSuccess(res);
      } catch (err) {
        return this.#endError(err);
      }
    }
  }

  #endError(err) {
    console.error(err);
    this.#inputs.unshift(err);
    this.#i = this.names.length;
  }

  #runSuccess(res) {
    this.#inputs[0] = res;
    this.#i = res === EventLoopCube.Break ? this.names.length : this.#i + 1;
  }
}

class ConnectFrame {
  #state;
  #value;
  constructor(at) {
    this.at = at;
    this.portal = at.ownerElement.getRootNode().portals.getTrigger(at.name);
    this.#init();
    this.disconnect = this.portal.onDisconnect;
  }
  getState() {
    return {
      at: this.at,
      state: this.#state,
      value: this.#value,
    };
  }

  async #init() {
    this.#state = "awaiting portal";
    this.portal = await this.portal;
    this.#state = "at disconnected while awaiting portal";
    if (!this.at.ownerElement.isConnected) return;
    this.#state = "portal null";
    if (this.portal === null) return;
    this.#state = "onConnect null";
    if (this.portal.onConnect == null) return;
    this.#state = "portal definition error";
    if (this.portal instanceof Error) return this.#value = this.portal;
    this.#state = "setting properties and calling onConnect";
    try {
      if (this.portal.properties)
        Object.defineProperties(this.at, this.portal.properties);
      this.#value = this.portal.onConnect.call(this.at);
      if (this.#value instanceof Promise) {
        this.#state = "awaiting onConnect";
        await this.#value;
      }
      this.#state = "connected";
    } catch (err) {
      this.#value = err;
      this.#state = "error calling onConnect or setting properties";
    }
  }

  async disconnect() {
    this.#state = "could not disconnect because not properly connected";
    if (this.#state !== "connected") return;
    this.#state = "calling disconnect on ConnectFrame that doesn't have onDisconnect.";
    if (this.portal.onDisconnect == null) return;
    try {
      this.#state = "calling onDisconnect";
      this.#value = this.portal.onDisconnect.call(this.at);
      if (this.#value instanceof Promise) {
        this.#state = "awaiting onDisconnect";
        await this.#value;
      }
      this.#state = "disconnected";
    } catch (err) {
      this.#value = err;
      this.#state = "error calling onDisconnect";
    }
  }
}

export class EventLoopCube {

  static defaultCleanupFilter = row => {
    //remove all ConnectFrames that has "connected" and not "onDisconnect"
    //remove all MicroFrames that does not have its last input a Promise
    // if(row instanceof ConnectFrame)
    //   return row.state === "connected" && row.disconnect === "onDisconnect";

  }
  constructor(disconnectInterval = 1000, cleanupInterval = 3000) {
    //runs its own internal gc
    setInterval(_ => this.disconnect(), disconnectInterval);
    // todo the filter is not implemented yet
    //q setInterval(_ => this.cleanup(), cleanupInterval);
  }

  static Break = Symbol("Break");
  #cube = []; //[...events : [...microFrames]]
  #I = 0;
  #J = 0;
  #active = false;
  #atToConnectFrames = new WeakMap();

  get state() { return this.#cube.map(row => row.getState?.() || row.map(mf => mf.getState())); }

  #loop(newRow) {
    this.#cube.push(newRow);
    if (this.#active)
      return;
    this.#active = true;
    for (; this.#I < this.#cube.length; this.#I++) {
      const row = this.#cube[this.#I];
      for (; this.#J < row.length; this.#J++)
        row[this.#J].run();
      this.#J = 0;
    }
    this.#active = false;
    return;
  }

  dispatch(e, at) { this.#loop([new MicroFrame(e, at)]); }
  dispatchBatch(e, iter) { this.#loop([...iter].map(at => new MicroFrame(e, at))); }
  connect(at) {
    if (this.#atToConnectFrames.has(at))
      return;
    const frame = new ConnectFrame(at);
    this.#atToConnectFrames.set(at, frame);
    this.#loop(frame);
  }
  disconnect() {
    for (let frame of this.#cube)
      if (frame instanceof ConnectFrame)
        frame.disconnect?.call(frame.at);
  }
  async cleanup(filter = EventLoopCube.defaultCleanupFilter) {
    const keeps = this.#cube.slice(0, this.#I).filter(filter);
    this.#cube = [...keeps, ...this.#cube.slice(this.#I)];
    this.#I = keeps.length;
  }
  connectBranch(...els) {
    for (let el of els)
      for (const at of walkAttributes(el))
        this.connect(at);
  }
}