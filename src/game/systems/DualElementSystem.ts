import type Phaser from 'phaser';
import type { DualWaveKind } from '../../domain/statusEffects';
import { canWeaponFire, commitWeaponFire, createWeaponCooldown, selectNearestTarget, type TargetCandidate } from '../../domain/targeting';
import type { PassiveStats } from '../../domain/upgrades';
import { aimDirection, type Vec2 } from '../../domain/vector';
import { applyWeaponModifiers, computeWeaponStats, getDualSlashStage, type WeaponId } from '../../domain/weapons';
import { PROJECTILE } from '../config/constants';
import type { EnemySystem } from './EnemySystem';
import type { VfxSystem } from './VfxSystem';

type Candidate = TargetCandidate & { sprite: Phaser.Physics.Arcade.Sprite };
type PendingWave = {
  fireAtMs: number;
  kind: DualWaveKind;
  level: number;
  damage: number;
  speedPxSec: number;
  knockbackPxSec: number;
  rangePx: number;
  pierceCount: number;
  fallbackDir: Vec2;
};
type ShotMeta = {
  kind: DualWaveKind;
  level: number;
  damage: number;
  knockbackPxSec: number;
  remainingPierce: number;
  hitIds: Set<number>;
};

const WAVE_ART: Record<DualWaveKind, { tex: string; anim: string; impactTex: string; impactAnim: string; scale: number; radius: number }> = {
  ice: { tex: 'vfx_ice_wave', anim: 'vfx-ice-wave', impactTex: 'vfx_ice_impact', impactAnim: 'vfx-ice-impact', scale: 0.055, radius: 360 },
  dark_fire: { tex: 'vfx_dark_fire_wave', anim: 'vfx-dark-fire-wave', impactTex: 'vfx_dark_fire_impact', impactAnim: 'vfx-dark-fire-impact', scale: 0.055, radius: 360 },
  dual_x: { tex: 'vfx_dual_element_x', anim: 'vfx-dual-element-x', impactTex: 'vfx_dual_element_impact', impactAnim: 'vfx-dual-element-impact', scale: 0.075, radius: 420 },
};

export class DualElementSystem {
  private readonly cooldown = createWeaponCooldown(880);
  private readonly queue: PendingWave[] = [];
  private readonly shotMeta = new Map<Phaser.Physics.Arcade.Sprite, ShotMeta>();

  constructor(
    private readonly player: Phaser.Physics.Arcade.Sprite,
    private readonly projectiles: Phaser.Physics.Arcade.Group,
    private readonly enemies: EnemySystem,
    private readonly expiresAt: Map<Phaser.Physics.Arcade.Sprite, number>,
    private readonly vfx?: VfxSystem,
    private readonly onSkillUsed?: (skill: WeaponId, aimX: number, animOverride?: string) => void,
    private readonly onAudioCue?: (cue: 'shoot' | 'slash') => void
  ) {}

  update(nowMs: number, level: number, passives: PassiveStats, candidates: Candidate[], lastAim: Vec2): Vec2 {
    let aim = lastAim;
    if (level >= 1 && canWeaponFire(this.cooldown, nowMs)) {
      const stats = applyWeaponModifiers(computeWeaponStats('dual_slash', level), passives);
      this.cooldown.intervalMs = stats.cooldownMs;
      const target = selectNearestTarget(this.player, candidates, stats.rangePx);
      if (target) {
        aim = aimDirection(this.player, target, lastAim);
        const stage = getDualSlashStage(level);
        this.onSkillUsed?.('dual_slash', aim.x, stage.animKey);
        commitWeaponFire(this.cooldown, nowMs);
        for (const w of stage.waves) {
          this.queue.push({
            fireAtMs: nowMs + w.releaseDelayMs, kind: w.kind, level,
            damage: stats.damage, speedPxSec: stats.speedPxSec, knockbackPxSec: stats.knockbackPxSec,
            rangePx: stats.rangePx, pierceCount: stage.pierceCount, fallbackDir: aim,
          });
        }
      }
    }

    for (let i = this.queue.length - 1; i >= 0; i--) {
      const item = this.queue[i]!;
      if (nowMs < item.fireAtMs) continue;
      this.queue.splice(i, 1);
      const target = selectNearestTarget(this.player, candidates, item.rangePx);
      const dir = target ? aimDirection(this.player, target, item.fallbackDir) : item.fallbackDir;
      this.spawnWave(nowMs, dir, item);
      this.onAudioCue?.('slash');
    }
    return aim;
  }

  handleHit(
    proj: Phaser.Physics.Arcade.Sprite,
    enemy: Phaser.Physics.Arcade.Sprite,
    damageFn: (e: Phaser.Physics.Arcade.Sprite, baseDamage: number, kb: number, sourcePos?: Vec2) => void,
    consumeFn: (proj: Phaser.Physics.Arcade.Sprite) => void
  ): boolean {
    const meta = this.shotMeta.get(proj);
    if (!meta) return false;
    const state = this.enemies.getState(enemy);
    if (!enemy.active || !state || state.dead || meta.hitIds.has(state.id)) return true;

    meta.hitIds.add(state.id);
    meta.remainingPierce -= 1;
    const art = WAVE_ART[meta.kind];
    this.vfx?.playDualEffect(art.impactTex, art.impactAnim, enemy.x, enemy.y, 0.05, 500_000_230);
    this.enemies.applyStatus(enemy, meta.kind, meta.level);
    damageFn(enemy, meta.damage, meta.knockbackPxSec, { x: proj.x, y: proj.y });
    if (meta.remainingPierce <= 0) consumeFn(proj);
    return true;
  }

  hasShot(proj: Phaser.Physics.Arcade.Sprite): boolean { return this.shotMeta.has(proj); }
  deleteShot(proj: Phaser.Physics.Arcade.Sprite): void { this.shotMeta.delete(proj); }

  clear(): void {
    this.queue.length = 0;
    this.shotMeta.clear();
  }

  private spawnWave(nowMs: number, dir: Vec2, item: PendingWave): void {
    const handX = this.player.x + dir.x * 20;
    const handY = this.player.y + dir.y * 20 - 4;
    const art = WAVE_ART[item.kind];
    const reuse = this.projectiles.getFirstDead(false) as Phaser.Physics.Arcade.Sprite | null;
    const shot = reuse
      ? (reuse.enableBody(true, handX, handY, true, true), reuse)
      : (this.projectiles.create(handX, handY, art.tex, `${art.tex}/000`) as Phaser.Physics.Arcade.Sprite);
    shot.setTexture(art.tex, `${art.tex}/000`).setScale(art.scale).setDepth(500_000_060)
      .setCircle(art.radius).setBlendMode('NORMAL').setRotation(Math.atan2(dir.y, dir.x))
      .setVelocity(dir.x * item.speedPxSec, dir.y * item.speedPxSec).play(art.anim, true);
    this.expiresAt.set(shot, nowMs + PROJECTILE.lifeMs);
    this.shotMeta.set(shot, {
      kind: item.kind, level: item.level, damage: item.damage,
      knockbackPxSec: item.knockbackPxSec, remainingPierce: item.pierceCount, hitIds: new Set(),
    });
  }
}
