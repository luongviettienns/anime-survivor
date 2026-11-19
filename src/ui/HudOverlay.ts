import { isolateHudCamera } from './hudCamera';
import Phaser from 'phaser';
import type { HeroId } from '../domain/heroes';
import { xpThreshold } from '../domain/progression';
import type { WeaponId } from '../domain/weapons';
import { formatPassives, type HudStateDto } from './HudState';
import { HudChrome } from './HudChrome';
import { HudGauges } from './HudGauges';
import { hudLayout } from './layout';

const SLOTS: ReadonlyArray<{id:WeaponId;label:string;icon:string}> = [
  {id:'orb',label:'ORB',icon:'icon-weapon_orb'}, {id:'dual_slash',label:'DUAL',icon:'icon-weapon_slash'},
  {id:'clone',label:'CLONE',icon:'icon-weapon_slash'}, {id:'orbital',label:'ORBIT',icon:'icon-weapon_orbital'},
  {id:'mine',label:'MINE',icon:'icon-weapon_mine'},
];
const Z = 1_000_000_000;

export class HudOverlay {
  private readonly chrome: HudChrome;
  private readonly gauges: HudGauges;
  private readonly portrait: Phaser.GameObjects.Sprite;
  private readonly heart: Phaser.GameObjects.Image;
  private readonly hpLabel: Phaser.GameObjects.Text;
  private readonly lvlLabel: Phaser.GameObjects.Text;
  private readonly timer: Phaser.GameObjects.Text;
  private readonly kills: Phaser.GameObjects.Text;
  private readonly passives: Phaser.GameObjects.Text;
  private readonly controls: Phaser.GameObjects.Text;
  private readonly dashBadge: Phaser.GameObjects.Text;
  private readonly bossText: Phaser.GameObjects.Text;
  private readonly icons = {} as Record<WeaponId,Phaser.GameObjects.Image>;
  private readonly badges = {} as Record<WeaponId,Phaser.GameObjects.Text>;
  private readonly layout: ReturnType<typeof hudLayout>;
  private status = '';
  private lastKey = '';

  constructor(scene: Phaser.Scene, heroId: HeroId = 'naruto') {
    const firstHudIndex = scene.children.list.length;
    const l = this.layout = hudLayout(scene.scale.width,scene.scale.height);
    this.chrome = new HudChrome(scene,Z-1);
    this.gauges = new HudGauges(scene,this.chrome,Z);
    const text = (x:number,y:number,size:number,color:string) => scene.add.text(x,y,'',{
      fontFamily:'monospace',fontSize:`${size}px`,color,stroke:'#070a14',strokeThickness:3,
    }).setScrollFactor(0).setDepth(Z+3);
    this.portrait = heroId === 'kirito'
      ? scene.add.sprite(40,68,'kirito_wave_lv1_ice','kirito_wave_lv1_ice/000').setScale(0.032).setScrollFactor(0).setDepth(Z+2)
      : scene.add.sprite(40,66,'hero',0).setScrollFactor(0).setDepth(Z+2).play('hero-idle');
    this.heart = scene.add.image(90,55,'icon-stat_max_hp').setDisplaySize(16,16).setScrollFactor(0).setDepth(Z+3);
    this.hpLabel = text(106,47,13,'#ffffff');
    this.lvlLabel = text(l.levelX,12,13,'#ffe5a0').setOrigin(0.5);
    this.timer = text(l.center,54,20,'#fff0c0').setOrigin(0.5).setData('hud-timer',true);
    this.kills = text(l.right-12,52,14,'#9beaff').setOrigin(1,0.5).setData('hud-kills',true);
    this.passives = text(310,92,12,'#d8c6ff');
    this.controls = text(l.right,82,11,'#abc1dc').setOrigin(1,0).setText('WASD/Arrows | ESC Pause');
    this.dashBadge = text(l.right,98,12,'#5ce1e6').setOrigin(1,0).setVisible(heroId === 'kirito');
    this.bossText = text(l.center,l.boss.y-18,15,'#ffe4e6').setOrigin(0.5).setVisible(false).setData('hud-boss-title',true);
    for (const slot of SLOTS) {
      this.icons[slot.id] = scene.add.image(0,95,slot.icon).setDisplaySize(22,22).setScrollFactor(0).setDepth(Z+2).setVisible(false);
      this.badges[slot.id] = text(0,108,11,'#ffe5a0').setOrigin(1,1).setVisible(false);
    }
    isolateHudCamera(scene, firstHudIndex);
  }

