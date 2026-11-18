import type { Vec2 } from './vector';

export type Facing = 'up' | 'down' | 'left' | 'right';

export function movementFacing(input: Vec2, previous: Facing): Facing {
  if (input.x !== 0) return input.x < 0 ? 'left' : 'right';
  if (input.y !== 0) return input.y < 0 ? 'up' : 'down';
  return previous;
}
