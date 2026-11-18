import Phaser from 'phaser';
import type { HeroId } from '../../domain/heroes';
import { saveRunResult } from '../systems/StorageSystem';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOverScene');
  }

  create(data: { victory?: boolean; score?: number; survivalSec?: number; heroId?: HeroId }): void {
    this.cameras.main.setZoom(this.scale.width / 960).centerOn(480, 270);
    const saved = saveRunResult({
      kills: data.score ?? 0,
      survivalSec: Math.floor(data.survivalSec ?? 0),
      victory: Boolean(data.victory),
    });

    this.cameras.main.setBackgroundColor('#0d1023');
    this.add
      .text(480, 150, data.victory ? 'VICTORY!' : 'GAME OVER', {
        fontFamily: 'monospace',
        fontSize: '52px',
        color: '#ffcf75',
      })
      .setOrigin(0.5);

    this.add
      .text(480, 235, `Defeated: ${data.score ?? 0}`, {
        fontFamily: 'monospace',
        fontSize: '24px',
        color: '#eeeeff',
      })
      .setOrigin(0.5);

    this.add
      .text(
        480,
        285,
        `Best Kills: ${saved.stats.bestKills} | Victories: ${saved.stats.victories}`,
        {
          fontFamily: 'monospace',
          fontSize: '18px',
          color: '#5ce1e6',
        }
      )
      .setOrigin(0.5);

    this.add
      .text(480, 355, 'Press ENTER to play again | Press T for Title', {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#a8a6dd',
      })
      .setOrigin(0.5);

    const onEnter = () => this.scene.start('GameScene', { heroId: data.heroId ?? 'naruto' });
    const onTitle = () => this.scene.start('TitleScene');
    this.input.keyboard?.on('keydown-ENTER', onEnter);
    this.input.keyboard?.on('keydown-T', onTitle);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off('keydown-ENTER', onEnter);
      this.input.keyboard?.off('keydown-T', onTitle);
    });
  }
}
