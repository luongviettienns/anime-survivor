# Anime Survivor (v1.0) Master Completion & Optimization Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan phase-by-phase and task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nâng cấp và tối ưu dự án Anime Survivor từ bản Vertical Slice 60 giây (Phase 1) thành tựa game Survival Roguelite hoàn chỉnh v1.0 (Phase 2 → Phase 4) đạt chuẩn kiến trúc sạch, 60 FPS ổn định với 100+ quái và 100% kiểm thử tự động.

**Architecture:** Giữ nguyên kiến trúc phân lớp nghiêm ngặt (`src/domain/` thuần tính toán không phụ thuộc Phaser; `src/game/systems/` điều phối cơ chế; `src/ui/` hiển thị HUD/Menu; `src/game/scenes/` chỉ giữ vòng đời mỏng <= 160 dòng). Mở rộng theo hướng Data-Driven cho Vũ khí, Quái vật, Lịch trình Wave và Nâng cấp; áp dụng Object Pooling của Phaser 4 cho toàn bộ thực thể tần suất cao.

**Tech Stack:** Phaser 4.2+, TypeScript 5.7 (strict), Vite 6, Vitest 3, Playwright E2E, Python 3 + Pillow (deterministic sprite/audio pipeline).

**Spec:** `docs/GAME_DESIGN.md`, `docs/ARCHITECTURE.md`, `docs/ART_PIPELINE.md`, `docs/IMPLEMENTATION_PLAN.md`

## Global Constraints

- Không import `phaser` hoặc browser API (`window`, `document`, `localStorage`) trong `src/domain/`.
- Mỗi file `.ts` mục tiêu <= 160 LOC, ESLint giới hạn <= 200 dòng hiệu dụng, `scripts/check-architecture.mjs` giới hạn cứng <= 210 dòng vật lý.
- Nghiêm cấm `any`, `@ts-ignore`, code chết hoặc nuốt lỗi rỗng.
- Mọi thay đổi sprite phải khai báo trong `docs/ART_CONTRACT.json`, sinh frame lẻ qua `scripts/generate_assets.py`, đóng gói qua `scripts/pack_frames.py` và đạt 100% SHA-256 crop match với `scripts/validate_sprites.py`.
- Chạy `npm run verify` và `npm run test:e2e` đạt 100% PASS sau mỗi Milestone.

---

## Phần 1: Nhận xét & Chẩn đoán Kỹ thuật Hiện trạng (Technical Audit)

Dựa trên việc đối chiếu mã nguồn hiện tại với 28 Phaser 4 Skills và 11 GameDev Skills:

1. **Nguy cơ chạm trần kích thước `GameScene.ts` (`architecture-guard`, `scenes`)**:
   - `src/game/scenes/GameScene.ts` hiện đã ở mức **204/210 dòng**. Việc ôm cả tạo cây cối, cập nhật HUD text, bộ đếm spawn quái và xử lý va chạm trong một file sẽ làm vỡ giới hạn ngay khi thêm tính năng mới.
   - **Hướng tối ưu**: Tách HUD sang `src/ui/HudOverlay.ts`, tách tạo môi trường sang `src/game/systems/WorldSystem.ts`, tách lịch trình quái sang `src/game/systems/WaveSystem.ts`, và dùng Parallel/Modal Scenes (`UpgradeScene`, `PauseScene`, `TitleScene`).
2. **Cấp phát bộ nhớ (GC Allocation) trong vòng lặp chiến đấu (`game-performance`, `groups-and-containers`)**:
   - `EnemySystem.getCandidates()` đang tạo mảng và object mới mỗi frame bắn; `EnemySystem`, `WeaponSystem`, `PickupSystem` đang gọi `.destroy()` thay vì tái sử dụng qua Object Pool (`getFirstDead` / `disableBody(true, true)`).
   - **Hướng tối ưu**: Chuyển sang Object Pooling cho Enemies, Projectiles, Pickups và Floating Damage Numbers; tái sử dụng mảng buffer khi truy vấn mục tiêu để đạt 0 byte GC spike trong hot loop.
