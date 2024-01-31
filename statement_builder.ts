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

import {BindVariable, BindVariableSet, BindVariableValue, Statement, StatementBuilderInterface, StringKeyValueMap} from './typings/statement';

/**
 * Handles the creation of PQL queries.
 */
export class StatementBuilder implements StatementBuilderInterface {
  private columnsForSelect?: string;
  private tableForFrom?: string;
  private clauseForWhere?: string;
  private readonly bindVariables: StringKeyValueMap[] = [];

  /** The limit for the Statement. */
  limit = 75;

  /** The offset for the Statement. */
  offset = 0;

  /**
   * Sets the columns for the SELECT clause. Must be used in conjuction with
   * StatementBuilder.from(table).
   * @param columns A comma separated list of the columns to SELECT.
   * @return A reference to the StatementBuilder.
   */
  select(columns: string): StatementBuilder {
    this.columnsForSelect = columns;
    return this;
  }

  /**
   * Sets the table for the SELECT clause. Must be used in conjuction with
   * StatementBuilder.select(columns).
   * @param table The table to SELECT from.
   * @return A reference to the StatementBuilder.
   */
  from(table: string): StatementBuilder {
    this.tableForFrom = table;
    return this;
  }

  /**
   * Adds a WHERE clause.
   * @param clause The where clause.
   * @return A reference to the StatementBuilder.
   */
  where(clause: string): StatementBuilder {
    this.clauseForWhere = clause;
    return this;
  }

  /**
   * Sets the LIMIT for the Statement.
   * @param limit The limit for the Statement.
   * @return A reference to the StatementBuilder.
   */
  withLimit(limit: number): StatementBuilder {
    this.limit = limit;
    return this;
  }

  /**
   * Sets the OFFSET for the Statement.
   * @param offset The offset for the Statement.
   * @return A reference to the StatementBuilder.
   */
  withOffset(offset: number): StatementBuilder {
    this.offset = offset;
    return this;
  }

  /**
   * Adds a bind variable for the WHERE clause.
   * @param key The key for the bind variable.
   * @param value The value (or array of values) for the key.
   * @return A reference to the StatementBuilders.
   */
  withBindVariable(key: string, value: BindVariableValue|BindVariableValue[]):
      StatementBuilder {
    const val: BindVariable|BindVariableSet =
        Array.isArray(value) ? {values: value.map(v => ({value: v}))} : {value};
    const stringKeyValueMap = {key, value: val};
    this.bindVariables.push(stringKeyValueMap);
    return this;
  }

  /**
   * Builds a Statement object from the current state.
   * @return The statement.
   */
  toStatement(): Statement {
    if (this.columnsForSelect && !this.tableForFrom) {
      throw new Error('FROM clause required with SELECT.');
    }
    if (!this.columnsForSelect && this.tableForFrom) {
      throw new Error('SELECT clause required with FROM.');
    }
    const query = [];
    if (this.columnsForSelect) {
      query.push(`SELECT ${this.columnsForSelect} FROM ${this.tableForFrom}`);
    }
    if (this.clauseForWhere) {
      query.push(`WHERE ${this.clauseForWhere}`);
    }
    query.push(`LIMIT ${this.limit} OFFSET ${this.offset}`);
    const queryString = query.join(' ');
    return (this.bindVariables.length) ?
        {query: queryString, values: this.bindVariables} :
        {query: queryString};
  }
}

