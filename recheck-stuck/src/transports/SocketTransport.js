/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 *
 * @flow
 */

import type {Socket} from 'net';
import type {MessageLogger} from '../index';
import type {IDisposable} from '../types';

import EventEmitter from 'events';
import StreamTransport from './StreamTransport';

export default class SocketTransport extends StreamTransport {
  _socket: Socket;
  _emitter: EventEmitter;
  _onConnect: Promise<void>;

  constructor(
    socket: Socket,
    messageLogger: MessageLogger = (direction, message) => { return; },
  ) {
    super(socket, socket, messageLogger);
    this._socket = socket;
    this._emitter = new EventEmitter();

    socket.on('close', () => {
      if (!this.isClosed()) {
        this.close();
      }
      this._emitter.emit('close');
    });

    this._onConnect = new Promise((resolve, reject) => {
      socket.on('connect', resolve);
      socket.on('error', error => reject(error));
    });
  }

  // Returns a promise which resolves on connection or rejects if connection fails.
  onConnected(): Promise<void> {
    return this._onConnect;
  }

  onClose(callback: () => mixed): IDisposable {
    this._emitter.on('close', callback);
    return {
      dispose: () => {
        this._emitter.removeListener('close', callback);
      },
    };
  }

  close(): void {
    super.close();
    // Send the FIN packet ...
    this._socket.end();
    // Then hammer it closed
    this._socket.destroy();
    this._emitter.removeAllListeners();
  }
}
