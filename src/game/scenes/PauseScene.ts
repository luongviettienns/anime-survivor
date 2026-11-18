import Phaser from 'phaser';
import { loadSaveData, updateSettings } from '../systems/StorageSystem';
import type { GameScene } from './GameScene';

export type PauseSceneData = {
  level?: number;
  defeated?: number;
  elapsedSec?: number;
};

export class PauseScene extends Phaser.Scene {
  private settingsText?: Phaser.GameObjects.Text;

  constructor() {
    super('PauseScene');
  }

  create(data?: PauseSceneData): void {
    this.cameras.main.setZoom(this.scale.width / 960).centerOn(480, 270);
    this.add.rectangle(480, 270, 960, 540, 0x090b1a, 0.84);
    this.add
      .rectangle(480, 270, 620, 360, 0x161936, 0.96)
      .setStrokeStyle(2, 0x9b87f5);

    this.add
      .text(480, 130, 'PAUSED', {
        fontFamily: 'monospace',
        fontSize: '36px',
        color: '#ffcf75',
      })
      .setOrigin(0.5);

    const level = data?.level ?? 1;
    const defeated = data?.defeated ?? 0;
    const elapsedSec = Math.floor(data?.elapsedSec ?? 0);
    this.add
      .text(
        480,
        185,
        `Level: ${level}   |   Defeated: ${defeated}   |   Time: ${elapsedSec}s`,
        {
          fontFamily: 'monospace',
          fontSize: '18px',
          color: '#eeeeff',
        }
      )
      .setOrigin(0.5);

    this.settingsText = this.add
      .text(480, 260, '', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#5ce1e6',
        align: 'center',
        lineSpacing: 10,
      })
      .setOrigin(0.5);
    this.refreshSettingsText();

    this.add
      .text(
        480,
        365,
        '[ESC / P] Resume   |   [R] Restart   |   [T] Title Screen',
        {
          fontFamily: 'monospace',
          fontSize: '15px',
          color: '#d8b4fe',
        }
      )
      .setOrigin(0.5);

    const handledEvents = new WeakSet<object>();
    const oncePerKeyEvent = (fn: (ev?: KeyboardEvent) => void) => (ev?: KeyboardEvent) => {
      if (ev && typeof ev === 'object') {
        if (handledEvents.has(ev)) return;
        handledEvents.add(ev);
      }
      fn(ev);
    };

    const onResume = oncePerKeyEvent((ev?: KeyboardEvent) => {
      const gameScene = this.scene.get('GameScene') as GameScene | undefined;
      if (gameScene && typeof gameScene.handlePauseKey === 'function') {
        gameScene.handlePauseKey(ev?.timeStamp);
      } else {
        this.scene.stop('PauseScene');
        this.scene.resume('GameScene');
      }
    });
    const onToggleMute = oncePerKeyEvent(() => {
      const current = loadSaveData().settings;
      updateSettings({ muted: !current.muted });
      this.refreshSettingsText();
    });
    const onToggleFlash = oncePerKeyEvent(() => {
      const current = loadSaveData().settings;
      updateSettings({ reduceFlashing: !current.reduceFlashing });
      this.refreshSettingsText();
    });
    const onToggleShake = oncePerKeyEvent(() => {
      const current = loadSaveData().settings;
      updateSettings({ reduceScreenShake: !current.reduceScreenShake });
      this.refreshSettingsText();
    });
    const onRestart = oncePerKeyEvent(() => {
      this.scene.stop('PauseScene');
      this.scene.start('GameScene');
    });
    const onTitle = oncePerKeyEvent(() => {
      this.scene.stop('PauseScene');
      this.scene.stop('GameScene');
      this.scene.start('TitleScene');
    });

    const kb = this.input.keyboard;
    kb?.on('keydown-ESC', onResume);
    kb?.on('keydown-P', onResume);
    kb?.on('keydown-M', onToggleMute);
    kb?.on('keydown-F', onToggleFlash);
    kb?.on('keydown-H', onToggleShake);
    kb?.on('keydown-R', onRestart);
    kb?.on('keydown-T', onTitle);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      kb?.off('keydown-ESC', onResume);
      kb?.off('keydown-P', onResume);
      kb?.off('keydown-M', onToggleMute);
      kb?.off('keydown-F', onToggleFlash);
      kb?.off('keydown-H', onToggleShake);
      kb?.off('keydown-R', onRestart);
      kb?.off('keydown-T', onTitle);
    });
  }

  private refreshSettingsText(): void {
    const { muted, reduceFlashing, reduceScreenShake } = loadSaveData().settings;
    this.settingsText?.setText(
      [
        `[M] Mute Audio: ${muted ? 'ON' : 'OFF'}`,
        `[F] Reduce Flashing: ${reduceFlashing ? 'ON' : 'OFF'}`,
        `[H] Reduce Screen Shake: ${reduceScreenShake ? 'ON' : 'OFF'}`,
      ].join('\n')
    );
  }
}
