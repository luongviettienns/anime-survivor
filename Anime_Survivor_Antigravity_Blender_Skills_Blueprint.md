# ANIME SURVIVOR — ANTIGRAVITY + BLENDER PYTHON SKILLS BLUEPRINT

**Ngày nghiên cứu:** 27/10/2026  
**Trạng thái:** Kế hoạch đã nghiên cứu từ README/tài liệu của repo, CHƯA cài hoặc chạy kiểm thử trên máy dự án.  
**Mục tiêu:** Antigravity tự tạo asset có thể chỉnh sửa bằng Blender Python, tự render spritesheet/GLB, kiểm thử hình ảnh và tiếp tục phát triển toàn bộ web game.

## 0. Quyết định kỹ thuật

- Giữ nguyên engine/game framework hiện có. KHÔNG chuyển engine khi chưa kiểm tra repo đang chạy. Trước tiên phân biệt **web game 2D/2.5D dùng spritesheet** với **web game 3D thật dùng GLB/glTF**. Blender hỗ trợ cả hai hướng nhưng đầu ra khác nhau.
- Blender + Python `bpy` là **nguồn asset chuẩn**; lưu `.blend` và script khởi tạo. Ảnh PNG/atlas/GLB là đầu ra được sinh ra, không phải nguồn gốc duy nhất.
- Chỉ kết nối **một Blender MCP** mặc định: `ahujasid/mcp-for-blender`; không chạy song song các fork cạnh tranh cùng port.
- Blender 5.2+ là mục tiêu thử nghiệm do các repo `blender-expert-skills`/`pseudo-pixel` yêu cầu. Pin phiên bản Blender khi xác nhận hoạt động, không nâng tự động.
- Sử dụng MCP để điều khiển phiên Blender đang mở; script `blender --background ...` để batch render không cần GUI; Pillow xử lý ảnh ở môi trường Python riêng, không trộn dependency trong Blender Python.
- Không tự dùng API trả phí, model 3D/cloud, tài sản bên thứ ba hoặc nhân vật có bản quyền khi chưa được duyệt.

## 1. Danh sách repo có nguồn và mục đích

### A. Điều khiển Blender

1. **Blender MCP** — https://github.com/ahujasid/mcp-for-blender — bridge Agent → Blender, thực thi `bpy`, xem viewport/animation render. **CHỌN**.
2. **BlendRelay MCP** — https://github.com/shefq/blendrelay-mcp — thay thế nếu bridge chính không phù hợp; hỗ trợ Antigravity CLI trực tiếp. **DỰ PHÒNG**, không chạy cùng Blender MCP.
3. **Blender Expert Skills** — https://github.com/edemaistre/blender-expert-skills — skill router + rigging, animation, geometry nodes, hard surface, lighting. **CHỌN LỌC**.
4. **bpy_skill** — https://github.com/mattjamo/bpy_skill — không cần MCP, có live bridge và headless quality checks; đánh giá tham khảo, không bật cùng bridge chính.

### B. Pixel art, animation, spritesheet

5. **Pseudo-Pixel** — https://github.com/craigrusselltiu/pseudo-pixel — pipeline reference → 3D → rig → animation → sprite 8 hướng, Python CLI, JSON. **THỬ NGHIỆM**. TripoSG cần GPU có VRAM lớn (repo ghi thử trên RTX 3060 12GB và tải weights khoảng 8GB), không mặc định chạy.
6. **SpriteSheetMaker** — https://github.com/ManasMakde/SpriteSheetMaker — addon Blender pixelate/sprite export, module Python. **THỬ NGHIỆM** và chọn một công cụ exporter chính sau khi so sánh.
7. **Agent Sprite Forge** — https://github.com/0x0funky/agent-sprite-forge — script postprocess, căn frame, QC, spritesheet, maps. **CHỈ chọn script Python phù hợp**, các đường gọi AI/video có thể tốn phí.
8. **SpriteKiln** — https://github.com/LucasJRamos/spritekiln — dựng sprite 8 hướng bằng procedural 3D YAML. **PHƯƠNG ÁN PHỤ** cho quái đơn giản, không thay Blender khi cần .blend.
9. **SanjoSolutions/pixel-art** — https://github.com/SanjoSolutions/pixel-art — tham khảo render Blender → pixelation → ghép sheet. **TÀI LIỆU THAM KHẢO**.

