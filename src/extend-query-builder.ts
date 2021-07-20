import { QueryBuilder } from "typeorm";
import { highlight } from 'sql-highlight'
import { format } from 'sql-formatter';

// NOTE(justin): extend query builder with better logging
declare module 'typeorm/query-builder/QueryBuilder' {
  interface QueryBuilder<Entity> {
    logSql(): this;
  }
}

QueryBuilder.prototype.logSql = function<Entity>(this: QueryBuilder<Entity>) {
  let [query, params] = this.getQueryAndParameters();

  // IMPORTANT(justin): getQueryAndParameters also mutates
  // state.... makes inserts fail on execute, unmutate the state
  this.expressionMap.nativeParameters = {};
  
  // NOTE(justin): typeorm params are 1 indexed
  params.unshift(null);

  // NOTE(justin): Make sql-formatter compliant query string and param list.
  query  = query.replace(/\$/g, ':')
  params = params.map(param => typeof param == 'string' ? `'${param}'` : param);

  console.log()
  console.log(highlight(format(query, {
    params,
    uppercase: true,
    language: 'postgresql'
  })));
  console.log();

  return this;
};
