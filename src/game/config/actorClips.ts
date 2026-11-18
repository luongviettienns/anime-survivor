import type Phaser from 'phaser';
import catalog from './actorClips.json';
import type { Vec2 } from '../../domain/vector';

type ClipFrame = { image: string; origin: number[] };
export type ActorClip = { entity: string; action: string; direction: string; scale: number;
  durations: number[]; loop: boolean; frames: ClipFrame[] };
export const ACTOR_CLIPS: Readonly<Record<string, ActorClip>> = catalog;
const textureKey = (image: string) => `actor/${image}`;
export function actorHeading(direction: Vec2): string {
  return Math.abs(direction.x) >= Math.abs(direction.y)
    ? (direction.x < 0 ? 'left' : 'right') : (direction.y < 0 ? 'up' : 'down');
}
export function actorClip(entity: string, action: string, direction: string): ActorClip | undefined {
  return ACTOR_CLIPS[`${entity}_${action}_${direction}`];
}
export function actorAnimation(clip: ActorClip): string {
  return `actor-${clip.entity}_${clip.action}_${clip.direction}`;
}
export function preloadActorClips(scene: Phaser.Scene): void {
  const images = new Set(Object.values(ACTOR_CLIPS).flatMap(c => c.frames.map(f => f.image)));
  for (const image of images) scene.load.image(textureKey(image), `assets/actor-v2/${image}`);
}
export function registerActorClips(scene: Phaser.Scene): void {
  for (const clip of Object.values(ACTOR_CLIPS)) {
    for (const frame of clip.frames) scene.textures.get(textureKey(frame.image)).get().customData = {
      actorOrigin: frame.origin, actorScale: clip.scale,
    };
    scene.anims.create({ key: actorAnimation(clip), frameRate: 1000, repeat: clip.loop ? -1 : 0,
      frames: clip.frames.map((frame, i) => ({ key: textureKey(frame.image), duration: clip.durations[i] })),
    });
  }
}
export function fitActorFrame(sprite: Phaser.GameObjects.Sprite): void {
  const data = sprite.frame.customData as { actorOrigin?: number[]; actorScale?: number };
  if (data.actorOrigin && data.actorScale) sprite.setOrigin(data.actorOrigin[0]!, data.actorOrigin[1]!)
    .setScale(data.actorScale).setFlipX(false);
}
export function setActorPose(sprite: Phaser.GameObjects.Sprite, clip: ActorClip, index: number): void {
  sprite.stop().setTexture(textureKey(clip.frames[index]!.image)); fitActorFrame(sprite);
}
