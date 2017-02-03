This is a subset of https://github.com/facebooknuclide/nuclide-flow-rpc to repro a flow rechecking bug.

**Repro steps:**

  1. `npm install`
  2. `flow`
  3. Add any number of empty lines in `src/types.js` after `L161`.
  4. `flow`
  5. Stuck at rechecking!!

* `flow stop` doesn't kill the server completely. It looks like it does, but there's still `flow` process lingering.
* It's super weird that it's changing anything after `L161`. I trial-and-error'ed my way to that line.
