import Phaser from 'phaser';
import type { EnemyArchetypeId } from '../../domain/enemies';
import { canWeaponFire, commitWeaponFire, createWeaponCooldown, selectNearestTarget, type TargetCandidate } from '../../domain/targeting';
import { createPassiveStats, rollCombatDamage, type PassiveStats } from '../../domain/upgrades';
import { aimDirection, type Vec2 } from '../../domain/vector';
import { applyWeaponModifiers, computeWeaponStats, createWeaponInventory, type WeaponId, type WeaponInventory } from '../../domain/weapons';
import { PROJECTILE } from '../config/constants';
import type { EnemySystem } from './EnemySystem';
import { DualElementSystem } from './DualElementSystem';
import { MineSystem } from './MineSystem';
import { OrbitalSystem } from './OrbitalSystem';
import type { VfxSystem } from './VfxSystem';

type Candidate = TargetCandidate & { sprite: Phaser.Physics.Arcade.Sprite };

export class WeaponSystem {
  readonly projectiles: Phaser.Physics.Arcade.Group;
  readonly inventory: WeaponInventory;
  private readonly orbCooldown = createWeaponCooldown(760);
  private readonly slashCooldown = createWeaponCooldown(900);
  private readonly projectileExpiresAt = new Map<Phaser.Physics.Arcade.Sprite, number>();
  private readonly dualSlash: DualElementSystem;
  private readonly mines: MineSystem;
  private readonly orbital: OrbitalSystem;
  private activePassives: PassiveStats = createPassiveStats();
  private lastAim: Vec2 = { x: 1, y: 0 };

  constructor(
    scene: Phaser.Scene,
    private readonly player: Phaser.Physics.Arcade.Sprite,
    private readonly enemies: EnemySystem,
    private readonly onEnemyKilled?: (x: number, y: number, archetype: EnemyArchetypeId, xpValue: number) => void,
    private readonly onCombatFeedback?: (cue: 'shoot' | 'slash' | 'hit', x?: number, y?: number, dmg?: number, killed?: boolean, critical?: boolean, explosive?: boolean) => void,
    private readonly vfx?: VfxSystem,
    private readonly onSkillUsed?: (skill: WeaponId, aimX: number, animOverride?: string) => void,
    startingWeapon: WeaponId = 'orb'
  ) {
    this.inventory = createWeaponInventory(startingWeapon);
    this.projectiles = scene.physics.add.group();
    this.dualSlash = new DualElementSystem(player, this.projectiles, enemies, this.projectileExpiresAt, vfx, onSkillUsed, (cue) => this.onCombatFeedback?.(cue));
    this.mines = new MineSystem(scene, player, (e, d, k, pos) => this.damageAndReward(e, d, k, pos, true),
      () => this.onSkillUsed?.('mine', this.lastAim.x), () => this.onCombatFeedback?.('slash'), vfx);
    this.orbital = new OrbitalSystem(scene, player, (e, d, k) => this.damageAndReward(e, d, k),
      (aimX) => this.onSkillUsed?.('orbital', aimX));
  }

  update(nowMs: number, enabled = true, passives: PassiveStats = this.activePassives): void {
    this.activePassives = passives;
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
    this.lastAim = this.dualSlash.update(nowMs, this.inventory.dual_slash, this.activePassives, candidates, this.lastAim);
    if (this.inventory.slash >= 1) this.updateSlash(nowMs, candidates);
    this.orbital.update(nowMs, this.inventory.orbital, this.activePassives, candidates, this.lastAim.x);
    this.mines.update(nowMs, this.inventory.mine, this.lastAim, this.activePassives, candidates);
  }

  handleProjectileHit(projObj: Phaser.GameObjects.GameObject, enemyObj: Phaser.GameObjects.GameObject): void {
    const proj = projObj as Phaser.Physics.Arcade.Sprite;
    const enemy = enemyObj as Phaser.Physics.Arcade.Sprite;
    if (this.dualSlash.handleHit(proj, enemy, (e, d, k, pos) => this.damageAndReward(e, d, k, pos), (p) => this.consumeProjectile(p))) return;
    if (!enemy.active || !this.consumeProjectile(projObj)) return;
    this.vfx?.playRasenganHit(enemy.x, enemy.y);
    const stats = computeWeaponStats('orb', Math.max(1, this.inventory.orb));
    this.damageAndReward(enemy, stats.damage, stats.knockbackPxSec);
  }

