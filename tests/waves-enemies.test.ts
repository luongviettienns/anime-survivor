import { describe, expect, it } from 'vitest';
import {
  computeArchetypeVelocity,
  createRangedAttackState,
  ENEMY_ARCHETYPES,
  isBossEnraged,
  scaleEnemyConfig,
  stepRangedAttackState,
} from '../src/domain/enemies';
import {
  computeClusterAngles,
  computeEllipseSpawnOffset,
  computeRingOffsets,
  computeWaveSpawnPlan,
  createWaveScheduleState,
  isRunVictory,
} from '../src/domain/waves';

describe('enemy archetypes, minute scaling, and ranged/boss AI FSM', () => {
  it('defines all 5 enemy archetypes including elite with rebalanced minute-0 stats', () => {
    expect(ENEMY_ARCHETYPES.slime).toMatchObject({ maxHp: 50, speed: 94, touchDamage: 10, xpValue: 1, texture: 'enemy' });
    expect(ENEMY_ARCHETYPES.shade).toMatchObject({ maxHp: 35, speed: 155, touchDamage: 9, xpValue: 2, texture: 'enemy_shade' });
    expect(ENEMY_ARCHETYPES.mage).toMatchObject({ maxHp: 45, speed: 78, touchDamage: 10, preferredRangePx: 230, projectileDamage: 12, xpValue: 3 });
    expect(ENEMY_ARCHETYPES.elite).toMatchObject({ maxHp: 280, speed: 108, touchDamage: 20, xpValue: 15, texture: 'enemy_elite', knockbackFactor: 0.5 });
    expect(ENEMY_ARCHETYPES.boss).toMatchObject({ maxHp: 4500, speed: 86, touchDamage: 35, projectileDamage: 24, barrageCount: 8 });
  });

  it('scales normal and elite enemies linearly by minute and boosts XP gems from minute 4', () => {
    expect(scaleEnemyConfig('slime', 0)).toMatchObject({ maxHp: 50, touchDamage: 10, speed: 94, xpValue: 1 });
    expect(scaleEnemyConfig('slime', 300)).toMatchObject({ maxHp: 170, touchDamage: 25, speed: 119, xpValue: 3 });
    expect(scaleEnemyConfig('slime', 540)).toMatchObject({ maxHp: 266, touchDamage: 37, speed: 139, xpValue: 3 });

    expect(scaleEnemyConfig('shade', 300)).toMatchObject({ maxHp: 115, touchDamage: 24, speed: 185, xpValue: 3 });
    expect(scaleEnemyConfig('shade', 540)).toMatchObject({ maxHp: 179, touchDamage: 36, speed: 209, xpValue: 3 });

    expect(scaleEnemyConfig('mage', 240)).toMatchObject({ maxHp: 125, projectileDamage: 28, speed: 86, xpValue: 5 });
    expect(scaleEnemyConfig('mage', 540)).toMatchObject({ maxHp: 225, projectileDamage: 48, speed: 96, xpValue: 5 });

    expect(scaleEnemyConfig('elite', 90)).toMatchObject({ maxHp: 375, touchDamage: 24, speed: 112, xpValue: 15 });
    expect(scaleEnemyConfig('elite', 540)).toMatchObject({ maxHp: 1135, touchDamage: 56, speed: 144, xpValue: 25 });

    expect(scaleEnemyConfig('boss', 600)).toMatchObject({ maxHp: 4500, touchDamage: 35, projectileDamage: 24 });
  });

  it('computes archetype velocity including boss phase 2 speed boost and telegraph pause', () => {
    expect(computeArchetypeVelocity('slime', { x: 0, y: 0 }, { x: 100, y: 0 })).toEqual({ x: 94, y: 0 });
    expect(computeArchetypeVelocity('shade', { x: 0, y: 0 }, { x: 100, y: 0 })).toEqual({ x: 155, y: 0 });
    expect(computeArchetypeVelocity('mage', { x: 0, y: 0 }, { x: 320, y: 0 })).toEqual({ x: 78, y: 0 });
    expect(computeArchetypeVelocity('mage', { x: 0, y: 0 }, { x: 200, y: 0 })).toEqual({ x: 0, y: 0 });
    expect(computeArchetypeVelocity('mage', { x: 0, y: 0 }, { x: 80, y: 0 }).x).toBeLessThan(0);
    expect(computeArchetypeVelocity('shade', { x: 0, y: 0 }, { x: 100, y: 0 }, true)).toEqual({ x: 0, y: 0 });
    expect(computeArchetypeVelocity('boss', { x: 0, y: 0 }, { x: 100, y: 0 }, false, true)).toEqual({ x: 0, y: 0 });

    expect(isBossEnraged('boss', 0.51)).toBe(false);
    expect(isBossEnraged('boss', 0.5)).toBe(true);
    expect(computeArchetypeVelocity('boss', { x: 0, y: 0 }, { x: 100, y: 0 }, false, false, 0.4).x).toBeCloseTo(107.5, 4);
  });

  it('steps mage, boss phase 1 (8-way), and boss phase 2 enraged (12-way spiral)', () => {
    const slimeRanged = createRangedAttackState(0);
    expect(stepRangedAttackState('slime', slimeRanged, { x: 0, y: 0 }, { x: 120, y: 0 }, 1000)).toMatchObject({
      phase: 'chase',
      telegraphing: false,
      shouldFire: false,
      projectileDirections: [],
    });

    const mageState = createRangedAttackState(0, 400);
    expect(stepRangedAttackState('mage', mageState, { x: 0, y: 0 }, { x: 200, y: 0 }, 200).phase).toBe('chase');
    expect(stepRangedAttackState('mage', mageState, { x: 0, y: 0 }, { x: 200, y: 0 }, 400)).toMatchObject({ phase: 'telegraph', telegraphing: true });
    const fireStep = stepRangedAttackState('mage', mageState, { x: 0, y: 0 }, { x: 200, y: 0 }, 950);
    expect(fireStep).toMatchObject({ phase: 'barrage', shouldFire: true });
    expect(fireStep.projectileDirections).toHaveLength(1);

    const bossState = createRangedAttackState(1000, 300);
    expect(stepRangedAttackState('boss', bossState, { x: 100, y: 100 }, { x: 250, y: 100 }, 1300, 0.8).telegraphing).toBe(true);
    const bossP1 = stepRangedAttackState('boss', bossState, { x: 100, y: 100 }, { x: 250, y: 100 }, 2000, 0.8);
    expect(bossP1.shouldFire).toBe(true);
    expect(bossP1.enraged).toBe(false);
    expect(bossP1.projectileDirections).toHaveLength(8);

    expect(stepRangedAttackState('boss', bossState, { x: 100, y: 100 }, { x: 250, y: 100 }, 5200, 0.4).telegraphing).toBe(true);
    const bossP2 = stepRangedAttackState('boss', bossState, { x: 100, y: 100 }, { x: 250, y: 100 }, 5800, 0.4);
    expect(bossP2.shouldFire).toBe(true);
    expect(bossP2.enraged).toBe(true);
    expect(bossP2.projectileDirections).toHaveLength(12);
  });
});

