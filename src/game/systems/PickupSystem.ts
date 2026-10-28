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
  private readonly states = new Map<Phaser.Physics.Arcade.Image, PickupState>();

  constructor(scene: Phaser.Scene) {
    this.group = scene.physics.add.group();
  }

  spawnXpGem(x: number, y: number, value: number = PICKUP.xpPerKill): Phaser.Physics.Arcade.Image {
    const gem = this.acquireSprite(x, y);
    const state = createPickupState(this.nextId++, 'xp', value, x, y);
    this.states.set(gem, state);
    return gem;
  }

  spawnHealPickup(
    x: number,
    y: number,
    value: number = PICKUP.healAmount
  ): Phaser.Physics.Arcade.Image {
    const heal = this.acquireSprite(x, y);
    heal.setTint(0x66ff99);
    const state = createPickupState(this.nextId++, 'heal', value, x, y);
    this.states.set(heal, state);
    return heal;
  }

  update(
    playerPos: { x: number; y: number },
    magnetRadius: number = PLAYER.pickupMagnetRadius,
    magnetSpeed: number = PLAYER.pickupMagnetSpeed
  ): void {
    for (const child of this.group.getChildren()) {
      const image = child as Phaser.Physics.Arcade.Image;
      if (!image.active) continue;
      const state = this.states.get(image);
      if (!state || state.state !== 'ground') continue;
      const vel = magnetVelocity(image, playerPos, magnetRadius, magnetSpeed);
      image.setVelocity(vel.x, vel.y);
      image.setDepth(image.y);
      state.x = image.x;
      state.y = image.y;
    }
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
    const result = collectPickup(state, playerState, progression);
    if (result.collected) {
      this.states.delete(image);
      image.disableBody(true, true);
    }
    return result;
  }

  getActivePickups(): PickupState[] {
    return Array.from(this.states.values()).filter((p) => p.state === 'ground');
  }

  clear(): void {
    this.states.clear();
  }

  private acquireSprite(x: number, y: number): Phaser.Physics.Arcade.Image {
    const reuse = this.group.getFirstDead(false) as Phaser.Physics.Arcade.Image | null;
    if (reuse) {
      reuse.enableBody(true, x, y, true, true);
      reuse.setTexture('gem');
      reuse.clearTint();
      reuse.setVelocity(0, 0);
      reuse.setScale(2).setDepth(y);
      return reuse;
    }
    const created = this.group.create(x, y, 'gem') as Phaser.Physics.Arcade.Image;
    created.setScale(2).setDepth(y);
    return created;
  }
}
