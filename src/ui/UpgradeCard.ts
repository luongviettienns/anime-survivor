import type Phaser from 'phaser';
import { MAX_WEAPON_LEVEL } from '../domain/weapons';
import type { UpgradeChoice } from '../domain/upgrades';

export function createUpgradeCard(scene: Phaser.Scene, choice: UpgradeChoice, index: number,
  cx: number, cy: number, width: number, height: number, select: () => void): Phaser.GameObjects.GameObject[] {
  const weapon = choice.category === 'weapon';
  const color = weapon ? '#ffe6a3' : '#d4c4ff';
  const card = scene.add.nineslice(cx,cy,'ui_card_base','content',width,height,48,48,48,48)
    .setInteractive({ useHandCursor:true }).setData('upgrade-card', index);
  const socketY = cy-height*0.21;
  const socket = scene.add.image(cx,socketY,'ui_emblem_socket','content').setDisplaySize(92,92);
  const icon = scene.add.image(cx,socketY,choice.icon).setDisplaySize(48,48);
  const style = { fontFamily:'monospace',color,stroke:'#080d20',strokeThickness:3 };
  const badge = scene.add.text(cx-width/2+24,cy-height*0.4,`[${index+1}]`,{...style,fontSize:'18px'}).setOrigin(0,0.5);
  const tag = scene.add.text(cx+width/2-24,cy-height*0.4,weapon?'WEAPON':'PASSIVE',{...style,fontSize:'13px'}).setOrigin(1,0.5);
  const title = scene.add.text(cx,cy+height*0.05,choice.title,{...style,fontSize:'18px',align:'center',wordWrap:{width:width-42}}).setOrigin(0.5);
  const pips = choice.nextLevel ? '◆ '.repeat(choice.nextLevel)+'◇ '.repeat(MAX_WEAPON_LEVEL-choice.nextLevel) : '✦ PASSIVE ABILITY ✦';
  const levels = scene.add.text(cx,cy+height*0.19,pips.trim(),{...style,fontSize:'14px'}).setOrigin(0.5);
  const divider = scene.add.rectangle(cx,cy+height*0.25,width-64,1,0x8ebdf0,0.5);
  const desc = scene.add.text(cx,cy+height*0.35,choice.description,{...style,color:'#d8e7ff',fontSize:'14px',align:'center',wordWrap:{width:width-48}}).setOrigin(0.5);
  card.on('pointerover',()=>{ card.setTint(0xe1f8ff);socket.setTint(0xc6faff);icon.setDisplaySize(53,53); });
  card.on('pointerout',()=>{ card.clearTint();socket.clearTint();icon.setDisplaySize(48,48); });
  card.on('pointerdown',select);
  const objects = [card,socket,icon,badge,tag,title,levels,divider,desc];
  for (const object of objects) scene.tweens.add({targets:object,alpha:{from:0,to:1},duration:160,delay:index*55});
  return objects;
}
