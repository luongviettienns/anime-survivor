import { expect, test } from '@playwright/test';
import type Phaser from 'phaser';
import type { WeaponId, WeaponInventory } from '../../src/domain/weapons';

for (const [skill, frames] of [
  ['orb', [14, 15]], ['clone', [16, 17]], ['orbital', [18, 19]], ['mine', [20, 21]],
] as const) {
  test(`${skill} use plays its own two-frame gesture without stopping movement`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    await page.goto('/?play=1');
    await page.waitForFunction(() => Boolean(window.__ANIME_SURVIVOR__));
    await page.evaluate((skill: WeaponId) => {
      const api = window.__ANIME_SURVIVOR__!;
      const scene = api.getScene() as unknown as {
        weapon: { inventory: WeaponInventory }; spawnTimer: Phaser.Time.TimerEvent;
        children: Phaser.GameObjects.DisplayList;
      };
      scene.spawnTimer.paused = true; api.clearEnemies();
      Object.assign(scene.weapon.inventory, { orb: 0, clone: 0, orbital: 0, mine: 0 });
      const hero = scene.children.list.find((child) =>
        (child as Phaser.GameObjects.Sprite).texture?.key === 'hero'
      ) as Phaser.GameObjects.Sprite;
      hero.setData('skill-frames', []);
      const record = (animation: Phaser.Animations.Animation, frame: Phaser.Animations.AnimationFrame) => {
        if (animation.key.startsWith('hero-skill-')) {
          (hero.getData('skill-frames') as number[]).push(Number(frame.textureFrame));
        }
      };
      hero.on('animationstart', record); hero.on('animationupdate', record);
      scene.weapon.inventory[skill] = 1;
      const position = api.getPlayerPosition();
      if (skill === 'orb' || skill === 'clone') api.spawnEnemyAt(position.x + 60, position.y);
    }, skill);
    const state = () => page.evaluate(() => {
      const scene = window.__ANIME_SURVIVOR__!.getScene();
      const hero = scene.children.list.find((child) =>
        (child as Phaser.GameObjects.Sprite).texture?.key === 'hero'
      ) as Phaser.GameObjects.Sprite;
      return { key: hero.anims.currentAnim?.key, seen: hero.getData('skill-frames') as number[] };
    });
    await expect.poll(async () => (await state()).key, { intervals: [10, 20] }).toBe(`hero-skill-${skill}`);
    await page.screenshot({ path: `test-results/naruto-skill-${skill}.png` });
    await page.evaluate(() => {
      const api = window.__ANIME_SURVIVOR__!;
      const scene = api.getScene() as unknown as { weapon: { inventory: WeaponInventory } };
      Object.assign(scene.weapon.inventory, { orb: 0, clone: 0, orbital: 0, mine: 0 });
      api.clearEnemies();
    });
    await page.keyboard.down('w');
    await expect.poll(async () => (await state()).seen).toEqual(expect.arrayContaining([...frames]));
    await expect.poll(async () => (await state()).key).toBe('hero-walk-up');
    expect(await page.evaluate(() => window.__ANIME_SURVIVOR__!.getPlayerVelocity().y)).toBeLessThan(0);
    await page.keyboard.up('w');
    await expect.poll(async () => (await state()).key).toBe('hero-idle-up');
    if (skill === 'mine') {
      await page.evaluate(() => {
        const api = window.__ANIME_SURVIVOR__!;
        const scene = api.getScene() as unknown as {
          weapon: { mines: { mines: { sprite: Phaser.GameObjects.Sprite }[] } };
        };
        const mine = scene.weapon.mines.mines[0]!.sprite;
        api.spawnEnemyAt(mine.x, mine.y);
      });
      await page.waitForFunction(() => window.__ANIME_SURVIVOR__!.getAudioCounts().slash === 1);
      expect(await page.evaluate(() => {
        const scene = window.__ANIME_SURVIVOR__!.getScene() as unknown as {
          enemies: { group: Phaser.Physics.Arcade.Group };
          weapon: { mines: { mines: unknown[] } };
        };
        return { alive: scene.enemies.group.getFirstAlive(), mines: scene.weapon.mines.mines.length };
      })).toEqual({ alive: null, mines: 0 });
      expect((await page.evaluate(() => window.__ANIME_SURVIVOR__!.getAudioCounts())).slash).toBe(1);
    }
    expect(errors).toEqual([]);
  });
}

test('simultaneous skills play once each in order and pause clears pending actions', async ({ page }) => {
  await page.goto('/?play=1');
  await page.waitForFunction(() => Boolean(window.__ANIME_SURVIVOR__));
  const events = () => page.evaluate(() => {
    const scene = window.__ANIME_SURVIVOR__!.getScene();
    const hero = scene.children.list.find((child) =>
      (child as Phaser.GameObjects.Sprite).texture?.key === 'hero'
    ) as Phaser.GameObjects.Sprite;
    return hero.getData('skill-events') as string[];
  });
  await page.evaluate(() => {
    const api = window.__ANIME_SURVIVOR__!;
    const scene = api.getScene() as unknown as {
      weapon: { inventory: WeaponInventory }; spawnTimer: Phaser.Time.TimerEvent;
      movement: { playSkill: (skill: WeaponId, aimX: number) => void };
      children: Phaser.GameObjects.DisplayList;
    };
    scene.spawnTimer.paused = true; api.clearEnemies();
    Object.assign(scene.weapon.inventory, { orb: 0, clone: 0, orbital: 0, mine: 0 });
    const hero = scene.children.list.find((child) =>
      (child as Phaser.GameObjects.Sprite).texture?.key === 'hero'
    ) as Phaser.GameObjects.Sprite;
    hero.setData('skill-events', []);
    hero.on('animationstart', (animation: Phaser.Animations.Animation) => {
      if (animation.key.startsWith('hero-skill-')) (hero.getData('skill-events') as string[]).push(animation.key);
    });
    for (let repeat = 0; repeat < 3; repeat++) {
      for (const skill of ['orb', 'clone', 'orbital', 'mine'] as const) scene.movement.playSkill(skill, -1);
    }
  });
  await expect.poll(events).toEqual(['hero-skill-orb', 'hero-skill-clone', 'hero-skill-orbital', 'hero-skill-mine']);
  await page.evaluate(() => {
    const scene = window.__ANIME_SURVIVOR__!.getScene() as unknown as {
      movement: { playSkill: (skill: WeaponId, aimX: number) => void };
    };
    scene.movement.playSkill('orb', 1); scene.movement.playSkill('clone', 1);
    window.__ANIME_SURVIVOR__!.togglePause();
  });
  await page.waitForFunction(() => window.__ANIME_SURVIVOR__!.isPaused());
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !window.__ANIME_SURVIVOR__!.isPaused());
  await page.waitForTimeout(300);
  expect((await events()).length).toBe(4);
});
