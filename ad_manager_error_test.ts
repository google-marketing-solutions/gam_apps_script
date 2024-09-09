/**
 * @license
 * Copyright 2024 Google LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
  AdManagerError,
  AdManagerServerFault,
  AdManagerValueError,
} from './ad_manager_error';
import {ApiException} from './typings/api_exception';

describe('AdManagerError', () => {
  it('has the correct name', () => {
    const error = new AdManagerError();
    expect(error.name).toEqual('AdManagerError');
  });
});

describe('AdManagerValueError', () => {
  it('has the correct name', () => {
    const error = new AdManagerValueError();
    expect(error.name).toEqual('AdManagerValueError');
  });
});

describe('AdManagerServerFault', () => {
  it('has the correct name', () => {
    const apiException: ApiException = jasmine.createSpyObj('ApiException', [
      'message',
      'errors',
    ]);
    const error = new AdManagerServerFault(apiException);

    expect(error.name).toEqual('AdManagerServerFault');
  });

  it('holds the apiException', () => {
    const apiException: ApiException = jasmine.createSpyObj('ApiException', [
      'message',
      'errors',
    ]);
    const error = new AdManagerServerFault(apiException);

    expect(error.errors).toEqual(apiException.errors);
  });
});
