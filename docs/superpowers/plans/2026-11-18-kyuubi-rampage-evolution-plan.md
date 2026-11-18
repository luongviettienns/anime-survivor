# Kế Hoạch Triển Khai: Trạng Thái Áo Choàng Cửu Vĩ Cuồng Nộ (Kyuubi Rampage Mode)

> **Mục tiêu**: Thiết kế và triển khai trạng thái tiến hóa chuyển giao khi Naruto bị Chakra Cửu Vĩ chiếm đoạt tiềm thức. Trạng thái này thay thế hoàn toàn bộ kỹ năng thường bằng bộ chiêu thức độc quyền của Cửu Vĩ, mở khóa qua thử thách sinh tử (Pact & 10% HP Trial). Dạng Vàng Kim (KCM thuần hóa) được bảo lưu làm dạng tiến hóa tối thượng cuối cùng sau này.

---

## 1. Tổng quan Thiết kế (Design Overview)

* **Tên trạng thái**: `Kyuubi Rampage Mode` (Áo Choàng Cửu Vĩ Cuồng Nộ).
* **Bản chất nguyên tác**: Naruto bị cảm xúc tiêu cực và hoàn cảnh dồn vào chân tường, lớp Chakra đỏ sủi bọt phá phong ấn bọc lấy cơ thể, chiến đấu theo bản năng hoang dã bằng 4 chân, móng vuốt và pháo chakra.
* **Thời lượng**: **Vĩnh viễn đến hết ván chơi** (Đóng vai trò "Phase 2 / Mạng thứ hai" của nhân vật).
* **Màu sắc chủ đạo**: Đỏ thẫm + Cam lửa sủi bọt (`#ff1a1a`, `#cc0000`).

---

## 2. Quy trình Kích hoạt & Thử thách Sinh tử (The Kurama Pact)

### Điều kiện 1: Nâng cấp tiền đề (Prerequisites)
Người chơi phải hoàn thành nhánh kỹ năng kiểm soát chakra cơ bản:
* `Rasengan` (`orb`) đạt **Lv.5 (Max)**.
* Có ít nhất 1 cấp của `Chakra Focus` (`stat_damage`) **hoặc** `Vitality Seal` (`stat_max_hp`).

### Điều kiện 2: Hộp thoại Khế Ước (Opt-in Choice)
Khi thỏa mãn điều kiện nâng cấp, lần lên cấp tiếp theo sẽ xuất hiện lựa chọn đặc biệt:
* **"Ký Khế Ước Cửu Vĩ (Kyuubi Pact)?"**:
  * **[KHÔNG]**: Tiếp tục nhận các nâng cấp bình thường, duy trì lối chơi ninja thông thường.
  * **[CÓ]**: Bắt đầu bước vào **Thử thách Sinh Tử**.

### Điều kiện 3: Thử thách 10% Máu (The 10% HP Survival Trial)
Ngay khi bấm [CÓ]:
1. Máu người chơi bị rút ngay lập tức xuống **10% Max HP**.
2. Bộ đếm ngược kích hoạt: **Sống sót trong 4.0 giây** mà không để máu về 0.
3. Nếu chết trong 4 giây này ➔ **Game Over** (Trả giá cho sự liều lĩnh khi chưa sẵn sàng).
4. Nếu sống sót thành công qua 4 giây ➔ **BÙNG NỔ CỬU VĨ**:
   * Sóng xung kích phát nổ đẩy văng quái vật trong bán kính 350px.
   * Hồi đầy 100% Max HP mới.
   * Chuyển đổi vĩnh viễn sang `Kyuubi Rampage Mode`.

---

## 3. Thay đổi Hệ thống & Bộ Kỹ năng Mới (Full Moveset Metamorphosis)

Khi thức tỉnh thành công, **toàn bộ 4 vũ khí thường (`orb`, `slash`, `orbital`, `mine`) bị vô hiệu hóa / tháo bỏ hoàn toàn**. Nhân vật được trang bị bộ kỹ năng và chỉ số mới:

### 3.1. Chỉ số cơ bản gia tăng (Base Stats Overhaul)
* **Tốc độ di chuyển**: +35% (Lao 4 chân hoang dã).
* **Máu tối đa**: +50% Max HP.
* **Chống chịu**: Giảm 20% sát thương nhận vào, miễn nhiễm đẩy lùi (Knockback immune).
* **Chakra Burn Aura**: Tỏa nhiệt lượng đỏ sủi bọt thiêu đốt quái xung quanh bán kính 60px (DoT).

### 3.2. Kỹ năng 1: Móng Vuốt Chakra Cửu Vĩ (`claw`)
* **Cơ chế**: Vươn cánh tay chakra khổng lồ chém quét theo **hình quạt (cone arc)** cực mạnh phía trước.
* **Cây tiến trình Lv.1 – Lv.5**:
  * *Lv.1*: Quét góc 120°, tầm 110px, sát thương 45, knockback mạnh.
  * *Lv.2*: +18 Sát thương, giảm 15% hồi chiêu.
  * *Lv.3*: Mở rộng góc quét lên **160°**, tầm vươn dài ra 145px.
  * *Lv.4*: +25 Sát thương, để lại vệt cào rực lửa thiêu đốt quái (DoT 2s).
  * *Lv.5 (Max)*: **Song Trảo Loạn Vũ**: Quét liên hoàn 2 đòn trái - phải góc 180°, bao trùm toàn bộ nửa màn hình phía trước.

