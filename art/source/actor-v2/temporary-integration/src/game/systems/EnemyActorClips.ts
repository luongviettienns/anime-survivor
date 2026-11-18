import type Phaser from 'phaser';
import { actorAnimation, actorClip, fitActorFrame, setActorPose, type ActorClip } from '../config/actorClips';
type Enemy = Phaser.Physics.Arcade.Sprite;
type Entry = { sprite: Phaser.GameObjects.Sprite; until: number; mode: 'hit' | 'cast' };
/** Cosmetic overlays and detached corpses never retain an enemy physics body. */
export class EnemyActorClips {
  private readonly entries = new Map<Enemy, Entry>();
  private readonly pool: Phaser.GameObjects.Sprite[] = [];
  private readonly corpses = new Map<Phaser.GameObjects.Sprite, number>();
  private created = 0;
  constructor(private readonly scene: Phaser.Scene) {
    scene.events.on('postupdate', this.sync, this);
    scene.events.once('shutdown', () => { scene.events.off('postupdate', this.sync, this); this.clear(); });
  }
  private clip(enemy: Enemy, action: string, direction: string): ActorClip | undefined {
    return actorClip(enemy.texture.key, action, direction) ??
      (['enemy_elite', 'boss'].includes(enemy.texture.key) ? actorClip(enemy.texture.key, action, 'down') : undefined);
  }
  private acquire(): Phaser.GameObjects.Sprite | undefined {
    const reused = this.pool.pop(); if (reused) return reused.setActive(true).setVisible(true).setAlpha(1);
    if (this.created >= 64) return undefined;
    this.created++;
    return this.scene.add.sprite(0, 0, 'enemy').setData('actor-overlay', true);
  }
  private entry(enemy: Enemy): Entry | undefined {
    let entry = this.entries.get(enemy);
    if (!entry) {
      const sprite = this.acquire(); if (!sprite) return undefined;
      entry = { sprite, until: 0, mode: 'cast' }; this.entries.set(enemy, entry);
    }
    enemy.setData('actor-overlay-active', true); return entry;
  }
  hit(enemy: Enemy): void {
    const clip = this.clip(enemy, 'hit', enemy.getData('enemy-facing') as string);
    if (!clip) return;
    const entry = this.entry(enemy); if (!entry) return;
    entry.mode = 'hit'; entry.until = this.scene.time.now + clip.durations.reduce((a, b) => a + b, 0);
    entry.sprite.play(actorAnimation(clip));
  }
  pose(enemy: Enemy, casting: boolean, charging: boolean, direction: string): void {
    const entry = this.entries.get(enemy);
    if (entry?.mode === 'hit' && this.scene.time.now < entry.until) return;
    const clip = casting ? this.clip(enemy, 'cast', direction) : undefined;
    if (!clip) { this.release(enemy); return; }
    const cast = this.entry(enemy); if (!cast) return;
    cast.mode = 'cast'; setActorPose(cast.sprite, clip, charging ? 1 : 2);
  }
  defeat(enemy: Enemy): void {
    const clip = this.clip(enemy, 'death', enemy.getData('enemy-facing') as string);
    if (!clip) return;
    this.release(enemy); const sprite = this.acquire(); if (!sprite) return;
    sprite.setPosition(Math.round(enemy.x), Math.round(enemy.y + (enemy.getData('footOffset') as number)))
      .setDepth(enemy.y - 0.5).clearTint().play(actorAnimation(clip));
    fitActorFrame(sprite);
    this.corpses.set(sprite, this.scene.time.now + clip.durations.reduce((a, b) => a + b, 0) + 300);
  }
  private sync(): void {
    for (const [enemy, entry] of this.entries) {
      if (!enemy.active) { this.release(enemy); continue; }
      entry.sprite.setPosition(Math.round(enemy.x), Math.round(enemy.y + (enemy.getData('footOffset') as number)))
        .setDepth(enemy.y + 1); fitActorFrame(entry.sprite); enemy.setVisible(false);
      if (enemy.isTinted) entry.sprite.setTint(enemy.tintTopLeft); else entry.sprite.clearTint();
    }
    for (const [sprite, until] of this.corpses) {
      const left = until - this.scene.time.now;
      if (left <= 0) { this.corpses.delete(sprite); this.recycle(sprite); }
      else { fitActorFrame(sprite); sprite.setAlpha(Math.min(1, left / 200)); }
    }
  }
  private recycle(sprite: Phaser.GameObjects.Sprite): void {
    sprite.stop().setActive(false).setVisible(false).clearTint(); this.pool.push(sprite);
  }
  release(enemy: Enemy): void {
    const entry = this.entries.get(enemy);
    if (entry) { this.recycle(entry.sprite); this.entries.delete(enemy); }
    enemy.setData('actor-overlay-active', false).setVisible(true);
  }
  clear(): void {
    for (const enemy of this.entries.keys()) this.release(enemy);
    for (const sprite of this.corpses.keys()) sprite.destroy(); this.corpses.clear();
    for (const sprite of this.pool) sprite.destroy(); this.pool.length = 0; this.created = 0;
  }
}
