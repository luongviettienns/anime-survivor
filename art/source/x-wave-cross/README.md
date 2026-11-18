# Dual X crescent combination

Three independently generated transparent RGBA frames combine the existing cyan Ice and violet Dark Fire waves into a stronger X. Full prompts, references and native hashes are in provenance.json. Originals are copied byte-identically to runtime;1792px virtual cells add transparent padding only. qa/contact-sheet.png is a reduced nearest-neighbor review preview, not runtime artwork.

Build: python scripts/x_wave_art.py. Check: python scripts/x_wave_art.py --check. Runtime loop is three60ms phases, rotated with aim; gameplay damage, pierce, size and status rules are preserved. Original sources/public/build PNG hashes match.

Verification: npm run verify passed22test files/85tests, TypeScript, lint, architecture, all asset validators and production build. qa/gameplay.json records all3frames in4directions, actual Slow+Burn hits, all4Dash animation durations225ms and unchanged220px level1travel. qa/action-states.log records6side sword clips, accepted hits without interruption, Dash/sword mutual gating and queued visual retained once. qa/keyboard.json records actual WASD movement. No page/console/network errors in effect/state checks. Gameplay screenshot and contact sheet were inspected.

The headless browser uses the isolated production build at http://127.0.0.1:5184/. No full10minute run, crowded GPU profile or user visual approval claimed. The stream draft was rejected and is not loaded.