### C. Game design, coding và chất lượng

10. **Agentic Awesome Skills** — https://github.com/sickn33/agentic-awesome-skills — kho lớn, chỉ cài đúng skill IDs liên quan. **CHỌN LỌC**.
11. **Skills Gamedev** — https://github.com/poorvith-mp/skills-gamedev — chuyên cho game design, blender tooling, game AI, audio, playtesting, performance. **CHỌN LỌC**.
12. **Playwright MCP** — https://github.com/microsoft/playwright-mcp (nếu repo chuyển hướng, dùng docs https://github.com/microsoft/playwright/blob/main/docs/src/getting-started-mcp.md) — tự mở browser, thao tác, xem DOM/screenshot để QA. **CHỌN**.
13. **Phaser 3 examples** — https://github.com/phaserjs/examples — tham khảo gameplay nếu dự án thật đang dùng Phaser. **CHỈ MÃ NGUỒN THAM KHẢO**; README ghi rõ asset mẫu không được tự do tái sử dụng thương mại.

## 2. Bộ skill CHỈ NÊN KÍCH HOẠT

### 2.1. Từ `edemaistre/blender-expert-skills`

Các folder thực tế có trong repo:
- `blender-expert` (router, giữ cùng các folder khác)
- `blender-rigging`
- `blender-animation`
- `blender-hard-surface`
- `blender-geometry-nodes`
- `blender-lighting-rendering`
- Tùy khi cần: `blender-texturing-shading`, `blender-uv-baking`, `blender-retopology`, `blender-sculpting`.

### 2.2. Từ `poorvith-mp/skills-gamedev`

**Bộ lõi:**
- `blender-tooling`, `blender-modeling` (Python automation, asset source)
- `game-design`, `game-ai` (core loop, hành vi quái/boss)
- `game-performance`, `playtesting` (ràng buộc hiệu năng, QA)
- `tech-art` (art→engine)
- `production-planning` (vertical slice, milestones)

**Kích hoạt theo giai đoạn:**
- `game-ui`, `level-design`, `game-audio`, `game-build-pipeline`, `game-version-control`.

Các skill `blender-modeling`, `blender-animation` từ nhiều nguồn có phần trùng nhau; khi Agent viết code, chọn một skill làm nguồn chỉ dẫn chính và dùng nguồn kia để cross-check, tránh giao 2 chuẩn đối nghịch.

### 2.3. Từ `sickn33/agentic-awesome-skills`

**IDs tìm thấy trên repo / documentation:**
- `game-development`
- `brainstorming`, `concise-planning`
- `systematic-debugging`, `lint-and-validate`, `test-driven-development`
- `webapp-testing`, `browser-automation`, `e2e-testing-patterns`
- `frontend-design`
- `code-review-checklist`, `deployment-procedures`

Cài nhóm tối thiểu trước (không nên vượt quá ~10–15 skill active cùng lúc nếu không cần): `game-development`, `brainstorming`, `systematic-debugging`, `lint-and-validate`, `test-driven-development`, `webapp-testing`, `frontend-design`. Các ID còn lại dùng ở đúng giai đoạn.

## 3. Cài đặt Windows PowerShell — thực hiện sau khi review nguồn

### 3.1. Kiểm tra công cụ

```powershell
winget --version
git --version
node --version
npm --version
py --version
```

Cài Blender từ https://www.blender.org/download/ nếu chưa có, chọn bản tương thích với bộ skill. Kiểm tra bằng `blender --version` nếu đã thêm Blender vào PATH, hoặc dùng full path tới blender.exe.

### 3.2. Blender MCP (một bridge)

```powershell
winget install --id=astral-sh.uv -e
# Mở lại PowerShell rồi kiểm tra:
uvx --version
uvx mcp-for-blender setup
```

Trong Antigravity → MCP settings, thêm server dưới đây theo đúng UI/config version mà Antigravity đang sử dụng, không ghi đè các server cũ:

```json
{
  "mcpServers": {
    "blender-mcp": {
      "command": "uvx",
      "args": ["mcp-for-blender"],
      "env": {
        "BLENDER_HOST": "localhost",
        "BLENDER_PORT": "9876"
      }
    }
  }
}
```

