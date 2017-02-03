/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 *
 * @flow
 */

export class TimingTracker {
  constructor(eventName: string) {}
  onError(error: Error): void {}
  onSuccess(): void {}
}

export function startTracking(eventName: string): TimingTracker {
  return new TimingTracker(eventName);
}

export function trackTiming<T>(eventName: string, operation: () => T): T {
  const tracker = startTracking(eventName);
  try {
    const result = operation();
    if (result != null && typeof result.then === 'function') {
      return result.then(value => {
        tracker.onSuccess();
        return value;
      }, reason => {
        tracker.onError(reason instanceof Error ? reason : new Error(reason));
        return Promise.reject(reason);
      });
    } else {
      tracker.onSuccess();
      return result;
    }
  } catch (error) {
    tracker.onError(error);
    throw error;
  }
}
