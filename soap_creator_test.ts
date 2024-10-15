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

import {SoapCreator} from './soap_creator';
import {
  SoapEnumType,
  SoapObjectType,
  SoapPrimitiveType,
} from './soap_type_index';

describe('SoapCreator', () => {
  let soapCreator: SoapCreator;

  beforeEach(() => {
    soapCreator = new SoapCreator();
  });

  describe('createRequestObjectFromParameterList', () => {
    it('creates a request object from a list of parameters', () => {
      const operation: SoapObjectType = {
        name: 'operationName',
        properties: {
          param1: {
            name: 'param1',
            type: 'string',
            isOptional: false,
            isArray: false,
          },
          param2: {
            name: 'param2',
            type: 'int',
            isOptional: false,
            isArray: false,
          },
        },
      };

      const requestObject = soapCreator.createRequestObjectFromParameterList(
        operation,
        ['param1_val', 123],
      );

      expect(requestObject).toEqual({
        param1: 'param1_val',
        param2: 123,
      });
    });
  });

  describe('convertSoapObjectToXmlString', () => {
    function testConvertSoapObjectWithPrimitiveToXmlString(
      primitiveType: SoapPrimitiveType,
      value: any,
      expected: string,
    ) {
      it(`converts object with a primitive (${primitiveType})`, () => {
        expect(
          soapCreator.convertSoapObjectToXmlString(
            {
              name: 'TypeWithPrimitive',
              properties: {
                val: {
                  name: 'val',
                  isOptional: false,
                  type: primitiveType,
                  isArray: false,
                },
              },
            },
            value,
          ),
        ).toEqual(expected);
      });
    }

    testConvertSoapObjectWithPrimitiveToXmlString(
      'string',
      {val: 'test_string'},
      '<val>test_string</val>',
    );

    testConvertSoapObjectWithPrimitiveToXmlString(
      'boolean',
      {val: true},
      '<val>true</val>',
    );

    testConvertSoapObjectWithPrimitiveToXmlString(
      'int',
      {val: 1},
      '<val>1</val>',
    );

    testConvertSoapObjectWithPrimitiveToXmlString(
      'long',
      {val: 123456},
      '<val>123456</val>',
    );

    testConvertSoapObjectWithPrimitiveToXmlString(
      'double',
      {val: 1.2},
      '<val>1.2</val>',
    );

    const TypeWithArray: SoapObjectType = {
      name: 'TypeWithArray',
      properties: {
        arrayVal: {
          name: 'arrayVal',
          isArray: true,
          isOptional: false,
          type: 'string',
        },
      },
    };

    const EnumType: SoapEnumType = {
      name: 'EnumType',
      enumerations: ['val1', 'val2'],
    };

    it('converts object with an enum value', () => {
      const TypeWithEnum: SoapObjectType = {
        name: 'TypeWithEnum',
        properties: {
          enumVal: {
            name: 'enumVal',
            isArray: false,
            isOptional: false,
            type: EnumType,
          },
        },
      };
      const soapXmlString = soapCreator.convertSoapObjectToXmlString(
        TypeWithEnum,
        {
          enumVal: 'val1',
        },
      );
      expect(soapXmlString).toEqual('<enumVal>val1</enumVal>');
    });

    it('converts object with an array', () => {
      const soapXmlString = soapCreator.convertSoapObjectToXmlString(
        TypeWithArray,
        {
          arrayVal: ['string1', 'string2'],
        },
      );
      expect(soapXmlString).toEqual(
        '<arrayVal>string1</arrayVal><arrayVal>string2</arrayVal>',
      );
    });

    it('converts object with an empty array', () => {
      const soapXmlString = soapCreator.convertSoapObjectToXmlString(
        TypeWithArray,
        {
          arrayVal: [],
        },
      );
      expect(soapXmlString).toEqual('');
    });

    const TypeWithMultipleProperties: SoapObjectType = {
      name: 'TypeWithMultipleProperties',
      properties: {
        prop1: {
          name: 'prop1',
          isArray: false,
          isOptional: false,
          type: 'string',
        },
        prop2: {
          name: 'prop2',
          isArray: false,
          isOptional: false,
          type: 'string',
        },
      },
    };

    it('converts object with properties in the wrong order', () => {
      const soapXmlString = soapCreator.convertSoapObjectToXmlString(
        TypeWithMultipleProperties,
        {prop2: 'prop2Val', prop1: 'prop1Val'},
      );
      expect(soapXmlString).toEqual(
        '<prop1>prop1Val</prop1><prop2>prop2Val</prop2>',
      );
    });

    it('converts object with complex property value', () => {
      const TypeWithComplexProperty: SoapObjectType = {
        name: 'TypeWithComplexProperty',
        properties: {
          complexProp: {
            name: 'complexProp',
            type: TypeWithArray,
            isArray: false,
            isOptional: true,
          },
        },
      };
      const soapXmlString = soapCreator.convertSoapObjectToXmlString(
        TypeWithComplexProperty,
        {complexProp: {arrayVal: ['test1', 'test2']}},
      );
      expect(soapXmlString).toEqual(
        '<complexProp><arrayVal>test1</arrayVal><arrayVal>test2</arrayVal></complexProp>',
      );
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

    it('converts object with a base type', () => {
      const TypeWithDog: SoapObjectType = {
        name: 'TypeWithDog',
        properties: {
          dog: {
            name: 'dog',
            type: DogType,
            isOptional: false,
            isArray: false,
          },
        },
      };
      const soapXmlString = soapCreator.convertSoapObjectToXmlString(
        TypeWithDog,
        {
          dog: {
            name: 'Fido',
            breed: 'Yellow Lab',
          },
        },
      );
      expect(soapXmlString).toEqual(
        '<dog><name>Fido</name><breed>Yellow Lab</breed></dog>',
      );
    });

    it('converts object with child type(s)', () => {
      const TypeWithAnimal: SoapObjectType = {
        name: 'TypeWithAnimal',
        properties: {
          animal: {
            name: 'animal',
            type: AnimalType,
            isOptional: false,
            isArray: false,
          },
        },
      };
      const soapXmlString = soapCreator.convertSoapObjectToXmlString(
        TypeWithAnimal,
        {
          animal: {
            name: 'Rocky',
            breed: 'Yellow Lab',
          },
        },
      );
      expect(soapXmlString).toEqual(
        '<animal xsi:type="DogType"><name>Rocky</name><breed>Yellow Lab</breed></animal>',
      );
    });

    const HerdingDogType: SoapObjectType = {
      name: 'HerdingDogType',
      properties: {
        role: {
          name: 'role',
          type: 'string',
          isOptional: false,
          isArray: false,
        },
      },
      baseType: DogType,
    };
    DogType.childTypes = [HerdingDogType];

    it('converts object with multi-level inheritance', () => {
      const TypeWithDog: SoapObjectType = {
        name: 'TypeWithDog',
        properties: {
          dog: {
            name: 'dog',
            type: DogType,
            isOptional: false,
            isArray: false,
          },
        },
      };
      const soapXmlString = soapCreator.convertSoapObjectToXmlString(
        TypeWithDog,
        {
          dog: {name: 'Riley', breed: 'GSD', role: 'Herding'},
        },
      );
      expect(soapXmlString).toEqual(
        '<dog xsi:type="HerdingDogType"><name>Riley</name><breed>GSD</breed><role>Herding</role></dog>',
      );
    });

    it('converts object with NumberValue conflicting with TextValue', () => {
      const ValueType: SoapObjectType = {
        name: 'Value',
        properties: {},
      };
      const NumberValueType: SoapObjectType = {
        name: 'NumberValue',
        properties: {
          value: {
            name: 'value',
            type: 'string',
            isOptional: false,
            isArray: false,
          },
        },
        baseType: ValueType,
      };
      const TextValueType: SoapObjectType = {
        name: 'TextValue',
        properties: {
          value: {
            name: 'value',
            type: 'string',
            isOptional: false,
            isArray: false,
          },
        },
        baseType: ValueType,
      };
      ValueType.childTypes = [NumberValueType, TextValueType];
      const TypeWithValueType: SoapObjectType = {
        name: 'TypeWithValueType',
        properties: {
          value: {
            name: 'value',
            type: ValueType,
            isOptional: false,
            isArray: false,
          },
        },
      };
      const soapXmlString = soapCreator.convertSoapObjectToXmlString(
        TypeWithValueType,
        {
          value: {
            value: 'test',
          },
        },
      );
      expect(soapXmlString).toEqual(
        '<value xsi:type="TextValue"><value>test</value></value>',
      );
    });

    function testConvertSoapObjectToXmlStringThrowsForInvalidPrimitive(
      primitiveType: SoapPrimitiveType,
      value: any,
    ) {
      it(`throws for invalid primitive (${primitiveType})`, () => {
        expect(() =>
          soapCreator.convertSoapObjectToXmlString(
            {
              name: 'TypeWithPrimitive',
              properties: {
                val: {
                  name: 'val',
                  isOptional: false,
                  type: primitiveType,
                  isArray: false,
                },
              },
            },
            {val: value},
          ),
        ).toThrow();
      });
    }
    testConvertSoapObjectToXmlStringThrowsForInvalidPrimitive(
      'boolean',
      'not_boolean',
    );

    testConvertSoapObjectToXmlStringThrowsForInvalidPrimitive('int', 1.2);

    testConvertSoapObjectToXmlStringThrowsForInvalidPrimitive(
      'long',
      'not_long',
    );

    testConvertSoapObjectToXmlStringThrowsForInvalidPrimitive(
      'double',
      'not_double',
    );

    it('throws for invaid enum value', () => {
      const TypeWithEnum: SoapObjectType = {
        name: 'TypeWithEnum',
        properties: {
          enumVal: {
            name: 'enumVal',
            isArray: false,
            isOptional: false,
            type: EnumType,
          },
        },
      };
      expect(() =>
        soapCreator.convertSoapObjectToXmlString(TypeWithEnum, {
          enumVal: 'val3',
        }),
      ).toThrow();
    });

    it('throws when a required property is missing', () => {
      expect(() =>
        soapCreator.convertSoapObjectToXmlString(TypeWithMultipleProperties, {
          prop1: 'prop1Val',
        }),
      ).toThrow();
    });

    it('throws when an unexcpected property is provided', () => {
      expect(() =>
        soapCreator.convertSoapObjectToXmlString(TypeWithMultipleProperties, {
          prop1: 'prop1Val',
          prop2: 'prop2Val',
          prop3: 'prop3Val',
        }),
      ).toThrow();
    });
  });
});
