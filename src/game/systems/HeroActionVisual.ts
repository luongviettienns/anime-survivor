import type Phaser from 'phaser';
import type { HeroId } from '../../domain/heroes';
import type { WeaponId } from '../../domain/weapons';
import { actorAnimation, actorClip, ACTOR_CLIPS, fitActorFrame } from '../config/actorClips';
import { DASH_CLIPS } from '../config/phantomDashAssets';
import { KIRITO_ORIGIN_Y, KIRITO_WORLD_SCALE } from '../config/dualElementAssets';

/** Separate visual sprite preserves the player's movement and physics body. */
export class HeroActionVisual {
  private readonly sprite: Phaser.GameObjects.Sprite;
  private defeated = false;
  constructor(scene: Phaser.Scene, private readonly player: Phaser.Physics.Arcade.Sprite,
    private readonly heroId: HeroId = 'naruto') {
    this.sprite = heroId === 'kirito'
      ? scene.add.sprite(player.x, player.y, 'kirito_wave_lv1_ice', 'kirito_wave_lv1_ice/000')
        .setOrigin(0.5, KIRITO_ORIGIN_Y).setScale(KIRITO_WORLD_SCALE)
      : scene.add.sprite(player.x, player.y, 'hero_locomotion', 0)
        .setOrigin(0.5, 1408 / 1536).setScale(1 / 16);
    this.sprite.setData('hero-action', true); this.player.setVisible(false); this.update();
    scene.events.on('postupdate', this.update, this);
    scene.events.once('shutdown', () => { scene.events.off('postupdate', this.update, this); this.sprite.destroy(); });
  }
  private facing(): string { return (this.player.getData('visual-facing') as string | undefined) ?? 'down'; }
  play(skill: WeaponId, aimX: number, animOverride?: string): void {
    if (this.defeated) return;
    const current = this.sprite.anims.currentAnim?.key ?? '';
    if (this.sprite.anims.isPlaying && current.startsWith('kirito-dash-')) return;
    let key = this.heroId === 'kirito' ? (animOverride ?? 'kirito-wave-lv1') : `naruto-action-${skill}`;
    if (this.heroId === 'kirito' && !animOverride?.startsWith('kirito-dash-') && !key.startsWith('actor-')) {
      const action = skill === 'slash' ? 'basic' : key.replace('kirito-wave-', '');
      const clip = actorClip('kirito', action, this.facing());
      if (clip) key = actorAnimation(clip);
    }
    this.sprite.setOrigin(0.5, key.startsWith('kirito-dash-') ? 0.75 : this.heroId === 'kirito' ? KIRITO_ORIGIN_Y : 1408 / 1536)
      .setFlipX(this.heroId !== 'kirito' && aimX < 0).setVisible(true).play(key);
    this.player.setVisible(false); this.update();
  }
  defeat(done: () => void): boolean {
    const clip = this.heroId === 'kirito' ? actorClip('kirito', 'death', this.facing()) : undefined;
    if (!clip) return false;
    this.defeated = true; this.sprite.play(actorAnimation(clip));
    this.sprite.once('animationcomplete', done); return true;
  }
  update(): void {
    if (this.heroId === 'kirito') {
      if (this.player.getData('actor-hit') && !this.defeated) {
        this.player.setData('actor-hit', false);
        const hit = actorClip('kirito', 'hit', this.facing());
        if (hit) this.sprite.play(actorAnimation(hit));
      }
      let key = this.sprite.anims.currentAnim?.key ?? '';
      const clip = ACTOR_CLIPS[key.replace(/^actor-/, '')];
      const dash = DASH_CLIPS.find(c => c.key === key);
      const busy = this.defeated || (this.sprite.anims.isPlaying && (dash || !clip || !['idle', 'run'].includes(clip.action)));
      if (!busy) {
        const moving = Boolean(this.player.body && this.player.body.velocity.lengthSq() > 4);
        const idle = actorClip('kirito', moving ? 'run' : 'idle', this.facing()) ?? actorClip('kirito', 'idle', this.facing());
        if (idle) this.sprite.play(actorAnimation(idle), true);
        key = this.sprite.anims.currentAnim?.key ?? '';
      }
      if (key.startsWith('actor-')) fitActorFrame(this.sprite);
      else this.sprite.setScale(dash?.scale ?? KIRITO_WORLD_SCALE);
      this.sprite.setPosition(Math.round(this.player.x), Math.round(this.player.y + 28)).setDepth(this.player.y + 2);
    } else {
      if (!this.sprite.anims.isPlaying) {
        const frame = Number(this.player.frame.name);
        this.sprite.setTexture('hero_locomotion', frame < 14 ? frame : 0).setFlipX(this.player.flipX);
      }
      const neutral = this.sprite.texture.get(0).customData as { opaqueHeight?: number };
      this.sprite.setScale(112 / (neutral.opaqueHeight ?? 896));
      this.sprite.setPosition(Math.round(this.player.x), Math.round(this.player.y + 28)).setDepth(this.player.y + 2);
    }
    if (this.player.isTinted) this.sprite.setTint(this.player.tintTopLeft); else this.sprite.clearTint();
  }
  clear(): void { this.sprite.stop(); this.update(); }
}
