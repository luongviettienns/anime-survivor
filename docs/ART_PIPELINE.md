# Exact pixel sprite pipeline (mandatory)

## Golden rule
**Never ask image AI to deliver a finished spritesheet as a single PNG.** Models can insert separators, inconsistent cells, drifting animation frames and malformed anatomy. Even if it looks fine, automated slicing can cut half of a character.

## File contract
`docs/ART_CONTRACT.json` is authoritative, NOT a prose guess. Prototype:
- Hero: 32x32 RGBA individual PNGs, `idle` 4 frames + `walk` 4 frames.
- Enemy: 24x24 RGBA PNGs, `walk` 4 frames.
- Hero sheet: 256x32; enemy sheet: 96x24; NO GUTTERS.
- Frame origin bottom center (feet use consistent pixels); transparent margins; never touch any canvas edge.
- Baseline code-generated art: `python scripts/generate_assets.py`.

## AI-generated frame workflow (when Antigravity has an image-generation capability)
1. Produce ONE coherent **reference** character image, then a canonical front-view idle reference. Ask for original anime-inspired characters only.
2. Request 1 pose/frame at a time. If output isn't exact-size RGBA, use `python scripts/normalize_ai_frame.py --input SOURCE.png --output art/frames/hero/idle/000.png --sprite hero` (only for transparent input). The script preserves aspect ratio, nearest-neighbor resamples, and bottom-center anchors; visually review its result. No background guessing or bilinear smoothing.
3. Normalize each frame to target transparent canvas using a common feet anchor. Use nearest-neighbor resizing ONLY; restore transparent background, hand-inspect silhouette and head position.
4. Quantize to shared curated palette; avoid anti-aliased fringe; never let actual pixels touch edges. Do not auto-crop each frame to its tight bbox independently then center it (causes visible jitter).
5. Save as `art/frames/hero/idle/000.png` ... `003.png`, `art/frames/hero/walk/000.png` ... `003.png`. Input paths must be deterministic.
6. Run `python scripts/pack_frames.py --input art/frames --output public/assets`.
7. Run `python scripts/validate_sprites.py`, inspect frame contact sheet and real Phaser animation. If validation fails, do not merge the asset.
8. Run `python scripts/make_contact_sheet.py` and review `art/contact_sheet.png`; review animation in browser at native logical resolution and 2x zoom; inspect jitter/feet contact, not just dimensions.

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
