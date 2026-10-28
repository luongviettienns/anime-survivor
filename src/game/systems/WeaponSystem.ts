import Phaser from 'phaser';
import type { EnemyArchetypeId } from '../../domain/enemies';
import {
  canWeaponFire,
  commitWeaponFire,
  createWeaponCooldown,
  selectNearestTarget,
  type TargetCandidate,
} from '../../domain/targeting';
import { aimDirection, type Vec2 } from '../../domain/vector';
import {
  computeWeaponStats,
  createWeaponInventory,
  type WeaponInventory,
} from '../../domain/weapons';
import { PLAYER, PROJECTILE } from '../config/constants';
import type { EnemySystem } from './EnemySystem';

type Candidate = TargetCandidate & { sprite: Phaser.Physics.Arcade.Sprite };

export class WeaponSystem {
  readonly projectiles: Phaser.Physics.Arcade.Group;
  readonly inventory: WeaponInventory = createWeaponInventory();
  private readonly orbCooldown = createWeaponCooldown(PLAYER.attackIntervalMs);
  private readonly slashCooldown = createWeaponCooldown(820);
  private readonly projectileExpiresAt = new Map<Phaser.Physics.Arcade.Image, number>();
  private readonly orbitals: Phaser.GameObjects.Image[] = [];
  private readonly orbitalHitUntil = new Map<number, number>();
  private lastAim: Vec2 = { x: 1, y: 0 };

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly player: Phaser.Physics.Arcade.Sprite,
    private readonly enemies: EnemySystem,
    private readonly onEnemyKilled?: (x: number, y: number, archetype: EnemyArchetypeId, xpValue: number) => void
  ) {
    this.projectiles = scene.physics.add.group();
  }

  update(nowMs: number, enabled = true): void {
    for (const [shot, expiresAt] of this.projectileExpiresAt) {
      if (!shot.active || nowMs >= expiresAt) this.consumeProjectile(shot);
    }
    if (!enabled || !this.player.active) return;

    const vel = this.player.body?.velocity;
    if (vel && (Math.abs(vel.x) > 1 || Math.abs(vel.y) > 1)) {
      this.lastAim = aimDirection({ x: 0, y: 0 }, vel, this.lastAim);
    }

    const candidates = this.enemies.getCandidates();
    if (this.inventory.orb >= 1) this.updateOrb(nowMs, candidates);
    if (this.inventory.slash >= 1) this.updateSlash(nowMs, candidates);
    if (this.inventory.orbital >= 1) this.updateOrbital(nowMs, candidates);
  }

  handleProjectileHit(
    projObj: Phaser.GameObjects.GameObject,
    enemyObj: Phaser.GameObjects.GameObject
  ): void {
    const enemy = enemyObj as Phaser.Physics.Arcade.Sprite;
    if (!enemy.active || !this.consumeProjectile(projObj)) return;
    const stats = computeWeaponStats('orb', Math.max(1, this.inventory.orb));
    this.damageAndReward(enemy, stats.damage, stats.knockbackPxSec);
  }

  consumeProjectile(projectileObject: Phaser.GameObjects.GameObject): boolean {
    const projectile = projectileObject as Phaser.Physics.Arcade.Image;
    if (!projectile.active || !this.projectileExpiresAt.has(projectile)) return false;
    this.projectileExpiresAt.delete(projectile);
    projectile.disableBody(true, true);
    return true;
  }

  clear(): void {
    this.projectileExpiresAt.clear();
    this.orbitalHitUntil.clear();
    for (const blade of this.orbitals) blade.destroy();
    this.orbitals.length = 0;
  }

  private updateOrb(nowMs: number, candidates: Candidate[]): void {
    const stats = computeWeaponStats('orb', this.inventory.orb);
    this.orbCooldown.intervalMs = stats.cooldownMs;
    if (!canWeaponFire(this.orbCooldown, nowMs)) return;
    const target = selectNearestTarget(this.player, candidates, stats.rangePx);
    if (!target) return;

    this.lastAim = aimDirection(this.player, target, this.lastAim);
    const baseAngle = Math.atan2(this.lastAim.y, this.lastAim.x);
    for (let i = 0; i < stats.count; i++) {
      const angle = baseAngle + (i - (stats.count - 1) / 2) * 0.18;
      this.spawnOrb(nowMs, { x: Math.cos(angle), y: Math.sin(angle) }, stats.speedPxSec);
    }
    commitWeaponFire(this.orbCooldown, nowMs);
  }

  private spawnOrb(nowMs: number, dir: Vec2, speedPxSec: number): void {
    const reuse = this.projectiles.getFirstDead(false) as Phaser.Physics.Arcade.Image | null;
    const shot = reuse
      ? (reuse.enableBody(true, this.player.x, this.player.y, true, true), reuse)
      : (this.projectiles.create(this.player.x, this.player.y, 'orb') as Phaser.Physics.Arcade.Image);
    shot.setTexture('orb').setScale(2).setDepth(2000).setVelocity(dir.x * speedPxSec, dir.y * speedPxSec);
    this.projectileExpiresAt.set(shot, nowMs + PROJECTILE.lifeMs);
  }

  private updateSlash(nowMs: number, candidates: Candidate[]): void {
    const stats = computeWeaponStats('slash', this.inventory.slash);
    this.slashCooldown.intervalMs = stats.cooldownMs;
    if (!canWeaponFire(this.slashCooldown, nowMs)) return;
    const target = selectNearestTarget(this.player, candidates, stats.rangePx);
    if (!target) return;

    const dir = aimDirection(this.player, target, this.lastAim);
    this.lastAim = dir;
    for (const d of stats.count >= 2 ? [dir, { x: -dir.x, y: -dir.y }] : [dir]) {
      const fx = this.scene.add
        .image(this.player.x + d.x * 28, this.player.y + d.y * 28, 'slash')
        .setScale(2)
        .setDepth(4999)
        .setRotation(Math.atan2(d.y, d.x));
      this.scene.time.delayedCall(140, () => fx.destroy());
    }
    for (const cand of candidates) {
      const dx = cand.x - this.player.x;
      const dy = cand.y - this.player.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= stats.rangePx && (stats.count >= 2 || (dist <= 1e-3 || (dx * dir.x + dy * dir.y) / dist >= -0.25))) {
        this.damageAndReward(cand.sprite, stats.damage, stats.knockbackPxSec);
      }
    }
    commitWeaponFire(this.slashCooldown, nowMs);
  }

  private updateOrbital(nowMs: number, candidates: Candidate[]): void {
    const stats = computeWeaponStats('orbital', this.inventory.orbital);
    while (this.orbitals.length < stats.count) {
      this.orbitals.push(this.scene.add.image(this.player.x, this.player.y, 'shuriken').setScale(2).setDepth(4998));
    }
    const baseAngle = (nowMs / 1000) * stats.speedPxSec;
    for (let i = 0; i < stats.count; i++) {
      const angle = baseAngle + (i * Math.PI * 2) / stats.count;
      const bx = this.player.x + Math.cos(angle) * stats.rangePx;
      const by = this.player.y + Math.sin(angle) * stats.rangePx;
      this.orbitals[i]!.setPosition(bx, by).setRotation(angle * 2).setVisible(true);
      for (const cand of candidates) {
        if (!cand.active || cand.dead || Math.hypot(cand.x - bx, cand.y - by) > 28) continue;
        if (nowMs < (this.orbitalHitUntil.get(cand.id) ?? Number.NEGATIVE_INFINITY)) continue;
        this.orbitalHitUntil.set(cand.id, nowMs + stats.cooldownMs);
        this.damageAndReward(cand.sprite, stats.damage, stats.knockbackPxSec);
      }
    }
  }

  private damageAndReward(enemy: Phaser.Physics.Arcade.Sprite, damage: number, knockbackPxSec: number): void {
    const outcome = this.enemies.damageEnemy(enemy, damage, knockbackPxSec, this.player);
    if (outcome.killed) this.onEnemyKilled?.(outcome.x, outcome.y, outcome.archetype, outcome.xpValue);
  }
}
