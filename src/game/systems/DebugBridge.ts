import type { EnemyArchetypeId } from '../../domain/enemies';
import type { RunProgression } from '../../domain/progression';
import type { SaveData } from '../../domain/storageSchema';
import type { UpgradeChoice } from '../../domain/upgrades';
import type { WeaponInventory } from '../../domain/weapons';
import type { GameScene } from '../scenes/GameScene';
import type { AudioSystem, SoundCue } from './AudioSystem';
import type { DamageSystem } from './DamageSystem';
import type { EnemySystem } from './EnemySystem';
import type { PickupSystem } from './PickupSystem';
import { loadSaveData } from './StorageSystem';
import type { VfxSystem } from './VfxSystem';
import type { WeaponSystem } from './WeaponSystem';

export type GameDebugApi = {
  getScene: () => GameScene;
  getPlayerPosition: () => { x: number; y: number };
  getPlayerVelocity: () => { x: number; y: number };
  getPlayerState: () => { hp: number; maxHp: number; alive: boolean; invulnerableUntilMs: number };
  getProgression: () => RunProgression & { defeated: number };
  getWeapons: () => WeaponInventory;
  getWeaponInventory: () => WeaponInventory;
  getUpgradeChoices: () => UpgradeChoice[];
  chooseUpgrade: (index: number) => boolean;
  grantXp: (amount: number) => void;
  togglePause: () => boolean;
  isPaused: () => boolean;
  getSaveData: () => SaveData;
  getAudioCounts: () => Record<SoundCue, number>;
  getActiveDamageTexts: () => number;
  getCounts: () => {
    enemies: number;
    projectiles: number;
    enemyProjectiles: number;
    pickups: number;
    colliders: number;
  };
  getBossState: () => { hp: number; maxHp: number; name: string } | null;
  spawnEnemyAt: (x: number, y: number) => void;
  spawnEnemyTypeAt: (type: EnemyArchetypeId, x: number, y: number) => void;
  spawnBossAt: (x: number, y: number) => void;
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
  vfx: VfxSystem,
  audio: AudioSystem,
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
    getWeapons: () => ({ ...weapon.inventory }),
    getWeaponInventory: () => ({ ...weapon.inventory }),
    getUpgradeChoices: () => scene.getUpgradeChoices(),
    chooseUpgrade: (index: number) => scene.chooseUpgrade(index),
    grantXp: (amount: number) => scene.grantXp(amount),
    togglePause: () => scene.togglePause(),
    isPaused: () => scene.isPaused(),
    getSaveData: () => loadSaveData(),
    getAudioCounts: () => audio.getPlayedCounts(),
    getActiveDamageTexts: () => vfx.getActiveDamageTexts(),
    getCounts: () => {
      const collidersQueue = scene.physics.world.colliders;
      const pendingCount =
        (collidersQueue as unknown as { _pending?: unknown[] })._pending?.length ?? 0;
      return {
        enemies: enemies.group.countActive(true),
        projectiles: weapon.projectiles.countActive(true),
        enemyProjectiles: enemies.enemyProjectiles.countActive(true),
        pickups: pickups.group.countActive(true),
        colliders: collidersQueue.getActive().length + pendingCount,
      };
    },
    getBossState: () => enemies.getActiveBossState(),
    spawnEnemyAt: (x: number, y: number) => enemies.spawnAt(x, y, 'slime'),
    spawnEnemyTypeAt: (type: EnemyArchetypeId, x: number, y: number) =>
      enemies.spawnAt(x, y, type),
    spawnBossAt: (x: number, y: number) => enemies.spawnAt(x, y, 'boss'),
    spawnHealAt: (x: number, y: number, amount?: number) =>
      pickups.spawnHealPickup(x, y, amount),
    clearEnemies: () => {
      enemies.group.clear(true, true);
      enemies.enemyProjectiles.clear(true, true);
      enemies.clear();
    },
  };
}
