export type SaveStats = {
  bestKills: number;
  bestSurvivalSec: number;
  victories: number;
  runsPlayed: number;
};

export type GameSettings = {
  volume: number;
  muted: boolean;
  reduceFlashing: boolean;
  reduceScreenShake: boolean;
};

export type SaveData = {
  stats: SaveStats;
  settings: GameSettings;
};

export function createDefaultSaveData(): SaveData {
  return {
    stats: {
      bestKills: 0,
      bestSurvivalSec: 0,
      victories: 0,
      runsPlayed: 0,
    },
    settings: {
      volume: 0.7,
      muted: false,
      reduceFlashing: false,
      reduceScreenShake: false,
    },
  };
}

function toNonNegInt(value: unknown, fallback = 0): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.max(0, Math.floor(value));
}

function toClampedVolume(value: unknown, fallback = 0.7): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(1, Math.max(0, value));
}

function toBool(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

export function parseSaveData(rawJson: string | null | undefined): SaveData {
  const defaults = createDefaultSaveData();
  if (!rawJson || typeof rawJson !== 'string') return defaults;

  try {
    const parsed: unknown = JSON.parse(rawJson);
    if (!parsed || typeof parsed !== 'object') return defaults;

    const obj = parsed as Record<string, unknown>;
    const rawStats =
      obj.stats && typeof obj.stats === 'object' ? (obj.stats as Record<string, unknown>) : {};
    const rawSettings =
      obj.settings && typeof obj.settings === 'object'
        ? (obj.settings as Record<string, unknown>)
        : {};

    return {
      stats: {
        bestKills: toNonNegInt(rawStats.bestKills, defaults.stats.bestKills),
        bestSurvivalSec: toNonNegInt(rawStats.bestSurvivalSec, defaults.stats.bestSurvivalSec),
        victories: toNonNegInt(rawStats.victories, defaults.stats.victories),
        runsPlayed: toNonNegInt(rawStats.runsPlayed, defaults.stats.runsPlayed),
      },
      settings: {
        volume: toClampedVolume(rawSettings.volume, defaults.settings.volume),
        muted: toBool(rawSettings.muted, defaults.settings.muted),
        reduceFlashing: toBool(rawSettings.reduceFlashing, defaults.settings.reduceFlashing),
        reduceScreenShake: toBool(
          rawSettings.reduceScreenShake,
          defaults.settings.reduceScreenShake
        ),
      },
    };
  } catch {
    return defaults;
  }
}

export function recordRunResult(
  current: SaveData,
  result: { kills: number; survivalSec: number; victory: boolean }
): SaveData {
  const kills = toNonNegInt(result.kills, 0);
  const survivalSec = toNonNegInt(result.survivalSec, 0);
  return {
    stats: {
      bestKills: Math.max(current.stats.bestKills, kills),
      bestSurvivalSec: Math.max(current.stats.bestSurvivalSec, survivalSec),
      victories: current.stats.victories + (result.victory ? 1 : 0),
      runsPlayed: current.stats.runsPlayed + 1,
    },
    settings: { ...current.settings },
  };
}
