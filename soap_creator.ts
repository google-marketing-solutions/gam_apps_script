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
  SoapEnumType,
  SoapObjectType,
  SoapObjectTypeProperty,
  SoapPrimitiveType,
  SoapPropertyIndex,
  SoapType,
  getAllPropertiesForType,
  isSoapEnumType,
  isSoapObjectType,
  isSoapPrimitiveType,
} from './soap_type_index';

/**
 * Converts object literals to SOAP XML strings.
 */
export class SoapCreator {
  private readonly allPropertiesCache = new Map<string, SoapPropertyIndex>();

  constructor() {}

  /**
   * Converts a simple SOAP type to an XML string. Supported types are string,
   * boolean, int, long, double, and SOAP enums.
   *
   * @param simpleSoapType The type of the SOAP value.
   * @param value The value to convert.
   * @return The XML string representation of the value.
   */
  private convertSimpleSoapTypeToXmlString(
    simpleSoapType: SoapPrimitiveType | SoapEnumType,
    value: any,
  ): string {
    let validValue = false;
    switch (simpleSoapType) {
      case 'int':
        validValue = Number.isInteger(Number(value));
        break;
      case 'double':
      case 'long':
        validValue = !isNaN(Number(value));
        break;
      case 'boolean':
        validValue = ['true', 'false'].includes(String(value));
        break;
      case 'string':
        validValue = true;
        break;
      default:
        validValue = simpleSoapType.enumerations.includes(String(value));
        break;
    }
    if (!validValue) {
      throw new Error(`Invalid usage of type ${simpleSoapType}: ${value}`);
    }
    const escapedVal = String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
    return value === null ? '' : escapedVal;
  }

  /**
   * Converts a property value from a SOAP object into an XML string.
   *
   * @param soapObjectTypeProperty The property to convert.
   * @param value The value to convert.
   * @return The XML string representation of the value.
   */
  private convertSoapObjectPropertyToXmlString(
    soapObjectTypeProperty: SoapObjectTypeProperty,
    value: any,
  ): string {
    const propertyName = soapObjectTypeProperty.name;
    if (value === undefined && soapObjectTypeProperty.isOptional) {
      return '';
    } else if (value === undefined && !soapObjectTypeProperty.isOptional) {
      throw new Error(
        `${propertyName} is required but the value is undefined.`,
      );
    } else if (soapObjectTypeProperty.isArray && !Array.isArray(value)) {
      throw new Error(
        `${propertyName} is an array but the value is not an array: ${value}`,
      );
    } else if (!soapObjectTypeProperty.isArray && Array.isArray(value)) {
      throw new Error(
        `${propertyName} is not an array but the value is an array: ${value}`,
      );
    }
    let valueSoapString = '';
    const valueAsArray = Array.isArray(value) ? value : [value];
    for (const val of valueAsArray) {
      const {actualType, soapXmlString} = this.convertSoapValueToXmlString(
        soapObjectTypeProperty.type,
        val,
      );
      /** start tag */ valueSoapString +=
        isSoapObjectType(actualType) &&
        soapObjectTypeProperty.type !== actualType
          ? `<${propertyName} xsi:type="${actualType.name}">`
          : `<${propertyName}>`;
      /** value     */ valueSoapString += soapXmlString;
      /** end tag   */ valueSoapString += `</${propertyName}>`;
    }
    return valueSoapString;
  }

  /**
   * Converts any SOAP value into an XML string. This function identifies the
   * type of the value and calls the appropriate conversion function. All Soap
   * types are supported.
   *
   * @param soapType The type of the SOAP value.
   * @param value The value to convert.
   * @return The XML string representation of the value.
   */
  private convertSoapValueToXmlString(
    soapType: SoapType,
    value: any,
  ): {actualType: SoapType; soapXmlString: string} {
    if (isSoapObjectType(soapType)) {
      return this.convertSoapObjectToXmlStringImpl(soapType, value);
    } else if (isSoapEnumType(soapType) || isSoapPrimitiveType(soapType)) {
      const actualType = soapType;
      const soapXmlString = this.convertSimpleSoapTypeToXmlString(
        actualType,
        value,
      );
      return {actualType, soapXmlString};
    }
    throw new Error(`Unsupported type: ${soapType}`);
  }

