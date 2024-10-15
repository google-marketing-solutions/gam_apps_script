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

import {AdManagerClient} from './ad_manager_client';
import {AdManagerService} from './ad_manager_service';
import {ReportDownloader} from './report_downloader';
import {TypeIndexProvider} from './soap_type_index_provider';

interface TestState {
  createWithServiceUrl?: jasmine.Spy;
  xmlServiceSpy?: jasmine.SpyObj<typeof XmlService>;
}

describe('AdManagerClient', () => {
  const state: TestState = {};

  beforeEach(() => {
    state.createWithServiceUrl = spyOn(
      TypeIndexProvider,
      'createWithServiceUrl',
    );
    state.createWithServiceUrl.and.returnValue({});
    state.xmlServiceSpy = jasmine.createSpyObj('XmlService', {
      getRawFormat: {format: 'xml'},
    });
    goog.exportSymbol('XmlService', state.xmlServiceSpy);
  });

  describe('constructor', () => {
    it('creates valid instance', () => {
      const client = new AdManagerClient(
        'token',
        'applicationName',
        12345,
        'v12345',
      );

      expect(client.oAuthToken).toBe('token');
      expect(client.applicationName).toBe('applicationName');
      expect(client.networkCode).toBe(12345);
      expect(client.apiVersion).toBe('v12345');
      expect(client.httpHeaders).toEqual({});
    });

    it('sets httpHeaders when provided', () => {
      const client = new AdManagerClient(
        'token',
        'applicationName',
        12345,
        'v12345',
        {'header': 'value'},
      );

      expect(client.httpHeaders).toEqual({'header': 'value'});
    });
  });

  describe('getService', () => {
    it('returns valid AdManagerService instance', () => {
      const client = new AdManagerClient(
        'token',
        'applicationName',
        12345,
        'v12345',
        {'header': 'value'},
      );

      const service: AdManagerService = client.getService('UserService');

      expect(service.oAuthToken).toBe('token');
      expect(service.applicationName).toBe('applicationName');
      expect(service.networkCode).toBe(12345);
      expect(service.apiVersion).toBe('v12345');
      expect(service.httpHeaders).toEqual({'header': 'value'});
      expect(service.serviceUrl).toBe(
        'https://ads.google.com/apis/ads/publisher/v12345/UserService?wsdl',
      );
    });

    it('creates SoapHelper with service URL', () => {
      const client = new AdManagerClient(
        'token',
        'applicationName',
        12345,
        'v12345',
        {'header': 'value'},
      );

      client.getService('UserService');

      expect(state.createWithServiceUrl).toHaveBeenCalledWith(
        'https://ads.google.com/apis/ads/publisher/v12345/UserService?wsdl',
      );
    });
  });

  describe('getReportDownloader', () => {
    it('returns valid ReportDownloader instance', () => {
      const client = new AdManagerClient(
        'token',
        'applicationName',
        12345,
        'v12345',
        {'header': 'value'},
      );

      const reportDownloader = client.getReportDownloader();

      expect(reportDownloader).toBeInstanceOf(ReportDownloader);
    });
  });
});
