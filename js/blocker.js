// blocker.js — intercepts destructive SQL before it reaches the database.
//
// The database is read-only from the player's perspective. We check the
// first keyword of the query and block anything that would mutate data.
// Blocked queries show an in-character flavour message from story.json.

// Statements that would change or destroy data
const BLOCKED_KEYWORDS = new Set([
  'DROP', 'DELETE', 'UPDATE', 'INSERT', 'ALTER',
  'TRUNCATE', 'REPLACE', 'CREATE', 'ATTACH', 'DETACH', 'VACUUM',
]);

/**
 * Returns true if the SQL string starts with a destructive keyword.
 * We only look at the first non-whitespace word, which handles
 * multi-line queries and queries with leading comments.
 *
 * @param {string} sqlStr
 * @returns {boolean}
 */
export function isDestructive(sqlStr) {
  // Strip leading whitespace and grab the first word
  const firstWord = sqlStr.trim().split(/[\s;(]+/)[0].toUpperCase();
  return BLOCKED_KEYWORDS.has(firstWord);
}

// Holds the array of flavour messages loaded from story.json
let _messages = [];

/**
 * Call this once during init to supply the flavour message pool.
 * @param {string[]} messages
 */
export function setBlockedMessages(messages) {
  _messages = messages;
}

/**
 * Returns a random blocked-query flavour message.
 * Falls back to a plain English message if none were loaded.
 *
 * @returns {string}
 */
export function getBlockedMessage() {
  if (_messages.length === 0) {
    return 'Read-only database, detective. SELECT statements only.';
  }
  const idx = Math.floor(Math.random() * _messages.length);
  return _messages[idx];
}
