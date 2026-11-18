# Dual element sword / VFX asset package

Assets only: no loader, combat, skill, UI or other game code is changed.

## Delivery and acceptance

- Three character clips: ice cast, sequential ice → dark fire cast, simultaneous X cast.
- Ten VFX clips: three travelling attacks; ice, dark fire and dual impacts; Slow loop/break; Burn loop/end.
- Preserve supplied character reference detail, sword-hand mapping and cyan/violet palette.
- Generate one PNG per unique pose/effect frame. Reuse neutral/hold frames deliberately.
- Preserve original RGBA PNGs byte-for-byte in `public/assets/dual-element/originals/`.
- Pad frames to a shared canvas, then pack exact pixel copies. No resampling, palette reduction, JPEG/WebP or lossy compression.
- Supply measured anchors, frame durations and projectile release events in `animations.json`.
- Inspect contact sheets; validate every packed crop and original/runtime hash.

## Files

- `reference.png`, `design-brief.txt`: user-supplied reference and brief, unchanged.
- `characters/`, `vfx/`: generated source PNGs.
- `asset-plan.json`: behavior and timing design; gameplay values remain runtime configuration.
- `provenance.json`: prompts, source hashes and reference provenance.
- `build_package.py`: deterministic padding/packing and byte comparison using existing project tools.
- `../../../public/assets/dual-element/`: delivery PNG pages, sheets and metadata.
- `../../review/dual-element/`: reduced-size contact sheets for review only.

Rebuild from this repository root: `python art/source/dual-element/build_package.py`.
The generation manifests retain the original tool output paths as provenance; rebuild uses the checked-in source PNGs once imported.

## Animation / integration contract

The character art has one front-facing cast direction. It is **not** a complete eight-direction locomotion or attack set. Projectile art has an east-facing canonical direction; a future renderer may rotate these effects. Do not mirror the character casually: this swaps the two swords.

LV1 releases one ice projectile. LV2 releases ice first and dark fire later, with separate collision ownership. LV3 releases one combined X projectile, with one primary hit applying both Slow and Burn. VFX must not independently generate damage.

Slow follows feet, reduces movement only and ends with ice break; it does not immobilize. Burn follows torso and ends with dark fire dissipation. Status visuals loop until their corresponding externally controlled status ends. Neither animation length nor visual opacity defines damage, percentage, tick interval or status duration. Slow/Burn may coexist and must end independently.

The original PNG pages are the preferred full-quality texture source. Padded sheets also preserve every pixel but contain more transparent area. Loading all full-resolution pages or all sheets simultaneously can consume substantial VRAM; runtime loading and on-screen size are deliberately not implemented in this asset-only change.

PNG uses lossless file compression: it does not remove pixels or reduce image quality. Preview thumbnails are not runtime assets. This package bypasses the existing runtime downscale pipeline because it has not been wired into that pipeline.

The supplied reference resembles an existing commercial anime character. Reference/design ownership and redistribution permission have not been independently established; generated fidelity to that reference is not a claim of an original character design.

## Verification boundary

Automated pixel/hash validation checks packaging fidelity, not animation smoothness or gameplay. Contact sheet inspection is visual review by the agent, not user approval. In-game placement, gameplay collision timing and GPU usage remain unverified until integration is requested.