3. **Thiếu lực hút vật phẩm (Pickup Magnet) (`phaser-gameplay`)**:
   - `PLAYER.pickupMagnetRadius` (96px) và `PLAYER.pickupMagnetSpeed` (220px/s) đã có trong `constants.ts` nhưng chưa được thực thi trong `PickupSystem`.
4. **Chiều sâu Gameplay Core Loop (`game-design`, `game-ai`)**:
   - Mới có 1 loại vũ khí, 1 loại quái đuổi thẳng, chưa có màn hình chọn 1 trong 3 nâng cấp khi lên cấp (`pendingUpgrades` mới chỉ cộng dồn trong state), chưa có Knockback, chưa có 3 chủng loại quái và Boss cuối ở phút thứ 10.
5. **Trải nghiệm Thị giác, Âm thanh & Lưu trữ (`game-ui`, `particles`, `audio-and-sound`, `v4-new-features`)**:
   - HUD hiện chỉ là dòng chữ monospace đơn giản, thiếu thanh máu (HP Bar), thanh kinh nghiệm (XP Bar), hiệu ứng hạt (Particles), số sát thương nảy (Damage Numbers), âm thanh chiến đấu (Web Audio / WAV sinh tự động) và lưu trữ `localStorage` cho High Score / Accessibility.

---

## Phần 2: Bản đồ Cấu trúc Tệp tin Mục tiêu (Target File Map)

```text
src/
├── main.ts                                 # Khởi tạo Phaser.Game và danh sách Scenes
├── domain/                                 # 100% Pure TypeScript (Zero Phaser imports)
│   ├── vector.ts                           # Toán học vector, vận tốc, hướng ngắm, knockback
│   ├── combat.ts                           # Máu, sát thương, i-frames, knockback state
│   ├── targeting.ts                        # Chọn mục tiêu gần nhất, cooldown vũ khí
│   ├── pickups.ts                          # Trạng thái XP/Heal pickup, tính toán hút nam châm
│   ├── progression.ts                      # Cấp độ, ngưỡng XP, hàng đợi pendingUpgrades
│   ├── weapons.ts                          # [MỚI] Định nghĩa 3 vũ khí (Orb, Slash, Shuriken) & công thức chỉ số theo cấp
│   ├── upgrades.ts                         # [MỚI] Kho nâng cấp, thuật toán rút 3 lựa chọn ngẫu nhiên có trọng số (seeded/pure)
│   ├── enemies.ts                          # [MỚI] Archetypes (Slime, Shade, Ranged Mage, Boss) & AI state machine thuần
│   ├── waves.ts                            # [MỚI] Lịch trình WaveDirector theo thời gian & điều kiện xuất hiện Boss
│   └── storageSchema.ts                    # [MỚI] Xác thực dữ liệu High Score & Settings (pure validation)
├── game/
│   ├── config/
│   │   └── constants.ts                    # Hằng số cấu hình thế giới, người chơi, vũ khí, quái
│   ├── scenes/
│   │   ├── BootScene.ts                    # Tải toàn bộ spritesheets, ảnh, âm thanh và khởi tạo animations
│   │   ├── TitleScene.ts                   # [MỚI] Màn hình chính, High Score, bật/tắt tùy chọn Accessibility
│   │   ├── GameScene.ts                    # Điều phối mỏng (< 150 dòng) kết nối các Systems
│   │   ├── UpgradeScene.ts                 # [MỚI] Modal chọn 1 trong 3 nâng cấp khi lên cấp (hỗ trợ phím 1/2/3, A/D, chuột)
│   │   ├── PauseScene.ts                   # [MỚI] Màn hình tạm dừng (ESC/P), chỉnh âm lượng, giảm rung/chớp, chơi lại
│   │   └── GameOverScene.ts                # Màn hình kết thúc (Victory khi diệt Boss / Defeat), thống kê & lưu kỷ lục
│   └── systems/
│       ├── MovementSystem.ts               # Điều khiển nhân vật WASD/Arrows
│       ├── EnemySystem.ts                  # Quản lý pool 3 loại quái + Boss, đạn quái Mage, knockback
│       ├── WeaponSystem.ts                 # Điều phối 3 vũ khí (Rasengan Orb, Chakra Slash, Orbiting Shuriken)
│       ├── DamageSystem.ts                 # Xử lý sát thương người chơi, i-frames, hiệu ứng nhấp nháy
│       ├── PickupSystem.ts                 # Pool XP/Heal, lực hút nam châm (Magnet) về phía người chơi
│       ├── WaveSystem.ts                   # [MỚI] Thực thi WaveDirector theo thời gian thực và kích hoạt Boss
│       ├── VfxSystem.ts                    # [MỚI] Particle emitters (hit/kill/levelup) & pooled floating damage numbers
│       ├── AudioSystem.ts                  # [MỚI] Phát âm thanh chiến đấu & nhạc nền với giới hạn chống chồng âm (voice cap)
│       ├── StorageSystem.ts                # [MỚI] Adapter đọc/ghi localStorage cho High Score và Accessibility Settings
│       └── DebugBridge.ts                  # API kiểm thử `window.__ANIME_SURVIVOR__` cho Playwright E2E
└── ui/
    └── HudOverlay.ts                       # [MỚI] Thanh HP, Thanh XP trên cùng, Đồng hồ, Số Kill, Cấp độ vũ khí & Thanh máu Boss
```

