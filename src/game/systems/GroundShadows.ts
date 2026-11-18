import type Phaser from 'phaser';

type Actor = Phaser.Physics.Arcade.Sprite;

/** Cosmetic ground sprites follow physics actors even when attack overlays hide their art. */
export class GroundShadows {
  private readonly shadows = new Map<Actor, Phaser.GameObjects.Image>();
  private readonly sync = () => this.update(this.player, this.enemies, this.pickups);
  constructor(private readonly scene: Phaser.Scene, private readonly player: Actor,
    private readonly enemies: Phaser.Physics.Arcade.Group, private readonly pickups: Phaser.Physics.Arcade.Group) {
    scene.events.on('postupdate', this.sync);
    scene.events.once('shutdown', () => this.clear());
  }

  private update(player: Actor, enemies: Phaser.Physics.Arcade.Group, pickups: Phaser.Physics.Arcade.Group): void {
    this.follow(player, 32, 28, false);
    for (const object of enemies.getChildren()) {
      const actor = object as Actor;
      this.follow(actor, actor.texture.key === 'boss' ? 66 : actor.texture.key === 'enemy_elite' ? 48 : 34,
        (actor.getData('footOffset') as number | undefined) ?? 28, false);
    }
    for (const object of pickups.getChildren()) this.follow(object as Actor, 18, 11, true);
    for (const [actor, shadow] of this.shadows) {
      if (!actor.scene) { shadow.destroy(); this.shadows.delete(actor); }
      else if (!actor.active) shadow.setVisible(false);
    }
  }

  private follow(actor: Actor, width: number, footOffset: number, pickup: boolean): void {
    if (!actor.active) return;
    let shadow = this.shadows.get(actor);
    if (!shadow) {
      shadow = this.scene.add.image(actor.x, actor.y, pickup ? 'shadow_pickup' : 'shadow_actor')
        .setData('ground-shadow', true).setData('shadow-owner', actor).setDepth(-500_000_001);
      this.shadows.set(actor, shadow);
    }
    shadow.setVisible(true).setPosition(actor.x, actor.y + footOffset).setDisplaySize(width,width/2);
  }

  clear(): void { this.scene.events.off('postupdate', this.sync); for (const shadow of this.shadows.values()) shadow.destroy(); this.shadows.clear(); }
}