describe('wave schedule, swarm patterns, elite triggers, and boss victory conditions', () => {
  it('escalates 6-stage spawn delays and composition across 0..600s and reserves 10 slots near maxAlive', () => {
    const state = createWaveScheduleState();
    expect(state.bossSpawned).toBe(false);
    expect(computeWaveSpawnPlan(10, 10, 130, false)).toMatchObject({ spawnDelayMs: 1000, archetypesToSpawn: ['slime'] });
    expect(computeWaveSpawnPlan(75, 20, 130, false)).toMatchObject({ spawnDelayMs: 900, archetypesToSpawn: ['slime', 'shade'] });
    expect(computeWaveSpawnPlan(180, 30, 130, false)).toMatchObject({ spawnDelayMs: 800, archetypesToSpawn: ['slime', 'shade', 'mage'] });
    expect(computeWaveSpawnPlan(300, 40, 130, false)).toMatchObject({ spawnDelayMs: 700 });
    expect(computeWaveSpawnPlan(300, 40, 130, false).archetypesToSpawn).toHaveLength(4);
    expect(computeWaveSpawnPlan(450, 40, 130, false)).toMatchObject({ spawnDelayMs: 580 });
    expect(computeWaveSpawnPlan(450, 40, 130, false).archetypesToSpawn).toHaveLength(5);
    expect(computeWaveSpawnPlan(450, 118, 130, false).archetypesToSpawn).toHaveLength(2);
    expect(computeWaveSpawnPlan(450, 120, 130, false).archetypesToSpawn).toHaveLength(0);
    expect(computeWaveSpawnPlan(600, 50, 130, false)).toMatchObject({ shouldSpawnBoss: true, spawnDelayMs: 900 });
    expect(computeWaveSpawnPlan(605, 50, 130, true)).toMatchObject({ shouldSpawnBoss: false, spawnDelayMs: 1800 });
  });

  it('schedules elites every 90s from 1:30 and encirclement rings every 60s from 2:00', () => {
    const state = createWaveScheduleState();
    expect(computeWaveSpawnPlan(89, 20, 130, false, state)).toMatchObject({ shouldSpawnElite: false, ringCount: 0 });
    expect(computeWaveSpawnPlan(90, 20, 130, false, state)).toMatchObject({ shouldSpawnElite: true, ringCount: 0 });
    expect(computeWaveSpawnPlan(120, 20, 130, false, state)).toMatchObject({ shouldSpawnElite: false, ringCount: 14 });
    expect(computeWaveSpawnPlan(180, 20, 130, false, state)).toMatchObject({ shouldSpawnElite: true, ringCount: 16 });
    expect(computeWaveSpawnPlan(450, 20, 130, false, state)).toMatchObject({ ringCount: 22 });
    expect(computeWaveSpawnPlan(600, 20, 130, true, state)).toMatchObject({ shouldSpawnElite: false, ringCount: 0 });
  });

  it('places ellipse spawns outside 1280x720 viewport and generates ring/cluster geometries', () => {
    const right = computeEllipseSpawnOffset(0, 0);
    const top = computeEllipseSpawnOffset(-Math.PI / 2, 0);
    expect(right.x).toBeGreaterThanOrEqual(690);
    expect(Math.abs(top.y)).toBeGreaterThanOrEqual(410);
    expect(computeRingOffsets(14, 480)).toHaveLength(14);
    const cluster = computeClusterAngles(0, 5);
    expect(cluster).toHaveLength(5);
    expect(Math.max(...cluster) - Math.min(...cluster)).toBeLessThanOrEqual(0.65);
  });

  it('triggers victory only when boss is killed', () => {
    expect(isRunVictory('slime', true)).toBe(false);
    expect(isRunVictory('elite', true)).toBe(false);
    expect(isRunVictory('boss', false)).toBe(false);
    expect(isRunVictory('boss', true)).toBe(true);
  });
});
