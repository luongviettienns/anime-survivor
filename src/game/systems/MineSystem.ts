import type Phaser from 'phaser';
import { ART_SCALE } from '../config/artDisplay';
import { canWeaponFire, commitWeaponFire, createWeaponCooldown } from '../../domain/targeting';
import type { PassiveStats } from '../../domain/upgrades';
import type { Vec2 } from '../../domain/vector';
import { applyWeaponModifiers, computeWeaponStats } from '../../domain/weapons';
import type { EnemySystem } from './EnemySystem';
import type { VfxSystem } from './VfxSystem';

type Mine = { sprite: Phaser.GameObjects.Sprite; detonateAtMs: number; damage: number; rangePx: number; knockbackPxSec: number };
type Candidate = ReturnType<EnemySystem['getCandidates']>[number];

export class MineSystem {
  private readonly cooldown = createWeaponCooldown(1200);
  private readonly mines: Mine[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly player: Phaser.Physics.Arcade.Sprite,
    private readonly damage: (enemy: Phaser.Physics.Arcade.Sprite, damage: number, knockback: number, source: Vec2) => void,
    private readonly onPlace: () => void,
    private readonly onDetonate: () => void,
    private readonly vfx?: VfxSystem
  ) {}

  update(nowMs: number, level: number, aim: Vec2, passives: PassiveStats, candidates: Candidate[]): void {
    if (level >= 1) {
      const base = computeWeaponStats('mine', level);
      const stats = applyWeaponModifiers(base, passives);
      this.cooldown.intervalMs = stats.cooldownMs;
      if (canWeaponFire(this.cooldown, nowMs) && this.mines.length < 10) {
        for (let i = 0; i < stats.count; i++) {
          const offset = i === 0 ? -16 : 16;
          const sprite = this.scene.add.sprite(this.player.x + (aim.x < 0 ? -16 : 16) + offset * (stats.count > 1 ? 1 : 0), this.player.y + 28, 'mine', 0)
            .setOrigin(0.5, 0.75).setScale(ART_SCALE.mine ?? 1).setDepth(this.player.y + 1).play('mine-pulse');
          this.mines.push({ sprite, detonateAtMs: nowMs + 2200, damage: base.damage, rangePx: stats.rangePx, knockbackPxSec: stats.knockbackPxSec });
        }
        this.onPlace();
        commitWeaponFire(this.cooldown, nowMs);
      }
    }
    for (let i = this.mines.length - 1; i >= 0; i--) {
      const mine = this.mines[i]!;
      mine.sprite.anims.timeScale = 1 + 3 * Math.max(0, 1 - (mine.detonateAtMs - nowMs) / 2200);
      if (nowMs < mine.detonateAtMs && !candidates.some((c) => c.active && !c.dead && Math.hypot(c.x - mine.sprite.x, c.y - mine.sprite.y) <= 36)) continue;
      const { x, y } = mine.sprite;
      mine.sprite.destroy(); this.mines.splice(i, 1);
      this.vfx?.playExplosion(x, y, mine.rangePx);
      this.onDetonate();
      for (const target of candidates) {
        if (target.active && !target.dead && Math.hypot(target.x - x, target.y - y) <= mine.rangePx) {
          this.damage(target.sprite, mine.damage, mine.knockbackPxSec, { x, y });
        }
      }
    }
  }

  clear(): void {
    for (const mine of this.mines) mine.sprite.destroy();
    this.mines.length = 0;
  }
}
