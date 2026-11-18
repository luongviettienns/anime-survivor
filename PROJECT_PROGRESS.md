# Anime Survivor — Tiến độ Dự án (Project Progress)

> Theo dõi tiến độ tổng thể của dự án theo quy chuẩn Engineering & Superpowers.
> Bắt buộc cập nhật sau mỗi đầu việc / chuyển đổi trạng thái checklist / hoàn thành phase.

---

## Tổng quan các Phase

- [x] **Phase 0: Environment Setup & Starter Verification** ✅ *(Hoàn thành)*
  - [x] Đưa cấu trúc dự án từ thư mục con ra thẳng thư mục gốc workspace.
  - [x] Khởi tạo Git repository và cấu hình `.gitignore`.
  - [x] Kiểm tra môi trường Node.js (v24.19.0), npm (11.17.0), Python (3.13.15), Pillow (12.3.0).
  - [x] Cài đặt dependencies (`npm install` -> 160 packages).
  - [x] Kiểm tra tính tương thích của thư viện `phaser` (v4.2.1) và fix các lỗi TypeScript / API (`setTint`, parameter typing của overlap callback, unused parameters).
  - [x] Chạy pipeline tạo và xác thực assets: `npm run assets:generate` & `npm run assets:validate` (PASS).
  - [x] Chạy kiểm tra kiến trúc: `npm run check:arch` (PASS - boundaries & file size <=210 lines).
  - [x] Chạy typecheck và lint: `npm run typecheck` & `npm run lint` (PASS - 0 errors).
  - [x] Chạy unit tests: `npm run test` (PASS - 5/5 domain tests via vitest).
  - [x] Chạy production build: `npm run build` (PASS - 14 modules bundled to dist/).
  - [x] Cài đặt Playwright browser (`npx playwright install chromium`) và chạy E2E smoke test: `npm run test:e2e` (PASS - 1/1 test passed, canvas 960x540 verified, 0 errors).
  - [x] Chụp screenshot màn hình thực tế: `test-results/anime-survivor.png` (38.7 KB).
  - [x] Ghi lại kết quả nghiệm thu Starter vào `PROJECT_PROGRESS.md` và `docs/PROGRESS.md`.

- [x] **Phase 1: 60-second Playable Slice & Gameplay Logic Contract** ✅ *(Hoàn thành)*
  - [x] Thiết kế Implementation Plan từ `AnimeSurvivor-GameplayLogic-Spec.md` tại `docs/superpowers/plans/2026-10-27-phase1-gameplay-logic.md`.
  - [x] **Task 1**: Centralize Configuration (`constants.ts`) & Pure Vector / Movement / Chase Domain (`src/domain/vector.ts` + `tests/vector.test.ts`).
  - [x] **Task 2**: Pure Combat, Contact Damage I-Frames (`invulnerableUntilMs = -Infinity`) & Idempotent Enemy Hit/Death Rules (`src/domain/combat.ts` + `tests/domain.test.ts`).
  - [x] **Task 3**: Pure Auto-Targeting (nearest alive active within 520px, ID tie-break) & Weapon Cooldown Domain (`src/domain/targeting.ts` + `tests/targeting.test.ts`).
  - [x] **Task 4**: Pure Pickups (`'xp' | 'heal'`, single collection state machine, remove level-up auto-heal) & Upgrade Queue (`src/domain/progression.ts`, `src/domain/pickups.ts` + `tests/pickups.test.ts`).
  - [x] **Task 5**: Refactor Game Systems (`MovementSystem`, `EnemySystem`, `WeaponSystem`, `DamageSystem`, `PickupSystem`) & `GameScene` (single group overlap collider for pickups, shutdown cleanup, debug bridge).
  - [x] **Task 6**: Comprehensive Playwright E2E Gameplay Verification (`tests/e2e/game.spec.ts` checks A, B, C, D, E, G) & `npm run verify`.

