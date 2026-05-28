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

/** Start the loading screen. Status text is updated by setLoadingStatus() as steps complete. */
export function showLoadingScreen() {
  setLoadingStatus('Accessing precinct database');
  setLoadingProgress(0);
}

/** Update the status line text shown below the case file header. */
export function setLoadingStatus(text) {
  const el = document.getElementById('loading-status-text');
  if (el) el.textContent = text;
}

/**
 * Advance the loading bar to a given percentage (0–100).
 * The CSS transition makes the movement smooth.
 */
export function setLoadingProgress(pct) {
  const bar = document.getElementById('loading-bar');
  if (bar) bar.style.width = `${pct}%`;
  const pctEl = document.getElementById('loading-pct');
  if (pctEl) pctEl.textContent = `${Math.round(pct)}%`;
}

/** Stop loading screen, show the main game. */
export function showGame() {
  setLoadingProgress(100);
  // Brief pause so the bar snaps to 100% before we swap screens
  setTimeout(() => {
    document.getElementById('loading-screen').classList.add('hidden');
    document.getElementById('game').classList.remove('hidden');
  }, 300);
}

/** Show an error message on the loading screen (e.g. WASM failed to fetch). */
export function showLoadingError(message) {
  const el = document.getElementById('loading-error');
  if (el) el.textContent = message;
  setLoadingStatus('Failed to load');
}

// ============================================================
// TABS
// ============================================================

/**
 * Wires up tab switching for the left panel.
 * Each button has data-tab="query"|"briefing"|"schema".
 */
export function initTabs(onTabChange) {
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

      if (onTabChange) onTabChange(target);
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
export function renderResults(result, storyData, isMeta = false) {
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

  if (isMeta && storyData.sqliteMetaNote) {
    const note = document.createElement('div');
    note.className = 'result-meta-note';
    note.textContent = storyData.sqliteMetaNote;
    area.appendChild(note);
  }
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
 * Replaces the results area with the final epilogue, score breakdown,
 * and a copy-able share code.
 *
 * @param {string} title     - ending label, e.g. "The Whole Truth"
 * @param {string} epilogue  - long-form text from story.json
 * @param {string} rank      - detective rank label
 * @param {object} score     - { queriesRun, hintsUsed, cluesFound, totalClues, attemptsLeft, shareCode }
 */
export function showEndingScreen(title, epilogue, rank, score) {
  const area = document.getElementById('results-area');
  const countEl = document.getElementById('results-count');
  if (countEl) countEl.textContent = '';

  const shareSection = score ? `
    <div class="ending-score">
      <div class="ending-score-row"><span>Queries run</span><span>${score.queriesRun}</span></div>
      <div class="ending-score-row"><span>Clues found</span><span>${score.cluesFound} / ${score.totalClues}</span></div>
      <div class="ending-score-row"><span>Hints used</span><span>${score.hintsUsed}</span></div>
      <div class="ending-score-row"><span>Accusations remaining</span><span>${score.attemptsLeft}</span></div>
    </div>
    <div class="ending-share">
      <div class="ending-share-label">SHARE YOUR RESULT</div>
      <div class="ending-share-row">
        <code class="ending-share-code" id="share-code-text">${escapeHtml(score.shareCode)}</code>
        <button class="btn-share" id="copy-share-btn">COPY</button>
      </div>
    </div>
  ` : '';

  area.innerHTML = `
    <div class="ending-screen">
      <div class="ending-stamp">CASE FILE 74/LKS/1147 — CLOSED</div>
      <div class="ending-title">${escapeHtml(title)}</div>
      <div class="ending-epilogue">${escapeHtml(epilogue)}</div>
      <div class="ending-rank">DETECTIVE RANK: ${escapeHtml(rank)}</div>
      ${shareSection}
    </div>
  `;

  // Disable the accusation button and update header status
  const btn = document.getElementById('accuse-btn');
  if (btn) btn.disabled = true;
  const statusEl = document.getElementById('header-status');
  if (statusEl) {
    statusEl.textContent = 'CLOSED';
    statusEl.style.color = 'var(--text-dim)';
  }

  // Wire up copy button
  const copyBtn = document.getElementById('copy-share-btn');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const code = document.getElementById('share-code-text')?.textContent || '';
      navigator.clipboard.writeText(code).then(() => {
        copyBtn.textContent = 'COPIED';
        setTimeout(() => { copyBtn.textContent = 'COPY'; }, 2000);
      }).catch(() => {
        // Fallback: select the text
        const el = document.getElementById('share-code-text');
        if (el) {
          const range = document.createRange();
          range.selectNodeContents(el);
          window.getSelection().removeAllRanges();
          window.getSelection().addRange(range);
        }
      });
    });
  }
}

// ============================================================
// NOTEBOOK
// ============================================================

/**
 * Renders all discovered clues into the NOTES tab.
 * Each entry shows the notebook text and progressive hints on demand.
 *
 * @param {object[]} foundClues     - triggered clue objects in discovery order
 * @param {object}   hintsRevealed  - { clueId: number (0–3) }
 * @param {Function} onRevealHint   - callback(clueId) when hint button is clicked
 */
export function renderNotebook(foundClues, hintsRevealed, onRevealHint) {
  const container = document.getElementById('notebook-entries');
  const emptyEl   = document.getElementById('notebook-empty');
  if (!container) return;

  if (foundClues.length === 0) {
    container.innerHTML = '';
    if (emptyEl) emptyEl.classList.remove('hidden');
    return;
  }

  if (emptyEl) emptyEl.classList.add('hidden');

  container.innerHTML = foundClues.map(clue => {
    const revealed    = hintsRevealed[clue.id] || 0;
    const hintsHtml   = clue.hints.slice(0, revealed).map((h, i) => `
      <div class="hint-item">
        <span class="hint-num">HINT ${i + 1}</span>
        <span class="hint-text">${escapeHtml(h)}</span>
      </div>
    `).join('');

    let btnHtml = '';
    if (revealed < clue.hints.length) {
      const label = revealed === 0 ? 'GET HINT' : `NEXT HINT (${revealed}/${clue.hints.length})`;
      btnHtml = `<button class="btn-hint" data-clue="${escapeHtml(clue.id)}">${label}</button>`;
    } else {
      btnHtml = '<span class="hint-exhausted">All hints revealed.</span>';
    }

    return `
      <div class="notebook-entry">
        <div class="notebook-entry-label">${escapeHtml(clue.label)}</div>
        <div class="notebook-entry-text">${escapeHtml(clue.notebookEntry)}</div>
        <div class="notebook-hints">${hintsHtml}${btnHtml}</div>
      </div>
    `;
  }).join('');

  // Replace handler each render — avoids stale closures
  container.onclick = (e) => {
    const btn = e.target.closest('.btn-hint');
    if (btn) onRevealHint(btn.dataset.clue);
  };
}

/**
 * Updates the badge count on the NOTES tab button.
 * Hides the badge when count is 0.
 *
 * @param {number} count
 */
export function updateNotebookBadge(count) {
  const badge = document.getElementById('notes-badge');
  if (!badge) return;
  if (count > 0) {
    badge.textContent = count;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
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
