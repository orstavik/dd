//todo this we need to put into the PortalMap?? Or should it be in the eventLoopCube??
const NameCache = Object.create(null);
const portalNames = attrName => NameCache[attrName] ??= attrName.split(":").map(n => n.split(/[._]/)[0]);
setInterval(_ => Object.keys(NameCache).length > 5000 && (NameCache = Object.create(null)), 5000); //very crude GC

class MicroFrame {
  #i = 1;
  #inputs;

  constructor(event, at) {
    this.at = at;
    this.root = at.ownerElement.getRootNode();
    this.event = event;
    this.names = at.name.split(":");
    this.portalNames = portalNames(at.name);
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
  constructor(portal, at) {
    this.at = at;
    this.portal = portal;
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
    this.#state = "onFirstConnect null";
    if (this.portal.onFirstConnect == null) return;
    this.#state = "portal definition error";
    if (this.portal instanceof Error) return this.#value = this.portal;
    this.#state = "setting properties and calling onFirstConnect";
    try {
      if (this.portal.properties)
        Object.defineProperties(this.at, this.portal.properties);
      this.#value = this.portal.onFirstConnect.call(this.at);
      if (this.#value instanceof Promise) {
        this.#state = "awaiting onFirstConnect";
        await this.#value;
      }
      this.#state = "connected";
    } catch (err) {
      this.#value = err;
      this.#state = "error calling onFirstConnect or setting properties";
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

class ReConnectFrame {
  constructor(portal, at) {
    this.portal = portal;
    this.at = at;
    this.value = portal.onReConnect.call(at);
  }
}

class MoveFrame {
  constructor(portal, at) {
    this.portal = portal;
    this.at = at;
    this.value = portal.onMove.call(at);
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
  #cube = []; //[...events : [...microFrames]]  //todo in a more efficient world, this would be a single flat array.
  #I = 0;
  #J = 0;
  #active = false;

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

  dispatch(e, at) { this.#loop([new MicroFrame(e, at)]); }
  dispatchBatch(e, iter) { this.#loop([...iter].map(at => new MicroFrame(e, at))); }
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
    const portalMap = els[0]?.ownerDocument.portals;
    const frames = [];
    for (let el of els) {
      const task = !el[PORTALS] ? doFirstConnect : el.isConnected ? doMove : doReConnect;
      for (let el2 = el, subs = el.getElementsByTagName("*"), i = 0; el2; el2 = subs[i++])
        frames.push(...task(el2, portalMap));
    }
    frames.length && this.#loop(frames);
  }
  connectPortal(portalName, portal, root) {
    if (!root[PORTALS]) return; //todo we havn't started yet, so this should not yet run.
    const frames = [];
    for (let el2 of root.getElementsByTagName("*"))
      if (portalName in el2[PORTALS])
        if (el2[PORTALS][portalName] = true)
          for (let at of el2.attributes)
            if (portalNames(at.name)[0] === portalName)
              frames.push(new ConnectFrame(portal, at));
    frames.length && this.#loop(frames);
  }
}

const PORTALS = Symbol("portals");
const MOVEABLES = Symbol("moveables");
const RECONNECTABLES = Symbol("reconnectables");
function* doFirstConnect(el, portalMap) {
  if (!el.hasAttributes())
    return;
  el[PORTALS] = Object.create(null);
  for (let at of el.attributes) {
    const portalName = portalNames(at.name)[0];
    const portal = portalMap.get(portalName);
    if (portal?.onFirstConnect) {
      yield new ConnectFrame(portal, at);
      el[PORTALS][portalName] = portal;
      el[MOVEABLES] ||= !!portal.onMove;
      el[RECONNECTABLES] ||= !!portal.onReconnect;
    } else
      el[PORTALS][portalName] = undefined;
  }
}

function* doMove(el) {
  if (el[MOVEABLES])
    for (let portalName in el[PORTALS])
      if (el[PORTALS][portalName]?.onMove)
        for (let at of el.attributes)
          if (portalNames(at.name)[0] === portalName)
            yield new MoveFrame(el[PORTALS][portalName], at);
}

function* doReConnect(el) {
  if (el[RECONNECTABLES])
    for (let portalName in el[PORTALS])
      if (el[PORTALS][portalName]?.onReconnect)
        for (let at of el.attributes)
          if (portalNames(at.name)[0] === portalName)
            yield new ReConnectFrame(el[PORTALS][portalName], at);
}