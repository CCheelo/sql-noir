// main.js — entry point.
//
// This file is loaded as type="module" from index.html, which means it can
// use `import` to pull in the other JS files as ES modules.
//
// Init sequence:
//   1. Show loading screen
//   2. Load sql.js (the WASM SQLite engine — ~1 MB, takes a moment)
//   3. Fetch schema.sql, seed.sql, case.json, story.json
//   4. Build the in-memory database
//   5. Build the autocomplete schema from the live database
//   6. Mount the CodeMirror editor
//   7. Populate the briefing and schema tab
//   8. Wire up buttons and the accusation modal
//   9. Hide loading screen, show the game

import { initDatabase, runQuery, getTableNames, buildAutocompleteSchema } from './db.js';
import { isDestructive, setBlockedMessages, getBlockedMessage }           from './blocker.js';
import {
  showLoadingScreen, setLoadingProgress, setLoadingStatus, showGame, showLoadingError,
  initTabs, populateSchemaDiagram, populateBriefing,
  renderResults, renderError, renderBlocked,
  updateQueriesRun, updateAttemptsLeft, showEndingScreen,
  renderNotebook, updateNotebookBadge,
  renderLeads, updateLeadsBadge,
} from './ui.js';
import { CLUES, checkTriggers, getVisibleClues } from './hints.js';
import { saveState, loadState, clearState } from './save.js';

// ============================================================
// STATE
// ============================================================

let queriesRun       = 0;
let attemptsLeft     = 3;
let caseData         = null;  // parsed case.json
let storyData        = null;  // parsed story.json
let editorView       = null;  // CodeMirror EditorView instance
let getEditorContent = null;  // assigned after dynamic import of codemirror-setup.js
let gameOver         = false;

// Notebook state
let foundClues          = [];          // clue objects in discovery order
let foundClueIds        = new Set();   // for fast membership checks
let hintsRevealed       = {};          // { clueId: number (0-3) }
let hintsUsedTotal      = 0;
let newEntriesSinceView = 0;           // NOTES badge count

// ============================================================
// INIT
// ============================================================

async function init() {
  showLoadingScreen();

  try {
    // --- Step 1: Load sql.js (WASM — the slow part, ~1 MB download) ---
    // Animate fake progress from 5 → 43 % while we wait so the bar moves.
    let _wasmPct = 5;
    setLoadingProgress(_wasmPct);
    const _wasmInterval = setInterval(() => {
      _wasmPct = Math.min(_wasmPct + 2, 43);
      setLoadingProgress(_wasmPct);
    }, 200);

    const SQL = await window.initSqlJs({
      locateFile: file =>
        `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/${file}`,
    });
    clearInterval(_wasmInterval);
    setLoadingProgress(45);

    // --- Step 2: Fetch all data files in parallel ---
    setLoadingStatus('Retrieving case files');
    const [schemaSql, seedSql, caseJson, storyJson] = await Promise.all([
      fetch('./data/schema.sql').then(r => { if (!r.ok) throw new Error('schema.sql'); return r.text(); }),
      fetch('./data/seed.sql').then(r   => { if (!r.ok) throw new Error('seed.sql');   return r.text(); }),
      fetch('./data/case.json').then(r  => { if (!r.ok) throw new Error('case.json');  return r.json(); }),
      fetch('./data/story.json').then(r => { if (!r.ok) throw new Error('story.json'); return r.json(); }),
    ]);
    caseData  = caseJson;
    storyData = storyJson;
    setLoadingProgress(70);

    // --- Step 3: Initialise the database ---
    setLoadingStatus('Initialising case file 74/LKS/1147');
    initDatabase(SQL, schemaSql, seedSql);

    // Tell the blocker which flavour messages to use when a query is blocked
    setBlockedMessages(storyData.blockedMessages);
    setLoadingProgress(85);

    // --- Step 4: Build autocomplete schema from live database ---
    // This queries PRAGMA table_info for each table so the editor can suggest
    // table names and column names as the player types.
    const schema = buildAutocompleteSchema();

    // --- Step 5: Load CodeMirror from CDN and mount the editor ---
    // Dynamic import here (not at the top of the file) so the CDN fetch
    // happens as a visible loading step rather than silently blocking init.
    setLoadingStatus('Mounting editor');
    const cmSetup = await import('./codemirror-setup.js');
    getEditorContent = cmSetup.getEditorContent;
    editorView = cmSetup.initEditor(
      document.getElementById('query-editor'),
      schema,
      handleRunQuery,
    );
    setLoadingProgress(95);

    // --- Step 6: Populate static UI panels ---
    initTabs((tab) => {
      if (tab === 'notes') {
        newEntriesSinceView = 0;
        updateNotebookBadge(0);
      }
    });
    populateBriefing(storyData.briefing);
    // confidential_notes is the easter egg — exclude it from the Schema tab.
    // Players discover it by querying sqlite_master directly.
    const publicTables = getTableNames().filter(t => t !== 'confidential_notes');
    populateSchemaDiagram(publicTables);

    // Initial LEADS render — opening leads are visible before any query runs
    refreshLeads();

    // --- Step 7: Restore saved game state (if any) ---
    restoreSavedState();

    // --- Step 8: Wire up event listeners ---
    setupEventListeners();

    // --- Step 9: Show the game ---
    showGame();

  } catch (err) {
    console.error('SQL Noir init failed:', err);
    showLoadingError(
      `Failed to load case files: ${err.message}. Check browser console.`
    );
  }
}

