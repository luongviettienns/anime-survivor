# Bảng Thông Số & Nghiên Cứu Cân Bằng Toàn Diện (Game Balance Sheet)

> **Single Source of Truth cho Cân Bằng Game (Flat-Number Balance System)**.
> * **Nguyên tắc cốt lõi**: Mọi chỉ số tăng/giảm, buff/nerf, mở rộng theo thời gian đều dùng **SỐ CỤ THỂ (Flat Numbers)** — **KHÔNG dùng phần trăm (`%`)** để tránh lỗi phồng số cấp số nhân (exponential snowball) và giúp người chơi tính nhẩm trực quan.
> * Tài liệu phân tách rõ: **[Thông số hiện tại trong code]** vs **[Đề xuất Cân bằng & Tăng trưởng mới]**.

---

## 1. Kiểm Toán Lỗ Hổng Cân Bằng Hiện Tại (Root Cause Audit)

Đối chiếu trực tiếp từ mã nguồn (`src/domain/enemies.ts`, `waves.ts`, `progression.ts`, `upgrades.ts`, `GameScene.ts`):
1. **Quái không tăng sức mạnh theo thời gian**: Slime ở giây `0` và phút `9` đều chỉ có `50 HP`, `11 Dmg`, `94 px/s`. Boss phút 10 chỉ có `900 HP` (bị vũ khí Lv.5 bắn gục trong ~2 giây).
2. **XP lên cấp quá rẻ**: Công thức `xpThreshold = 3 + level * 2` khiến Lv.10 chỉ cần `23 XP`, Lv.20 chỉ cần `43 XP` -> Người chơi đạt max đồ quá sớm rồi đứng yên vẫn thắng.
3. **Thiếu Item rơi bắt buộc phải nhặt**: `spawnHealPickup` có trong `PickupSystem.ts` nhưng chưa hề được gọi khi quái chết trong `GameScene.ts`.
4. **Chỉ số nâng cấp đang dùng `%`**: `+15% Dame`, `-12% Cooldown`, `+10% Tốc chạy`, `+10% Crit` làm lệch cân bằng giữa vũ khí bắn nhanh và vũ khí nổ to.
5. **Tốc độ & Độ tăng trưởng Skill mất cân bằng nghiêm trọng (`src/domain/weapons.ts`)**:
   * **`orb` quá bá đạo ở Lv.5**: Nhảy từ `73.7 DPS` (Lv.1: 28 dmg / 380ms) lên **`750 DPS`** (Lv.5: 60×3 viên / 240ms) — **tăng gấp 10.2 lần**, biến thành "súng máy" (12.5 viên/giây), trong khi tốc bay (`560 px/s`) và tầm bắn (`520 px`) đứng yên không tăng theo cấp.
   * **`mine` & `orbital` quá yếu ở Lv.1**: `mine` Lv.1 chờ tới `1450 ms` mới đặt 1 bùa nhỏ `58 px`; `orbital` Lv.1 chỉ có 1 lưỡi quay chậm `3.2 rad/s` (~0.5 vòng/giây).
   * **Lệch nhịp khi cộng chỉ số phẳng**: Khoảng cách hồi chiêu quá xa (`240 ms` vs `1450 ms`) khiến giảm `-45 ms` hồi chiêu quá bá cho `orb` nhưng gần như vô hình với `mine`.

---

## 2. Hệ Thống & Độ Tăng Trưởng Chỉ Số Bị Động Theo Cấp (Lv.1 – Lv.5, Không dùng %)

Mỗi chỉ số bị động có **giới hạn tối đa 5 cấp (Max Lv.5)** tương tự vũ khí. Khi đạt Lv.5, thẻ này **rời khỏi pool random** để nhường chỗ cho người chơi hoàn thiện các chỉ số khác.

### 2.1. Bảng Tăng Trưởng Chi Tiết Từng Cấp (Passive Growth Curves)

