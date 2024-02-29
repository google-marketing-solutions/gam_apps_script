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

const path = require('path');

module.exports = {
  entry : {
    index : './index.ts',
    ad_manager_client : './ad_manager_client.ts',
    ad_manager_error : './ad_manager_error.ts',
    ad_manager_service : '/ad_manager_service.ts',
    report_downloader : './report_downloader.ts',
    statement_builder : './statement_builder.ts'
  },
  mode : 'production',
  module : {
    rules :
          [
            {
              test : /\.ts$/,
              use : 'ts-loader',
              exclude : /node_modules/,
            },
          ],
  },
  resolve : {
    extensions : ['.tsx', '.ts', '.js'],
  },
  output : {
    libraryTarget : 'this',
    filename : '[name].js',
    path : path.resolve(__dirname, 'dist'),
  },
};