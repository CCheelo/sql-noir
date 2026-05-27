// db.js — wraps sql.js (SQLite compiled to WebAssembly)
//
// sql.js is loaded as a plain <script> tag in index.html, which puts
// the global function `initSqlJs` on window. This module calls it,
// initialises an in-memory SQLite database, and exposes a small API.
//
// "In-memory" means the database lives only in RAM — refreshing the page
// resets it completely. That's intentional: the seed data is loaded fresh
// from seed.sql every time, so the game state is always consistent.

let db = null; // the active sql.js Database instance

/**
 * Creates the database, applies the schema, and loads the seed data.
 * Must be called before any query functions.
 *
 * @param {object} SQL   - the sql.js module returned by initSqlJs()
 * @param {string} schemaSql - contents of schema.sql
 * @param {string} seedSql   - contents of seed.sql
 */
export function initDatabase(SQL, schemaSql, seedSql) {
  db = new SQL.Database();
  // Run the schema first (CREATE TABLE statements), then the seed data (INSERTs)
  db.run(schemaSql);
  db.run(seedSql);
}

/**
 * Executes a SQL string and returns the first result set.
 * Throws a native sql.js error on syntax/runtime problems — the caller
 * is responsible for catching and displaying those.
 *
 * @param {string} sqlStr
 * @returns {{ columns: string[], rows: any[][] }}
 */
export function runQuery(sqlStr) {
  if (!db) throw new Error('Database not initialised yet.');

  // db.exec() returns an array of result sets (one per SELECT statement).
  // We only surface the first one.
  const results = db.exec(sqlStr);

  if (results.length === 0) {
    // Query ran fine but returned nothing (e.g. SELECT on empty table)
    return { columns: [], rows: [] };
  }

  return {
    columns: results[0].columns,
    rows:    results[0].values,  // array of arrays, one per row
  };
}

/**
 * Returns the names of all user-created tables.
 * Used to populate the Schema tab and build the autocomplete schema.
 *
 * @returns {string[]}
 */
export function getTableNames() {
  const result = db.exec(
    "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
  );
  if (result.length === 0) return [];
  return result[0].values.map(row => row[0]);
}

/**
 * Returns the column names for a given table.
 * Uses SQLite's PRAGMA table_info() which is always safe to call.
 *
 * @param {string} tableName
 * @returns {string[]}
 */
export function getColumnsForTable(tableName) {
  // Sanitise: only allow alphanumeric + underscore to prevent injection
  const safe = tableName.replace(/[^a-zA-Z0-9_]/g, '');
  const result = db.exec(`PRAGMA table_info(${safe})`);
  if (result.length === 0) return [];
  // PRAGMA table_info columns: cid | name | type | notnull | dflt_value | pk
  return result[0].values.map(row => row[1]); // index 1 is the column name
}

/**
 * Builds a schema object suitable for CodeMirror's SQL autocomplete extension.
 * Shape: { tableName: ['col1', 'col2', ...], ... }
 *
 * @returns {object}
 */
export function buildAutocompleteSchema() {
  const schema = {};
  for (const table of getTableNames()) {
    schema[table] = getColumnsForTable(table);
  }
  return schema;
}
