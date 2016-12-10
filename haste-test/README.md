* Case 1a and 1b contradict each other.
* Case 1a vs 5a are surprising: A `.js.flow` in a `node_modules` has higher resolution priority than a `.js` outside of `node_modules`.
* All cases should have duplicate module errors. But especially case #3 and #6.
* Fix request: Having a `aaa.js.flow` without a sibling `aaa.js` should be considered an error.

# Cases

* All cases assume there's a `/test.js`.

## Case 1a

```
/node_modules/zzz/aaa.js  @providesModule aaa
/node_modules/zzz/index.js
/aaa.js  @providesModule aaa

$ flow find-module --strip-root aaa test.js
aaa.js
```

## Case 1b

```
/node_modules/aaa/zzz.js  @providesModule zzz
/node_modules/aaa/index.js
/zzz.js  @providesModule zzz

$ flow find-module --strip-root zzz test.js
node_modules/aaa/zzz.js
```

## Case 2

```
/node_modules/zzz/aaa.js  @providesModule aaa
/node_modules/zzz/index.js

$ flow find-module --strip-root aaa test.js
node_modules/zzz/aaa.js
```

## Case 3

```
/node_modules/aaa/aaa.js  @providesModule aaa
/node_modules/aaa/index.js
/aaa.js  @providesModule aaa

$ flow find-module --strip-root aaa test.js
node_modules/aaa/index.js
```

## Case 4

```
/node_modules/aaa/aaa.js  @providesModule aaa
/node_modules/aaa/index.js
/aaa.js.flow  @providesModule aaa

$ flow find-module --strip-root aaa test.js
node_modules/aaa/index.js
```

## Case 5a

```
/node_modules/zzz/aaa.js.flow  @providesModule aaa
/node_modules/zzz/index.js
/aaa.js  @providesModule aaa

$ flow find-module --strip-root aaa test.js
node_modules/zzz/aaa.js.flow
```

## Case 5b

```
/node_modules/zzz/aaa.js.flow  @providesModule aaa
/node_modules/zzz/index.js
/aaa.js.flow  @providesModule aaa

$ flow find-module --strip-root aaa test.js
aaa.js.flow
```

## Case 5c

```
/node_modules/zzz/aaa-in-zzz.js.flow  @providesModule aaa
/node_modules/zzz/index.js
/aaa.js  @providesModule aaa

$ flow find-module --strip-root aaa test.js
node_modules/zzz/aaa-in-zzz.js.flow
```

## Case 6

```
/node_modules/aaa/aaa.js.flow  @providesModule aaa
/node_modules/aaa/index.js
/aaa.js.flow  @providesModule aaa

$ flow find-module --strip-root aaa test.js
node_modules/aaa/index.js
```
