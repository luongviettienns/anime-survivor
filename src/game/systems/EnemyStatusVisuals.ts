import type Phaser from 'phaser';
import {
  applyBurnStatus,
  applySlowStatus,
  computeEffectiveEnemySpeed,
  createEnemyStatusState,
  getDualSlashStatusConfig,
  stepEnemyStatus,
  type DualWaveKind,
  type EnemyStatusState,
} from '../../domain/statusEffects';
import type { VfxSystem } from './VfxSystem';

type EnemySprite = Phaser.Physics.Arcade.Sprite;

const STATUS_SCALE = 0.0735;
const END_SCALE = 0.048;

export class EnemyStatusVisuals {
  private readonly statuses = new Map<EnemySprite, EnemyStatusState>();
  private readonly slowLoops = new Map<EnemySprite, Phaser.GameObjects.Sprite>();
  private readonly burnLoops = new Map<EnemySprite, Phaser.GameObjects.Sprite>();
  private readonly pool: Phaser.GameObjects.Sprite[] = [];

  constructor(private readonly scene: Phaser.Scene) {}

  init(enemy: EnemySprite): void {
    this.release(enemy);
    this.statuses.set(enemy, createEnemyStatusState());
  }

  applyWaveStatus(enemy: EnemySprite, kind: DualWaveKind, level: number, nowMs: number): void {
    let state = this.statuses.get(enemy);
    if (!state) {
      state = createEnemyStatusState();
      this.statuses.set(enemy, state);
    }
    const cfg = getDualSlashStatusConfig(level);
    if (kind === 'ice' || kind === 'dual_x') {
      applySlowStatus(state, cfg.slowReductionPxSec, cfg.slowDurationMs, nowMs);
    }
    if (kind === 'dark_fire' || kind === 'dual_x') {
      applyBurnStatus(state, cfg.burnDamagePerTick, cfg.burnDurationMs, nowMs);
    }
  }

  getState(enemy: EnemySprite): EnemyStatusState | undefined {
    return this.statuses.get(enemy);
  }

  effectiveSpeed(enemy: EnemySprite, baseSpeed: number, nowMs: number): number {
    const state = this.statuses.get(enemy);
    return state ? computeEffectiveEnemySpeed(baseSpeed, state, nowMs) : baseSpeed;
  }

  step(enemy: EnemySprite, nowMs: number, vfx?: VfxSystem): number {
    const state = this.statuses.get(enemy);
    if (!state) return 0;
    const res = stepEnemyStatus(state, nowMs);
    const footOffset = (enemy.getData('footOffset') as number | undefined) ?? 12;
    const footY = Math.round(enemy.y + footOffset);
    const torsoY = Math.round(enemy.y - 2);

    this.syncLoop(enemy, this.slowLoops, res.slowActive, 'vfx_ice_slow_loop', 'vfx-ice-slow-loop', Math.round(enemy.x), footY, enemy.depth + 0.15);
    if (res.slowExpired) vfx?.playDualEffect('vfx_ice_break', 'vfx-ice-break', Math.round(enemy.x), footY, END_SCALE, enemy.depth + 0.25);

    this.syncLoop(enemy, this.burnLoops, res.burnActive, 'vfx_dark_fire_burn_loop', 'vfx-dark-fire-burn-loop', Math.round(enemy.x), torsoY, enemy.depth + 0.2);
    if (res.burnExpired) vfx?.playDualEffect('vfx_dark_fire_end', 'vfx-dark-fire-end', Math.round(enemy.x), torsoY, END_SCALE, enemy.depth + 0.25);

    return res.burnDamage;
  }

  release(enemy: EnemySprite): void {
    this.statuses.delete(enemy);
    this.releaseMap(this.slowLoops, enemy);
    this.releaseMap(this.burnLoops, enemy);
  }

  clear(): void {
    this.statuses.clear();
    for (const enemy of this.slowLoops.keys()) this.releaseMap(this.slowLoops, enemy);
    for (const enemy of this.burnLoops.keys()) this.releaseMap(this.burnLoops, enemy);
  }

  private syncLoop(enemy: EnemySprite, map: Map<EnemySprite, Phaser.GameObjects.Sprite>, active: boolean,
    texture: string, animKey: string, x: number, y: number, depth: number): void {
    if (!active) { this.releaseMap(map, enemy); return; }
    let sprite = map.get(enemy);
    if (!sprite) {
      if (!this.scene.anims?.exists(animKey)) return;
      sprite = this.pool.pop() ?? this.scene.add.sprite(x, y, texture);
      sprite.setTexture(texture).setActive(true).setVisible(true).setAlpha(0.9).play(animKey, true);
      map.set(enemy, sprite);
    }
    sprite.setScale(STATUS_SCALE).setPosition(x, y).setDepth(depth);
  }

  private releaseMap(map: Map<EnemySprite, Phaser.GameObjects.Sprite>, enemy: EnemySprite): void {
    const sprite = map.get(enemy);
    if (!sprite) return;
    map.delete(enemy);
    sprite.anims.stop();
    sprite.setActive(false).setVisible(false);
    this.pool.push(sprite);
  }
}
