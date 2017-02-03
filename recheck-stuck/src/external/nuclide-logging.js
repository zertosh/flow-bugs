/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 *
 * @flow
 */

export function getLogger() {
  return {
    log(...args: Array<any>) { console.log(...args); },
    info(...args: Array<any>) { console.log(...args); },
    error(...args: Array<any>) { console.error(...args); },
    warn(...args: Array<any>) { console.log(...args); },
  }
}
