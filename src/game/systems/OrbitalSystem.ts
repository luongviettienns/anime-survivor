import type Phaser from 'phaser';
import { ART_SCALE } from '../config/artDisplay';
import type { PassiveStats } from '../../domain/upgrades';
import { applyWeaponModifiers, computeWeaponStats } from '../../domain/weapons';
import type { EnemySystem } from './EnemySystem';

type Candidate = ReturnType<EnemySystem['getCandidates']>[number];

export class OrbitalSystem {
  private readonly orbitals: Phaser.GameObjects.Sprite[] = [];
  private readonly orbitalGhosts: Phaser.GameObjects.Sprite[] = [];
  private readonly orbitalHitUntil = new Map<number, number>();
  private readonly orbitRing: Phaser.GameObjects.Graphics;
  private ringRadiusPx = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly player: Phaser.Physics.Arcade.Sprite,
    private readonly damage: (enemy: Phaser.Physics.Arcade.Sprite, damage: number, knockback: number) => void,
    private readonly onUse: (aimX: number) => void
  ) { this.orbitRing = scene.add.graphics().setDepth(-500_000_000); }

  update(nowMs: number, level: number, passives: PassiveStats, candidates: Candidate[], aimX: number): void {
    if (level < 1) {
      if (this.ringRadiusPx !== 0) { this.orbitRing.clear(); this.ringRadiusPx = 0; }
      for (const sprite of this.orbitals) sprite.setVisible(false);
      for (const sprite of this.orbitalGhosts) sprite.setVisible(false);
      return;
    }
    const base = computeWeaponStats('orbital', level);
    const stats = applyWeaponModifiers(base, passives);
    if (this.orbitals.length < stats.count) this.onUse(aimX);
    while (this.orbitals.length < stats.count) {
      this.orbitals.push(this.scene.add.sprite(this.player.x, this.player.y, 'shuriken', 0).setScale(ART_SCALE.shuriken ?? 1).setDepth(500_000_060).play('shuriken-spin'));
      this.orbitalGhosts.push(this.scene.add.sprite(this.player.x, this.player.y, 'shuriken', 1).setScale(ART_SCALE.shuriken ?? 1).setAlpha(0.28).setDepth(500_000_055).play('shuriken-spin'));
    }
    for (let i = stats.count; i < this.orbitals.length; i++) {
      this.orbitals[i]!.setVisible(false);
      this.orbitalGhosts[i]!.setVisible(false);
    }
    if (this.ringRadiusPx !== stats.rangePx) {
      this.ringRadiusPx = stats.rangePx;
      this.orbitRing.clear().lineStyle(1, 0xcbcdd9, 0.25).strokeCircle(0, 0, stats.rangePx);
    }
    this.orbitRing.setPosition(this.player.x, this.player.y);
    if (this.orbitalHitUntil.size > 64) {
      for (const [id, until] of this.orbitalHitUntil) if (nowMs >= until) this.orbitalHitUntil.delete(id);
    }
    const baseAngle = (nowMs / 1000) * stats.speedPxSec;
    for (let i = 0; i < stats.count; i++) {
      const angle = baseAngle + (i * Math.PI * 2) / stats.count;
      const bx = this.player.x + Math.cos(angle) * stats.rangePx, by = this.player.y + Math.sin(angle) * stats.rangePx;
      this.orbitals[i]!.setPosition(bx, by).setVisible(true);
      this.orbitalGhosts[i]!.setPosition(this.player.x + Math.cos(angle - 0.24) * stats.rangePx, this.player.y + Math.sin(angle - 0.24) * stats.rangePx).setVisible(true);
      for (const cand of candidates) {
        if (!cand.active || cand.dead || Math.hypot(cand.x - bx, cand.y - by) > 30) continue;
        if (nowMs < (this.orbitalHitUntil.get(cand.id) ?? Number.NEGATIVE_INFINITY)) continue;
        this.orbitalHitUntil.set(cand.id, nowMs + stats.cooldownMs);
        this.onUse(cand.x - this.player.x);
        this.damage(cand.sprite, base.damage, stats.knockbackPxSec);
      }
    }
  }

  clear(): void {
    this.orbitalHitUntil.clear();
    for (const blade of this.orbitals) blade.destroy();
    for (const ghost of this.orbitalGhosts) ghost.destroy();
    this.orbitals.length = 0; this.orbitalGhosts.length = 0;
    this.orbitRing.clear();
    this.ringRadiusPx = 0;
  }
}
