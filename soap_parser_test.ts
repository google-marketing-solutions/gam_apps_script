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
  FakeAppsScriptAttribute,
  FakeAppsScriptElement,
  FakeAppsScriptNamespace,
} from './fake_apps_script_xml_service';
import {SoapParser} from './soap_parser';
import {SoapObjectType, SoapPrimitiveType} from './soap_type_index';

interface TestState {
  xmlFormatSpy?: jasmine.SpyObj<GoogleAppsScript.XML_Service.Format>;
}

describe('SoapParser', () => {
  const state: TestState = {};

  beforeEach(() => {
    state.xmlFormatSpy = jasmine.createSpyObj('Format', ['format']);
    state.xmlFormatSpy?.format.and.callFake(
      (
        documentOrElement:
          | GoogleAppsScript.XML_Service.Document
          | GoogleAppsScript.XML_Service.Element,
      ) => {
        return String(Math.random());
      },
    );
    const xmlServiceSpy = jasmine.createSpyObj('XmlService', ['getRawFormat']);
    xmlServiceSpy.getRawFormat.and.returnValue(state.xmlFormatSpy);
    (globalThis as any).XmlService = xmlServiceSpy;
  });

  describe('convertXmlElementToObjectLiteral', () => {
    function testConvertXmlElementToObjectLiteralWithPrimitive(
      type: SoapPrimitiveType,
      value: string,
      expected: unknown,
    ) {
      it(`parses XML element with a primitive type (${type})`, () => {
        const ValueHolderType: SoapObjectType = {
          name: 'ValueHolderType',
          properties: {
            val: {
              name: 'val',
              type,
              isOptional: false,
              isArray: false,
            },
          },
        };
        const valueHolderElement = new FakeAppsScriptElement('value', [
          new FakeAppsScriptElement('val', [], value),
        ]) as unknown as GoogleAppsScript.XML_Service.Element;
        const soapParser = new SoapParser({ValueHolderType});
        const result = soapParser.convertXmlElementToObjectLiteral(
          valueHolderElement,
          ValueHolderType,
        );
        expect(result).toEqual({val: expected});
      });
    }

    testConvertXmlElementToObjectLiteralWithPrimitive(
      'string',
      'test_string',
      'test_string',
    );
    testConvertXmlElementToObjectLiteralWithPrimitive('int', '1', 1);
    testConvertXmlElementToObjectLiteralWithPrimitive('double', '1.2', 1.2);
    testConvertXmlElementToObjectLiteralWithPrimitive(
      'long',
      '123456789',
      123456789,
    );
    testConvertXmlElementToObjectLiteralWithPrimitive('boolean', 'true', true);

    const ArrayHolderType: SoapObjectType = {
      name: 'ArrayHolderType',
      properties: {
        arrayVal: {
          name: 'arrayVal',
          type: 'int',
          isOptional: false,
          isArray: true,
        },
      },
    };

    it('parses XML element representing an array', () => {
      const arrayHolderElement = new FakeAppsScriptElement('array', [
        new FakeAppsScriptElement('arrayVal', [], '1'),
        new FakeAppsScriptElement('arrayVal', [], '2'),
        new FakeAppsScriptElement('arrayVal', [], '3'),
      ]) as unknown as GoogleAppsScript.XML_Service.Element;

      const soapParser = new SoapParser({ArrayHolderType});
      const result = soapParser.convertXmlElementToObjectLiteral(
        arrayHolderElement,
        ArrayHolderType,
      );

      expect(result).toEqual({arrayVal: [1, 2, 3]});
    });

    it('parses XML element representing an empty array', () => {
      const arrayHolderElement = new FakeAppsScriptElement('array', [
        new FakeAppsScriptElement('arrayVal', [], ''),
      ]) as unknown as GoogleAppsScript.XML_Service.Element;

      const soapParser = new SoapParser({ArrayHolderType});
      const result = soapParser.convertXmlElementToObjectLiteral(
        arrayHolderElement,
        ArrayHolderType,
      );

      expect(result).toEqual({arrayVal: []});
    });

    const AnimalType: SoapObjectType = {
      name: 'AnimalType',
      properties: {
        name: {
          name: 'name',
          isOptional: false,
          type: 'string',
          isArray: false,
        },
      },
    };
    const DogType: SoapObjectType = {
      name: 'DogType',
      properties: {
        breed: {
          name: 'breed',
          type: 'string',
          isOptional: false,
          isArray: false,
        },
      },
      baseType: AnimalType,
    };
    AnimalType.childTypes = [DogType];

    const dogElement = new FakeAppsScriptElement(
      'dog',
      [
        new FakeAppsScriptElement('name', [], 'Fido'),
        new FakeAppsScriptElement('breed', [], 'Yellow Lab'),
      ],
      '',
      new FakeAppsScriptNamespace('unused namespace'),
      [new FakeAppsScriptAttribute('type', 'DogType')],
    ) as unknown as GoogleAppsScript.XML_Service.Element;

    it('parses XML element representing an overriden type', () => {
      const soapParser = new SoapParser({AnimalType, DogType});
      const result = soapParser.convertXmlElementToObjectLiteral(
        dogElement,
        AnimalType,
      );

      expect(result).toEqual({
        name: 'Fido',
        breed: 'Yellow Lab',
      });
    });

    it('parses XML element where the provided type is a base type', () => {
      const soapParser = new SoapParser({AnimalType, DogType});

      const result = soapParser.convertXmlElementToObjectLiteral(
        dogElement,
        AnimalType,
      );

      expect(result).toEqual({
        name: 'Fido',
        breed: 'Yellow Lab',
      });
    });

    it('returns from cache for elements with the same type and string representation', () => {
      state.xmlFormatSpy?.format.and.callFake(
        (
          documentOrElement:
            | GoogleAppsScript.XML_Service.Document
            | GoogleAppsScript.XML_Service.Element,
        ) => {
          return 'same_cache_key';
        },
      );

      const soapParser = new SoapParser({AnimalType, DogType});
      const result1 = soapParser.convertXmlElementToObjectLiteral(
        dogElement,
        AnimalType,
      );

      const result2 = soapParser.convertXmlElementToObjectLiteral(
        // the xml to string function returns the same string every time so it
        // shouldn't matter what element is passed in
        new FakeAppsScriptElement(
          'anything',
        ) as unknown as GoogleAppsScript.XML_Service.Element,
        AnimalType,
      );

      expect(result1).toEqual(result2);
      // should not be the same instance
      expect(result1).not.toBe(result2);
    });
  });
});
