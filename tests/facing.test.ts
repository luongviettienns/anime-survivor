import { describe, expect, it } from 'vitest';
import { movementFacing } from '../src/domain/facing';

describe('movement facing', () => {
  it('faces each cardinal direction and retains it on release', () => {
    const cases = [[1, 0, 'right'], [-1, 0, 'left'], [0, -1, 'up'], [0, 1, 'down']] as const;
    for (const [x, y, facing] of cases) {
      expect(movementFacing({ x, y }, 'down')).toBe(facing);
      expect(movementFacing({ x: 0, y: 0 }, facing)).toBe(facing);
    }
  });

  it('prefers horizontal facing on diagonals', () => {
    expect(movementFacing({ x: 1, y: -1 }, 'up')).toBe('right');
    expect(movementFacing({ x: -1, y: 1 }, 'down')).toBe('left');
  });
});
