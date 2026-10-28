import Phaser from 'phaser';
import { applyEnemyKnockback, applyProjectileHit, createEnemyState, type EnemyState } from '../../domain/combat';
import {
  computeArchetypeVelocity, createRangedAttackState, ENEMY_ARCHETYPES,
  stepRangedAttackState, type EnemyArchetypeId, type RangedAttackState,
} from '../../domain/enemies';
import type { TargetCandidate } from '../../domain/targeting';
import { computeWaveSpawnPlan } from '../../domain/waves';
import { ENEMY, WORLD } from '../config/constants';
import { HostileProjectilePool } from './HostileProjectilePool';

export type EnemyRuntimeState = EnemyState & {
  archetype: EnemyArchetypeId;
  ranged: RangedAttackState;
  hitTintUntilMs: number;
};

export class EnemySystem {
  readonly group: Phaser.Physics.Arcade.Group;
  readonly projectiles: HostileProjectilePool;
  private nextId = 1;
  private bossSpawned = false;
  private readonly states = new Map<Phaser.Physics.Arcade.Sprite, EnemyRuntimeState>();
  private readonly candidateBuffer: Array<TargetCandidate & { sprite: Phaser.Physics.Arcade.Sprite }> = [];

  constructor(private readonly scene: Phaser.Scene, private readonly target: Phaser.Physics.Arcade.Sprite) {
    this.group = scene.physics.add.group();
    this.projectiles = new HostileProjectilePool(scene);
  }

  get enemyProjectiles(): Phaser.Physics.Arcade.Group { return this.projectiles.group; }

  spawn(archetype: EnemyArchetypeId = 'slime'): Phaser.Physics.Arcade.Sprite | null {
    if (archetype !== 'boss' && this.group.countActive(true) >= ENEMY.maxAlive) return null;
    for (let attempt = 0; attempt < 12; attempt++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = ENEMY.spawnDistanceMin + Math.random() * (ENEMY.spawnDistanceMax - ENEMY.spawnDistanceMin);
      const x = this.target.x + Math.cos(angle) * dist;
      const y = this.target.y + Math.sin(angle) * dist;
      if (
        x >= ENEMY.worldMargin && x <= WORLD.width - ENEMY.worldMargin &&
        y >= ENEMY.worldMargin && y <= WORLD.height - ENEMY.worldMargin &&
        Math.hypot(x - this.target.x, y - this.target.y) >= ENEMY.spawnDistanceMin * 0.9
      ) return this.spawnAt(x, y, archetype);
    }
    const fx = this.target.x < WORLD.width / 2
      ? Math.min(WORLD.width - ENEMY.worldMargin, this.target.x + ENEMY.spawnDistanceMin)
      : Math.max(ENEMY.worldMargin, this.target.x - ENEMY.spawnDistanceMin);
    const fy = Phaser.Math.Clamp(this.target.y, ENEMY.worldMargin, WORLD.height - ENEMY.worldMargin);
    return this.spawnAt(fx, fy, archetype);
  }

  spawnAt(x: number, y: number, archetype: EnemyArchetypeId = 'slime'): Phaser.Physics.Arcade.Sprite {
    const cfg = ENEMY_ARCHETYPES[archetype];
    const reuse = this.group.getFirstDead(false) as Phaser.Physics.Arcade.Sprite | null;
    const enemy = reuse
      ? (reuse.enableBody(true, x, y, true, true), reuse)
      : (this.group.create(x, y, cfg.texture) as Phaser.Physics.Arcade.Sprite);
    this.states.set(enemy, {
      ...createEnemyState(this.nextId++, cfg.maxHp, cfg.speed),
      archetype, ranged: createRangedAttackState(this.scene.time.now), hitTintUntilMs: Number.NEGATIVE_INFINITY,
    });
    if (archetype === 'boss') this.bossSpawned = true;
    enemy.setTexture(cfg.texture).setScale(2).clearTint().setFlipX(false).setVelocity(0, 0).setDepth(y).play(cfg.anim);
    enemy.setCircle(cfg.radius, cfg.radius === 16 ? 8 : 4, cfg.radius === 16 ? 10 : 6);
    return enemy;
  }