---

## Phần 3: Lộ trình Triển khai Chi tiết theo Phase & Task

### Phase 2A: Kiến trúc Nâng cấp, Hệ thống 3 Vũ khí & Nam châm Vật phẩm

#### Task 2.1: Mở rộng Pure Domain cho Vũ khí, Nâng cấp & Lực hút Nam châm
**Files:**
- Create: `src/domain/weapons.ts`
- Create: `src/domain/upgrades.ts`
- Modify: `src/domain/pickups.ts`
- Test: `tests/weapons-upgrades.test.ts`, `tests/pickups.test.ts`

- [ ] **Step 1: Viết unit tests cho `weapons.ts`, `upgrades.ts` và magnet velocity trong `pickups.ts`**
  - Kiểm tra công thức chỉ số theo cấp độ (Level 1 → 5) cho 3 vũ khí: `orb` (Rasengan), `slash` (Chakra Blade), `orbital` (Shadow Shuriken).
  - Kiểm tra hàm `rollUpgradeChoices(inventory, rng)` luôn trả về tối đa 3 lựa chọn không trùng lặp và loại bỏ vũ khí/chỉ số đã đạt cấp tối đa.
  - Kiểm tra hàm `magnetVelocity(pickupPos, playerPos, radius, speed)` trả về vận tốc hút khi khoảng cách $\le \text{radius}$ và `{x: 0, y: 0}` khi ở ngoài bán kính.
- [ ] **Step 2: Chạy `npm test` xác nhận test FAIL**
- [ ] **Step 3: Cài đặt `src/domain/weapons.ts`, `src/domain/upgrades.ts` và bổ sung `magnetVelocity` vào `src/domain/pickups.ts`**
- [ ] **Step 4: Chạy `npm test` xác nhận toàn bộ unit tests PASS**

#### Task 2.2: Tách `HudOverlay`, Tinh gọn `GameScene` & Kích hoạt Nam châm Vật phẩm
**Files:**
- Create: `src/ui/HudOverlay.ts`
- Modify: `src/game/systems/PickupSystem.ts`
- Modify: `src/game/scenes/GameScene.ts`
- Test: `tests/e2e/game.spec.ts`

- [ ] **Step 1: Xây dựng `src/ui/HudOverlay.ts` hiển thị thanh HP, thanh XP, thời gian, số kill và danh sách vũ khí**
- [ ] **Step 2: Bổ sung `PickupSystem.update(playerPos)` áp dụng `magnetVelocity` và Object Pooling (`disableBody` / `enableBody`)**
- [ ] **Step 3: Refactor `GameScene.ts` sử dụng `HudOverlay` để giảm dung lượng `GameScene.ts` xuống dưới 150 dòng**
- [ ] **Step 4: Chạy `npm run verify` và `npm run test:e2e`**

