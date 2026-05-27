// ui.js — all DOM manipulation: rendering results, errors, loading control,
// populating the schema list, tab switching, and stat updates.
//
// Each function takes DOM element IDs or references as arguments rather than
// reaching into the global document itself — this keeps things testable
// and makes the coupling explicit.

const ROW_CAP = 20; // maximum rows displayed before the "narrow your query" notice

// ============================================================
// LOADING SCREEN
// ============================================================

const loadingMessages = [
  'Retrieving case files',
  'Accessing precinct database',
  'Initialising case file 74/LKS/1147',
];
let _loadingMsgIndex = 0;
let _loadingMsgInterval = null;

/** Start the loading screen and begin cycling the status text. */
export function showLoadingScreen() {
  _loadingMsgIndex = 0;
  const el = document.getElementById('loading-status-text');
  if (el) el.textContent = loadingMessages[0];

  // Cycle through loading messages every 1.2 seconds
  _loadingMsgInterval = setInterval(() => {
    _loadingMsgIndex = (_loadingMsgIndex + 1) % loadingMessages.length;
    const el = document.getElementById('loading-status-text');
    if (el) el.textContent = loadingMessages[_loadingMsgIndex];
  }, 1200);
}

/**
 * Advance the loading bar to a given percentage (0–100).
 * The CSS transition makes the movement smooth.
 */
export function setLoadingProgress(pct) {
  const bar = document.getElementById('loading-bar');
  if (bar) bar.style.width = `${pct}%`;
}

/** Stop loading screen, show the main game. */
export function showGame() {
  clearInterval(_loadingMsgInterval);
  setLoadingProgress(100);
  // Brief pause so the bar snaps to 100% before we swap screens
  setTimeout(() => {
    document.getElementById('loading-screen').classList.add('hidden');
    document.getElementById('game').classList.remove('hidden');
  }, 300);
}

/** Show an error message on the loading screen (e.g. WASM failed to fetch). */
export function showLoadingError(message) {
  clearInterval(_loadingMsgInterval);
  const el = document.getElementById('loading-error');
  if (el) el.textContent = message;
  const statusEl = document.getElementById('loading-status-text');
  if (statusEl) statusEl.textContent = 'Failed to load';
}

// ============================================================
// TABS
// ============================================================

/**
 * Wires up tab switching for the left panel.
 * Each button has data-tab="query"|"briefing"|"schema".
 */
export function initTabs() {
  const buttons  = document.querySelectorAll('.tab-btn');
  const contents = document.querySelectorAll('.tab-content');

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;

      buttons.forEach(b => {
        b.classList.toggle('active', b.dataset.tab === target);
        b.setAttribute('aria-selected', b.dataset.tab === target);
      });

      contents.forEach(c => {
        c.classList.toggle('hidden', c.id !== `tab-${target}`);
      });
    });
  });
}

// ============================================================
// SCHEMA LIST
// ============================================================

/**
 * Populates the Schema tab with a list of table names.
 * Players see the names but must discover columns by querying.
 *
 * @param {string[]} tableNames
 */
export function populateSchemaList(tableNames) {
  const list = document.getElementById('schema-list');
  if (!list) return;
  list.innerHTML = '';
  for (const name of tableNames) {
    const li = document.createElement('li');
    li.textContent = name;
    list.appendChild(li);
  }
}

// ============================================================
// BRIEFING TEXT
// ============================================================

/**
 * Fills the Briefing tab with the opening statement from story.json.
 * The text is plain (with \n line breaks) and rendered as pre-wrap via CSS.
 *
 * @param {string} text
 */
export function populateBriefing(text) {
  const el = document.getElementById('briefing-text');
  if (el) el.textContent = text;
}

// ============================================================
// RESULTS RENDERING
// ============================================================

/**
 * Renders a query result set as a styled table in the results panel.
 * Caps display at ROW_CAP rows and shows a count notice for overflow.
 *
 * @param {{ columns: string[], rows: any[][] }} result
 * @param {object} storyData  - from story.json, for the cap and empty messages
 */