| Mã ID | Tên hiển thị | Lv.1 | Lv.2 | Lv.3 | Lv.4 | Lv.5 (Max) | Tổng tại Lv.5 | Quy luật tăng trưởng & Lý do cân bằng |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| `stat_max_hp` | **Tăng Máu Tối Đa** *(+Hồi ngay bằng giá trị tăng)* | `+25` | `+25` | `+30` | `+35` | **`+45`** | **`+160 Max HP`** | **Tăng dần (Escalating)**: Giữ nguyên giá trị thẻ ở cuối trận khi quái đánh `37–48 Dmg`. |
| `stat_damage_reduction` | **Giảm Sát Thương Nhận Vào** *(Chặn dưới còn `2 Dmg`)* | `-2` | `-3` | `-3` | `-4` | **`-6`** | **`-18 Dmg`** | **Tăng dần**: Đầu trận `-2` không gây bất tử trước Slime `10 Dmg`; cuối trận `-18` cắt nửa sát thương. |
| `stat_damage` | **Tăng Sát Thương** *(Cộng thẳng vào đòn đánh)* | `+5` | `+6` | `+7` | `+8` | **`+10`** | **`+36 Dmg`** | **Tăng dần**: Bù đắp theo độ dày máu quái tăng `+24 HP/phút` ở nửa sau trận. |
| `stat_cooldown` | **Giảm Hồi Chiêu** *(Sàn tối thiểu `180 ms`)* | `-35 ms` | `-40 ms` | `-45 ms` | `-55 ms` | **`-75 ms`** | **`-250 ms`** | **Tăng dần**: Cấp đầu giảm nhẹ tránh snowball sớm; cấp cuối bứt nhịp đánh rõ rệt. |
| `stat_move_speed` | **Tăng Tốc Chạy** *(+`12 px` hút đồ mỗi cấp)* | **`+24 px/s`** | `+22 px/s` | `+20 px/s` | `+18 px/s` | `+16 px/s` | **`+100 px/s`** | **Giảm dần (Diminishing)**: Lv.1 bứt tốc ngay để né quái; tránh quá `360 px/s` gây trôi phím ở Lv.5. |
| `stat_magnet` | **Tăng Tầm Hút Đồ** *(Từ gốc `96 px`)* | `+35 px` | `+40 px` | `+45 px` | `+55 px` | **`+75 px`** | **`+250 px`** | **Tăng dần**: Đạt tổng `346 px` (~1/3 màn hình), vẫn buộc người chơi di chuyển chứ không đứng im hút hết map. |
| `stat_heavy_strike` | **Tăng Đòn Trọng Kích** *(Thay Crit %, nhịp chắc chắn)* | Đòn thứ 6:<br>**`+30 Dmg`** | Đòn thứ 5:<br>**`+50 Dmg`** | Đòn thứ 5:<br>**`+75 Dmg`** | Đòn thứ 4:<br>**`+105 Dmg`** | Đòn thứ 3:<br>**`+145 Dmg`** | **Mỗi 3 đòn:**<br>**`+145 Dmg`** | **Rút nhịp + Bùng nổ**: Loại bỏ hên xui RNG; trung bình cộng thêm `~48 Dmg/đòn` ở Lv.5 để hạ Elite/Boss. |

*(Tùy chọn bổ sung nếu cần thêm hồi phục: `stat_regen` — **Hồi Máu Định Kỳ**: `Lv.1..5` tăng `+1 -> +2 -> +2 -> +3 -> +4` HP mỗi 3 giây, tổng `+12 HP / 3s`)*

### 2.2. Kiểm Toán Tổng Sức Mạnh Khi Full Build (Phút 9 Stress Check)
* **Max HP**: `100` (gốc Naruto) + `160` = **`260 HP`** *(Đủ chịu ~13 hit liên tiếp nếu đứng im trước Slime phút 9 đánh `37 - 18 = 19 Dmg`, vẫn có thể chết nếu không né)*.
* **Tốc độ chạy**: `250` + `100` = **`350 px/s`** *(Vượt `Shade` phút 9 tốc `209 px/s`, giữ cảm giác điều khiển chắc tay)*.
* **Tầm hút ngọc**: `96` + `250` = **`346 px`**.

---

## 3. Hệ Thống Đa Nhân Vật (Multi-Hero Balance — Mạnh/Yếu Rõ Rệt)

Mỗi nhân vật có bộ chỉ số gốc bằng **số cụ thể** với ưu/nhược điểm bù trừ. Người chơi bắt buộc phải dùng nâng cấp trong trận để vá điểm yếu của Hero mình chọn.

| Hero / Archetype | Max HP | Tốc chạy (`px/s`) | Giáp (`-Dmg`) | Tầm hút (`px`) | Điều chỉnh Sát thương / Hồi chiêu gốc | Vũ khí Khởi đầu | Điểm Mạnh (Strength) | Điểm Yếu (Weakness — *Phải bù bằng nâng cấp*) |
| :--- | :---: | :---: | :---: | :---: | :--- | :--- | :--- | :--- |
| **1. Naruto** *(Cân bằng / Tiến hóa)* | `100` | `250` | `0` | `96` | `+0 Dmg` / `+0 ms` | **Rasengan (`orb`)** | Tự tìm mục tiêu ổn định, có 2 nhánh tiến hóa lột xác (Cửu Vĩ & Tiên Nhân Cóc). | Khởi đầu không có giáp, dọn đám đông áp sát yếu nếu thiếu `slash` / `orbital`. |
| **2. Sasuke** *(Sát thủ / Máu giấy)* | **`70`** | **`285`** | `0` | `90` | **`+8 Dmg` / `-40 ms`** | **Thể Thuật / Kiếm Khí (`slash`)** | Tốc chạy nhanh nhất dễ né đạn, sát thương đầu ra rất cao ngay từ giây đầu. | **Máu cực mỏng (`70 HP`)**: Ăn 2-3 đòn ở phút 4+ là chết nếu không lên *Tăng Máu* & *Giảm Sát Thương*. |
| **3. Ichigo** *(Đấu sĩ / Thiết giáp)* | **`150`** | **`210`** | **`4`** | `90` | `+4 Dmg` / `+50 ms` | **Trảm Sóng Rộng (`slash` +30px tầm)** | Trâu bò nhất đầu trận (`150 HP`, giáp chặn 4 dame), đánh rộng và đẩy lùi tốt. | **Chạy rất chậm (`210 px/s`)**: Rất dễ bị quái Shade bắt kịp và hụt ngọc EXP xa nếu thiếu *Tăng Tốc Chạy* & *Tầm Hút*. |
| **4. Luffy** *(Khống chế / Hút ngọc)* | `120` | `245` | `2` | **`160`** | **`-4 Dmg` / `+60 ms`** | **Quyền Đẩy Lùi (`orbital` / +80 đẩy lùi)** | Hút ngọc rộng vượt trội giúp lên cấp sớm đầu trận, đẩy văng quái khỏi người tốt. | **Đánh chậm & dame thấp đầu trận**: Rất lâu mới giết được quái Elite/Boss nếu không ưu tiên *Tăng Sát Thương* & *Giảm Hồi Chiêu*. |