Sau đó trong Blender: Preferences → Add-ons, bật MCP for Blender; trong viewport nhấn `N` → tab MCP for Blender → Start/Connect. Khởi động lại Antigravity nếu chưa nhận MCP. Nếu `uvx` không được tìm thấy trên Windows, dùng đường dẫn tuyệt đối đến `uvx.exe` thay vì tự đổi package name.

**Smoke test:** yêu cầu Agent kiểm tra scene, tạo một cube, xuất một PNG preview và lưu `.blend` trong `art/source/smoke-test/`, sau đó kiểm tra file thực tế.

### 3.3. Copy skill Blender chọn lọc

Chạy **trong thư mục gốc dự án**:

```powershell
New-Item -ItemType Directory -Force -Path .agents/skills,tools/_external | Out-Null
git clone https://github.com/edemaistre/blender-expert-skills.git tools/_external/blender-expert-skills
$blenderSkills = @('blender-expert','blender-rigging','blender-animation','blender-hard-surface','blender-geometry-nodes','blender-lighting-rendering')
foreach ($id in $blenderSkills) {
    Copy-Item -Recurse -Force "tools/_external/blender-expert-skills/$id" ".agents/skills/$id"
}
```

`blender-expert` là router chung. Các script dùng đường dẫn tương đối nên phải giữ folder ở cạnh nhau.

### 3.4. Copy skill gamedev chọn lọc

```powershell
git clone https://github.com/poorvith-mp/skills-gamedev.git tools/_external/skills-gamedev
$gameSkills = @('blender-tooling','blender-modeling','game-design','game-ai','game-performance','playtesting','tech-art','production-planning')
foreach ($id in $gameSkills) {
    Copy-Item -Recurse -Force "tools/_external/skills-gamedev/skills/$id" ".agents/skills/$id"
}
```

### 3.5. Cài bộ agentic-awesome-skills nhỏ

```powershell
npx agentic-awesome-skills --antigravity --skills game-development,brainstorming,systematic-debugging,lint-and-validate,test-driven-development,webapp-testing,frontend-design --dry-run
```

Kiểm tra đường dẫn, bản quyền, scripts, rủi ro trong preview. Chỉ sau khi xác nhận mới chạy lại đúng lệnh **bỏ `--dry-run`**. Không cài tất cả catalog.

### 3.6. Playwright MCP (tùy chọn nhưng khuyến nghị)

Trong MCP settings thêm vào cùng cấu hình hiện có:

```json
"playwright": {
  "command": "npx",
  "args": ["@playwright/mcp@latest"]
}
```

Đây chỉ là entry cần ghép vào `mcpServers`, không phải JSON config độc lập. Với chạy ổn định, pin phiên bản package thực tế đã kiểm thử thay vì giữ `@latest`.

## 4. Kiến trúc source code và asset

```text
anime-survivor/
├── .agents/skills/                 # chỉ các skill được review
├── art/
│   ├── STYLE_GUIDE.md
│   ├── source/                    # *.blend, *.py, rig, original reference
│   ├── specifications/            # *.json / *.yaml, one asset = one spec
│   └── previews/                  # contact sheets, animated previews
├── tools/
│   ├── blender/                   # headless create/rig/animate/render, bpy only
│   ├── sprites/                   # Pillow pack, trim, alpha, pivot, atlas
│   ├── validators/                # geometry/frame/atlas validation
│   └── _external/                 # gitignore or external manifest
├── public/assets/
│   ├── enemies/
│   ├── heroes/
│   ├── bosses/
│   ├── effects/
│   ├── ui/
│   └── audio/
├── src/
│   ├── core/                      # game loop, timing, RNG
│   ├── entities/                  # player, enemy, projectile
│   ├── systems/                   # movement, collision, attack, damage, xp
│   ├── rendering/                 # atlas/GLB loading, animation state
│   ├── data/                      # enemy, weapon, wave definitions
│   └── ui/                        # HUD, inventory, pause, game over
├── tests/
│   ├── unit/
│   ├── gameplay/
│   ├── assets/
│   └── e2e/
├── docs/
│   ├── GAME_DESIGN.md
│   ├── ARCHITECTURE.md
│   ├── ART_DIRECTION.md
│   ├── ASSET_PIPELINE.md
│   └── QA_CHECKLIST.md
└── package.json
```

