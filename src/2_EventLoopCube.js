let DOTS = Object.create(null);
let PORTALS = Object.create(null);
setInterval(_ => {  //very crude GC
  Object.keys(DOTS).length > 5000 && (DOTS = Object.create(null));
  Object.keys(PORTALS).length > 5000 && (PORTALS = Object.create(null));
}, 5000);
Object.defineProperties(Attr.prototype, {
  dots: { get: function () { return DOTS[this.name] ??= this.name.split(":"); } },
  trigger: { get: function () { return PORTALS[this.dots[0]] ??= this.dots[0].split(/[._]/)[0]; } },
});

class MicroFrame {
  #inputs = [];
  #i = 0;
  #end;

  constructor(at, portals = at.ownerElement.getRootNode()?.portals) {
    this.at = at;
    this.portals = portals;
  }

  getState() {
    return { at: this.at, inputs: this.#inputs, i: this.#i, end: this.#end };
  }

  next(input) {
    if (input instanceof Error) return this.#end = input;
    if (input !== undefined) this.#inputs.unshift(input);
    this.#i++;
    return this.run();
  }

  run() {
    for (; this.#i < this.at.dots.length; this.#i++) {
      let res = this.portals.getReaction(this.at.dots[this.#i]);
      if (res instanceof Promise)
        return res.finally(_ => this.run());
      if (res instanceof Function) {
        try {
          res = res.apply(this.at, this.#inputs);
          if (res instanceof Promise)
            return res.then(r => this.next(r), e => this.next(e));
        } catch (err) {
          res = err;
        }
      }
      if (res instanceof Error) return this.#end = res;
      if (res !== undefined) this.#inputs.unshift(res);
    }
    return this.#end = true;
  }

  static make(at) { return new MicroFrame(at); }
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
  static init(owner, root) {
    const cube = new EventLoopCube(root, 1000, 3000);
    owner.eventLoopCube = cube;
    cube.#root = root;
    cube.connectBranch(root);
    return cube;
  }

  #root;
  #cube; //[...events : [...microFrames]]  //todo in a more efficient world, this would be a single flat array.
  #I = 0;
  #J = 0;
  #active = false;
  #disconnectables = new Map();
  constructor(disconnectInterval = 1000, cleanupInterval = 3000) {
    this.#cube = [];
    //runs its own internal gc
    setInterval(_ => this.disconnect(), disconnectInterval);
    // todo the filter is not implemented yet
    //q setInterval(_ => this.cleanup(), cleanupInterval);
  }

  get state() { return this.#cube.map(row => row.getState?.() || row.map(mf => mf.getState())); }

  #loop(newRow) {
    this.#cube.push(newRow);
    if (this.#active)
      return;
    this.#active = true;
    for (; this.#I < this.#cube.length; this.#I++) {
      const row = this.#cube[this.#I];
      const event = row[0];
      for (this.#J = 1; this.#J < row.length; this.#J++)
        row[this.#J].next?.(event);
    }
    this.#active = false;
    return;
  }

  dispatch(e, at) {
    this.#loop([e, MicroFrame.make(at)]);
  }
  dispatchBatch(e, attrs) {
    this.#loop([e, ...attrs.map(MicroFrame.make)]);
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
      if (!(top instanceof Element) || (!top.hasAttributes() && !top.children.length))
        continue;
      const task = !top[EventLoopCube.PORTAL] ? "doFirstConnect" : top.isConnected ? "doMove" : "doReConnect";
      for (let el = top, subs = top.getElementsByTagName("*"), i = 0; el; el = subs[i++]) {
        if (task === "doFirstConnect") {
          if (!el.hasAttributes())
            continue;
          el[EventLoopCube.PORTAL] = Object.create(null);
          for (let at of el.attributes) {
            const portalName = at.trigger;
            const portal = portalMap.get(portalName);
            el[EventLoopCube.PORTAL][portalName] ||= false;
            if (portal?.onFirstConnect) {
              const res = portal.onFirstConnect.call(at);
              const frame = ConnectFrame.make("onFirstConnect", portal, at, res);
              if (res !== EventLoopCube.Cancel) {
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
                  if (at.trigger === portalName)
                    frames.push(ConnectFrame.make("onMove", portal, at, portal.onMove.call(at)));
            }
        } else if (task === "doReConnect") {
          if (el[EventLoopCube.RECONNECTABLES])
            for (let portalName in el[EventLoopCube.PORTAL]) {
              const portal = el[EventLoopCube.PORTAL][portalName];
              if (portal?.onReconnect)
                for (let at of el.attributes)
                  if (at.trigger === portalName)
                    frames.push(ConnectFrame.make("onReConnect", portal, at, portal.onReconnect.call(at)));
            }
        }
      }
    }
    frames.length && this.#loop(frames);
  }

  connectPortal(portalName, portal) {
    const frames = [];
    for (let el2 of this.#root.getElementsByTagName("*"))
      if (el2[EventLoopCube.PORTAL]?.[portalName] === false)
        if (el2[EventLoopCube.PORTAL][portalName] = portal)
          for (let at of el2.attributes)
            if (EventLoopCube.portalNames(at.name)[0] === portalName)
              frames.push(ConnectFrame.make("onFirstConnect", portal, at, portal.onFirstConnect.call(at)));
    frames.length && this.#loop(frames);
  }
  static Cancel = new Error("EventLoopCube.Cancel");
  static PORTAL = Symbol("portals");
  static MOVEABLES = Symbol("moveables");
  static RECONNECTABLES = Symbol("reconnectables");
}