---

## 4. Độ Tăng Trưởng Kẻ Địch & Đường Cong Áp Lực 10 Phút (Enemy Scaling)

Để trận đấu **kéo dài đủ 10 phút căng thẳng, không thể đứng yên AFK**, chỉ số quái tăng tuyến tính theo từng phút `M = floor(elapsedSec / 60)` bằng **số cụ thể**:

| Kẻ địch | Chỉ số gốc (Phút 0) | Tăng mỗi phút (`+ / phút`) | Sức mạnh tại Phút 5 (`M=5`) | Sức mạnh tại Phút 9 (`M=9`) | Mục đích gây áp lực lên người chơi |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Slime** *(Cận chiến đông)* | `50 HP`, `10 Dmg`, `94 px/s`, `1 XP` | `+24 HP`, `+3 Dmg`, `+5 px/s` | `170 HP`, `25 Dmg`, `119 px/s` | `266 HP`, `37 Dmg`, `139 px/s` | Đẩy ngưỡng HP: Không nâng cấp vũ khí sẽ mất 5–6 phát mới giết được 1 con và bị đè chết. |
| **Shade** *(Ám sát tốc độ)* | `35 HP`, `9 Dmg`, `155 px/s`, `2 XP` | `+16 HP`, `+3 Dmg`, `+6 px/s` | `115 HP`, `24 Dmg`, `185 px/s` | `179 HP`, `36 Dmg`, `209 px/s` | Đuổi kịp người chơi tốc `250 px/s` nếu không né hoặc không nâng *Tăng Tốc Chạy*. |
| **Mage** *(Bắn xa 230px)* | `45 HP`, `12 Đạn Dmg`, `78 px/s`, `3 XP` | `+20 HP`, `+4 Đạn Dmg`, `+2 px/s` | `145 HP`, `32 Đạn Dmg` | `225 HP`, `48 Đạn Dmg` | Ép phải lên *Giảm Sát Thương Nhận* & *Tăng Máu*, đạn rất đau ở nửa sau trận. |
| **Elite** *(Mỗi 90s từ 1:30)* | `280 HP`, `20 Dmg`, `110 px/s`, `15 XP` | `+80 HP`, `+4 Dmg`, `+4 px/s` | `680 HP`, `40 Dmg` | `1000 HP`, `56 Dmg` | Bắt buộc người chơi vừa chạy vừa dồn dame hạ để lấy rương/Item cứu sinh. |
| **Boss (Phút 10: 600s)** | **`4500 HP`** *(Hiện tại: 900)*, `35 Touch Dmg`, `24 Đạn Dmg` | Không tăng thêm | — | — | Kéo dài trận đánh Boss 30–50s kịch tính (khi `HP <= 2250` hóa cuồng bắn 12 tia xoắn ốc). |

---

## 5. Vòng Lặp Bắt Buộc: Đường Cong XP & Item Rơi Trên Bản Đồ

### 5.1. Nguyên Tắc Giới Hạn Thời Gian Màn Chơi & Công Thức XP (Thay thế `3 + level * 2`)
* **Giới hạn thời gian màn chơi (Stage Timer & Build Scarcity)**:
  * Mỗi màn chơi có mốc thời gian kết thúc cố định (ví dụ Màn 1: `600s` / 10 phút với Boss cuối).
  * Tổng số cấp tối đa của toàn bộ kho nâng cấp là **`54` cấp** (`19` cấp vũ khí + `35` cấp chỉ số), nhưng trong một màn 10 phút người chơi chỉ đạt khoảng **`Lv.18 – Lv.25`**.
  * **Chủ đích thiết kế**: Người chơi **không thể và không nhất thiết phải nâng cấp tối đa mọi thứ trong một màn**. Sự khan hiếm lượt lên cấp buộc người chơi phải chọn lọc chiến thuật (ví dụ: dồn cấp để kịp tiến hóa Cửu Vĩ / Tiên Nhân Cóc hay chia đều để sinh tồn) và tạo giá trị chơi lại nhiều lần.