### 3.3. Kỹ năng 2: Tia Beam Cửu Vĩ (`beam`)
* **Cơ chế**: Tụ năng lượng đỏ thẫm rồi bắn một **tia laser thẳng tắp** xuyên thấu vô hạn mọi quái vật trên đường đi (Piercing Line Beam).
* **Cây tiến trình Lv.1 – Lv.5**:
  * *Lv.1*: Tia dài 480px, bề rộng 18px, xuyên thấu quái, sát thương 55.
  * *Lv.2*: +20 Sát thương, giảm 12% hồi chiêu.
  * *Lv.3*: Chiều dài tăng lên **700px** (bắn xuyên ra rìa màn hình), bề rộng 26px.
  * *Lv.4*: +30 Sát thương, làm choáng (Stun) kẻ địch trúng đòn trong 0.5s.
  * *Lv.5 (Max)*: **Đại Pháo Bijuu Beam**: Bề rộng nở to **42px**, phát nổ xung kích ở điểm cuối.

---

## 4. Kế hoạch Triển khai Kỹ thuật (Technical Implementation Steps)

### Giai đoạn 1: Pure Domain (`src/domain/`)
1. **`src/domain/weapons.ts`**:
   * Mở rộng `WeaponId = 'orb' | 'slash' | 'orbital' | 'mine' | 'claw' | 'beam'`.
   * Định nghĩa `computeWeaponStats` cho `'claw'` và `'beam'` (Lv.1 – Lv.5).
2. **`src/domain/combat.ts`**:
   * Thêm `isKyuubiRampage: boolean`, `kyuubiTrialState: { active: boolean; remainingMs: number }`.
   * Viết hàm `startKyuubiTrial(playerState)` và `tickKyuubiTrial(playerState, deltaMs, inventory)`.
   * Viết hàm `transformToKyuubi(inventory, playerState)` (xóa vũ khí thường, add `claw: 1, beam: 1`, tăng base stats).
3. **`tests/kyuubi-mode.test.ts`**:
   * Unit test cho trial 10% HP: thất bại khi HP <= 0, thành công khi sống sót qua 4000ms.
   * Unit test cho việc hoán đổi inventory vũ khí và công thức stats của `claw`, `beam`.

### Giai đoạn 2: Game Systems & Weapons (`src/game/systems/`)
1. **`WeaponSystem.ts`**:
   * Triển khai đòn quét hình quạt `claw` (tính toán góc cone arc và knockback).
   * Triển khai đòn `beam` (kiểm tra va chạm đoạn thẳng / Segment-AABB piercing check).
2. **`HeroActionVisual.ts` & `VfxSystem.ts`**:
   * Hiệu ứng tint đỏ cam + particle bọt khí đỏ sủi bọt quanh hero khi ở Rampage mode.
   * Sóng nổ shockwave khi thức tỉnh thành công.
   * Vệt chém móng vuốt đỏ và tia laser đỏ rực.

### Giai đoạn 3: UI & Upgrade Flow (`src/ui/`, `src/game/scenes/`)
1. **`UpgradeScene.ts`**:
   * Hiển thị thẻ chọn "Khế Ước Cửu Vĩ" khi đủ điều kiện.
   * Nếu đã ở Rampage Mode, danh sách nâng cấp vũ khí chỉ rút ra `claw` và `beam`.
2. **`HudOverlay.ts`**:
   * Hiển thị đếm ngược 4s đỏ rực khi đang trong Thử thách 10% máu.
   * Viền màn hình ánh đỏ mờ (Vignette) khi ở dạng Cửu Vĩ.

### Giai đoạn 4: QA & Verification
1. `npm run check:arch` (Đảm bảo mọi file <= 160 dòng hiệu quả, <= 210 dòng vật lý).
2. `npm run test` (Vitest domain tests 100% PASS).
3. `npm run test:e2e` (Playwright kịch bản kiểm tra kích hoạt Khế ước, sống sót 4s và bắn Beam/Claw).

---

## 5. Lộ trình Tiến hóa Tương lai: Kurama Chakra Mode (KCM Vàng Kim)
* **Vị trí**: Dạng tiến hóa cuối cùng (End-game Awakening).
* **Bối cảnh**: Naruto thuần hóa hoàn toàn Kurama, chuyển từ Đỏ cuồng bạo sang Vàng kim kiểm soát.
* **Dự kiến**: Mở khóa ở các wave quái cực hạn (Wave 8–10) hoặc sau khi đánh bại Boss phân thân căm thù tại Thác Sự Thật.