- [x] **Phase 2: Full Roguelite Core** ✅ *(Hoàn thành)*
  - [x] Hệ thống WaveDirector (lịch trình spawn quái tăng dần theo thời gian `src/domain/waves.ts`).
  - [x] Màn hình chọn nâng cấp (`UpgradeScene.ts`) khi lên cấp, hỗ trợ pause game.
  - [x] Bổ sung 2 loại vũ khí mới (`slash` tầm gần có knockback, `orbital` shuriken) và định nghĩa vũ khí dạng dữ liệu (`src/domain/weapons.ts`, `src/domain/upgrades.ts`).
  - [x] Bổ sung các biến thể quái vật (`slime`, `shade`, `mage` có telegraph bắn đạn) và Boss cuối ở mốc 10 phút (`src/domain/enemies.ts`, `HostileProjectilePool.ts`).
  - [x] Màn hình `TitleScene.ts`, `PauseScene.ts` đầy đủ, lưu trữ High Score & Settings cục bộ (`StorageSystem.ts`).

- [x] **Phase 3: Art & Polish** ✅ *(Hoàn thành)*
  - [x] Mở rộng pipeline deterministic pixel-art sprite frames (`enemy_shade`, `enemy_mage`, `boss`, `shuriken`, `slash`, `enemy_bolt`) qua kiểm định SHA-256 (`scripts/shinobi_enemies_weapons_art.py`, `docs/ART_CONTRACT.json`).
  - [x] Hiệu ứng particles & pooled damage numbers (`VfxSystem.ts`), âm thanh SFX 16-bit PCM `.wav` tự sinh 100% nguyên bản (`scripts/generate_audio.py`, `AudioSystem.ts` có voice cap).
  - [x] Thiết lập Accessibility (`reduceFlashing`, `reduceScreenShake`, `muted`, `volume` lưu trong `StorageSystem.ts` và điều chỉnh trong `PauseScene.ts`).

- [x] **Phase 4: QA & Static Deployment** ✅ *(Hoàn thành)*
  - [x] Mở rộng bộ Playwright E2E scenario test (`tests/e2e/game.spec.ts` — 5/5 kịch bản E2E toàn diện từ Phase 1 đến Phase 4).
  - [x] Stress benchmark với 120+ enemies đồng thời cùng cả 3 vũ khí (`orb`, `slash`, `orbital`), particles, damage numbers, audio SFX hoạt động mượt mà (`colliders === 3`, `activeDamageTexts <= 24`, `frameDeltaMs < 100`, `0` console/page errors).
  - [x] Build bản tĩnh (`dist/`) và kiểm tra toàn diện qua `npm run assets:generate`, `npm run verify` (40/40 unit tests, 0 lint/TS errors, architecture guard OK, sprite validator OK) và `npm run test:e2e` (5/5 E2E tests PASS).

---

