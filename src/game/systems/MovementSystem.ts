import Phaser from 'phaser';
import { PLAYER } from '../config/constants';

export class MovementSystem {
  private readonly arrows: Phaser.Types.Input.Keyboard.CursorKeys;
  private readonly wasd: Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;
  constructor(scene: Phaser.Scene, private readonly player: Phaser.Physics.Arcade.Sprite) {
    this.arrows = scene.input.keyboard!.createCursorKeys();
    this.wasd = scene.input.keyboard!.addKeys('W,A,S,D') as typeof this.wasd;
  }
  update(): void {
    const x = Number(this.arrows.right.isDown || this.wasd.D.isDown) - Number(this.arrows.left.isDown || this.wasd.A.isDown);
    const y = Number(this.arrows.down.isDown || this.wasd.S.isDown) - Number(this.arrows.up.isDown || this.wasd.W.isDown);
    const length = Math.hypot(x, y) || 1;
    this.player.setVelocity((x / length) * PLAYER.speed, (y / length) * PLAYER.speed);
    this.player.play(x || y ? 'hero-walk' : 'hero-idle', true);
    if (x) this.player.setFlipX(x < 0);
  }
}
