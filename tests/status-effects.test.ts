import { describe, expect, it } from 'vitest';
import {
  applyBurnStatus,
  applySlowStatus,
  computeEffectiveEnemySpeed,
  createEnemyStatusState,
  getDualSlashStatusConfig,
  MIN_SLOW_SPEED_PX_SEC,
  stepEnemyStatus,
} from '../src/domain/statusEffects';

describe('dual element status effects (Slow & Burn)', () => {
  it('applies Slow without immobilizing enemies below minimum floor speed', () => {
    const status = createEnemyStatusState();
    applySlowStatus(status, 55, 2500, 1000);

    expect(computeEffectiveEnemySpeed(120, status, 1500)).toBe(65);
    // Slow never immobilizes even weak/slow enemies
    expect(computeEffectiveEnemySpeed(50, status, 1500)).toBe(MIN_SLOW_SPEED_PX_SEC);

    const activeStep = stepEnemyStatus(status, 2000);
    expect(activeStep).toMatchObject({ slowActive: true, slowExpired: false, burnActive: false, burnDamage: 0 });

    const expiredStep = stepEnemyStatus(status, 3500);
    expect(expiredStep).toMatchObject({ slowActive: false, slowExpired: true });
    expect(computeEffectiveEnemySpeed(120, status, 3500)).toBe(120);

    // Expiry flag fires once per status expiration
    expect(stepEnemyStatus(status, 3600).slowExpired).toBe(false);
  });

  it('applies Burn DoT on 500ms ticks and allows Slow + Burn coexistence without cancelling either', () => {
    const status = createEnemyStatusState();
    applySlowStatus(status, 50, 2200, 1000);
    applyBurnStatus(status, 14, 2100, 1100);

    // Neither cancels the other
    expect(computeEffectiveEnemySpeed(140, status, 1200)).toBe(90);

    // Before first 500ms tick
    expect(stepEnemyStatus(status, 1550)).toMatchObject({ slowActive: true, burnActive: true, burnDamage: 0 });
    // First 500ms tick at 1600ms
    expect(stepEnemyStatus(status, 1650)).toMatchObject({ slowActive: true, burnActive: true, burnDamage: 14 });
    // Reapplying Burn extends duration without resetting next tick or double-bursting
    applyBurnStatus(status, 16, 2500, 1800);
    expect(stepEnemyStatus(status, 2050).burnDamage).toBe(0);
    expect(stepEnemyStatus(status, 2150).burnDamage).toBe(16);

    // Slow expires at 3200ms while Burn keeps ticking until 4300ms
    const afterSlow = stepEnemyStatus(status, 3250);
    expect(afterSlow.slowExpired).toBe(true);
    expect(afterSlow.burnActive).toBe(true);
    expect(afterSlow.burnExpired).toBe(false);

    // Burn expires after 4300ms
    const afterBurn = stepEnemyStatus(status, 4350);
    expect(afterBurn.burnActive).toBe(false);
    expect(afterBurn.burnExpired).toBe(true);
    expect(stepEnemyStatus(status, 4500).burnExpired).toBe(false);
  });

  it('provides runtime status configs cleanly decoupled from art metadata', () => {
    const lv1 = getDualSlashStatusConfig(1);
    const lv3 = getDualSlashStatusConfig(3);
    const lv5 = getDualSlashStatusConfig(5);
    expect(lv1.slowReductionPxSec).toBeGreaterThan(0);
    expect(lv3.burnDamagePerTick).toBeGreaterThan(0);
    expect(lv5.slowDurationMs).toBeGreaterThanOrEqual(lv1.slowDurationMs);
    expect(lv5.burnDamagePerTick).toBeGreaterThanOrEqual(lv3.burnDamagePerTick);
  });
});
