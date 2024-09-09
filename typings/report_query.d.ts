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

import {Statement} from './statement';

/**
 * Represents an Ad Manager ReportQuery.
 */
export declare interface ReportQuery {
  readonly dimensions: string[];
  readonly adUnitView?: 'TOP_LEVEL' | 'FLAT' | 'HIERARCHICAL';
  readonly columns: string[];
  readonly dimensionAttributes?: string[];
  readonly customFieldIds?: number[];
  readonly cmsMetadataKeyIds?: number[];
  readonly customDimensionKeyIds?: number[];
  readonly startDate?: Date;
  readonly endDate?: Date;
  readonly dateRangeType:
    | 'TODAY'
    | 'YESTERDAY'
    | 'LAST_WEEK'
    | 'LAST_MONTH'
    | 'LAST_3_MONTHS'
    | 'REACH_LIFETIME'
    | 'CUSTOM_DATE'
    | 'NEXT_DAY'
    | 'NEXT_90_DAYS'
    | 'NEXT_WEEK'
    | 'NEXT_MONTH'
    | 'CURRENT_AND_NEXT_MONTH'
    | 'NEXT_QUARTER'
    | 'NEXT_3_MONTHS'
    | 'NEXT_12_MONTHS';
  readonly statement?: Statement;
  readonly reportCurrency?: string;
}
