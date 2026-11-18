const catalog = [
  ['boss_blood_slash', 'cut', 'Boss - Huyet nguyet'], ['enemy_bolt', 'pulse', 'Dark projectile'],
  ['vfx_telegraph', 'charge', 'Dark spell warning'], ['vfx_death', 'poof', 'Dark spirit defeat'],
  ['enemy', 'walk', 'Oni Raider - 64px'], ['enemy_shade', 'walk', 'Shadow Stalker - 64px'],
  ['enemy_mage', 'walk', 'Occult Mage - 64px'], ['enemy_elite', 'walk', 'Oni Executioner - 96px - Purple aura'],
  ['boss', 'walk', 'Crimson Archon - 128px - Red aura'],
  ['enemy_mage', 'cast', 'Mage - Charge / Release'], ['boss', 'cast', 'Boss - Charge / Barrage'],
  ['aura_contact', 'pulse', 'Aura - Ground contact'], ['aura_ring', 'pulse', 'Aura - Core ring'],
  ['aura_outer', 'pulse', 'Aura - Outer wisps'], ['aura_accent', 'pulse', 'Aura - Accents'],
  ['hero_actions', 'orb', 'Naruto · Rasengan'], ['hero_actions', 'slash', 'Naruto · Đấm tay không'],
  ['rasengan', 'charge', 'Rasengan · Tụ chakra'], ['rasengan', 'spin', 'Rasengan · Xoáy khi bay'],
  ['rasengan', 'hit', 'Rasengan · Va chạm'], ['punch', 'hit', 'Đấm · Lực tiếp xúc'],
  ['shuriken', 'spin', 'Phi tiêu · Kim loại'], ['mine', 'pulse', 'Bùa · Ấn đỏ'],
  ['explosion', 'boom', 'Bùa · Chớp / Lửa / Khói'],
  ['rasenshuriken', 'spin', 'Rasenshuriken · Bay'], ['rasenshuriken', 'hit', 'Rasenshuriken · Bung gió'],
  ['wind_ground', 'burst', 'Sóng gió · Layer mặt đất'], ['punch_max', 'hit', 'Đấm · MAX'],
  ['shuriken_max', 'spin', 'Phi tiêu · MAX'], ['mine_max', 'pulse', 'Ấn chú · MAX'],
  ['explosion_max', 'boom', 'Bùa nổ · MAX'], ['slash_x', 'cut', 'Chém đôi · Nhân vật sau'],
];
const manifest = await fetch('/assets/sprites.manifest.json').then((r) => r.json());
const metadata = await fetch('/assets/art-review.json').then((r) => r.json());
const cache = new Map();
function asset(url) {
  if (!cache.has(url)) cache.set(url, (async () => {
    const image = new Image(); image.src = url; await image.decode(); return image;
  })());
  return cache.get(url);
}
const grass = await asset('/assets/grass.png');
const atlases = new Map();
await Promise.all([...new Set([...catalog.map(([name]) => name), ...['contact', 'ring', 'outer', 'accent'].map((s) => `aura_${s}`)])].map(async (name) => {
  const data = await fetch(`/assets/runtime/${name}/atlas.json`).then((r) => r.json());
  const pages = await Promise.all(data.textures.map(async (page) => ({
    image: await asset(`/assets/runtime/${name}/${page.image}`), frame: page.frames[0],
  })));
  atlases.set(name, pages);
}));
const cards = [];
for (const [name, animation, label] of catalog) {
  const spec = manifest.sprites[name];
  const frames = spec.frames.filter((frame) => frame.animation === animation);
  const article = document.createElement('article');
  const heading = document.createElement('h2'); heading.textContent = label;
  const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 192;
  const note = document.createElement('small');
  const source = atlases.get(name)[frames[0].sheet_index].image;
  note.textContent = `${frames.length} frame · PNG gốc ${source.width}×${source.height} · ${metadata[name].usage}`;
  const download = document.createElement('a'); download.href = `/assets/${spec.file}`; download.textContent = 'PNG spritesheet gốc';
  article.append(heading, canvas, note, download); document.querySelector('#gallery').append(article);
  cards.push({ name, animation, spec, frames, animations: Object.fromEntries(spec.frames.map((f) => [f.animation, spec.frames.filter((e) => e.animation === f.animation)])), context: canvas.getContext('2d') });
}
const tinted = new Map();
function tintedImage(page, color) {
  const key = `${page.image.src}/${color}`;
  if (!tinted.has(key)) {
    const canvas = document.createElement('canvas'); canvas.width = page.image.width; canvas.height = page.image.height;
    const ctx = canvas.getContext('2d'); ctx.drawImage(page.image, 0, 0);
    ctx.globalCompositeOperation = 'source-in'; ctx.fillStyle = color; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(page.image, 0, 0);
    ctx.globalCompositeOperation = 'destination-in'; ctx.drawImage(page.image, 0, 0);
    tinted.set(key, canvas);
  }
  return tinted.get(key);
}
function drawPage(ctx, page, x, y, scale, image = page.image) {
  const box = page.frame.spriteSourceSize;
  ctx.drawImage(image, x + box.x * scale, y + box.y * scale, page.image.width * scale, page.image.height * scale);
}
let paused = false, heldTime = 0, start = performance.now();
document.querySelector('#pause').onclick = () => {
  if (!paused) heldTime = performance.now() - start; else start = performance.now() - heldTime;
  paused = !paused;
};
function render(now) {
  const elapsed = paused ? heldTime : now - start;
  for (const card of cards) {
    const { context: ctx, spec, name } = card;
    let { frames, animation } = card;
    const monster = ['enemy', 'enemy_shade', 'enemy_mage', 'enemy_elite', 'boss'].includes(name);
    const selected = document.querySelector('#direction').value;
    const direction = selected === 'cycle' ? ['down', 'right', 'up', 'left'][Math.floor(elapsed / 1200) % 4] : selected;
    if (monster) {
      animation += direction === 'up' ? '-up' : direction === 'left' || direction === 'right' ? '-side' : '';
      frames = card.animations[animation];
    }
    ctx.imageSmoothingEnabled = false; ctx.clearRect(0, 0, 256, 192); ctx.drawImage(grass, 0, 0, 256, 256);
    const loop = ['spin', 'pulse'].includes(animation) || monster || name === 'hero_actions';
    const index = Math.min(Math.floor(elapsed / 125) % (loop ? frames.length : frames.length + 2), frames.length - 1);
    const page = atlases.get(name)[frames[index].sheet_index];
    const display = metadata[name].display_width;
    const zoom = monster && display >= 96 ? 1 : 2;
    const scale = monster || name === 'hero_actions' ? page.frame.displayScale * zoom : name === 'rasengan' ? 1 / 8 : display * (display < 96 ? 2 : 1) / 1280;
    const actor = ['enemy', 'enemy_shade', 'enemy_mage', 'enemy_elite', 'boss', 'hero_actions'].includes(name);
    const x = (256-spec.frame_width*scale)/2;
    const y = actor ? 180-(name === 'hero_actions' ? 1408 : 1536)*scale : (192-spec.frame_height*scale)/2;
    if (name === 'boss' || name === 'enemy_elite') {
      const color = name === 'boss' ? '#ff344c' : '#b84dff';
      for (const layer of ['contact', 'ring', 'outer', 'accent']) {
        const aura = atlases.get(`aura_${layer}`)[Math.floor(elapsed/125)%2];
        const factor = metadata[`aura_${layer}`].display_width/1280;
        ctx.globalAlpha = layer === 'contact' ? 0.3 : layer === 'outer' ? 0.55 : 0.8;
        drawPage(ctx, aura, 128-1024*factor, 180-(layer === 'outer' ? 1536 : 1024)*factor, factor, tintedImage(aura, color));
      }
      ctx.globalAlpha = 1;
    }
    ctx.save();
    if (monster && direction === 'left') { ctx.translate(256, 0); ctx.scale(-1, 1); }
    drawPage(ctx, page, x, y, scale);
    ctx.restore();
  }
  requestAnimationFrame(render);
}
document.querySelector('#status').textContent = 'PNG gốc: không resize, không ép palette, không sửa alpha. Artwork tiến hóa chưa kích hoạt luật hút/nổ/nâng cấp.';
window.__ART_REVIEW_READY__ = true;
requestAnimationFrame(render);
