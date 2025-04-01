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

// Load webpack.config.js and configure for use with Karma
const webpackConfig = require('./webpack.config.js');
delete webpackConfig.entry;
delete webpackConfig.output;
delete webpackConfig.mode;
webpackConfig.devtool = 'inline-source-map';

module.exports = function(config) {
  config.set({
    frameworks: ['jasmine', 'webpack'],
    plugins: ['karma-webpack', 'karma-jasmine', 'karma-chrome-launcher'],
    files: ['*_test.ts'],
    preprocessors: {'*_test.ts': ['webpack']},
    webpack: webpackConfig,
    reporters: ['progress'],
    browsers: ['ChromeHeadless'],
    autoWatch: false,
    singleRun: true,
  });
};