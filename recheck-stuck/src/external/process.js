/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 *
 * @flow
 */

/* eslint-disable no-console */

import type {ProcessExitMessage, ProcessMessage} from './process-rpc-types';

import child_process from 'child_process';
import {splitStream, takeWhileInclusive} from './observable';
import {observeStream} from './stream';
import {Observable} from 'rxjs';
import invariant from 'assert';

// Node crashes if we allow buffers that are too large.
const DEFAULT_MAX_BUFFER = 100 * 1024 * 1024;

export type AsyncExecuteReturn = {
  // If the process fails to even start up, exitCode will not be set
  // and errorCode / errorMessage will contain the actual error message.
  // Otherwise, exitCode will always be defined.
  errorMessage?: string,
  errorCode?: string,
  exitCode?: number,
  stderr: string,
  stdout: string,
};

export type AsyncExecuteOptions = child_process$execFileOpts & {
  // The contents to write to stdin.
  stdin?: ?string,
};

/**
 * Basically like spawn/fork, except it handles and logs errors instead of
 * crashing the process. This is much lower-level than asyncExecute. Unless
 * you have a specific reason you should use asyncExecute instead.
 */
export function safeSpawn(
  command: string,
  args?: Array<string> = [],
  options?: child_process$spawnOpts = {},
): child_process$ChildProcess {
  return _makeChildProcess('spawn', command, args, options);
}

/**
 * Helper type/function to create child_process by spawning/forking the process.
 */
type ChildProcessOpts = child_process$spawnOpts | child_process$forkOpts;

function _makeChildProcess(
  type: 'spawn' | 'fork' = 'spawn',
  command: string,
  args?: Array<string> = [],
  options?: ChildProcessOpts = {},
): child_process$ChildProcess {
  const child = child_process[type](
    command,
    args,
    prepareProcessOptions(options),
  );
  child.on('error', error => {
    console.error('error with command:', command, args, options, 'error:', error);
  });
  writeToStdin(child, options);
  return child;
}

/**
 * Creates an observable with the following properties:
 *
 * 1. It contains a process that's created using the provided factory when you subscribe.
 * 2. It doesn't complete until the process exits (or errors).
 * 3. The process is killed when you unsubscribe.
 *
 * This means that a single observable instance can be used to spawn multiple processes. Indeed, if
 * you subscribe multiple times, multiple processes *will* be spawned.
 *
 * IMPORTANT: The exit event does NOT mean that all stdout and stderr events have been received.
 */
function _createProcessStream(
  createProcess: () => child_process$ChildProcess,
  throwOnError: boolean,
  killTreeOnComplete: boolean,
): Observable<child_process$ChildProcess> {
  return Observable.defer(() => {
    const process = createProcess();
    let finished = false;
    let wasKilled = false;

    // If the process returned by `createProcess()` was not created by it (or at least in the same
    // tick), it's possible that its error event has already been dispatched. This is a bug that
    // needs to be fixed in the caller. Generally, that would just mean refactoring your code to
    // create the process in the function you pass. If for some reason, this is absolutely not
    // possible, you need to make sure that the process is passed here immediately after it's
    // created (i.e. before an ENOENT error event would be dispatched). Don't refactor your code to
    // avoid this function; you'll have the same bug, you just won't be notified! XD
    invariant(
      process.exitCode == null && !process.killed,
      'Process already exited. (This indicates a race condition in Nuclide.)',
    );

    const errors = Observable.fromEvent(process, 'error');
    const exit = observeProcessExitMessage(process);

    return Observable.of(process)
      // Don't complete until we say so!
      .merge(Observable.never())
      // Get the errors.
      .takeUntil(throwOnError ? errors.flatMap(Observable.throw) : errors)
      .takeUntil(exit)
      .do({
        error: () => { finished = true; },
        complete: () => { finished = true; },
      })
      .finally(() => {
        if (!finished && !wasKilled) {
          wasKilled = true;
          process.kill();
        }
      });
  });
}

function observeProcessExitMessage(
  process: child_process$ChildProcess,
): Observable<ProcessExitMessage> {
  return Observable.fromEvent(
      process,
      'exit',
      (exitCode: ?number, signal: ?string) => ({kind: 'exit', exitCode, signal}))
    // An exit signal from SIGUSR1 doesn't actually exit the process, so skip that.
    .filter(message => message.signal !== 'SIGUSR1')
    .take(1);
}

/**
 * Observe the stdout, stderr and exit code of a process.
 * stdout and stderr are split by newlines.
 */
