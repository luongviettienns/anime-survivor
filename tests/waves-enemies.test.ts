import { describe, expect, it } from 'vitest';
import {
  computeArchetypeVelocity,
  createRangedAttackState,
  ENEMY_ARCHETYPES,
  stepRangedAttackState,
} from '../src/domain/enemies';
import {
  computeWaveSpawnPlan,
  createWaveScheduleState,
  isRunVictory,
} from '../src/domain/waves';

describe('enemy archetypes and ranged AI FSM', () => {
  it('defines all 4 enemy archetypes with required stats and textures', () => {
    expect(ENEMY_ARCHETYPES.slime).toMatchObject({
      maxHp: 50,
      speed: 94,
      touchDamage: 11,
      xpValue: 1,
      texture: 'enemy',
      anim: 'enemy-walk',
      radius: 8,
    });
    expect(ENEMY_ARCHETYPES.shade).toMatchObject({
      maxHp: 32,
      speed: 155,
      touchDamage: 9,
      xpValue: 2,
      texture: 'enemy_shade',
      anim: 'enemy-shade-walk',
      radius: 8,
    });
    expect(ENEMY_ARCHETYPES.mage).toMatchObject({
      maxHp: 42,
      speed: 78,
      touchDamage: 10,
      xpValue: 3,
      texture: 'enemy_mage',
      anim: 'enemy-mage-walk',
      radius: 8,
      preferredRangePx: 230,
      attackCooldownMs: 2400,
      telegraphMs: 550,
      projectileSpeed: 280,
      projectileDamage: 12,
    });
    expect(ENEMY_ARCHETYPES.boss).toMatchObject({
      maxHp: 900,
      speed: 86,
      touchDamage: 20,
      xpValue: 25,
      texture: 'boss',
      anim: 'boss-walk',
      radius: 16,
      attackCooldownMs: 3200,
      telegraphMs: 700,
      projectileSpeed: 260,
      projectileDamage: 15,
      barrageCount: 8,
    });
  });

  it('computes archetype velocity for melee chasers, ranged kite/hold mage, and telegraph pause', () => {
    const slimeVel = computeArchetypeVelocity('slime', { x: 0, y: 0 }, { x: 100, y: 0 });
    const shadeVel = computeArchetypeVelocity('shade', { x: 0, y: 0 }, { x: 100, y: 0 });
    expect(slimeVel).toEqual({ x: 94, y: 0 });
    expect(shadeVel).toEqual({ x: 155, y: 0 });

    // Mage beyond preferredRangePx (230) approaches player
    const mageFar = computeArchetypeVelocity('mage', { x: 0, y: 0 }, { x: 320, y: 0 });
    expect(mageFar).toEqual({ x: 78, y: 0 });

    // Mage inside preferred firing band holds position
    const mageInBand = computeArchetypeVelocity('mage', { x: 0, y: 0 }, { x: 200, y: 0 });
    expect(mageInBand).toEqual({ x: 0, y: 0 });

    // Mage too close retreats slightly
    const mageTooClose = computeArchetypeVelocity('mage', { x: 0, y: 0 }, { x: 80, y: 0 });
    expect(mageTooClose.x).toBeLessThan(0);

    // Any enemy stops when player is dead or while telegraphing
    expect(computeArchetypeVelocity('shade', { x: 0, y: 0 }, { x: 100, y: 0 }, true)).toEqual({
      x: 0,
      y: 0,
    });
    expect(
      computeArchetypeVelocity('boss', { x: 0, y: 0 }, { x: 100, y: 0 }, false, true)
    ).toEqual({
      x: 0,
      y: 0,
    });
  });

  it('steps mage and boss ranged FSM through chase -> telegraph -> barrage', () => {
    const slimeRanged = createRangedAttackState(0);
    expect(
      stepRangedAttackState('slime', slimeRanged, { x: 0, y: 0 }, { x: 120, y: 0 }, 1000)
    ).toEqual({
      phase: 'chase',
      telegraphing: false,
      shouldFire: false,
      projectileDirections: [],
    });

    // Mage ranged attack lifecycle
    const mageState = createRangedAttackState(0, 400);
    const beforeReady = stepRangedAttackState(
      'mage',
      mageState,
      { x: 0, y: 0 },
      { x: 200, y: 0 },
      200
    );
    expect(beforeReady.phase).toBe('chase');
    expect(beforeReady.telegraphing).toBe(false);

    const startTelegraph = stepRangedAttackState(
      'mage',
      mageState,
      { x: 0, y: 0 },
      { x: 200, y: 0 },
      400
    );
    expect(startTelegraph.phase).toBe('telegraph');
    expect(startTelegraph.telegraphing).toBe(true);
    expect(startTelegraph.shouldFire).toBe(false);

    const midTelegraph = stepRangedAttackState(
      'mage',
      mageState,
      { x: 0, y: 0 },
      { x: 200, y: 0 },
      700
    );
    expect(midTelegraph.phase).toBe('telegraph');
    expect(midTelegraph.telegraphing).toBe(true);

    const fireStep = stepRangedAttackState(
      'mage',
      mageState,
      { x: 0, y: 0 },
      { x: 200, y: 0 },
      950
    );
    expect(fireStep.phase).toBe('barrage');
    expect(fireStep.telegraphing).toBe(false);
    expect(fireStep.shouldFire).toBe(true);
    expect(fireStep.projectileDirections).toHaveLength(1);
    expect(fireStep.projectileDirections[0]?.x).toBeCloseTo(1, 5);
    expect(fireStep.projectileDirections[0]?.y).toBeCloseTo(0, 5);

    // Boss 8-way radial barrage lifecycle
    const bossState = createRangedAttackState(1000, 300);
    const bossTelegraph = stepRangedAttackState(
      'boss',
      bossState,
      { x: 100, y: 100 },
      { x: 250, y: 100 },
      1300
    );
    expect(bossTelegraph.phase).toBe('telegraph');
    expect(bossTelegraph.telegraphing).toBe(true);

    const bossBarrage = stepRangedAttackState(
      'boss',
      bossState,
      { x: 100, y: 100 },
      { x: 250, y: 100 },
      2000
    );
    expect(bossBarrage.phase).toBe('barrage');
    expect(bossBarrage.shouldFire).toBe(true);
    expect(bossBarrage.projectileDirections).toHaveLength(8);
  });
});

