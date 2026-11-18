import Phaser from 'phaser';
import { ART_SCALE } from '../config/artDisplay';
import { applyEnemyKnockback, applyProjectileHit, createEnemyState, type EnemyState } from '../../domain/combat';
import {
  computeArchetypeVelocity, createRangedAttackState, ENEMY_ARCHETYPES,
  isBossEnraged, scaleEnemyConfig, stepRangedAttackState, type EnemyArchetypeId, type RangedAttackState,
} from '../../domain/enemies';
import type { DualWaveKind } from '../../domain/statusEffects';
import type { TargetCandidate } from '../../domain/targeting';
import {
  computeClusterAngles, computeEllipseSpawnOffset, computeRingOffsets,
  computeWaveSpawnPlan, createWaveScheduleState,
} from '../../domain/waves';
import { ENEMY } from '../config/constants';
import { EnemyMeleeSkill, type EnemyImpact } from './EnemyMeleeSkill';
import { EnemyStatusVisuals } from './EnemyStatusVisuals';
import { EnemyVisuals } from './EnemyVisuals';
import { HostileProjectilePool } from './HostileProjectilePool';
import type { VfxSystem } from './VfxSystem';

export type EnemyRuntimeState = EnemyState & {
  archetype: EnemyArchetypeId;
  touchDamage: number;
  projectileDamage: number;
  xpValue: number;
  ranged: RangedAttackState;
  hitTintUntilMs: number;
};

export class EnemySystem {
  readonly group: Phaser.Physics.Arcade.Group;
  readonly projectiles: HostileProjectilePool;
  private readonly melee: EnemyMeleeSkill;
  private readonly statusFx: EnemyStatusVisuals;
  private readonly states = new Map<Phaser.Physics.Arcade.Sprite, EnemyRuntimeState>();
  private readonly visuals: EnemyVisuals;
  private readonly candidateBuffer: Array<TargetCandidate & { sprite: Phaser.Physics.Arcade.Sprite }> = [];
  private schedule = createWaveScheduleState();
  private waveCooldownMs = 0;
  private runElapsedSec = 0;
  private nextId = 1;
  private bossSpawned = false;

  constructor(private readonly scene: Phaser.Scene, private readonly target: Phaser.Physics.Arcade.Sprite, private readonly vfx?: VfxSystem) {
    this.group = scene.physics.add.group(); this.visuals = new EnemyVisuals(scene);
    this.melee = new EnemyMeleeSkill(scene); this.statusFx = new EnemyStatusVisuals(scene);
    this.projectiles = new HostileProjectilePool(scene);
  }

  get enemyProjectiles(): Phaser.Physics.Arcade.Group { return this.projectiles.group; }

  spawn(archetype: EnemyArchetypeId = 'slime', elapsedSec = this.runElapsedSec, angleRad?: number): Phaser.Physics.Arcade.Sprite | null {
    if (archetype !== 'boss' && this.group.countActive(true) >= ENEMY.maxAlive) return null;
    const off = computeEllipseSpawnOffset(angleRad ?? Math.random() * Math.PI * 2, Math.random());
    return this.spawnAt(this.target.x + off.x, this.target.y + off.y, archetype, elapsedSec);
  }

  spawnAt(x: number, y: number, archetype: EnemyArchetypeId = 'slime', elapsedSec = this.runElapsedSec): Phaser.Physics.Arcade.Sprite {
    const cfg = scaleEnemyConfig(archetype, elapsedSec);
    const reuse = this.group.getFirstDead(false) as Phaser.Physics.Arcade.Sprite | null;
    const enemy = reuse
      ? (reuse.enableBody(true, x, y, true, true), reuse)
      : (this.group.create(x, y, cfg.texture) as Phaser.Physics.Arcade.Sprite);
    this.melee.release(enemy); this.statusFx.init(enemy);
    this.states.set(enemy, {
      ...createEnemyState(this.nextId++, cfg.maxHp, cfg.speed),
      archetype, touchDamage: cfg.touchDamage, projectileDamage: cfg.projectileDamage ?? 12,
      xpValue: cfg.xpValue, ranged: createRangedAttackState(this.scene.time.now), hitTintUntilMs: Number.NEGATIVE_INFINITY,
    });
    if (archetype === 'boss') this.bossSpawned = true;
    enemy.setTexture(cfg.texture).setScale(ART_SCALE[cfg.texture] ?? 1).clearTint().setFlipX(false).setVelocity(0, 0).setDepth(y).play(cfg.anim);
    enemy.setData('worldRadius', cfg.radius * 2);
    this.visuals.spawn(enemy, archetype);
    return enemy;
  }

