// codemirror-setup.js — creates the CodeMirror 6 editor with SQL support.
//
// CodeMirror 6 is modular: you compose features by adding "extensions".
// We use:
//   - basicSetup: line numbers, bracket matching, undo/redo, etc.
//   - sql({ dialect: SQLite, schema }): SQL syntax highlighting + autocomplete
//   - EditorView.theme(): visual styling to match our noir palette
//   - keymap: Ctrl+Enter shortcut to run the query
//
// The import map in index.html tells the browser where to find each module
// (from the esm.sh CDN). We import only what we need here.

import { EditorView, basicSetup, keymap } from 'codemirror';
import { EditorState }                    from '@codemirror/state';
import { sql, SQLite }                    from '@codemirror/lang-sql';

/**
 * Mounts a CodeMirror editor into `element`.
 *
 * @param {HTMLElement} element  - the container div (empty)
 * @param {object}      schema   - { tableName: ['col1', 'col2'], ... }
 *                                 used for SQL autocomplete suggestions
 * @param {Function}    onRun    - called with the SQL string when the user
 *                                 presses Run or Ctrl+Enter
 * @returns {EditorView}  the editor instance (keep it to read content later)
 */
export function initEditor(element, schema, onRun) {
  const extensions = [
    basicSetup,

    // SQL language support: syntax highlighting + autocomplete.
    // `schema` tells the extension which tables and columns exist so it
    // can suggest them as the player types.
    sql({ dialect: SQLite, schema }),

    // Visual theme — overrides CodeMirror's default light styling to match
    // our dark amber palette. Only structural styles go here; syntax colours
    // are handled by CodeMirror's default highlight theme.
    EditorView.theme({
      '&': {
        backgroundColor: 'transparent',
        color:           'var(--text-primary)',
        fontSize:        'var(--text-base)',
        fontFamily:      'var(--font-mono)',
        height:          '100%',
      },
      '.cm-content': {
        padding:    '12px 8px',
        caretColor: 'var(--accent)',
      },
      '.cm-cursor': {
        borderLeftColor: 'var(--accent)',
      },
      // Text selection background
      '.cm-selectionBackground, ::selection': {
        backgroundColor: 'rgba(212, 168, 67, 0.2) !important',
      },
      '&.cm-focused .cm-selectionBackground': {
        backgroundColor: 'rgba(212, 168, 67, 0.25) !important',
      },
      // Highlight the line the cursor is on
      '.cm-activeLine': {
        backgroundColor: 'rgba(200, 168, 75, 0.05)',
      },
      // Line-number gutter
      '.cm-gutters': {
        backgroundColor: 'var(--panel)',
        color:           'var(--text-dim)',
        border:          'none',
        borderRight:     '1px solid var(--border)',
      },
      '.cm-activeLineGutter': {
        backgroundColor: 'rgba(200, 168, 75, 0.05)',
        color:           'var(--text-secondary)',
      },
      // Autocomplete popup
      '.cm-tooltip': {
        backgroundColor: 'var(--panel-raised)',
        border:          '1px solid var(--border)',
        color:           'var(--text-primary)',
      },
      '.cm-tooltip-autocomplete ul': {
        fontFamily: 'var(--font-mono)',
        fontSize:   'var(--text-sm)',
      },
      '.cm-tooltip-autocomplete ul li[aria-selected]': {
        backgroundColor: 'var(--border)',
        color:           'var(--text-bright)',
      },
      // Make the editor scrollbar match the theme
      '.cm-scroller': {
        overflowY: 'auto',
      },
    }, { dark: true }),

    // Keyboard shortcut: Ctrl+Enter (or Cmd+Enter on Mac) runs the query.
    // Returning `true` tells CodeMirror the event was handled (stops propagation).
    keymap.of([
      {
        key:  'Ctrl-Enter',
        mac:  'Cmd-Enter',
        run:  (view) => {
          onRun(view.state.doc.toString());
          return true;
        },
      },
    ]),
  ];

  const state = EditorState.create({
    // Starter query — gives the player an immediate win on first load
    doc: 'SELECT name, alias, occupation\nFROM people\nORDER BY name;',
    extensions,
  });

  return new EditorView({ state, parent: element });
}

/**
 * Returns the current text content of the editor.
 * @param {EditorView} view
 * @returns {string}
 */
export function getEditorContent(view) {
  return view.state.doc.toString();
}

/**
 * Replaces the editor content (e.g. to set an example query from a hint).
 * @param {EditorView} view
 * @param {string}     text
 */
export function setEditorContent(view, text) {
  view.dispatch({
    changes: { from: 0, to: view.state.doc.length, insert: text },
  });
}
