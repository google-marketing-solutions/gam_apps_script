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
 * Represents an Ad Manager API Statement object.
 */
export declare interface Statement {
  readonly query: string;
  readonly values?: StringKeyValueMap[];
}

/**
 * Represents the types supported by StringKeyValueMap.
 * TODO: Expand to more types.
 */
export declare type BindVariableValue = string | number | boolean;

/**
 * Represents a bind variable object value.
 */
export declare interface BindVariable {
  value: BindVariableValue;
}

/**
 * Represents a list of bind variable object values.
 */
export declare interface BindVariableSet {
  values: BindVariable[];
}

/**
 * Represents a bind variable for a Statement.
 */
export declare interface StringKeyValueMap {
  readonly key: string;
  readonly value: BindVariable|BindVariableSet;
}

/**
 * Interface for creating Statements.
 */
export declare interface StatementBuilderInterface {
  limit: number;
  offset: number;

  select(columns: string): StatementBuilderInterface;
  from(table: string): StatementBuilderInterface;
  where(clause: string): StatementBuilderInterface;
  withLimit(limit: number): StatementBuilderInterface;
  withOffset(offset: number): StatementBuilderInterface;
  withBindVariable(key: string, value: BindVariableValue|BindVariableValue[]):
      StatementBuilderInterface;
  toStatement(): Statement;
  // TODO: Support order by
}