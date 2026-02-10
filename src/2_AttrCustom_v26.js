const Attr = {
  onConnect() {
    const varName = this.name.split("_")[1];
    const action = !varName ?
      ([mr]) => EventLoopCube.dispatch(mr) :
      ([mr]) => mr.name.startsWith(varName) && EventLoopCube.dispatch(mr, this);
    const observer = new MutationObserver(action);
    observer.observe(this.ownerElement, { attributes: true, attributeOldValue: true });
  },
  reaction(...args) {
    //if the reaction has arguments, then it is a setter
    //if it has no arguments, then it is a getter
  }
}
/**
 * works out of the box using:
 * 
 * documents.Triggers.define("content-box", AttrResize);
 * documents.Triggers.define("border-box", AttrResize);
 * documents.Triggers.define("device-pixel-content-box", AttrResize);
 */
const Resize = {
  onConnect() {
    const box = ["content-box", "border-box", "device-pixel-content-box"].includes(this.name) ? this.name : "content-box";
    this._observer = new ResizeObserver(([mr]) => eventLoop.dispatch(mr, this));
    this._observer.observe(this.ownerElement, { box });
  }
}

/**
 * AttrIntersection is the main base for IntersectionObserver.
 * With AttrIntersection we can deprecate IntersectionObserver.
 * All other IntersectionObserver triggers should use AttrIntersection.
 */
const Intersection = {
  onConnect() {
    const options = this.name.split("_").slice(1);
    const isOff = options.includes("off");

    this._observer = new IntersectionObserver(([mr]) => eventLoop.dispatch(mr, this), { options });
    this._observer.observe(this.ownerElement);
  }
}

export {
  Attr,
  Intersection,
  Resize
};