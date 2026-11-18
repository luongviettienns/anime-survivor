# Kế Hoạch Tổng Hợp Hệ Thống Nâng Cấp & Mở Rộng (Upgrade & Feature Roadmap)

> **Tài liệu lưu trữ toàn bộ kế hoạch đã bàn bạc, phân chia theo từng Mục Nâng Cấp**.
> * **Nguyên tắc cốt lõi**: Không có shop tăng chỉ số vĩnh viễn ngoài trận; mọi sức mạnh đến từ nâng cấp trong trận, kỹ năng di chuyển nhặt XP/Item và làm chủ điểm mạnh/yếu của từng Hero.
> * **Tham chiếu số liệu chi tiết**: [docs/GAME_BALANCE_SHEET.md](GAME_BALANCE_SHEET.md) | [docs/EVOLUTION_SPEC.md](EVOLUTION_SPEC.md).

---

## Mục 1: Cấu Trúc Nhiều Màn Chơi & Quy Tắc Meta-Progression
* **Nhiều màn chơi (Multi-Stage)**: Mỗi màn chơi có bối cảnh, thời lượng kết thúc cố định (ví dụ `600s` / 10 phút) và Boss cuối riêng.
* **Tuyệt đối KHÔNG có Shop tăng chỉ số vĩnh viễn ngoài trận**: Toàn bộ tăng Máu, Sát thương, Tốc chạy, Giáp... chỉ tồn tại dưới dạng lựa chọn nâng cấp bên trong từng ván chơi.
* **Tiến trình dài hạn (Meta-Progression theo chuẩn `roguelike`)**:
  * Chỉ dùng thành tích qua màn để **mở khóa nhân vật mới (Hero)**, **mở khóa màn chơi mới**, hoặc **mở khóa độ khó tăng dần (Ascension)** sau khi hạ Boss lần đầu.
  * Không bắt buộc phải max toàn bộ nâng cấp trong 1 màn (tổng kho có `54` cấp nhưng 1 màn 10 phút đạt trung bình `Lv.18–25` để buộc phải chọn lọc build).

---

## Mục 2: Hệ thống Đa Nhân Vật (Multi-Hero Selection)
Mỗi Hero có điểm mạnh và điểm yếu đối trọng rõ rệt bằng **số cụ thể** (chi tiết số liệu tại `GAME_BALANCE_SHEET.md` Mục 3):
1. **Naruto** *(Cân bằng / Tiến hóa)*: Chỉ số trung bình (`100 HP`, `250 px/s`), mạnh ở `Rasengan` tự tìm mục tiêu và 2 nhánh tiến hóa lột xác (Cửu Vĩ / Tiên Nhân Cóc).
2. **Sasuke** *(Sát thủ / Máu giấy)*: Chạy rất nhanh (`285 px/s`), sát thương cao (`+8 Dmg`, `-40 ms` hồi chiêu), nhưng máu cực mỏng (`70 HP`) — bắt buộc phải bù bằng *Tăng Máu* & *Giảm Sát Thương*.
3. **Ichigo** *(Đấu sĩ / Thiết giáp)*: Máu dày (`150 HP`), có giáp (`-4 Dmg`), đánh rộng (`+30 px`), nhưng chạy rất chậm (`210 px/s`) — dễ hụt XP xa nếu không lên *Tốc Chạy* & *Tầm Hút*.
4. **Luffy** *(Khống chế / Hút ngọc)*: Tầm hút rộng (`160 px`), đẩy lùi mạnh (`+80 px/s`), nhưng sát thương thấp (`-4 Dmg`) và đánh chậm (`+60 ms` hồi chiêu) — dễ tắc tị trước Boss/Elite nếu thiếu *Tăng Sát Thương*.

---

## Mục 3: Nâng Cấp Chỉ Số Trong Trận & Logic Random Hợp Lý
1. **7 Chỉ Số Bị Động Phẳng (100% Số Cụ Thể — Không `%`, Max `Lv.5`)**:
   * *Nhóm tăng dần*: `Tăng Máu Tối Đa` (`+160` tổng), `Giảm Sát Thương Nhận` (`-18` tổng, sàn `2 Dmg`), `Tăng Sát Thương` (`+36` tổng), `Giảm Hồi Chiêu` (`-250 ms` tổng, sàn `180 ms`), `Tăng Tầm Hút Đồ` (`+250 px` tổng).
   * *Nhóm giảm dần*: `Tăng Tốc Chạy` (`+24 -> +16 px/s`, tổng `+100 px/s` tránh trôi phím).
   * *Thay thế Crit `%`*: `Tăng Đòn Trọng Kích` (rút nhịp từ đòn thứ 6 xuống đòn thứ 3, gây thêm `+30 -> +145 Dmg`).