  stepWaves(deltaMs: number, elapsedSec: number, playerVel?: { x: number; y: number }): void {
    this.runElapsedSec = elapsedSec;
    this.waveCooldownMs -= deltaMs;
    if (this.waveCooldownMs > 0) return;
    const plan = computeWaveSpawnPlan(elapsedSec, this.group.countActive(true), ENEMY.maxAlive, this.bossSpawned, this.schedule);
    this.waveCooldownMs = plan.spawnDelayMs;
    if (plan.shouldSpawnBoss) this.spawn('boss', elapsedSec);
    if (plan.shouldSpawnElite) this.spawn('elite', elapsedSec);
    if (plan.ringCount > 0) {
      const pool = plan.archetypesToSpawn.length ? plan.archetypesToSpawn : (['slime'] as EnemyArchetypeId[]);
      computeRingOffsets(plan.ringCount).forEach((off, i) =>
        this.spawnAt(this.target.x + off.x, this.target.y + off.y, pool[i % pool.length]!, elapsedSec));
    }
    const n = plan.archetypesToSpawn.length;
    if (n === 0) return;
    const moving = playerVel && Math.hypot(playerVel.x, playerVel.y) > 10;
    const angles = plan.clusterPack && moving
      ? computeClusterAngles(Math.atan2(playerVel.y, playerVel.x), n)
      : plan.archetypesToSpawn.map((_, i) => this.schedule.sectorIndex * 2.399963 + (i * Math.PI * 2) / n);
    plan.archetypesToSpawn.forEach((arch, i) => this.spawn(arch, elapsedSec, angles[i]));
  }

  ensureBossSpawned(): void { if (!this.bossSpawned) this.spawn('boss', this.runElapsedSec); }
  getState(enemy: Phaser.Physics.Arcade.Sprite): EnemyRuntimeState | undefined { return this.states.get(enemy); }
  getTouchDamage(enemyObj: Phaser.GameObjects.GameObject): number {
    const state = this.states.get(enemyObj as Phaser.Physics.Arcade.Sprite);
    if (state && (state.archetype === 'slime' || state.archetype === 'shade') && enemyObj.getData('melee-phase') !== 'chase') return 0;
    return state ? state.touchDamage : ENEMY.touchDamage;
  }
  getActiveBossState(): { hp: number; maxHp: number; name: string } | null {
    for (const state of this.states.values()) {
      if (state.archetype === 'boss' && !state.dead && state.hp > 0) return { hp: state.hp, maxHp: state.maxHp, name: 'CRIMSON ARCHON' };
    }
    return null;
  }

  getCandidates(): Array<TargetCandidate & { sprite: Phaser.Physics.Arcade.Sprite }> {
    this.candidateBuffer.length = 0;
    for (const object of this.group.getChildren()) {
      const sprite = object as Phaser.Physics.Arcade.Sprite;
      const state = this.states.get(sprite);
      if (!state) continue;
      const body = sprite.body as Phaser.Physics.Arcade.Body | null;
      this.candidateBuffer.push({ id: state.id, x: sprite.x, y: sprite.y, active: sprite.active, bodyEnabled: Boolean(body && body.enable), hp: state.hp, dead: state.dead, sprite });
    }
    return this.candidateBuffer;
  }

  damageEnemy(
    enemyObject: Phaser.GameObjects.GameObject, damage: number, knockbackPxSec = 0, sourcePos: { x: number; y: number } = this.target
  ): { damaged: boolean; killed: boolean; x: number; y: number; archetype: EnemyArchetypeId; xpValue: number } {
    const enemy = enemyObject as Phaser.Physics.Arcade.Sprite;
    const state = this.states.get(enemy);
    const { x, y } = enemy;
    if (!enemy.active || !state || state.dead) return { damaged: false, killed: false, x, y, archetype: state?.archetype ?? 'slime', xpValue: 0 };
    const result = applyProjectileHit(state, damage);
    if (result.killed) {
      this.visuals.defeat(enemy); this.melee.release(enemy); this.statusFx.release(enemy); this.visuals.release(enemy);
      this.states.delete(enemy); enemy.disableBody(true, true);
    } else if (result.damaged) {
      state.hitTintUntilMs = this.scene.time.now + 85; this.visuals.hit(enemy);
      enemy.setTint(0xffffff);
      const kb = knockbackPxSec * (ENEMY_ARCHETYPES[state.archetype].knockbackFactor ?? 1);
      if (kb > 0) {
        applyEnemyKnockback(state, sourcePos, { x, y }, kb, this.scene.time.now);
        enemy.setVelocity(state.knockbackVx, state.knockbackVy);
      }
    }
    return { damaged: result.damaged, killed: result.killed, x, y, archetype: state.archetype, xpValue: state.xpValue };
  }

