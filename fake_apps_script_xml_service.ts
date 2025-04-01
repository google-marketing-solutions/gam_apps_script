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
 * @fileoverview A fake implementation of GoogleAppsScript.XML_Service
 * to use in tests. Not all classes/methods are stubbed.
 */

/**
 * GoogleAppsScript.XML_Service.ContentTypes
 */
export enum AppsScriptContentTypes {
  CDATA,
  COMMENT,
  DOCTYPE,
  ELEMENT,
  ENTITYREF,
  PROCESSINGINSTRUCTION,
  TEXT,
}

/**
 * Fake for GoogleAppsScript.XML_Service.Document
 */
export class FakeAppsScriptDocument {
  /**
   * Creates an empty Ad Manager API SOAP response.
   * @return The Apps Script Element representing the empty SOAP response.
   */
  static createDefault() {
    return new FakeAppsScriptDocument(
      new FakeAppsScriptElement('Root', [
        new FakeAppsScriptElement('rval', [], 'VALUE'),
      ]),
    );
  }

  /**
   * Creates an Ad Manager API SOAP response based on the provided parameters.
   * Can be used to simulate API responses.
   * @return The Apps Script Element representing the SOAP response.
   */
  static createServiceResponse(
    methodName: string,
    response: FakeAppsScriptElement[] = [],
    value = '',
  ): FakeAppsScriptDocument {
    const soapNamespace = new FakeAppsScriptNamespace(
      'http://schemas.xmlsoap.org/soap/envelope/',
    );
    const xmlNamespace = new FakeAppsScriptNamespace(
      'http://www.w3.org/2001/XMLSchema',
    );
    return new FakeAppsScriptDocument(
      new FakeAppsScriptElement('Envelope', [
        new FakeAppsScriptElement(
          'Body',
          [
            new FakeAppsScriptElement(methodName, [
              new FakeAppsScriptElement('rval', response, value, xmlNamespace),
            ]),
          ],
          '',
          soapNamespace,
        ),
      ]),
    );
  }

  constructor(private readonly rootElement: FakeAppsScriptElement) {}

  getRootElement(): FakeAppsScriptElement {
    return this.rootElement;
  }
}

/**
 * Fake for GoogleAppsScript.XML_Service.Attribute
 */
export class FakeAppsScriptAttribute {
  constructor(
    private readonly name: string,
    private readonly value: string,
  ) {}

  getName(): string {
    return this.name;
  }

  getValue(): string {
    return this.value;
  }
}

/**
 * Fake for GoogleAppsScript.XML_Service.Content
 */
export class FakeAppsScriptContent {
  constructor(
    private readonly type: AppsScriptContentTypes,
    private readonly value: string,
  ) {}

  getValue(): string {
    return this.value;
  }

  getType(): AppsScriptContentTypes {
    return this.type;
  }

  asElement(): FakeAppsScriptElement {
    return this as unknown as FakeAppsScriptElement;
  }
}

/**
 * Fake for GoogleAppsScript.XML_Service.Element
 */
export class FakeAppsScriptElement extends FakeAppsScriptContent {
  static createServiceResponseBody(
    responseName: string,
    children: FakeAppsScriptContent[] = [],
    value = '',
    rvalAttributes: FakeAppsScriptAttribute[] = [],
  ) {
    const soapNamespace = new FakeAppsScriptNamespace(
      'http://schemas.xmlsoap.org/soap/envelope/',
    );
    const xmlNamespace = new FakeAppsScriptNamespace(
      'http://www.w3.org/2001/XMLSchema',
    );
    return new FakeAppsScriptElement(
      'Body',
      [
        new FakeAppsScriptElement(responseName, [
          new FakeAppsScriptElement(
            'rval',
            children,
            value,
            xmlNamespace,
            rvalAttributes,
          ),
        ]),
      ],
      '',
      soapNamespace,
    );
  }

