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

import {SoapHelper} from './soap_helper';
import {AdManagerServiceInterface} from './typings/ad_manager_service_interface';

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
    private readonly soapHelper: SoapHelper,
  ) {}

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
      this.soapHelper.createSoapPayload(operationName, ...operationParameters),
    );
    const response = UrlFetchApp.fetch(this.serviceUrl, {
      headers: Object.assign({}, this.httpHeaders, {
        'Authorization': `Bearer ${this.oAuthToken}`,
      }),
      payload: soapPayload,
      contentType: 'text/xml; charset=utf-8',
      muteHttpExceptions: true,
    });
    const responseXml = XmlService.parse(response.getContentText());
    const soapNamespace = XmlService.getNamespace(
      'http://schemas.xmlsoap.org/soap/envelope/',
    );
    const bodyElement = responseXml
      .getRootElement()
      .getChild('Body', soapNamespace);
    if (!bodyElement) {
      throw new Error(response.getContentText());
    }
    return this.soapHelper.convertSoapResponseToObjectLiteral(bodyElement);
  }

  private createSoapPayload(
    operationName: string,
    operationParameters: string,
  ): string {
    return `<soapenv:Envelope
    xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
    xmlns:xsd="http://www.w3.org/2001/XMLSchema"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
    <soapenv:Header>
        <ns1:RequestHeader
            soapenv:actor="http://schemas.xmlsoap.org/soap/actor/next"
            soapenv:mustUnderstand="0"
            xmlns:ns1="https://www.google.com/apis/ads/publisher/${this.apiVersion}">
            <ns1:applicationName>${this.applicationName + ' ' + this.userAgent}</ns1:applicationName>
            <ns1:networkCode>${this.networkCode}</ns1:networkCode>
        </ns1:RequestHeader>
    </soapenv:Header>
    <soapenv:Body>
      <${operationName} xmlns="https://www.google.com/apis/ads/publisher/${this.apiVersion}">${operationParameters}</${operationName}>
    </soapenv:Body>
</soapenv:Envelope>`;
  }
}
