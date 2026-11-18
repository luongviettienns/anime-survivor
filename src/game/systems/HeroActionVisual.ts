import type Phaser from 'phaser';
import type { HeroId } from '../../domain/heroes';
import type { WeaponId } from '../../domain/weapons';
import { KIRITO_ORIGIN_Y, KIRITO_WORLD_SCALE } from '../config/dualElementAssets';

/** Separate visual sprite preserves the player's movement and physics body. */
export class HeroActionVisual {
  private readonly sprite: Phaser.GameObjects.Sprite;

  constructor(
    scene: Phaser.Scene,
    private readonly player: Phaser.Physics.Arcade.Sprite,
    private readonly heroId: HeroId = 'naruto'
  ) {
    this.sprite = heroId === 'kirito'
      ? scene.add.sprite(player.x, player.y, 'kirito_wave_lv1_ice', 'kirito_wave_lv1_ice/000')
          .setOrigin(0.5, KIRITO_ORIGIN_Y).setScale(KIRITO_WORLD_SCALE)
      : scene.add.sprite(player.x, player.y, 'hero_locomotion', 0)
          .setOrigin(0.5, 1408 / 1536).setScale(1 / 16);
    this.sprite.setData('hero-action', true);
    this.player.setVisible(false);
    this.update();
    scene.events.on('postupdate', this.update, this);
    scene.events.once('shutdown', () => { scene.events.off('postupdate', this.update, this); this.sprite.destroy(); });
  }

  play(skill: WeaponId, aimX: number, animOverride?: string): void {
    const key = this.heroId === 'kirito' ? (animOverride ?? 'kirito-wave-lv1') : `naruto-action-${skill}`;
    this.sprite.setFlipX(aimX < 0).setVisible(true).play(key);
    this.player.setVisible(false);
    this.update();
  }

  update(): void {
    if (this.heroId === 'kirito') {
      if (!this.sprite.anims.isPlaying) {
        this.sprite.setTexture('kirito_wave_lv1_ice', 'kirito_wave_lv1_ice/000').setFlipX(this.player.flipX);
      }
      const moving = Boolean(this.player.body && this.player.body.velocity.lengthSq() > 4);
      const bob = moving && !this.sprite.anims.isPlaying ? Math.sin((this.sprite.scene.time?.now ?? 0) / 80) * 1.5 : 0;
      this.sprite.setScale(KIRITO_WORLD_SCALE);
      this.sprite.setPosition(Math.round(this.player.x), Math.round(this.player.y + 28 + bob)).setDepth(this.player.y + 2);
    } else {
      if (!this.sprite.anims.isPlaying) {
        const frame = Number(this.player.frame.name);
        this.sprite.setTexture('hero_locomotion', frame < 14 ? frame : 0).setFlipX(this.player.flipX);
      }
      const metrics = this.sprite.frame.customData as { displayScale?: number };
      this.sprite.setScale(metrics.displayScale ?? 1 / 16);
      this.sprite.setPosition(Math.round(this.player.x), Math.round(this.player.y + 28)).setDepth(this.player.y + 2);
    }
    if (this.player.isTinted) this.sprite.setTint(this.player.tintTopLeft);
    else this.sprite.clearTint();
  }

  clear(): void {
    this.sprite.stop();
    this.update();
  }
}
