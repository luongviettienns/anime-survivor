import type { PlayerState } from '../domain/combat';
import type { RunProgression } from '../domain/progression';
import { MAX_CRIT_CHANCE, type PassiveStats } from '../domain/upgrades';
import type { WeaponInventory } from '../domain/weapons';

export type HudStateDto = {
  player: PlayerState;
  progression: RunProgression;
  elapsedSec: number;
  defeated: number;
  weapons?: WeaponInventory;
  passives?: PassiveStats;
  bossHp?: { hp: number; maxHp: number; name: string } | null;
  dashLevel?: number;
  dashCooldownMs?: number;
};

export function formatPassives(stats?: PassiveStats): string {
  if (!stats) return '';
  const tags: string[] = [];
  if (stats.damageReduction > 0) tags.push(`ARM-${stats.damageReduction}`);
  if (stats.damageBonus > 0) tags.push(`DMG+${stats.damageBonus}`);
  if (stats.cooldownReductionMs > 0) tags.push(`CD-${stats.cooldownReductionMs}ms`);
  if (stats.moveSpeedBonusPxSec > 0) tags.push(`SPD+${stats.moveSpeedBonusPxSec}`);
  if (stats.recoveryPer3Sec > 0) tags.push(`REC+${stats.recoveryPer3Sec}/3s`);
  if (stats.critChance > 0) tags.push(`CRIT+${Math.round(Math.min(MAX_CRIT_CHANCE, stats.critChance) * 100)}%`);
  return tags.join(' ');
}
