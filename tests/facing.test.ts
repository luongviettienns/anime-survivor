import { describe, expect, it } from 'vitest';
import { movementFacing, targetFacing } from '../src/domain/facing';

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

describe('monster target facing', () => {
  it('uses the dominant aim axis, including small horizontal drift on a vertical target', () => {
    expect(targetFacing({ x: 1, y: -200 }, 'down')).toBe('up');
    expect(targetFacing({ x: -2, y: 100 }, 'up')).toBe('down');
    expect(targetFacing({ x: -100, y: 5 }, 'up')).toBe('left');
    expect(targetFacing({ x: 100, y: -5 }, 'up')).toBe('right');
  });

  it('keeps the previous facing at zero aim and breaks diagonal ties horizontally', () => {
    expect(targetFacing({ x: 0, y: 0 }, 'left')).toBe('left');
    expect(targetFacing({ x: 10, y: -10 }, 'down')).toBe('right');
  });
});
