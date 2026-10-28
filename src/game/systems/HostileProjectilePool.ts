import Phaser from 'phaser';
import type { Vec2 } from '../../domain/vector';

type BoltMeta = {
  expiresAtMs: number;
  damage: number;
};

export class HostileProjectilePool {
  readonly group: Phaser.Physics.Arcade.Group;
  private readonly bolts = new Map<Phaser.Physics.Arcade.Image, BoltMeta>();

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
    lifeMs = 2200
  ): void {
    for (const dir of directions) {
      const reuse = this.group.getFirstDead(false) as Phaser.Physics.Arcade.Image | null;
      const bolt = reuse
        ? (reuse.enableBody(true, x, y, true, true), reuse)
        : (this.group.create(x, y, 'enemy_bolt') as Phaser.Physics.Arcade.Image);
      bolt
        .setTexture('enemy_bolt')
        .setScale(2)
        .setDepth(2100)
        .setCircle(4, 0, 0)
        .setVelocity(dir.x * speedPxSec, dir.y * speedPxSec);
      this.bolts.set(bolt, { expiresAtMs: nowMs + lifeMs, damage });
    }
  }

  update(
    nowMs: number,
    player: Phaser.Physics.Arcade.Sprite,
    onHitPlayer?: (damage: number) => void
  ): void {
    for (const [bolt, meta] of this.bolts) {
      if (!bolt.active || nowMs >= meta.expiresAtMs) {
        this.consume(bolt);
      }
    }
    if (!player.active || !onHitPlayer || this.bolts.size === 0) return;
    this.scene.physics.overlap(player, this.group, (_p, boltObj) => {
      const bolt = boltObj as Phaser.Physics.Arcade.Image;
      const meta = this.bolts.get(bolt);
      if (!bolt.active || !meta) return;
      this.consume(bolt);
      onHitPlayer(meta.damage);
    });
  }

  consume(bolt: Phaser.Physics.Arcade.Image): void {
    this.bolts.delete(bolt);
    bolt.disableBody(true, true);
  }

  clear(): void {
    this.bolts.clear();
  }
}