* **Đường cong XP**:
  * **Giai đoạn đầu (`Lv.1 – Lv.5`)**: `xpNeeded = 5 + level * 4` *(Lv.1 cần `9 XP`, Lv.5 cần `25 XP`)*. Lên cấp nhanh 2 phút đầu để có bộ khung vũ khí.
  * **Giai đoạn giữa (`Lv.6 – Lv.15`)**: `xpNeeded = 15 + level * 6` *(Lv.6 cần `51 XP`, Lv.15 cần `105 XP`)*. Nhịp độ chậm lại, buộc phải di chuyển gom ngọc ở các bãi quái vừa hạ.
  * **Giai đoạn cuối (`Lv.16+`)**: `xpNeeded = 30 + level * 10` *(Lv.16 cần `190 XP`, Lv.20 cần `230 XP`)*.
  * **Tăng giá trị Ngọc EXP theo thời gian**: Từ phút 4 trở đi, Slime/Shade rơi ngọc cấp 2 (`3 XP`), Mage rơi `5 XP`, Elite rơi `15 XP` — tạo phần thưởng rõ rệt khi dám chạy ra ngoài vòng vây nhặt ngọc!

### 5.2. Cơ Chế Rơi Item Bắt Buộc Nhặt (Deterministic Drop Counters)
Không dùng tỉ lệ rơi `%` may rủi; dùng **bộ đếm số quái tiêu diệt cố định**:
1. **Bình Máu (`heal_pickup`: Hồi `+30 HP`)**:
   * **Cứ mỗi 25 quái thường bị tiêu diệt**: Chắc chắn rơi 1 Bình Máu ngay tại vị trí con thứ 25 chết.
   * **Quái Elite**: Chắc chắn rơi 1 Bình Máu khi chết.
   * *Tác dụng*: Với sát thương quái 20–48 Dmg ở giữa-cuối trận, người chơi bắt buộc phải mở đường máu chạy tới chỗ Bình Máu rơi để hồi phục.
2. **Nam Châm Toàn Bản Đồ (`magnet_pickup`)** *(Đề xuất bổ sung)*:
   * **Cứ mỗi 90 quái bị tiêu diệt (hoặc mỗi Elite thứ 2)**: Rơi 1 Nam Châm Vàng. Khi nhặt sẽ kéo toàn bộ ngọc EXP đang rải rác trên bản đồ bay về phía nhân vật -> Kích thích người chơi di chuyển phá vòng vây ăn item để bứt cấp.

---

## 6. Cân Bằng Tốc Độ, Hồi Chiêu & Độ Tăng Trưởng Vũ Khí Thường (Lv.1 – Lv.5)

> **Mục tiêu thiết kế**:
> * Kéo nhịp tăng trưởng từ Lv.1 ➔ Lv.5 lên mức ổn định (**3.5x – 4.5x DPS**, không còn nhảy 10.2x như `orb` cũ).
> * Đưa thời gian hồi chiêu (Cooldown) các skill về dải cân bằng (`460 ms – 1200 ms`) để nâng cấp `-45 ms Hồi Chiêu` có giá trị đồng đều.
> * **Tốc độ đạn (`speedPxSec`), tốc độ quay (`rad/s`) và tầm đánh (`rangePx`) tăng đều theo từng cấp** để người chơi cảm nhận rõ độ "mượt và mạnh" khi lên cấp skill.

### 6.1. Rasengan Chakra Orb (`orb`) — *Vai trò: Bắn tỉa từ xa, đơn mục tiêu / quạt hẹp*
* **Hiện tại (`weapons.ts`)**: `28->60 dmg`, `380->240 ms` *(quá nhanh)*, `speed 560 px/s` *(cố định)*, `range 520 px` *(cố định)*.
* **Đề xuất Cân Bằng Mới** *(Tăng đều tốc bay `+45 px/s`, tầm bắn `+30 px` mỗi cấp; hãm hồi chiêu tránh súng máy)*:

| Level | Sát thương (`+9/cấp`) | Hồi chiêu (`-75ms/cấp`) | Tốc độ đạn (`+45 px/s`) | Tầm bắn (`+30 px`) | Đẩy lùi | Số viên | DPS lý thuyết |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Lv.1** | `26` | `760 ms` | `420 px/s` | `440 px` | `60 px/s` | `1` | `34.2 DPS` |
| **Lv.2** | `35` | `685 ms` | `465 px/s` | `470 px` | `70 px/s` | `1` | `51.1 DPS` |
| **Lv.3** | `44` | `610 ms` | `510 px/s` | `500 px` | `80 px/s` | `2` | `144.3 DPS` |
| **Lv.4** | `53` | `535 ms` | `555 px/s` | `530 px` | `90 px/s` | `2` | `198.1 DPS` |
| **Lv.5** | `62` | `460 ms` | `600 px/s` | `560 px` | `100 px/s`| `3` | `404.3 DPS` *(3 tia quạt)* |

