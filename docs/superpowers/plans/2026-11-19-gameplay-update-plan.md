# Kế Hoạch Sơ Bộ: Cập Nhật Gameplay & Cân Bằng (Overview Plan)

> **Nhánh**: `feat/update-gameplay`  
> **Nguyên tắc định hướng**: **Core Design Law: Asymmetric Identity & Dilemma** (Mạnh/yếu phân minh, không kỹ năng rác, mọi lựa chọn đều tạo sự đắn đo).  
> **Giai đoạn**: Bản phác thảo sơ bộ (chưa viết code, chuẩn bị cho plan chi tiết).

---

## 6 Trụ Cột Cập Nhật Gameplay

### 1. Kirito — Phantom Dash (Hạ Cooldown, Nâng DPS)
* **Mục tiêu**: Thoát khỏi cảnh "kỹ năng lướt cho vui" (6.4 DPS cũ), biến thành đòn ám sát dọn đường máu uy lực.
* **Chỉ số sơ bộ**:
  * Cooldown giảm mạnh: Lv.1 `4.5s` $\rightarrow$ Lv.5 `2.4s` (cũ `7.0s` $\rightarrow$ `3.6s`).
  * Sát thương tăng: Lv.1 `65` (1-hit Slime) $\rightarrow$ Lv.5 `175` (cũ `45` $\rightarrow$ `115`).
  * Thưởng combo Băng/Hỏa: Lướt trúng quái dính Slow/Burn cộng thêm `+35 Dmg` (cũ +15).
  * Bảo lưu: Bất tử 100% trong `400ms` (lướt 225ms + đệm an toàn 175ms sau khi đáp).

### 2. Naruto — Rasengan (Tăng Dame Nhẹ + Cơ Chế Đẩy Lùi Liên Tục)
* **Mục tiêu**: Giữ bản sắc đạn chakra xoắn ốc đơn mục tiêu uy lực.
* **Chỉ số sơ bộ**:
  * Tăng nhẹ sát thương cơ bản: Lv.1 `32` $\rightarrow$ Lv.5 `78 Dmg` (cũ `26` $\rightarrow$ `62`).
  * **Không cho xuyên (Pierce = 1)**: Giữ tính đơn mục tiêu.
  * **Cơ chế mới (từ Lv.2+)**: Khi chạm quái, Rasengan không mất ngay mà găm vào đẩy lùi liên tục (`knockback` mạnh theo hướng bay, gây thêm sát thương xoáy) trước khi nổ bùng phát cuối.

### 3. Naruto — Bùa Nổ (Hạ Cooldown, Mở Rộng Bán Kính & Thả Nhiều Bùa)
* **Mục tiêu**: Đã tốn công dụ quái vào bẫy thì bẫy phải nổ to và dọn dẹp cụm quái xứng đáng.
* **Chỉ số sơ bộ**:
  * Cooldown: Lv.1 `900ms` $\rightarrow$ Lv.5 `500ms` (cũ `1200ms` $\rightarrow$ `700ms`).
  * Sát thương nổ: Lv.1 `75` (1-hit Slime) $\rightarrow$ Lv.5 `160 Dmg` (cũ `48` $\rightarrow$ `120`).
  * Bán kính nổ AOE: Mở rộng từ `85px` $\rightarrow$ `135px` (cũ `68px` $\rightarrow$ `116px`).
  * Số lượng bùa: Rải `1 bùa` (Lv.1-2) $\rightarrow$ **`2 bùa`** (Lv.3-4) $\rightarrow$ **`3 bùa`** (Lv.5).

### 4. Loại Bỏ Hồi Máu Khi Lên Cấp & Khi Chọn Max HP
* **Mục tiêu**: Tăng tính sinh tồn, không thể "câu level" để cứu mạng khi thấp máu.
* **Cơ chế**: Nhặt thẻ `stat_max_hp` chỉ mở rộng thanh máu tối đa, **không hồi máu hiện tại**. Máu chỉ hồi qua nhặt bình máu hoặc chỉ số hồi phục.

### 5. Chỉ Số Mới: Khả Năng Hồi Phục (`stat_recovery`)
* **Mục tiêu**: Hồi máu chậm rãi, đủ vá vết quẹt nhẹ nhưng không biến nhân vật thành bất tử.
* **Cơ chế**: Chu kỳ hồi mỗi **`3 giây (3000ms)`**:
  * Lv.1: `+1 HP / 3s`
  * Lv.2: `+2 HP / 3s`
  * Lv.3: `+3 HP / 3s`
  * Lv.4: `+4 HP / 3s`
  * Lv.5 (Max): `+6 HP / 3s` (tối đa 2.0 HP/s, muốn sống sót bắt buộc vẫn phải né và nhặt bình máu).

### 6. Nền Tảng Chí Mạng (Crit Xác Suất Đơn, Trần 30%)
* **Mục tiêu**: Xây dựng khung chuẩn xác suất đơn độc lập cho từng hit, chuẩn bị cho các nguồn buff tăng crit ở mục 3 sau này.
* **Cơ chế**:
  * Xác suất đơn: `rng() < Math.min(critChance, 0.30)`.
  * Khống chế trần cứng: **$X = 30\%$** (tránh vỡ trận với vũ khí bắn nhanh như orb/orbital).
  * Hệ số sát thương: **`x1.5`** khi nổ crit.

---

## Các Bước Tiếp Theo
1. Xem xét và chốt định hướng sơ bộ trên.
2. Khi bạn sẵn sàng, sẽ xây dựng Implementation Plan chi tiết (chia nhỏ từng task, viết test trước theo TDD).
3. Triển khai code và kiểm thử nghiệm thu.
