import { preloadDashAssets, registerDashAnimations } from '../config/phantomDashAssets';
import { preloadActorClips, registerActorClips } from '../config/actorClips';
import Phaser from 'phaser';
import { AI_ART_KEYS, ART_FRAMES } from '../config/artDisplay';
import { preloadDualElementAssets, registerDualElementAnimations } from '../config/dualElementAssets';

const SHEETS: ReadonlyArray<[string, number, number]> = [
  ['hero', 32, 32],
  ...['enemy_attack', 'enemy_shade_attack', 'player_skill_hit']
    .map((key): [string, number, number] => [key, 256, 256]),
  ['slam_wave', 384, 384], ['shade_claw', 384, 384],
  ['hero_locomotion', 1536, 1536],
  ['enemy', 64, 64],
  ['enemy_shade', 64, 64],
  ['enemy_mage', 64, 64],
  ['boss', 128, 128],
  ['enemy_elite', 96, 96],
  ['aura_ring', 96, 56], ['aura_contact', 96, 56],
  ['aura_outer', 192, 192], ['aura_accent', 128, 96],
  ['rasengan', 1536, 1536],
  ['hero_actions', 1536, 1536],
  ['punch', 56, 56],
  ['shuriken', 56, 56],
  ['mine', 56, 56],
  ['explosion', 56, 56],
  ['enemy_bolt', 56, 56],
  ['gem', 64, 64],
  ['heal_pickup', 64, 64],
  ['tree', 40, 48],
  ['torii_gate', 48, 48],
  ['shrine_plaza', 64, 64],
  ['shrine_lantern', 24, 32],
  ['spirit_flower', 16, 16],
  ['vfx_hit', 32, 32],
  ['vfx_death', 56, 56],
  ['vfx_levelup', 56, 64],
  ['vfx_telegraph', 96, 64],
];

const UI_ART = ['ui_card_base','ui_emblem_socket','ui_banner_levelup','hud_pip_glow','icon_boss_crown'] as const;
const LOBBY_ART = ['lobby_background','lobby_hero','lobby_pedestal','lobby_lock','lobby_start_button'] as const;

const ICONS: readonly string[] = [
  'weapon_orb', 'weapon_slash', 'weapon_orbital', 'weapon_mine',
  'stat_max_hp', 'stat_move_speed', 'stat_damage', 'stat_cooldown', 'stat_magnet', 'stat_crit',
];

