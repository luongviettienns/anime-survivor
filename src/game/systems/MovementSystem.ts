import Phaser from 'phaser';
import { movementFacing, type Facing } from '../../domain/facing';
import { movementVelocity } from '../../domain/vector';
import type { WeaponId } from '../../domain/weapons';
import { PLAYER } from '../config/constants';
import { HeroActionVisual } from './HeroActionVisual';

export class MovementSystem {
  private facing: Facing = 'down';
  private knockbackRemaining = 0;
  private knockback = { x: 0, y: 0 };
  private readonly scene: Phaser.Scene;
  private readonly pendingSkills = new Map<WeaponId, number>();
  private readonly actionVisual: HeroActionVisual;
  private readonly arrows: Phaser.Types.Input.Keyboard.CursorKeys;
  private readonly wasd: Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;

  constructor(
    scene: Phaser.Scene,
    private readonly player: Phaser.Physics.Arcade.Sprite
  ) {
    this.scene = scene;
    this.actionVisual = new HeroActionVisual(scene, player);
    this.arrows = scene.input.keyboard!.createCursorKeys();
    this.wasd = scene.input.keyboard!.addKeys('W,A,S,D') as typeof this.wasd;
  }

  update(enabled = true, speedBonusPxSec = 0, deltaMs = this.scene.game.loop.delta): void {
    if (!this.player.active) return;
    this.actionVisual.update();
    if (!enabled) {
      this.player.setVelocity(0, 0);
      this.pendingSkills.clear();
      this.actionVisual.clear();
      this.player.anims.stop();
      this.animate(false);
      return;
    }
    if (this.knockbackRemaining > 0) {
      this.knockbackRemaining -= deltaMs;
      this.player.setVelocity(this.knockback.x, this.knockback.y); return;
    }
    const inputX =
      Number(this.arrows.right.isDown || this.wasd.D.isDown) -
      Number(this.arrows.left.isDown || this.wasd.A.isDown);
    const inputY =
      Number(this.arrows.down.isDown || this.wasd.S.isDown) -
      Number(this.arrows.up.isDown || this.wasd.W.isDown);
    const velocity = movementVelocity({ x: inputX, y: inputY }, PLAYER.speed + speedBonusPxSec);
    this.player.setVelocity(velocity.x, velocity.y);
    const moving = velocity.x !== 0 || velocity.y !== 0;
    this.facing = movementFacing({ x: inputX, y: inputY }, this.facing);
    this.animate(moving);
  }

  applyKnockback(direction: { x: number; y: number }, speed: number): void {
    this.knockback = { x: direction.x * speed, y: direction.y * speed };
    this.knockbackRemaining = 140;
  }

  playSkill(skill: WeaponId, aimX: number): void {
    if (!this.player.active) return;
    if (this.player.anims.isPlaying && this.player.anims.currentAnim?.key === `hero-skill-${skill}`) return;
    this.pendingSkills.set(skill, aimX);
  }

  private animate(moving: boolean): void {
    if (this.player.anims.isPlaying && this.player.anims.currentAnim?.key.startsWith('hero-skill-')) return;
    const next = this.pendingSkills.entries().next().value;
    if (next) {
      this.pendingSkills.delete(next[0]);
      this.player.setFlipX(next[1] < 0).play(`hero-skill-${next[0]}`);
      this.actionVisual.play(next[0], next[1]);
      return;
    }
    const side = this.facing === 'left' || this.facing === 'right';
    const animation = moving ? 'walk' : 'idle';
    const suffix = side ? (moving ? '' : '-side') :
      (this.facing === 'down' && !moving ? '' : `-${this.facing}`);
    this.player.setFlipX(this.facing === 'left');
    this.player.play(`hero-${animation}${suffix}`, true);
  }
}
