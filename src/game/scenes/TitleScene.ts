import Phaser from 'phaser';
import { loadSaveData } from '../systems/StorageSystem';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('TitleScene');
  }

  create(): void {
    const save = loadSaveData();
    this.cameras.main.setBackgroundColor('#0b1128');

    this.add
      .rectangle(480, 270, 860, 440, 0x131936, 0.94)
      .setStrokeStyle(2, 0x5ce1e6);

    this.add
      .text(480, 120, 'ANIME SURVIVOR: SHINOBI CHRONICLES', {
        fontFamily: 'monospace',
        fontSize: '32px',
        color: '#ffcf75',
      })
      .setOrigin(0.5);

    this.add
      .text(
        480,
        210,
        `Best Kills: ${save.stats.bestKills}   |   Best Survival: ${save.stats.bestSurvivalSec}s   |   Victories: ${save.stats.victories}`,
        {
          fontFamily: 'monospace',
          fontSize: '18px',
          color: '#eeeeff',
        }
      )
      .setOrigin(0.5);

    const { muted, reduceFlashing, reduceScreenShake } = save.settings;
    this.add
      .text(
        480,
        270,
        `Mute: ${muted ? 'ON' : 'OFF'}  |  Reduce Flash: ${reduceFlashing ? 'ON' : 'OFF'}  |  Reduce Shake: ${reduceScreenShake ? 'ON' : 'OFF'}`,
        {
          fontFamily: 'monospace',
          fontSize: '15px',
          color: '#c4b5fd',
        }
      )
      .setOrigin(0.5);

    this.add
      .text(480, 380, 'Press ENTER or SPACE to Start', {
        fontFamily: 'monospace',
        fontSize: '22px',
        color: '#5ce1e6',
      })
      .setOrigin(0.5);

    const onStart = () => {
      this.scene.start('GameScene');
    };

    this.input.keyboard?.on('keydown-ENTER', onStart);
    this.input.keyboard?.on('keydown-SPACE', onStart);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off('keydown-ENTER', onStart);
      this.input.keyboard?.off('keydown-SPACE', onStart);
    });
  }
}
