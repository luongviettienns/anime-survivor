import Phaser from 'phaser';
import { ENEMY, WORLD } from '../config/constants';
import { unitDirection } from '../../domain/combat';

export class EnemySystem {
  readonly group: Phaser.Physics.Arcade.Group;
  constructor(scene: Phaser.Scene, private readonly target: Phaser.Physics.Arcade.Sprite) {
    this.group = scene.physics.add.group();
  }

  spawn(): void {
    const angle = Math.random() * Math.PI * 2;
    const distance = 360;
    const x = Phaser.Math.Clamp(this.target.x + Math.cos(angle) * distance, 40, WORLD.width - 40);
    const y = Phaser.Math.Clamp(this.target.y + Math.sin(angle) * distance, 40, WORLD.height - 40);
    const enemy = this.group.create(x, y, 'enemy') as Phaser.Physics.Arcade.Sprite;
    enemy.setScale(2).play('enemy-walk');
    enemy.setData('hp', ENEMY.baseHealth);
    enemy.setDepth(5);
    enemy.setCircle(8, 4, 6);
  }

  update(): void {
    for (const object of this.group.getChildren()) {
      const enemy = object as Phaser.Physics.Arcade.Sprite;
      const direction = unitDirection(enemy, this.target);
      enemy.setVelocity(direction.x * ENEMY.baseSpeed, direction.y * ENEMY.baseSpeed);
      enemy.setFlipX(direction.x < 0);
      enemy.setDepth(enemy.y);
    }
  }
}
