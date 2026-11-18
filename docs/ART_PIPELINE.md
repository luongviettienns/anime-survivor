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

## Smooth runtime display (latest user preference)
The user rejected hard blocky edges across game assets. Runtime now uses Phaser pixelArt:false, antialias:true (LINEAR texture sampling), and CSS image-rendering:auto. This supersedes older nearest-only display instructions. PNG sources, padded frames and packed sheets remain byte-identical; only sampling changes. Rounded game positions stay enabled. Small legacy pixel textures may look softer; this is the intended display preference, not resampled source art.

## 2026-11-18 runtime derivatives (supersedes original-only runtime export)
User authorized Lanczos pre-scaling. Original art/source PNGs and padded archival sheets stay unchanged. export_original_art.py produces 1/8-size runtime pages and scales trim, virtual canvas, opaque bounds and hand coordinates together; displayScale multiplies by eight to preserve world size. pack_frames.py continues pixel-identical archival packing. hibit_items.py deterministically draws 64px item illustrations with supersampled thin outlines and derives four weapon icons from retained art. Never enlarge the old 16px icons. validate_sprites checks archival frames; test_ai_import checks runtime derivatives and source hashes.

## Directional normal-monster attacks
Built-in imagegen produces ONE original keypose per PNG, with walk-down/side/up originals as identity and camera references. Two authored keyposes per direction (windup, strike), neutral/recovery retained from locomotion: four timed frames, three direction rows per monster. Left mirrors the right-facing row. melee_art.py derives runtime frames only, transparent256px canvas, foot baseline192, 0.5 display scale; retained originals are never altered. pack_frames packs each frame exactly, validate_sprites compares each crop, test_melee_art checks anchors and source hashes. Wave/claw VFX now use four independently generated ImageGen PNGs per effect, exported by skill_vfx_art.py into384px frames. Player-impact frames remain original procedural code. Source ledger contains prompts and hashes; model version not exposed.

Detailed skill VFX: art/source/skill-vfx retains8 selected original single-frame ImageGen PNGs and2 rejected clipped drafts. Complete generation/edit prompts and hashes live in provenance.json. skill_vfx_art.py exports4-stage384px runtime canvases, transparent padding and centered alpha-bounds fitting; no source edits. The ground seal renders beneath actors; claw art rotates with locked dash aim. Shadow_actor128x64 and shadow_pickup64x32 are original radial alpha gradients generated by shadow_art.py, synced after physics postupdate so feet, attack overlays and shadow agree.

Arcane UI:8 individual built-in ImageGen originals retained in art/source/arcane-ui with full prompt/hash ledger; only5 frame/gauge/crown assets exported/loaded at runtime after the user removed manga word labels. ui_art.py exports256px PNGs without changing source alpha, and declares content-frame bounds from alpha>=8 plus2px to exclude invisible halo padding. Upgrade cards use nine-slice borders48px and explicit logical layout anchors; HUD uses current canvas center/edges. damage_font.py creates original slanted digits on a256px BMFont atlas with exact XML rectangles and an original96px explosion-number mark. No font dependency or third-party artwork. Crit uses the existing crit icon; explosive hit style propagates from MineSystem via WeaponSystem hit feedback, with no CRIT/SMASH/BOOM runtime words.

