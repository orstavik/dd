// function erCheckSchema({ rows, schemas }) {
//   const expected = Object.create(null);
//   for (const type in schemas)
//     expected[type] = Object.keys(schemas[type]).length;
//   for (const [id, tuple] of Object.entries(rows)) {
//     const type = id.split('/')[0];
//     if (!(type in expected))
//       throw new Error(`Unknown type "${type}": ${id}`);
//     if (tuple.length !== expected[type])
//       throw new Error(`Wrong tuple length: ${id}: Expected ${expected[type]} values, got ${tuple.length}.`);
//   }
// }

// function erCheckReferences({ rows, schemas }) {
//   let invalids;
//   for (const [id, tuple] of Object.entries(rows)) {
//     for (let i = 0; i < tuple.length; i++) {
//       const value = tuple[i];
//       if (Array.isArray(value)) {
//         const unknowns = value.filter(ref => rows[ref] === undefined);
//         if (unknowns.length) 
//           ((invalids ??= {})[id] ??= {})[Object.keys(schemas)[i]] = unknowns;
//       }
//     }
//   }
//   return invalids;
// }

const er = {
  reaction: NAME => function ({ rows, schemas }) {
    if (!rows || !schemas) return undefined;

    const SCHEMAS = Object.create(null);
    const OwnKeys = Object.create(null);
    for (let type in schemas) {
      const keys = Object.keys(schemas[type]);
      SCHEMAS[type] = Object.fromEntries(keys.map((k, i) => [k, i]));
      OwnKeys[type] = Object.freeze(['id', 'type', 'slug', ...keys]);
    }

    function createERProxy(rows, id) {
      const tuple = rows[id];
      if (tuple == null) return null;
      const [type, slug] = id.split('/');
      const nameToIndex = SCHEMAS[type];

      return new Proxy(Object.create(null), {
        get(target, p) {
          if (p === 'id') return id;
          if (p === 'type') return type;
          if (p === 'slug') return slug;
          const i = nameToIndex[p];
          if (i === undefined) return undefined;
          const value = tuple[i];
          if (Array.isArray(value))
            return value.map(childId => createERProxy(rows, childId));
          return value;
        },
        ownKeys(target) {
          return OwnKeys[type];
        },
        getOwnPropertyDescriptor(target, prop) {
          return OwnKeys[type].includes(prop) ? { enumerable: true, configurable: true, value: this.get(target, prop) } : undefined;
        },
      });
    }
    return new Proxy(rows, {
      get(target, prop) {
        return Object.hasOwn(target, prop) ? createERProxy(rows, prop) : target[prop];
      }
    });
  }
};

export {
  er,
  // erCheckSchema,
  // erCheckReferences,
}