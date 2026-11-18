import type { PlayerState } from './combat';
import type { HeroId } from './heroes';
import { MAX_PHANTOM_DASH_LEVEL } from './phantomDash';
import { canUpgradeWeapon, upgradeWeapon, type WeaponId, type WeaponInventory } from './weapons';

export type PassiveId = 'stat_max_hp' | 'stat_damage_reduction' | 'stat_damage' | 'stat_cooldown' | 'stat_move_speed' | 'stat_magnet' | 'stat_heavy_strike';
export type UpgradeId = 'skill_phantom_dash' | 'weapon_orb' | 'weapon_slash' | 'weapon_orbital' | 'weapon_mine' | 'weapon_dual_slash' | PassiveId;
export const MAX_PASSIVE_LEVEL = 5;

export type PassiveStats = {
  levels: Record<PassiveId, number>;
  damageReduction: number;
  damageBonus: number;
  cooldownReductionMs: number;
  moveSpeedBonusPxSec: number;
  pickupRadiusBonusPx: number;
  heavyStrikeEvery: number;
  heavyStrikeBonus: number;
  attackCounter: number;
  phantomDashLevel: number;
};

export type UpgradeChoice = { id: UpgradeId; title: string; description: string; icon: string; category: 'weapon' | 'passive'; nextLevel?: number };
export type UpgradeRollContext = { playerLevel?: number; hpRatio?: number; heroId?: HeroId };

const DUAL_SLASH_DESCS = [
  'Unleash Ice wave (Slow, 1 pierce).',
  'Unlock Ice + Dark Fire combo (2 pierce, +12% size, +knockback).',
  '+Damage, 3 pierce, +24% size, stronger Slow & Burn.',
  '+Damage, 4 pierce, +36% size, faster cooldown.',
  'Unleash giant Dual X Wave (8 pierce, max Slow & Burn).',
] as const;

const PHANTOM_DASH_DESCS = [
  'Auto-dash through 1 nearest foe (45 dmg, 7.0s CD).',
  '60 dmg, 2 pierce, longer dash reach, 6.0s CD.',
  'Dash 2x consecutively! 75 dmg, 3 pierce, 5.2s CD.',
  '95 dmg, 4 pierce, wider reach, 4.4s CD.',
  'Dash 3x consecutively! 115 dmg, 4 pierce, 3.6s CD.',
] as const;

const WEAPON_UPGRADE_META: ReadonlyArray<{
  upgradeId: 'weapon_orb' | 'weapon_slash' | 'weapon_orbital' | 'weapon_mine' | 'weapon_dual_slash';
  weaponId: WeaponId;
  heroOnly: HeroId;
  icon: string;
  title: string;
  unlockDesc: string;
  levelDesc: string;
}> = [
  { upgradeId: 'weapon_orb', weaponId: 'orb', heroOnly: 'naruto', icon: 'icon-weapon_orb', title: 'Rasengan Chakra Orb', unlockDesc: 'Unlock auto-homing chakra orb.', levelDesc: '+9 Damage, faster cooldown & flight, extra orbs at Lv3/Lv5.' },
  { upgradeId: 'weapon_dual_slash', weaponId: 'dual_slash', heroOnly: 'kirito', icon: 'icon-weapon_slash', title: 'Dual Element Slash', unlockDesc: DUAL_SLASH_DESCS[0], levelDesc: DUAL_SLASH_DESCS[1] },
  { upgradeId: 'weapon_slash', weaponId: 'slash', heroOnly: 'naruto', icon: 'icon-weapon_slash', title: 'Taijutsu Fist Combo', unlockDesc: 'Strike nearby foes with an empty-handed chakra punch.', levelDesc: '+14 Damage, wider reach, two-sided punches at Lv4.' },
  { upgradeId: 'weapon_orbital', weaponId: 'orbital', heroOnly: 'naruto', icon: 'icon-weapon_orbital', title: 'Shadow Shuriken Ring', unlockDesc: 'Summon orbiting shadow shuriken that slice nearby foes.', levelDesc: '+7 Damage, faster spin, extra blades at Lv3/Lv5.' },
  { upgradeId: 'weapon_mine', weaponId: 'mine', heroOnly: 'naruto', icon: 'icon-weapon_mine', title: 'Paper Bomb Tag', unlockDesc: 'Drop explosive shinobi tags behind you for blazing AOE blasts.', levelDesc: '+18 Blast Damage, wider radius, double drop at Lv4.' },
];

