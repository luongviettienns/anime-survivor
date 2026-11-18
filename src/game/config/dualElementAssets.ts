import type Phaser from 'phaser';

type ClipSpec = {
  atlasKey: string;
  animKey: string;
  durationsMs: readonly number[];
  loop: boolean;
};

export const DUAL_ELEMENT_CLIPS: readonly ClipSpec[] = [
  { atlasKey: 'kirito_wave_lv1_ice', animKey: 'kirito-wave-lv1', durationsMs: [60, 120, 70, 70, 50, 120], loop: false },
  { atlasKey: 'kirito_wave_lv2_sequential', animKey: 'kirito-wave-lv2', durationsMs: [60, 120, 70, 80, 120, 70, 90, 120], loop: false },
  { atlasKey: 'kirito_wave_lv3_x', animKey: 'kirito-wave-lv3', durationsMs: [60, 120, 100, 80, 110, 120], loop: false },
  { atlasKey: 'vfx_ice_wave', animKey: 'vfx-ice-wave', durationsMs: [80, 80], loop: true },
  { atlasKey: 'vfx_dark_fire_wave', animKey: 'vfx-dark-fire-wave', durationsMs: [80, 80], loop: true },
  { atlasKey: 'vfx_dual_element_x', animKey: 'vfx-dual-element-x', durationsMs: [80, 80], loop: true },
  { atlasKey: 'vfx_ice_impact', animKey: 'vfx-ice-impact', durationsMs: [60, 80, 110], loop: false },
  { atlasKey: 'vfx_ice_slow_loop', animKey: 'vfx-ice-slow-loop', durationsMs: [140, 140], loop: true },
  { atlasKey: 'vfx_ice_break', animKey: 'vfx-ice-break', durationsMs: [60, 80, 110], loop: false },
  { atlasKey: 'vfx_dark_fire_impact', animKey: 'vfx-dark-fire-impact', durationsMs: [60, 80, 110], loop: false },
  { atlasKey: 'vfx_dark_fire_burn_loop', animKey: 'vfx-dark-fire-burn-loop', durationsMs: [140, 140], loop: true },
  { atlasKey: 'vfx_dark_fire_end', animKey: 'vfx-dark-fire-end', durationsMs: [60, 80, 110], loop: false },
  { atlasKey: 'vfx_dual_element_impact', animKey: 'vfx-dual-element-impact', durationsMs: [60, 80, 110], loop: false },
];

export const KIRITO_WORLD_SCALE = 0.045;
export const KIRITO_ORIGIN_Y = 1536 / 1792;
export const PHANTOM_DASH_ANIM_KEY = 'kirito-phantom-dash';

export function preloadDualElementAssets(scene: Phaser.Scene): void {
  for (const clip of DUAL_ELEMENT_CLIPS) {
    scene.load.multiatlas(clip.atlasKey, `assets/dual-element/${clip.atlasKey}.atlas.json`, 'assets/dual-element');
  }
}

export function registerDualElementAnimations(scene: Phaser.Scene): void {
  for (const clip of DUAL_ELEMENT_CLIPS) {
    if (scene.anims.exists(clip.animKey)) continue;
    scene.anims.create({
      key: clip.animKey,
      frames: clip.durationsMs.map((duration, idx) => ({
        key: clip.atlasKey,
        frame: `${clip.atlasKey}/${String(idx).padStart(3, '0')}`,
        duration,
      })),
      repeat: clip.loop ? -1 : 0,
    });
  }
}