const ANIMS: ReadonlyArray<[string, string, number, number, number, number]> = [
  ['player-skill-impact', 'player_skill_hit', 0, 5, 24, 0],
  ['hero-idle', 'hero', 0, 3, 5, -1],
  ['hero-walk', 'hero', 4, 7, 10, -1],
  ['hero-walk-down', 'hero', 8, 9, 8, -1],
  ['hero-idle-up', 'hero', 10, 10, 5, -1],
  ['hero-walk-up', 'hero', 11, 12, 8, -1],
  ['hero-idle-side', 'hero', 13, 13, 5, -1],
  ['hero-skill-orb', 'hero', 14, 15, 10, 0],
  ['hero-skill-slash', 'hero', 16, 17, 10, 0],
  ['hero-skill-clone', 'hero', 16, 17, 10, 0],
  ['hero-skill-orbital', 'hero', 18, 19, 10, 0],
  ['hero-skill-mine', 'hero', 20, 21, 10, 0],
  ['naruto-action-orb', 'hero_actions', 0, 1, 10, 0],
  ['naruto-action-slash', 'hero_actions', 2, 3, 10, 0],
  ['naruto-action-clone', 'hero_actions', 2, 3, 10, 0],
  ['naruto-action-orbital', 'hero_actions', 4, 5, 10, 0],
  ['naruto-action-mine', 'hero_actions', 6, 7, 10, 0],
  ['punch-hit', 'punch', 0, 1, 10, 0],
  ['enemy-walk', 'enemy', 0, 3, 6, -1],
  ['enemy-shade-walk', 'enemy_shade', 0, 3, 9, -1],
  ['enemy-mage-walk', 'enemy_mage', 0, 3, 5, -1],
  ['enemy-elite-walk', 'enemy_elite', 0, 3, 6, -1],
  ...['ring', 'outer', 'contact', 'accent'].map((layer): [string, string, number, number, number, number] =>
    [`aura-${layer}-pulse`, `aura_${layer}`, 0, 1, 8, -1]),
  ['boss-walk', 'boss', 0, 3, 5, -1],
  ['boss-blood-slash', 'boss_blood_slash', 0, 1, 12, 0],
  ['rasengan-spin', 'rasengan', 0, 1, 12, -1],
  ['rasengan-charge', 'rasengan', 2, 3, 12, 0],
  ['rasengan-hit', 'rasengan', 4, 5, 10, 0],
  ['shuriken-spin', 'shuriken', 0, 1, 14, -1],
  ['mine-pulse', 'mine', 0, 1, 6, -1],
  ['explosion-boom', 'explosion', 0, 2, 10, 0],
  ['enemy-bolt-pulse', 'enemy_bolt', 0, 1, 12, -1],
  ['gem-gleam', 'gem', 0, 3, 7, -1],
  ['heal-beat', 'heal_pickup', 0, 3, 7, -1],
  ['tree-sway', 'tree', 0, 0, 3, -1],
  ['torii-gate-sway', 'torii_gate', 0, 3, 3, -1],
  ['shrine-plaza-gleam', 'shrine_plaza', 0, 0, 2, -1],
  ['shrine-lantern-glow', 'shrine_lantern', 0, 3, 5, -1],
  ['spirit-flower-sway', 'spirit_flower', 0, 3, 4, -1],
  ['vfx-hit-burst', 'vfx_hit', 0, 4, 24, 0],
  ['vfx-death-poof', 'vfx_death', 0, 1, 10, 0],
  ['vfx-levelup-pillar', 'vfx_levelup', 0, 5, 14, 0],
  ['vfx-telegraph-charge', 'vfx_telegraph', 0, 1, 10, -1],
];

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    for (const key of UI_ART) this.load.image(key,`assets/${key}.png`);
    for (const key of LOBBY_ART) this.load.image(key,`assets/${key}.png`);
    this.load.json('ui-layout','assets/ui-layout.json');
    this.load.json('lobby-layout','assets/lobby-layout.json');
    this.load.image('damage_explosion_mark','assets/damage_explosion_mark.png');
    this.load.bitmapFont('font_damage_anime','assets/font_damage_anime.png','assets/font_damage_anime.xml');
    for (const [key, frameWidth, frameHeight] of SHEETS) {
      if (AI_ART_KEYS.has(key)) this.load.multiatlas(key, `assets/runtime/${key}/atlas.json`, `assets/runtime/${key}`);
      else this.load.spritesheet(key, `assets/${key}.png`, { frameWidth, frameHeight });
    }
    for (const key of ['shadow_actor', 'shadow_pickup']) this.load.image(key, `assets/${key}.png`);
    this.load.image('grass', 'assets/grass.png');
    this.load.image('hud_panel', 'assets/hud_panel.png');
    for (const icon of ICONS) {
      this.load.image(`icon-${icon}`, `assets/icons/${icon}.png`);
    }
    for (const cue of ['shoot', 'slash', 'hit', 'pickup', 'levelup', 'hurt']) {
      this.load.audio(`sfx-${cue}`, `assets/audio/${cue}.wav`);
    }
    preloadDualElementAssets(this);
    preloadDashAssets(this); preloadActorClips(this);
  }

  create(): void {
    registerDualElementAnimations(this);
    registerDashAnimations(this); registerActorClips(this);
    for (const layoutKey of ['ui-layout', 'lobby-layout']) {
      const frames = this.cache.json.get(layoutKey) as Record<string, { x: number; y: number; w: number; h: number }> | undefined;
      if (frames) for (const [key, box] of Object.entries(frames)) this.textures.get(key)?.add('content', 0, box.x, box.y, box.w, box.h);
    }
    for (const [key, sheet, start, end, frameRate, repeat] of ANIMS) {
      if (!this.anims.exists(key)) {
        this.anims.create({
          key,
          frames: this.anims.generateFrameNumbers(sheet, { start, end }),
          frameRate,
          repeat,
        });
      }
    }
    const enemies: ReadonlyArray<[string, string, number]> = [
      ['enemy', 'enemy-walk', 6], ['enemy_shade', 'enemy-shade-walk', 9],
      ['enemy_mage', 'enemy-mage-walk', 5], ['enemy_elite', 'enemy-elite-walk', 6], ['boss', 'boss-walk', 5],
    ];
    for (const [texture, key, frameRate] of enemies) for (const direction of ['side', 'up']) {
      const frames = ART_FRAMES[texture]?.[`walk-${direction}`];
      if (frames) this.anims.create({ key: `${key}-${direction}`,
        frames: frames.map((frame) => ({ key: texture, frame })), frameRate, repeat: -1 });
    }
    const search = typeof window !== 'undefined' ? window.location.search : '';
    const skipLobby = search.includes('play=1');
    const heroMatch = /[?&]hero=([a-z0-9_-]+)/i.exec(search);
    const heroId = heroMatch?.[1] === 'kirito' ? 'kirito' : 'naruto';
    this.scene.start(skipLobby ? 'GameScene' : 'TitleScene', skipLobby ? { heroId } : undefined);
  }
}
