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
 * Interface for interacting with Ad Manager Services (eg LineItemService).
 */
export declare interface AdManagerServiceInterface {
  readonly oAuthToken: string;
  readonly applicationName: string;
  readonly networkCode: string | number;
  readonly apiVersion: string;
  readonly serviceName: string;
  readonly httpHeaders?: {[key: string]: string};

  performOperation(
    operationName: string,
    operationParameters?: unknown,
  ): unknown;
}
