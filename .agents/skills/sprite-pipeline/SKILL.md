---
name: sprite-pipeline
description: Creates and verifies pixel-perfect animation frames, spritesheets and frame metadata for Phaser.
---

# Deterministic spritesheet pipeline
Read `docs/ART_PIPELINE.md`, `docs/ART_CONTRACT.json`. Required steps: generate/import individual PNG frames, normalize canvas/alpha/anchor, `python scripts/pack_frames.py`, `python scripts/validate_sprites.py`, inspect animation in Phaser. For new animation names or frame counts update art contract, generator, Phaser loader and animation ranges together. No silent resampling, approximate manual crop, third-party packer default trim, or one-shot AI-generated full sheet. Every crop must byte-match its frame source. Return artifact paths and test evidence.