Điều chỉnh `src/` và `public/` theo cấu trúc code thực tế; không đập bỏ source đã ổn định.

## 5. Quy chuẩn Blender & render pixel art

- Một asset có một `asset-spec.json`/YAML, một nguồn `.blend`, một entry Python builder có thể chạy lại.
- Mesh, armature, action, material phải có tên ổn định theo prefix asset.
- Render cố định: một camera rig được tái sử dụng, góc chiếu top-down 3/4, orthographic scale đã khóa, ánh sáng/key/fill ổn định, transparent background.
- Với game 2D/2.5D: export các hướng N, NE, E, SE, S, SW, W, NW và các action cần thiết. `64x64` cho slime, `96x96` hero, `192x192` boss là **giá trị gợi ý**, phải xét phạm vi hình thực tế và tránh cắt mất phần kỹ năng.
- FPS chuyển động nên khai báo per-animation, không buộc tất cả 8/12 FPS. Giữ animation events (đòn đánh gây sát thương tại frame nào) tách khỏi tốc độ chuyển động nhân vật.
- Mỗi ảnh có alpha đúng, không mờ/nền bẩn, nearest-neighbor, palette chung, pivot chân/groundpoint không trôi theo thời gian.
- Lưu `frames[].rect`, `frames[].anchor` và `frames[].duration`; nếu trim atlas thì phải có `sourceSize`/`spriteSourceSize` hoặc trường tương đương để dựng đúng tại runtime.
- Nếu dùng 3D thật, export `.glb` cùng animation + quy chuẩn model origin, kích thước thế giới, collision mesh và LOD. Không giả vờ PNG spritesheet là thay thế tương đương GLB.

## 6. Checklist kiểm thử tự động

- Lệnh tạo asset chạy sạch từ empty Blender scene, có exit code !=0 khi thất bại.
- Metadata khớp số frame và kích thước ảnh; không frame trống, không alpha bẩn hoặc crop mất bộ phận.
- Frame trong cùng action giữ một anchor theo mặt đất; không có chân/đầu/vũ khí đổi nhận diện một cách bất thường.
- Preview contact sheet phải đủ 8 hướng; animated GIF/WebP để kiểm tra loop, không có giật tư thế giữa frame cuối và đầu.
- `hit`, `death` không loop nếu game design yêu cầu one-shot; hitbox/hurtbox nằm trong gameplay data, không suy ra trực tiếp từ vùng alpha spritesheet.
- Load atlas trong engine trên browser, test idle/run/hit/death, chạm quái nhận sát thương, i-frame chặn hit liên tiếp, ngọc XP nhặt được, boss spawn đúng wave.
- Kiểm tra 60 FPS mục tiêu trên desktop tầm trung và hiệu năng khi có nhiều entity; ghi log frame time, draw calls/batching, texture memory, entity count. Không khẳng định FPS khi chưa đo.
- Mỗi lần thay asset cần giữ source `.blend`, script builder, spec, preview và report QA.

## 7. Chạy pipeline Blender Python chuẩn

Thí dụ cú pháp headless (đường dẫn Blender phải có trong PATH):

```powershell
blender --background --factory-startup --python-exit-code 1 --python tools/blender/create_slime.py
```

`create_slime.py` là file **sẽ tạo** trong nhiệm vụ đầu, không phải file có sẵn.

Phân chia 2 tiến trình:

1. `blender.exe` + `bpy`: tạo model/material/rig/action/camera và render từng PNG + manifest.
2. Python venv thông thường + Pillow: pixelation, quantization, crop/pad, pack atlas, render preview, JSON QC.

Không `pip install Pillow` vào Python Blender nếu có thể tránh. Dùng local virtual env cho tool ảnh.

## 8. Milestone phát triển

**M0 — Audit**: đánh giá game đang có, xác nhận engine 2D hay 3D, GPU/VRAM, Blender version, cấu trúc, rủi ro license, tạo kế hoạch thay đổi không phá source.

