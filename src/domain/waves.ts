import type { EnemyArchetypeId } from './enemies';

export type WaveScheduleState = {
  bossSpawned: boolean;
  bossDefeated: boolean;
  nextSpawnAtMs: number;
};

export type WaveSpawnPlan = {
  archetypesToSpawn: EnemyArchetypeId[];
  shouldSpawnBoss: boolean;
  spawnDelayMs: number;
};

export function createWaveScheduleState(): WaveScheduleState {
  return {
    bossSpawned: false,
    bossDefeated: false,
    nextSpawnAtMs: 0,
  };
}

export function computeWaveSpawnPlan(
  elapsedSec: number,
  activeEnemies: number,
  maxAlive: number,
  bossSpawned: boolean
): WaveSpawnPlan {
  const safeElapsed = Number.isFinite(elapsedSec) ? Math.max(0, elapsedSec) : 0;
  const remainingCapacity = Math.max(0, maxAlive - activeEnemies);

  let baseArchetypes: EnemyArchetypeId[];
  let spawnDelayMs: number;

  if (safeElapsed < 30) {
    baseArchetypes = ['slime'];
    spawnDelayMs = 1050;
  } else if (safeElapsed < 90) {
    baseArchetypes = ['slime', 'shade'];
    spawnDelayMs = 950;
  } else if (safeElapsed < 300) {
    baseArchetypes = ['slime', 'shade', 'mage'];
    spawnDelayMs = 820;
  } else {
    baseArchetypes = ['shade', 'mage', 'slime', 'shade'];
    spawnDelayMs = 680;
  }

  return {
    archetypesToSpawn: baseArchetypes.slice(0, remainingCapacity),
    shouldSpawnBoss: safeElapsed >= 600 && !bossSpawned,
    spawnDelayMs,
  };
}

export function isRunVictory(killedArchetype: EnemyArchetypeId, killed: boolean): boolean {
  return Boolean(killed && killedArchetype === 'boss');
}
