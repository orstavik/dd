# DoubleDouts

The re-discovery of HTML

## How to build
```bash
npx esbuild --sourcemap --bundle src/dd.js --outfile=dd.js --external:https://*
```

## How to run tests

1. In a terminal, do as follows:
```bash
npx http-server -p 3000 --cors -S -C test/cert.pem -K test/key.pem
```

2. Then open in [https://127.0.0.1:3000/test](https://127.0.0.1:3000/test) your browser.

## Use `cdn.jsdelivr.net` to run doubledots

* [https://cdn.jsdelivr.net/gh/orstavik/dd/dd.js](https://cdn.jsdelivr.net/gh/orstavik/dd/dd.js)