  applyStatus(enemy: Phaser.Physics.Arcade.Sprite, kind: DualWaveKind, level: number): void {
    if (enemy.active && this.states.has(enemy)) this.statusFx.applyWaveStatus(enemy, kind, level, this.scene.time.now);
  }

  getStatus(enemy: Phaser.Physics.Arcade.Sprite) { return this.statusFx.getState(enemy); }

  update(
    playerDead = false,
    onHitPlayer?: (damage: number, impact?: EnemyImpact) => void,
    deltaMs = this.scene.game.loop.delta,
    onBurnDamage?: (x: number, y: number, dmg: number, killed: boolean, arch: EnemyArchetypeId, xp: number) => void
  ): void {
    const nowMs = this.scene.time.now;
    this.melee.advance(deltaMs);
    for (const object of this.group.getChildren()) {
      const enemy = object as Phaser.Physics.Arcade.Sprite;
      const state = this.states.get(enemy);
      if (!enemy.active || !state || state.dead) continue;
      if (!playerDead) {
        const burnDmg = this.statusFx.step(enemy, nowMs, this.vfx);
        if (burnDmg > 0) {
          const burnRes = this.damageEnemy(enemy, burnDmg, 0);
          if (burnRes.damaged) onBurnDamage?.(burnRes.x, burnRes.y, burnDmg, burnRes.killed, burnRes.archetype, burnRes.xpValue);
          if (burnRes.killed) continue;
        }
      }
      if (state.archetype !== 'boss' && Math.hypot(enemy.x - this.target.x, enemy.y - this.target.y) > 960) {
        const off = computeEllipseSpawnOffset(Math.random() * Math.PI * 2, 0.2);
        enemy.setPosition(this.target.x + off.x, this.target.y + off.y);
      }
      const hpRatio = state.hp / Math.max(1, state.maxHp);
      const enraged = isBossEnraged(state.archetype, hpRatio);
      const meleeBusy = state.archetype === 'boss' && this.melee.isBusy(enemy);
      const step = playerDead || meleeBusy
        ? { telegraphing: false, shouldFire: false, enraged, projectileDirections: [] }
        : stepRangedAttackState(state.archetype, state.ranged, enemy, this.target, nowMs, hpRatio);
      this.visuals.update(enemy, state.archetype, step.telegraphing, step.shouldFire, enraged, nowMs < state.hitTintUntilMs, this.target);
      if (step.shouldFire) {
        const cfg = ENEMY_ARCHETYPES[state.archetype];
        this.projectiles.fire(enemy.x, enemy.y, step.projectileDirections, cfg.projectileSpeed ?? 260, state.projectileDamage, nowMs, this.visuals.projectileHands(enemy));
      }
      const meleeVel = this.melee.update(enemy, state.archetype, this.target, playerDead || nowMs < state.knockbackUntilMs || step.telegraphing, onHitPlayer, enraged, this.runElapsedSec);
      if (!playerDead && nowMs < state.knockbackUntilMs) {
        enemy.setVelocity(state.knockbackVx, state.knockbackVy).setDepth(enemy.y);
        continue;
      }
      const vel = meleeVel ?? computeArchetypeVelocity(state.archetype, enemy, this.target, playerDead, step.telegraphing, hpRatio);
      const spd = Math.hypot(vel.x, vel.y);
      const scaleSpd = spd > 0 ? this.statusFx.effectiveSpeed(enemy, spd, nowMs) / spd : 1;
      enemy.setVelocity(vel.x * scaleSpd, vel.y * scaleSpd).setDepth(enemy.y);
    }
    this.projectiles.update(nowMs, this.target, playerDead ? undefined : onHitPlayer);
  }

  clear(): void {
    this.bossSpawned = false; this.waveCooldownMs = 0; this.runElapsedSec = 0;
    this.schedule = createWaveScheduleState();
    this.melee.clear(); this.statusFx.clear(); this.states.clear(); this.visuals.clear(); this.projectiles.clear();
  }
}
