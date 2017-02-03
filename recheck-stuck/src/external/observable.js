/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 *
 * @flow
 */

import {Observable} from 'rxjs';

/**
 * Splits a stream of strings on newlines.
 * Includes the newlines in the resulting stream.
 * Sends any non-newline terminated data before closing.
 * Never sends an empty string.
 */
export function splitStream(input: Observable<string>): Observable<string> {
  return Observable.create(observer => {
    let current: string = '';

    function onEnd() {
      if (current !== '') {
        observer.next(current);
        current = '';
      }
    }

    return input.subscribe(
      value => {
        const lines = (current + value).split('\n');
        current = lines.pop();
        lines.forEach(line => observer.next(line + '\n'));
      },
      error => { onEnd(); observer.error(error); },
      () => { onEnd(); observer.complete(); },
    );
  });
}

/**
 * Like `takeWhile`, but includes the first item that doesn't match the predicate.
 */
export function takeWhileInclusive<T>(
  source: Observable<T>,
  predicate: (value: T) => boolean,
): Observable<T> {
  return Observable.create(observer => (
    source.subscribe(
      x => {
        observer.next(x);
        if (!predicate(x)) {
          observer.complete();
        }
      },
      err => { observer.error(err); },
      () => { observer.complete(); },
    )
  ));
}
