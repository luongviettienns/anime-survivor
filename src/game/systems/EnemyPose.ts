import type Phaser from 'phaser';
import type { Vec2 } from '../../domain/vector';

export type PoseMetrics = {
  displayScale?: number;
  opaqueHeight?: number;
  hands?: ReadonlyArray<readonly [number, number]>;
};

/** Fit original-image art while keeping feet and the physical collision circle stable. */
export function fitEnemyPose(enemy: Phaser.Physics.Arcade.Sprite): void {
  if (enemy.getData('fittedFrame') === enemy.frame) return;
  const metrics = enemy.frame.customData as PoseMetrics;
  const neutral = enemy.texture.get(0).customData as PoseMetrics;
  const scale = (enemy.texture.key === 'boss' ? 224 : 112) / (neutral.opaqueHeight ?? 160);
  const height = (metrics.opaqueHeight ?? 160) * scale;
  const footOffset = height / 2 - 4;
  const originY = 192 / enemy.height - footOffset / (enemy.height * scale);
  enemy.setOrigin(0.5, originY).setScale(scale).setData('footOffset', footOffset);
  const radius = (enemy.getData('worldRadius') as number) / scale;
  enemy.setCircle(radius, enemy.width / 2 - radius, enemy.displayOriginY + 4 / scale - radius);
  const body = enemy.body as Phaser.Physics.Arcade.Body;
  body.updateBounds(); body.updateCenter();
  if (!enemy.getData('fittedFrame')) {
    body.updateFromGameObject(); body.prev.copy(body.position); body.prevFrame.copy(body.position);
  }
  enemy.setData('fittedFrame', enemy.frame);
}

export function positionEnemyHand(enemy: Phaser.Physics.Arcade.Sprite, index: number, out: Vec2): boolean {
  const point = (enemy.frame.customData as PoseMetrics).hands?.[index];
  if (!point) return false;
  out.x = enemy.x + (point[0] - enemy.displayOriginX) * enemy.scaleX * (enemy.flipX ? -1 : 1);
  out.y = enemy.y + (point[1] - enemy.displayOriginY) * enemy.scaleY;
  return true;
}
