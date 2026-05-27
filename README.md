# SQL Noir

**A murder mystery solved with SQL. Lusaka, Zambia — 1974.**

You are a CID detective. Victor Kasonde — lead guitarist, Broken String — was found strangled in an alley. The precinct database is yours. Write queries, follow the evidence, file an accusation.

→ Open `index.html` to play. No install, no build step.

---

## How to run locally

1. **Clone or download** this repository.
2. Open `index.html` in **Chrome, Edge, or Firefox** (a modern browser that supports ES modules and import maps).

> **Tip:** Because the game fetches `schema.sql`, `seed.sql`, and the JSON files with `fetch()`, you may need to serve it from a local server rather than opening the file directly — some browsers block `fetch()` on `file://` URLs.
>
> The easiest option:
> ```
> npx serve .
> ```
> Then open `http://localhost:3000` in your browser.
>
> Alternatively, in VS Code: right-click `index.html` → **Open with Live Server**.

The first load fetches ~1 MB of WebAssembly (sql.js). After that it runs entirely in your browser — no network required.

---

## How to deploy

### GitHub Pages
1. Push the repository to GitHub.
2. Go to **Settings → Pages → Source → main branch / root**.
3. Done. GitHub Pages serves static files directly — no configuration needed.

### Vercel
1. Import the repository in the Vercel dashboard.
2. Set **Framework Preset → Other** (no build command, no output directory).
3. Deploy. Every push auto-deploys.

All paths in the game are relative (`./data/schema.sql`, `./css/theme.css`), so it works identically locally, on GitHub Pages, and on Vercel.

---

## How to edit the case

### Change a suspect's name or add a note

Edit `data/case.json`. Find the person in the `"people"` array and update their `name`, `alias`, `occupation`, or `notes` field.

Then regenerate `seed.sql`:
```
node scripts/build-seed.js
```

That's it. Refresh the browser.

### Add a new character

1. Add a new object to the `"people"` array in `case.json` following the same shape as existing entries.
2. If they have an address, add a corresponding entry to `"addresses"`.
3. Run `node scripts/build-seed.js`.

### Add a new clue table (e.g. phone_calls)

1. Add the CREATE TABLE statement to `data/schema.sql`.
2. Add the table's data array to `case.json` (e.g. `"phone_calls": [...]`).
3. Add `'phone_calls'` to the `TABLE_ORDER` array in `scripts/build-seed.js`.
4. Run `node scripts/build-seed.js`.

### Change the opening briefing

Edit the `"briefing"` string in `data/story.json`. Line breaks (`\n`) are preserved — the CSS uses `white-space: pre-wrap`.

### Change the "tampering with evidence" messages

Edit the `"blockedMessages"` array in `data/story.json`. Add, remove, or change any of them.

### Change an ending epilogue

Edit the relevant key in `"endingEpilogue"` inside `data/story.json`.

---

## File structure

```
index.html            — open this to play
css/
  reset.css           — baseline resets
  theme.css           — colours, fonts, grain/scanline effects
  loading.css         — loading splash screen
  layout.css          — header / two-panel / footer structure
  components.css      — tabs, buttons, result table, modal, etc.
js/
  main.js             — entry point: init sequence, event wiring
  db.js               — sql.js wrapper (query execution, schema)
  blocker.js          — destructive SQL detection
  ui.js               — all DOM rendering
  codemirror-setup.js — CodeMirror 6 editor and autocomplete
data/
  schema.sql          — all table definitions (hand-edit to add tables)
  seed.sql            — GENERATED — do not edit directly
  case.json           — single source of truth for all case content
  story.json          — all narrative text and UI copy
scripts/
  build-seed.js       — Node script: case.json → seed.sql
```

---

## ⚠️ SPOILER WARNING

Everything below this line contains case details, including the identity of the killer.

---
---
---
---
---

## Case details (spoilers)

**Victim:** Victor "Vic" Kasonde, 27, lead guitarist, Broken String.

**Killer:** Grace Mwape. Co-owner of The Copperbelt Room. She managed the accounts and had been embezzling (6,500 kwacha over two years). Victor discovered both the embezzlement and her affair with Bernard Chanda (senior NCCM official). He was blackmailing her at 50 kwacha/month. She strangled him in the rear alley with a guitar E-string during his 22:15 break.

**Correct accusation:** Grace Mwape / Guitar E-string wire / Alley behind The Copperbelt Room.

**Red herrings:**
- Solomon Musonda: had a debt claim (500K), resolved day of murder. Alibi: Livingstone phone calls.
- Patrick Kabwe: stolen composition dispute. Alibi: Ridgeway Lounge booking.
- Agnes Lungu: jealousy (Victor's secret meetings). Alibi: UNZA Nice with her cousin.
- Choolwe Mutale: unpaid commission dispute. Alibi: Ridgeway Hotel dinner.

**Side threads (not yet implemented — Milestone 2+):**
- The Mwale Disappearance (1972 cold case)
- The Chanda Connection (political scandal, unlocks "The Whole Truth" ending)

**Easter egg:** `confidential_notes` table — discoverable by querying `sqlite_master`. Contains memos about Detective Inspector Francis Bwalya taking kickbacks from the Patel Brothers (Kamwala market), completely unrelated to the main case.

---

## Known limitations (Milestone 1)

- Only the `people` and `addresses` tables are seeded. Other tables exist but are empty — queries on them return no results.
- Hints system: not yet implemented.
- Notebook: not yet implemented.
- Side threads: defined in the case design but not yet wired into the game logic.
- Branching endings: only "Open and Shut" is active. The ending text is a stub.
- Scoring and share codes: not yet implemented.
- Save state (localStorage): not yet implemented.

## Easy tweaks to try next

1. **Seed more tables** — add `phone_calls`, `interviews`, and `bank_records` data to `case.json`, update `build-seed.js`, and the Schema tab will show them immediately.
2. **Rename any suspect to a teammate** — change the `name` field in `case.json`, run the build script, refresh.
3. **Add a new blocked-SQL message** — add a string to `blockedMessages` in `story.json`. No code change needed.
4. **Adjust the row cap** — change `ROW_CAP = 20` in `js/ui.js` to any number.
5. **Change the starter query** — edit the `doc:` line in `js/codemirror-setup.js` to pre-fill a different query when the game loads.