describe('wave schedule and boss victory conditions', () => {
  it('escalates enemy archetypes over 0..600s and caps by maxAlive', () => {
    const waveState = createWaveScheduleState();
    expect(waveState.bossSpawned).toBe(false);

    const early = computeWaveSpawnPlan(10, 10, 130, false);
    expect(early.archetypesToSpawn).toEqual(['slime']);
    expect(early.shouldSpawnBoss).toBe(false);

    const midEarly = computeWaveSpawnPlan(45, 20, 130, false);
    expect(midEarly.archetypesToSpawn).toEqual(['slime', 'shade']);
    expect(midEarly.shouldSpawnBoss).toBe(false);

    const midLate = computeWaveSpawnPlan(150, 30, 130, false);
    expect(midLate.archetypesToSpawn).toEqual(['slime', 'shade', 'mage']);
    expect(midLate.shouldSpawnBoss).toBe(false);

    const late = computeWaveSpawnPlan(420, 40, 130, false);
    expect(late.archetypesToSpawn).toEqual(['shade', 'mage', 'slime', 'shade']);
    expect(late.shouldSpawnBoss).toBe(false);

    // Capped when near maxAlive
    const capped = computeWaveSpawnPlan(420, 129, 130, false);
    expect(capped.archetypesToSpawn).toEqual(['shade']);

    // Boss spawns at >= 600s only if not yet spawned
    const bossDue = computeWaveSpawnPlan(600, 50, 130, false);
    expect(bossDue.shouldSpawnBoss).toBe(true);

    const bossAlreadyOut = computeWaveSpawnPlan(605, 50, 130, true);
    expect(bossAlreadyOut.shouldSpawnBoss).toBe(false);
  });

  it('triggers victory only when boss is killed', () => {
    expect(isRunVictory('slime', true)).toBe(false);
    expect(isRunVictory('shade', true)).toBe(false);
    expect(isRunVictory('mage', true)).toBe(false);
    expect(isRunVictory('boss', false)).toBe(false);
    expect(isRunVictory('boss', true)).toBe(true);
  });
});