  /**
   * Checks if a value conflicts with a SOAP object type.
   *
   * The service definition for type `Value` includes sub-types `NumberValue`
   * and `TextValue`, both of which specify a string data type. Without this
   * check, creating a SOAP payload for `Value`, always returns a `NumberValue`
   * because it occurs earlier in the service definition.
   *
   * @param soapObjectType The type of the SOAP object.
   * @param value The value to check.
   * @return Whether the value conflicts with the SOAP object type.
   */
  private hasValueConflict(soapObjectType: SoapObjectType, value: any) {
    if (soapObjectType.name === 'NumberValue') {
      return typeof value['value'] !== 'number';
    }
    return false;
  }

  /**
   * Continues an in-progress conversion of a SOAP object to an XML string.
   *
   * During object conversion, if all of the specified type's properties have
   * been converted but there are still unprocessed properties on the object
   * value it's possible that the value is an instance of a child type. This
   * function converts the value's remaining properties against the properties
   * of the type's children and returns the first valid result.
   *
   * @param soapObjectTypes The base type.
   * @param value The value to convert.
   * @param soapXml The XML string from the in progress conversion.
   * @param keysToParse The remaining keys to parse from the value.
   * @return The XML string representation of the value.
   */
  private continueConversionWithChildTypes(
    soapObjectTypes: SoapObjectType[],
    value: any,
    soapXml: string,
    keysToParse: Set<string> | undefined,
  ): {actualType: SoapType; soapXmlString: string} {
    let lastError;
    for (const soapObjectType of soapObjectTypes) {
      if (this.hasValueConflict(soapObjectType, value)) continue;
      try {
        return this.convertSoapObjectToXmlStringImpl(
          soapObjectType,
          value,
          soapXml,
          soapObjectType.properties,
          keysToParse,
        );
      } catch (e) {
        lastError = e;
      }
    }
    throw lastError;
  }

  private getAllPropertiesForTypeWithCache(
    soapObjectType: SoapObjectType,
  ): SoapPropertyIndex {
    const cachedProperties = this.allPropertiesCache.get(soapObjectType.name);
    if (cachedProperties) return cachedProperties;

    const allProperties = getAllPropertiesForType(soapObjectType);
    this.allPropertiesCache.set(soapObjectType.name, allProperties);
    return allProperties;
  }

  /**
   * Converts a SOAP object to an XML string. The value's fields are converted
   * against the type's properties. If the value has more fields than the
   * type's properties, the remaining fields are converted against the type's
   * child types.
   *
   * @param soapObjectType The type of the SOAP object.
   * @param value The value to convert.
   * @param soapXml The XML string to convert.
   * @param propertiesToParse The properties to parse.
   * @param keysToParse The keys to parse.
   * @return An object literal containing the actual type returned and the XML
   * string representation of the value.
   */
  private convertSoapObjectToXmlStringImpl(
    soapObjectType: SoapObjectType,
    value: any,
    soapXml: string | undefined = undefined,
    propertiesToParse: SoapPropertyIndex | undefined = undefined,
    keysToParse: Set<string> | undefined = undefined,
  ): {actualType: SoapType; soapXmlString: string} {
    let soapXmlString = soapXml || '';
    const valueKeysSet = keysToParse || new Set(Object.keys(value));
    const allProperties =
      propertiesToParse ||
      this.getAllPropertiesForTypeWithCache(soapObjectType);
    for (const [propertyName, property] of Object.entries(allProperties) as [
      string,
      SoapObjectTypeProperty,
    ][]) {
      if (propertyName in value) {
        soapXmlString += this.convertSoapObjectPropertyToXmlString(
          property,
          value[propertyName],
        );
        valueKeysSet.delete(propertyName);
      } else if (!property.isOptional) {
        throw new Error(
          `${propertyName} is required but the value is undefined.`,
        );
      }
    }
    if (valueKeysSet.size === 0) {
      return {actualType: soapObjectType, soapXmlString};
    }
    if (soapObjectType.childTypes) {
      return this.continueConversionWithChildTypes(
        soapObjectType.childTypes,
        value,
        soapXmlString,
        new Set([...valueKeysSet]),
      );
    }
    const notRecognized = Array.from(valueKeysSet).join(',');
    throw new Error(
      `Unrecognized properties for ${soapObjectType.name}: ${notRecognized}`,
    );
  }

  /**
   * Converts an object literal into an XML string based on the provided type
   * definition.
   *
   * @param soapObjectType The type of the SOAP object.
   * @param value The value to convert.
   * @return The XML string representation of the value.
   */
  convertSoapObjectToXmlString(
    soapObjectType: SoapObjectType,
    value: any,
  ): string {
    const {soapXmlString} = this.convertSoapObjectToXmlStringImpl(
      soapObjectType,
      value,
    );
    return soapXmlString;
  }
}
