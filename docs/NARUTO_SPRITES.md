# Naruto sprite integration — 2026-11-18

User requested this Naruto Shippuden fan-art replacement explicitly. This does
not grant ownership of the Naruto character or permission to publish that IP.

## Source and generation

Six individual transparent PNGs in `art/source/naruto-ai/` were generated with
the built-in ImageGen tool. The tool did not expose a model version. No external
art pack was downloaded. Original files are retained, and SHA-256 hashes and
prompts are recorded in `art/source/naruto-ai/provenance.json`.

`scripts/naruto_ai_art.py` uses a shared crop for each animation, nearest-neighbor
scaling, binary alpha, a fixed 20-color palette and a feet baseline at y=29.
The running head and torso are locked to pose 0 to remove drift between poses.
Each final frame is 32x32 RGBA. Idle has two breathing poses held in four slots;
running has four distinct strides. There are no separate up/down facing poses.

`scripts/generate_assets.py` now imports this hero instead of the old procedural
hero. `npm run assets:generate` preserves this artwork when rebuilding assets.
`python scripts/pack_frames.py` creates `public/assets/hero.png` (256x32) and
the manifest; every sheet crop must match its individual frame exactly.

## Runtime

Existing Phaser animations are reused: `hero-idle` frames 0–3 at 5 fps and
`hero-walk` frames 4–7 at 10 fps, looping. WASD and arrows switch animation;
horizontal input flips facing, and releasing movement returns to idle.
No gameplay timing, movement speed or collision rules changed.

## Verification

- Three Python checks: binary alpha/palette/feet, stable running upper body,
  invalid animation/frame rejection. Included in `npm run assets:validate`.
- `npm run verify`: TypeScript, lint, 43 domain tests, architecture, all 23
  sheet crop validators and production build passed.
- `npm run test:e2e`: 6/6 Chromium scenarios passed, including actual keys,
  idle/run/facing transitions, multi-frame playback and no console/page errors.
- Screenshots inspected: `test-results/naruto-idle.png` and
  `test-results/naruto-running.png`. Browser gameplay regression scenarios
  cover combat, pickups, upgrades, pause and boss completion.

Human review is pending. Production deployment and other browsers were not tested.
Vite still reports the existing large bundle warning.
