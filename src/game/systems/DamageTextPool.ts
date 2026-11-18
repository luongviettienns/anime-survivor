import type Phaser from 'phaser';
import { damagePopupAlpha, damagePopupScale } from '../../domain/damagePopup';

type Slot={text:Phaser.GameObjects.BitmapText;icon:Phaser.GameObjects.Image;burst:Phaser.GameObjects.Image;
  active:boolean;bornAtMs:number;lifeMs:number;startY:number;critical:boolean;explosive:boolean};
const POOL_SIZE=24;

export class DamageTextPool {
  private readonly slots:Slot[]=[];
  constructor(private readonly scene:Phaser.Scene) {
    for(let i=0;i<POOL_SIZE;i++) {
      const text=scene.add.bitmapText(0,0,'font_damage_anime','0',12).setOrigin(0.5).setDepth(500_000_500)
        .setActive(false).setVisible(false).setData('damage-number',true);
      const icon=scene.add.image(0,0,'icon-stat_crit').setDisplaySize(8,8).setOrigin(0.5).setDepth(500_000_501)
        .setVisible(false).setData('damage-crit-icon',true);
      const burst=scene.add.image(0,0,'damage_explosion_mark').setOrigin(0.5).setDepth(500_000_499)
        .setVisible(false).setData('damage-explosion',true);
      this.slots.push({text,icon,burst,active:false,bornAtMs:0,lifeMs:380,startY:0,critical:false,explosive:false});
    }
  }

  spawnDamageText(x:number,y:number,amount:number,nowMs=this.scene.time.now,critical=false,explosive=false):void {
    let slot=this.slots.find(s=>!s.active);
    if(!slot) slot=this.slots.reduce((oldest,next)=>next.bornAtMs<oldest.bornAtMs?next:oldest);
    slot.active=true;slot.bornAtMs=nowMs;slot.startY=y-14;slot.critical=critical;slot.explosive=explosive;
    slot.lifeMs=critical?450:explosive?420:380;
    const size=critical?16:explosive?14:amount>=80?14:12;
    slot.text.setText(`${Math.max(1,Math.round(amount))}`).setFontSize(size)
      .setTint(explosive?0xff9461:critical?0xffe4a1:0xffffff).setPosition(x,y-14).setAlpha(1).setScale(damagePopupScale(0)).setActive(true).setVisible(true);
    slot.icon.setVisible(critical).setAlpha(1);
    slot.burst.setVisible(explosive).setPosition(x,y-14).setAlpha(0.28);
    this.sync(slot);
  }

  private sync(slot:Slot):void {
    const text=slot.text;
    if(slot.critical) slot.icon.setPosition(text.x+text.displayWidth/2+5,text.y).setDisplaySize(8*text.scaleX,8*text.scaleX);
    if(slot.explosive) slot.burst.setPosition(text.x,text.y).setDisplaySize(text.displayWidth+10,text.displayHeight+8);
  }
  update(nowMs:number):void {
    for(const slot of this.slots) {
      if(!slot.active) continue;
      const t=(nowMs-slot.bornAtMs)/slot.lifeMs;
      if(t>=1){this.hide(slot);continue;}
      slot.text.y=slot.startY-(slot.explosive?52:38)*Math.max(0,nowMs-slot.bornAtMs)/1000;
      const alpha=damagePopupAlpha(t);
      slot.text.setAlpha(alpha).setScale(damagePopupScale(t));
      slot.icon.setAlpha(alpha);slot.burst.setAlpha(alpha*0.28);this.sync(slot);
    }
  }
  private hide(slot:Slot):void {
    slot.active=false;slot.text.setActive(false).setVisible(false);slot.icon.setVisible(false);slot.burst.setVisible(false);
  }
  getActiveCount():number{return this.slots.filter(slot=>slot.active).length;}
  clear():void{for(const slot of this.slots)this.hide(slot);}
}
