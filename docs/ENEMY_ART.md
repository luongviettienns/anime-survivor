# Enemy artwork, November 2026

All new artwork is made with built-in ImageGen, one transparent PNG per pose.
Prompts and SHA-256 hashes are in `art/source/ai-overhaul/provenance.json`.
The model version is not exposed. Human approval remains pending.

| Asset | Display guide | Identity | Animation |
| --- | --- | --- | --- |
| enemy | 64x64 | Oni raider, split bone mask, crimson scarf, jagged armor | 4 walk poses, 6 fps |
| enemy_shade | 64x64 | Lean hooded stalker, bird mask, plum cloak | 4 sprint poses, 9 fps |
| enemy_mage | 64x64 | Skeletal occult mage, horned teal hood, bone charms | 4 walk poses, 5 fps; charge/release poses |
| enemy_elite | 96x96 | Broad oni executioner, heavy violet/gold armor | 4 walk poses, 6 fps; art-only elite |
| boss | 128x128 | Crimson Archon, red samurai armor, crescent horns, torn cape | 4 heavy walk poses, 5 fps; charge/radial-release poses |

These original enemies share the game's slightly oblique top-down camera.
Ordinary enemies have no persistent aura. The old internal `slime` identifier
remains for compatibility; its appearance is now the oni raider.
The supplied behavior description guides motion and cast timing. The mage has
an original occult identity rather than the earlier fox-mask/staff concept.

## Reusable aura

Four independently generated image layers: ground contact (96x56), core ring
(96x56), rising outer wisps (192x192), accent arcs (128x96). Each has two loop
poses at 8 fps. Their neutral palette supports engine tint: elite purple
`0xb84dff`, boss red `0xff344c`. No aura is baked into monster pixels.
Ground layers center on the footprint; outer wisps use bottom-center origin.
Layer depth stays below the actor, keeping its face and attack silhouette clear.
No procedural drawing or per-frame texture creation is involved.

The boss uses this aura in gameplay. Elite art and purple composition are in the
preview; no elite spawn rule, stats or skill have been introduced.
Reuse `EnemyAura` with another sprite and a tint. Adjust footprint assets/offsets
when introducing a substantially different body shape, rather than fitting horns.

## Import and gameplay boundaries

Source PNGs remain intact. The final user correction supersedes all native export sizes above: KEEP ORIGINAL
PNG FILES. The64/96/128 values are display guidance, never image export sizes.
No resize, palette reduction, alpha thresholding, orphan cleanup or content crop
is applied. Original source bytes are copied to `public/assets/runtime/<name>`.
Phaser multi-atlas metadata places those exact original images on a common
virtual canvas; it does not upload huge transparent sheet padding. Offline
spritesheets only add transparent padding and preserve every RGBA source pixel.
Actor foot anchors are[1024,1536] on2048px virtual canvases; hero actions retain
[768,1408] on1536px. Display scale is independent in `artDisplay.ts`.
Previous world collision radii16/32px and center offsets remain unchanged.

Charge and release poses follow the existing ranged AI states. Projectile timing,
damage, range, cooldowns, waves and boss phases are unchanged. Hit reaction uses
the existing tint flash without fractional sprite stretching. Dark-magic projectiles now use original full-resolution violet/crimson rotating cores; their previous
8.5px world collision radius, speed, damage and lifetime remain unchanged.
Original full-resolution spell warnings use violet-black/crimson ellipses. Defeat smoke is original full-resolution plum/black spirit energy. All three are individual generated PNG sequences.
The full-resolution two-pose blood-moon crescent slash is a boss art library asset, previewed
but not emitted as a new melee attack: no such combat rule has been added.

Build: `python scripts/generate_assets.py`, `python scripts/pack_frames.py`,
`python scripts/validate_sprites.py`. Inspect `/art-preview.html` and the exact
manifest crops in `art/review/actors.png` and `art/review/enemy-aura.png`.
