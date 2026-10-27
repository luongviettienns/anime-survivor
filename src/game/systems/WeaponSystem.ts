import Phaser from 'phaser';
import { PLAYER, PROJECTILE } from '../config/constants';
import { unitDirection } from '../../domain/combat';

export class WeaponSystem {
  readonly projectiles: Phaser.Physics.Arcade.Group;
  private lastAttackMs = 0;

  constructor(private readonly scene: Phaser.Scene, private readonly player: Phaser.Physics.Arcade.Sprite, private readonly enemies: Phaser.Physics.Arcade.Group) {
    this.projectiles = scene.physics.add.group();
  }

  update(now: number): void {
    if (now - this.lastAttackMs < PLAYER.attackIntervalMs) return;
    let nearest: Phaser.Physics.Arcade.Sprite | undefined;
    let nearestDistance = Infinity;
    for (const object of this.enemies.getChildren()) {
      const enemy = object as Phaser.Physics.Arcade.Sprite;
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y);
      if (distance < nearestDistance) {
        nearest = enemy;
        nearestDistance = distance;
      }
    }
    if (!nearest || nearestDistance > 520) return;
    const direction = unitDirection(this.player, nearest);
    const shot = this.projectiles.create(this.player.x, this.player.y, 'orb') as Phaser.Physics.Arcade.Image;
    shot.setScale(2).setDepth(2000);
    shot.setVelocity(direction.x * PROJECTILE.speed, direction.y * PROJECTILE.speed);
    this.scene.time.delayedCall(PROJECTILE.lifeMs, () => { if (shot.active) shot.destroy(); });
    this.lastAttackMs = now;
  }
}