## Latest mandatory user rules: camera, directions, full-quality art and separate review port
- Before generating characters or skills, inspect the current game camera and existing actor references. Match its slightly elevated top-down three-quarter view, head/shoulder planes, body proportions and ground contact; front-facing presentation art alone is not a gameplay-ready directional set.
- Author down/front, up/back, left and right character attack/skill directions. Maintain character-local weapon hands and element colors in every view. Asymmetric equipment (cyan left-hand sword, violet right-hand sword) requires separately authored left/right artwork; horizontal mirroring is forbidden when it swaps this mapping.
- Match silhouettes, character scale, palette, light direction and measured foot anchors across frames/directions. Validate windup, release/strike and recovery timing; optimize repeated holds instead of blindly following prompt frame counts. Explicitly list any missing states/directions.
- Preserve original RGBA PNG dimensions, colors and alpha. No runtime source downscale, quantization or lossy encoding for this user-requested artwork; this supersedes earlier pre-scale permission for future asset creation unless the user explicitly requests a derivative. Transparent padding and byte-identical packing are allowed; reduced review thumbnails must be labeled.
- Travelling VFX may rotate from a documented canonical direction. Ground effects must retain the camera's projected ellipse/perspective and feet anchor; do not rotate a flat ground ring into an upright effect. Status VFX follow the appropriate feet/torso anchor and have independent loop/end clips.
- After asset generation/validation, test in an isolated review copy on a free explicit port (prefer 5184, use strict-port behavior). Port 5173 belongs to the user's active play session: do not stop/restart its server, navigate/control its tab, or overwrite its loaded code/assets. A second server sharing the same watched files is not isolation; changes may trigger HMR on 5173.
- Review directional casts and VFX in the game camera at intended logical size; inspect keyboard direction changes, both sword hands, anchors, release timing, clipping, jitter and browser errors. Save representative screenshots and distinguish an asset harness from actual gameplay tests. Do not claim user approval or gameplay verification from a static contact sheet.

- Latest size override (2026-11-18): independently of camera1.5x, enlarge combat world artwork +100%; normalized player/normal/elite standing body128px, boss256px. Enlarge skills/VFX/pickups/shadows together, preserve source PNGs, world collision sizes and HUD/damage-text sizes. A separate HUD camera keeps UI anchors stable. Apply/playtest in the isolated copy before changing protected5173.
- Latest batch reduction: at most5 additional generated frames after the cap. Elite/boss reactions are reduced to front-only, one hit pose and one defeated pose, with intermediate falls/other directions deferred. Boss defeated is still missing because the image tool reached its usage limit. Never resume the archived192-frame target automatically.

- Aura sizing correction: size elite/boss layers from fixed standing opaque model bounds, rather than multiplying independent aura scale constants. Outer aura is at most0.9body-height and1.2body-width; projected rings remain centered at footOffset. Recheck after global world-art scaling.

## Consolidated main project — latest presentation override
The user explicitly requested merging the review into the main project. Runtime src/ and public/assets/actor-v2/ are now canonical; old integration.patch/temporary-integration/ source snapshots are archival. Live actor metadata is src/game/config/actorClips.json and phantomDashAssets.ts. Export/check native bytes using scripts/export_actor_clips.py; it is included in npm run assets:validate.

Latest target supersedes previous128/256px and1.5x preview values: standing player/normal/elite112px, boss224px, world camera1.3x, HUD camera1x. Scale changes affect rendering only; source pixels/alpha and collision dimensions remain unchanged. All earlier missing-state disclosures still apply. The sibling review project is retained as a backup;5184 serves the canonical main production build, not the old source copy.

## Compact remaining-pose batch — 2026-11-19
User explicitly approved approximately13newindividualpose images for this batch, superseding the earlier five-image cap for this batch only. art/source/actor-v3 retains all13native RGBA originals and full prompts/reference/hash provenance. scripts/actor_v3_art.py imports/measures; pack_actor_v3.py reuses existing poses and calls pack_frames/validate_sprites for14clips/49entries/18pages; validate_actor_v3.py checks originals and exact sheets. Runtime export preserves new originals under public/assets/actor-v2/v3/. All native PNGs remain byte-identical.

Kirito right run, side hit/defeat/basic and all3Wave animation variants now have genuine side artwork. Boss front defeated is present; victory waits500ms so its pose is visible before GameOver. Elite/boss side/back reactions remain explicitly deferred. Current camera1.3/body112/224profile remains. Wave-cut timings remain180/450/280ms; concurrent weapon/Dash progression edits are outside this art batch. Full-frame down/up animations remain more detailed than the deliberately compact side sequences.
