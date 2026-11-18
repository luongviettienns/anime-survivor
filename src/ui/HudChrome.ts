import type Phaser from 'phaser';

/** ImageGen panel frames, tiled at native border resolution. */
export class HudChrome {
  private readonly panels = new Map<string, Phaser.GameObjects.NineSlice>();

  constructor(private readonly scene: Phaser.Scene, private readonly depth: number) {}

  begin(): void { for (const panel of this.panels.values()) panel.setVisible(false); }

  panel(x: number, y: number, w: number, h: number, _background: number, border: number): void {
    const key = `${x}:${y}:${w}:${h}`;
    let panel = this.panels.get(key);
    if (!panel) {
      panel = this.scene.add.nineslice(x, y, 'hud_panel', undefined, w * 64, h * 64, 256, 256, 256, 256).setScale(1 / 64)
        .setOrigin(0).setScrollFactor(0).setDepth(this.depth);
      this.panels.set(key, panel);
    }
    panel.setVisible(true).setTint(border === 0xfb7185 ? 0xffaaaa : 0xffffff);
  }

  destroy(): void { for (const panel of this.panels.values()) panel.destroy(); }
}