### 6.2. Taijutsu Fist Combo (`slash`) — *Vai trò: Cận chiến AOE đẩy lùi phá vòng vây*
* **Hiện tại (`weapons.ts`)**: `34->74 dmg`, `820->500 ms`, `range 84->124 px`, `knockback 240->360 px/s`.
* **Đề xuất Cân Bằng Mới** *(Tăng sát thương & tầm quét rộng hơn để bù cự ly cận chiến)*:

| Level | Sát thương (`+14/cấp`) | Hồi chiêu (`-75ms/cấp`) | Tầm quét (`+14 px`) | Đẩy lùi (`+35 px/s`) | Số hướng | DPS mỗi hướng (AOE) |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Lv.1** | `34` | `900 ms` | `90 px` | `260 px/s` | `1` | `37.8 DPS` |
| **Lv.2** | `48` | `825 ms` | `104 px` | `295 px/s` | `1` | `58.2 DPS` |
| **Lv.3** | `62` | `750 ms` | `118 px` | `330 px/s` | `1` | `82.7 DPS` |
| **Lv.4** | `76` | `675 ms` | `132 px` | `365 px/s` | `2` | `112.6 DPS` *(x2 hướng)* |
| **Lv.5** | `90` | `600 ms` | `146 px` | `400 px/s` | `2` | `150.0 DPS` *(x2 hướng = 300)* |

### 6.3. Shadow Shuriken Ring (`orbital`) — *Vai trò: Vòng phòng vệ 360°, bào máu quái áp sát*
* **Hiện tại (`weapons.ts`)**: `18->42 dmg`, `450->290 ms`, `1->3 lưỡi`, `range 72->96 px`, `3.2->4.6 rad/s` *(Lv.1 quá yếu & quay chậm)*.
* **Đề xuất Cân Bằng Mới** *(Khởi đầu 2 lưỡi để thực dụng ngay Lv.1; tăng mạnh tốc độ quay lên `6.0 rad/s` ~ 1 vòng/giây)*:

| Level | Sát thương (`+7/cấp`) | Hit Cooldown (`-35ms/cấp`) | Bán kính (`+9 px`) | Tốc độ quay (`+0.6 rad/s`) | Đẩy lùi | Số lưỡi |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Lv.1** | `20` | `420 ms` | `74 px` | `3.6 rad/s` *(~0.57 vòng/s)* | `115 px/s` | `2` |
| **Lv.2** | `27` | `385 ms` | `83 px` | `4.2 rad/s` *(~0.67 vòng/s)* | `125 px/s` | `2` |
| **Lv.3** | `34` | `350 ms` | `92 px` | `4.8 rad/s` *(~0.76 vòng/s)* | `135 px/s` | `3` |
| **Lv.4** | `41` | `315 ms` | `101 px` | `5.4 rad/s` *(~0.86 vòng/s)* | `145 px/s` | `3` |
| **Lv.5** | `48` | `280 ms` | `110 px` | `6.0 rad/s` *(~0.95 vòng/s)* | `160 px/s` | `4` |

### 6.4. Paper Bomb Tag (`mine`) — *Vai trò: Bẫy nổ AOE dọn bầy quái đuổi sau lưng*
* **Hiện tại (`weapons.ts`)**: `45->101 dmg`, `1450->810 ms` *(Lv.1 quá chậm)*, `58->90 px`.
* **Đề xuất Cân Bằng Mới** *(Rút cooldown Lv.1 xuống `1200 ms`, tăng bán kính nổ lên `116 px` ở Lv.5 để phát huy vai trò AOE)*:

| Level | Sát thương nổ (`+18/cấp`) | Hồi chiêu (`-125ms/cấp`) | Bán kính nổ (`+12 px`) | Đẩy lùi (`+25 px/s`) | Số bùa |
| :---: | :---: | :---: | :---: | :---: | :---: |
| **Lv.1** | `48` | `1200 ms` | `68 px` | `260 px/s` | `1` |
| **Lv.2** | `66` | `1075 ms` | `80 px` | `285 px/s` | `1` |
| **Lv.3** | `84` | `950 ms` | `92 px` | `310 px/s` | `1` |
| **Lv.4** | `102` | `825 ms` | `104 px` | `335 px/s` | `2` |
| **Lv.5** | `120` | `700 ms` | `116 px` | `360 px/s` | `2` |

---

## 7. Thông Số Tiến Hóa Nhân Vật & Tăng Trưởng Vũ Khí Mới (Số Cụ Thể — Không %)

