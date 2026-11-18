import { expect, test } from 'vitest';
import { damagePopupAlpha, damagePopupScale } from '../src/domain/damagePopup';

test('damage grows from small to its size cap and never shrinks or overshoots',()=>{
  const samples=[-1,0,0.05,0.15,0.3,0.6,0.9,1,2].map(damagePopupScale);
  expect(samples[1]).toBeCloseTo(0.72);
  expect(damagePopupScale(0.3)).toBe(1);
  for(let i=1;i<samples.length;i++){
    expect(samples[i]!).toBeGreaterThanOrEqual(samples[i-1]!);
    expect(samples[i]!).toBeLessThanOrEqual(1);
  }
});
test('damage stays readable then fades to transparent at expiry',()=>{
  expect(damagePopupAlpha(-1)).toBe(1);
  expect(damagePopupAlpha(0.5)).toBe(1);
  expect(damagePopupAlpha(0.8)).toBeCloseTo(0.5);
  expect(damagePopupAlpha(1)).toBe(0);
  expect(damagePopupAlpha(2)).toBe(0);
  const samples=[0,0.6,0.7,0.8,0.9,1].map(damagePopupAlpha);
  for(let i=1;i<samples.length;i++)expect(samples[i]!).toBeLessThanOrEqual(samples[i-1]!);
});