const HEAVY_EVERY = [6, 5, 5, 4, 3] as const;
const PASSIVE_META: Record<PassiveId, { title: string; icon: string; values: readonly number[]; fmt: (v: number, lv: number) => string }> = {
  stat_max_hp: { title: 'Increase Max HP', icon: 'icon-stat_max_hp', values: [25, 25, 30, 35, 45], fmt: (v) => `+${v} Max HP & heal ${v} HP immediately.` },
  stat_damage_reduction: { title: 'Reduce Damage Taken', icon: 'icon-stat_max_hp', values: [2, 3, 3, 4, 6], fmt: (v) => `-${v} incoming damage (min 2 Dmg).` },
  stat_damage: { title: 'Increase Damage', icon: 'icon-stat_damage', values: [5, 6, 7, 8, 10], fmt: (v) => `+${v} flat damage to all equipped weapons.` },
  stat_cooldown: { title: 'Reduce Cooldown', icon: 'icon-stat_cooldown', values: [35, 40, 45, 55, 75], fmt: (v) => `-${v}ms weapon cooldown (min 180ms floor).` },
  stat_move_speed: { title: 'Increase Move Speed', icon: 'icon-stat_move_speed', values: [24, 22, 20, 18, 16], fmt: (v) => `+${v} px/s move speed and +12px magnet radius.` },
  stat_magnet: { title: 'Increase Magnet Range', icon: 'icon-stat_magnet', values: [35, 40, 45, 55, 75], fmt: (v) => `+${v}px pickup magnet radius.` },
  stat_heavy_strike: { title: 'Increase Heavy Strike', icon: 'icon-stat_crit', values: [30, 50, 75, 105, 145], fmt: (v, lv) => `Every ${HEAVY_EVERY[lv - 1]}th hit deals +${v} heavy damage.` },
};
const PASSIVE_IDS = Object.keys(PASSIVE_META) as PassiveId[];

export function createPassiveStats(): PassiveStats {
  return {
    levels: { stat_max_hp: 0, stat_damage_reduction: 0, stat_damage: 0, stat_cooldown: 0, stat_move_speed: 0, stat_magnet: 0, stat_heavy_strike: 0 },
    damageReduction: 0, damageBonus: 0, cooldownReductionMs: 0, moveSpeedBonusPxSec: 0,
    pickupRadiusBonusPx: 0, heavyStrikeEvery: 0, heavyStrikeBonus: 0, attackCounter: 0, phantomDashLevel: 0,
  };
}

export function getAvailableUpgrades(
  inventory: WeaponInventory,
  passives: PassiveStats = createPassiveStats(),
  heroId: HeroId = 'naruto'
): UpgradeChoice[] {
  const choices: UpgradeChoice[] = [];
  if (heroId === 'kirito' && passives.phantomDashLevel < MAX_PHANTOM_DASH_LEVEL) {
    const nextLevel = passives.phantomDashLevel + 1;
    choices.push({ id: 'skill_phantom_dash', title: `Phantom Dash Lv.${nextLevel}`, description: PHANTOM_DASH_DESCS[nextLevel - 1]!, icon: 'icon-weapon_slash', category: 'weapon', nextLevel });
  }
  for (const meta of WEAPON_UPGRADE_META) {
    if (meta.heroOnly !== heroId && inventory[meta.weaponId] === 0) continue;
    if (!canUpgradeWeapon(inventory, meta.weaponId)) continue;
    const nextLevel = inventory[meta.weaponId] + 1;
    const description = meta.weaponId === 'dual_slash' ? DUAL_SLASH_DESCS[nextLevel - 1]! : nextLevel === 1 ? meta.unlockDesc : meta.levelDesc;
    choices.push({ id: meta.upgradeId, title: `${meta.title} Lv.${nextLevel}`, description, icon: meta.icon, category: 'weapon', nextLevel });
  }
  for (const id of PASSIVE_IDS) {
    const lv = passives.levels[id];
    if (lv >= MAX_PASSIVE_LEVEL) continue;
    const nextLevel = lv + 1, meta = PASSIVE_META[id];
    choices.push({ id, title: `${meta.title} Lv.${nextLevel}`, description: meta.fmt(meta.values[lv]!, nextLevel), icon: meta.icon, category: 'passive', nextLevel });
  }
  return choices;
}

function choiceWeight(choice: UpgradeChoice, ownedWeapons: number, hpRatio: number): number {
  if (choice.category === 'weapon') {
    const current = (choice.nextLevel ?? 1) - 1;
    if (current === 4) return 4;
    return current > 0 || ownedWeapons < 2 ? 3 : 1;
  }
  return hpRatio <= 0.4 && (choice.id === 'stat_max_hp' || choice.id === 'stat_damage_reduction') ? 4 : 2;
}

function drawWeighted(pool: UpgradeChoice[], weights: number[], rng: () => number): UpgradeChoice | null {
  let total = 0;
  for (const w of weights) total += w;
  if (pool.length === 0 || total <= 0) return null;
  const raw = rng();
  const r = (Number.isFinite(raw) ? Math.max(0, Math.min(0.999999, raw)) : 0) * total;
  let acc = 0;
  for (let i = 0; i < pool.length; i++) {
    acc += weights[i]!;
    if (r < acc) { weights.splice(i, 1); return pool.splice(i, 1)[0]!; }
  }
  weights.pop();
  return pool.pop() ?? null;
}

