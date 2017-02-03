/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 *
 * @flow
 */

import type {ReturnKind, Type, Parameter} from './types';
import type ObjectRegistry from './ObjectRegistry';

export type MessageLogger = (
  direction: 'send' | 'receive',
  message: string,
) => void;

export type ConfigEntry = {
  name: string,
  definition: string,
  implementation: string,
  // When true, doesn't mangle the service name into method names for functions.
  preserveFunctionNames?: boolean,
};

export type NamedTransformer = (
  value: any,
  context: ObjectRegistry,
) => (any | Promise<any>);

export type PredefinedTransformer = {
  typeName: string,
  marshaller: NamedTransformer,
  unmarshaller: NamedTransformer,
};

export type RpcContext = {
  callRemoteFunction(functionName: string, returnType: ReturnKind, args: Object): any,
  callRemoteMethod(
    objectId: number,
    methodName: string,
    returnType: ReturnKind,
    args: Object
  ): any,
  createRemoteObject(
    interfaceName: string,
    thisArg: Object,
    unmarshalledArgs: Array<any>,
    argTypes: Array<Parameter>
  ): void,
  disposeRemoteObject(object: Object): Promise<void>,
  marshal(value: any, type: Type): any,
  unmarshal(value: any, type: Type): any,
  marshalArguments(
    args: Array<any>,
    argTypes: Array<Parameter>
  ): Promise<Object>,
  unmarshalArguments(
    args: Object,
    argTypes: Array<Parameter>
  ): Promise<Array<any>>,
};

export type ProxyFactory = (context: RpcContext) => Object;

export {default as ServiceRegistry} from './ServiceRegistry';
export {default as RpcConnection} from './RpcConnection';
export {default as StreamTransport} from './transports/StreamTransport';
export {default as SocketTransport} from './transports/SocketTransport';
export {default as SocketServer} from './SocketServer';
export {default as RpcProcess} from './RpcProcess';
export {default as loadServicesConfig} from './loadServicesConfig';


import fs from 'fs';
import path from 'path';
import invariant from 'assert';
// $FlowIssue: Missing definitions
import Module from 'module';

import {generateProxy} from './proxy-generator';
import ServiceParser from './ServiceParser';

// Proxy dependencies
import {Observable} from 'rxjs';

// Cache for remote proxies
const proxiesCache: Map<string, ProxyFactory> = new Map();

export function proxyFilename(definitionPath: string): string {
  invariant(
    path.isAbsolute(definitionPath),
    `"${definitionPath}" definition path must be absolute.`,
  );
  const dir = path.dirname(definitionPath);
  const name = path.basename(definitionPath, path.extname(definitionPath));
  const filename = path.join(dir, name + 'Proxy.js');
  return filename;
}

export function createProxyFactory(
  serviceName: string,
  preserveFunctionNames: boolean,
  definitionPath: string,
  predefinedTypes: Array<string>,
): ProxyFactory {
  if (!proxiesCache.has(definitionPath)) {
    const filename = proxyFilename(definitionPath);

    let code;
    if (fs.existsSync(filename)) {
      code = fs.readFileSync(filename, 'utf8');
    } else {
      const definitionSource = fs.readFileSync(definitionPath, 'utf8');
      const defs = ServiceParser.parseDefinition(
        definitionPath, definitionSource, predefinedTypes);
      code = generateProxy(serviceName, preserveFunctionNames, defs);
    }

    const m = loadCodeAsModule(code, filename);
    m.exports.inject(Observable);

    proxiesCache.set(definitionPath, m.exports);
  }

  const factory = proxiesCache.get(definitionPath);
  invariant(factory != null);

  return factory;
}

function loadCodeAsModule(code: string, filename: string): Module {
  invariant(code.length > 0, 'Code must not be empty.');
  const m = new Module(filename);
  m.filename = filename;
  m.paths = []; // Disallow require resolving by removing lookup paths.
  m._compile(code, filename);
  m.loaded = true;

  return m;
}

// Export caches for testing.
export const __test__ = {
  proxiesCache,
};
