# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the game

The game has no build step at runtime. It requires a local HTTP server because `fetch()` is blocked on `file://` URLs:

```bash
npx serve .
# then open http://localhost:3000
```

Or use VS Code Live Server (right-click `index.html` → Open with Live Server).

## The one build step that does exist

Whenever `data/case.json` changes, regenerate `data/seed.sql`:

```bash
node scripts/build-seed.js
```

**Never hand-edit `seed.sql`** — it is fully generated. All case data lives in `case.json`.

> **Windows note:** If `node` is not in PATH, use the Playwright-bundled binary:
> ```
> C:\Users\hp\AppData\Local\ms-playwright-go\1.50.1\node.exe scripts\build-seed.js
> ```

## Architecture

### Data flow

```
data/case.json  ──► scripts/build-seed.js ──► data/seed.sql
                                                    │
data/schema.sql ─────────────────────────────────► db.js (runtime)
                                                    │
data/story.json ──────────────────────────────► main.js ──► ui.js
data/case.json  ──────────────────────────────► main.js
```

At runtime, `main.js` fetches all four data files in parallel, initialises the sql.js in-memory database with `schema.sql` + `seed.sql`, then builds the CodeMirror autocomplete schema from the live database.

### Module responsibilities

| File | Owns |
|---|---|
| `js/main.js` | Init, event wiring, app state, accusation, scoring, ending selection, save/restore |
| `js/db.js` | sql.js wrapper — `initDatabase`, `runQuery`, `getTableNames`, `buildAutocompleteSchema` |
| `js/blocker.js` | Destructive SQL detection and rotating flavour messages |
| `js/hints.js` | 12 clue definitions (trigger regex, notebook text, 3-level hints), `checkTriggers()` |
| `js/save.js` | `saveState` / `loadState` / `clearState` — localStorage keyed by caseVersion |
| `js/ui.js` | All DOM manipulation — results, errors, loading, schema list, notebook tab, ending screen |
| `js/codemirror-setup.js` | CodeMirror 6 editor only — mounts, wires Ctrl+Enter, exposes `getEditorContent` |

### CDN dependencies (no local install)

- **sql.js 1.10.2** — loaded as `<script>` in `index.html`, puts `initSqlJs` on `window`. WASM file fetched from cdnjs at runtime via `locateFile`.
- **CodeMirror 6** — loaded as ES modules via esm.sh. An import map in `index.html` maps bare specifiers (`'codemirror'`, `'@codemirror/lang-sql'`, etc.) to CDN URLs. Shared packages (`@codemirror/state`, `@codemirror/view`) are pinned in the import map to guarantee a single module instance is shared between `codemirror` and `@codemirror/lang-sql`.

### Separation of content from code

- **All narrative text** (briefing, blocked-SQL messages, ending epilogues, rank labels) lives in `data/story.json`. No player-visible strings belong in JS files.
- **All case content** (people, addresses, solution, accusation choices) lives in `data/case.json`. Character names, occupations, and notes are all cosmetically editable there without touching code.
- **The confidential_notes table** is the easter egg. It is defined in `schema.sql` and seeded with 4 rows (DI Bwalya kickback memos, 1974), but explicitly filtered out of the Schema tab in `main.js`. Players find it by querying `sqlite_master`.

### CSS structure

Five files, each with a single concern: `reset` → `theme` (CSS variables + grain/scanlines) → `loading` → `layout` (grid skeleton) → `components` (every interactive element). The load order in `index.html` matters — later files override earlier ones.

### Accusation mechanic

Three attempts total. `attemptsLeft` in `main.js`. Correct accusation compares `suspectId + weaponId + locationId` against `caseData.solution`.

### Ending selection (`selectEnding()` in main.js)

Priority:
1. **The Whole Truth** — `chanda_calls` clue in `foundClueIds`
2. **Justice with Mercy** — `blackmail_note` AND `bank_blackmail` both found
3. **Open and Shut** — default

All epilogue text lives in `data/story.json` under `endingEpilogue`.

### Notebook / hints

`js/hints.js` holds the 12 clue definitions. Each has a `triggerPattern` RegExp that fires when any cell value in a query result matches. When triggered, the clue's `notebookEntry` text appears in the NOTES tab. Players can then reveal up to 3 progressive hints per clue.

Clue IDs (in definition order): `missing_estring`, `blackmail_note`, `bouncer_paid`, `woman_corridor`, `grace_movement`, `grace_lies`, `bank_blackmail`, `embezzlement`, `chanda_calls`, `musonda_alibi`, `chanda_vehicle`, `mwale_cold_case`.

### Save state

`js/save.js` persists to `localStorage` after every query and hint reveal, keyed as `sql-noir-save-{caseVersion}`. Cleared on game over (correct accusation or all attempts used). Changing `caseVersion` in `case.json` automatically invalidates old saves.

### Scoring

`getDetectiveRank()` in `main.js`: `score = min(queriesRun × 4, 200) + (attemptsLeft × 40) + (cluesFound × 5) − (hintsUsed × 10)`. Thresholds: Recruit ≥ 0, Constable ≥ 80, Inspector ≥ 200, Superintendent ≥ 380 (from `rankLabels` in `story.json`).

### GitHub repository

https://github.com/CCheelo/sql-noir

## Adding content

**New table:**
1. Add `CREATE TABLE IF NOT EXISTS your_table (...)` to `data/schema.sql`.
2. Add `"your_table": [...]` to `data/case.json`.
3. Add `'your_table'` to `TABLE_ORDER` in `scripts/build-seed.js`.
4. Run `node scripts/build-seed.js`.

**New clue:** Add an object to the `CLUES` array in `js/hints.js` with `id`, `label`, `triggerPattern`, `notebookEntry`, and `hints` (array of 3 strings).

**New ending:** Add a key to `storyData.endingEpilogue` in `story.json`, then add the trigger condition to `selectEnding()` in `main.js`.
