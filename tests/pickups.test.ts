import { describe, expect, it } from 'vitest';
import { applyContactDamage, createPlayerState } from '../src/domain/combat';
import { collectPickup, createPickupState } from '../src/domain/pickups';
import { createProgression } from '../src/domain/progression';

describe('pickup collection and progression rules', () => {
  it('collects XP gem once, queues multiple levels, and does NOT heal HP on level-up', () => {
    const player = createPlayerState(100);
    applyContactDamage(player, 30, 0, 800);
    expect(player.hp).toBe(70);

    const progression = createProgression();
    const gem = createPickupState(1, 'xp', 12, 100, 100);

    const first = collectPickup(gem, player, progression);
    expect(first.collected).toBe(true);
    expect(first.levelsGained).toBe(2);
    expect(progression.level).toBe(3);
    expect(progression.xp).toBe(0);
    expect(progression.pendingUpgrades).toBe(2);
    // HP must remain 70 (no automatic heal on level-up)
    expect(player.hp).toBe(70);
    expect(gem.state).toBe('collected');

    // Duplicate collection attempt on same gem is rejected
    const duplicate = collectPickup(gem, player, progression);
    expect(duplicate.collected).toBe(false);
    expect(progression.level).toBe(3);
    expect(progression.pendingUpgrades).toBe(2);
  });

  it('collects heal pickup once, clamps HP at maxHp, and preserves i-frames', () => {
    const player = createPlayerState(100);
    applyContactDamage(player, 10, 50, 800);
    expect(player.hp).toBe(90);
    expect(player.invulnerableUntilMs).toBe(850);

    const progression = createProgression();
    const heal1 = createPickupState(2, 'heal', 25, 120, 120);

    const res1 = collectPickup(heal1, player, progression);
    expect(res1).toEqual({
      collected: true,
      type: 'heal',
      levelsGained: 0,
      hpBefore: 90,
      hpAfter: 100,
    });
    expect(player.hp).toBe(100);
    // Healing does NOT reset or cancel i-frames
    expect(player.invulnerableUntilMs).toBe(850);

    // Collecting heal when already at full HP still consumes the pickup once
    const healFull = createPickupState(3, 'heal', 25, 140, 140);
    const res2 = collectPickup(healFull, player, progression);
    expect(res2.collected).toBe(true);
    expect(player.hp).toBe(100);
    expect(healFull.state).toBe('collected');
    expect(collectPickup(healFull, player, progression).collected).toBe(false);
  });

  it('rejects pickup collection when player is dead', () => {
    const player = createPlayerState(10);
    applyContactDamage(player, 10, 0, 800);
    expect(player.alive).toBe(false);

    const progression = createProgression();
    const gem = createPickupState(4, 'xp', 5, 50, 50);
    expect(collectPickup(gem, player, progression).collected).toBe(false);
    expect(gem.state).toBe('ground');
  });
});
