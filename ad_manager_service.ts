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
 * @fileoverview AdManagerService handles Ad Manager API operations for the
 * respective services (eg LineItemService).
 */

import {AdManagerServerFault} from './ad_manager_error';
import {SoapCreator} from './soap_creator';
import {SoapParser} from './soap_parser';
import {SoapObjectTypeProperty, SoapTypeIndex} from './soap_type_index';
import {AdManagerServiceInterface} from './typings/ad_manager_service_interface';
import {ApiException} from './typings/api_exception';

/**
 * Represents an Ad Manager Service for handling Ad Manager API operations.
 */
export class AdManagerService implements AdManagerServiceInterface {
  readonly userAgent = '(DfpApi-AppsScript)';

  /**
   * Creates an AdManagerService. Not to be used directly; use
   * AdManagerClient.getService instead.
   * @param serviceName The name of the service to create.
   * @param serviceUrl The WSDL endpoint for the service.
   * @param oAuthToken The oAuthToken to provide with requests to the service.
   * @param applicationName The name of the application to use on API requests.
   * @param networkCode The Ad Manager Network code to make requests against.
   * @param apiVersion The Ad Manager API version to use.
   * @param httpHeaders Custom HTTP headers to add to each request.
   * @param soapHelper A SoapHelper object to handle creating and converting
   *     SOAP payloads.
   * @ignore
   */
  constructor(
    readonly serviceName: string,
    readonly serviceUrl: string,
    readonly oAuthToken: string,
    readonly applicationName: string,
    readonly networkCode: string | number,
    readonly apiVersion: string,
    readonly httpHeaders: {[header: string]: string},
    readonly serviceTypes: SoapTypeIndex,
    private readonly soapCreator: SoapCreator,
    private readonly soapParser: SoapParser,
  ) {}

  private createSoapPayload(
    operationName: string,
    operationParameters: unknown[],
  ): string {
    const operation = this.serviceTypes[operationName];
    if (!operation) {
      throw new Error(`Unrecognized operation: ${operationName}`);
    }
    let requestObject = this.soapCreator.createRequestObjectFromParameterList(
      operation,
      operationParameters,
    );
    const requestOpjectSoapPayload =
      this.soapCreator.convertSoapObjectToXmlString(operation, requestObject);
    return `<soapenv:Envelope
    xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
    xmlns:xsd="http://www.w3.org/2001/XMLSchema"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
    <soapenv:Header>
        <ns1:RequestHeader
            soapenv:actor="http://schemas.xmlsoap.org/soap/actor/next"
            soapenv:mustUnderstand="0"
            xmlns:ns1="https://www.google.com/apis/ads/publisher/${this.apiVersion}">
            <ns1:applicationName>${this.applicationName} ${this.userAgent}</ns1:applicationName>
            <ns1:networkCode>${this.networkCode}</ns1:networkCode>
        </ns1:RequestHeader>
    </soapenv:Header>
    <soapenv:Body>
      <${operationName} xmlns="https://www.google.com/apis/ads/publisher/${this.apiVersion}">${requestOpjectSoapPayload}</${operationName}>
    </soapenv:Body>
</soapenv:Envelope>`;
  }

  private getResponseElement(
    responseXml: GoogleAppsScript.XML_Service.Document,
  ): {
    responseTypeName: string;
    responseElement: GoogleAppsScript.XML_Service.Element;
  } {
    const soapNamespace = XmlService.getNamespace(
      'http://schemas.xmlsoap.org/soap/envelope/',
    );
    let responseElement = responseXml
      ?.getRootElement()
      ?.getChild('Body', soapNamespace)
      ?.getContent(0)
      ?.asElement();
    if (!responseElement) {
      throw new Error('No body element found in response');
    }
    let responseTypeName = responseElement.getName();
    if (responseTypeName === 'Fault' || undefined) {
      responseElement = responseElement
        ?.getChild('detail')
        ?.getContent(0)
        ?.asElement();
      responseTypeName = 'ApiException';
    }
    return {responseTypeName, responseElement};
  }

  /**
   * Makes a request against the service for the method name and parameters
   * provided.
   *
   * @param operationName The name of the API method to make the request against
   *     (e.g. 'getLineItemsByStatement').
   * @param operationParameters A list of object literals to include with the
   *     request.
   * @return An object literal representing the API response.
   */
  performOperation(
    operationName: string,
    ...operationParameters: unknown[]
  ): unknown {
    const soapPayload = this.createSoapPayload(
      operationName,
      operationParameters,
    );
    const responseText = UrlFetchApp.fetch(this.serviceUrl, {
      headers: Object.assign({}, this.httpHeaders, {
        'Authorization': `Bearer ${this.oAuthToken}`,
      }),
      payload: soapPayload,
      contentType: 'text/xml; charset=utf-8',
      muteHttpExceptions: true,
    }).getContentText();
    const responseXml = XmlService.parse(responseText);
    const {responseTypeName, responseElement} =
      this.getResponseElement(responseXml);
    const soapObjectTypeForResponse = this.serviceTypes[responseTypeName];
    const responseObject = this.soapParser.convertXmlElementToObjectLiteral(
      responseElement,
      soapObjectTypeForResponse,
    ) as {rval: unknown};
    if (responseTypeName === 'ApiException') {
      throw new AdManagerServerFault(responseObject as unknown as ApiException);
    }
    return responseObject['rval'];
  }
}
