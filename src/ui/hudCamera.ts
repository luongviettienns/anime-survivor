import type Phaser from 'phaser';

/** Keep screen coordinates and UI sizes stable while the world camera zooms. */
export function isolateHudCamera(scene: Phaser.Scene, firstHudIndex: number): void {
  const hud = scene.children.list.slice(firstHudIndex);
  const camera = scene.cameras.add(0, 0, scene.scale.width, scene.scale.height, false, 'hud');
  scene.cameras.main.ignore(hud);
  camera.ignore(scene.children.list.slice(0, firstHudIndex));
  const ignoreWorldObject = (object: Phaser.GameObjects.GameObject) => camera.ignore(object);
  scene.events.on('addedtoscene', ignoreWorldObject);
  scene.events.once('shutdown', () => scene.events.off('addedtoscene', ignoreWorldObject));
}
