/**
 * Deterministic pixelfx exporter: renders transparent multi-frame effects from vendor/pixelfx
 * with per-entity signature palettes, union-bbox framing (zero jitter), 1px clean border inset,
 * and saves individual RGBA PNG frames into art/frames/<sprite>/<anim>/000.png.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEffect, renderFrames } from '../vendor/pixelfx/tools/lib/fxlib.mjs';
import { encodePNG } from '../vendor/pixelfx/tools/lib/png.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FRAMES_ROOT = join(ROOT, 'art', 'frames');

const SPECS = [
  {
    sprite: 'orb', anim: 'spin', id: 'arcane/arcane-orb', w: 24, h: 24, count: 6,
    tRange: [0.0, 0.85], seed: 11, alphaMin: 40, cropFrac: [0.12, 0.04, 0.88, 0.72],
    options: { palette: ['#061830', '#0a3a6a', '#0d6ec2', '#22b8f5', '#7ce8ff', '#d8f9ff', '#ffffff'] },
  },
  {
    sprite: 'slash', anim: 'cut', id: 'melee/sword-slash', w: 48, h: 48, count: 6,
    tRange: [0.06, 0.42], seed: 21, alphaMin: 24,
    options: { palette: ['#062620', '#0a5244', '#108c6e', '#22c58b', '#6ee7b7', '#d1fae5', '#ffffff'] },
  },
  {
    sprite: 'slash_x', anim: 'cut', id: 'melee/double-slash', w: 56, h: 56, count: 6,
    tRange: [0.08, 0.56], seed: 27, alphaMin: 24,
    options: { palette: ['#062b26', '#0c6b58', '#14b8a6', '#5eead4', '#fde047', '#fef9c3', '#ffffff'] },
  },
  {
    sprite: 'explosion', anim: 'boom', id: 'explosions/small-explosion', w: 56, h: 56, count: 6,
    tRange: [0.02, 0.30], seed: 41, alphaMin: 26,
    options: { palette: ['#26090c', '#661414', '#b91c1c', '#ea580c', '#f97316', '#facc15', '#fef08a', '#ffffff'] },
  },
  {
    sprite: 'enemy_bolt', anim: 'pulse', id: 'shadow/void-orb', w: 16, h: 16, count: 4,
    tRange: [0.0, 0.75], seed: 51, alphaMin: 35, cropFrac: [0.15, 0.08, 0.85, 0.76],
    options: { palette: ['#14040a', '#4a081c', '#9f1239', '#e11d48', '#fb7185', '#fda4af', '#ffffff'] },
  },
  {
    sprite: 'gem', anim: 'gleam', id: 'pickups/gem-spin', w: 16, h: 16, count: 4,
    tRange: [0.0, 0.75], seed: 61, alphaMin: 40, cropFrac: [0.08, 0.05, 0.92, 0.82],
    options: { palette: ['#081b38', '#0d3d7a', '#0284c7', '#38bdf8', '#7dd3fc', '#e0f2fe', '#ffffff'] },
  },
  {
    sprite: 'heal_pickup', anim: 'beat', id: 'pickups/heart-pickup', w: 16, h: 16, count: 4,
    tRange: [0.0, 0.75], seed: 71, alphaMin: 38, cropFrac: [0.08, 0.05, 0.92, 0.82],
    options: { palette: ['#2b0712', '#6e0d25', '#be123c', '#f43f5e', '#fb7185', '#ffe4e6', '#ffffff'] },
  },
  {
    sprite: 'vfx_hit', anim: 'burst', id: 'impacts/crit-hit', w: 32, h: 32, count: 5,
    tRange: [0.04, 0.36], seed: 81, alphaMin: 26,
    options: { palette: ['#2e1a05', '#854d0e', '#eab308', '#fde047', '#fef9c3', '#ffffff'] },
  },
  {
    sprite: 'vfx_death', anim: 'poof', id: 'spawn/poof', w: 32, h: 32, count: 6,
    tRange: [0.13, 0.62], seed: 91, alphaMin: 24,
    options: { palette: ['#140a24', '#2e1065', '#581c87', '#7e22ce', '#a855f7', '#d8b4fe', '#f3e8ff'] },
  },
  {
    sprite: 'vfx_levelup', anim: 'pillar', id: 'holy/holy-pillar', w: 56, h: 64, count: 6,
    tRange: [0.10, 0.65], seed: 101, alphaMin: 24,
    options: { palette: ['#2a1c08', '#78490a', '#d97706', '#f59e0b', '#fcd34d', '#fef3c7', '#ffffff'] },
  },
  {
    sprite: 'vfx_telegraph', anim: 'charge', id: 'arcane/rune-circle', w: 40, h: 40, count: 4,
    tRange: [0.0, 0.75], seed: 111, alphaMin: 24,
    options: { palette: ['#240614', '#5c0b2e', '#9d174d', '#e11d48', '#f472b6', '#fbcfe8', '#ffffff'] },
  },
];

function computeBbox(rgba, w, h, alphaThreshold, region) {
  const x0 = region ? Math.floor(region[0] * w) : 0;
  const y0 = region ? Math.floor(region[1] * h) : 0;
  const x1 = region ? Math.ceil(region[2] * w) : w;
  const y1 = region ? Math.ceil(region[3] * h) : h;
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      if (rgba[(y * w + x) * 4 + 3] >= alphaThreshold) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  return maxX >= minX ? { minX, minY, maxX, maxY } : null;
}

function fitFrame(src, sw, sh, unionBox, tw, th, alphaMin) {
  const out = new Uint8ClampedArray(tw * th * 4);
  const bw = unionBox.maxX - unionBox.minX + 1;
  const bh = unionBox.maxY - unionBox.minY + 1;
  const innerW = tw - 2;
  const innerH = th - 2;
  const scale = Math.min(innerW / bw, innerH / bh);
  const dw = Math.max(1, Math.round(bw * scale));
  const dh = Math.max(1, Math.round(bh * scale));
  const ox = 1 + Math.floor((innerW - dw) / 2);
  const oy = 1 + Math.floor((innerH - dh) / 2);

  for (let dy = 0; dy < dh; dy++) {
    const sy = unionBox.minY + Math.min(bh - 1, Math.floor((dy + 0.5) / scale));
    for (let dx = 0; dx < dw; dx++) {
      const sx = unionBox.minX + Math.min(bw - 1, Math.floor((dx + 0.5) / scale));
      const si = (sy * sw + sx) * 4;
      const a = src[si + 3];
      if (a < alphaMin) continue;
      const di = ((oy + dy) * tw + (ox + dx)) * 4;
      out[di] = src[si];
      out[di + 1] = src[si + 1];
      out[di + 2] = src[si + 2];
      out[di + 3] = a >= 180 ? 255 : Math.min(255, Math.round(a * 1.25));
    }
  }
  return out;
}

async function main() {
  for (const spec of SPECS) {
    const fx = await loadEffect(spec.id);
    const rendered = renderFrames(fx, {
      fps: 24,
      seed: spec.seed,
      bg: 'none',
      actor: false,
      options: spec.options,
    });
    const picked = [];
    for (let i = 0; i < spec.count; i++) {
      const u = spec.count === 1 ? 0 : i / (spec.count - 1);
      const frac = spec.tRange[0] + (spec.tRange[1] - spec.tRange[0]) * u;
      const idx = Math.max(0, Math.min(rendered.n - 1, Math.round(frac * (rendered.n - 1))));
      picked.push(rendered.frames[idx].clear);
    }

    let union = null;
    for (const frame of picked) {
      const box = computeBbox(frame, rendered.w, rendered.h, spec.alphaMin, spec.cropFrac);
      if (!box) continue;
      if (!union) union = { ...box };
      else {
        union.minX = Math.min(union.minX, box.minX);
        union.minY = Math.min(union.minY, box.minY);
        union.maxX = Math.max(union.maxX, box.maxX);
        union.maxY = Math.max(union.maxY, box.maxY);
      }
    }
    if (!union) throw new Error(`No visible pixels rendered for ${spec.sprite} (${spec.id})`);

    const dir = join(FRAMES_ROOT, spec.sprite, spec.anim);
    mkdirSync(dir, { recursive: true });
    for (let i = 0; i < picked.length; i++) {
      let rgba = fitFrame(picked[i], rendered.w, rendered.h, union, spec.w, spec.h, spec.alphaMin);
      if (!computeBbox(rgba, spec.w, spec.h, 1)) {
        // Fallback to center spark pixel if an outer tail frame evaporated completely
        const cx = Math.floor(spec.w / 2), cy = Math.floor(spec.h / 2);
        const ci = (cy * spec.w + cx) * 4;
        rgba[ci] = 255; rgba[ci + 1] = 255; rgba[ci + 2] = 255; rgba[ci + 3] = 180;
      }
      const png = encodePNG(spec.w, spec.h, rgba);
      writeFileSync(join(dir, `${String(i).padStart(3, '0')}.png`), png);
    }
    console.log(`Exported ${spec.sprite}/${spec.anim} (${spec.count} frames @ ${spec.w}x${spec.h}) from pixelfx:${spec.id}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
