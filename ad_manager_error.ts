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

/**
 * @fileoverview Classes representing errors thrown by this library.
 */
import {ApiError, ApiException} from './typings/api_exception'

/**
 * Parent class for all errors thrown by the library.
 */
export class AdManagerError extends Error {
  override readonly name: string = 'AdManagerError';
}

/**
 * An error indictating that the user provided an invalid value.
 */
export class AdManagerValueError extends AdManagerError {
  override readonly name: string = 'AdManagerValueError';
}

/**
 * An error indicating that the Ad Manager API returned error(s).
 */
export class AdManagerServerFault extends AdManagerError {
  override readonly name: string = 'AdManagerServerFault';
  readonly errors: ApiError[] = [];

  constructor(apiException: ApiException) {
    super(apiException.message);
    this.errors = apiException.errors;
  }
}