2. **Smart Weighted Roll (`src/domain/upgrades.ts`)**:
   * Loại bỏ ngay thẻ đã Max `Lv.5` và lọc theo hình thái nhân vật đang chơi.
   * **Bảo đảm khung 3 ô**: `Lv.2–4` ưu tiên `2 Vũ khí + 1 Chỉ số`; `Lv.5+` bảo đảm `1 Vũ khí + 1 Chỉ số + 1 Flex`.
   * **Trọng số thông minh**: Vũ khí `Lv.4` (`4`) > Vũ khí đang có (`3`) > Chỉ số cứu nguy khi `HP <= 40%` (`4`) > Chỉ số thường (`2`) > Vũ khí mới khi đã có `>= 2` vũ khí (`1`).
   * **Seeded RNG tách biệt (`procedural-gen`)**: Truyền `rng` riêng cho bốc thẻ nâng cấp, không dùng chung nguồn random với combat.

---

## Mục 4: Thuật Clone Thoát Hiểm (Shadow Clone Escape — Dự Kiến Mới)
* **Ý tưởng gameplay**: Kỹ năng chủ động (hoặc kích hoạt khi bị vây / bấm phím `Space` hoặc `Shift`) giúp người chơi tạo **1 Phân Thân thế chỗ** và **lướt/dịch chuyển thoát ra một khoảng trống an toàn** khi bị quái ép góc.
* **Cơ chế dự kiến**:
  * **Tại vị trí cũ**: Để lại một Phân Thân (Decoy) tồn tại `2.0 – 3.0 giây`, tự động **khiêu khích (Taunt)** kéo toàn bộ quái gần đó bu vào đánh phân thân, khi hết giờ hoặc bị phá hủy thì nổ khói nhẹ / đẩy lùi.
  * **Nhân vật chính**: Lướt nhanh hoặc dịch chuyển tức thời (`160 – 220 px`) theo hướng đang di chuyển để thoát khỏi vòng vây.
  * **Ràng buộc kỹ thuật (`physics-arcade`)**: Tạm bật `i-frame` (`600 ms`) khi thoát để không dính sát thương va chạm giữa đường lướt, đồng thời giữ `collideWorldBounds(true)` để không dịch chuyển văng ra ngoài rìa bản đồ.
  * **Cân bằng**: Có thời gian hồi chiêu dài (`12 – 18 giây`), có thể nâng cấp giảm hồi chiêu hoặc tăng thời gian phân thân giữ chân quái.

---

## Mục 5: Hệ Thống Tiến Hóa Nhân Vật & Cân Bằng Kỹ Năng
1. **Cân bằng lại 4 Kỹ năng thường**:
   * Đưa hồi chiêu về dải `460 – 1200 ms`; cho `orb` tăng tốc bay (`420 -> 600 px/s`) và tầm bắn (`440 -> 560 px`) theo cấp thay vì bắn máy `240 ms`; tăng `orbital` Lv.1 lên 2 lưỡi và quay nhanh tới `6.0 rad/s`; rút `mine` Lv.1 xuống `1200 ms`.
   * Mỗi kỹ năng đều giữ nguyên tắc **Mạnh / Yếu bù trừ cho nhau** (chi tiết tại `GAME_BALANCE_SHEET.md` Mục 9).
2. **Nhánh 1 — Cửu Vĩ Cuồng Nộ (Kyuubi Rampage Mode)**:
   * *Điều kiện*: `Rasengan Lv.5` + có nâng cấp `Tăng Sát Thương` hoặc `Tăng Máu` ➔ Hộp thoại **Khế Ước (Có / Không)**.
   * *Thử thách 10% máu (4s)*: Bắt đầu thử thách được **tặng `800 ms` i-frame khởi đầu + đẩy nhẹ quái sát bên ra `60 px`** để chống chết oan ở frame đầu tiên (`roguelike` fairness).
   * *Thức tỉnh*: Đổi sạch 4 chiêu cũ sang **Móng Vuốt (`claw`)** + **Tia Beam (`beam`)**, giữ vĩnh viễn đến hết màn.
