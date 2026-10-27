import type { RunProgression } from '../../domain/progression';
import type { GameScene } from '../scenes/GameScene';
import type { DamageSystem } from './DamageSystem';
import type { EnemySystem } from './EnemySystem';
import type { PickupSystem } from './PickupSystem';
import type { WeaponSystem } from './WeaponSystem';

export type GameDebugApi = {
  getScene: () => GameScene;
  getPlayerPosition: () => { x: number; y: number };
  getPlayerVelocity: () => { x: number; y: number };
  getPlayerState: () => { hp: number; maxHp: number; alive: boolean; invulnerableUntilMs: number };
  getProgression: () => RunProgression & { defeated: number };
  getCounts: () => { enemies: number; projectiles: number; pickups: number; colliders: number };
  spawnEnemyAt: (x: number, y: number) => void;
  spawnHealAt: (x: number, y: number, amount?: number) => void;
  clearEnemies: () => void;
};

declare global {
  interface Window {
    __ANIME_SURVIVOR__?: GameDebugApi;
  }
}

export function registerGameDebugApi(
  scene: GameScene,
  player: Phaser.Physics.Arcade.Sprite,
  damage: DamageSystem,
  enemies: EnemySystem,
  weapon: WeaponSystem,
  pickups: PickupSystem,
  getProgression: () => RunProgression & { defeated: number }
): void {
  window.__ANIME_SURVIVOR__ = {
    getScene: () => scene,
    getPlayerPosition: () => ({ x: player.x, y: player.y }),
    getPlayerVelocity: () => ({
      x: player.body?.velocity.x ?? 0,
      y: player.body?.velocity.y ?? 0,
    }),
    getPlayerState: () => ({ ...damage.state }),
    getProgression,
    getCounts: () => ({
      enemies: enemies.group.countActive(true),
      projectiles: weapon.projectiles.countActive(true),
      pickups: pickups.group.countActive(true),
      colliders: scene.physics.world.colliders.length,
    }),
    spawnEnemyAt: (x: number, y: number) => {
      enemies.spawnAt(x, y);
    },
    spawnHealAt: (x: number, y: number, amount?: number) => {
      pickups.spawnHealPickup(x, y, amount);
    },
    clearEnemies: () => {
      enemies.group.clear(true, true);
      enemies.clear();
    },
  };
}
