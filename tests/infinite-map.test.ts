import { describe, expect, it } from 'vitest';
import {
  CHUNK_SIZE,
  generateChunkProps,
  getActiveChunkKeys,
  SPAWN_CLEAR_RADIUS,
  SPAWN_ORIGIN_X,
  SPAWN_ORIGIN_Y,
  worldToChunk,
} from '../src/domain/infiniteMap';

describe('infinite procedural chunked map domain', () => {
  it('maps positive, zero, and negative world coordinates to chunk indices cleanly', () => {
    expect(worldToChunk(0, 0)).toEqual({ cx: 0, cy: 0, key: '0,0' });
    expect(worldToChunk(CHUNK_SIZE + 5, CHUNK_SIZE * 2 + 1)).toEqual({ cx: 1, cy: 2, key: '1,2' });
    expect(worldToChunk(-1, -CHUNK_SIZE - 10)).toEqual({ cx: -1, cy: -2, key: '-1,-2' });
  });

  it('returns 9 active chunks for radius=1 around any coordinate', () => {
    const chunks = getActiveChunkKeys(-2400, 5500, 1);
    expect(chunks).toHaveLength(9);
    expect(new Set(chunks.map((c) => c.key)).size).toBe(9);
  });

  it('generates deterministic props per chunk and preserves spawn safe clearing', () => {
    const a = generateChunkProps(4, -7, 1337);
    const b = generateChunkProps(4, -7, 1337);
    const other = generateChunkProps(5, -7, 1337);

    expect(a).toEqual(b);
    expect(a.length).toBeGreaterThanOrEqual(5);
    expect(a).not.toEqual(other);

    // Every chunk around spawn origin keeps blocking obstacles (trees, gates, lanterns) out of the clearing
    for (const chunk of getActiveChunkKeys(SPAWN_ORIGIN_X, SPAWN_ORIGIN_Y, 1)) {
      for (const prop of generateChunkProps(chunk.cx, chunk.cy, 1337)) {
        if (prop.kind === 'shrine_plaza') continue;
        expect(Math.hypot(prop.x - SPAWN_ORIGIN_X, prop.y - SPAWN_ORIGIN_Y)).toBeGreaterThanOrEqual(
          SPAWN_CLEAR_RADIUS
        );
      }
    }
  });
});
