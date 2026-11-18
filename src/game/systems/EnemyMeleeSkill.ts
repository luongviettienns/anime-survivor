import type Phaser from 'phaser';
import { ART_SCALE } from '../config/artDisplay';
import type { EnemyArchetypeId } from '../../domain/enemies';
import { createMeleeAttack, MELEE, stepMeleeAttack, type MeleeAttack } from '../../domain/meleeAttacks';
import { aimDirection, type Vec2 } from '../../domain/vector';

export type EnemyImpact = { kind: 'slam' | 'dash' | 'bolt' | 'boss_slash'; direction: Vec2 };
type Entry = {
  state: MeleeAttack; pose?: Phaser.GameObjects.Sprite; warning?: Phaser.GameObjects.Graphics;
  effectAt?: number; trail?: Phaser.GameObjects.Sprite[]; trailAt?: number;
  effect?: Phaser.GameObjects.Sprite; facing: string; origin: Vec2;
};

/** Melee timing and overlays leave the monster's original physics body intact. */
export class EnemyMeleeSkill {
  private readonly entries = new Map<Phaser.Physics.Arcade.Sprite, Entry>();
  private elapsed = 0;
  advance(delta: number): void { this.elapsed += delta; }
  private readonly sync = () => {
    for (const [enemy, entry] of this.entries) if (entry.pose?.visible) {
      entry.pose.setPosition(enemy.x, enemy.y + (enemy.getData('footOffset') as number));
    }
  };

  constructor(private readonly scene: Phaser.Scene) {
    scene.events.on('postupdate', this.sync);
    scene.events.once('shutdown', () => scene.events.off('postupdate', this.sync));
  }

  isBusy(enemy: Phaser.Physics.Arcade.Sprite): boolean {
    return (this.entries.get(enemy)?.state.phase ?? 'chase') !== 'chase';
  }

  update(
    enemy: Phaser.Physics.Arcade.Sprite, archetype: EnemyArchetypeId, player: Vec2,
    interrupted: boolean, onHit?: (damage: number, impact?: EnemyImpact) => void,
    enraged = false, elapsedSec = 0
  ): Vec2 | null {
    const now = this.elapsed;
    if (archetype !== 'slime' && archetype !== 'shade' && archetype !== 'boss') return null;
    let entry = this.entries.get(enemy);
    if (!entry) {
      entry = { state: createMeleeAttack(), facing: 'down', origin: { x: enemy.x, y: enemy.y } };
      this.entries.set(enemy, entry);
    }
    const previous = entry.state.phase;
    const step = stepMeleeAttack(archetype, entry.state, enemy, player, now, interrupted, enraged, elapsedSec);
    enemy.setData('melee-phase', step.phase);
    if (step.phase === 'chase') {
      enemy.setVisible(true); entry.pose?.setVisible(false); entry.warning?.setVisible(false);
      entry.effect?.setVisible(false); entry.trail?.forEach((g) => g.setVisible(false));
      return null;
    }
    const cfg = MELEE[archetype];
    const aim = entry.state.aim;
    if (previous === 'chase') {
      entry.origin = { x: enemy.x, y: enemy.y + ((enemy.getData('footOffset') as number | undefined) ?? 0) };
      entry.facing = Math.abs(aim.x) > Math.abs(aim.y) ? 'side' : aim.y < 0 ? 'up' : 'down';
      if (!entry.warning) {
        if (archetype !== 'boss') {
          entry.pose = this.scene.add.sprite(enemy.x, enemy.y, `${enemy.texture.key}_attack`)
            .setScale(0.5).setOrigin(0.5, 0.75).setData('melee-actor', true);
          if (archetype === 'shade') {
            entry.trail = [0, 1].map(() => this.scene.add.sprite(enemy.x, enemy.y, 'enemy_shade_attack')
              .setScale(0.5).setOrigin(0.5, 0.75).setTint(0xa95cec).setAlpha(0.2).setVisible(false).setData('melee-trail', true));
          }
        }
        entry.warning = this.scene.add.graphics().setData('melee-warning', true);
        const tex = archetype === 'boss' ? 'boss_blood_slash' : archetype === 'slime' ? 'slam_wave' : 'shade_claw';
        entry.effect = this.scene.add.sprite(enemy.x, enemy.y, tex).setData('melee-effect', true).setVisible(false);
      }
      this.drawWarning(entry.warning, enemy, entry.origin, archetype, aim, cfg);
    }

    if (entry.pose) {
      const windup = archetype === 'boss' ? MELEE.boss.windup : cfg.windup;
      const frame = step.phase === 'windup' ? (step.elapsed < windup / 4 ? 0 : 1) : step.phase === 'active' ? 2 : 3;
      const offset = entry.facing === 'up' ? 8 : entry.facing === 'side' ? 4 : 0;
      enemy.setVisible(false);
      entry.pose.setFrame(offset + frame).setPosition(enemy.x, enemy.y + (enemy.getData('footOffset') as number))
        .setFlipX(entry.facing === 'side' && aim.x < 0).setDepth(enemy.y + 1).setVisible(true);
      if (enemy.isTinted) entry.pose.setTint(enemy.tintTopLeft); else entry.pose.clearTint();
    }
    const windupTotal = archetype === 'boss' && enraged ? MELEE.boss.enragedWindup : cfg.windup;
    entry.warning!.setVisible(step.phase === 'windup').setAlpha(0.5 + Math.min(1, step.elapsed / windupTotal) * 0.5);
    this.updateEffect(entry, enemy, archetype, step.phase, step.elapsed, step.impact, windupTotal, aim, now);
    if (entry.trail) {
      const offset = entry.facing === 'up' ? 8 : entry.facing === 'side' ? 4 : 0;
      if (step.phase === 'active' && now >= (entry.trailAt ?? 0)) {
        const ghost = entry.trail.shift()!;
        ghost.setFrame(offset + 2).setPosition(entry.pose!.x, entry.pose!.y).setFlipX(entry.pose!.flipX).setDepth(enemy.y - 2).setVisible(true);
        entry.trail.push(ghost); entry.trailAt = now + 60;
      } else if (step.phase !== 'active') entry.trail.forEach((g) => g.setVisible(false));
    }
    if (step.hit) {
      const kind: EnemyImpact['kind'] = archetype === 'boss' ? 'boss_slash' : archetype === 'slime' ? 'slam' : 'dash';
      onHit?.(step.damage, { kind, direction: archetype === 'slime' ? aimDirection(enemy, player) : aim });
    }
    return archetype === 'boss' ? { x: 0, y: 0 } : step.velocity;
  }

