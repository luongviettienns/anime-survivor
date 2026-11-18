import type Phaser from 'phaser';
import { ART_SCALE } from '../config/artDisplay';
import {
  generateChunkProps,
  getActiveChunkKeys,
  worldToChunk,
  type WorldPropKind,
} from '../../domain/infiniteMap';

const PROP_ANIMS: Record<WorldPropKind, string> = {
  tree: 'tree-sway',
  torii_gate: 'torii-gate-sway',
  shrine_plaza: 'shrine-plaza-gleam',
  shrine_lantern: 'shrine-lantern-glow',
  spirit_flower: 'spirit-flower-sway',
};

export class InfiniteMapSystem {
  private readonly ground: Phaser.GameObjects.TileSprite;
  private readonly loadedChunks = new Map<string, Phaser.GameObjects.Sprite[]>();
  private readonly propPool: Phaser.GameObjects.Sprite[] = [];
  private lastChunkKey = '';

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly worldSeed = 1337
  ) {
    this.ground = scene.add
      .tileSprite(0, 0, scene.scale.width, scene.scale.height, 'grass')
      .setOrigin(0)
      .setScrollFactor(0)
      .setTileScale(256 / scene.textures.get('grass').getSourceImage().width)
      .setDepth(-1_000_000_000);
  }

  update(playerX: number, playerY: number): void {
    const cam = this.scene.cameras.main;
    this.ground.tilePositionX = cam.scrollX / this.ground.tileScaleX;
    this.ground.tilePositionY = cam.scrollY / this.ground.tileScaleY;

    const current = worldToChunk(playerX, playerY);
    if (current.key === this.lastChunkKey) return;
    this.lastChunkKey = current.key;

    const active = getActiveChunkKeys(playerX, playerY, 1);
    const keepKeys = new Set(active.map((c) => c.key));

    for (const [key, sprites] of this.loadedChunks) {
      if (keepKeys.has(key)) continue;
      for (const sp of sprites) {
        sp.anims.stop();
        sp.setActive(false).setVisible(false);
        this.propPool.push(sp);
      }
      this.loadedChunks.delete(key);
    }

    for (const coord of active) {
      if (this.loadedChunks.has(coord.key)) continue;
      const specs = generateChunkProps(coord.cx, coord.cy, this.worldSeed);
      const sprites: Phaser.GameObjects.Sprite[] = [];
      for (const spec of specs) {
        sprites.push(this.acquireProp(spec.kind, spec.x, spec.y, spec.scale, spec.animFrameOffset));
      }
      this.loadedChunks.set(coord.key, sprites);
    }
  }

  getLoadedChunkCount(): number {
    return this.loadedChunks.size;
  }

  clear(): void {
    for (const sprites of this.loadedChunks.values()) {
      for (const sp of sprites) sp.destroy();
    }
    this.loadedChunks.clear();
    for (const sp of this.propPool) sp.destroy();
    this.propPool.length = 0;
    this.ground.destroy();
    this.lastChunkKey = '';
  }

  private acquireProp(
    kind: WorldPropKind,
    x: number,
    y: number,
    scale: number,
    startFrame: number
  ): Phaser.GameObjects.Sprite {
    const reused = this.propPool.pop();
    const sp = reused ?? this.scene.add.sprite(x, y, kind, 0);
    const depth =
      kind === 'shrine_plaza'
        ? -999_999_990
        : kind === 'spirit_flower'
          ? y - 24
          : y;
    sp.setTexture(kind)
      .setPosition(x, y)
      .setScale(scale * (ART_SCALE[kind] ?? 1))
      .setAlpha(kind === 'shrine_plaza' ? 0.92 : 1)
      .setDepth(depth)
      .setActive(true)
      .setVisible(true)
      .play({ key: PROP_ANIMS[kind], startFrame: startFrame % (this.scene.anims.get(PROP_ANIMS[kind])?.frames.length ?? 1) });
    return sp;
  }
}
