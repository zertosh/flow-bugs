flow-jest-resolve
=================

Highlights an issue where `flow@0.34.0` and `jest@17.0.0` resolve a module differently.

Run:

```
$ npm install
$ npm test
```

Output:

```
$ npm test

> flow-jest-resolve@0.0.0 test /Users/asuarez/src/flow-jest-resolve
> jest Libraries/__tests__/ImagePreview-test.js

 FAIL  Libraries/__tests__/ImagePreview-test.js
  ● base64 › resolves the same in flow & jest

    expect(received).toEqual(expected)

    Expected value to equal:
      "/Users/asuarez/src/flow-jest-resolve/Utilities/base64-js.js"
    Received:
      "/Users/asuarez/src/flow-jest-resolve/vendor/node_modules/plist/node_modules/base64-js/lib/b64.js"

      at Object.it (Libraries/__tests__/ImagePreview-test.js:25:28)
      at process._tickCallback (internal/process/next_tick.js:103:7)

  base64
    ✕ resolves the same in flow & jest (25ms)

Test Suites: 1 failed, 1 total
Tests:       1 failed, 1 total
Snapshots:   0 total
Time:        0.854s, estimated 1s
Ran all test suites matching "Libraries/__tests__/ImagePreview-test.js".
npm ERR! Test failed.  See above for more details.
```
