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

  #checkLegalTail(type) {
    const i = this.names.indexOf("");
    if (i <= this.#i)
      return;
    this.event.preventDefault();
    const errorNames = [...this.names];
    errorNames[this.#i] += " >>awaits here<< ";
    errorNames[i - 1] += " >>defaultAction start<< ";
    throw new Error("A defaultAction is left behind an async reaction while " + type + ".\n" + errorNames.join(":"));
  }

  get result() { return this.#inputs[0]; }

  getState() {
    return { at: this.at, event: this.event, inputs: this.#inputs, i: this.#i, names: this.names, };
  }

  async run() {
    try {
      for (let re = this.names[this.#i]; re !== undefined; re = this.names[++this.#i]) {
        if (re === "") {
          this.#inputs.unshift(EventLoopCube.DefaultAction);
          this.#i++;
          break;
        }
        let portal = this.root.portals.getReaction(this.portalNames[this.#i]);
        if (portal instanceof Promise) {
          this.#checkLegalTail("loading definition");
          portal = await portal;
        }
        if (portal instanceof Error)
          throw portal;
        if (portal.reaction === null)
          throw new Error("reaction is null: " + re);
        this.#inputs.unshift(portal.reaction.apply(this.at, this.#inputs));
        if (this.#inputs[0] instanceof Promise) {
          this.#checkLegalTail("executing function");
          this.#inputs[0] = await this.#inputs[0];
        }
        if (this.#inputs[0] === EventLoopCube.Cancel)
          break;
        if (this.#inputs[0] === EventLoopCube.Void)
          this.#inputs.shift();
      }
    } catch (err) {
      console.error(err);
      this.#inputs.unshift(err);
    }
    return this.#inputs[0];
  }

  static make(e, at) { return new MicroFrame(e, at); }
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
      for (; this.#J < row.length; this.#J++)
        row[this.#J].run?.();
      //default action handling start
      if (row[0].event?.cancelable)
        for (let j = this.#J - 1; j >= 0; j--)                 //when we run the default actions in reverse, 
          if (row[j].result === EventLoopCube.DefaultAction) { //and find the top defaultAction
            const defActRes = row[j].run();
            if (defActRes === EventLoopCube.Cancel)             //and that defaultAction returns EventLoopCube.Cancel
              continue;                                        //then we try the next defaultAction.
            defActRes.then?.(res => {
              if (res === EventLoopCube.Cancel)
                throw new Error("defaultActions should not return EventLoopCube.Cancel asynchronously: " + row[j].at.name);
            });
          }
      //default action handling end
      this.#J = 0;
    }
    this.#active = false;
    return;
  }

  dispatch(e, at) {
    (e && this.#active && this.#cube[this.#I]?.[0].event === e) ?
      this.#cube[this.#I].push(MicroFrame.make(e, at)) :
      this.#loop([MicroFrame.make(e, at)]);
  }
  dispatchBatch(e, attrs) {
    (e && this.#active && this.#cube[this.#I]?.[0].event === e) ?
      this.#cube[this.#I].push(...attrs.map(at => MicroFrame.make(e, at))) :
      this.#loop(attrs.map(at => MicroFrame.make(e, at)));
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

  connectPortal(portalName, portal) {
    const frames = [];
    for (let el2 of this.#root.getElementsByTagName("*"))
      if (el2[EventLoopCube.PORTAL]?.[portalName] === false)
        if (el2[EventLoopCube.PORTAL][portalName] = portal)
          for (let at of el2.attributes)
            if (EventLoopCube.portalNames(at.name)[0] === portalName)
              frames.push(new ConnectFrame(portal, at));
    frames.length && this.#loop(frames);
  }
  static Cancel = Symbol("Cancel");
  static Void = Symbol("void");
  static DefaultAction = Symbol("DefaultAction");
  static PORTAL = Symbol("portals");
  static MOVEABLES = Symbol("moveables");
  static RECONNECTABLES = Symbol("reconnectables");
  static portalNames = attrName => NameCache[attrName] ??= attrName.split(":").map(n => n.split(/[._]/)[0]);
}

let NameCache = Object.create(null);
setInterval(_ => Object.keys(NameCache).length > 5000 && (NameCache = Object.create(null)), 5000); //very crude GC