### 7.1. Chỉ số cơ bản khi Thức tỉnh (Quy đổi 100% sang số cụ thể)
| Chỉ số bổ sung | 🔥 Kyuubi Rampage Mode (Cửu Vĩ Đỏ) | 🐸 Toad Sage Mode (Tiên Nhân Cóc) |
| :--- | :--- | :--- |
| **Máu tối đa (Max HP)** | **`+60 Max HP`** | **`+120 Max HP`** |
| **Tốc độ chạy** | **`+85 px/s`** | **`+35 px/s`** |
| **Sát thương cộng thêm** | **`+18 Sát thương`** | **`+8 Sát thương`** |
| **Giảm sát thương nhận** | **`-6 Sát thương nhận vào`** | **`-14 Sát thương nhận vào`** |
| **Hồi máu mỗi giây** | `0 HP/s` | **`+6 HP / giây`** |
| **Tầm hút ngọc thêm** | `+0 px` | **`+80 px`** |
| **Hiệu ứng quanh thân** | Aura đốt **`15 Dmg / 500ms`** (`65 px`) | Miễn nhiễm đẩy lùi |

### 7.2. Bộ 2 Kỹ năng Cửu Vĩ (`claw` & `beam`) — *Tốc độ & Hồi chiêu cân đối với `-45 ms` passive*
* **Móng Vuốt Chakra (`claw`)**: Quét hình quạt phía trước, đẩy lùi `380 -> 500 px/s` (`+30 px/s` mỗi cấp).
  * `Lv.1`: `50 Dmg`, `800 ms` cd, góc `120°`, tầm `110 px`
  * `Lv.2`: `68 Dmg`, `725 ms` cd, góc `135°`, tầm `125 px`
  * `Lv.3`: `86 Dmg`, `650 ms` cd, góc `155°`, tầm `140 px`
  * `Lv.4`: `110 Dmg`, `575 ms` cd, góc `165°`, tầm `155 px` *(vệt lửa đốt `20 Dmg/s` trong `2s`)*
  * `Lv.5`: `135 Dmg`, `500 ms` cd, góc `180°`, tầm `170 px` *(chém 2 nhát trái - phải liên hoàn)*
* **Tia Beam Cửu Vĩ (`beam`)**: Bắn tia laser thẳng xuyên thấu toàn bộ quái (Tốc độ quét tia tức thời, thời gian tồn tại vệt tia `260 ms`).
  * `Lv.1`: `65 Dmg`, `1800 ms` cd, dài `480 px`, rộng `18 px`
  * `Lv.2`: `85 Dmg`, `1650 ms` cd, dài `560 px`, rộng `22 px`
  * `Lv.3`: `110 Dmg`, `1500 ms` cd, dài `640 px`, rộng `28 px`
  * `Lv.4`: `140 Dmg`, `1350 ms` cd, dài `740 px`, rộng `34 px` *(choáng `500 ms`)*
  * `Lv.5`: `175 Dmg`, `1200 ms` cd, dài `850 px`, rộng `42 px` *(nổ `80 Dmg` tại điểm cuối)*

### 7.3. Bộ 2 Kỹ năng Tiên Nhân Cóc (`rasenshuriken_throw` & `kawazu_kumite`)
* **Rasenshuriken Ném Xa**: Tốc độ bay tăng dần `380 -> 540 px/s` (`+40 px/s` mỗi cấp), tạo bão xoáy hút quái tốc độ kéo `140 -> 240 px/s`.
  * `Lv.1`: `45` Dmg bay / `18` Dmg bão mỗi `200ms`, tốc bay `380 px/s`, tầm `450 px`, bán kính bão `75 px` (`2.0s`), `1600 ms` cd
  * `Lv.2`: `55` / `24`, tốc bay `420 px/s`, tầm `485 px`, bán kính `88 px` (`2.5s`), `1450 ms` cd
  * `Lv.3`: `70` / `32`, tốc bay `460 px/s`, tầm `520 px`, bán kính `105 px` (`2.5s`), `1300 ms` cd
  * `Lv.4`: `85` / `42`, tốc bay `500 px/s`, tầm `560 px`, bán kính `122 px` (`3.0s`), `1150 ms` cd
  * `Lv.5`: `105` / `55`, tốc bay `540 px/s`, tầm `600 px`, bán kính `140 px` (`3.0s`), `1000 ms` cd *(ném 2 phi tiêu 2 hướng)*
* **Kawazu Kumite (Tiên Thuật Ếch)**: Đấm phóng sóng năng lượng tự nhiên đánh không chạm.
  * `Lv.1`: `40 Dmg`, `820 ms` cd, tầm `130 px`, đẩy lùi `320 px/s`
  * `Lv.2`: `55 Dmg`, `740 ms` cd, tầm `145 px`, đẩy lùi `355 px/s`
  * `Lv.3`: `72 Dmg`, `660 ms` cd, tầm `160 px`, đẩy lùi `390 px/s` *(choáng `300 ms`)*
  * `Lv.4`: `90 Dmg`, `580 ms` cd, tầm `178 px`, đẩy lùi `425 px/s`
  * `Lv.5`: `115 Dmg`, `500 ms` cd, tầm `196 px`, đẩy lùi `460 px/s` *(quét quạt `180°`)*

---

## 8. Công Thức Chiến Đấu Chuẩn (Zero-Percentage Formulas)