**M1 — Toolchain**: MCP kết nối, headless Python chạy, sample cube/slime tạo file `.blend` + PNG, tests đi qua.

**M2 — Art Direction**: style guide cho Anime Survivor, bảng màu, camera, vật liệu, contrast, silhouette, preview hero/slime; chủ dự án duyệt style.

**M3 — Vertical Slice Asset**: Slime Hắc Ám 4/8 hướng, idle/move/hit/death, JSON atlas, PNG previews và nhập game thành công.

**M4 — Gameplay Slice**: player movement chuẩn hóa chéo, quái đuổi, auto-target, damage/i-frames, XP, vũ khí; test deterministic.

**M5 — Content System**: data-driven quái và boss (hành vi, animation, spawn, stats), kỹ năng, FX, âm thanh; chấp nhận 1–2 asset/batch.

**M6 — Polish/Release**: UI, save/load, menu, balance, performance, automated tests, license audit, web deploy.

## 9. Prompt điều phối đầu tiên cho Antigravity

> Bạn là Technical Director cho Anime Survivor. Hãy đọc blueprint này, audit repo hiện có, xác nhận framework và định dạng đồ họa thực sự; không tự chuyển engine. Thiết lập một Blender MCP đáng tin cậy, Blender `bpy` headless, game-development & blender-tooling skills theo danh sách đã chọn. Trước mọi clone/install, kiểm tra upstream, license, script và dependency; chỉ bật một Blender MCP; không gọi API trả phí. Tạo art pipeline deterministic có spec → bpy scene `.blend` → animations → PNG/GLB → spritesheet/atlas JSON → visual preview → test. Triển khai **một Slime Hắc Ám** từ đầu đến khi chạy trong game; cung cấp báo cáo cấu trúc asset, ảnh minh họa, kiểm thử và các điểm cần chủ dự án duyệt. Sau vertical slice mới mở rộng hàng loạt. Giữ source sạch, chia module nhỏ, không để một file ôm toàn bộ logic. Nếu gặp hạn chế GPU, chuyển sang modeling `bpy` procedural, không tự tải TripoSG/weights. Kiểm tra game hiện tại trước khi xóa hoặc thay đổi bất kỳ file nào.

## 10. Bảo mật và chi phí

- MCP có quyền chạy code Python trong Blender, có thể đọc/ghi filesystem theo quyền người dùng. Chỉ mở với localhost, chạy trong dự án tin cậy và tắt bridge khi không dùng; backup trước các script chỉnh sửa hàng loạt.
- Không chạy trực tiếp PowerShell `irm ... | iex` của repo chưa review; ưu tiên `winget`/package manager hoặc manual install đã kiểm tra. Chạy `--dry-run` của skill installer trước.
- Các repo có code MIT không đồng nghĩa mọi asset hoặc model AI tạo ra đều có quyền thương mại. Ghi nguồn và giấy phép vào asset manifest. Không bê tài sản mẫu của Phaser vào game.
- TripoSG đường local tiêu tốn GPU/VRAM đáng kể; `Pseudo-Pixel` có đường xử lý từ mesh có sẵn nên thử chức năng đó trước.
- Các API dịch vụ 3D/ảnh/video/cloud của Blender MCP, Agent Sprite Forge, PixelLab, Meshy, Tripo v.v. có thể tính phí. Chế độ dự án mặc định: **OFF**.

## 11. Tài liệu gốc

- Antigravity Agent Skills (official): https://antigravity.google/docs/skills?app=antigravity-ide
- Blender MCP: https://github.com/ahujasid/mcp-for-blender
- Blender Expert Skills: https://github.com/edemaistre/blender-expert-skills
- Pseudo-Pixel: https://github.com/craigrusselltiu/pseudo-pixel
- SpriteSheetMaker: https://github.com/ManasMakde/SpriteSheetMaker
- Agent Sprite Forge: https://github.com/0x0funky/agent-sprite-forge
- SpriteKiln: https://github.com/LucasJRamos/spritekiln
- Skills Gamedev: https://github.com/poorvith-mp/skills-gamedev
- Agentic Awesome Skills: https://github.com/sickn33/agentic-awesome-skills
- Playwright MCP: https://github.com/microsoft/playwright/blob/main/docs/src/getting-started-mcp.md