// ============================================================
// QUERY HANDLING
// ============================================================

/**
 * Called by the Run button and the Ctrl+Enter keymap.
 * Checks the query against the blocker, runs it, and renders results.
 */
function handleRunQuery(sqlStr) {
  if (gameOver) return;

  const trimmed = sqlStr.trim();
  if (!trimmed) return;

  // Check for destructive statements before sending to sql.js
  if (isDestructive(trimmed)) {
    renderBlocked(getBlockedMessage());
    return;
  }

  // Run the query and render the result
  try {
    const result = runQuery(trimmed);
    renderResults(result, storyData, /sqlite_master/i.test(trimmed));
    queriesRun++;
    updateQueriesRun(queriesRun);

    // Check whether the results triggered any new notebook entries
    const newClues = checkTriggers(result, foundClueIds);
    if (newClues.length > 0) {
      for (const clue of newClues) {
        foundClues.push(clue);
        foundClueIds.add(clue.id);
        hintsRevealed[clue.id] = 0;
        newEntriesSinceView++;
      }
      updateNotebookBadge(newEntriesSinceView);
      renderNotebook(foundClues, hintsRevealed, handleRevealHint);
      refreshLeads();
    }

    persistState();
  } catch (err) {
    // sql.js throws on syntax errors — show the message in the results panel
    renderError(err.message);
  }
}

/**
 * Reveals the next hint level for a clue.
 * Called by the hint button in the notebook.
 */
function handleRevealHint(clueId) {
  const current = hintsRevealed[clueId] || 0;
  if (current >= 3) return;
  hintsRevealed[clueId] = current + 1;
  hintsUsedTotal++;
  renderNotebook(foundClues, hintsRevealed, handleRevealHint);
  refreshLeads();
  persistState();
}

// Re-renders the LEADS tab and updates its badge to the count of open leads.
function refreshLeads() {
  const visible = getVisibleClues(foundClueIds);
  renderLeads(visible, foundClueIds, hintsRevealed, handleRevealHint);
  const openCount = visible.filter(c => !foundClueIds.has(c.id)).length;
  updateLeadsBadge(openCount);
}

// ============================================================
// EVENT LISTENERS
// ============================================================

function setupEventListeners() {
  // Run button
  document.getElementById('run-btn').addEventListener('click', () => {
    handleRunQuery(getEditorContent(editorView));
  });

  // Open accusation modal
  document.getElementById('accuse-btn').addEventListener('click', openAccusationModal);

  // Close modal: X button and "Not yet" button
  document.getElementById('modal-close').addEventListener('click', closeAccusationModal);
  document.getElementById('cancel-accusation').addEventListener('click', closeAccusationModal);

  // Close modal by clicking the dark overlay background
  document.getElementById('accusation-modal').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeAccusationModal();
  });

  // Submit accusation
  document.getElementById('submit-accusation').addEventListener('click', handleAccusation);
}

