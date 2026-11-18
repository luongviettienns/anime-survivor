import Phaser from 'phaser';
import { ART_FRAMES, ART_SCALE } from '../config/artDisplay';
import { targetFacing, type Facing } from '../../domain/facing';
import type { EnemyArchetypeId } from '../../domain/enemies';
import type { Vec2 } from '../../domain/vector';
import { EnemyAura } from './EnemyAura';
import { fitEnemyPose, positionEnemyHand, type PoseMetrics } from './EnemyPose';

type CastDisplay = { glows: Phaser.GameObjects.Sprite[]; untilMs: number; facing: Facing };

export class EnemyVisuals {
  private readonly auras = new Map<Phaser.Physics.Arcade.Sprite, EnemyAura>();
  private readonly telegraphs = new Map<Phaser.Physics.Arcade.Sprite, Phaser.GameObjects.Sprite>();
  private readonly pool: Phaser.GameObjects.Sprite[] = [];
  private readonly casts = new Map<Phaser.Physics.Arcade.Sprite, CastDisplay>();

  constructor(private readonly scene: Phaser.Scene) {}

  spawn(enemy: Phaser.Physics.Arcade.Sprite, archetype: EnemyArchetypeId): void {
    this.release(enemy);
    enemy.setData('fittedFrame', null).setData('enemy-facing', 'down');
    fitEnemyPose(enemy);
    if (archetype === 'boss') this.auras.set(enemy, new EnemyAura(this.scene, 0xff344c));
    else if (archetype === 'elite') this.auras.set(enemy, new EnemyAura(this.scene, 0xb84dff));
    if (archetype === 'boss' || archetype === 'mage') {
      const glows = Array.from({ length: archetype === 'boss' ? 2 : 1 }, () => this.scene.add.sprite(enemy.x, enemy.y, 'enemy_bolt', 0)
        .setData('enemy-hand-charge', true).setData('caster', enemy).setVisible(false).play('enemy-bolt-pulse'));
      this.casts.set(enemy, { glows, untilMs: 0, facing: 'down' });
    }
  }

  update(enemy: Phaser.Physics.Arcade.Sprite, archetype: EnemyArchetypeId,
    telegraphing: boolean, fired: boolean, enraged: boolean, hit: boolean, target: Vec2): void {
    const cast = this.casts.get(enemy);
    const previous = enemy.getData('enemy-facing') as Facing;
    let facing = targetFacing({ x: target.x - enemy.x, y: target.y - enemy.y }, previous);
    if (cast && this.scene.time.now < cast.untilMs && !telegraphing && !fired) facing = cast.facing;
    if (cast && fired) { cast.untilMs = this.scene.time.now + 200; cast.facing = facing; }
    enemy.setData('enemy-facing', facing).setFlipX(facing === 'left');
    const suffix = facing === 'up' ? '-up' : facing === 'left' || facing === 'right' ? '-side' : '';
    const ranges = ART_FRAMES[enemy.texture.key];
    if (cast && (telegraphing || this.scene.time.now < cast.untilMs)) {
      const frames = ranges?.[`cast${suffix}`] ?? ranges?.cast;
      enemy.anims.stop(); enemy.setFrame(frames?.[telegraphing ? 0 : 1] ?? 4);
    } else {
      const key = `${enemy.texture.key.replaceAll('_', '-')}-walk`;
      if (enemy.body && enemy.body.velocity.lengthSq() > 1) enemy.play(key + suffix, true);
      else { enemy.anims.stop(); enemy.setFrame((ranges?.[`walk${suffix}`] ?? ranges?.walk)?.[0] ?? 0); }
    }
    fitEnemyPose(enemy); this.auras.get(enemy)?.follow(enemy);
    if (hit) enemy.setTint(0xffffff);
    else if (enraged) enemy.setTint(0xff7799);
    else if (enemy.isTinted) enemy.clearTint();
    if (cast) for (let index = 0; index < cast.glows.length; index++) {
      const glow = cast.glows[index]!;
      const placed = positionEnemyHand(enemy, index, glow);
      const releasing = this.scene.time.now < cast.untilMs - 120;
      const height = (glow.frame.customData as PoseMetrics).opaqueHeight ?? 1280;
      glow.setVisible(placed && (telegraphing || releasing)).setScale((archetype === 'boss' ? 12 : 9) / height)
        .setAlpha(telegraphing ? 0.8 : 0.55).setDepth(enemy.depth + (facing === 'up' ? -0.1 : 0.1));
    }
    if (!telegraphing) { this.releaseTelegraph(enemy); return; }
    let sigil = this.telegraphs.get(enemy);
    if (!sigil) {
      sigil = this.pool.pop() ?? this.scene.add.sprite(enemy.x, enemy.y, 'vfx_telegraph');
      sigil.setActive(true).setVisible(true).setBlendMode(Phaser.BlendModes.NORMAL).play('vfx-telegraph-charge', true);
      this.telegraphs.set(enemy, sigil);
    }
    sigil.setScale((ART_SCALE.vfx_telegraph ?? 1) * (archetype === 'boss' ? 0.9 : 0.5)).setAlpha(0.75)
      .setPosition(Math.round(enemy.x), Math.round(enemy.y + (enemy.getData('footOffset') as number))).setDepth(enemy.y - 1);
  }

  projectileHands(enemy: Phaser.Physics.Arcade.Sprite): Vec2[] {
    return this.casts.get(enemy)?.glows.map(({ x, y }) => ({ x, y })) ?? [];
  }

  release(enemy: Phaser.Physics.Arcade.Sprite): void {
    this.releaseTelegraph(enemy);
    for (const glow of this.casts.get(enemy)?.glows ?? []) glow.destroy();
    this.casts.delete(enemy); this.auras.get(enemy)?.destroy(); this.auras.delete(enemy);
  }

  clear(): void {
    for (const enemy of this.telegraphs.keys()) this.releaseTelegraph(enemy);
    for (const aura of this.auras.values()) aura.destroy();
    for (const cast of this.casts.values()) for (const glow of cast.glows) glow.destroy();
    this.auras.clear(); this.casts.clear();
  }

  private releaseTelegraph(enemy: Phaser.Physics.Arcade.Sprite): void {
    const sprite = this.telegraphs.get(enemy);
    if (!sprite) return;
    this.telegraphs.delete(enemy); sprite.anims.stop();
    sprite.setActive(false).setVisible(false); this.pool.push(sprite);
  }
}
