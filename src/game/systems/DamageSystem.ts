import Phaser from 'phaser';
import {
  applyContactDamage,
  createPlayerState,
  isPlayerInvulnerable,
  type PlayerState,
} from '../../domain/combat';
import { loadSaveData } from './StorageSystem';
import { ENEMY, PLAYER } from '../config/constants';

export class DamageSystem {
  readonly state: PlayerState;

  constructor(
    private readonly player: Phaser.Physics.Arcade.Sprite,
    maxHealth: number = PLAYER.maxHealth,
    private readonly baseArmor: number = 0,
    private readonly invulnerabilityMs: number = PLAYER.invulnerabilityMs
  ) {
    this.state = createPlayerState(maxHealth);
  }

  tryContactDamage(
    nowMs: number,
    amount: number = ENEMY.touchDamage,
    flatDamageReduction = 0
  ): { damaged: boolean; died: boolean } {
    const damaged = applyContactDamage(
      this.state,
      amount,
      nowMs,
      this.invulnerabilityMs,
      this.baseArmor + flatDamageReduction
    );
    if (!damaged) {
      return { damaged: false, died: false };
    }
    if (this.player.active) {
      this.player.setTint(0xff6677);
    }
    return { damaged: true, died: !this.state.alive };
  }

  updateVisuals(nowMs: number): void {
    if (!this.player.active) return;
    if (isPlayerInvulnerable(this.state, nowMs)) {
      const blinkOn = loadSaveData().settings.reduceFlashing || Math.floor(nowMs / 100) % 2 === 0;
      if (blinkOn) {
        this.player.setTint(0xff6677);
      } else {
        this.player.clearTint();
      }
    } else if (this.player.isTinted) {
      this.player.clearTint();
    }
  }
}
