import Phaser from 'phaser';
import type { HudStateDto } from './HudState';
import type { HudChrome } from './HudChrome';
import { hudLayout } from './layout';

export class HudGauges {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly hpPip: Phaser.GameObjects.Image;
  private readonly xpPip: Phaser.GameObjects.Image;
  private readonly crowns: Phaser.GameObjects.Image[];
  private readonly layout: ReturnType<typeof hudLayout>;
  constructor(scene: Phaser.Scene,private readonly chrome: HudChrome,depth: number) {
    this.layout = hudLayout(scene.scale.width,scene.scale.height);
    this.graphics = scene.add.graphics().setScrollFactor(0).setDepth(depth);
    this.hpPip = scene.add.image(0,0,'hud_pip_glow','content').setDisplaySize(18,26).setTint(0x8dffbd);
    this.xpPip = scene.add.image(0,0,'hud_pip_glow','content').setDisplaySize(14,20);
    this.crowns = [0,1].map(()=>scene.add.image(0,0,'icon_boss_crown','content').setDisplaySize(36,36).setVisible(false));
    for (const image of [this.hpPip,this.xpPip,...this.crowns]) image.setScrollFactor(0).setDepth(depth+1);
    this.hpPip.setData('hud-hp-pip',true);this.xpPip.setData('hud-xp-pip',true);
    this.crowns.forEach(c=>c.setData('hud-boss-crown',true));
  }

  draw(dto: HudStateDto,reqXp: number): void {
    this.graphics.clear();this.chrome.begin();
    const l = this.layout;
    const xp = Phaser.Math.Clamp(dto.progression.xp/reqXp,0,1);
    const hp = Phaser.Math.Clamp(dto.player.hp/Math.max(1,dto.player.maxHp),0,1);
    this.bar(l.xp,xp,0x15c9ed,0x8b5cf6);
    this.bar(l.hp,hp,hp>0.5?0x29d283:hp>0.25?0xf6b339:0xf43f5e,0xc3deed);
    this.xpPip.setPosition(l.xp.x+2+(l.xp.w-4)*xp,l.xp.y+l.xp.h/2).setVisible(xp>0);
    this.hpPip.setPosition(l.hp.x+2+(l.hp.w-4)*hp,l.hp.y+l.hp.h/2).setVisible(hp>0);
    const boss = dto.bossHp;
    this.crowns.forEach(c=>c.setVisible(Boolean(boss && boss.hp>0)));
    if (boss && boss.hp>0) {
      const ratio = Phaser.Math.Clamp(boss.hp/Math.max(1,boss.maxHp),0,1);
      this.bar(l.boss,ratio,ratio<=0.5?0xd946ef:0xe11d48,0xfda4af);
      this.crowns[0]!.setPosition(l.boss.x-18,l.boss.y+l.boss.h/2);
      this.crowns[1]!.setPosition(l.boss.x+l.boss.w+18,l.boss.y+l.boss.h/2).setFlipX(true);
    }
  }

  private bar(rect:{x:number;y:number;w:number;h:number},ratio:number,color:number,border:number): void {
    const {x,y,w,h}=rect;
    this.chrome.panel(x,y,w,h,0x10172f,border);
    const fill = Math.round((w-4)*ratio);
    if (!fill) return;
    this.graphics.fillStyle(color).fillRect(x+2,y+2,fill,h-4);
    this.graphics.fillStyle(0xffffff,0.4).fillRect(x+2,y+2,fill,Math.max(1,(h-4)*0.22));
    this.graphics.fillStyle(0x080d22,0.3).fillRect(x+2,y+h-5,fill,3);
  }
  destroy(): void { this.graphics.destroy();this.hpPip.destroy();this.xpPip.destroy();this.crowns.forEach(c=>c.destroy()); }
}
