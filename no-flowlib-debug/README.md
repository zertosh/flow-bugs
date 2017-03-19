# no-flowlib-debug

When using `no_flowlib=true`, the `flow-typed` definition for `debug` breaks, and you get this error:

```
index.js:6
  6: const foo = debug('foo');
                 ^^^^^^^^^^^^ function call. Callable signature not found in
  6: const foo = debug('foo');
                 ^^^^^ module `debug`
```

If you do `flow dump-types --strip-root index.js`, you see that the type is incomplete:

```
index.js:4:7-11: {colors: Array<number>, disable: () => void, enable: (namespaces: string) => void, enabled: (name: string) => boolean, formatters: {[formatter: string]: () => {},}, humanize: () => void, log: () => void, names: Array<string>, skips: Array<string>, useColors: () => boolean}
index.js:4:15-30: {colors: Array<number>, disable: () => void, enable: (namespaces: string) => void, enabled: (name: string) => boolean, formatters: {[formatter: string]: () => {},}, humanize: () => void, log: () => void, names: Array<string>, skips: Array<string>, useColors: () => boolean}
index.js:6:7-9: empty
index.js:6:13-17: {colors: Array<number>, disable: () => void, enable: (namespaces: string) => void, enabled: (name: string) => boolean, formatters: {[formatter: string]: () => {},}, humanize: () => void, log: () => void, names: Array<string>, skips: Array<string>, useColors: () => boolean}
index.js:6:13-24: empty
index.js:6:19-23: string
index.js:8:1-3: empty
index.js:8:1-9: empty
```

However, if you add `flow-typed/npm/debug_v2.x.x.js` to `[libs]`, then it works, and `dump-types` gives you:

```
index.js:4:7-11: (namespace: string) => {+$call: ((...args: Array<mixed>) => void) & ((formatter: string, ...args: Array<mixed>) => void) & ((err: Error, ...args: Array<mixed>) => void), enabled: boolean, log: () => {}, namespace: string}
index.js:4:15-30: (namespace: string) => {+$call: ((...args: Array<mixed>) => void) & ((formatter: string, ...args: Array<mixed>) => void) & ((err: Error, ...args: Array<mixed>) => void), enabled: boolean, log: () => {}, namespace: string}
index.js:6:7-9: {+$call: ((...args: Array<mixed>) => void) & ((formatter: string, ...args: Array<mixed>) => void) & ((err: Error, ...args: Array<mixed>) => void), enabled: boolean, log: () => {}, namespace: string}
index.js:6:13-17: (namespace: string) => {+$call: ((...args: Array<mixed>) => void) & ((formatter: string, ...args: Array<mixed>) => void) & ((err: Error, ...args: Array<mixed>) => void), enabled: boolean, log: () => {}, namespace: string}
index.js:6:13-24: {+$call: ((...args: Array<mixed>) => void) & ((formatter: string, ...args: Array<mixed>) => void) & ((err: Error, ...args: Array<mixed>) => void), enabled: boolean, log: () => {}, namespace: string}
index.js:6:19-23: string
index.js:8:1-3: {+$call: ((...args: Array<mixed>) => void) & ((formatter: string, ...args: Array<mixed>) => void) & ((err: Error, ...args: Array<mixed>) => void), enabled: boolean, log: () => {}, namespace: string}
index.js:8:1-9: {}
```
