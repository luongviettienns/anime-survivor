import { describe, expect, it } from 'vitest';
import {
  createDefaultSaveData,
  parseSaveData,
  recordRunResult,
} from '../src/domain/storageSchema';

describe('storageSchema', () => {
  it('creates clean default save data', () => {
    const def = createDefaultSaveData();
    expect(def).toEqual({
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
    });
  });

  it('safely falls back to default save data on null, undefined, or corrupted JSON', () => {
    expect(parseSaveData(null)).toEqual(createDefaultSaveData());
    expect(parseSaveData(undefined)).toEqual(createDefaultSaveData());
    expect(parseSaveData('')).toEqual(createDefaultSaveData());
    expect(parseSaveData('{corrupted-json')).toEqual(createDefaultSaveData());
    expect(parseSaveData('42')).toEqual(createDefaultSaveData());
  });

  it('clamps volume and sanitizes negative or non-numeric stats and boolean settings', () => {
    const raw = JSON.stringify({
      stats: {
        bestKills: -10,
        bestSurvivalSec: 125.9,
        victories: 'invalid',
        runsPlayed: 4,
      },
      settings: {
        volume: 2.5,
        muted: true,
        reduceFlashing: 'yes',
        reduceScreenShake: true,
      },
    });
    const parsed = parseSaveData(raw);
    expect(parsed.stats).toEqual({
      bestKills: 0,
      bestSurvivalSec: 125,
      victories: 0,
      runsPlayed: 4,
    });
    expect(parsed.settings).toEqual({
      volume: 1,
      muted: true,
      reduceFlashing: false,
      reduceScreenShake: true,
    });

    const lowVol = parseSaveData(JSON.stringify({ settings: { volume: -0.5 } }));
    expect(lowVol.settings.volume).toBe(0);
  });

  it('records run results, updating bestKills, bestSurvivalSec, victories, and runsPlayed immutably', () => {
    const initial = createDefaultSaveData();
    const afterLoss = recordRunResult(initial, {
      kills: 42,
      survivalSec: 95.8,
      victory: false,
    });

    expect(afterLoss.stats).toEqual({
      bestKills: 42,
      bestSurvivalSec: 95,
      victories: 0,
      runsPlayed: 1,
    });
    expect(initial.stats.runsPlayed).toBe(0);

    const afterWin = recordRunResult(afterLoss, {
      kills: 30,
      survivalSec: 180,
      victory: true,
    });

    expect(afterWin.stats).toEqual({
      bestKills: 42,
      bestSurvivalSec: 180,
      victories: 1,
      runsPlayed: 2,
    });
  });
});
