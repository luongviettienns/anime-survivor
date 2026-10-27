export function xpThreshold(level: number): number {
  if (!Number.isInteger(level) || level < 1) throw new Error('level must be >= 1');
  return 3 + level * 2;
}

export type Progress = { level: number; xp: number };
export type AwardResult = Progress & { levelsGained: number };
export type RunProgression = Progress & { pendingUpgrades: number };

export function createProgression(): RunProgression {
  return { level: 1, xp: 0, pendingUpgrades: 0 };
}

export function awardXp(current: Progress, gain: number): AwardResult {
  if (!Number.isFinite(gain) || gain < 0) throw new Error('invalid XP gain');
  let level = current.level;
  let xp = current.xp + gain;
  let levelsGained = 0;
  while (xp >= xpThreshold(level)) {
    xp -= xpThreshold(level);
    level++;
    levelsGained++;
  }
  return { level, xp, levelsGained };
}

export function applyXpGain(
  current: RunProgression,
  gain: number
): RunProgression & { levelsGained: number } {
  const result = awardXp(current, gain);
  current.level = result.level;
  current.xp = result.xp;
  current.pendingUpgrades += result.levelsGained;
  return {
    level: current.level,
    xp: current.xp,
    pendingUpgrades: current.pendingUpgrades,
    levelsGained: result.levelsGained,
  };
}
