/** Grow into the existing size cap; keep the last40% for fading. */
export function damagePopupScale(progress:number):number {
  const growth=Math.min(1,Math.max(0,progress)/0.3);
  return 0.72+0.28*(1-(1-growth)**3);
}
export function damagePopupAlpha(progress:number):number {
  return Math.min(1,Math.max(0,(1-progress)/0.4));
}
