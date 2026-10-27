import Phaser from 'phaser';
import type { PlayerState } from '../../domain/combat';
import {
  collectPickup,
  createPickupState,
  type PickupCollectionResult,
  type PickupState,
} from '../../domain/pickups';
import type { RunProgression } from '../../domain/progression';
import { PICKUP } from '../config/constants';

export class PickupSystem {
  readonly group: Phaser.Physics.Arcade.Group;
  private nextId = 1;
  private readonly states = new Map<Phaser.Physics.Arcade.Image, PickupState>();

  constructor(scene: Phaser.Scene) {
    this.group = scene.physics.add.group();
  }

  spawnXpGem(x: number, y: number, value: number = PICKUP.xpPerKill): Phaser.Physics.Arcade.Image {
    const gem = this.group.create(x, y, 'gem') as Phaser.Physics.Arcade.Image;
    gem.setScale(2).setDepth(y);
    const state = createPickupState(this.nextId++, 'xp', value, x, y);
    this.states.set(gem, state);
    return gem;
  }

  spawnHealPickup(x: number, y: number, value: number = PICKUP.healAmount): Phaser.Physics.Arcade.Image {
    const heal = this.group.create(x, y, 'gem') as Phaser.Physics.Arcade.Image;
    heal.setScale(2).setTint(0x66ff99).setDepth(y);
    const state = createPickupState(this.nextId++, 'heal', value, x, y);
    this.states.set(heal, state);
    return heal;
  }

  collect(
    pickupObject: Phaser.GameObjects.GameObject,
    playerState: PlayerState,
    progression: RunProgression
  ): PickupCollectionResult {
    const image = pickupObject as Phaser.Physics.Arcade.Image;
    const state = this.states.get(image);
    if (!image.active || !state || state.state !== 'ground') {
      return {
        collected: false,
        levelsGained: 0,
        hpBefore: playerState.hp,
        hpAfter: playerState.hp,
      };
    }
    if (image.body) {
      image.body.enable = false;
    }
    const result = collectPickup(state, playerState, progression);
    if (result.collected) {
      this.states.delete(image);
      image.destroy();
    }
    return result;
  }

  getActivePickups(): PickupState[] {
    return Array.from(this.states.values()).filter((p) => p.state === 'ground');
  }

  clear(): void {
    this.states.clear();
  }
}
