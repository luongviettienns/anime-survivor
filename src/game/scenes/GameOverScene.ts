import Phaser from 'phaser';

export class GameOverScene extends Phaser.Scene {
  constructor() { super('GameOverScene'); }
  create(data: { victory?: boolean; score?: number }): void {
    this.cameras.main.setBackgroundColor('#0d1023');
    this.add.text(480, 160, data.victory ? 'VICTORY!' : 'GAME OVER', {
      fontFamily: 'monospace', fontSize: '52px', color: '#ffcf75',
    }).setOrigin(0.5);
    this.add.text(480, 250, `Defeated: ${data.score ?? 0}`, { fontFamily: 'monospace', fontSize: '24px', color: '#eeeeff' }).setOrigin(0.5);
    this.add.text(480, 325, 'Press ENTER to play again', { fontFamily: 'monospace', fontSize: '18px', color: '#a8a6dd' }).setOrigin(0.5);
    this.input.keyboard?.once('keydown-ENTER', () => this.scene.start('GameScene'));
  }
}
