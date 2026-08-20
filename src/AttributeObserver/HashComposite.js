const f64 = new Float64Array(1);
const u32 = new Uint32Array(f64.buffer);
const HASHTAGS = {
  string: 1,
  number: 2,
  bigint: 3,
  true: 4,
  false: 5,
  object: 6,
  null: 7,
  undefined: 8,
  array: 9,
  objectLiteral: 10,
  property: 11,
  function: 12,
};

function hashString(hash, str) {
  for (let i = 0; i < str.length; i++)
    hash = Math.imul(hash ^ str.charCodeAt(i), 0x01000193);
  return hash;
}

function hashPrimitive(hash, v) {
  if (v === null) return Math.imul(hash ^ HASHTAGS.null, 0x01000193);
  if (v === undefined) return Math.imul(hash ^ HASHTAGS.undefined, 0x01000193);
  if (v === true) return Math.imul(hash ^ HASHTAGS.true, 0x01000193);
  if (v === false) return Math.imul(hash ^ HASHTAGS.false, 0x01000193);

  const t = typeof v;
  hash = Math.imul(hash ^ (HASHTAGS[t] || 8), 0x01000193);
  if (t === 'string')
    return hashString(hash, v);
  if (t === 'bigint')
    return hashString(hash, v.toString());
  if (t === 'number' && Number.isInteger(v) && v >= 0 && v <= 0xFFFFFFFF)
    return Math.imul(hash ^ v, 0x01000193);
  if (t === 'number') {
    f64[0] = v;
    hash = Math.imul(hash ^ u32[0], 0x01000193);
    return Math.imul(hash ^ u32[1], 0x01000193);
  }
  throw new TypeError("Unsupported type for hashing: " + t + " with value: " + v);
}

class WeakHashMap {
  constructor() {
    this.simpleHashToObj = new Map();
    this.objToHash = new WeakMap();
    this.multiHashToObjArray = new Map();
    this.finale = new FinalizationRegistry(hash => this.delete(hash));
  }
  #sameSame(a, b) {
    if (a === b)
      return true;
    const ak = Object.keys(a);
    const bk = Object.keys(b);
    if (ak.length !== bk.length)
      return false;
    for (let i = 0; i < ak.length; i++)
      if (ak[i] !== bk[i] || !Object.is(a[ak[i]], b[bk[i]]))//identical props inside Composite objects must be the same objects.
        return false;
    return Array.isArray(a) !== Array.isArray(b) ? false : true;
  }
  add(hash, obj) {
    const old = this.simpleHashToObj.get(hash)?.deref();
    if (!old) {
      this.simpleHashToObj.set(hash, new WeakRef(obj));
      this.objToHash.set(obj, hash);
      this.finale.register(obj, hash);
      return obj;
    }
    if (this.#sameSame(old, obj))
      return old;
    let ar = this.multiHashToObjArray.get(hash);
    if (!ar) this.multiHashToObjArray.set(hash, ar = []);
    for (let i = 0, o; i < ar.length; i++)
      if (this.#sameSame(o = ar[i].deref(), obj))
        return o;
    ar.push(new WeakRef(obj));
    this.objToHash.set(obj, hash);
    this.finale.register(obj, hash);
    return obj;
  }
  getHash(obj) {
    return this.objToHash.get(obj);
  }
  getObj(hash) {
    const single = this.simpleHashToObj.get(hash)?.deref();
    if (!this.multiHashToObjArray.has(hash))
      return [single];
    return [single, ...this.multiHashToObjArray.get(hash).map(wr => wr.deref()).filter(Boolean)];
  }
  delete(hash) {
    const single = this.simpleHashToObj.get(hash)?.deref();
    if (!single)
      this.simpleHashToObj.delete(hash);
    const ar = this.multiHashToObjArray.get(hash);
    if (!ar) return;
    const ar2 = ar.filter(wr => wr.deref());
    if (!this.simpleHashToObj.has(hash) && ar2.length)
      this.simpleHashToObj.set(hash, ar2.shift());
    if (!ar2.length)
      this.multiHashToObjArray.delete(hash);
    else
      this.multiHashToObjArray.set(hash, ar2);
  }
}

const HASHCACHE = new WeakHashMap();
const DIRTY = Symbol("dirty");

export function composite(obj) {
  const res = compositeImpl(obj, new WeakSet());
  return res === DIRTY ? obj : res;
}

function compositeImpl(obj, seen) {
  if (composite.is(obj)) return obj;
  if (Object.isFrozen(obj)) return DIRTY;

  const proto = Object.getPrototypeOf(obj);
  const isArray = proto === Array.prototype;
  if (!isArray && proto !== Object.prototype && proto !== null) return DIRTY;
  if (Object.getOwnPropertySymbols(obj).length > 0) return DIRTY;
  if (seen.has(obj)) return DIRTY;
  seen.add(obj);

  let hash = isArray ?
    Math.imul(Math.imul(0x811c9dc5 ^ HASHTAGS.array, 0x01000193) ^ obj.length, 0x01000193) :
    Math.imul(0x811c9dc5 ^ HASHTAGS.objectLiteral, 0x01000193);
  let dirty = false;
  const keys = Object.keys(obj);
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    const o = obj[k];
    const v = compositeImpl(o, seen);
    if (v === DIRTY) {
      dirty = true;
      continue;
    }
    obj[k] = v;
    if (dirty)
      continue;
    hash = Math.imul(hash ^ HASHTAGS.property, 0x01000193);
    hash = hashString(hash, k);
    const t = typeof v;
    hash = (v && t === 'object') ?
      Math.imul(hash ^ HASHCACHE.getHash(v), 0x01000193) :
      hashPrimitive(hash, v);
  }

  seen.delete(obj);
  return dirty ? DIRTY : HASHCACHE.add(hash, Object.freeze(obj));
}

