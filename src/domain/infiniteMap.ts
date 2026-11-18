export const CHUNK_SIZE = 512;
export const SPAWN_ORIGIN_X = 900;
export const SPAWN_ORIGIN_Y = 600;
export const SPAWN_CLEAR_RADIUS = 190;

export type ChunkCoord = { cx: number; cy: number; key: string };
export type WorldPropKind =
  | 'tree'
  | 'torii_gate'
  | 'shrine_plaza'
  | 'shrine_lantern'
  | 'spirit_flower';

export type ChunkPropSpec = {
  kind: WorldPropKind;
  x: number;
  y: number;
  scale: number;
  animFrameOffset: number;
};

function splitMix32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x9e3779b9) >>> 0;
    let z = state;
    z = Math.imul(z ^ (z >>> 16), 0x85ebca6b) >>> 0;
    z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35) >>> 0;
    return ((z ^ (z >>> 16)) >>> 0) / 4294967296;
  };
}

function hashChunkSeed(worldSeed: number, cx: number, cy: number): number {
  let h = (worldSeed ^ Math.imul(cx, 374761393) ^ Math.imul(cy, 668265263)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

export function worldToChunk(x: number, y: number): ChunkCoord {
  const cx = Math.floor(x / CHUNK_SIZE);
  const cy = Math.floor(y / CHUNK_SIZE);
  return { cx, cy, key: `${cx},${cy}` };
}

export function getActiveChunkKeys(playerX: number, playerY: number, radius = 1): ChunkCoord[] {
  const center = worldToChunk(playerX, playerY);
  const coords: ChunkCoord[] = [];
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const cx = center.cx + dx;
      const cy = center.cy + dy;
      coords.push({ cx, cy, key: `${cx},${cy}` });
    }
  }
  return coords;
}

export function generateChunkProps(cx: number, cy: number, worldSeed = 1337): ChunkPropSpec[] {
  const rng = splitMix32(hashChunkSeed(worldSeed, cx, cy));
  const props: ChunkPropSpec[] = [];
  const baseX = cx * CHUNK_SIZE;
  const baseY = cy * CHUNK_SIZE;
  const midX = baseX + 256;
  const midY = baseY + 256;

  // 1. Structured Shrine Flagstone Road & Courtyard (walkable ground layer, allowed inside spawn clearing)
  for (const offset of [-116, 0, 116]) {
    props.push({
      kind: 'shrine_plaza',
      x: midX + offset,
      y: midY,
      scale: 2.0,
      animFrameOffset: Math.abs(cx + cy + offset) % 4,
    });
  }
  if ((cx + cy) % 2 === 0) {
    for (const vOffset of [-116, 116]) {
      props.push({
        kind: 'shrine_plaza',
        x: midX,
        y: midY + vOffset,
        scale: 2.0,
        animFrameOffset: Math.abs(cx * 3 + vOffset) % 4,
      });
    }
  }

  // 2. Shrine Landmark (Torii Gate + Twin Stone Lanterns outside initial spawn clearing)
  if ((cx + cy) % 2 === 0 && Math.hypot(midX - SPAWN_ORIGIN_X, midY - 96 - SPAWN_ORIGIN_Y) >= SPAWN_CLEAR_RADIUS) {
    props.push({ kind: 'torii_gate', x: midX, y: midY - 96, scale: 2.0, animFrameOffset: 0 });
    props.push({ kind: 'shrine_lantern', x: midX - 76, y: midY - 64, scale: 2.0, animFrameOffset: 1 });
    props.push({ kind: 'shrine_lantern', x: midX + 76, y: midY - 64, scale: 2.0, animFrameOffset: 3 });
  }

  // 3. Organic Sakura Trees & Low Bushes framing the road/clearing (never growing on stone pavement)
  const count = 6 + Math.floor(rng() * 3);
  for (let i = 0; i < count; i++) {
    const x = Math.round(baseX + 44 + rng() * (CHUNK_SIZE - 88));
    const y = Math.round(baseY + 52 + rng() * (CHUNK_SIZE - 104));
    if (Math.hypot(x - SPAWN_ORIGIN_X, y - SPAWN_ORIGIN_Y) < SPAWN_CLEAR_RADIUS) continue;
    if (Math.abs(y - midY) < 76 || Math.abs(x - midX) < 84) continue;
    const roll = rng();
    const kind: WorldPropKind = roll < 0.55 ? 'tree' : roll < 0.72 ? 'shrine_lantern' : 'spirit_flower';
    props.push({ kind, x, y, scale: 2.0, animFrameOffset: Math.floor(rng() * 4) });
  }
  return props;
}
