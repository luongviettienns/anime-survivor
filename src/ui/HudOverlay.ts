import Phaser from 'phaser';
import type { PlayerState } from '../domain/combat';
import { xpThreshold, type RunProgression } from '../domain/progression';
import type { WeaponId, WeaponInventory } from '../domain/weapons';

export type HudStateDto = {
  player: PlayerState;
  progression: RunProgression;
  elapsedSec: number;
  defeated: number;
  weapons?: WeaponInventory;
  bossHp?: { hp: number; maxHp: number; name: string } | null;
};

const WEAPON_LABELS: Record<WeaponId, string> = {
  orb: 'ORB',
  slash: 'SLASH',
  orbital: 'ORBIT',
};

export class HudOverlay {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly statusText: Phaser.GameObjects.Text;
  private readonly controlsText: Phaser.GameObjects.Text;
  private readonly bossText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.graphics = scene.add.graphics().setScrollFactor(0).setDepth(10000);
    this.statusText = scene.add
      .text(16, 44, '', {
        fontFamily: 'monospace',
        fontSize: '15px',
        color: '#ffffff',
        backgroundColor: '#1b1934bb',
        padding: { x: 10, y: 6 },
      })
      .setScrollFactor(0)
      .setDepth(10000);

    this.controlsText = scene.add
      .text(944, 22, 'WASD / Arrows | ESC Pause', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#e8d5ff',
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(10000);

    this.bossText = scene.add
      .text(480, 488, '', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#ffccd5',
      })
      .setOrigin(0.5, 0.5)
      .setScrollFactor(0)
      .setDepth(10001)
      .setVisible(false);
  }

  update(dto: HudStateDto): void {
    this.graphics.clear();

    const reqXp = Math.max(1, xpThreshold(dto.progression.level));
    const xpRatio = Phaser.Math.Clamp(dto.progression.xp / reqXp, 0, 1);
    this.graphics.fillStyle(0x1b1934, 0.85).fillRect(16, 8, 928, 8);
    this.graphics.fillStyle(0x5ce1e6, 1).fillRect(16, 8, Math.round(928 * xpRatio), 8);
    this.graphics.lineStyle(1, 0x9b87f5, 0.9).strokeRect(16, 8, 928, 8);

    const maxHp = Math.max(1, dto.player.maxHp);
    const hpRatio = Phaser.Math.Clamp(dto.player.hp / maxHp, 0, 1);
    this.graphics.fillStyle(0x4a1525, 0.9).fillRect(16, 24, 220, 14);
    this.graphics
      .fillStyle(hpRatio > 0.35 ? 0x4ade80 : 0xf43f5e, 1)
      .fillRect(16, 24, Math.round(220 * hpRatio), 14);
    this.graphics.lineStyle(1, 0xffffff, 0.7).strokeRect(16, 24, 220, 14);

    const min = Math.floor(dto.elapsedSec / 60)
      .toString()
      .padStart(2, '0');
    const sec = Math.floor(dto.elapsedSec % 60)
      .toString()
      .padStart(2, '0');
    const weaponsLabel = this.formatWeapons(dto.weapons);

    this.statusText.setText(
      `ANIME SURVIVOR | HP ${dto.player.hp}/${dto.player.maxHp} | LVL ${dto.progression.level} XP ${dto.progression.xp}/${reqXp}\nTIME ${min}:${sec} | KILLS ${dto.defeated} | ${weaponsLabel}`
    );

    if (dto.bossHp && dto.bossHp.hp > 0) {
      const bossMax = Math.max(1, dto.bossHp.maxHp);
      const bossRatio = Phaser.Math.Clamp(dto.bossHp.hp / bossMax, 0, 1);
      this.graphics.fillStyle(0x2a0f1d, 0.9).fillRect(260, 502, 440, 14);
      this.graphics.fillStyle(0xe11d48, 1).fillRect(260, 502, Math.round(440 * bossRatio), 14);
      this.graphics.lineStyle(1, 0xffccd5, 0.85).strokeRect(260, 502, 440, 14);
      this.bossText
        .setText(`${dto.bossHp.name}  ${dto.bossHp.hp}/${dto.bossHp.maxHp}`)
        .setVisible(true);
    } else {
      this.bossText.setVisible(false);
    }
  }

  getStatusText(): string {
    return this.statusText.text;
  }

  destroy(): void {
    this.graphics.destroy();
    this.statusText.destroy();
    this.controlsText.destroy();
    this.bossText.destroy();
  }

  private formatWeapons(weapons?: WeaponInventory): string {
    if (!weapons) return 'ORB Lv1';
    const badges = (Object.keys(WEAPON_LABELS) as WeaponId[])
      .filter((id) => weapons[id] > 0)
      .map((id) => `${WEAPON_LABELS[id]} Lv${weapons[id]}`);
    return badges.length > 0 ? badges.join('  ') : 'ORB Lv1';
  }
}
