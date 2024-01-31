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
 * @fileoverview Helper class for creating and downloading reports.
 */

import {AdManagerService} from './ad_manager_service';
import {ReportDownloadOptions} from './typings/report_download_options';
import {ReportDownloaderInterface} from './typings/report_downloader_interface';
import {ReportJob} from './typings/report_job';

enum ReportJobStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

const SLEEP_INTERVAL = 5 * 1000;

const WAIT_FOR_REPORT_TIMEOUT = 60 * 1000;

const DEFAULT_REPORT_DOWNLOAD_OPTIONS: ReportDownloadOptions = {
  exportFormat: 'CSV_DUMP',
};

/**
 * A helper class for creating and downloading Ad Manager reports.
 */
export class ReportDownloader implements ReportDownloaderInterface {
  /**
   * Creates a ReportDownloader. Not to be used directly; use
   * AdManagerClient.getReportDownloader instead.
   * @param reportService An AdManagerService instance intialized for the
   *     'ReportService'.
   * @ignore
   */
  constructor(private readonly reportService: AdManagerService) {}

  /**
   * Runs a report for the provided ReportJob and waits for the results to
   * finish.
   * @param reportJob The ReportJob to run.
   * @param reportDownloadOptions. By default, includes exportOptions=CSV_DUMP.
   * @return The download URL for the report.
   */
  waitForReport(
      reportJob: ReportJob,
      reportDownloadOptions = DEFAULT_REPORT_DOWNLOAD_OPTIONS): string {
    let status = ReportJobStatus.IN_PROGRESS;
    const reportJobWithId = this.reportService.performOperation(
                                'runReportJob', reportJob) as ReportJob;
    let totalWaitTime = 0;
    while (status === ReportJobStatus.IN_PROGRESS &&
           totalWaitTime < WAIT_FOR_REPORT_TIMEOUT) {
      Utilities.sleep(SLEEP_INTERVAL);
      status = this.reportService.performOperation(
                   'getReportJobStatus', reportJobWithId.id) as ReportJobStatus;
      totalWaitTime += SLEEP_INTERVAL;
    }
    if (status === ReportJobStatus.IN_PROGRESS) {
      throw new Error('Report generation timed out.');
    }
    if (status === ReportJobStatus.FAILED) {
      throw new Error('Failed to create report.');
    }
    return this.reportService.performOperation(
               'getReportDownloadUrlWithOptions', reportJobWithId.id,
               reportDownloadOptions) as string;
  }

  /**
   * Runs a report for the provided ReportJob, waits for it to finish, and
   * returns the results as an Apps Script Blob.
   * @param reportJob The ReportJob to run.
   * @param reportDownloadOptions The optional ReportDownloadOptions.
   * @return The downloaded report as a GoogleAppsScript Blob.
   */
  getReportDataAsBlob(
      reportJob: ReportJob, reportDownloadOptions?: ReportDownloadOptions):
      GoogleAppsScript.Base.Blob {
    const reportDownloadUrl =
        this.waitForReport(reportJob, reportDownloadOptions);
    const response = UrlFetchApp.fetch(
        reportDownloadUrl,
        {method: 'get', headers: {'Accept': 'application/a-gzip'}},
    );
    return response.getBlob();
  }

  /**
   * Runs a report for the provided ReportJob, waits for it to finish, and
   * returns the results as a string.
   * @param reportJob The ReportJob to run.
   * @param reportDownloadOptions The optional ReportDownloadOptions.
   * @return The downloaded report as a string.
   */
  getReportDataAsString(
      reportJob: ReportJob,
      reportDownloadOptions?: ReportDownloadOptions): string {
    const fileBlob = this.getReportDataAsBlob(reportJob, reportDownloadOptions);
    fileBlob.setContentType('application/x-gzip');
    const reportFile = Utilities.ungzip(fileBlob);
    return reportFile.getDataAsString();
  }
}
