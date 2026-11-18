import Phaser from 'phaser';
import type { PlayerState } from '../../domain/combat';
import {
  collectPickup,
  createPickupState,
  magnetVelocity,
  type PickupCollectionResult,
  type PickupState,
} from '../../domain/pickups';
import type { RunProgression } from '../../domain/progression';
import { PICKUP, PLAYER } from '../config/constants';

export class PickupSystem {
  readonly group: Phaser.Physics.Arcade.Group;
  private nextId = 1;
  private readonly states = new Map<Phaser.Physics.Arcade.Sprite, PickupState>();
  private readonly globalMagnetized = new Set<Phaser.Physics.Arcade.Sprite>();

  constructor(scene: Phaser.Scene) {
    this.group = scene.physics.add.group();
  }

  spawnXpGem(x: number, y: number, value: number = PICKUP.xpPerKill): Phaser.Physics.Arcade.Sprite {
    const gem = this.acquireSprite(x, y, 'gem', 'gem-gleam');
    this.states.set(gem, createPickupState(this.nextId++, 'xp', value, x, y));
    return gem;
  }

  spawnHealPickup(x: number, y: number, value: number = PICKUP.healAmount): Phaser.Physics.Arcade.Sprite {
    const heal = this.acquireSprite(x, y, 'heal_pickup', 'heal-beat');
    this.states.set(heal, createPickupState(this.nextId++, 'heal', value, x, y));
    return heal;
  }

  spawnMagnetPickup(x: number, y: number): Phaser.Physics.Arcade.Sprite {
    const magnet = this.acquireSprite(x, y, 'icon-stat_magnet');
    this.states.set(magnet, createPickupState(this.nextId++, 'magnet', 1, x, y));
    return magnet;
  }

  activateGlobalMagnet(): void {
    for (const [sprite, state] of this.states) {
      if (sprite.active && state.state === 'ground' && state.type === 'xp') {
        this.globalMagnetized.add(sprite);
      }
    }
  }

  update(
    playerPos: { x: number; y: number },
    magnetRadius: number = PLAYER.pickupMagnetRadius,
    magnetSpeed: number = PLAYER.pickupMagnetSpeed
  ): void {
    for (const child of this.group.getChildren()) {
      const sprite = child as Phaser.Physics.Arcade.Sprite;
      if (!sprite.active) continue;
      const state = this.states.get(sprite);
      if (!state || state.state !== 'ground') continue;
      const pullAll = this.globalMagnetized.has(sprite);
      const vel = magnetVelocity(sprite, playerPos, pullAll ? 1_000_000 : magnetRadius, pullAll ? Math.max(magnetSpeed, 440) : magnetSpeed);
      sprite.setVelocity(vel.x, vel.y).setDepth(sprite.y);
      state.x = sprite.x;
      state.y = sprite.y;
    }
  }

  collect(pickupObject: Phaser.GameObjects.GameObject, playerState: PlayerState, progression: RunProgression): PickupCollectionResult {
    const sprite = pickupObject as Phaser.Physics.Arcade.Sprite;
    const state = this.states.get(sprite);
    if (!sprite.active || !state || state.state !== 'ground') {
      return { collected: false, levelsGained: 0, hpBefore: playerState.hp, hpAfter: playerState.hp };
    }
    const result = collectPickup(state, playerState, progression);
    if (result.collected) {
      this.states.delete(sprite);
      this.globalMagnetized.delete(sprite);
      sprite.anims?.stop();
      sprite.disableBody(true, true);
    }
    return result;
  }

  getActivePickups(): PickupState[] {
    return Array.from(this.states.values()).filter((p) => p.state === 'ground');
  }

  clear(): void {
    this.states.clear();
    this.globalMagnetized.clear();
  }

  private acquireSprite(x: number, y: number, texture: string, animKey?: string): Phaser.Physics.Arcade.Sprite {
    const reuse = this.group.getFirstDead(false) as Phaser.Physics.Arcade.Sprite | null;
    const sprite = reuse
      ? (reuse.enableBody(true, x, y, true, true), reuse)
      : (this.group.create(x, y, texture, 0) as Phaser.Physics.Arcade.Sprite);
    sprite.setTexture(texture).clearTint().setVelocity(0, 0).setDepth(y);
    if (animKey) {
      sprite.setScale(1.61875 / 2).play(animKey, true);
    } else {
      sprite.anims?.stop();
      sprite.setDisplaySize(42, 42);
    }
    (sprite.body as Phaser.Physics.Arcade.Body).setSize(sprite.width / 1.75, sprite.height / 1.75, true);
    return sprite;
  }
}
