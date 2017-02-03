/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 *
 * @flow
 */

import type {Server, Socket} from 'net';
import type {IDisposable} from './types';

import net from 'net';
import EventEmitter from 'events';
import RpcConnection from './RpcConnection';
import SocketTransport from './transports/SocketTransport';
import ServiceRegistry from './ServiceRegistry';

// An RPC server which listens for connections on a localhost socket.
// TODO: Consider extending with more socket listening options.
export default class SocketServer {
  _serviceRegistry: ServiceRegistry;
  _server: Server;
  _listening: Promise<void>;
  _resolve: () => void;
  _reject: () => void;
  _connections: Set<RpcConnection<SocketTransport>>;
  _emitter: EventEmitter;

  constructor(serviceRegistry: ServiceRegistry) {
    this._emitter = new EventEmitter();
    this._connections = new Set();
    this._serviceRegistry = serviceRegistry;
    this._listening = new Promise((resolve, reject) => {
      this._resolve = resolve;
      this._reject = reject;
    });
    this._server = net.createServer();
    this._server.on('connection', socket => {
      this._onConnection(socket);
    });
    this._server.on('error', error => {
      this._onError(error);
    });
    this._server.listen(0, 'localhost', undefined, () => {
      this._resolve();
    });
  }

  _onConnection(socket: Socket): void {
    const transport = new SocketTransport(socket);
    const connection = RpcConnection.createServer(
      this._serviceRegistry,
      transport);
    transport.onClose(() => {
      this._connections.delete(connection);
    });
    this._connections.add(connection);
  }

  _onError(error: Error): void {
    this._emitter.emit('error', error);
  }

  onError(callback: (error: Error) => mixed): IDisposable {
    this._emitter.on('error', callback);
    return {
      dispose: () => {
        this._emitter.removeListener('error', callback);
      },
    };
  }

  untilListening(): Promise<void> {
    return this._listening;
  }

  async getAddress(): Promise<net$Socket$address> {
    await this.untilListening();
    return this._server.address();
  }

  // Close all open connections and shutdown the server.
  dispose(): void {
    for (const connection of this._connections) {
      connection.getTransport().close();
    }
    this._connections.clear();
    this._reject(new Error('Closing SocketServer'));
    this._server.close();
    this._emitter.removeAllListeners();
  }
}
