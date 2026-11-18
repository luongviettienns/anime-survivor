# Compact remaining actor poses

User approved approximately13newindividualimages for this batch, replacing the old five-frame limit for this batch only. Scope: Kirito right run (2poses), left/right hit + defeated (4), left/right Ice + Dark Fire + X cut (6), boss front defeated (1). Other elite/boss directions remain deferred.

Every tool call creates one native transparent PNG, with strict same-direction reference and cyan-left/violet-right handedness. Retain full prompt/path/reference/hash in source/*.json and source/provenance.json. No original pixels are resized, recolored, alpha-cleaned or quantized. Ground anchor overrides, if needed after visual inspection, are metadata only.

Import: python scripts/actor_v3_art.py . Pack and validate: python scripts/pack_actor_v3.py . Native runtime export/check: python scripts/export_actor_clips.py [--check]. The packer reuses neutral/hit poses, pads2048px frames, creates sheets capped at4entries/page, calls the established pack_frames/validate_sprites exact-crop validation, and only then updates canonical src/game/config/actorClips.json. Originals are loaded once as native textures; archive sheets are not GPU-loaded.

Retain camera1.3, standing hero/normal/elite112px and boss224px. Retain Wave180/450/280ms release timing. Only Wave starts owned; Dash and other weapons still require upgrade cards. No extra melee mechanic or deferred enemy directions are added.

Completion and visual/gameplay QA will be recorded separately; generated drafts alone are not accepted gameplay assets.

Completed:13native poses ->14compact clips/49timed frame entries/18archive sheets. Canonical actorClips.json now provides right run and both side hit/death/basic/Wave1/2/3; boss front defeated is attached with a500ms victory transition delay. No elite/boss back/side reaction poses were generated.

Verification: npm run verify PASS18files/76tests plus asset/build checks;13source/public/dist PNG hashes identical. check_gameplay.cjs ran against5184: right run two distinct native poses;6actual side-wave clips; left/right accepted hit, owned-basic and death; detached boss corpse with physical body disabled and subsequent GameOver. No page/console/network errors. Contact sheet and gameplay screenshots were visually inspected. qa/report.json records scope and omissions.

A controlled test initially reset the next attack before the previous attack animation cleared (the weapon cadence was concurrently changed); the fixture now clears the prior action and waits for observed sprite frames. No gameplay formulas were changed for the fixture. Other concurrent weapon/Dash changes in the worktree are deliberately preserved.

Native art can consume substantial GPU memory. No10minute run or crowded-combat GPU profile was performed, and user visual approval remains outstanding.
