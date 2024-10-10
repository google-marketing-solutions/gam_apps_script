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

import {SoapEnumType, SoapTypeIndex} from './soap_type_index';

/**
 * Information about a property on a SOAP object.
 */
interface SoapObjectTypePropertyInfo {
  name: string;
  type: string;
  isArray: boolean;
  isOptional: boolean;
}

/**
 * Information about a SOAP object type.
 */
interface SoapObjectTypeInfo {
  name: string;
  properties: SoapObjectTypePropertyInfo[];
  baseTypeName?: string;
}

/**
 * A serializable type index that can be stored in the script cache.
 */
interface SerializableTypeIndex {
  [typeName: string]: SoapObjectTypeInfo | SoapEnumType;
}

/**
 * Parses a complex type element and returns a SoapObjectTypeInfo object.
 *
 * @param element The complex type element to parse.
 * @param xmlNamespace The XML namespace to use for the element.
 * @return A SoapObjectTypeInfo object representing the complex type.
 */
function parseComplexType(
  element: GoogleAppsScript.XML_Service.Element,
  xmlNamespace: GoogleAppsScript.XML_Service.Namespace,
): SoapObjectTypeInfo {
  let complexTypeElement = element;
  if (element.getName() === 'element') {
    complexTypeElement = element.getChild('complexType', xmlNamespace);
  }
  const complexTypeName = element.getAttribute('name')?.getValue();
  let properties = parseComplexTypeProperties(complexTypeElement, xmlNamespace);
  const extensionElement = complexTypeElement
    ?.getChild('complexContent', xmlNamespace)
    ?.getChild('extension', xmlNamespace);
  if (extensionElement) {
    properties = properties.concat(
      parseComplexTypeProperties(extensionElement, xmlNamespace),
    );
  }
  const baseTypeName = extensionElement
    ?.getAttribute('base')
    ?.getValue()
    ?.split(':')[1];
  return {name: complexTypeName, properties, baseTypeName};
}

/**
 * Parses the properties of a complex type element and returns an array of
 * SoapObjectTypePropertyInfo objects.
 *
 * @param element The complex type element to parse.
 * @param xmlNamespace The XML namespace to use for the element.
 * @return An array of SoapObjectTypePropertyInfo objects representing the
 *     properties of the complex type.
 */
function parseComplexTypeProperties(
  element: GoogleAppsScript.XML_Service.Element,
  xmlNamespace: GoogleAppsScript.XML_Service.Namespace,
): SoapObjectTypePropertyInfo[] {
  return (element?.getChild('sequence', xmlNamespace)?.getChildren() ?? []).map(
    (propertyElement) => {
      const typeName = propertyElement
        .getAttribute('type')
        .getValue()
        .split(':')[1];
      return {
        name: propertyElement.getAttribute('name').getValue(),
        type: typeName,
        isArray:
          propertyElement.getAttribute('maxOccurs').getValue() === 'unbounded',
        isOptional:
          propertyElement.getAttribute('minOccurs').getValue() === '0',
      };
    },
  );
}

/**
 * Parses an enum type element and returns an array of enumeration values.
 *
 * @param element The enum type element to parse.
 * @param xmlNamespace The XML namespace to use for the element.
 * @return An array of enumeration values.
 */
function parseEnumType(
  element: GoogleAppsScript.XML_Service.Element,
  xmlNamespace: GoogleAppsScript.XML_Service.Namespace,
): string[] {
  return (
    element.getChild('restriction', xmlNamespace).getChildren() ?? []
  ).map((enumeration) => {
    return enumeration.getAttribute('value').getValue();
  });
}

/**
 * Creates a type info index from a SOAP service URL.
 *
 * @param serviceUrl The URL of the SOAP service.
 * @return A type info index for the SOAP service.
 */
function createTypeInfoIndexFromServiceUrl(
  serviceUrl: string,
): SerializableTypeIndex {
  const wsdlNamespace = XmlService.getNamespace(
    'http://schemas.xmlsoap.org/wsdl/',
  );
  const xmlNamespace = XmlService.getNamespace(
    'http://www.w3.org/2001/XMLSchema',
  );
  const response = UrlFetchApp.fetch(serviceUrl, {
    contentType: 'text/xml; charset=utf-8',
    muteHttpExceptions: true,
  });
  const responseXml = XmlService.parse(response.getContentText());
  const serviceWsdl = responseXml.getRootElement();
  const typeElements = serviceWsdl
    .getChild('types', wsdlNamespace)
    .getChild('schema', xmlNamespace)
    .getChildren();

  const typeInfoIndex: SerializableTypeIndex = {};
  for (const typeElement of typeElements) {
    const typeName = typeElement.getAttribute('name')?.getValue();
    switch (typeElement.getName()) {
      case 'element':
      case 'complexType':
        typeInfoIndex[typeName] = parseComplexType(typeElement, xmlNamespace);
        break;
      case 'simpleType':
        const enumerations = parseEnumType(typeElement, xmlNamespace);
        typeInfoIndex[typeName] = {name: typeName, enumerations};
        break;
      default:
        break;
    }
  }
  return typeInfoIndex;
}

/**
 * Provides a TypeIndex for a SOAP service.
 */
export class TypeIndexProvider {
  /**
   * Parses a SOAP WSDL and creates a TypeIndex for the service. New TypeIndexes
   * are cached for 6 hours.
   * @param serviceUrl The URL of the SOAP service.
   * @return The TypeIndex for the SOAP service.
   */
  static createWithServiceUrl(serviceUrl: string): SoapTypeIndex {
    let typeInfoIndex: SerializableTypeIndex | undefined;

    const scriptCache = CacheService.getScriptCache();
    const cachedTypeInfoIndexString = scriptCache.get(serviceUrl);
    if (cachedTypeInfoIndexString) {
      const cachedTypeInfoIndex = JSON.parse(cachedTypeInfoIndexString);
      typeInfoIndex = cachedTypeInfoIndex as SerializableTypeIndex;
    } else {
      typeInfoIndex = createTypeInfoIndexFromServiceUrl(serviceUrl);
      // 21600 seconds is 6 hours (max expiration for the cache)
      scriptCache.put(serviceUrl, JSON.stringify(typeInfoIndex), 21600);
    }

    const types: SoapTypeIndex = {};
    const enums: {[enumName: string]: SoapEnumType} = {};
    for (const [typeName, typeInfo] of Object.entries(typeInfoIndex)) {
      if ('properties' in typeInfo) {
        types[typeName] = {name: typeName, properties: {}, childTypes: []};
      } else {
        enums[typeName] = {name: typeName, enumerations: typeInfo.enumerations};
      }
    }
    for (const [typeName, typeInfo] of Object.entries(typeInfoIndex)) {
      if ('properties' in typeInfo) {
        if (typeInfo.baseTypeName) {
          types[typeName].baseType = types[typeInfo.baseTypeName];
          const baseType = types[typeName].baseType;
          if (baseType.childTypes) {
            baseType.childTypes.push(types[typeName]);
          } else {
            baseType.childTypes = [types[typeName]];
          }
        }
        for (const property of typeInfo.properties) {
          types[typeName].properties[property.name] = {
            name: property.name,
            type: types[property.type] ?? enums[property.type] ?? property.type,
            isArray: property.isArray,
            isOptional: property.isOptional,
          };
        }
      }
    }
    return types;
  }
}