1. **Sát thương gây ra**:
   $$\text{FinalDamage} = \max(1, \text{WeaponBaseDamage} + \text{FlatDamageBonus} + \text{HeavyStrikeBonus})$$
2. **Sát thương nhận vào (Giáp trừ thẳng)**:
   $$\text{DamageTaken} = \max(2, \text{EnemyDamage} - \text{FlatDamageReduction})$$
3. **Thời gian hồi chiêu**:
   $$\text{FinalCooldownMs} = \max(150, \text{WeaponBaseCooldownMs} - \text{FlatCooldownReductionMs})$$
4. **Tốc độ di chuyển**:
   $$\text{FinalSpeedPxSec} = \text{HeroBaseSpeedPxSec} + \text{FlatSpeedBonusPxSec}$$


---

## 9. Ma Trận Điểm Mạnh / Điểm Yếu & Bù Trừ Kỹ Năng (Skill Synergy Matrix)

> **Nguyên tắc cân bằng**: Không có kỹ năng nào toàn diện (No "One-Skill-Wins-All"). Mỗi kỹ năng có một thế mạnh rõ rệt và một điểm yếu chí tử, buộc người chơi phải **kết hợp nâng cấp nhiều kỹ năng để bù trừ cho nhau**.

### 9.1. Bộ 4 Kỹ Năng Thường
| Kỹ năng | Điểm Mạnh (Strength) | Điểm Yếu Chí Tử (Weakness) | Kỹ năng Bù Trừ (Synergy) |
| :--- | :--- | :--- | :--- |
| **`orb`** *(Rasengan)* | Tầm bắn xa (`440–560 px`), tự khóa mục tiêu gần nhất, dồn dame đơn mục tiêu / Boss tốt. | **Không có AOE nổ**, **đẩy lùi cực yếu (`60–100 px/s`)**, rất dễ bị ngợp khi bầy quái đông bu từ nhiều hướng. | **`slash`** *(đẩy lùi phá vây)* + **`mine`** *(nổ AOE dọn bầy)*. |
| **`slash`** *(Thể thuật)* | Sát thương khá, **đẩy lùi cực mạnh (`260–400 px/s`)**, mở đường máu trực diện khi bị áp sát. | **Tầm đánh rất ngắn (`90–146 px`)**, hở lưng ở Lv.1–3, **bất lực trước quái đứng xa (`Mage` 230 px)**. | **`orb`** *(tỉa Mage từ xa)* + **`orbital`** *(bọc lót sau lưng & 2 bên)*. |
| **`orbital`** *(Shuriken)*| **Phòng thủ 360° liên tục**, cắt ngang chặn quái tốc độ cao (`Shade`) lao từ điểm mù. | **Sát thương mỗi hit thấp (`20–48 Dmg`)**, không chạm được quái ngoài vòng (`> 110 px`) và có **vùng chết sát tâm**. | **`slash`** *(hất quái văng ra đúng bán kính vòng xoay)* + **`orb`** *(dứt điểm Elite/Boss)*. |
| **`mine`** *(Bùa nổ)* | **Sát thương nổ AOE lớn nhất (`48–120 Dmg`)**, bán kính rộng (`68–116 px`), xóa sổ đàn quái đuổi sau lưng. | **Thụ động** (chỉ rơi tại chỗ khi chạy), **hồi chiêu lâu (`700–1200 ms`)**, vô dụng trước `Mage` đứng im hoặc khi bị kẹt góc. | **`orb`** *(diệt Mage đứng im)* + **`slash`** *(mở đường thoát góc kẹt)*. |

### 9.2. Bộ Kỹ Năng Tiến Hóa (Cặp Bổ Trợ Cho Nhau)
* **Nhánh Cửu Vĩ (`claw` + `beam`)**:
  * `claw`: Mạnh càn quét góc rộng gần (`120°–180°`), đẩy lùi — *Yếu*: hở lưng và tầm ngắn.
  * `beam`: Mạnh xuyên thấu thẳng hàng dài (`480–850 px`) — *Yếu*: hồi chiêu lâu (`1200–1800 ms`), đường bắn hẹp (`18–42 px`), hở sườn.
  * ➔ **Bù trừ**: `claw` quét dồn quái thành cụm phía trước, `beam` thổi bay cả hàng dài xuyên màn hình.
* **Nhánh Tiên Nhân Cóc (`rasenshuriken_throw` + `kawazu_kumite`)**:
  * `rasenshuriken_throw`: Mạnh hút gom & chém vi mô từ xa — *Yếu*: hồi chiêu lâu (`1000–1600 ms`), dễ bị `Shade` lao nhanh áp sát trong lúc chờ nổ.
  * `kawazu_kumite`: Mạnh đánh không chạm (`130–196 px`), choáng & đẩy lùi — *Yếu*: không gom/diệt được đám đông từ xa.
  * ➔ **Bù trừ**: `kawazu_kumite` đấm hất quái áp sát bay ngược vào đúng tâm bão `rasenshuriken` đang xoay.


---