composite.is = function is(v) {
  return v == null || typeof v === 'string' ||
    typeof v === 'number' || typeof v === 'boolean' ||
    typeof v === 'bigint' || HASHCACHE.getHash(v) !== undefined;
}

composite.lenseSet = function lenseSet() {
};

composite.lensePushOrFail = function lensePushOrFail() {
  const value = arguments.at(-1);
  if (arguments.length < 3)
    throw new TypeError("composite.lensePush: Expected at least 3 arguments, but got " + arguments.length);
  let ar = arguments[0];
  for (let i = 1; i < arguments.length - 2; i++) {
    const key = arguments[i];
    if (!Object.hasOwn(ar, key))
      throw new TypeError("composite.lensePush: Key " + key + " does not exist in the object at path " + arguments.slice(1, i + 1).join("."));
    ar = ar[key];
  }
  if (!Array.isArray(ar))
    throw new TypeError("composite.lensePush: Expected an array at path " + arguments.slice(1, arguments.length - 1).join(".") + ", but got " + typeof ar);
  ar.push(value);
};

composite.lensePushOrCreate = function lensePushOrCreate() {
const value = arguments.at(-1);
  if (arguments.length < 3)
    throw new TypeError("composite.lensePush: Expected at least 3 arguments, but got " + arguments.length);
  let ar = arguments[0];
  for (let i = 1; i < arguments.length - 2; i++) {
    const key = arguments[i];
    if (!Object.hasOwn(ar, key))
      ar[key] = typeof arguments[i + 1] === "number" ? [] : {};
    ar = ar[key];
  }
  if (!Array.isArray(ar))
    throw new TypeError("composite.lensePush: Expected an array at path " + arguments.slice(1, arguments.length - 1).join(".") + ", but got " + typeof ar);
  ar.push(value);
}

//const newState = composite.lensePush(state, "bob", "alice", "and a one");
//const newState = composite.lenseSet(state, "bob", "alice", -3, "and a one");
//state is a composite.
//const newState = composite({...state, bob: {...state.bob, alice: [...state.bob.alice, "and a one"]}});

// const first = obj => HASHCACHE.getHash(obj) === undefined ? obj : (Array.isArray(obj) ? [...obj] : { ...obj });

// function buildPath(root, args, i, end, last) {
//   for (; i < end; i++) {
//     const key = args[i];
//     const j = i + 1;
//     if (j === end)
//       return root[key] = typeof last === "number" ? [] : {};
//     root = root[key] = typeof args[j] === "number" ? [] : {};
//   }
// }

// function cloneCompositePath(root, args, i, end, last) {
//   root = Array.isArray(root) ? [...root] : { ...root };
//   for (; i < end; i++) {
//     const key = args[i];
//     if (!Object.hasOwn(root, key))
//       return buildPath(root, args, i, end, last);
//     const next = root[key];
//     root = root[key] = Array.isArray(next) ? [...next] : { ...next };
//   }
//   return root;
// }

// function spool(root, args, i, end, last) {
//   for (; i < end; i++) {
//     const key = args[i];
//     if (!Object.hasOwn(root, key))
//       return buildPath(root, args, i, end, last);
//     const next = root[key];
//     if (HASHCACHE.getHash(next))
//       return root[key] = cloneCompositePath(next, args, i, end, last);
//     root = next;
//   }
//   return root;
// }

// const state = {};
// //the problem with writing it like this, is that we always make new objects, even when we just want to deepMutate.
// const state2 = {...state, bob: {...state.bob, alice: [...state.bob.alice]}}; 
// composite.cloneWriteable = function cloneWriteable() {
//   const root = first(arguments[0]);
//   spool(root, arguments, 1, arguments.length);
//   return root;
// }

// composite.set = function set() {
//   const len = arguments.length;
//   if (len < 3)
//     throw new TypeError("composite.set: Expected at least 3 arguments, but got " + len);
//   const root = first(arguments[0]);
//   const last = spool(root, arguments, 1, len - 2);
//   last[arguments[len - 2]] = arguments[len - 1];
//   return root;
// }

//todo 1. no! we need to memoize function calls.. But i don't see how we can do this super efficiently.
//todo 2. yes! we need a method (lens) to assign a property into a composite object, so that it returns the most efficient composite object.
//todo 3. that means that the object must be unfrozen when we assign something to it.
//todo 4. no! immer uses a Proxy to do this, but we can do it without a Proxy, by using a lens to assign properties into a composite object. This method will create a new composite object with the new property, and return it. The old composite object will remain unchanged.