3. **Nhánh 2 — Tiên Nhân Cóc (Toad Sage Mode)**:
   * *Điều kiện*: Đạt *Phong Độn: Rasenshuriken* ➔ **Thử thách Khổ Hạnh sống sót 60s KHÔNG nhận thêm nâng cấp** (có nút `Bỏ Qua / Tích Khí` trên `UpgradeScene`).
   * *Thức tỉnh*: Đòn **Rasenshuriken Ném Xa** (tạo bão xoáy hút quái) + **Kawazu Kumite** (đánh không chạm), phòng thủ trâu bò (`-14 Dmg nhận`, `+120 Max HP`, `+6 HP/s`).
4. **Ràng buộc Va Chạm (`phaser-gameplay`)**:
   * Bắt buộc áp dụng **Collision Debounce** (lưu cooldown đánh trúng theo từng quái) cho `beam` (`260 ms`) và bão xoáy `rasenshuriken_throw` (`200 ms/tick`) để không gây sát thương chồng nhiều frame.
   * Mọi vùng hiệu ứng (`claw` vệt lửa, bão `rasenshuriken`, bóng `clone`) bắt buộc có **TTL (Time-To-Live)** và thu hồi qua pool.

---

## Mục 6: Độ Tăng Trưởng Quái, XP & Item Rơi Bắt Buộc
* **Quái mạnh lên từng phút (`M = floor(elapsedSec / 60)`)**: `Slime` (`+24 HP, +3 Dmg, +5 px/s`), `Shade` (`+16 HP, +3 Dmg, +6 px/s`), `Mage` (`+20 HP, +4 Đạn Dmg`), `Elite` mỗi `90s`, `Boss` phút 10 nâng lên `4500 HP`.
* **Item rơi xác định (Deterministic Drops)**:
  * **Bình Máu (`+30 HP`)**: Rơi chắc chắn mỗi `25` quái thường chết + mỗi `Elite` chết (kết nối vào `GameScene.onEnemyKilled`).
  * **Nam Châm Toàn Bản Đồ**: Rơi mỗi `90` quái chết hoặc mỗi `Elite` thứ 2.

---

## Mục 7: Quy Chuẩn Cảm Giác Đánh, Hiệu Năng, UI & Âm Thanh (Từ `.agents/skills/`)
1. **Cảm giác đánh (`game-feel`)**:
   * Chia phản hồi theo 3 tầng: *Small* (nhặt ngọc), *Medium* (đòn thường, `0.04s` hit-stop), *Large* (Trọng Kích, `beam`, nổ Rasenshuriken, Thức tỉnh: `0.08–0.12s` hit-stop + rung theo `trauma^2` + tôn trọng cài đặt `reduceFlashing` / `reduceScreenShake`).
2. **Hiệu năng (`game-performance`)**:
   * Giữ khung hình `<= 16.66 ms` (60 FPS): Zero-allocation trong hot loop, Object Pooling cho mọi tia/vùng/clone, giới hạn số lớp particle chồng nhau để tránh GPU overdraw.
   * `beam` và `claw` kiểm tra va chạm hình học thuần (`Segment-Circle` / `Cone-Circle`) trong `src/domain/`, không sinh Physics Body thừa làm nặng `Arcade.World`.
3. **UI/UX (`game-ui-ux`)**:
   * **Event-driven HUD**: Chỉ cập nhật UI khi HP, EXP, đếm ngược `4s/60s` hoặc cooldown Clone thay đổi (không poll mỗi frame).
   * Mọi màn hình (Chọn Hero, Chọn Màn, Khế ước, `UpgradeScene`) điều hướng được 100% bằng bàn phím/gamepad với focus rõ ràng.
4. **Âm thanh (`audio-design`)**:
   * Tách bus `Master <- Music <- MusicDuck`, `SFX`, `UI`; giảm nhẹ nhạc nền (ducking) khi Boss xuất hiện hoặc Thức tỉnh; thêm biến thiên pitch/volume nhẹ cho đòn đánh lặp lại (`claw`, `orb`, `hit`).