#### Task 2.3: Triển khai 3 Vũ khí (`WeaponSystem`) & Màn hình Chọn Nâng cấp (`UpgradeScene`)
**Files:**
- Create: `src/game/scenes/UpgradeScene.ts`
- Modify: `src/game/systems/WeaponSystem.ts`
- Modify: `src/game/scenes/GameScene.ts`
- Modify: `src/main.ts`
- Test: `tests/e2e/game.spec.ts`

- [ ] **Step 1: Nâng cấp `WeaponSystem.ts` hỗ trợ đồng thời 3 vũ khí (Orb bắn tự động có pool, Slash chém cận chiến gây knockback, Orbital xoay quanh nhân vật)**
- [ ] **Step 2: Tạo `UpgradeScene.ts` hiển thị 3 thẻ nâng cấp khi `progression.pendingUpgrades > 0`, tạm dừng `GameScene` và hỗ trợ chọn bằng phím `1`/`2`/`3` hoặc chuột**
- [ ] **Step 3: Viết E2E test kiểm chứng việc nhặt đủ XP mở `UpgradeScene`, chọn nâng cấp giúp tăng cấp vũ khí và tiếp tục game**
- [ ] **Step 4: Chạy `npm run verify` và `npm run test:e2e`**

---

### Phase 2B: WaveDirector, 3 Chủng loại Quái, Boss 10 Phút & Pause/Save

#### Task 2.4: Mở rộng Asset Pipeline cho 3 Biến thể Quái, Vũ khí mới & Boss
**Files:**
- Modify: `docs/ART_CONTRACT.json`
- Modify: `scripts/naruto_shippuden_art.py`
- Modify: `scripts/generate_assets.py`
- Modify: `src/game/scenes/BootScene.ts`

- [ ] **Step 1: Cập nhật `docs/ART_CONTRACT.json` thêm `enemy_shade` (24x24, 4 frames), `enemy_mage` (24x24, 4 frames), `boss` (48x48, 4 frames), `shuriken` (12x12), `slash` (32x32), `enemy_bolt` (8x8)**
- [ ] **Step 2: Viết hàm vẽ pixel art nguyên bản trong `scripts/naruto_shippuden_art.py` & `scripts/generate_assets.py`**
- [ ] **Step 3: Chạy `npm run assets:generate` và `npm run assets:validate` xác nhận SHA-256 pixel-identical**
- [ ] **Step 4: Đăng ký nạp asset và animations trong `BootScene.ts`**

#### Task 2.5: Pure Domain & Hệ thống cho `WaveDirector`, 3 Chủng loại Quái & Boss
**Files:**
- Create: `src/domain/enemies.ts`
- Create: `src/domain/waves.ts`
- Create: `src/game/systems/WaveSystem.ts`
- Modify: `src/game/systems/EnemySystem.ts`
- Test: `tests/waves-enemies.test.ts`

- [ ] **Step 1: Viết unit tests cho `enemies.ts` (Slime đuổi thường, Shade chạy nhanh, Mage giữ khoảng cách + bắn đạn sau bước telegraph, Boss FSM) và `waves.ts` (lịch trình 0–600s, giới hạn `maxAlive`, spawn Boss ở 600s)**
- [ ] **Step 2: Cài đặt `src/domain/enemies.ts` và `src/domain/waves.ts` đạt 100% unit tests PASS**
- [ ] **Step 3: Nâng cấp `EnemySystem.ts` (Object Pooling, reutilize candidate buffer, xử lý đạn quái Mage và Boss) & tạo `WaveSystem.ts`**
- [ ] **Step 4: Cập nhật điều kiện thắng trong `GameScene.ts`: thắng khi tiêu diệt Boss cuối thay vì chỉ đếm hết giờ**
- [ ] **Step 5: Chạy `npm run verify` và kiểm thử E2E kịch bản spawn Boss & tiêu diệt Boss -> Victory**

