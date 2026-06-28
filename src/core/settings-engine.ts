// Settings Engine — single source of truth for all feature flags.
// Reads/writes chrome.storage.local and notifies listeners on change.

import { Settings, DEFAULT_SETTINGS } from './types';

type Listener = (settings: Settings) => void;

let current: Settings = { ...DEFAULT_SETTINGS };
const listeners = new Set<Listener>();

export async function loadSettings(): Promise<Settings> {
  return new Promise(resolve => {
    chrome.storage.local.get('mfm_settings', result => {
      current = { ...DEFAULT_SETTINGS, ...(result.mfm_settings || {}) };
      resolve(current);
    });
  });
}

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  current = { ...current, ...patch };
  return new Promise(resolve => {
    chrome.storage.local.set({ mfm_settings: current }, () => {
      listeners.forEach(fn => fn(current));
      resolve(current);
    });
  });
}

export function getSettings(): Settings {
  return current;
}

export function onSettingsChange(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
