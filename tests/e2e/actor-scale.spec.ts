import { expect, test } from '@playwright/test';
import type Phaser from 'phaser';
import type { WeaponInventory } from '../../src/domain/weapons';

test('Rasengan actor keeps standing-reference scale and foot position in both original-image poses', async ({ page }) => {
  await page.goto('/?play=1');
  await page.waitForFunction(() => Boolean(window.__ANIME_SURVIVOR__));
  const poses = await page.evaluate(() => {
    const api = window.__ANIME_SURVIVOR__!;
    const scene = api.getScene() as unknown as Phaser.Scene & {
      player: Phaser.Physics.Arcade.Sprite; spawnTimer: Phaser.Time.TimerEvent;
      weapon: { inventory: WeaponInventory };
      movement: { playSkill: (skill: 'orb', aim: number) => void; update: () => void };
    };
    scene.spawnTimer.paused = true; api.clearEnemies();
    Object.assign(scene.weapon.inventory, { orb: 0, clone: 0, orbital: 0, mine: 0 });
    scene.movement.playSkill('orb', 1); scene.movement.update(); scene.scene.pause();
    const sprite = scene.children.list.find((child) => child.getData('hero-action')) as Phaser.GameObjects.Sprite;
    return [0, 1].map((index) => {
      sprite.setFrame(index);
      // Apply the same synchronization path used by the scene update.
      scene.movement.update();
      const data = sprite.frame.customData as { opaqueHeight?: number };
      const standing = sprite.texture.get(0).customData as { opaqueHeight?: number };
      return { referenceHeight: (standing.opaqueHeight ?? 0) * sprite.scaleY, scale: sprite.scaleY, height: (data.opaqueHeight ?? 0) * sprite.scaleY,
        footY: sprite.y, expectedFoot: scene.player.y + 28, bodyWidth: scene.player.body!.width };
    });
  });
  for (const pose of poses) {
    expect(pose.referenceHeight).toBeCloseTo(112, 4);
    expect(pose.scale).toBeCloseTo(poses[0]!.scale, 8);
    expect(pose.footY).toBeCloseTo(pose.expectedFoot, 4);
    expect(pose.bodyWidth).toBeCloseTo(40);
  }
  await page.screenshot({ path: 'test-results/naruto-cast-scale-fixed.png' });
});
