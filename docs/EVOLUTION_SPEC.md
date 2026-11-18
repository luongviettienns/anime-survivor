# Đặc Tả Nâng Cấp & Hệ Thống Tiến Hóa (Upgrades & Evolution Spec)

> **Tài liệu tham chiếu chuẩn** cho các nội dung nâng cấp và hình thái tiến hóa nhân vật. Được phân chia rành mạch thành 2 mục độc lập:
> * **Mục I: Danh Mục Nâng Cấp Chỉ Số (Stat Upgrades)** — Tên gọi đơn giản trực diện (Tăng... / Giảm...).
> * **Mục II: Các Hình Thái Tiến Hóa Nhân Vật (Character Evolution Modes)** — Nhánh Cửu Vĩ, Tiên Nhân Cóc và KCM.

---

# MỤC I: DỰ ĐỊNH NÂNG CẤP CHỈ SỐ (STAT UPGRADES)

Các nâng cấp chỉ số bị động dùng chung cho mọi nhân vật, đặt tên theo phong cách **đơn giản, dễ hiểu nhất: "Tăng... / Giảm..."**, loại bỏ hoàn toàn các danh từ riêng rườm rà.

### Bảng 7 Chỉ Số Bị Động Chuẩn (Số Cụ Thể — Không dùng %)

| Mã ID | Tên hiển thị (Đơn giản) | Chỉ số gia tăng mỗi cấp | Cơ chế & Tác động thực tế |
| :--- | :--- | :--- | :--- |
| `stat_max_hp` | **Tăng Máu Tối Đa** | • **`+25 Max HP`**<br>• Hồi ngay **`+25 HP`** | Mở rộng thanh máu và cấp cứu lượng máu ngay khi chọn. |
| `stat_damage_reduction` *(Mới)* | **Giảm Sát Thương Nhận Vào** | • **`-3 Sát thương nhận vào`** | Trừ thẳng vào sát thương quái/đạn đánh trúng *(Trần giảm tối đa `-18`, luôn nhận ít nhất `2` dame)*. |
| `stat_damage` | **Tăng Sát Thương** | • **`+6 Sát thương`** | Cộng thẳng trực tiếp vào sát thương gốc của mọi vũ khí trang bị. |
| `stat_cooldown` | **Giảm Hồi Chiêu** | • **`-45 ms` thời gian hồi chiêu** | Ra đòn và bắn đạn nhanh hơn *(Trần giảm tối đa `-250 ms`, sàn tối thiểu `150 ms`)*. |
| `stat_move_speed` | **Tăng Tốc Chạy** | • **`+18 px/s` tốc chạy**<br>• **`+15 px` Tầm hút đồ** | Tăng độ cơ động khi né quái và hỗ trợ hút đồ rộng hơn nhẹ. *(Trần `+126 px/s`)*. |
| `stat_magnet` | **Tăng Tầm Hút Đồ** | • **`+45 px` Bán kính hút ngọc** | Nam châm hút ngọc EXP và bình máu từ khoảng cách rất xa. |
| `stat_heavy_strike` *(Thay Crit)* | **Tăng Đòn Trọng Kích** | • **Mỗi đòn thứ 5 gây `+35 Dmg`**<br>*(Cấp sau `+25 Dmg`, giảm nhịp xuống đòn thứ 3)* | Thay thế Bạo kích `%` bằng cơ chế nhịp đòn chắc chắn không phụ thuộc may rủi RNG. |

---

# MỤC II: CÁC DẠNG TIẾN HÓA NHÂN VẬT (CHARACTER EVOLUTION MODES)

Hệ thống tiến hóa dành riêng cho Naruto Shippuden, chia làm 2 nhánh đối nghịch mở ra ở giữa trận và 1 dạng tối thượng ở cuối trận.

```
                                  [Naruto Shippuden Cơ Bản]
                                             │
                      ┌──────────────────────┴──────────────────────┐
                      ▼                                             ▼
          [DẠNG 1: CỬU VĨ CUỒNG NỘ]                     [DẠNG 2: TIÊN NHÂN CÓC]
           (Berserker / Tấn Công Cực Đại)                (Juggernaut / Phòng Thủ Hồi Máu)
                      │                                             │
      ★ Điều kiện: Rasengan Lv.5 + Sát Thương/Máu                  ★ Điều kiện: Phong Độn: Rasenshuriken
      ★ Thử thách: Khế ước & Sống sót 10% HP                        ★ Thử thách: Sống sót 60s KHÔNG nhận thêm nâng cấp
                      │                                             │
                      ▼                                             ▼
          🔥 KYUUBI RAMPAGE MODE                        🐸 TOAD SAGE MODE
          • Đổi sạch chiêu thường sang:                 • Vũ khí chính: Rasenshuriken Ném Xa
            - Móng vuốt quạt (`claw`)                   • Vũ khí phụ: Kawazu Kumite (Sóng Ếch)
            - Tia Beam xuyên thấu (`beam`)              • Sát thương tăng nhẹ (+8 Dmg), nhưng:
          • Tốc chạy (+85 px/s) & Dame (+18) lớn          - Máu tối đa +120 HP
          • Aura thiêu đốt quái xung quanh                - Giảm 14 sát thương nhận vào
                                                          - Tự hồi máu liên tục +6 HP/giây
                      │                                             │
                      └──────────────────────┬──────────────────────┘
                                             ▼
                            [DẠNG 3: TIẾN HÓA TỐI THƯỢNG - LATE GAME]
                               ★ KURAMA CHAKRA MODE (KCM VÀNG KIM)
```

