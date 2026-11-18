import {
  createDefaultSaveData,
  parseSaveData,
  recordRunResult,
  type GameSettings,
  type SaveData,
} from '../../domain/storageSchema';

export const SAVE_STORAGE_KEY = 'anime-survivor-save-v1';

let memoryFallback: SaveData = createDefaultSaveData();
let cachedSave: SaveData | null = null;

export function loadSaveData(): SaveData {
  if (cachedSave) return cachedSave;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(SAVE_STORAGE_KEY);
      const parsed = parseSaveData(raw);
      memoryFallback = parsed;
      cachedSave = parsed;
      return parsed;
    }
  } catch {
    cachedSave = parseSaveData(JSON.stringify(memoryFallback));
    return cachedSave;
  }
  cachedSave = parseSaveData(JSON.stringify(memoryFallback));
  return cachedSave;
}

export function saveSaveData(data: SaveData): void {
  const sanitized = parseSaveData(JSON.stringify(data));
  memoryFallback = sanitized;
  cachedSave = sanitized;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(sanitized));
    }
  } catch {
    memoryFallback = sanitized;
  }
}

export function updateSettings(patch: Partial<GameSettings>): SaveData {
  const current = loadSaveData();
  const next: SaveData = parseSaveData(
    JSON.stringify({
      stats: current.stats,
      settings: {
        ...current.settings,
        ...patch,
      },
    })
  );
  saveSaveData(next);
  return next;
}

export function saveRunResult(result: {
  kills: number;
  survivalSec: number;
  victory: boolean;
}): SaveData {
  const current = loadSaveData();
  const next = recordRunResult(current, result);
  saveSaveData(next);
  return next;
}

export const StorageSystem = {
  loadSaveData,
  saveSaveData,
  updateSettings,
  saveRunResult,
};
