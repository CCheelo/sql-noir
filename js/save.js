// save.js — localStorage save state, keyed by caseVersion.
//
// Only persists mid-game progress. When a game ends (correct accusation or
// all attempts used), the save is cleared so a fresh game starts next time.

const STORAGE_KEY_PREFIX = 'sql-noir-save-';

/**
 * Saves current game state to localStorage.
 *
 * @param {string} caseVersion
 * @param {object} state
 */
export function saveState(caseVersion, state) {
  try {
    const key = STORAGE_KEY_PREFIX + caseVersion;
    localStorage.setItem(key, JSON.stringify(state));
  } catch {
    // localStorage may be unavailable (private browsing, quota exceeded)
  }
}

/**
 * Loads a saved state for the given caseVersion.
 * Returns null if no matching save exists.
 *
 * @param {string} caseVersion
 * @returns {object|null}
 */
export function loadState(caseVersion) {
  try {
    const key = STORAGE_KEY_PREFIX + caseVersion;
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Clears the saved state for a given caseVersion.
 * Called when the game ends so the next visit starts fresh.
 *
 * @param {string} caseVersion
 */
export function clearState(caseVersion) {
  try {
    localStorage.removeItem(STORAGE_KEY_PREFIX + caseVersion);
  } catch {
    // ignore
  }
}
