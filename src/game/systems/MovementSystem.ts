import Phaser from 'phaser';
import { movementFacing, type Facing } from '../../domain/facing';
import { movementVelocity } from '../../domain/vector';
import { PLAYER } from '../config/constants';

export class MovementSystem {
  private facing: Facing = 'down';
  private readonly arrows: Phaser.Types.Input.Keyboard.CursorKeys;
  private readonly wasd: Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;

  constructor(
    scene: Phaser.Scene,
    private readonly player: Phaser.Physics.Arcade.Sprite
  ) {
    this.arrows = scene.input.keyboard!.createCursorKeys();
    this.wasd = scene.input.keyboard!.addKeys('W,A,S,D') as typeof this.wasd;
  }

  update(enabled = true, speedMultiplier = 1): void {
    if (!this.player.active) return;
    if (!enabled) {
      this.player.setVelocity(0, 0);
      this.animate(false);
      return;
    }
    const inputX =
      Number(this.arrows.right.isDown || this.wasd.D.isDown) -
      Number(this.arrows.left.isDown || this.wasd.A.isDown);
    const inputY =
      Number(this.arrows.down.isDown || this.wasd.S.isDown) -
      Number(this.arrows.up.isDown || this.wasd.W.isDown);
    const velocity = movementVelocity({ x: inputX, y: inputY }, PLAYER.speed * speedMultiplier);
    this.player.setVelocity(velocity.x, velocity.y);
    const moving = velocity.x !== 0 || velocity.y !== 0;
    this.facing = movementFacing({ x: inputX, y: inputY }, this.facing);
    this.animate(moving);
  }

  private animate(moving: boolean): void {
    const side = this.facing === 'left' || this.facing === 'right';
    const animation = moving ? 'walk' : 'idle';
    const suffix = side ? (moving ? '' : '-side') :
      (this.facing === 'down' && !moving ? '' : `-${this.facing}`);
    this.player.setFlipX(this.facing === 'left');
    this.player.play(`hero-${animation}${suffix}`, true);
  }
}
