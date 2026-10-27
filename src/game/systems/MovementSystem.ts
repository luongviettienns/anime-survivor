import Phaser from 'phaser';
import { movementVelocity } from '../../domain/vector';
import { PLAYER } from '../config/constants';

export class MovementSystem {
  private readonly arrows: Phaser.Types.Input.Keyboard.CursorKeys;
  private readonly wasd: Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;

  constructor(scene: Phaser.Scene, private readonly player: Phaser.Physics.Arcade.Sprite) {
    this.arrows = scene.input.keyboard!.createCursorKeys();
    this.wasd = scene.input.keyboard!.addKeys('W,A,S,D') as typeof this.wasd;
  }

  update(enabled = true): void {
    if (!this.player.active) return;
    if (!enabled) {
      this.player.setVelocity(0, 0);
      this.player.play('hero-idle', true);
      return;
    }
    const inputX =
      Number(this.arrows.right.isDown || this.wasd.D.isDown) -
      Number(this.arrows.left.isDown || this.wasd.A.isDown);
    const inputY =
      Number(this.arrows.down.isDown || this.wasd.S.isDown) -
      Number(this.arrows.up.isDown || this.wasd.W.isDown);
    const velocity = movementVelocity({ x: inputX, y: inputY }, PLAYER.speed);
    this.player.setVelocity(velocity.x, velocity.y);
    const moving = velocity.x !== 0 || velocity.y !== 0;
    this.player.play(moving ? 'hero-walk' : 'hero-idle', true);
    if (inputX !== 0) {
      this.player.setFlipX(inputX < 0);
    }
  }
}
