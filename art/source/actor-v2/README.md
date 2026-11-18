# Actor assets v2 — reduced scope, native PNGs

Latest user direction: stop the expanded generation batch; at most five additional frames. Four calls were made after that limit: two succeeded (right Dash glide, boss hit), two failed on image-tool quota. No further generation is scheduled. Boss defeated remains missing.

Reduced coverage: Kirito down/up actions, compact authored four-direction Phantom Dash (5/5/4/3 timed entries, each 180ms); normal enemy/shade/mage hit and defeated in four directions; elite front hit + front defeated, boss front hit only. Elite/boss back/side reaction directions are deferred. No mirrored Kirito poses. source/provenance.json retains every completed original, including unused poses; kirito/up/run_contact_l touches its source edge and is excluded from clips.

Latest size request: world artwork +100%, separately from camera1.5x. Review standing targets128px for player/normal/elite,256px for boss. HUD and damage text retain their prior size. Native PNG pixels are unchanged; resizing only applies when displaying. Atlas metadata is authoritative. complete in catalog.json means the reduced 58-clip scope, not every earlier requested action/direction.

Rebuild: python art/source/actor-v2/pack_review.py --complete (uses existing reviewed scripts/pack_frames.py and scripts/validate_sprites.py). Source cache paths fall back to retained source/originals. No image generation is needed. The cancelled expanded plan is archival only.

The staged integration.patch applies only to the recorded source snapshot in the separate project at C:/Users/ASUS/Desktop/AnimeSurvivor-AssetReview-4dir-20261118/project. Its changes are active at http://127.0.0.1:5184/?play=1&hero=kirito . Live5173 source/runtime files have not been changed by this work. It keeps existing dash domain stats, uses directional art/afterimages, preserves collision sizes while enlarging visuals, and keeps HUD in a separate camera. Applying elsewhere also requires copying the four dash atlas files and their referenced original pages from site/assets/actor-v2 into public/assets/actor-v2. Review against the current source before applying; do not overwrite an active playtest.

QA evidence is in qa/. Existing legacy boss neutral/cast source may touch image edges; packing adds padding but cannot restore already missing source pixels. Native high-resolution art is larger in download/VRAM than downsampled art. No user visual acceptance or long-run performance test is claimed.

The standalone HTML expects /vendor/phaser.js. For a fresh standalone preview copy the already-installed node_modules/phaser/dist/phaser.js into site/vendor/phaser.js before serving site/. This dependency is intentionally not vendored in Git.