export function rollUpgradeChoices(
  inventory: WeaponInventory,
  passives: PassiveStats = createPassiveStats(),
  ctx: UpgradeRollContext = {},
  maxChoices = 3,
  rng: () => number = Math.random
): UpgradeChoice[] {
  const pool = getAvailableUpgrades(inventory, passives, ctx.heroId ?? 'naruto');
  const owned = Object.values(inventory).filter((lv) => lv > 0).length + (passives.phantomDashLevel > 0 ? 1 : 0);
  const hpRatio = ctx.hpRatio ?? 1;
  const weapons: UpgradeChoice[] = [], weaponW: number[] = [];
  const stats: UpgradeChoice[] = [], statW: number[] = [];
  for (const c of pool) {
    const w = choiceWeight(c, owned, hpRatio);
    if (c.category === 'weapon') { weapons.push(c); weaponW.push(w); }
    else { stats.push(c); statW.push(w); }
  }
  const slots: Array<'weapon' | 'passive' | 'flex'> = (ctx.playerLevel ?? 5) <= 4 ? ['weapon', 'weapon', 'passive'] : ['weapon', 'passive', 'flex'];
  const picked: UpgradeChoice[] = [];
  for (const slot of slots.slice(0, maxChoices)) {
    let next: UpgradeChoice | null = null;
    if (slot === 'weapon') next = drawWeighted(weapons, weaponW, rng) ?? drawWeighted(stats, statW, rng);
    else if (slot === 'passive') next = drawWeighted(stats, statW, rng) ?? drawWeighted(weapons, weaponW, rng);
    else {
      const merged = [...weapons, ...stats], mergedW = [...weaponW, ...statW];
      next = drawWeighted(merged, mergedW, rng);
      if (next) {
        const wi = weapons.indexOf(next);
        if (wi >= 0) { weapons.splice(wi, 1); weaponW.splice(wi, 1); }
        else { const si = stats.indexOf(next); if (si >= 0) { stats.splice(si, 1); statW.splice(si, 1); } }
      }
    }
    if (next) picked.push(next);
  }
  return picked;
}

function isPassiveId(id: UpgradeId): id is PassiveId { return Object.prototype.hasOwnProperty.call(PASSIVE_META, id); }

export function applyUpgradeChoice(choiceId: UpgradeId, inventory: WeaponInventory, player: PlayerState, passives: PassiveStats): void {
  const weaponMeta = WEAPON_UPGRADE_META.find((m) => m.upgradeId === choiceId);
  if (weaponMeta) { upgradeWeapon(inventory, weaponMeta.weaponId); return; }
  if (choiceId === 'skill_phantom_dash') {
    if (passives.phantomDashLevel >= MAX_PHANTOM_DASH_LEVEL) throw new Error('Phantom Dash is already at max level');
    passives.phantomDashLevel += 1; return;
  }
  if (!isPassiveId(choiceId)) throw new Error(`Unknown upgrade ${choiceId}`);
  const lv = passives.levels[choiceId];
  if (lv >= MAX_PASSIVE_LEVEL) throw new Error(`Cannot upgrade passive ${choiceId} from level ${lv}`);
  const val = PASSIVE_META[choiceId].values[lv]!;
  passives.levels[choiceId] = lv + 1;
  if (choiceId === 'stat_max_hp') { player.maxHp += val; player.hp = Math.min(player.maxHp, player.hp + val); return; }
  if (choiceId === 'stat_damage_reduction') { passives.damageReduction += val; return; }
  if (choiceId === 'stat_damage') { passives.damageBonus += val; return; }
  if (choiceId === 'stat_cooldown') { passives.cooldownReductionMs += val; return; }
  if (choiceId === 'stat_move_speed') { passives.moveSpeedBonusPxSec += val; passives.pickupRadiusBonusPx += 12; return; }
  if (choiceId === 'stat_magnet') { passives.pickupRadiusBonusPx += val; return; }
  passives.heavyStrikeEvery = HEAVY_EVERY[lv]!;
  passives.heavyStrikeBonus = val;
}

export function rollCombatDamage(baseDamage: number, passives: PassiveStats): { damage: number; critical: boolean } {
  passives.attackCounter += 1;
  const heavy = passives.heavyStrikeEvery > 0 && passives.attackCounter % passives.heavyStrikeEvery === 0;
  const damage = Math.max(1, baseDamage + passives.damageBonus + (heavy ? passives.heavyStrikeBonus : 0));
  return { damage, critical: heavy };
}
