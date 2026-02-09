function log(name, first, ...rest) {
  console.groupCollapsed(first);
  console[name](...rest);
  console.groupEnd();
}

const funcs = {};
// these two functions are defined by default in dd.js
// funcs.debugger = function (...args) { console.log(this, ...args); debugger; };
// "log",
for (let name of ["debug", "info", "warn", "error"])
  funcs[name] = log.bind(null, name);

export { funcs as console };