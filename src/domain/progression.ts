export function xpThreshold(level: number): number {
  if (!Number.isInteger(level) || level < 1) throw new Error('level must be >= 1');
  return 3 + level * 2;
}

export type Progress = { level: number; xp: number };
export type AwardResult = Progress & { levelsGained: number };

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