## 10. Logic Random Ngẫu Nhiên Nâng Cấp Hợp Lý (Smart Weighted Roll)

> **Vấn đề của code cũ (`src/domain/upgrades.ts`)**: `rollUpgradeChoices` đang bốc ngẫu nhiên đều (uniform Fisher-Yates) trên 1 rổ chung, dẫn đến tình trạng đầu game bị ra 3 thẻ toàn Passive không có skill đánh, giữa game ra quá nhiều skill mới Lv.1 mà không lên được Lv.5 để tiến hóa, và không loại bỏ chỉ số khi đã chạm trần.

### 10.1. Bước 1: Lọc Pool Hợp Lệ Tuyệt Đối (Strict Eligibility)
1. **Chống lãng phí lượt**: Loại bỏ ngay lập tức mọi Vũ khí và Chỉ số Bị Động đã đạt **Max `Lv.5`** (`stat_max_hp = +160`, `stat_damage_reduction = -18`, `stat_damage = +36`, `stat_cooldown = -250 ms`, `stat_move_speed = +100 px/s`, `stat_magnet = +250 px`, `stat_heavy_strike = Lv.5`).
2. **Lọc theo Hình thái (Mode Filter)**:
   * *Dạng Thường*: Chỉ bốc trong 4 vũ khí thường + 7 chỉ số.
   * *Dạng Cửu Vĩ*: Loại bỏ 100% vũ khí thường; chỉ bốc `claw`, `beam` + 7 chỉ số.
   * *Dạng Tiên Nhân Cóc*: Chỉ bốc `rasenshuriken_throw`, `kawazu_kumite` + các chỉ số hợp lệ.

### 10.2. Bước 2: Phân Bổ Khung Thẻ (Slot Guarantee)
Thay vì bốc mù 3 thẻ, chia cố định 3 ô lựa chọn (nếu pool còn đủ):
* **Giai đoạn đầu (`Player Level 2 – 4`)**: Ưu tiên **2 ô Vũ khí + 1 ô Chỉ số** (giúp người chơi nhanh chóng sở hữu ít nhất 2 kỹ năng bù trừ nhau).
* **Giai đoạn bình thường (`Level 5+`)**:
  * **Ô 1**: Bắt buộc **1 Vũ khí** *(nếu vẫn còn vũ khí chưa Max)*.
  * **Ô 2**: Bắt buộc **1 Chỉ số Bị động** *(nếu vẫn còn chỉ số chưa chạm trần)*.
  * **Ô 3 (Flex)**: Bốc ngẫu nhiên có trọng số từ phần còn lại.

### 10.3. Bước 3: Bốc Thăm Có Trọng Số Thông Minh (Weighted Random)
Trong mỗi nhóm, sử dụng trọng số (`Weight`) để xác suất ra hợp lý với tiến trình build của người chơi:

| Đối tượng trong Pool | Trọng số (`Weight`) | Mục đích thiết kế |
| :--- | :---: | :--- |
| Vũ khí **đang ở Lv.4** *(sắp Max)* | **`4`** | Giúp người chơi hoàn thiện Lv.5 đúng nhịp để mở khóa Tiến hóa, tránh bị kẹt ở Lv.4. |
| Vũ khí **đang sở hữu (`Lv.1 – Lv.3`)** | **`3`** | Ưu tiên nâng sâu kỹ năng đang có thay vì rải rác 4 vũ khí đều Lv.1 yếu ớt. |
| Vũ khí **chưa sở hữu (`Lv.0`)** *(khi đang có `< 2` vũ khí)* | **`3`** | Bảo đảm đầu game sớm có vũ khí phụ bù trừ điểm yếu. |
| Vũ khí **chưa sở hữu (`Lv.0`)** *(khi đã có `>= 2` vũ khí)* | **`1`** | Vẫn có thể xuất hiện để đa dạng build nhưng không làm loãng vũ khí chính. |
| Chỉ số Bị động **(Mặc định)** | **`2`** | Cân bằng đều giữa các chỉ số. |
| `Tăng Máu Tối Đa` & `Giảm Sát Thương Nhận` **(khi `HP <= 40%`)** | **`4`** | Cơ chế **Pity cứu nguy hợp lý**: Khi đang nguy kịch, tăng tỷ lệ ra thẻ sinh tồn giúp người chơi có cơ hội lật kèo bằng kỹ năng. |

### 10.4. Thẻ Đặc Biệt & Nút Chống Ép Chọn
* **Thẻ Khế Ước Cửu Vĩ**: Khi đủ điều kiện, xuất hiện tại **Ô 3** hoặc hộp thoại riêng với nút chọn `Có / Không`. Nếu chọn `Không`, tạm ẩn trong `2` lần lên cấp tiếp theo để không làm phiền.
* **Nút `Bỏ Qua / Tích Khí` (Dành cho Thử thách 60s Tiên Nhân Cóc)**: Luôn hiển thị ở chân bảng nâng cấp trong thời gian đếm ngược 60s để người chơi chủ động không nhận nâng cấp mới.
