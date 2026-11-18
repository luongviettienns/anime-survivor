# Exact pixel sprite pipeline (mandatory)

## Golden rule
**Never ask image AI to deliver a finished spritesheet as a single PNG.** Models can insert separators, inconsistent cells, drifting animation frames and malformed anatomy. Even if it looks fine, automated slicing can cut half of a character.

## File contract
`docs/ART_CONTRACT.json` is authoritative. Final user instruction: preserve ORIGINAL generated PNGs.
- All new AI artwork uses its original dimensions, colors and RGBA alpha. NEVER resize, quantize, crop content, threshold alpha or clean source pixels.
- `public/assets/runtime/<sprite>/` contains byte-identical copies of the original PNG files and multi-atlas JSON. Phaser reads these images directly.
- Offline packed sheets only add transparent padding around unchanged source pixels:2048px virtual cells for new artwork,1536px for existing HD character/Rasengan. Every original crop must remain pixel-identical.
-64/96/128 monster sizes and56px skill sizes describe intended game display, NOT exported source-image dimensions. Display scale and physics hitboxes are separate from source art.
- Original hero locomotion now renders through hero_locomotion:14 animation slots backed by12 original PNG textures, including shared idle holds. The32px hero stays hidden as the unchanged physics/animation controller. HD artwork is padded only, displayed56px high, and shares the1408/1536 foot anchor with actions.
- Grass, HUD panel and weapon icons also copy original PNG bytes. Engine scaling/slicing handles display size.
- Source hashes and full prompts are in the provenance ledgers. Model version is not exposed; human review remains pending.
- Ground aura layers are separate images with purple elite/red boss runtime tint; ordinary enemies have no persistent aura.

## AI-generated frame workflow (when Antigravity has an image-generation capability)
1. Produce ONE coherent **reference** character image, then a canonical front-view idle reference. Ask for original anime-inspired characters only.
2. Request 1 pose/frame at a time. Keep the original PNG. Use padding metadata to align its full-resolution pixels; do not normalize it into a smaller canvas.
3. Place each unchanged source on a transparent virtual canvas using a common foot anchor. Hand-inspect silhouette and head position; do not resample pixels.
4. Preserve the source palette and alpha exactly. Add transparent margins without touching original pixels; do not independently crop/recenter output content.
5. Save as `art/frames/hero/idle/000.png` ... `003.png`, `art/frames/hero/walk/000.png` ... `003.png`. Input paths must be deterministic.
6. Run `python scripts/pack_frames.py --input art/frames --output public/assets`.
7. Run `python scripts/validate_sprites.py`, inspect frame contact sheet and real Phaser animation. If validation fails, do not merge the asset.
8. Run `python scripts/make_contact_sheet.py` and review `art/review/*.png`; review animation in browser at native logical resolution and 2x zoom; inspect jitter/feet contact, not just dimensions.

## AI frame prompt template
"Create exactly ONE frame for an ORIGINAL anime pixel-art survivor heroine, {animation} pose index {index} of {count}. Character is a violet-haired magical swordswoman with turquoise eyes and a fuchsia ribbon. Full body, front-facing, centered on transparent RGBA canvas with consistent feet baseline, coherent 32x32 sprite silhouette, crisp pixel clusters, no antialiasing, no background, no typography, no outline box, no sprite grid, no other characters. Maintain identical proportions, hair, outfit, light direction and palette across frames. This is a *single animation frame*, not a spritesheet."

## Asset QA
- Validate decoded pixel size, RGBA alpha, no empty frames or boundary contact.
- Validate every sheet crop equals source frame `sha256(pixel bytes)` and no overlap/out-of-bounds.
- Validate declared animation counts/order correspond exactly to Phaser animation ranges.
- Verify foot baseline and motion continuity manually or with a contact sheet.
- Track source/license/artist/model in `docs/ASSET_PROVENANCE.md` (especially for external tools).

## Important caveats
Image-generation tools may not produce exact RGBA, pixel grid, or consistent frames. Code-generated sprites are deterministic and free, but illustration quality is limited. Do not falsely claim pixel-perfect anime animation from a model without visual verification. No third-party character IP.

## Player quality priority
Use the highest-quality retained original PNGs for visible player art. Optimize repeated frames and transparent canvas uploads rather than reducing source resolution or palette. Current locomotion:14 slots,12 original texture pages,72MiB decoded RGBA versus126MiB for14 padded1536px textures (before driver overhead). Logical display height and gameplay collider remain independent.