#### Task 2.6: Màn hình `TitleScene`, `PauseScene` & Lưu trữ `StorageSystem`
**Files:**
- Create: `src/domain/storageSchema.ts`
- Create: `src/game/systems/StorageSystem.ts`
- Create: `src/game/scenes/TitleScene.ts`
- Create: `src/game/scenes/PauseScene.ts`
- Modify: `src/game/scenes/GameOverScene.ts`
- Modify: `src/main.ts`
- Test: `tests/storage.test.ts`, `tests/e2e/game.spec.ts`

- [ ] **Step 1: Viết unit tests cho `storageSchema.ts` (parse/serialize an toàn cho High Score & Settings khi dữ liệu hỏng hoặc thiếu)**
- [ ] **Step 2: Cài đặt `StorageSystem.ts`, `TitleScene.ts`, `PauseScene.ts` (phím `ESC`/`P`) và cập nhật `GameOverScene.ts` hiển thị kỷ lục mới**
- [ ] **Step 3: Viết E2E test cho luồng Title -> Play -> Pause/Resume -> GameOver -> Restart**
- [ ] **Step 4: Chạy `npm run verify` và `npm run test:e2e`**

---

### Phase 3: VFX, Âm thanh Tự sinh (Procedural Audio) & Accessibility Polish

#### Task 3.1: Hệ thống Hiệu ứng `VfxSystem` (Particles, Damage Numbers & Screen Shake)
**Files:**
- Create: `src/game/systems/VfxSystem.ts`
- Modify: `src/game/scenes/GameScene.ts`

- [ ] **Step 1: Tạo `VfxSystem.ts` sử dụng Phaser 4 `ParticleEmitter` (với `reserve` chống GC spike) cho hit spark, enemy death burst, level-up aura và pool cho Floating Damage Numbers**
- [ ] **Step 2: Tích hợp tùy chọn Accessibility (`reduceFlashing`, `reduceScreenShake`) để tự động tắt `cameras.main.flash` / `shake` khi người chơi cấu hình**
- [ ] **Step 3: Chạy `npm run verify`**

#### Task 3.2: Hệ thống Âm thanh `AudioSystem` & Sinh Audio Tự động
**Files:**
- Create: `scripts/generate_audio.py`
- Create: `src/game/systems/AudioSystem.ts`
- Modify: `package.json`
- Modify: `src/game/scenes/BootScene.ts`

- [ ] **Step 1: Viết `scripts/generate_audio.py` sinh các file âm thanh `.wav` 100% nguyên bản (shoot, slash, hit, xp_pickup, level_up, boss_alert, bgm_loop) vào `public/assets/audio/`**
- [ ] **Step 2: Xây dựng `AudioSystem.ts` quản lý phát SFX với cơ chế giới hạn tần suất (debounce 40ms/cue) và điều chỉnh âm lượng/mute từ `StorageSystem`**
- [ ] **Step 3: Chạy `npm run verify` và kiểm tra không có lỗi console audio khi chạy headless browser**

---

### Phase 4: Kiểm thử Toàn diện, Stress Benchmark 60 FPS & Sẵn sàng Phát hành

#### Task 4.1: Stress Benchmark 100+ Quái & Kiểm toán Hiệu năng (`game-performance`, `release-check`)
**Files:**
- Modify: `src/game/systems/DebugBridge.ts`
- Modify: `tests/e2e/game.spec.ts`
- Modify: `docs/PROGRESS.md`
- Modify: `PROJECT_PROGRESS.md`

- [ ] **Step 1: Mở rộng `DebugBridge.ts` hỗ trợ spawn nhanh 120 quái, kích hoạt Boss tức thì và đo thời gian frame trung bình (`avgFrameMs`)**
- [ ] **Step 2: Bổ sung bài test E2E Stress Test (120 active enemies + projectiles + pickups đồng thời, kiểm tra `avgFrameMs < 20ms` trong môi trường test và 0 lỗi console)**
- [ ] **Step 3: Chạy trọn bộ lệnh phát hành: `npm run assets:generate`, `npm run verify`, `npm run test:e2e`, chụp ảnh màn hình thực tế và cập nhật `PROJECT_PROGRESS.md` + `docs/PROGRESS.md`**
