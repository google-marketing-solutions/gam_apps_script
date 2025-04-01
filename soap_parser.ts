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
  getAllPropertiesForType,
  isSoapEnumType,
  isSoapObjectType,
  SimpleSoapType,
  SoapObjectType,
  SoapPropertyIndex,
  SoapType,
  SoapTypeIndex,
} from './soap_type_index';

/**
 * Converts Apps Script XML elements to Object literals.
 */
export class SoapParser {
  private readonly validPropertiesCache = new Map<string, SoapPropertyIndex>();

  /**
   * A cache of converted object literals.
   *
   * To avoid parsing the same XML multiple times, this cache stores the string
   * representation of the parsed object literals. To return from the cache, the
   * string representation is parsed back into an object literal with
   * JSON.parse(). Storing and returning the object literal directly would be
   * more efficient but would cause objects returned by the cache to be the same
   * instance as the original object.
   */
  private readonly convertedObjectCache = new Map<string, string>();

  constructor(private readonly serviceTypes: SoapTypeIndex) {}

  /**
   * Converts an Apps Script XML element to the specified primitive type.
   *
   * @param element The XML element to convert.
   * @param soapPrimitiveType The primitive type to convert to.
   * @return The converted value.
   */
  private convertXmlElementToPrimitiveType(
    element: GoogleAppsScript.XML_Service.Element,
    simpleSoapType: SimpleSoapType,
  ): string | number | boolean | undefined {
    const value = element.getText();
    if (value === '') return undefined;
    let typeAsPrimitive = isSoapEnumType(simpleSoapType)
      ? 'string'
      : simpleSoapType;
    switch (typeAsPrimitive) {
      case 'int':
      case 'double':
      case 'long':
        return Number(value);
      case 'boolean':
        return String(value) === 'true';
      case 'string':
        return value;
      default:
        throw new Error(`Unsupported primitive type: ${simpleSoapType}`);
    }
  }

  /**
   * Converts an Apps Script XML element to a SOAP type. This function identifies
   * the type of the element and calls the appropriate conversion function. All
   * Soap types are supported.
   *
   * @param element The XML element to convert.
   * @param soapType The SOAP type to convert to.
   * @return The converted value.
   */
  private convertXmlElementToSoapType(
    element: GoogleAppsScript.XML_Service.Element,
    soapType: SoapType,
  ): unknown {
    if (isSoapEnumType(soapType)) {
      return String(element.getText());
    } else if (isSoapObjectType(soapType)) {
      return this.convertXmlElementToObjectLiteral(element, soapType);
    } else {
      return this.convertXmlElementToPrimitiveType(element, soapType);
    }
  }

  /**
   * Returns all valid properties for the specified SOAP object type and its
   * descendant types. Properties for an object's base type(s) are also included
   * when  includeBaseTypes is true.
   *
   * @param soapObjectType The SOAP object type to get properties for.
   * @param includeBaseTypes Whether to include properties of the base type.
   * @return The valid properties for the specified SOAP object type.
   */
  private getAllValidPropertiesForType(
    soapObjectType: SoapObjectType,
    includeBaseTypes: boolean = true,
  ): SoapPropertyIndex {
    const cachedProperties = this.validPropertiesCache.get(soapObjectType.name);
    if (cachedProperties) return cachedProperties;

    let properties = includeBaseTypes
      ? getAllPropertiesForType(soapObjectType)
      : soapObjectType.properties;
    (soapObjectType.childTypes || []).forEach((childType) => {
      properties = {
        ...properties,
        ...this.getAllValidPropertiesForType(childType, false),
      };
    });
    this.validPropertiesCache.set(soapObjectType.name, properties);
    return properties;
  }

  /**
   * Converts an Apps Script XML element to an object literal. Each of the
   * object's properties are converted to the appropriate type, recursively.
   *
   * @param element The XML element to convert.
   * @param soapObjectType The SOAP object type to convert to.
   * @return The converted value.
   */
  convertXmlElementToObjectLiteral(
    element: GoogleAppsScript.XML_Service.Element,
    soapObjectType: SoapObjectType,
  ): unknown {
    const cacheKey =
      soapObjectType.name + XmlService.getRawFormat().format(element);
    const cachedObj = this.convertedObjectCache.get(cacheKey);
    if (cachedObj) return JSON.parse(cachedObj);

    const typeNameSpecifiedInXml = element
      ?.getAttributes()
      ?.find((a) => a.getName() === 'type')
      ?.getValue();
    const actualSoapType = typeNameSpecifiedInXml
      ? this.serviceTypes[typeNameSpecifiedInXml]
      : soapObjectType;
    if (actualSoapType === undefined) {
      throw new Error(`Unrecognized type: ${typeNameSpecifiedInXml}`);
    }
    const allProperties = this.getAllValidPropertiesForType(actualSoapType);
    const obj: {[key: string]: unknown} = {};
    for (const child of element.getChildren()) {
      const propertyName = child.getName();
      const property = allProperties[propertyName];
      if (property === undefined) {
        throw new Error(`${propertyName} is not valid: ${child}`);
      }
      const childValue = this.convertXmlElementToSoapType(
        child,
        property.type as SoapType,
      );
      if (property.isArray) {
        const childArray =
          propertyName in obj ? (obj[propertyName] as unknown[]) : [];
        if (childValue !== undefined) {
          childArray.push(childValue);
        }
        obj[propertyName] = childArray;
      } else {
        obj[propertyName] = childValue;
      }
    }
    this.convertedObjectCache.set(cacheKey, JSON.stringify(obj));
    return obj;
  }
}
