# Naruto visual integration — November 2026

The user's requested fan-art character remains in the game. Existing generated
movement PNGs are preserved in `art/source/naruto-ai`; the source ledger records
prompts and hashes. ImageGen does not expose its model version. Human review is
pending; this document does not claim ownership of the Naruto character.

## Active animations

The 32px locomotion/compatibility sheet has22 frames: idle0–3, side run4–7,
down8–9, rear idle10, rear run11–12, side idle13, and four skill pairs14–21.
WASD/arrows retain working four-direction locomotion and last-facing idle.

A separate 1536px master sheet, `hero_actions`, provides two full-resolution
poses each for Rasengan, empty-hand taijutsu, shuriken and paper-tag placement.
Its feet are anchored at[768,1408], and its runtime visual follows the unchanged
physics player. Original generated action pixels are preserved on padded canvases.
Naruto has no sword or kunai. Taijutsu uses one curved pressure-sweep VFX, never a
flying fist, crossed slash or twin strike. The internal `slash` weapon ID remains
for save compatibility; existing damage formulas have not changed.

Rasengan has two charge, two flight-spin and two impact poses at1536px. Flight
displays a96px canvas while retaining the old21px collision diameter. The supplied
blue orb reference and generated variants are stored as original PNGs. New weapon/HUD images now use the original PNG files directly. No export is
resized or palette-reduced; display size is set separately by the renderer.

## Additional artwork

`art/source/ai-overhaul` contains individual generated weapon/VFX, meadow and HUD
images with prompts/hashes in its provenance ledger. Scripts only normalize and
pack those images. `/art-preview.html` previews actual sheets and manifest crops.
Twin slash/kunai remain for another character. Max-color variants and
Rasenshuriken/ground-wind art are prepared but their evolution rules are not
enabled; see `SKILL_EVOLUTION_ART.md`. Monster artwork is in `ENEMY_ART.md`.

## Validation

Run `npm run verify`, `npm run test:e2e`, and `npm run assets:preview`.
Python checks cover source hashes, master-pixel preservation, fixed feet,
transparent margins, distinct animation poses and exact sheet/frame equality.
Browser tests cover real movement keys, matching skill gestures, combat,
projectile collision sizes and absence of sword effects. Current results and
limitations are recorded in `PROGRESS.md`; deployment remains unperformed.

## Final source-preservation correction
The user rejected compressed pixel exports. Every new AI frame, weapon icon,
grass tile and HUD panel now uses byte-identical original PNG copies in
`public/assets/runtime` or its direct image path. Multi-atlas metadata handles
virtual padding without changing image pixels. Tests compare both RGBA crops
and entire runtime/source files. The old native-size/palette export policy is
superseded. Existing reliable character locomotion remains unchanged.

## Original movement restoration
Visible idle/walk now uses original PNGs via hero_locomotion, never32px palette-reduced exports.14 slots share12 original GPU pages; repeated idle holds reuse textures.56px occupied height and feet match action art. Legacy hero remains hidden, keeping its40px physical body and animation state. Source bytes and original provenance remain unchanged.