// ============================================================
// ACCUSATION MODAL
// ============================================================

function openAccusationModal() {
  if (gameOver) return;
  if (!caseData) return;

  // Populate the suspect dropdown from case.json accusationChoices
  const suspectSelect = document.getElementById('accuse-suspect');
  suspectSelect.innerHTML = '<option value="">— Select a person —</option>';
  for (const id of caseData.accusationChoices.suspects) {
    // Look up the person's name from the people array
    const person = caseData.people.find(p => p.id === id);
    const label  = person ? person.name : id;
    const option = document.createElement('option');
    option.value       = id;
    option.textContent = label;
    suspectSelect.appendChild(option);
  }

  // Populate the weapon dropdown
  const weaponSelect = document.getElementById('accuse-weapon');
  weaponSelect.innerHTML = '<option value="">— Select the method —</option>';
  for (const w of caseData.accusationChoices.weapons) {
    const option = document.createElement('option');
    option.value       = w.id;
    option.textContent = w.label;
    weaponSelect.appendChild(option);
  }

  // Populate the location dropdown
  const locationSelect = document.getElementById('accuse-location');
  locationSelect.innerHTML = '<option value="">— Select the location —</option>';
  for (const l of caseData.accusationChoices.locations) {
    const option = document.createElement('option');
    option.value       = l.id;
    option.textContent = l.label;
    locationSelect.appendChild(option);
  }

  // Update the attempts count inside the modal
  document.getElementById('modal-attempts').textContent = attemptsLeft;

  // Reset feedback from a previous attempt
  const feedback = document.getElementById('accusation-feedback');
  feedback.className = 'accusation-feedback hidden';
  feedback.textContent = '';

  // Show the modal
  document.getElementById('accusation-modal').classList.remove('hidden');
}

function closeAccusationModal() {
  document.getElementById('accusation-modal').classList.add('hidden');
}

function handleAccusation() {
  const suspectId  = document.getElementById('accuse-suspect').value;
  const weaponId   = document.getElementById('accuse-weapon').value;
  const locationId = document.getElementById('accuse-location').value;

  // Require all three fields
  if (!suspectId || !weaponId || !locationId) {
    showAccusationFeedback('Select a person, a method, and a location.', 'wrong');
    return;
  }

  const solution = caseData.solution;
  const correct  =
    suspectId  === solution.killerId   &&
    weaponId   === solution.weapon     &&
    locationId === solution.locationId;

  if (correct) {
    // Correct accusation — show success, then the ending
    showAccusationFeedback(storyData.accusationMessages.correct, 'correct');
    gameOver = true;
    clearState(caseData.caseVersion);
    setTimeout(() => {
      closeAccusationModal();
      const { endingKey, endingTitle } = selectEnding();
      const epilogue = storyData.endingEpilogue[endingKey];
      const rank     = getDetectiveRank(queriesRun, hintsUsedTotal, attemptsLeft);
      const score    = buildScore(endingKey, rank);
      showEndingScreen(endingTitle, epilogue, rank, score);
    }, 1800);

  } else {
    // Wrong accusation
    attemptsLeft--;
    updateAttemptsLeft(attemptsLeft);
    document.getElementById('modal-attempts').textContent = attemptsLeft;

    if (attemptsLeft <= 0) {
      showAccusationFeedback(storyData.accusationMessages.wrongFinal, 'gameover');
      gameOver = true;
      clearState(caseData.caseVersion);
      setTimeout(() => {
        closeAccusationModal();
        showEndingScreen(
          'Case Closed — Unsolved',
          'Three wrong accusations. The file is referred to another division.\n\nThe Superintendent is not pleased. The case goes cold.',
          'Recruit',
          null
        );
      }, 2000);
    } else {
      const msg = storyData.accusationMessages.wrong
        .replace('{remaining}', attemptsLeft);
      showAccusationFeedback(msg, 'wrong');
    }
  }
}

