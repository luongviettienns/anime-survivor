import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    this.load.spritesheet('hero', 'assets/hero.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('enemy', 'assets/enemy.png', { frameWidth: 24, frameHeight: 24 });
    this.load.image('orb', 'assets/orb.png');
    this.load.image('gem', 'assets/gem.png');
    this.load.image('grass', 'assets/grass.png');
    this.load.image('tree', 'assets/tree.png');
  }

  create(): void {
    this.anims.create({ key: 'hero-idle', frames: this.anims.generateFrameNumbers('hero', { start: 0, end: 3 }), frameRate: 5, repeat: -1 });
    this.anims.create({ key: 'hero-walk', frames: this.anims.generateFrameNumbers('hero', { start: 4, end: 7 }), frameRate: 10, repeat: -1 });
    this.anims.create({ key: 'enemy-walk', frames: this.anims.generateFrameNumbers('enemy', { start: 0, end: 3 }), frameRate: 6, repeat: -1 });
    this.scene.start('GameScene');
  }
}
