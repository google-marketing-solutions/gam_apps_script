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
 * Provide details about an error that occured while processing a GAM API
 * service request.
 */
export interface ApiError {
  fieldPath: string;
  fieldPathElements: {field: string; index: string}[];
  trigger: string;
  errorString: string;
}

/**
 * Holds a list of service errors.
 */
export interface ApiException {
  message: string;
  errors: ApiError[];
}
