import Phaser from 'phaser';
type Bounds = { opaqueHeight?: number; opaqueBounds?: readonly [number, number, number, number] };
const WIDTH_RATIO = [1, 1.2, 1.2, 0.9];
const HEIGHT_RATIO = [0.22, 0.34, 0.9, 0.25];

const LAYERS = ['contact', 'ring', 'outer', 'accent'] as const;

/** Fit aura layers to standing body bounds and keep their centers on the feet. */
export class EnemyAura {
  private readonly layers: Phaser.GameObjects.Sprite[];

  constructor(scene: Phaser.Scene, color: number) {
    this.layers = LAYERS.map((layer) => scene.add.sprite(0, 0, `aura_${layer}`)
      .setTint(color).setVisible(false).setOrigin(0.5, layer === 'outer' ? 0.75 : 0.5)
      .setAlpha(layer === 'contact' ? 0.3 : layer === 'outer' ? 0.55 : 0.8)
      .play(`aura-${layer}-pulse`));
  }

  follow(actor: Phaser.GameObjects.Sprite): void {
    const foot = Math.round(actor.y + ((actor.getData('footOffset') as number | undefined) ?? 0));
    const reference = actor.texture.get(0).customData as Bounds;
    const bodyHeight = (reference.opaqueHeight ?? 160) * actor.scaleY;
    const bounds = reference.opaqueBounds;
    const bodyWidth = bounds ? (bounds[2] - bounds[0]) * actor.scaleX : bodyHeight * 0.7;
    for (let index = 0; index < this.layers.length; index++) {
      const layer = this.layers[index]!;
      const metrics = layer.texture.get(0).customData as Bounds;
      const box = metrics.opaqueBounds ?? [0, 0, layer.width, layer.height];
      const scale = Math.min(bodyWidth * WIDTH_RATIO[index]! / Math.max(1, box[2] - box[0]),
        bodyHeight * HEIGHT_RATIO[index]! / Math.max(1, box[3] - box[1]));
      layer.setScale(scale);
      this.layers[index]!.setPosition(Math.round(actor.x), foot)
        .setDepth(actor.depth - 4 + index * 0.1).setVisible(actor.visible && actor.active);
    }
  }

  destroy(): void { for (const layer of this.layers) layer.destroy(); }
}
