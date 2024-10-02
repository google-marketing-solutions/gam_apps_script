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
 * Primitive types supported by SOAP service.
 */
export type SoapPrimitiveType =
  | 'string'
  | 'boolean'
  | 'int'
  | 'long'
  | 'double';

/**
 * Represents a SOAP enum type.
 */
export interface SoapEnumType {
  name: string;
  enumerations: string[];
}

/**
 * An index of SOAP enum types, indexed by their names.
 */
export interface EnumIndex {
  [enumName: string]: SoapEnumType;
}

/**
 * Represents SOAP types that can be represented as a single value.
 */
export type SimpleSoapType = SoapPrimitiveType | SoapEnumType;

/**
 * Represents a property on a SOAP object.
 */
export interface SoapObjectTypeProperty {
  name: string;
  type: SoapType;
  isArray: boolean;
  isOptional: boolean;
}

/**
 * An index representing the properties of a SOAP object. The properties are
 * indexed by their names.
 */
export interface SoapPropertyIndex {
  [propertyName: string]: SoapObjectTypeProperty;
}

/**
 * Represents a complex SOAP type.
 */
export interface SoapObjectType {
  name: string;
  baseType?: SoapObjectType;
  properties: SoapPropertyIndex;
  childTypes?: SoapObjectType[];
}

/**
 * Represents all SOAP types.
 */
export type SoapType = SoapPrimitiveType | SoapEnumType | SoapObjectType;

/**
 * Returns whether a SOAP type is a primitive type.
 * @param soapType The type to check.
 * @return Whether the type is a primitive type.
 */
export function isSoapPrimitiveType(
  soapType: SoapType,
): soapType is SoapPrimitiveType {
  return typeof soapType === 'string';
}

/**
 * Returns whether a SOAP type is an enum type.
 * @param soapType The type to check.
 * @return Whether the type is an enum type.
 */
export function isSoapEnumType(soapType: SoapType): soapType is SoapEnumType {
  return typeof soapType === 'object' && 'enumerations' in soapType;
}

/**
 * Returns whether a SOAP type is an object type.
 * @param soapType The type to check.
 * @return Whether the type is an object type.
 */
export function isSoapObjectType(
  soapType: SoapType,
): soapType is SoapObjectType {
  return typeof soapType === 'object' && 'properties' in soapType;
}

/**
 * An index of complex SOAP types, indexed by their names.
 */
export interface SoapTypeIndex {
  [typeName: string]: SoapObjectType;
}

/**
 * Gets all properties of a SOAP object recursively.
 * @param soapObjectType The type of the SOAP object.
 * @return The properties of the SOAP object.
 */
export function getAllPropertiesForType(
  soapObjectType: SoapObjectType,
): SoapPropertyIndex {
  let allProperties = soapObjectType.properties;
  let baseType = soapObjectType.baseType;
  while (baseType) {
    allProperties = {
      ...baseType.properties,
      ...allProperties,
    };
    baseType = baseType.baseType;
  }
  return allProperties;
}
