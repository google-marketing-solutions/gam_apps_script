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
 * @fileoverview SoapHelper converts SOAP to/from object literals.
 */

import {AdManagerServerFault, AdManagerValueError} from './ad_manager_error';
import {ComplexType, ComplexTypeProperty, EnumType, SoapType} from './soap_type';
import {ApiException} from './typings/api_exception';

/**
 * A helper class for converting SOAP payloads to/from object literals.
 */
export class SoapHelper {
  /**
   * Creates a SoapHelper instance for a given service URL. The service WSDL is
   * requested and parsed.
   * @param serviceUrl The URL for the service WSDL file.
   */
  static createWithServiceUrl(serviceUrl: string): SoapHelper {
    const wsdlNamespace =
        XmlService.getNamespace('http://schemas.xmlsoap.org/wsdl/');
    const xmlNamespace =
        XmlService.getNamespace('http://www.w3.org/2001/XMLSchema');
    const response = UrlFetchApp.fetch(
        serviceUrl,
        {contentType: 'text/xml; charset=utf-8', muteHttpExceptions: true});
    const responseXml = XmlService.parse(response.getContentText());
    const serviceWsdl = responseXml.getRootElement();
    const operationsAndResponses = new Map<string, ComplexType>();
    const types = new Map<string, SoapType>();
    const baseTypeNames = new Map<string, string[]>();
    serviceWsdl.getChild('types', wsdlNamespace)
        .getChild('schema', xmlNamespace)
        .getChildren()
        .forEach(element => {
          const elementName = element.getName();
          switch (elementName) {
            // operations and responses
            case 'element':
              const params = parseSoapOperation(element);
              operationsAndResponses.set(params.name, params);
              break;
            // complex object types
            case 'complexType':
              const complexType = parseComplexType(element);
              if (complexType.baseTypeName) {
                const extendedByArray =
                    baseTypeNames.get(complexType.baseTypeName) || [];
                extendedByArray.push(complexType.name);
                baseTypeNames.set(complexType.baseTypeName, extendedByArray);
              }
              types.set(complexType.name, complexType);
              break;
            // simple object types (enums)
            case 'simpleType':
              const enumType = parseEnumType(element);
              types.set(enumType.name, enumType);
              break;
            default:
              // do nothing
          }
        });
    for (const [baseTypeName, extendedByNames] of baseTypeNames) {
      const baseType = types.get(baseTypeName);
      if (baseType instanceof ComplexType) {
        baseType.extendedBy.push(...extendedByNames);
      }
    }
    const typesWithAllProperties = new Map<string, SoapType>();
    for (const [, type] of types) {
      if (!(type instanceof ComplexType) || !type.baseTypeName) {
        typesWithAllProperties.set(type.name, type);
        continue;
      }
      let propertiesFromBaseTypes = new Map<string, ComplexTypeProperty>();
      let baseType = types.get(type.baseTypeName);
      while (baseType instanceof ComplexType) {
        propertiesFromBaseTypes =
            new Map([...propertiesFromBaseTypes, ...baseType.properties]);
        baseType = types.get(baseType.baseTypeName!);
      }
      const allProperties =
          new Map([...propertiesFromBaseTypes, ...type.properties]);
      typesWithAllProperties.set(
          type.name,
          new ComplexType(
              type.name, allProperties, type.baseTypeName, type.extendedBy));
    }
    return new SoapHelper(
        new Map([...operationsAndResponses, ...typesWithAllProperties]));
  }



  /**
   * Creates a SoapHelper. Not intended to be used directly. Use a factory
   * method instead.
   * @param types A Map object where the SOAP service's type names are the
   *     index. The corresponding entry is a SoapType object.
   */
  constructor(
      readonly types: Map<string, SoapType>,
  ) {}

  /**
   * Converts a list of parameters into an object literal with the correct
   * object keys for the given service operation.
   * @param operationName The name of the service operation.
   * @param parameterList The list of parameters for the provided service
   *     operation.
   * @return An object literal with the provided parameters indexed against
   *     their field names in the SOAP service.
   */
  private createParameterObjectForParameterList(
      operation: ComplexType,
      parameterList: unknown[]): {[key: string]: unknown} {
    const parsedParameters: {[parameterName: string]: unknown} = {};
    const expectedParameters = [...operation.properties.values()];
    parameterList.forEach((parameter, index) => {
      const parameterName = expectedParameters[index].name;
      parsedParameters[parameterName] = parameter;
    });
    return parsedParameters;
  }

  createSoapPayload(operationName: string, ...parameterList: unknown[]):
      string {
    const operation = this.types.get(operationName) as ComplexType;
    if (!operation) {
      throw new AdManagerValueError(`Unrecognized operation: ${operationName}`);
    }
    const parameters =
        this.createParameterObjectForParameterList(operation, parameterList);
    let soapString = '';
    for (const [name, parameter] of operation.properties) {
      const parameterValue = parameters[name];
      if (parameterValue) {
        soapString += this.createSoapPayloadForParameter(
            parameter.name, parameter.type, parameterValue);
      } else if (!parameter.isOptional) {
        throw new AdManagerValueError(`Required parameter not provided for ${
            operationName}: ${parameter.name}`);
      }
    }
    return soapString;
  }


