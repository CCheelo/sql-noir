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
  showLoadingScreen, setLoadingProgress, showGame, showLoadingError,
  initTabs, populateSchemaList, populateBriefing,
  renderResults, renderError, renderBlocked,
  updateQueriesRun, updateAttemptsLeft, showEndingScreen,
} from './ui.js';
import { initEditor, getEditorContent } from './codemirror-setup.js';

// ============================================================
// STATE
// ============================================================

let queriesRun    = 0;
let attemptsLeft  = 3;
let caseData      = null;  // parsed case.json
let storyData     = null;  // parsed story.json
let editorView    = null;  // CodeMirror EditorView instance
let gameOver      = false;

// ============================================================
// INIT
// ============================================================

async function init() {
  showLoadingScreen();
  setLoadingProgress(10);

  try {
    // --- Step 1: Load sql.js ---
    // initSqlJs is a global set by the sql-wasm.js <script> tag in index.html.
    // locateFile tells sql.js where to download the companion .wasm file from.
    const SQL = await window.initSqlJs({
      locateFile: file =>
        `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/${file}`,
    });
    setLoadingProgress(45);

    // --- Step 2: Fetch all data files in parallel ---
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
    initDatabase(SQL, schemaSql, seedSql);

    // Tell the blocker which flavour messages to use when a query is blocked
    setBlockedMessages(storyData.blockedMessages);
    setLoadingProgress(85);

    // --- Step 4: Build autocomplete schema from live database ---
    // This queries PRAGMA table_info for each table so the editor can suggest
    // table names and column names as the player types.
    const schema = buildAutocompleteSchema();

    // --- Step 5: Mount the CodeMirror editor ---
    editorView = initEditor(
      document.getElementById('query-editor'),
      schema,
      handleRunQuery, // called when the player presses Ctrl+Enter or Run
    );
    setLoadingProgress(95);

    // --- Step 6: Populate static UI panels ---
    initTabs();
    populateBriefing(storyData.briefing);
    // confidential_notes is the easter egg — exclude it from the Schema tab.
    // Players discover it by querying sqlite_master directly.
    const publicTables = getTableNames().filter(t => t !== 'confidential_notes');
    populateSchemaList(publicTables);

    // --- Step 7: Wire up event listeners ---
    setupEventListeners();

    // --- Step 8: Show the game ---
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
    renderResults(result, storyData);
    queriesRun++;
    updateQueriesRun(queriesRun);
  } catch (err) {
    // sql.js throws on syntax errors — show the message in the results panel
    renderError(err.message);
  }
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
    setTimeout(() => {
      closeAccusationModal();
      // For Milestone 1 there is one stub ending.
      // Future milestones will branch based on side threads found.
      const epilogue = storyData.endingEpilogue.open_and_shut;
      const rank     = getDetectiveRank(queriesRun, 0, attemptsLeft);
      showEndingScreen('Open and Shut', epilogue, rank);
    }, 1800);

  } else {
    // Wrong accusation
    attemptsLeft--;
    updateAttemptsLeft(attemptsLeft);
    document.getElementById('modal-attempts').textContent = attemptsLeft;

    if (attemptsLeft <= 0) {
      showAccusationFeedback(storyData.accusationMessages.wrongFinal, 'gameover');
      gameOver = true;
      setTimeout(() => {
        closeAccusationModal();
        showEndingScreen(
          'Case Closed — Unsolved',
          'Three wrong accusations. The file is referred to another division.\n\nThe Superintendent is not pleased. The case goes cold.',
          'Recruit'
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
// SCORING
// ============================================================

/**
 * Assigns a detective rank based on performance.
 * Milestone 1 stub: just uses queries run and attempts remaining.
 * Later milestones will factor in hints used, side threads, time taken.
 *
 * @returns {string} rank label from story.json
 */
function getDetectiveRank(queries, hintsUsed, remainingAttempts) {
  // More queries = more exploration = higher base score
  // Remaining attempts = didn't guess wildly
  const score = Math.min(queries * 4, 200) + (remainingAttempts * 40);
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
