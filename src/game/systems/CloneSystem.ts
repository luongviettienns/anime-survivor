import type Phaser from 'phaser';
import { getCloneLevelSpec, isInsideSweepCone, planCloneFormation } from '../../domain/clones';
import { canWeaponFire, commitWeaponFire, createWeaponCooldown, selectNearestTarget } from '../../domain/targeting';
import type { PassiveStats } from '../../domain/upgrades';
import type { Vec2 } from '../../domain/vector';
import { applyWeaponModifiers, computeWeaponStats } from '../../domain/weapons';
import type { EnemySystem } from './EnemySystem';
import type { VfxSystem } from './VfxSystem';

type Candidate = ReturnType<EnemySystem['getCandidates']>[number];
type ActiveClone = {
  sprite: Phaser.GameObjects.Sprite;
  phase: 'delay' | 'spawn' | 'dash';
  timerMs: number;
  x: number;
  y: number;
  dir: Vec2;
  damage: number;
  hitRadiusPx: number;
  knockbackPxSec: number;
  maxHitsPerClone: number;
};

const SPAWN_MS = 90;
const DASH_MS = 130;
const DASH_SPEED_PX_SEC = 450;
const MAX_POOL = 4;

export class CloneSystem {
  private readonly cooldown = createWeaponCooldown(2200);
  private readonly active: ActiveClone[] = [];
  private readonly pool: Phaser.GameObjects.Sprite[] = [];
  private lastNowMs = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly player: Phaser.Physics.Arcade.Sprite,
    private readonly damage: (enemy: Phaser.Physics.Arcade.Sprite, damage: number, knockback: number, source: Vec2) => void,
    private readonly onCast: (aimX: number) => void,
    private readonly onStrike: () => void,
    private readonly vfx?: VfxSystem
  ) {}

  update(nowMs: number, level: number, passives: PassiveStats, candidates: Candidate[]): void {
    const dtSec = this.lastNowMs > 0 ? Math.min(0.05, Math.max(0, (nowMs - this.lastNowMs) / 1000)) : 0;
    this.lastNowMs = nowMs;
    this.stepActive(dtSec, candidates);
    if (level < 1 || this.active.length > 0 || !canWeaponFire(this.cooldown, nowMs)) return;

    const spec = getCloneLevelSpec(level);
    const stats = applyWeaponModifiers(computeWeaponStats('clone', level), passives);
    this.cooldown.intervalMs = stats.cooldownMs;
    const target = selectNearestTarget(this.player, candidates, stats.rangePx);
    if (!target) return;

    for (const plan of planCloneFormation(this.player, target, level)) {
      const sprite = this.pool.pop() ?? this.scene.add.sprite(0, 0, 'hero', 0).setScale(2).setAlpha(0.86).setTint(0xc7f0ff);
      const clone: ActiveClone = {
        sprite, phase: 'delay', timerMs: plan.launchDelayMs,
        x: plan.spawn.x, y: plan.spawn.y, dir: plan.dir,
        damage: spec.damage, hitRadiusPx: spec.hitRadiusPx,
        knockbackPxSec: spec.knockbackPxSec, maxHitsPerClone: spec.maxHitsPerClone,
      };
      this.active.push(clone);
      if (plan.launchDelayMs <= 0) this.enterSpawn(clone);
      else sprite.setVisible(false);
    }
    this.onCast(target.x - this.player.x);
    commitWeaponFire(this.cooldown, nowMs);
  }

  clear(): void {
    for (const c of this.active) { c.sprite.setVisible(false); c.sprite.destroy(); }
    for (const s of this.pool) { s.setVisible(false); s.destroy(); }
    this.active.length = 0;
    this.pool.length = 0;
    this.lastNowMs = 0;
  }

  private enterSpawn(clone: ActiveClone): void {
    clone.phase = 'spawn';
    clone.timerMs = SPAWN_MS;
    clone.sprite.setPosition(clone.x, clone.y).setFlipX(clone.dir.x < 0).setDepth(clone.y).setVisible(true).play('hero-skill-clone');
    this.vfx?.playSmokePoof(clone.x, clone.y);
  }

  private stepActive(dtSec: number, candidates: Candidate[]): void {
    const dtMs = dtSec * 1000;
    for (let i = this.active.length - 1; i >= 0; i--) {
      const c = this.active[i]!;
      c.timerMs -= dtMs;
      if (c.phase === 'delay') {
        if (c.timerMs <= 0) this.enterSpawn(c);
      } else if (c.phase === 'spawn') {
        if (c.timerMs <= 0) { c.phase = 'dash'; c.timerMs = DASH_MS; }
      } else {
        c.x += c.dir.x * DASH_SPEED_PX_SEC * dtSec;
        c.y += c.dir.y * DASH_SPEED_PX_SEC * dtSec;
        c.sprite.setPosition(c.x, c.y).setDepth(c.y);
        if (c.timerMs <= 0) {
          this.strike(c, candidates);
          this.onStrike();
          this.vfx?.playSmokePoof(c.x, c.y);
          c.sprite.setVisible(false);
          if (this.pool.length < MAX_POOL) this.pool.push(c.sprite);
          else c.sprite.destroy();
          this.active.splice(i, 1);
        }
      }
    }
  }

  private strike(clone: ActiveClone, candidates: Candidate[]): void {
    const pos = { x: clone.x, y: clone.y };
    const hits: Array<{ cand: Candidate; distSq: number }> = [];
    for (const cand of candidates) {
      if (!cand.active || !cand.bodyEnabled || cand.dead || cand.hp <= 0) continue;
      if (!isInsideSweepCone(pos, clone.dir, cand, clone.hitRadiusPx)) continue;
      const dx = cand.x - clone.x, dy = cand.y - clone.y;
      hits.push({ cand, distSq: dx * dx + dy * dy });
    }
    hits.sort((a, b) => a.distSq - b.distSq || a.cand.id - b.cand.id);
    const limit = Math.min(clone.maxHitsPerClone, hits.length);
    const kbSource = { x: clone.x - clone.dir.x * 24, y: clone.y - clone.dir.y * 24 };
    for (let i = 0; i < limit; i++) {
      this.damage(hits[i]!.cand.sprite, clone.damage, clone.knockbackPxSec, kbSource);
    }
  }
}