  static createServiceResponseBodyList(
    responseName: string,
    childrenList: FakeAppsScriptContent[][],
    value = '',
  ) {
    const soapNamespace = new FakeAppsScriptNamespace(
      'http://schemas.xmlsoap.org/soap/envelope/',
    );
    const xmlNamespace = new FakeAppsScriptNamespace(
      'http://www.w3.org/2001/XMLSchema',
    );
    const children = childrenList.map(
      (c) => new FakeAppsScriptElement('rval', c, value, xmlNamespace),
    );
    return new FakeAppsScriptElement(
      'Body',
      [new FakeAppsScriptElement(responseName, children)],
      '',
      soapNamespace,
    );
  }

  static createServiceErrorResponseBody(
    responseName: string,
    children: FakeAppsScriptContent[],
    value = '',
  ) {
    const soapNamespace = new FakeAppsScriptNamespace(
      'http://schemas.xmlsoap.org/soap/envelope/',
    );
    const xmlNamespace = new FakeAppsScriptNamespace(
      'http://www.w3.org/2001/XMLSchema',
    );
    return new FakeAppsScriptElement(
      'Body',
      [
        new FakeAppsScriptElement('Fault', [
          new FakeAppsScriptElement(
            'detail',
            [new FakeAppsScriptElement(responseName, children, '')],
            '',
            soapNamespace,
          ),
        ]),
      ],
      '',
      soapNamespace,
    );
  }

  constructor(
    private readonly name: string,
    private readonly children: FakeAppsScriptContent[] = [],
    value = '',
    private readonly namespace = new FakeAppsScriptNamespace('no_namespace'),
    private readonly attributes: FakeAppsScriptAttribute[] = [],
  ) {
    super(AppsScriptContentTypes.ELEMENT, value);
  }

  getText(): string {
    return this.getValue();
  }

  getChildren(
    name?: string,
    namespace?: FakeAppsScriptNamespace,
  ): FakeAppsScriptElement[] {
    let children = this.children.filter(
      (child) => child instanceof FakeAppsScriptElement,
    );
    if (name) {
      children = children.filter(
        (child) => child.asElement().getName() === name,
      );
    }
    if (namespace) {
      children = children.filter(
        (child) => child.asElement().getNamespace() === namespace,
      );
    }
    return children.map((content) => content.asElement());
  }

  getChild(name: string): FakeAppsScriptElement | null {
    const child = this.children
      .find(
        (child) =>
          child instanceof FakeAppsScriptElement && child.getName() === name,
      )
      ?.asElement();
    return child ?? null;
  }

  getContent(index: number): FakeAppsScriptContent | null {
    return this.children[index];
  }

  getName(): string {
    return this.name;
  }

  getNamespace(): FakeAppsScriptNamespace {
    return this.namespace;
  }

  getDescendants(): FakeAppsScriptContent[] {
    let descendants: FakeAppsScriptContent[] = [];
    const children = this.getChildren();
    for (const child of children) {
      descendants.push(child);
      if (child.getType() === AppsScriptContentTypes.ELEMENT) {
        descendants = descendants.concat(child.asElement().getDescendants());
      }
    }
    return descendants;
  }

  getAttributes(): FakeAppsScriptAttribute[] {
    return this.attributes;
  }
}

/**
 * Fake for GoogleAppsScript.XML_Service.Namespace
 */
export class FakeAppsScriptNamespace {
  constructor(
    private readonly uri: string,
    private readonly prefix?: string,
  ) {}

  getUri(): string {
    return this.uri;
  }

  getPrefix(): string | undefined {
    return this.prefix;
  }
}

/**
 * Fake for GoogleAppsScript.XML_Service.XmlService
 */
export class FakeAppsScriptXmlService {
  static readonly ContentTypes = AppsScriptContentTypes;

  constructor(
    private readonly namespaces: FakeAppsScriptNamespace[],
    private readonly parseResponses: {
      [xmlString: string]: FakeAppsScriptDocument;
    },
  ) {}

  getNamespace(uri: string) {
    return this.namespaces.find((ns) => ns.getUri() === uri);
  }

  parse(xmlString: string) {
    return this.parseResponses[xmlString];
  }
}
