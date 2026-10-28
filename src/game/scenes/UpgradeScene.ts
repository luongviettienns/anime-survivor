import Phaser from 'phaser';
import type { PlayerState } from '../../domain/combat';
import type { RunProgression } from '../../domain/progression';
import {
  applyUpgradeChoice,
  rollUpgradeChoices,
  type PassiveStats,
  type UpgradeChoice,
} from '../../domain/upgrades';
import type { WeaponInventory } from '../../domain/weapons';

export type UpgradeSceneData = {
  inventory: WeaponInventory;
  playerState: PlayerState;
  passives: PassiveStats;
  progression: RunProgression;
  onApplied: () => void;
};

export class UpgradeScene extends Phaser.Scene {
  private payload!: UpgradeSceneData;
  private choices: UpgradeChoice[] = [];
  private cardObjects: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super('UpgradeScene');
  }

  create(data: UpgradeSceneData): void {
    this.payload = data;
    this.add.rectangle(480, 270, 960, 540, 0x090b1a, 0.82);
    this.add
      .text(480, 92, 'LEVEL UP! CHOOSE A TECHNIQUE', {
        fontFamily: 'monospace',
        fontSize: '26px',
        color: '#ffcf75',
      })
      .setOrigin(0.5);
    this.add
      .text(480, 130, 'Press [1] [2] [3] or Click a Scroll', {
        fontFamily: 'monospace',
        fontSize: '15px',
        color: '#c4b5fd',
      })
      .setOrigin(0.5);

    const onOne = () => this.selectChoice(0);
    const onTwo = () => this.selectChoice(1);
    const onThree = () => this.selectChoice(2);
    this.input.keyboard?.on('keydown-ONE', onOne);
    this.input.keyboard?.on('keydown-TWO', onTwo);
    this.input.keyboard?.on('keydown-THREE', onThree);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off('keydown-ONE', onOne);
      this.input.keyboard?.off('keydown-TWO', onTwo);
      this.input.keyboard?.off('keydown-THREE', onThree);
    });

    this.rollAndRender();
  }

  getChoices(): UpgradeChoice[] {
    return [...this.choices];
  }

  selectChoice(index: number): boolean {
    const choice = this.choices[index];
    if (!choice || this.payload.progression.pendingUpgrades <= 0) return false;

    applyUpgradeChoice(
      choice.id,
      this.payload.inventory,
      this.payload.playerState,
      this.payload.passives
    );
    this.payload.progression.pendingUpgrades = Math.max(
      0,
      this.payload.progression.pendingUpgrades - 1
    );
    this.payload.onApplied();

    if (this.payload.progression.pendingUpgrades > 0) {
      this.rollAndRender();
    } else {
      this.scene.resume('GameScene');
      this.scene.stop('UpgradeScene');
    }
    return true;
  }

  private rollAndRender(): void {
    for (const obj of this.cardObjects) obj.destroy();
    this.cardObjects = [];
    this.choices = rollUpgradeChoices(this.payload.inventory, 3);

    this.choices.forEach((choice, idx) => {
      const cx = 200 + idx * 280;
      const cy = 295;
      const card = this.add
        .rectangle(cx, cy, 248, 220, 0x1b1934, 0.96)
        .setStrokeStyle(2, 0x9b87f5)
        .setInteractive({ useHandCursor: true });

      card.on('pointerover', () => card.setStrokeStyle(3, 0x5ce1e6));
      card.on('pointerout', () => card.setStrokeStyle(2, 0x9b87f5));
      card.on('pointerdown', () => this.selectChoice(idx));

      const badge = this.add
        .text(cx, cy - 80, `[${idx + 1}]`, {
          fontFamily: 'monospace',
          fontSize: '18px',
          color: '#5ce1e6',
        })
        .setOrigin(0.5);

      const title = this.add
        .text(cx, cy - 30, choice.title, {
          fontFamily: 'monospace',
          fontSize: '16px',
          color: '#ffffff',
          align: 'center',
          wordWrap: { width: 220 },
        })
        .setOrigin(0.5);

      const desc = this.add
        .text(cx, cy + 42, choice.description, {
          fontFamily: 'monospace',
          fontSize: '13px',
          color: '#d8b4fe',
          align: 'center',
          wordWrap: { width: 220 },
        })
        .setOrigin(0.5);

      this.cardObjects.push(card, badge, title, desc);
    });
  }
}