  spawnWaveTick(elapsedSec: number): number {
    const plan = computeWaveSpawnPlan(elapsedSec, this.group.countActive(true), ENEMY.maxAlive, this.bossSpawned);
    if (plan.shouldSpawnBoss) this.spawn('boss');
    for (const arch of plan.archetypesToSpawn) this.spawn(arch);
    return plan.spawnDelayMs;
  }

  ensureBossSpawned(): void { if (!this.bossSpawned) this.spawn('boss'); }
  getState(enemy: Phaser.Physics.Arcade.Sprite): EnemyRuntimeState | undefined { return this.states.get(enemy); }
  getTouchDamage(enemyObj: Phaser.GameObjects.GameObject): number {
    const state = this.states.get(enemyObj as Phaser.Physics.Arcade.Sprite);
    return state ? ENEMY_ARCHETYPES[state.archetype].touchDamage : ENEMY.touchDamage;
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
      this.candidateBuffer.push({
        id: state.id, x: sprite.x, y: sprite.y, active: sprite.active,
        bodyEnabled: Boolean(body && body.enable), hp: state.hp, dead: state.dead, sprite,
      });
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
    const cfg = ENEMY_ARCHETYPES[state.archetype];
    const result = applyProjectileHit(state, damage);
    if (result.killed) {
      this.states.delete(enemy);
      enemy.disableBody(true, true);
    } else if (result.damaged) {
      state.hitTintUntilMs = this.scene.time.now + 85;
      enemy.setTint(0xffffff);
      if (knockbackPxSec > 0) {
        applyEnemyKnockback(state, sourcePos, { x, y }, knockbackPxSec, this.scene.time.now);
        enemy.setVelocity(state.knockbackVx, state.knockbackVy);
      }
    }
    return { damaged: result.damaged, killed: result.killed, x, y, archetype: state.archetype, xpValue: cfg.xpValue };
  }

  update(playerDead = false, onHitPlayer?: (damage: number) => void): void {
    const nowMs = this.scene.time.now;
    for (const object of this.group.getChildren()) {
      const enemy = object as Phaser.Physics.Arcade.Sprite;
      const state = this.states.get(enemy);
      if (!enemy.active || !state || state.dead) continue;
      const step = playerDead
        ? { telegraphing: false, shouldFire: false, projectileDirections: [] }
        : stepRangedAttackState(state.archetype, state.ranged, enemy, this.target, nowMs);
      if (step.shouldFire) {
        const cfg = ENEMY_ARCHETYPES[state.archetype];
        this.projectiles.fire(enemy.x, enemy.y, step.projectileDirections, cfg.projectileSpeed ?? 260, cfg.projectileDamage ?? 12, nowMs);
      }
      if (nowMs < state.hitTintUntilMs) enemy.setTint(0xffffff);
      else if (step.telegraphing) enemy.setTint(0xffaa44);
      else if (enemy.isTinted) enemy.clearTint();

      if (!playerDead && nowMs < state.knockbackUntilMs) {
        enemy.setVelocity(state.knockbackVx, state.knockbackVy).setDepth(enemy.y);
        continue;
      }
      const vel = computeArchetypeVelocity(state.archetype, enemy, this.target, playerDead, step.telegraphing);
      enemy.setVelocity(vel.x, vel.y).setDepth(enemy.y);
      if (Math.abs(vel.x) > 1e-3) enemy.setFlipX(vel.x < 0);
    }
    this.projectiles.update(nowMs, this.target, playerDead ? undefined : onHitPlayer);
  }

  clear(): void { this.bossSpawned = false; this.states.clear(); this.projectiles.clear(); }
}
