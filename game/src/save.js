// Save / load through localStorage: money, mission progress, best score and
// the player's last spot. Nothing leaves the browser.
import { SAVE_KEY, BEST_KEY } from './config.js';

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function writeSave(data) {
  try { window.localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch { /* private mode */ }
}

export function readBest() {
  try { return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0; }
  catch { return 0; }
}

export function writeBest(value) {
  try { window.localStorage.setItem(BEST_KEY, String(value)); } catch { /* private mode */ }
}