  /**
   * Returns an array of `ComplexType` objects that extend the provided parent
   * type. It is necessary to traverse recursively to ensure all leaves of the
   * class hierarchy are explored. Previously the library was only returning
   * children one level down from the parent.
   */
  private getChildTypes(parentType: ComplexType): ComplexType[] {
    const allTypes: ComplexType[] = [];

    const traverseExtendedBy = (valueType: ComplexType) => {
      const childTypes = valueType.extendedBy
        .map((e) => this.types.get(e))
        .filter((e) => e instanceof ComplexType) as ComplexType[];

      for (const childType of childTypes) {
        allTypes.push(childType);
        traverseExtendedBy(childType);
      }
    };

    traverseExtendedBy(parentType);
    return allTypes;
  }

  private createSoapPayloadForParameter(
      name: string, typeName: string|undefined, value: unknown): string {
    if (!typeName) {
      throw new AdManagerValueError(
          `No typeName provided for parameter: ${name}`);
    }
    if (Array.isArray(value)) {
      let soapString = '';
      for (const v of value) {
        soapString += this.createSoapPayloadForParameter(name, typeName, v);
      }
      return soapString;
    }
    const valueType = this.types.get(typeName);

    // If the type is a primitive and the value is valid for the type, escape
    // the string and wrap it in XML tags.
    switch (true) {
      case (
          valueType instanceof EnumType &&
          valueType.enumerations.includes(String(value))):
      case (typeName === 'int' && Number.isInteger(Number(value))):
      case (['double', 'long'].includes(typeName) && !isNaN(Number(value))):
      case (
          typeName === 'boolean' &&
          (String(value) === 'true' || String(value) === 'false')):
      case (typeName === 'string'):
        const escapedVal = String(value)
                               .replace(/&/g, '&amp;')
                               .replace(/</g, '&lt;')
                               .replace(/>/g, '&gt;')
                               .replace(/"/g, '&quot;')
                               .replace(/'/g, '&apos;');
        return `<${name}>${escapedVal}</${name}>`;
      case (value === null):
        return `<${name}></${name}>`;
      default:
        break;
    }

    if (!(valueType instanceof ComplexType)) {
      throw new AdManagerValueError(
          `Invalid usage of type ${typeName}: ${value}`);
    }

    const childTypes = this.getChildTypes(valueType);
    const potentialTypes = new Set([valueType, ...childTypes]);
    let assumedType: ComplexType|undefined;
    let soapString: string|undefined;
    let lastError: Error|undefined;
    while (soapString === undefined && potentialTypes.size) {
      let soapStringForValue = ''
      let valueKeys: Set<string>|undefined =
          new Set(Object.keys(value as object));
      [assumedType] = potentialTypes;
      let val = value as {[key: string]: unknown};
      try {
        for (const [propertyName, property] of assumedType.properties) {
          if (propertyName in val) {
            soapStringForValue += this.createSoapPayloadForParameter(
                propertyName, property?.type, val[propertyName]);
            valueKeys.delete(propertyName)
          } else if (!property.isOptional) {
            throw new AdManagerValueError(
                ` Required property not provided for ${assumedType.name}: ${
                    propertyName}`);
          }
        }
        if (!valueKeys.size) {
          soapString = soapStringForValue;
        } else {
          throw new AdManagerValueError(`Unexpected keys provided for ${
              assumedType.name}: ${valueKeys.toString()}`)
        }
      } catch (e) {
        lastError = e as Error
        potentialTypes.delete(assumedType)
        valueKeys = new Set(Object.keys(val as object));
      }
    }
    if (soapString === undefined) {
      if (lastError) throw lastError;
      throw new AdManagerValueError('Unable to create soap payload.');
    }
    return (assumedType && assumedType !== valueType) ?
        `<${name} xsi:type="${assumedType.name}">${soapString}</${name}>` :
        `<${name}>${soapString}</${name}>`;
  }

  /**
   * Traverses a SOAP Response (in the form of a Google Apps Script XML Element)
   * and converts the value into the equivalent object literal.
   * @param element The Apps Script XML representing the SOAP response.
   * @return A JavaScript object literal equivalent to the SOAP response.
   */
  convertSoapResponseToObjectLiteral(
      element: GoogleAppsScript.XML_Service.Element): unknown {
    let responseElement = element.getContent(0).asElement();
    let responseTypeName = responseElement.getName();
    if (responseTypeName === 'Fault' || undefined) {
      responseElement =
          responseElement.getChild('detail').getContent(0).asElement()
      responseTypeName = 'ApiException';
    }

    const responseType = this.types.get(responseTypeName) as ComplexType;
    if (!responseType) {
      throw new AdManagerValueError(
          `Unrecognized response type: ${responseTypeName}`);
    }

    const responseObject =
        this.convertSoapElementToObjectLiteral(
            responseType.name, responseElement) as {rval: unknown};
    if (responseTypeName === 'ApiException') {
      throw new AdManagerServerFault(responseObject as unknown as ApiException);
    }
    return responseObject['rval'];
  }

  private convertSoapElementToObjectLiteral(
      assumedTypeName: string,
      element: GoogleAppsScript.XML_Service.Element,
      ): unknown {
    const attributes = element.getAttributes();
    const overrideTypeName =
        attributes.find(attribute => attribute.getName() === 'type')
            ?.getValue();
    const typeName = overrideTypeName || assumedTypeName;
    const type = this.types.get(typeName);

    const children = element.getChildren();
    if (children.length === 0) {
      const text: string = element.getText();
      if (['int', 'long', 'double'].includes(typeName)) {
        return Number(text);
      } else if (typeName === 'boolean') {
        return String(text) === 'true';
      } else if (typeName === 'string' || type instanceof EnumType) {
        return String(text);
      } else {
        return null;
      }
    }

    if (!(type instanceof ComplexType)) {
      throw new AdManagerValueError(
          `Invalid usage of type ${typeName}: ${children}`);
    }

    const obj: {[key: string]: unknown} = {};
    for (const child of children) {
      const propertyName = child.getName();
      const property: ComplexTypeProperty|undefined =
          type.properties.get(propertyName);
      if (property === undefined) {
        throw new AdManagerValueError(`${propertyName} is not valid: `);
      }
      const childValue =
          this.convertSoapElementToObjectLiteral(property?.type, child);
      if (propertyName in obj) {
        (obj[propertyName] as unknown[]).push(childValue);
      } else if (property.isArray) {
        const childArray = [];
        if (childValue !== '' && childValue !== null) {
          childArray.push(childValue);
        }
        obj[propertyName] = childArray;
      } else {
        (obj as {[key: string]: unknown})[propertyName] = childValue;
      }
    }
    return obj;
  }
}

function parseSoapOperation(element: GoogleAppsScript.XML_Service.Element):
    ComplexType {
  const name = element.getAttribute('name').getValue();
  const xmlNamespace =
      XmlService.getNamespace('http://www.w3.org/2001/XMLSchema');
  const params: ComplexTypeProperty[] = [];
  const complexTypeElement = element.getChild('complexType', xmlNamespace);
  if (complexTypeElement) {
    element.getChild('complexType', xmlNamespace)
        .getChild('sequence', xmlNamespace)
        .getChildren()
        .forEach(parameterElement => {
          params.push({
            name: parameterElement.getAttribute('name').getValue(),
            type:
                parameterElement.getAttribute('type').getValue().split(':')[1],
            isArray: parameterElement.getAttribute('maxOccurs').getValue() ===
                'unbounded',
            isOptional:
                parameterElement.getAttribute('minOccurs').getValue() === '0',
          });
        });
  }
  return new ComplexType(name, params);
}

function parseComplexType(element: GoogleAppsScript.XML_Service.Element):
    ComplexType {
  const xmlNamespace =
      XmlService.getNamespace('http://www.w3.org/2001/XMLSchema');
  const name = element.getAttribute('name').getValue();
  let properties = parsePropertiesForType(element);
  let baseTypeName: string|undefined = undefined;
  const complexContentElement =
      element.getChild('complexContent', xmlNamespace);
  if (complexContentElement) {
    const extensionElement =
        complexContentElement.getChild('extension', xmlNamespace);
    const moreProperties = parsePropertiesForType(extensionElement);
    properties = properties.concat(moreProperties);
    baseTypeName =
        (extensionElement.getAttribute('base').getValue().split(':')[1]);
  }
  return new ComplexType(
      name,
      properties,
      baseTypeName,
      [],
  );
}

function parsePropertiesForType(element: GoogleAppsScript.XML_Service.Element):
    ComplexTypeProperty[] {
  const xmlNamespace =
      XmlService.getNamespace('http://www.w3.org/2001/XMLSchema');
  const properties: ComplexTypeProperty[] = [];
  const sequenceElement = element.getChild('sequence', xmlNamespace);
  if (sequenceElement) {
    sequenceElement.getChildren().forEach(propertyElement => {
      properties.push({
        name: propertyElement.getAttribute('name').getValue(),
        type: propertyElement.getAttribute('type').getValue().split(':')[1],
        isArray: propertyElement.getAttribute('maxOccurs').getValue() ===
            'unbounded',
        isOptional:
            propertyElement.getAttribute('minOccurs').getValue() === '0',
      });
    });
  }
  return properties;
}

function parseEnumType(element: GoogleAppsScript.XML_Service.Element):
    EnumType {
  const xmlNamespace =
      XmlService.getNamespace('http://www.w3.org/2001/XMLSchema');
  const name = element.getAttribute('name').getValue();
  const enumValues: string[] = [];
  element.getChild(('restriction'), xmlNamespace)
      .getChildren()
      .forEach(enumeration => {
        enumValues.push(enumeration.getAttribute('value').getValue());
      });
  return new EnumType(name, enumValues);
}