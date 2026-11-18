# Naruto sprite integration — 2026-11-18

User requested this Naruto Shippuden fan-art replacement explicitly. This does
not grant ownership of the Naruto character or permission to publish that IP.

## Source and generation

Twelve individual transparent PNGs in `art/source/naruto-ai/` were generated with
the built-in ImageGen tool. The tool did not expose a model version. No external
art pack was downloaded. Original files are retained, and SHA-256 hashes and
prompts are recorded in `art/source/naruto-ai/provenance.json`.

`scripts/naruto_ai_art.py` uses a shared crop for each animation, nearest-neighbor
scaling, binary alpha, a fixed 21-color palette and a feet baseline at y=29.
The running head is locked to pose 0 to remove drift between poses; sideways
running also locks the torso while vertical running retains opposing arm swings.
Each final frame is 32x32 RGBA. Idle has two breathing poses held in four slots;
sideways running has four strides and up/down running each have two distinct
steps. Up and side idle each hold a separate standing pose.

`scripts/generate_assets.py` now imports this hero instead of the old procedural
hero. `npm run assets:generate` preserves this artwork when rebuilding assets.
`python scripts/pack_frames.py` creates `public/assets/hero.png` (448x32) and
the manifest; every sheet crop must match its individual frame exactly.

## Runtime

| Animation | Frames | FPS |
|---|---|---|
| Down idle | 0–3 | 5 |
| Side run (left mirrors right) | 4–7 | 10 |
| Down run | 8–9 | 8 |
| Up idle | 10 | 5 |
| Up run | 11–12 | 8 |
| Side idle (left mirrors right) | 13 | 5 |

WASD/arrows switch animation. Releasing movement retains the last facing.
Diagonal input prefers horizontal facing. Vertical animation clears horizontal
flip, including when transitioning from facing left. There are four directional
views; diagonal movement reuses a side view.
No gameplay timing, movement speed or collision rules changed.

## Verification

- Three Python checks: binary alpha/palette/feet, stable running upper body,
  invalid animation/frame rejection. Included in `npm run assets:validate`.
- `npm run verify`: TypeScript, lint, 45 domain tests, architecture, all 23
  sheet crop validators and production build passed.
- `npm run test:e2e`: 6/6 Chromium scenarios passed, including actual keys,
  idle/run/facing transitions, multi-frame playback and no console/page errors.
- Screenshots inspected: `test-results/naruto-up.png`, `naruto-down.png`,
  `naruto-idle.png` and `naruto-running.png`. Browser gameplay regression scenarios
  cover combat, pickups, upgrades, pause and boss completion.

Human review is pending. Production deployment and other browsers were not tested.
Vite still reports the existing large bundle warning.
The default contact-sheet output failed to write with Windows `OSError 22`;
the hero contact sheet was successfully exported to
`output/naruto-preview/directions-contact-sheet.png` and inspected at 4x scale.
