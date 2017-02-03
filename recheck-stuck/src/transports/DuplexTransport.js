/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 *
 * @flow
 */

import type {Observable, Subject} from 'rxjs';
import type {TransportT} from '../types';

export default class DuplexTransport implements TransportT {
  _closed: boolean;
  _input: Subject<string>;
  _output: Subject<string>;

  constructor(input: Subject<string>, output: Subject<string>) {
    this._closed = false;
    this._input = input;
    this._output = output;
  }

  send(message: string): void {
    this._output.next(message);
  }

  onMessage(): Observable<string> {
    return this._input;
  }

  close(): void {
    this._closed = true;
  }

  isClosed(): boolean {
    return this._closed;
  }
}
