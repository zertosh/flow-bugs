/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 *
 * @flow
 */

// Encodes the structure of messages that can be sent from the client to the server.
export type RequestMessage =
  | CallMessage
  | NewObjectMessage
  | CallObjectMessage
  | DisposeMessage
  | UnsubscribeMessage;

export type CallMessage = {
  protocol: string,
  type: 'call',
  method: string,
  id: number,
  args: Object,
};

export type NewObjectMessage = {
  protocol: string,
  type: 'new',
  interface: string,
  id: number,
  args: Object,
};

export type CallObjectMessage = {
  protocol: string,
  type: 'call-object',
  method: string,
  id: number,
  objectId: number,
  args: Object,
};

export type DisposeMessage = {
  protocol: string,
  type: 'dispose',
  id: number,
  objectId: number,
};

export type UnsubscribeMessage = {
  protocol: string,
  type: 'unsubscribe',
  id: number,
};

// Encodes the structure of messages that can be sent from the server to the client.
export type ResponseMessage =
  | PromiseResponseMessage
  | ErrorResponseMessage
  | NextMessage
  | CompleteMessage
  | ErrorMessage;

export type ErrorResponseMessage = {
  protocol: string,
  type: 'error-response',
  id: number,
  error: any,
};

export type PromiseResponseMessage = {
  protocol: string,
  type: 'response',
  id: number,
  result: any,
};

export type NextMessage = {
  protocol: string,
  type: 'next',
  id: number,
  value: any,
};

export type CompleteMessage = {
  protocol: string,
  type: 'complete',
  id: number,
};

export type ErrorMessage = {
  protocol: string,
  type: 'error',
  id: number,
  error: any,
};

// TODO: This should be a custom marshaller registered in the TypeRegistry
export function decodeError(
  message: Object,
  encodedError: ?(Object | string),
): ?(Error | string) {
  if (encodedError != null && typeof encodedError === 'object') {
    const resultError = new Error();
    resultError.message =
      `Remote Error: ${encodedError.message} processing message ${JSON.stringify(message)}\n`
      + JSON.stringify(encodedError.stack);
    // $FlowIssue - some Errors (notably file operations) have a code.
    resultError.code = encodedError.code;
    resultError.stack = encodedError.stack;
    return resultError;
  } else {
    return encodedError;
  }
}

export function createCallMessage(
  protocol: string,
  functionName: string,
  id: number,
  args: Object,
): CallMessage {
  return {
    protocol,
    type: 'call',
    method: functionName,
    id,
    args,
  };
}

export function createCallObjectMessage(
  protocol: string,
  methodName: string,
  objectId: number,
  id: number,
  args: Object,
): CallObjectMessage {
  return {
    protocol,
    type: 'call-object',
    method: methodName,
    objectId,
    id,
    args,
  };
}

export function createNewObjectMessage(
  protocol: string,
  interfaceName: string,
  id: number,
  args: Object,
): NewObjectMessage {
  return {
    protocol,
    type: 'new',
    interface: interfaceName,
    id,
    args,
  };
}

export function createPromiseMessage(
  protocol: string,
  id: number,
  result: any,
): PromiseResponseMessage {
  return {
    protocol,
    type: 'response',
    id,
    result,
  };
}

export function createNextMessage(
  protocol: string,
  id: number,
  value: any,
): NextMessage {
  return {
    protocol,
    type: 'next',
    id,
    value,
  };
}

export function createCompleteMessage(
  protocol: string,
  id: number,
): CompleteMessage {
  return {
    protocol,
    type: 'complete',
    id,
  };
}

export function createObserveErrorMessage(
  protocol: string,
  id: number,
  error: any,
): ErrorMessage {
  return {
    protocol,
    type: 'error',
    id,
    error: formatError(error),
  };
}

export function createDisposeMessage(
  protocol: string,
  id: number,
  objectId: number,
): DisposeMessage {
  return {
    protocol,
    type: 'dispose',
    id,
    objectId,
  };
}

export function createUnsubscribeMessage(
  protocol: string,
  id: number,
): UnsubscribeMessage {
  return {
    protocol,
    type: 'unsubscribe',
    id,
  };
}

export function createErrorResponseMessage(
  protocol: string,
  id: number,
  error: any,
): ErrorResponseMessage {
  return {
    protocol,
    type: 'error-response',
    id,
    error: formatError(error),
  };
}

/**
 * Format the error before sending over the web socket.
 * TODO: This should be a custom marshaller registered in the TypeRegistry
 */
function formatError(error: any): ?(Object | string) {
  if (error instanceof Error) {
    return {
      message: error.message,
      code: error.code,
      stack: error.stack,
    };
  } else if (typeof error === 'string') {
    return error.toString();
  } else if (error === undefined) {
    return undefined;
  } else {
    try {
      return `Unknown Error: ${JSON.stringify(error, null, 2)}`;
    } catch (jsonError) {
      return `Unknown Error: ${error.toString()}`;
    }
  }
}
