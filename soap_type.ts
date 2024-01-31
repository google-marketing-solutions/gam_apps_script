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
 * @fileoverview Classes representing the different types in a SOAP WSDL.
 */


/**
 * Abstract base class for representing SOAP types.
 */
export abstract class SoapType {
  constructor(
      readonly name: string,
  ) {}
}

/**
 * Represents a SOAP enum.
 */
export class EnumType extends SoapType {
  constructor(
      override readonly name: string,
      readonly enumerations: string[] = [],
  ) {
    super(name);
  }
}

/**
 * Represents a complex SOAP object.
 */
export class ComplexType extends SoapType {
  readonly properties: Map<string, ComplexTypeProperty> = new Map();
  constructor(
      override readonly name: string,
      properties: Map<string, ComplexTypeProperty>|ComplexTypeProperty[],
      readonly baseTypeName?: string,
      readonly extendedBy: string[] = [],
  ) {
    super(name);
    if (Array.isArray(properties)) {
      properties.forEach((property) => {
        this.properties.set(property.name, property);
      });
    } else {
      this.properties = properties;
    }
  }
}

/**
 * Represents a property on a complex SOAP object.
 */
export interface ComplexTypeProperty {
  name: string;
  type: string;
  isArray: boolean;
  isOptional: boolean;
}
