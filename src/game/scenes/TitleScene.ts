import Phaser from 'phaser';
import { canStartHero, cycleHeroIndex, HERO_ROSTER } from '../../domain/heroes';
import { LobbyPanel } from '../../ui/LobbyPanel';
import { loadSaveData, updateSettings } from '../systems/StorageSystem';

export class TitleScene extends Phaser.Scene {
  private selectedIndex = 0;
  private panel!: LobbyPanel;
  private stageSprite!: Phaser.GameObjects.Image;
  private lockBadge!: Phaser.GameObjects.Text;
  private floatTween?: Phaser.Tweens.Tween;

  constructor() {
    super('TitleScene');
  }

  create(): void {
    this.selectedIndex = 0;
    this.add.image(640, 360, 'lobby_background').setDisplaySize(1280, 720).setData('lobby-bg', true);
    this.add.text(58, 42, 'ANIME SURVIVOR', {
      fontFamily: 'monospace', fontSize: '38px', color: '#ffe7a3', stroke: '#070a14', strokeThickness: 5,
    });
    this.add.text(60, 88, 'SANCTUARY LOBBY  •  CHOOSE YOUR HERO', {
      fontFamily: 'monospace', fontSize: '14px', color: '#9beaff', stroke: '#070a14', strokeThickness: 3,
    });

    this.add.image(385, 524, 'lobby_pedestal', 'content').setDisplaySize(290, 183).setData('lobby-pedestal', true);
    this.stageSprite = this.add.image(385, 372, 'lobby_hero', 'content').setData('lobby-stage-hero', true);
    this.lockBadge = this.add.text(385, 524, 'IN PROGRESS — ASSETS PENDING', {
      fontFamily: 'monospace', fontSize: '13px', color: '#ffcf75', stroke: '#070a14', strokeThickness: 4,
    }).setOrigin(0.5).setVisible(false);

    this.panel = new LobbyPanel(this, HERO_ROSTER, (idx) => this.selectHero(idx), () => this.tryStart());
    this.selectHero(0);
    (window as unknown as { __ANIME_SURVIVOR_LOBBY__?: { getSelectedHeroId: () => string; isActive: () => boolean } }).__ANIME_SURVIVOR_LOBBY__ = {
      getSelectedHeroId: () => this.getSelectedHeroId(),
      isActive: () => this.scene.isActive('TitleScene'),
    };

    const kb = this.input.keyboard;
    const onPrev = () => this.selectHero(cycleHeroIndex(this.selectedIndex, -1, HERO_ROSTER.length));
    const onNext = () => this.selectHero(cycleHeroIndex(this.selectedIndex, 1, HERO_ROSTER.length));
    const onOne = () => this.selectHero(0);
    const onTwo = () => this.selectHero(1);
    const onStart = () => this.tryStart();
    const onMute = () => this.toggleSetting('muted');
    const onFlash = () => this.toggleSetting('reduceFlashing');
    const onShake = () => this.toggleSetting('reduceScreenShake');

    kb?.on('keydown-LEFT', onPrev); kb?.on('keydown-A', onPrev);
    kb?.on('keydown-RIGHT', onNext); kb?.on('keydown-D', onNext);
    kb?.on('keydown-ONE', onOne); kb?.on('keydown-TWO', onTwo);
    kb?.on('keydown-ENTER', onStart); kb?.on('keydown-SPACE', onStart);
    kb?.on('keydown-M', onMute); kb?.on('keydown-F', onFlash); kb?.on('keydown-H', onShake);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.floatTween?.stop();
      kb?.off('keydown-LEFT', onPrev); kb?.off('keydown-A', onPrev);
      kb?.off('keydown-RIGHT', onNext); kb?.off('keydown-D', onNext);
      kb?.off('keydown-ONE', onOne); kb?.off('keydown-TWO', onTwo);
      kb?.off('keydown-ENTER', onStart); kb?.off('keydown-SPACE', onStart);
      kb?.off('keydown-M', onMute); kb?.off('keydown-F', onFlash); kb?.off('keydown-H', onShake);
    });
  }

  getSelectedHeroId(): string {
    return HERO_ROSTER[this.selectedIndex]?.id ?? 'naruto';
  }

  selectHero(index: number): void {
    this.selectedIndex = Math.max(0, Math.min(HERO_ROSTER.length - 1, index));
    const hero = HERO_ROSTER[this.selectedIndex]!;
    this.floatTween?.stop();
    if (hero.unlocked) {
      this.stageSprite.setTexture('lobby_hero', 'content').setDisplaySize(148, 326).setPosition(385, 368).clearTint();
      this.floatTween = this.tweens.add({ targets: this.stageSprite, y: 360, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    } else {
      this.stageSprite.setTexture('lobby_lock', 'content').setDisplaySize(142, 164).setPosition(385, 405).setTint(0xd0c6ff);
    }
    this.lockBadge.setVisible(!hero.unlocked);
    this.panel.update(hero, this.selectedIndex, loadSaveData());
  }

  private toggleSetting(key: 'muted' | 'reduceFlashing' | 'reduceScreenShake'): void {
    const current = loadSaveData().settings;
    updateSettings({ [key]: !current[key] });
    this.panel.update(HERO_ROSTER[this.selectedIndex]!, this.selectedIndex, loadSaveData());
  }

  private tryStart(): void {
    const hero = HERO_ROSTER[this.selectedIndex]!;
    if (!canStartHero(hero)) return;
    this.scene.start('GameScene');
  }
}
