import type Phaser from 'phaser';
import type { Vec2 } from '../../domain/vector';

export const DASH_CLIPS = [
  {
    "direction": "down",
    "key": "kirito-dash-down",
    "atlas": "kirito_dash_down",
    "scale": 0.10486891385767791,
    "durations": [
      20,
      30,
      65,
      40,
      25
    ],
    "ghostFrame": 2
  },
  {
    "direction": "up",
    "key": "kirito-dash-up",
    "atlas": "kirito_dash_up",
    "scale": 0.10181818181818182,
    "durations": [
      20,
      30,
      65,
      40,
      25
    ],
    "ghostFrame": 2
  },
  {
    "direction": "left",
    "key": "kirito-dash-left",
    "atlas": "kirito_dash_left",
    "scale": 0.0986784140969163,
    "durations": [
      20,
      30,
      100,
      30
    ],
    "ghostFrame": 2
  },
  {
    "direction": "right",
    "key": "kirito-dash-right",
    "atlas": "kirito_dash_right",
    "scale": 0.09655172413793103,
    "durations": [
      25,
      120,
      35
    ],
    "ghostFrame": 1
  }
] as const;
export function dashClip(direction: Vec2) {
  const heading = Math.abs(direction.x) >= Math.abs(direction.y)
    ? (direction.x < 0 ? 'left' : 'right') : (direction.y < 0 ? 'up' : 'down');
  return DASH_CLIPS.find((clip) => clip.direction === heading)!;
}
export function preloadDashAssets(scene: Phaser.Scene): void {
  for (const clip of DASH_CLIPS) scene.load.multiatlas(clip.key,
    `assets/actor-v2/${clip.atlas}.atlas.json`, 'assets/actor-v2');
}
export function registerDashAnimations(scene: Phaser.Scene): void {
  for (const clip of DASH_CLIPS) scene.anims.create({
    key: clip.key, frameRate: 1000, repeat: 0,
    frames: clip.durations.map((duration, index) => ({ key: clip.key,
      frame: `${clip.atlas}/${String(index).padStart(3, '0')}`, duration })),
  });
}