function showAccusationFeedback(message, type) {
  const el = document.getElementById('accusation-feedback');
  el.textContent = message;
  el.className   = `accusation-feedback ${type}`;
}

// ============================================================
// SAVE STATE
// ============================================================

function persistState() {
  if (!caseData || gameOver) return;
  saveState(caseData.caseVersion, {
    queriesRun,
    attemptsLeft,
    hintsUsedTotal,
    newEntriesSinceView,
    foundClueIds:  [...foundClueIds],
    hintsRevealed,
  });
}

function restoreSavedState() {
  if (!caseData) return;
  const saved = loadState(caseData.caseVersion);
  if (!saved) return;

  queriesRun          = saved.queriesRun          || 0;
  attemptsLeft        = saved.attemptsLeft        ?? 3;
  hintsUsedTotal      = saved.hintsUsedTotal      || 0;
  newEntriesSinceView = saved.newEntriesSinceView || 0;
  hintsRevealed       = saved.hintsRevealed       || {};

  // Rebuild foundClues array and foundClueIds Set from saved IDs
  const savedIds = saved.foundClueIds || [];
  for (const id of savedIds) {
    const clue = CLUES.find(c => c.id === id);
    if (clue && !foundClueIds.has(id)) {
      foundClues.push(clue);
      foundClueIds.add(id);
    }
  }

  // Sync UI with restored state
  updateQueriesRun(queriesRun);
  updateAttemptsLeft(attemptsLeft);
  if (newEntriesSinceView > 0) updateNotebookBadge(newEntriesSinceView);
  if (foundClues.length > 0) renderNotebook(foundClues, hintsRevealed, handleRevealHint);
  refreshLeads();
}

// ============================================================
// ENDING SELECTION
// ============================================================

/**
 * Picks which epilogue to show based on which side threads the player uncovered.
 *
 * Priority (highest first):
 *   1. whole_truth     — Chanda connection discovered (political fallout)
 *   2. justice_with_mercy — full blackmail chain documented
 *   3. open_and_shut   — basic solve
 */
function selectEnding() {
  const chandaFound    = foundClueIds.has('chanda_calls');
  const blackmailFull  = foundClueIds.has('blackmail_note') && foundClueIds.has('bank_blackmail');

  if (chandaFound) {
    return { endingKey: 'whole_truth', endingTitle: 'The Whole Truth' };
  }
  if (blackmailFull) {
    return { endingKey: 'justice_with_mercy', endingTitle: 'Justice with Mercy' };
  }
  return { endingKey: 'open_and_shut', endingTitle: 'Open and Shut' };
}

// ============================================================
// SCORING AND SHARE CODE
// ============================================================

/**
 * Builds the score summary object and generates a share code.
 */
function buildScore(endingKey, rank) {
  const payload = {
    v: caseData.caseVersion,
    e: endingKey,
    q: queriesRun,
    h: hintsUsedTotal,
    c: foundClues.length,
    a: attemptsLeft,
  };
  // btoa is safe here — all values are ASCII
  const shareCode = btoa(JSON.stringify(payload));

  return {
    queriesRun,
    hintsUsed:   hintsUsedTotal,
    cluesFound:  foundClues.length,
    totalClues:  12,
    attemptsLeft,
    shareCode,
  };
}



/**
 * Assigns a detective rank based on performance.
 * Milestone 1 stub: just uses queries run and attempts remaining.
 * Later milestones will factor in hints used, side threads, time taken.
 *
 * @returns {string} rank label from story.json
 */
function getDetectiveRank(queries, hintsUsed, remainingAttempts) {
  const cluesFound = foundClues.length;
  const score = Math.min(queries * 4, 200)
    + (remainingAttempts * 40)
    + (cluesFound * 5)
    - (hintsUsed * 10);
  const ranks = storyData.rankLabels;

  // Find the highest rank whose minScore is <= our score
  let rank = ranks[0];
  for (const r of ranks) {
    if (score >= r.minScore) rank = r;
  }
  return rank.label;
}

// ============================================================
// START
// ============================================================

init();