  private drawWarning(warning: Phaser.GameObjects.Graphics, enemy: Phaser.Physics.Arcade.Sprite, origin: Vec2,
    archetype: 'slime' | 'shade' | 'boss', aim: Vec2, cfg: (typeof MELEE)['slime'] | (typeof MELEE)['shade'] | (typeof MELEE)['boss']): void {
    warning.clear().setPosition(archetype === 'boss' ? enemy.x : origin.x, archetype === 'boss' ? enemy.y : origin.y)
      .setDepth(enemy.y - 5).setRotation(archetype === 'slime' ? 0 : Math.atan2(aim.y, aim.x));
    const stroke = archetype === 'boss' ? 0xff405a : archetype === 'slime' ? 0xff986c : 0xdc89ff;
    const fill = archetype === 'boss' ? 0xff223d : archetype === 'slime' ? 0xef6655 : 0xc35eea;
    warning.lineStyle(2, stroke, 0.88).fillStyle(fill, 0.18);
    if (archetype === 'slime') { warning.fillCircle(0, 0, cfg.radius).strokeCircle(0, 0, cfg.radius); return; }
    if (archetype === 'boss') {
      const half = (150 * Math.PI) / 360;
      warning.beginPath().moveTo(0, 0).arc(0, 0, cfg.radius, -half, half, false).closePath().fillPath().strokePath();
      return;
    }
    const len = cfg.speed * cfg.active / 1000 + cfg.radius * 2;
    warning.fillRoundedRect(-cfg.radius, -cfg.radius, len, cfg.radius * 2, cfg.radius)
      .strokeRoundedRect(-cfg.radius, -cfg.radius, len, cfg.radius * 2, cfg.radius);
  }

  private updateEffect(entry: Entry, enemy: Phaser.Physics.Arcade.Sprite, archetype: 'slime' | 'shade' | 'boss',
    phase: string, elapsed: number, impact: boolean, windupTotal: number, aim: Vec2, now: number): void {
    const effect = entry.effect!;
    if (impact) entry.effectAt = now;
    const age = now - (entry.effectAt ?? -Infinity);
    if (archetype === 'boss') {
      const show = age >= 0 && age < 260;
      effect.setVisible(show);
      if (!show) return;
      effect.setAlpha(Math.max(0, 1 - age / 260)).setFrame(age < 130 ? 0 : 1)
        .setScale(ART_SCALE.boss_blood_slash ?? 0.6).setPosition(enemy.x + aim.x * 48, enemy.y + aim.y * 48)
        .setRotation(Math.atan2(aim.y, aim.x)).setDepth(enemy.y + 4);
      return;
    }
    const charging = phase === 'windup' && elapsed >= windupTotal - 120;
    effect.setVisible(charging || age < 480);
    if (!charging && age >= 480) return;
    effect.setAlpha(charging ? 0.7 : Math.max(0, 1 - age / 480)).setFrame(charging ? 0 : Math.min(3, 1 + Math.floor(age / 160)))
      .setScale(archetype === 'slime' ? 0.5 : 0.3, archetype === 'slime' ? 0.35 : 0.3)
      .setPosition(archetype === 'slime' ? entry.origin.x : enemy.x + aim.x * 24, archetype === 'slime' ? entry.origin.y : enemy.y + aim.y * 24 - 8)
      .setRotation(archetype === 'slime' ? 0 : Math.atan2(aim.y, aim.x)).setDepth(archetype === 'slime' ? -500_000_000 : enemy.y + (entry.facing === 'up' ? -1 : 2));
  }

  release(enemy: Phaser.Physics.Arcade.Sprite): void {
    const entry = this.entries.get(enemy);
    entry?.trail?.forEach((g) => g.destroy());
    entry?.pose?.destroy(); entry?.warning?.destroy(); entry?.effect?.destroy();
    this.entries.delete(enemy); enemy.setVisible(true).setData('melee-phase', 'chase');
  }
  clear(): void { for (const enemy of this.entries.keys()) this.release(enemy); }
}
