class MicroFrame {
  #i = 1;
  #inputs;

  constructor(event, at) {
    this.at = at;
    this.root = at.ownerElement.getRootNode();
    this.event = event;
    this.names = at.name.split(":");
    this.portalNames = EventLoopCube.portalNames(at.name);
    this.#inputs = [event];
  }

  getState() {
    return { at: this.at, event: this.event, inputs: this.#inputs, i: this.#i, names: this.names, };
  }

  run() {
    for (let re = this.names[this.#i]; re !== undefined; re = this.names[this.#i]) {
      const portal = this.root.portals.getReaction(this.portalNames[this.#i]);
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
  constructor(type, at, value, portal) {
    this.type = type;
    this.#state = type;
    this.at = at;
    this.portal = portal;
    this.#value = value;
  }

  async update() {
    this.#state = "awaiting value";
    try {
      this.#value = await this.#value;
      this.#state = this.type;
    } catch (err) {
      this.#value = err;
      this.#state = "error onFirstConnect";
    }
  }
  static make(type, portal, at, value) {
    const res = new ConnectFrame(type, at, value, portal);
    if (value instanceof Promise)
      res.update();
    return res;
  }
  getState() {
    return {
      type: this.type,
      at: this.at,
      state: this.#state,
      value: this.#value,
    };
  }
}

export class EventLoopCube {

  static defaultCleanupFilter = row => {
    //remove all ConnectFrames that has "connected" and not "onDisconnect"
    //remove all MicroFrames that does not have its last input a Promise
    // if(row instanceof ConnectFrame)
    //   return row.state === "connected" && row.disconnect === "onDisconnect";

  }
  #root;
  #started;
  constructor(root, disconnectInterval = 1000, cleanupInterval = 3000) {
    this.#root = root;
    //runs its own internal gc
    setInterval(_ => this.disconnect(), disconnectInterval);
    // todo the filter is not implemented yet
    //q setInterval(_ => this.cleanup(), cleanupInterval);
  }

  static Break = Symbol("Break");
  #cube = []; //[...events : [...microFrames]]  //todo in a more efficient world, this would be a single flat array.
  #I = 0;
  #J = 0;
  #active = false;
  #disconnectables = new Map();

  get state() { return this.#cube.map(row => row.getState?.() || row.map(mf => mf.getState())); }

  #loop(newRow) {
    this.#cube.push(newRow);
    if (this.#active)
      return;
    this.#active = true;
    for (; this.#I < this.#cube.length; this.#I++) {
      const row = this.#cube[this.#I];
      for (; this.#J < row.length; this.#J++)
        row[this.#J].run?.();
      this.#J = 0;
    }
    this.#active = false;
    return;
  }

  dispatch(e, at) {
    (e && this.#active && this.#cube[this.#I]?.[0].event === e) ?
      this.#cube[this.#I].push(new MicroFrame(e, at)) :
      this.#loop([new MicroFrame(e, at)]);
  }
  dispatchBatch(e, attrs) {
    (e && this.#active && this.#cube[this.#I]?.[0].event === e) ?
      this.#cube[this.#I].push(...attrs.map(at => new MicroFrame(e, at))) :
      this.#loop(attrs.map(at => new MicroFrame(e, at)));
  }
  disconnect() {
    for (let at of this.#disconnectables.keys())
      if (!at.ownerElement.isConnected) {
        const portal = this.#disconnectables.get(at);
        ConnectFrame.make("onDisconnect", portal, at, portal.onDisconnect?.call(at));
        this.#disconnectables.delete(at);
      }
  }
  async cleanup(filter = EventLoopCube.defaultCleanupFilter) {
    const keeps = this.#cube.slice(0, this.#I).filter(filter);
    this.#cube = [...keeps, ...this.#cube.slice(this.#I)];
    this.#I = keeps.length;
  }
  connectBranch(...els) {
    const portalMap = els[0]?.ownerDocument.portals;
    const frames = [];
    for (let top of els) {
      const task = !top[EventLoopCube.PORTAL] ? "doFirstConnect" : top.isConnected ? "doMove" : "doReConnect";
      for (let el = top, subs = top.getElementsByTagName("*"), i = 0; el; el = subs[i++]) {
        if (task === "doFirstConnect") {
          if (!el.hasAttributes())
            continue;
          el[EventLoopCube.PORTAL] = Object.create(null);
          for (let at of el.attributes) {
            const portalName = EventLoopCube.portalNames(at.name)[0];
            const portal = portalMap.get(portalName);
            el[EventLoopCube.PORTAL][portalName] ||= false;
            if (portal?.onFirstConnect) {
              const res = portal.onFirstConnect.call(at);
              const frame = ConnectFrame.make("onFirstConnect", portal, at, res);
              if (res !== EventLoopCube.Break) {
                frames.push(frame);
                el[EventLoopCube.PORTAL][portalName] = portal;
                el[EventLoopCube.MOVEABLES] ||= !!portal.onMove;
                el[EventLoopCube.RECONNECTABLES] ||= !!portal.onReconnect;
                portal.onDisconnect && this.#disconnectables.set(at, portal);
              }
            }
          }
        } else if (task === "doMove") {
          if (el[EventLoopCube.MOVEABLES])
            for (let portalName in el[EventLoopCube.PORTAL]) {
              const portal = el[EventLoopCube.PORTAL][portalName];
              if (portal?.onMove)
                for (let at of el.attributes)
                  if (EventLoopCube.portalNames(at.name)[0] === portalName)
                    frames.push(ConnectFrame.make("onMove", portal, at, portal.onMove.call(at)));
            }
        } else if (task === "doReConnect") {
          if (el[EventLoopCube.RECONNECTABLES])
            for (let portalName in el[EventLoopCube.PORTAL]) {
              const portal = el[EventLoopCube.PORTAL][portalName];
              if (portal?.onReconnect)
                for (let at of el.attributes)
                  if (EventLoopCube.portalNames(at.name)[0] === portalName)
                    frames.push(ConnectFrame.make("onReConnect", portal, at, portal.onReconnect.call(at)));
            }
        }
      }
    }
    frames.length && this.#loop(frames);
  }

  init() {
    if (this.#started) return;
    this.#started = true;
    this.connectBranch(this.#root);
  }
  connectPortal(portalName, portal) {
    if (!this.#started) return;
    const frames = [];
    for (let el2 of this.#root.getElementsByTagName("*"))
      if (el2[EventLoopCube.PORTAL]?.[portalName] === false)
        if (el2[EventLoopCube.PORTAL][portalName] = portal)
          for (let at of el2.attributes)
            if (EventLoopCube.portalNames(at.name)[0] === portalName)
              frames.push(new ConnectFrame(portal, at));
    frames.length && this.#loop(frames);
  }
  static PORTAL = Symbol("portals");
  static MOVEABLES = Symbol("moveables");
  static RECONNECTABLES = Symbol("reconnectables");
  static portalNames = attrName => NameCache[attrName] ??= attrName.split(":").map(n => n.split(/[._]/)[0]);
}

let NameCache = Object.create(null);
setInterval(_ => Object.keys(NameCache).length > 5000 && (NameCache = Object.create(null)), 5000); //very crude GC

