function segments() { return this.pathname.split('/').slice(1); }
export function patchSegments(...protos){
  for (let proto of protos)
    if(proto)
      Object.defineProperty(proto, 'segments', { get: segments, configurable: true });
}