export function observeProcessExit(
  createProcess: () => child_process$ChildProcess,
  killTreeOnComplete?: boolean = false,
): Observable<ProcessExitMessage> {
  return _createProcessStream(createProcess, false, killTreeOnComplete)
    .flatMap(observeProcessExitMessage);
}

export function getOutputStream(
  process: child_process$ChildProcess,
  killTreeOnComplete?: boolean = false,
): Observable<ProcessMessage> {
  return Observable.defer(() => {
    // We need to start listening for the exit event immediately, but defer emitting it until the
    // (buffered) output streams end.
    const exit = observeProcessExit(() => process, killTreeOnComplete).publishReplay();
    const exitSub = exit.connect();

    const error = Observable.fromEvent(process, 'error')
      .map(errorObj => ({kind: 'error', error: errorObj}));
    // It's possible for stdout and stderr to remain open (even indefinitely) after the exit event.
    // This utility, however, treats the exit event as stream-ending, which helps us to avoid easy
    // bugs. We give a short (100ms) timeout for the stdout and stderr streams to close.
    const close = exit.delay(100);
    const stdout = splitStream(observeStream(process.stdout).takeUntil(close))
      .map(data => ({kind: 'stdout', data}));
    const stderr = splitStream(observeStream(process.stderr).takeUntil(close))
      .map(data => ({kind: 'stderr', data}));

    return takeWhileInclusive(
      Observable.merge(
        Observable.merge(stdout, stderr).concat(exit),
        error,
      ),
      event => event.kind !== 'error' && event.kind !== 'exit',
    )
      .finally(() => { exitSub.unsubscribe(); });
  });
}

function prepareProcessOptions(
  options: Object,
): Object {
  return {
    ...options,
    env: {
      ...process.env,
      ...options.env,
    },
  };
}

/**
 * Returns a promise that resolves to the result of executing a process.
 *
 * @param command The command to execute.
 * @param args The arguments to pass to the command.
 * @param options Options for changing how to run the command.
 *     Supports the options listed here: http://nodejs.org/api/child_process.html
 *     in addition to the custom options listed in AsyncExecuteOptions.
 */
export function asyncExecute(
  command: string,
  args: Array<string>,
  options?: AsyncExecuteOptions = {},
): Promise<AsyncExecuteReturn> {
  return new Promise((resolve, reject) => {
    const process = child_process.execFile(
      command,
      args,
      prepareProcessOptions({
        maxBuffer: DEFAULT_MAX_BUFFER,
        ...options,
      }),
      // Node embeds various properties like code/errno in the Error object.
      (err: any /* Error */, stdoutBuf, stderrBuf) => {
        const stdout = stdoutBuf.toString('utf8');
        const stderr = stderrBuf.toString('utf8');
        if (err == null) {
          resolve({
            stdout,
            stderr,
            exitCode: 0,
          });
        } else if (Number.isInteger(err.code)) {
          resolve({
            stdout,
            stderr,
            exitCode: err.code,
          });
        } else {
          resolve({
            stdout,
            stderr,
            errorCode: err.errno || 'EUNKNOWN',
            errorMessage: err.message,
          });
        }
      },
    );
    writeToStdin(process, options);
  });
}

function writeToStdin(
  childProcess: child_process$ChildProcess,
  options: Object,
): void {
  if (typeof options.stdin === 'string' && childProcess.stdin != null) {
    // Note that the Node docs have this scary warning about stdin.end() on
    // http://nodejs.org/api/child_process.html#child_process_child_stdin:
    //
    // "A Writable Stream that represents the child process's stdin. Closing
    // this stream via end() often causes the child process to terminate."
    //
    // In practice, this has not appeared to cause any issues thus far.
    childProcess.stdin.write(options.stdin);
    childProcess.stdin.end();
  }
}

/**
 * Simple wrapper around asyncExecute that throws if the exitCode is non-zero.
 */
export async function checkOutput(
  command: string,
  args: Array<string>,
  options?: AsyncExecuteOptions = {},
): Promise<AsyncExecuteReturn> {
  const result = await asyncExecute(command, args, options);
  if (result.exitCode !== 0) {
    const reason = result.exitCode != null ? `exitCode: ${result.exitCode}` :
      `error: ${String(result.errorMessage)}`;
    throw new Error(
      `asyncExecute "${command}" failed with ${reason}, ` +
      `stderr: ${result.stderr}, stdout: ${result.stdout}.`,
    );
  }
  return result;
}
