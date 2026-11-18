import Phaser from 'phaser';
import type { EnemyImpact } from './EnemyMeleeSkill';
import type { Vec2 } from '../../domain/vector';

type BoltMeta = {
  expiresAtMs: number;
  damage: number;
  firedAtMs: number;
  handDx: number;
  handDy: number;
  scale: number;
  direction: Vec2;
};

export class HostileProjectilePool {
  readonly group: Phaser.Physics.Arcade.Group;
  private readonly bolts = new Map<Phaser.Physics.Arcade.Sprite, BoltMeta>();

  constructor(private readonly scene: Phaser.Scene) {
    this.group = scene.physics.add.group();
  }

  fire(
    x: number,
    y: number,
    directions: Vec2[],
    speedPxSec: number,
    damage: number,
    nowMs: number,
    hands: readonly Vec2[] = [],
    lifeMs = 2200
  ): void {
    for (const dir of directions) {
      const reuse = this.group.getFirstDead(false) as Phaser.Physics.Arcade.Sprite | null;
      const bolt = reuse
        ? (reuse.enableBody(true, x, y, true, true), reuse)
        : (this.group.create(x, y, 'enemy_bolt', 0) as Phaser.Physics.Arcade.Sprite);
      bolt.setTexture('enemy_bolt', 0);
      const metrics = bolt.frame.customData as { opaqueHeight?: number };
      const scale = (hands.length > 1 ? 26 : 22) / (metrics.opaqueHeight ?? 1280);
      bolt
        .setScale(scale)
        .setDepth(-500_000_010)
        .setRotation(0)
        .setVelocity(dir.x * speedPxSec, dir.y * speedPxSec)
        .play('enemy-bolt-pulse', true);
      const hand = hands[dir.x < 0 ? 0 : hands.length - 1];
      const meta = { expiresAtMs: nowMs + lifeMs, damage, firedAtMs: nowMs,
        handDx: hand ? hand.x - x : 0, handDy: hand ? hand.y - y : 0, scale, direction: dir };
      this.bolts.set(bolt, meta); this.renderFromHand(bolt, meta, nowMs);
      const body = bolt.body as Phaser.Physics.Arcade.Body;
      body.updateFromGameObject(); body.prev.copy(body.position); body.prevFrame.copy(body.position);
    }
  }

  update(
    nowMs: number,
    player: Phaser.Physics.Arcade.Sprite,
    onHitPlayer?: (damage: number, impact?: EnemyImpact) => void
  ): void {
    for (const [bolt, meta] of this.bolts) {
      if (!bolt.active || nowMs >= meta.expiresAtMs) {
        this.consume(bolt);
      } else this.renderFromHand(bolt, meta, nowMs);
    }
    if (!player.active || !onHitPlayer || this.bolts.size === 0) return;
    this.scene.physics.overlap(player, this.group, (_p, boltObj) => {
      const bolt = boltObj as Phaser.Physics.Arcade.Sprite;
      const meta = this.bolts.get(bolt);
      if (!bolt.active || !meta) return;
      this.consume(bolt);
      onHitPlayer(meta.damage, { kind: 'bolt', direction: meta.direction });
    });
  }

  private renderFromHand(bolt: Phaser.Physics.Arcade.Sprite, meta: BoltMeta, nowMs: number): void {
    const remaining = Math.max(0, 1 - (nowMs - meta.firedAtMs) / 150);
    bolt.setOrigin(0.5 - meta.handDx * remaining / (bolt.width * meta.scale),
      0.5 - meta.handDy * remaining / (bolt.height * meta.scale));
    // Offset only the artwork; compensate the body to retain the existing trajectory.
    const radius = 8.5 / meta.scale;
    bolt.setCircle(radius, bolt.displayOriginX - radius, bolt.displayOriginY - radius);
    const body = bolt.body as Phaser.Physics.Arcade.Body;
    body.updateBounds(); body.updateCenter();
  }

  consume(bolt: Phaser.Physics.Arcade.Sprite): void {
    this.bolts.delete(bolt);
    bolt.anims?.stop();
    bolt.disableBody(true, true);
  }

  clear(): void {
    this.bolts.clear();
  }
}
