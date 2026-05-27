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
| `js/main.js` | Init sequence, event wiring, app state (queriesRun, attemptsLeft, gameOver), accusation logic, scoring |
| `js/db.js` | sql.js wrapper only — `initDatabase`, `runQuery`, `getTableNames`, `buildAutocompleteSchema` |
| `js/blocker.js` | Destructive SQL detection (`isDestructive`) and rotating flavour messages |
| `js/ui.js` | All DOM manipulation — renders results, errors, blocked messages, loading screen, schema list, ending screen |
| `js/codemirror-setup.js` | CodeMirror 6 editor init only — mounts editor, wires Ctrl+Enter, exposes `getEditorContent`/`setEditorContent` |

### CDN dependencies (no local install)

- **sql.js 1.10.2** — loaded as `<script>` in `index.html`, puts `initSqlJs` on `window`. WASM file fetched from cdnjs at runtime via `locateFile`.
- **CodeMirror 6** — loaded as ES modules via esm.sh. An import map in `index.html` maps bare specifiers (`'codemirror'`, `'@codemirror/lang-sql'`, etc.) to CDN URLs. Shared packages (`@codemirror/state`, `@codemirror/view`) are pinned in the import map to guarantee a single module instance is shared between `codemirror` and `@codemirror/lang-sql`.

### Separation of content from code

- **All narrative text** (briefing, blocked-SQL messages, ending epilogues, rank labels) lives in `data/story.json`. No player-visible strings belong in JS files.
- **All case content** (people, addresses, solution, accusation choices) lives in `data/case.json`. Character names, occupations, and notes are all cosmetically editable there without touching code.
- **The confidential_notes table** is the easter egg. It is defined in `schema.sql` and seeded (in future milestones) but is explicitly filtered out of the Schema tab in `main.js`. Players find it by querying `sqlite_master`.

### CSS structure

Five files, each with a single concern: `reset` → `theme` (CSS variables + grain/scanlines) → `loading` → `layout` (grid skeleton) → `components` (every interactive element). The load order in `index.html` matters — later files override earlier ones.

### Accusation mechanic

Three attempts total. `attemptsLeft` lives in `main.js`. A correct accusation compares `suspectId + weaponId + locationId` against `caseData.solution`. Future milestones add branching endings: check `sideThreads` state before calling `showEndingScreen` to pick which epilogue from `storyData.endingEpilogue` to show.

## Adding content (Milestone 2+)

**Add a new table with data:**
1. Add `CREATE TABLE IF NOT EXISTS your_table (...)` to `data/schema.sql`.
2. Add `"your_table": [{ ... }, ...]` to `data/case.json`.
3. Add `'your_table'` to `TABLE_ORDER` in `scripts/build-seed.js`.
4. Run `node scripts/build-seed.js`.

**Add a new hint/clue:** Add to the `"clues"` array in `case.json`. Wire reveal logic into `js/hints.js` (not yet created).

**Add a new ending:** Add an epilogue key to `storyData.endingEpilogue` in `story.json`, add the trigger condition to the accusation handler in `main.js`.
