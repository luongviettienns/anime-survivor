import type { EnemyArchetypeId } from './enemies';
import type { Vec2 } from './vector';

export type WaveScheduleState = {
  bossSpawned: boolean;
  bossDefeated: boolean;
  nextSpawnAtMs: number;
  nextEliteAtSec: number;
  nextRingAtSec: number;
  sectorIndex: number;
};

export type WaveSpawnPlan = {
  archetypesToSpawn: EnemyArchetypeId[];
  shouldSpawnBoss: boolean;
  shouldSpawnElite: boolean;
  ringCount: number;
  clusterPack: boolean;
  spawnDelayMs: number;
};

export function createWaveScheduleState(): WaveScheduleState {
  return {
    bossSpawned: false,
    bossDefeated: false,
    nextSpawnAtMs: 0,
    nextEliteAtSec: 90,
    nextRingAtSec: 120,
    sectorIndex: 0,
  };
}

function ringSizeForTime(elapsedSec: number): number {
  if (elapsedSec >= 420) return 22;
  if (elapsedSec >= 270) return 18;
  if (elapsedSec >= 180) return 16;
  return 14;
}

export function computeWaveSpawnPlan(
  elapsedSec: number,
  activeEnemies: number,
  maxAlive: number,
  bossSpawned: boolean,
  state?: WaveScheduleState
): WaveSpawnPlan {
  const safeElapsed = Number.isFinite(elapsedSec) ? Math.max(0, elapsedSec) : 0;
  const reserve = 10;
  const remainingNormal = Math.max(0, maxAlive - reserve - activeEnemies);

  let pool: EnemyArchetypeId[];
  let spawnDelayMs: number;

  if (safeElapsed < 60) {
    pool = ['slime'];
    spawnDelayMs = 1000;
  } else if (safeElapsed < 150) {
    pool = ['slime', 'shade'];
    spawnDelayMs = 900;
  } else if (safeElapsed < 270) {
    pool = ['slime', 'shade', 'mage'];
    spawnDelayMs = 800;
  } else if (safeElapsed < 420) {
    pool = ['slime', 'shade', 'mage', 'slime'];
    spawnDelayMs = 700;
  } else if (safeElapsed < 570) {
    pool = ['shade', 'slime', 'mage', 'shade', 'slime'];
    spawnDelayMs = 580;
  } else if (bossSpawned) {
    pool = ['slime', 'shade'];
    spawnDelayMs = 1800;
  } else {
    pool = ['slime', 'shade', 'mage'];
    spawnDelayMs = 900;
  }

  let shouldSpawnElite = false;
  if (state && !bossSpawned && safeElapsed >= state.nextEliteAtSec && state.nextEliteAtSec <= 540 && activeEnemies < maxAlive) {
    shouldSpawnElite = true;
    state.nextEliteAtSec += 90;
  }

  let ringCount = 0;
  if (state && !bossSpawned && safeElapsed >= state.nextRingAtSec && state.nextRingAtSec <= 540) {
    ringCount = Math.min(remainingNormal, ringSizeForTime(safeElapsed));
    state.nextRingAtSec += 60;
  }

  const streamSlots = Math.max(0, remainingNormal - ringCount);
  const clusterPack = safeElapsed >= 150 && !bossSpawned && state !== undefined && state.sectorIndex % 4 === 3;
  if (state) state.sectorIndex += 1;

  return {
    archetypesToSpawn: pool.slice(0, streamSlots),
    shouldSpawnBoss: safeElapsed >= 600 && !bossSpawned,
    shouldSpawnElite,
    ringCount,
    clusterPack,
    spawnDelayMs,
  };
}

export function computeEllipseSpawnOffset(angleRad: number, depthT = 0.5): Vec2 {
  const t = Number.isFinite(depthT) ? Math.max(0, Math.min(1, depthT)) : 0.5;
  const rx = 690 + t * 70;
  const ry = 410 + t * 70;
  return { x: Math.cos(angleRad) * rx, y: Math.sin(angleRad) * ry };
}

export function computeRingOffsets(count: number, radiusPx = 485): Vec2[] {
  if (!Number.isInteger(count) || count <= 0) return [];
  const offsets: Vec2[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    offsets.push({ x: Math.cos(angle) * radiusPx, y: Math.sin(angle) * radiusPx });
  }
  return offsets;
}

export function computeClusterAngles(centerAngle: number, count: number): number[] {
  if (!Number.isInteger(count) || count <= 0) return [];
  const spread = 0.314;
  if (count === 1) return [centerAngle];
  const angles: number[] = [];
  for (let i = 0; i < count; i++) {
    angles.push(centerAngle - spread + (2 * spread * i) / (count - 1));
  }
  return angles;
}

export function isRunVictory(killedArchetype: EnemyArchetypeId, killed: boolean): boolean {
  return Boolean(killed && killedArchetype === 'boss');
}