  consumeProjectile(projectileObject: Phaser.GameObjects.GameObject): boolean {
    const projectile = projectileObject as Phaser.Physics.Arcade.Sprite;
    if (!projectile.active || !this.projectileExpiresAt.has(projectile)) return false;
    this.projectileExpiresAt.delete(projectile);
    this.dualSlash.deleteShot(projectile);
    projectile.anims?.stop();
    projectile.disableBody(true, true);
    return true;
  }

  clear(): void {
    this.projectileExpiresAt.clear();
    this.dualSlash.clear();
    this.orbital.clear();
    this.mines.clear();
  }

  private updateOrb(nowMs: number, candidates: Candidate[]): void {
    if (!canWeaponFire(this.orbCooldown, nowMs)) return;
    const stats = applyWeaponModifiers(computeWeaponStats('orb', this.inventory.orb), this.activePassives);
    this.orbCooldown.intervalMs = stats.cooldownMs;
    const target = selectNearestTarget(this.player, candidates, stats.rangePx);
    if (!target) return;

    const facingX = target.x < this.player.x ? -1 : 1;
    const hand = { x: this.player.x + facingX * 18, y: this.player.y - 4 };
    this.lastAim = aimDirection(hand, target, this.lastAim);
    const baseAngle = Math.atan2(this.lastAim.y, this.lastAim.x);
    for (let i = 0; i < stats.count; i++) {
      const angle = baseAngle + (i - (stats.count - 1) / 2) * 0.18;
      this.spawnOrb(nowMs, { x: Math.cos(angle), y: Math.sin(angle) }, stats.speedPxSec, hand);
    }
    this.vfx?.playCastFlare(hand.x, hand.y);
    this.onCombatFeedback?.('shoot'); this.onSkillUsed?.('orb', facingX);
    commitWeaponFire(this.orbCooldown, nowMs);
  }

  private spawnOrb(nowMs: number, dir: Vec2, speedPxSec: number, hand: Vec2): void {
    const reuse = this.projectiles.getFirstDead(false) as Phaser.Physics.Arcade.Sprite | null;
    const shot = reuse
      ? (reuse.enableBody(true, hand.x, hand.y, true, true), reuse)
      : (this.projectiles.create(hand.x, hand.y, 'rasengan', 0) as Phaser.Physics.Arcade.Sprite);
    // Keep the previous 10.5px world collision radius while enlarging the artwork.
    shot.setTexture('rasengan').setScale(0.5).setDepth(500_000_050).setCircle(21, 75, 75)
      .setBlendMode('NORMAL').setRotation(0)
      .setVelocity(dir.x * speedPxSec, dir.y * speedPxSec).play('rasengan-spin', true);
    this.projectileExpiresAt.set(shot, nowMs + PROJECTILE.lifeMs);
  }

  private updateSlash(nowMs: number, candidates: Candidate[]): void {
    if (!canWeaponFire(this.slashCooldown, nowMs)) return;
    const base = computeWeaponStats('slash', this.inventory.slash);
    const stats = applyWeaponModifiers(base, this.activePassives);
    this.slashCooldown.intervalMs = stats.cooldownMs;
    const target = selectNearestTarget(this.player, candidates, stats.rangePx);
    if (!target) return;

    const dir = aimDirection(this.player, target, this.lastAim);
    this.lastAim = dir;
    this.vfx?.playPunch(this.player.x + dir.x * 30, this.player.y + dir.y * 30 - 4, dir.x < 0);
    this.onCombatFeedback?.('slash'); this.onSkillUsed?.('slash', dir.x);
    for (const cand of candidates) {
      const dx = cand.x - this.player.x, dy = cand.y - this.player.y, dist = Math.hypot(dx, dy);
      if (dist <= stats.rangePx && (stats.count >= 2 || dist <= 1e-3 || (dx * dir.x + dy * dir.y) / dist >= -0.25)) {
        this.damageAndReward(cand.sprite, base.damage, stats.knockbackPxSec);
      }
    }
    commitWeaponFire(this.slashCooldown, nowMs);
  }

  private damageAndReward(enemy: Phaser.Physics.Arcade.Sprite, baseDamage: number, knockbackPxSec: number, sourcePos?: Vec2, explosive = false): void {
    const rolled = rollCombatDamage(baseDamage, this.activePassives);
    const outcome = this.enemies.damageEnemy(enemy, rolled.damage, knockbackPxSec, sourcePos ?? this.player);
    if (outcome.damaged) this.onCombatFeedback?.('hit', outcome.x, outcome.y, rolled.damage, outcome.killed, rolled.critical, explosive);
    if (outcome.killed) this.onEnemyKilled?.(outcome.x, outcome.y, outcome.archetype, outcome.xpValue);
  }
}
