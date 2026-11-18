import type Phaser from 'phaser';
import { canStartHero, type HeroConfig } from '../domain/heroes';
import type { SaveData } from '../domain/storageSchema';

export class LobbyPanel {
  private readonly slotBorders: Phaser.GameObjects.Rectangle[] = [];
  private readonly heroName: Phaser.GameObjects.Text;
  private readonly heroTitle: Phaser.GameObjects.Text;
  private readonly statsText: Phaser.GameObjects.Text;
  private readonly traitsText: Phaser.GameObjects.Text;
  private readonly recordText: Phaser.GameObjects.Text;
  private readonly settingsText: Phaser.GameObjects.Text;
  private readonly startBtn: Phaser.GameObjects.Image;
  private readonly startLabel: Phaser.GameObjects.Text;
  private unlocked = true;

  constructor(
    scene: Phaser.Scene,
    roster: readonly HeroConfig[],
    onSelect: (index: number) => void,
    onStart: () => void
  ) {
    const cx = 975;
    scene.add.nineslice(cx, 360, 'ui_card_base', 'content', 490, 620, 48, 48, 48, 48).setData('lobby-panel', true);
    const txt = (x: number, y: number, size: number, color: string) =>
      scene.add.text(x, y, '', { fontFamily: 'monospace', fontSize: `${size}px`, color, stroke: '#070a14', strokeThickness: 3 });

    txt(cx, 92, 15, '#9beaff').setOrigin(0.5).setText('SELECT HERO   [A / D  or  1 / 2]');
    roster.forEach((hero, i) => {
      const sx = cx - 108 + i * 216;
      const box = scene.add.rectangle(sx, 154, 194, 68, 0x101734, 0.92).setStrokeStyle(2, 0x51699f)
        .setInteractive({ useHandCursor: true }).setData(`lobby-slot-${hero.id}`, true);
      scene.add.image(sx - 64, 154, 'ui_emblem_socket', 'content').setDisplaySize(50, 50);
      if (hero.unlocked) {
        scene.add.image(sx - 64, 154, 'icon-weapon_orb').setDisplaySize(28, 28);
      } else {
        scene.add.image(sx - 64, 154, 'lobby_lock', 'content').setDisplaySize(26, 30);
      }
      txt(sx - 30, 142, 15, hero.unlocked ? '#ffe6a3' : '#b7b3d8').setOrigin(0, 0.5).setText(hero.id.toUpperCase());
      txt(sx - 30, 165, 11, hero.unlocked ? '#5ce1e6' : '#f39c6b').setOrigin(0, 0.5).setText(hero.unlocked ? 'READY' : 'LOCKED');
      box.on('pointerdown', () => onSelect(i));
      this.slotBorders.push(box);
    });

    this.heroName = txt(cx, 224, 24, '#ffe7a3').setOrigin(0.5).setData('lobby-hero-name', true);
    this.heroTitle = txt(cx, 252, 13, '#8de8ff').setOrigin(0.5);
    scene.add.rectangle(cx, 326, 420, 104, 0x0b1128, 0.78).setStrokeStyle(1, 0x456091);
    this.statsText = txt(cx - 192, 288, 14, '#eef4ff').setLineSpacing(8);
    this.traitsText = txt(cx - 192, 396, 13, '#c8d7f5').setWordWrapWidth(392).setLineSpacing(6);
    scene.add.rectangle(cx, 482, 400, 1, 0x6f94cc, 0.45);
    this.recordText = txt(cx, 504, 13, '#9beaff').setOrigin(0.5);
    this.settingsText = txt(cx, 532, 12, '#c4b5fd').setOrigin(0.5);

    this.startBtn = scene.add.image(cx, 598, 'lobby_start_button', 'content').setDisplaySize(340, 54)
      .setInteractive({ useHandCursor: true }).setData('lobby-start-btn', true);
    this.startLabel = txt(cx, 598, 18, '#ffe7a3').setOrigin(0.5);
    this.startBtn.on('pointerover', () => { if (this.unlocked) this.startBtn.setTint(0xdcfaff); });
    this.startBtn.on('pointerout', () => this.applyStartTint());
    this.startBtn.on('pointerdown', onStart);
  }

  update(hero: HeroConfig, selectedIndex: number, save: SaveData): void {
    this.unlocked = canStartHero(hero);
    this.slotBorders.forEach((box, idx) => {
      box.setStrokeStyle(idx === selectedIndex ? 3 : 2, idx === selectedIndex ? 0x5ce1e6 : 0x51699f);
      box.setFillStyle(idx === selectedIndex ? 0x1a2652 : 0x101734, 0.94);
    });
    this.heroName.setText(hero.name);
    this.heroTitle.setText(hero.title);
    this.statsText.setText([
      `HP: ${hero.maxHp}   ARMOR: ${hero.armor}   I-FRAME: ${hero.invulnerabilityMs}ms`,
      `SPEED: ${hero.moveSpeed} px/s   MAGNET: ${hero.magnetRadius} px`,
      `WEAPON: ${hero.startingWeapon}`,
    ].join('\n'));
    this.traitsText.setText(`+ ${hero.strengths}\n- ${hero.weakness}`);
    this.recordText.setText(`BEST KILLS: ${save.stats.bestKills}   |   BEST TIME: ${save.stats.bestSurvivalSec}s   |   WINS: ${save.stats.victories}`);
    const { muted, reduceFlashing, reduceScreenShake } = save.settings;
    this.settingsText.setText(`[M] Mute: ${muted ? 'ON' : 'OFF'}   [F] Flash: ${reduceFlashing ? 'ON' : 'OFF'}   [H] Shake: ${reduceScreenShake ? 'ON' : 'OFF'}`);
    this.startLabel.setText(this.unlocked ? 'START RUN  [ENTER]' : 'LOCKED — COMING SOON');
    this.startLabel.setColor(this.unlocked ? '#ffe7a3' : '#a7a4c4');
    this.applyStartTint();
  }

  private applyStartTint(): void {
    if (this.unlocked) this.startBtn.clearTint();
    else this.startBtn.setTint(0x6e7391);
  }
}