---

### Chi Tiết Dạng 1: Áo Choàng Cửu Vĩ Cuồng Nộ (Kyuubi Rampage Mode)
* **Bản sắc**: Naruto bị dồn vào chân tường, lớp Chakra đỏ sủi bọt chiếm quyền kiểm soát cơ thể, bò 4 chân hoang dã.
* **Thời lượng**: Vĩnh viễn đến hết ván chơi (Mạng thứ hai).
* **Quy trình kích hoạt**:
  1. *Điều kiện*: Đạt `Rasengan Lv.5` + ít nhất 1 cấp `Tăng Sát Thương` hoặc `Tăng Máu Tối Đa`.
  2. *Hộp thoại Khế Ước*: Chọn `Có` hoặc `Không`.
  3. *Thử thách 10% Máu*: Máu rút về 10% (hoặc 10 HP tối thiểu), đếm ngược **4.0 giây** sống sót ➔ Thức tỉnh thành công, hồi đầy máu, đẩy văng quái 350px.
* **Chỉ số gia tăng**: **`+85 px/s` Tốc chạy**, **`+60 Max HP`**, **`+18 Sát thương`**, **`-6 Sát thương nhận vào`**, Aura thiêu đốt `15 Dmg / 0.5s` bán kính `65 px`.
* **2 Kỹ năng độc quyền (Thay thế toàn bộ chiêu cũ)**:
  * 爪 **Móng Vuốt Chakra (`claw`)**: Quét hình quạt (cone arc 120°–180°), đẩy lùi quái, để lại vệt cào rực lửa thiêu đốt.
  * ⚡ **Tia Beam Cửu Vĩ (`beam`)**: Bắn tia laser năng lượng đỏ thẳng tắp dài 480–850px xuyên thấu vô hạn quái, gây choáng và nổ điểm cuối.

---

### Chi Tiết Dạng 2: Tiên Nhân Thuật Diệu Mộc Sơn (Toad Sage Mode)
* **Bản sắc**: Naruto hòa hợp với Năng lượng Tự nhiên, quầng mắt cam đỏ, mình đồng da sắt.
* **Thời lượng**: Vĩnh viễn đến hết ván chơi.
* **Quy trình kích hoạt**:
  1. *Điều kiện*: Đã nâng cấp vũ khí thành **Phong Độn: Loa Toàn Thủ Lý Kiếm (Fūton: Rasenshuriken)**.
  2. *Thử thách Khổ Hạnh*: **Sống sót 60 giây (1 phút) mà KHÔNG nhận thêm bất kỳ nâng cấp nào** (Dùng nút `Bỏ qua / Tích khí` khi lên cấp).
  3. *Kết quả*: Sau 60s nhẫn nại thành công ➔ Thức tỉnh Tiên Nhân Cóc vĩnh viễn!
* **Chỉ số gia tăng (Thiên về phòng thủ & sức bền)**:
  * Sát thương tăng nhẹ (**`+8 Sát thương`**).
  * **Phòng thủ vượt trội**: **`-14 Sát thương nhận vào`** (Mình đồng da sắt).
  * **Máu tối đa**: **`+120 Max HP`**.
  * **Siêu hồi phục**: Tự động hồi phục **`+6 HP mỗi giây`**.
  * **Cảm quan tự nhiên**: **`+80 px` Tầm hút đồ**, **`+35 px/s` Tốc chạy** ổn định.
* **2 Kỹ năng Tiên Thuật đặc quyền**:
  * 🌀 **Rasenshuriken Ném Tầm Xa**: Ném phi tiêu bão xoáy bay thẳng ra xa, nở bung thành hốc xoáy hút chặt quái vào tâm và chém vi mô liên tục.
  * 🥋 **Kawazu Kumite (Tiên Thuật Ếch)**: Đòn đánh cận chiến tạo sóng xung kích vô hình đánh văng quái cự ly xa hơn mà không cần chạm trúng.

---

### Chi Tiết Dạng 3: Kurama Chakra Mode (KCM Vàng Kim)
* **Bản sắc**: Dạng thức tỉnh tối thượng cuối trận khi Naruto và Kurama hòa hợp tuyệt đối.
* **Dự kiến**: Mở khóa ở giai đoạn late-game (Wave 8–10 / Boss cuối).
