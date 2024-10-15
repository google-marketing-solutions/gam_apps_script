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
 * @fileoverview Entry point for GAM API. AdManagerClient handles service
 * creation.
 */

import {AdManagerService} from './ad_manager_service';
import {ReportDownloader} from './report_downloader';
import {SoapCreator} from './soap_creator';
import {SoapParser} from './soap_parser';
import {TypeIndexProvider} from './soap_type_index_provider';
import {AdManagerClientInterface} from './typings/ad_manager_client_interface';

/**
 * Represents an Ad Manager API client. Handles service creation.
 */
export class AdManagerClient implements AdManagerClientInterface {
  /**
   * @param oAuthToken The oAuthToken to use for authentication. Can be obtained
   *     using ScriptApp.getOAuthToken().
   * @param applicationName A name representing the Ad Manager API application.
   * @param networkCode The network code to make requests against.
   * @param apiVersion The Ad Manager API version to use.
   * @param httpHeaders Custom HTTP headers to add to API requests.
   */
  constructor(
    readonly oAuthToken: string,
    readonly applicationName: string,
    readonly networkCode: string | number,
    readonly apiVersion: string,
    readonly httpHeaders: {[headerName: string]: string} = {},
  ) {}

  /**
   * Creates an Ad Manager Service.
   * @param serviceName The name of the service to create.
   * @return The created service.
   */
  getService(serviceName: string): AdManagerService {
    const serviceUrl = `https://ads.google.com/apis/ads/publisher/${this.apiVersion}/${serviceName}?wsdl`;
    const typeIndex = TypeIndexProvider.createWithServiceUrl(serviceUrl);
    return new AdManagerService(
      serviceName,
      serviceUrl,
      this.oAuthToken,
      this.applicationName,
      this.networkCode,
      this.apiVersion,
      this.httpHeaders,
      typeIndex,
      new SoapCreator(),
      new SoapParser(typeIndex),
    );
  }

  /**
   * Creates a ReportDownloader.
   * @return The created report downloader.
   */
  getReportDownloader(): ReportDownloader {
    const reportService = this.getService('ReportService');
    return new ReportDownloader(reportService);
  }
}


