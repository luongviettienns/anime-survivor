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

- [ ] **Phase 2: Full Roguelite Core**
  - [ ] Hệ thống WaveDirector (lịch trình spawn quái tăng dần theo thời gian).
  - [ ] Màn hình chọn nâng cấp (UpgradeChoiceScene) khi lên cấp, hỗ trợ pause game.
  - [ ] Bổ sung 2 loại vũ khí mới (slash tầm gần, orbiting charm) và định nghĩa vũ khí dạng dữ liệu.
  - [ ] Bổ sung các biến thể quái vật (slime, shade, ranged mage) và Boss cuối ở mốc 10 phút.
  - [ ] Màn hình Pause / Resume đầy đủ, lưu trữ High Score cục bộ.

- [ ] **Phase 3: Art & Polish**
  - [ ] Tinh chỉnh pipeline AI sprite frames (nếu sinh thêm animation mới).
  - [ ] Hiệu ứng particles, âm thanh (SFX/BGM) tự sinh hoặc giấy phép mở.
  - [ ] Thiết lập Accessibility (giảm flash, tùy chỉnh âm lượng).

- [ ] **Phase 4: QA & Static Deployment**
  - [ ] Mở rộng bộ Playwright E2E scenario test.
  - [ ] Stress benchmark với 100+ enemies ở mức 60 FPS.
  - [ ] Build bản tĩnh và kiểm tra preview.

---

## Nhật ký chi tiết (Log)

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
