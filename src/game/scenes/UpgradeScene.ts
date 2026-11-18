import Phaser from 'phaser';
import type { PlayerState } from '../../domain/combat';
import type { HeroId } from '../../domain/heroes';
import type { RunProgression } from '../../domain/progression';
import {
  applyUpgradeChoice,
  rollUpgradeChoices,
  type PassiveStats,
  type UpgradeChoice,
} from '../../domain/upgrades';
import type { WeaponInventory } from '../../domain/weapons';

import { createUpgradeCard } from '../../ui/UpgradeCard';
import { upgradeLayout } from '../../ui/layout';

export type UpgradeSceneData = {
  heroId?: HeroId;
  inventory: WeaponInventory;
  playerState: PlayerState;
  passives: PassiveStats;
  progression: RunProgression;
  onApplied: () => void;
};

export class UpgradeScene extends Phaser.Scene {
  private payload!: UpgradeSceneData;
  private choices: UpgradeChoice[] = [];
  private cardObjects: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super('UpgradeScene');
  }

  create(data: UpgradeSceneData): void {
    this.payload = data;
    const {width,height} = this.scale;
    const layout = upgradeLayout(width,height);
    this.add.rectangle(width/2,height/2,width,height,0x050816,0.9);
    this.add.image(width/2,layout.bannerY,'ui_banner_levelup','content').setDisplaySize(Math.min(680,width-80),Math.min(140,height*0.195))
      .setData('upgrade-banner',true);
    this.add.text(width/2,layout.bannerY,'LEVEL UP! CHOOSE AN ABILITY',{
      fontFamily:'monospace',fontSize:'25px',color:'#ffedb5',stroke:'#080d20',strokeThickness:4,
    }).setOrigin(0.5);
    this.add.text(width/2,layout.bannerY+Math.min(140,height*0.195)/2+24,'Press [1] [2] [3] or click an ability card',{
      fontFamily:'monospace',fontSize:'15px',color:'#b9defc',
    }).setOrigin(0.5);

    const onOne = () => this.selectChoice(0);
    const onTwo = () => this.selectChoice(1);
    const onThree = () => this.selectChoice(2);
    this.input.keyboard?.on('keydown-ONE', onOne);
    this.input.keyboard?.on('keydown-TWO', onTwo);
    this.input.keyboard?.on('keydown-THREE', onThree);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off('keydown-ONE', onOne);
      this.input.keyboard?.off('keydown-TWO', onTwo);
      this.input.keyboard?.off('keydown-THREE', onThree);
    });

    this.rollAndRender();
  }

  getChoices(): UpgradeChoice[] {
    return [...this.choices];
  }

  selectChoice(index: number): boolean {
    const choice = this.choices[index];
    if (!choice || this.payload.progression.pendingUpgrades <= 0) return false;

    applyUpgradeChoice(choice.id, this.payload.inventory, this.payload.playerState, this.payload.passives);
    this.payload.progression.pendingUpgrades = Math.max(0, this.payload.progression.pendingUpgrades - 1);
    this.payload.onApplied();

    if (this.payload.progression.pendingUpgrades > 0) {
      this.rollAndRender();
    } else {
      this.scene.resume('GameScene');
      this.scene.stop('UpgradeScene');
    }
    return true;
  }

  private rollAndRender(): void {
    this.tweens.killAll();
    for (const obj of this.cardObjects) obj.destroy();
    this.cardObjects = [];
    this.choices = rollUpgradeChoices(this.payload.inventory, this.payload.passives, {
      playerLevel: this.payload.progression.level,
      hpRatio: this.payload.playerState.hp / Math.max(1, this.payload.playerState.maxHp),
      heroId: this.payload.heroId ?? 'naruto',
    }, 3);

    const layout = upgradeLayout(this.scale.width,this.scale.height);
    this.choices.forEach((choice,index)=> {
      this.cardObjects.push(...createUpgradeCard(this,choice,index,layout.centers[index]!,layout.cardY,
        layout.cardW,layout.cardH,()=>this.selectChoice(index)));
    });
  }
}
