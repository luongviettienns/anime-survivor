export function hudLayout(width: number, height: number) {
  const bossW = Math.min(640,width-200);
  return { center: width/2, right: width-16, levelX: width-60,
    xp: { x:16, y:14, w:width-140, h:10 }, hp:{ x:76,y:44,w:Math.min(228,width*0.24),h:22 },
    boss:{ x:(width-bossW)/2,y:height-48,w:bossW,h:18 } };
}
export function upgradeLayout(width: number, height: number) {
  const cardW = Math.min(288,(width-112)/3), gap = 28;
  return { cardW, cardH:Math.min(430,height-210), cardY:height/2+64, bannerY:84,
    centers:[width/2-cardW-gap,width/2,width/2+cardW+gap] as const };
}
