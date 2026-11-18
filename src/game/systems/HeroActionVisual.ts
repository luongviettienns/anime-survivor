import type Phaser from 'phaser';
import type { WeaponId } from '../../domain/weapons';

/** Separate visual sprite preserves the player's movement and physics body. */
export class HeroActionVisual {
  private readonly sprite: Phaser.GameObjects.Sprite;

  constructor(scene: Phaser.Scene, private readonly player: Phaser.Physics.Arcade.Sprite) {
    this.sprite = scene.add.sprite(player.x, player.y, 'hero_locomotion', 0)
      .setOrigin(0.5, 1408 / 1536).setScale(1 / 16);
    this.sprite.setData('hero-action', true);
    this.player.setVisible(false);
    this.update();
    scene.events.on('postupdate', this.update, this);
    scene.events.once('shutdown', () => { scene.events.off('postupdate', this.update, this); this.sprite.destroy(); });
  }

  play(skill: WeaponId, aimX: number): void {
    this.sprite.setFlipX(aimX < 0).setVisible(true).play(`naruto-action-${skill}`);
    this.player.setVisible(false);
    this.update();
  }

  update(): void {
    if (!this.sprite.anims.isPlaying) {
      const frame = Number(this.player.frame.name);
      this.sprite.setTexture('hero_locomotion', frame < 14 ? frame : 0)
        .setFlipX(this.player.flipX);
    }
    const metrics = this.sprite.frame.customData as { displayScale?: number };
    this.sprite.setScale(metrics.displayScale ?? 1 / 16);
    this.sprite.setPosition(Math.round(this.player.x), Math.round(this.player.y + 28))
      .setDepth(this.player.y + 2);
    if (this.player.isTinted) this.sprite.setTint(this.player.tintTopLeft);
    else this.sprite.clearTint();
  }

  clear(): void {
    this.sprite.stop();
    this.update();
  }
}