  update(dto: HudStateDto): void {
    const w=dto.weapons,p=dto.passives,b=dto.bossHp,dashTenths=dto.dashCooldownMs===undefined?-1:Math.ceil(dto.dashCooldownMs/100);
    const key=`${dto.player.hp}/${dto.player.maxHp}|${dto.progression.level}:${dto.progression.xp}|${Math.floor(dto.elapsedSec)}|${dto.defeated}|${dto.dashLevel??0}:${dashTenths}|${w?`${w.orb},${w.dual_slash},${w.clone},${w.orbital},${w.mine}`:''}|${p?`${p.damageReduction},${p.damageBonus},${p.cooldownReductionMs},${p.moveSpeedBonusPxSec},${p.recoveryPer3Sec},${p.critChance}`:''}|${b?`${b.name}:${b.hp}/${b.maxHp}`:''}`;
    if (key===this.lastKey) return;
    this.lastKey=key;
    const reqXp=Math.max(1,xpThreshold(dto.progression.level)),l=this.layout;
    this.gauges.draw(dto,reqXp);
    this.chrome.panel(16,42,48,48,0x18213e,0xe4c86d);
    this.chrome.panel(l.levelX-44,5,88,22,0x18213e,0xe4c86d);
    this.chrome.panel(l.center-64,36,128,36,0x18213e,0xe4c86d);
    this.chrome.panel(l.right-160,36,160,30,0x18213e,0x8cccf7);
    const min=Math.floor(dto.elapsedSec/60).toString().padStart(2,'0'),sec=Math.floor(dto.elapsedSec%60).toString().padStart(2,'0');
    this.timer.setText(`${min}:${sec}`);this.lvlLabel.setText(`LV ${dto.progression.level}`);
    this.hpLabel.setText(`HP ${dto.player.hp}/${dto.player.maxHp}`);this.kills.setText(`KILLS ${dto.defeated}`);
    const summary:string[]=[];let index=0;
    for (const slot of SLOTS) {
      const level=dto.weapons?.[slot.id]??(slot.id==='orb'&&!dto.weapons?1:0);
      this.icons[slot.id].setVisible(level>0);this.badges[slot.id].setVisible(level>0);
      if (level<=0) continue;
      const x=92+index++*42;
      this.chrome.panel(x-18,76,36,36,0x18213e,0xe4c86d);
      this.icons[slot.id].setPosition(x,94);this.badges[slot.id].setPosition(x+16,110).setText(`${level}`);
      summary.push(`${slot.label} Lv${level}`);
    }
    this.passives.setText(formatPassives(dto.passives));
    this.controls.setText('WASD/Arrows | ESC Pause');
    this.dashBadge.setVisible(dto.dashCooldownMs !== undefined);
    if (dto.dashCooldownMs !== undefined) {
      const lvTag = dto.dashLevel ? ` Lv.${dto.dashLevel}` : '';
      this.dashBadge.setText(dto.dashCooldownMs <= 0 ? `PHANTOM DASH${lvTag} [AUTO]` : `PHANTOM DASH${lvTag} [${(dto.dashCooldownMs / 1000).toFixed(1)}s]`)
        .setColor(dto.dashCooldownMs <= 0 ? '#5ce1e6' : '#94a3b8');
    }
    this.bossText.setVisible(Boolean(b&&b.hp>0));
    if (b&&b.hp>0) this.bossText.setText(`${b.name}  ${b.hp}/${b.maxHp}${b.hp/b.maxHp<=0.5?' [ENRAGED]':''}`);
    this.status=`ANIME SURVIVOR | HP ${dto.player.hp}/${dto.player.maxHp} | LVL ${dto.progression.level} XP ${dto.progression.xp}/${reqXp}\nTIME ${min}:${sec} | KILLS ${dto.defeated} | ${summary.join('  ')||'ORB Lv1'}`;
  }
  getStatusText(): string { return this.bossText.visible?`${this.status}\n${this.bossText.text}`:this.status; }
  destroy(): void {
    this.gauges.destroy();this.chrome.destroy();this.portrait.destroy();this.heart.destroy();
    for (const label of [this.hpLabel,this.lvlLabel,this.timer,this.kills,this.passives,this.controls,this.dashBadge,this.bossText]) label.destroy();
    for (const slot of SLOTS) {this.icons[slot.id].destroy();this.badges[slot.id].destroy();}
  }
}