export function renderResults(result, storyData) {
  const area     = document.getElementById('results-area');
  const countEl  = document.getElementById('results-count');
  area.innerHTML = '';

  const { columns, rows } = result;

  // No columns means the query ran but returned nothing
  if (columns.length === 0 || rows.length === 0) {
    area.innerHTML = `<div class="result-empty">${storyData.noResultsMessage}</div>`;
    if (countEl) countEl.textContent = '0 records';
    return;
  }

  // Update the record count display
  if (countEl) {
    countEl.textContent = `${rows.length} record${rows.length !== 1 ? 's' : ''}`;
  }

  const displayRows = rows.slice(0, ROW_CAP);
  const overflow    = rows.length - ROW_CAP;

  // Build the table
  const table  = document.createElement('table');
  table.className = 'result-table';

  // Header row — column names in small caps
  const thead     = document.createElement('thead');
  const headerRow = document.createElement('tr');
  for (const col of columns) {
    const th = document.createElement('th');
    th.textContent = col.toUpperCase();
    headerRow.appendChild(th);
  }
  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Data rows
  const tbody = document.createElement('tbody');
  for (const row of displayRows) {
    const tr = document.createElement('tr');
    for (const cell of row) {
      const td = document.createElement('td');
      if (cell === null || cell === undefined) {
        td.textContent = '—';
        td.classList.add('null-cell');
      } else {
        td.textContent = String(cell);
      }
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);

  const wrapper = document.createElement('div');
  wrapper.className = 'result-wrapper';
  wrapper.appendChild(table);

  // Row-cap notice
  if (overflow > 0) {
    const cap = document.createElement('div');
    cap.className = 'result-cap';
    cap.textContent = storyData.rowCapMessage.replace('{remaining}', overflow);
    wrapper.appendChild(cap);
  }

  area.appendChild(wrapper);
}

/**
 * Renders a sql.js syntax or runtime error in the results panel.
 *
 * @param {string} message  - the error message from sql.js
 */
export function renderError(message) {
  const area = document.getElementById('results-area');
  const countEl = document.getElementById('results-count');
  if (countEl) countEl.textContent = '';

  area.innerHTML = `
    <div class="result-error">
      <div class="result-error-label">SYNTAX ERROR</div>
      <div class="result-error-msg">${escapeHtml(message)}</div>
    </div>
  `;
}

/**
 * Renders a blocked-query message in the results panel.
 *
 * @param {string} message  - from story.json blockedMessages, chosen randomly
 */
export function renderBlocked(message) {
  const area = document.getElementById('results-area');
  const countEl = document.getElementById('results-count');
  if (countEl) countEl.textContent = '';

  area.innerHTML = `
    <div class="result-blocked">
      <div class="result-blocked-label">ACCESS DENIED</div>
      <div class="result-blocked-msg">${escapeHtml(message)}</div>
    </div>
  `;
}

// ============================================================
// FOOTER STATS
// ============================================================

export function updateQueriesRun(count) {
  const el = document.getElementById('queries-run');
  if (el) el.textContent = `Queries: ${count}`;
}

export function updateAttemptsLeft(count) {
  const el = document.getElementById('attempts-left');
  if (el) el.textContent = `Accusations: ${count} remaining`;
}

// ============================================================
// ENDING SCREEN
// ============================================================

/**
 * Replaces the results area with the final epilogue text.
 *
 * @param {string} title     - ending label, e.g. "The Whole Truth"
 * @param {string} epilogue  - long-form text from story.json
 * @param {string} rank      - detective rank label
 */
export function showEndingScreen(title, epilogue, rank) {
  const area = document.getElementById('results-area');
  const countEl = document.getElementById('results-count');
  if (countEl) countEl.textContent = '';

  area.innerHTML = `
    <div class="ending-screen">
      <div class="ending-stamp">CASE FILE 74/LKS/1147 — CLOSED</div>
      <div class="ending-title">${escapeHtml(title)}</div>
      <div class="ending-epilogue">${escapeHtml(epilogue)}</div>
      <div class="ending-rank">DETECTIVE RANK: ${escapeHtml(rank)}</div>
    </div>
  `;

  // Disable the accusation button after case is closed
  const btn = document.getElementById('accuse-btn');
  if (btn) btn.disabled = true;
}

// ============================================================
// UTILITIES
// ============================================================

/**
 * Escapes HTML special characters before inserting user-adjacent text into innerHTML.
 * This prevents XSS if error messages or data somehow contain HTML.
 */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
