import Phaser from 'phaser';
import { ART_SCALE } from '../config/artDisplay';

const LAYERS = ['contact', 'ring', 'outer', 'accent'] as const;

/** Shared image layers: footprint and tint are independent of the monster silhouette. */
export class EnemyAura {
  private readonly layers: Phaser.GameObjects.Sprite[];

  constructor(scene: Phaser.Scene, color: number) {
    this.layers = LAYERS.map((layer) => scene.add.sprite(0, 0, `aura_${layer}`)
      .setTint(color).setScale(ART_SCALE[`aura_${layer}`] ?? 1).setOrigin(0.5, layer === 'outer' ? 0.75 : 0.5)
      .setAlpha(layer === 'contact' ? 0.3 : layer === 'outer' ? 0.55 : 0.8)
      .play(`aura-${layer}-pulse`));
  }

  follow(actor: Phaser.GameObjects.Sprite): void {
    const foot = Math.round(actor.y + ((actor.getData('footOffset') as number | undefined) ?? 0));
    for (let index = 0; index < this.layers.length; index++) {
      this.layers[index]!.setPosition(Math.round(actor.x), foot)
        .setDepth(actor.depth - 4 + index * 0.1).setVisible(actor.visible && actor.active);
    }
  }

  destroy(): void { for (const layer of this.layers) layer.destroy(); }
}