- [x] **Phase 5: Map Overhaul & VFX Combat Polish (Shinobi Shrine Courtyard)** ✅ *(Hoàn thành)*
  - [x] Loại bỏ map cỏ sọc gây nhức mắt; thay bằng nền slate-jade twilight (#16242e) độ tương phản vi mô <4%.
  - [x] Bổ sung quảng trường đá cẩm thạch (shrine_plaza), cổng Torii thần đạo (torii_gate), đèn đá rêu phong (shrine_lantern) và cây hoa anh đào sakura hữu cơ (tree).
  - [x] Xây dựng InfiniteMapSystem streaming theo chunk phân tầng depth chuẩn xác, giải quyết triệt để cây đè lên phiến đá.
  - [x] Tinh chỉnh VFX: loại bỏ Additive blend gây mù mắt cho đòn thường; blend Additive có chọn lọc cho crit/nổ/level-up; thêm ghost trail cho phi tiêu; cắt gọn frame trắng vfx_death thành khói linh hồn tím; thêm tia sáng nhặt ngọc.
  - [x] Thiết kế lại UpgradeScene và HudOverlay theo pixel art cao cấp.
  - [x] Kiểm thử toàn diện: npm run verify (43/43 tests, 0 lint/arch/typecheck errs) và npm run test:e2e (5/5 E2E scenarios PASS).

- [ ] **Phase 6: Balance Overhaul (Flat Stats), Multi-Hero & Evolution Metamorphosis** 🔄 *(Đang triển khai — Nhánh `feat/flat-balance-scaling-drops`: đã hoàn tất Mục 1 & Mục 2)*
  - [x] Đặc tả phân tách 2 mục độc lập tại [docs/EVOLUTION_SPEC.md](docs/EVOLUTION_SPEC.md) (7 chỉ số bị động số cụ thể không dùng % + 2 nhánh tiến hóa Cửu Vĩ / Tiên Nhân Cóc + KCM cuối game).
  - [x] Nghiên cứu & lập Bảng thông số cân bằng số cụ thể (Flat-Number Balance, Enemy Scaling theo phút, Đường cong XP, Item rơi bắt buộc nhặt & Đa nhân vật Mạnh/Yếu riêng): xem tại [docs/GAME_BALANCE_SHEET.md](docs/GAME_BALANCE_SHEET.md).
  - [x] Tổng hợp kế hoạch các mục nâng cấp & quy chuẩn từ bộ skills (`physics-arcade`, `game-ui-ux`, `game-performance`, `audio-design`, `procedural-gen`, `game-feel`, `roguelike`, `phaser-gameplay`) tại [docs/UPGRADE_AND_SYSTEM_PLAN.md](docs/UPGRADE_AND_SYSTEM_PLAN.md) (bao gồm: Đa màn chơi, Không shop tăng chỉ số ngoài trận, Thuật Clone thoát hiểm).
  - [x] Kế hoạch kỹ thuật 4 giai đoạn triển khai: xem tại [docs/superpowers/plans/2026-11-18-kyuubi-rampage-evolution-plan.md](docs/superpowers/plans/2026-11-18-kyuubi-rampage-evolution-plan.md).
  - [x] Triển khai Cân bằng Phẳng (7 Passive Max Lv.5, Smart Weighted Roll, tái cân bằng 4 vũ khí thường), Enemy Minute Scaling (`Boss 4500 HP`), Đường cong XP 3 chặng & Drop xác định (Heal mỗi 25 quái / Magnet toàn map mỗi 90 quái).
  - [x] Triển khai Sảnh Game & Chọn Nhân Vật mặc định khi mở game (`TitleScene.ts`, `LobbyPanel.ts`, `src/domain/heroes.ts` dùng bộ asset `lobby_*` & `lobby-layout.json`: Naruto mở khóa sẵn, Kirito tạm khóa chờ hoàn thiện asset).
  - [x] Triển khai Mục 6 (Wave Swarm & Boss/Elite): 6 giai đoạn lịch spawn tích lũy, vùng spawn elip ngoài khung hình `1280×720`, vòng vây 360° mỗi 60s + cụm chặn hướng, `enemy_elite` (mỗi 90s + aura tím + drop Heal/Magnet), `boss_blood_slash` quạt `150°` & tăng trưởng melee quái thường `+3 Dmg/phút` (giữ `kunai` & `slash_x` chờ sau).
  - [x] Mở khóa & tích hợp hoàn chỉnh nhân vật **Kirito** + kỹ năng **Dual Element Energy Slash** (nhánh `feat/kirito-dual-element` sau khi merge `feat/flat-balance-scaling-drops` về `main`): chỉ số phòng thủ cao (`140 HP`, `5 Giáp`, `950ms i-frame`, `230 px/s`, `84 px magnet`), 3 cấp animation `kirito_wave_lv1_ice` / `lv2_sequential` / `lv3_x` đồng bộ release VFX (`vfx_ice_wave`, `vfx_dark_fire_wave`, `vfx_dual_element_x`), trạng thái `Slow` & `Burn` độc lập cùng VFX bám chân/thân & tan vỡ (`src/domain/statusEffects.ts`, `DualElementSystem.ts`, `EnemyStatusVisuals.ts`), kèm fix lệch hitbox `setCircle` của multiatlas `1792×1792`.
  - [x] Triển khai lại **Phantom Dash tự động Lv.1–5** & **Dual Element Slash tái phân bổ** + khóa vũ khí ninja riêng cho Naruto (giữ 7 passive dùng chung): `dual_slash` mở combo 2 sóng từ Lv.2, tăng kích thước sóng (`1.00×→1.36×`, Lv.5 `Dual X`), xuyên (`1→2→3→4→8`) & đẩy lùi (`70→135`); `Phantom Dash` bỏ hẳn bấm tay, Lv.1 tự dash xuyên qua đúng 1 địch gần nhất, Lv.2–5 giảm CD (`7000→3600 ms`), tăng dmg (`45→115`), tầm (`220→460 px`), xuyên `1→2→3→4`, và dash liên tiếp `2→3` lần; merge về `develop`.
  - [ ] Evolution Trials (Kyuubi Rampage / Toad Sage).
  - [x] Kiểm thử toàn diện phần Mục 1, Mục 2, Sảnh Game, Mục 6 & Kirito (`npm run verify` & `playwright test`).

## Nhật ký chi tiết (Log)

### 2026-11-18
- **Nghiên cứu Cân bằng Toán học (Flat-Number Balance), Đa Nhân Vật & Đặc tả Tiến Hóa**:
  - Kiểm toán lỗ hổng cân bằng hiện tại trong mã nguồn (`enemies.ts`, `waves.ts`, `progression.ts`, `weapons.ts`, `GameScene.ts`): quái không tăng sức mạnh theo thời gian, Boss chỉ 900 HP, XP quá rẻ (`3 + level * 2`), `heal_pickup` chưa rơi thực tế trong game, `orb` tăng DPS gấp 10.2 lần thành súng máy (`240ms`), và các buff đang tính theo `%`.
  - Nghiên cứu cân bằng lại **tốc độ đạn/quay, hồi chiêu (dải 460–1200ms) và độ tăng trưởng từng cấp (Lv.1–5)** cho toàn bộ 4 vũ khí thường và 4 vũ khí tiến hóa.
  - Chốt nguyên tắc **100% Số Cụ Thể (Zero-Percentage)** cho toàn bộ nâng cấp chỉ số, dạng tiến hóa, tăng trưởng quái theo phút, và chỉ số Hero.
  - Thiết kế hệ thống **4 Hero Anime mẫu** (Naruto, Sasuke, Ichigo, Luffy) với điểm mạnh/yếu đối trọng buộc người chơi phải nhặt XP, bình máu/nam châm và chọn nâng cấp để bù đắp trụ qua 10 phút.
  - Cập nhật đồng bộ tại [docs/GAME_BALANCE_SHEET.md](docs/GAME_BALANCE_SHEET.md) và [docs/EVOLUTION_SPEC.md](docs/EVOLUTION_SPEC.md).

### 2026-10-28
- **Hoàn thành Phase 2, Phase 3 & Phase 4 (Bản phát hành v1.0 Hoàn chỉnh)**:
  - **Phase 2 (Full Roguelite Core)**: Triển khai đầy đủ `weapons.ts`, `upgrades.ts`, `enemies.ts`, `waves.ts`, `storageSchema.ts` (40/40 Vitest unit tests PASS trên 8 test files). Refactor toàn bộ `GameScene.ts` (153 dòng), `WeaponSystem.ts` (154 dòng), `EnemySystem.ts` (157 dòng), `HostileProjectilePool.ts`, `PickupSystem.ts`, `StorageSystem.ts`, `HudOverlay.ts`, `TitleScene.ts`, `UpgradeScene.ts`, `PauseScene.ts`, `GameOverScene.ts` đảm bảo mọi file `.ts` đều `<= 160` dòng vật lý.
  - **Phase 3 (Art & Polish)**: Mở rộng pipeline deterministic pixel-art (`scripts/shinobi_enemies_weapons_art.py`) sinh frame-by-frame cho `enemy_shade`, `enemy_mage`, `boss`, `shuriken`, `slash`, `enemy_bolt` và xác thực pixel-identical bằng `validate_sprites.py`. Tự sinh 6 file âm thanh SFX 16-bit PCM `.wav` (`scripts/generate_audio.py`) kèm `AudioSystem.ts` giới hạn polyphony và `VfxSystem.ts` quản lý ring-buffer 24 damage numbers + particles + accessibility (`reduceFlashing`, `reduceScreenShake`, `muted`, `volume`).
  - **Phase 4 (QA & 120-Enemy Stress Benchmark)**: Bổ sung `spawnSwarm(120)` và `getFrameDeltaMs()` vào `DebugBridge.ts`, viết kịch bản E2E `H: 120-enemy stress benchmark` trong `tests/e2e/game.spec.ts` (160 dòng). Chạy `npm run assets:generate`, `npm run verify` và `npm run test:e2e` đạt 100% PASS (40/40 Vitest tests, 5/5 Playwright E2E tests, 0 lỗi console/page), cập nhật ảnh chụp thực tế `test-results/anime-survivor.png`.
- **Kiểm toán Kỹ thuật Toàn diện & Lập Master Plan Hoàn thiện Dự án v1.0**:
  - Đối chiếu mã nguồn hiện tại với 28 Phaser 4 Skills và 11 GameDev Skills (`architecture-guard`, `game-performance`, `phaser-gameplay`, `groups-and-containers`, `scenes`, `game-ai`, `game-ui`, `particles`, `audio-and-sound`, `production-planning`).
  - Xác định 6 nhóm cần nâng cấp/tối ưu: (1) Tách nhỏ `GameScene.ts` đang chạm ngưỡng 204/210 dòng bằng `HudOverlay` và Modal Scenes; (2) Áp dụng Object Pooling & Zero-Allocation trong hot loop; (3) Kích hoạt Pickup Magnet; (4) Mở rộng 3 vũ khí + Knockback + Upgrade Choice UI; (5) Xây dựng `WaveDirector` + 3 biến thể quái + Boss FSM ở phút thứ 10; (6) Bổ sung VFX Particles, Procedural Audio, Title/Pause Scene và LocalStorage High Score.
  - Lưu kế hoạch chi tiết tại `docs/superpowers/plans/2026-10-28-master-completion-plan.md`.

### 2026-10-27
- **Hoàn thành Phase 0**:
  - Flatten cấu trúc workspace ra thư mục gốc.
  - Khởi tạo git repo `main`.
  - Fix các lỗi TypeScript: sửa `private hp: number`, cập nhật typing cho callback của `ArcadePhysics.add.overlap`, thay thế `setTintFill` deprecated bằng `setTint` theo chuẩn Phaser 4.
  - Thêm `vitest.config.ts` để phân tách unit tests (`tests/domain.test.ts`) khỏi e2e tests (`tests/e2e/game.spec.ts`).
  - Toàn bộ lệnh `npm run verify` và `npm run test:e2e` chạy thành công 100%.
  - Tạo `test-results/anime-survivor.png` từ Playwright headless browser.
- **Hoàn thành Phase 1**:
  - Triển khai theo tài liệu `AnimeSurvivor-GameplayLogic-Spec.md` và kế hoạch `docs/superpowers/plans/2026-10-27-phase1-gameplay-logic.md`.
  - Tách pure domain: `vector.ts`, `combat.ts`, `targeting.ts`, `pickups.ts`, `progression.ts`.
  - Refactor các hệ thống: `MovementSystem`, `EnemySystem`, `WeaponSystem`, `DamageSystem`, `PickupSystem`, `DebugBridge`, và `GameScene`.
  - Khắc phục triệt để lỗi va chạm coincident, phát bắn đầu tiên tại t=0, i-frames 800ms, quái chết idempotent, và gộp chung 1 overlap collider duy nhất cho collectibles.
  - 18/18 Vitest unit tests passed, 2/2 Playwright E2E browser scenarios passed.
- **Tạo Public Repository trên GitHub**:
  - Tạo repo công khai và push toàn bộ code: https://github.com/luongviettienns/anime-survivor
  - Thiết lập upstream tracking `main -> origin/main`.
- **Cài đặt bộ 11 GameDev & Blender Skills chuyên sâu**:
  - Tích hợp 11 skills chuyên nghiệp từ blueprint vào `.agents/skills/`:
    1. `blender-tooling`: Xây script Python điều khiển Blender, exporter, validator.
    2. `blender-modeling`: Tạo nhân vật, quái, vũ khí, môi trường 3D tối ưu cho sprite render.
    3. `blender-animation`: Rig, skinning, keyframing animation và xuất motion.
    4. `tech-art`: Shaders, VFX, tối ưu ràng buộc kỹ thuật pipeline.
    5. `game-design`: Thiết kế hệ thống cấp độ, kỹ năng, vũ khí, loop tiến trình.
    6. `game-ai`: AI đuổi người chơi, FSM, boss behavior.
    7. `game-performance`: Giám sát FPS, draw calls, pooling và tối ưu số lượng quái lớn.
    8. `game-ui`: Thiết kế HUD, HP bar, EXP bar, bảng chọn kỹ năng.
    9. `playtesting`: Đánh giá game feel, độ khó, phân tích telemetry.
    10. `game-audio`: Thiết kế SFX chiến đấu, audio budgets và adaptive BGM.
    11. `production-planning`: Lập kế hoạch milestone, roadmap demo slice và release.
  - Cập nhật `.gitignore` loại trừ `tools/_external/` để giữ repository gọn gàng.
  - Chạy `npm run verify` và `npm run test:e2e` xác nhận toàn bộ hệ thống hoạt động hoàn hảo.
- **Nâng cấp bộ Asset Nhân vật Naruto Shippuden (Option 2) & Quái Shinobi chuyên nghiệp**:
  - Xây dựng module pixel-art chuẩn xác từng pixel `scripts/naruto_shippuden_art.py` kết hợp với Blender 5.2.3 LTS headless 3D rig/pose (`scripts/blender_render_shinobi.py`, xuất `art/source/naruto_shippuden.blend`).
  - **Hero Idle (4 frames)**: Tóc vàng gai nhọn 3 sắc độ, băng trán đen Shippuden có tấm thép bạc khắc biểu tượng và 2 dải vải đen bay theo gió 4 nhịp, mắt xanh da trời 2x2 sắc nét, râu mèo trên má, áo khoác cam-đen cổ cao khóa kéo, băng đùi trắng + túi đựng kunai đen, dép ninja đen hở ngón.
  - **Hero Walk/Run (4 frames)**: Tư thế chạy **Naruto Run** kinh điển (nghiêng người về phía trước $+26^\circ$, hai tay vung chéo ra sau lưng, dải băng trán bay ngang trong gió, gia huy xoáy đỏ Uzumaki trên lưng áo, chu kỳ chạy 4 bước chân dứt khoát).
  - **Rasengan Projectile (`orb.png` 8x8)** & **Rogue Shadow Ninja Enemy (`enemy.png` 24x24, 4 frames)**: Áo choàng đen mây đỏ cùng mắt đỏ rực đồng bộ hoàn toàn chủ đề Shinobi.
  - Kiểm định byte-for-byte với `validate_sprites.py`, `npm run verify` và `npm run test:e2e` đạt 100% PASS.
- **Cài đặt Phaser AE CLI & Tích hợp bộ 28 Skills chính thức từ `phaserjs/phaser`**:
  - Cài đặt global `@phaser-ae/cli` (v0.7.5) phục vụ giao tiếp agent và tài nguyên phaser.io.
  - Tải và đồng bộ đầy đủ 28 official agent skills từ `https://github.com/phaserjs/phaser` vào `.agents/skills/`:
    `actions-and-utilities`, `animations`, `audio-and-sound`, `cameras`, `curves-and-paths`, `data-manager`, `events-system`, `filters-and-postfx`, `game-object-components`, `game-setup-and-config`, `geometry-and-math`, `graphics-and-shapes`, `groups-and-containers`, `input-keyboard-mouse-touch`, `loading-assets`, `particles`, `physics-arcade`, `physics-matter`, `render-textures`, `scale-and-responsive`, `scenes`, `sprites-and-images`, `text-and-bitmaptext`, `tilemaps`, `time-and-timers`, `tweens`, `v3-to-v4-migration`, `v4-new-features`.
  - Chạy `npm run verify` toàn diện: TypeCheck, ESLint, 18 Domain Tests (Vitest), Architecture Guard, Sprite Validator và Production Build đều đạt 100% PASS.

### 2026-11-18 10:05
- **Cài đặt Ponytail & Kích hoạt Mode ULTRA**:
  - Tích hợp skills từ dietrichgebert/ponytail và cập nhật persona **Mode ULTRA** trong AGENTS.md.
  - Chạy 
pm run verify kiểm chứng (40/40 tests PASS).

### 2026-11-18 10:13
- **Tải và tích hợp 10 Icon Pixel 16x16 từ Dataset Hugging Face Angais/pixel-art-atlas-1.4m (CC0)**:
  - Lưu tại public/assets/icons/ giữ nguyên màu gốc (weapon_orb, weapon_slash, weapon_orbital, weapon_mine, stat_max_hp, stat_move_speed, stat_damage, stat_cooldown, stat_magnet, stat_crit) và ảnh xem trước tại rt/icons_preview.png.

### 2026-11-18 10:28
- **Dọn gọn Workspace Skills (Context Hygiene)**:
  - Xóa 62 skills thừa/trùng lặp/sai engine trong .agents/skills/ (giảm từ 86 xuống 24 skills cốt lõi).
  - Cập nhật kế hoạch triển khai kèm 2 chốt tự chụp/tự soi trực quan (implementation_plan.md).

### 2026-11-18 10:49
- **Hoàn thành Phase 5: Animated VFX (`pixelfx`), 10-Card Roguelite System, Endless Shrine Forest Map & Pixel RPG UI**:
  - **21 Animated Spritesheets + 128×128 Seamless Meadow + 10 CC0 Icons**: Xuất trực tiếp 11 hiệu ứng từ `vendor/pixelfx` (`orb`, `slash`, `slash_x` Lv4+, `explosion`, `enemy_bolt`, `gem`, `heal_pickup`, `vfx_hit`, `vfx_death`, `vfx_levelup`, `vfx_telegraph`) kèm procedural animated pixel art (`shuriken`, `mine`, `tree` 40×48 sakura-cedar, `shrine_lantern` 24×32, `spirit_flower` 16×16) với bảng màu đặc trưng riêng cho từng vật thể, kiểm định SHA-256 100% PASS (`ART_CONTRACT.json` v3).
  - **10 Thẻ Nâng Cấp & Vũ khí Mới (`mine` — Paper Bomb Tag)**: Bổ sung `mine` AOE explosion + 4 chỉ số mới (`stat_damage`, `stat_cooldown`, `stat_magnet`, `stat_crit` Sharingan 2× crit) cùng `VfxPool` (48 pooled sprites, Additive blend glow, Trauma Screen Shake, Cooldown-gated Micro Hit-stop).
  - **Boss Phase 2 & Telegraph Sigil**: `mage` & `boss` hiển thị vòng ấn chú động `vfx_telegraph`; Boss dưới 50% máu kích hoạt `[ENRAGED]` (tốc độ 1.25×, cooldown 2200ms, 12 tia xoắn ốc + aura đỏ tím).
  - **Endless Procedural Map (`infiniteMap.ts`, `InfiniteMapSystem.ts`)**: Gỡ giới hạn biên `1800×1200`, nền cỏ `128×128` cuộn vô tận, stream 3×3 chunks (`512×512`) sinh cây/đèn đá/hoa động tất định bằng `SplitMix32`, cố định depth mặt đất ở `-1e9` chống lỗi che khuất tại tọa độ `y` âm.
  - **Pixel RPG HUD & Upgrade UI**: `HudOverlay.ts` có Hero Portrait Crest, thanh HP kèm icon tim, XP bar chia đốt, thanh Dock icon vũ khí & passive, thanh máu Boss `[ENRAGED]`; `UpgradeScene.ts` có banner header, thẻ viền vàng/tím, icon 48×48 bay lơ lửng trên bệ halo sáng và gem pips.
  - **Kiểm chứng Toàn diện**: Chốt 1 (2 vòng tự soi contact sheet 4×) + Chốt 2 (2 vòng tự soi 3 screenshot Chrome thực tế: `qa-upgrade-ui.png`, `qa-combat-vfx.png`, `qa-boss-endless.png`); `npm run verify` (43/43 Vitest, 0 lint/TS/arch errors, 21 sheets + 10 icons validated, Vite build OK) và `npm run test:e2e` (5/5 Playwright E2E PASS).
