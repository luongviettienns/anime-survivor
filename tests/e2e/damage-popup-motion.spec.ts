import { expect, test } from '@playwright/test';
import type Phaser from 'phaser';
import type { VfxSystem } from '../../src/game/systems/VfxSystem';
import type { WeaponInventory } from '../../src/domain/weapons';

type Runtime=Phaser.Scene&{vfx:VfxSystem;spawnTimer:Phaser.Time.TimerEvent;
  weapon:{inventory:WeaponInventory};passives:{heavyStrikeEvery:number}};

test.beforeEach(async({page})=>{
  await page.goto('/?play=1');await page.waitForFunction(()=>Boolean(window.__ANIME_SURVIVOR__));
  await page.evaluate(()=>{
    const api=window.__ANIME_SURVIVOR__!,scene=api.getScene() as unknown as Runtime;
    scene.spawnTimer.paused=true;api.clearEnemies();
    Object.assign(scene.weapon.inventory,{orb:0,slash:0,orbital:0,mine:0});
    api.teleportPlayer(2000,-1000);scene.cameras.main.stopFollow().centerOn(2000,-1000);
    scene.scene.pause();
  });
  await page.waitForFunction(()=>window.__ANIME_SURVIVOR__!.getScene().scene.isPaused());
});

test('popup grows, fades and rises from the hit point independent of frame cadence; attached art follows and pool reuse resets',async({page})=>{
  const result=await page.evaluate(()=>{
    const scene=window.__ANIME_SURVIVOR__!.getScene() as unknown as Runtime;
    scene.vfx.spawnDamageText(2080,-1040,128,1000,true,true);
    const text=scene.children.list.find(o=>o.getData('damage-number')&&(o as Phaser.GameObjects.BitmapText).visible) as Phaser.GameObjects.BitmapText;
    const icon=scene.children.list.find(o=>o.getData('damage-crit-icon')&&(o as Phaser.GameObjects.Image).visible) as Phaser.GameObjects.Image;
    const burst=scene.children.list.find(o=>o.getData('damage-explosion')&&(o as Phaser.GameObjects.Image).visible) as Phaser.GameObjects.Image;
    const sample=()=>({x:text.x,y:text.y,scale:text.scaleX,alpha:text.alpha,visible:text.visible,
      icon:{x:icon.x,y:icon.y,width:icon.displayWidth,alpha:icon.alpha,visible:icon.visible},
      burst:{x:burst.x,y:burst.y,alpha:burst.alpha,visible:burst.visible},right:text.x+text.displayWidth/2});
    const start=sample();scene.vfx.update(1067.5,67.5);const growing=sample();
    scene.vfx.update(1225,157.5);const middle=sample();scene.vfx.update(1225,16);const repeated=sample();
    scene.vfx.update(1360,135);const fading=sample();scene.vfx.update(1450,90);const ended=sample();
    scene.vfx.spawnDamageText(1960,-980,12,1600);const reused=sample();
    return{start,growing,middle,repeated,fading,ended,reused};
  });
  expect(result.start.x).toBe(2080);expect(result.start.y).toBe(-1054);expect(result.start.scale).toBeCloseTo(0.72);
  expect(result.growing.scale).toBeGreaterThan(result.start.scale);expect(result.middle.scale).toBe(1);
  expect(result.middle.alpha).toBe(1);expect(result.fading.alpha).toBeCloseTo(0.5);
  expect(result.fading.y).toBeCloseTo(-1054-52*0.36);expect(result.fading.x).toBe(2080);
  expect(result.repeated.y).toBe(result.middle.y);
  for(const state of [result.start,result.growing,result.middle,result.fading]){
    expect(state.icon.y).toBe(state.y);expect(state.icon.x).toBeCloseTo(state.right+5);
    expect(state.icon.width).toBeCloseTo(8*state.scale);expect(state.icon.alpha).toBe(state.alpha);
    expect(state.burst.x).toBe(state.x);expect(state.burst.y).toBe(state.y);expect(state.burst.alpha).toBeCloseTo(state.alpha*0.28);
  }
  expect(result.ended.visible).toBe(false);expect(result.ended.icon.visible).toBe(false);expect(result.ended.burst.visible).toBe(false);
  expect(result.reused).toMatchObject({x:1960,y:-994,visible:true,alpha:1,icon:{visible:false},burst:{visible:false}});
  expect(result.reused.scale).toBeCloseTo(0.72);
});

test('a real projectile hit spawns damage at the struck enemy world position with a scrolled camera',async({page})=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.evaluate(()=>{
    const api=window.__ANIME_SURVIVOR__!,scene=api.getScene() as unknown as Runtime;
    const hit=scene.vfx.emitHit.bind(scene.vfx);
    scene.vfx.emitHit=(x,y,amount,killed,critical,explosive)=>{
      hit(x,y,amount,killed,critical,explosive);
      scene.data.set('qa-damage-hit',{x,y});scene.scene.pause();
    };
    scene.weapon.inventory.orb=1;scene.passives.heavyStrikeEvery=0;
    api.spawnEnemyAt(2110,-970);scene.scene.resume();
  });
  await page.waitForFunction(()=>Boolean(window.__ANIME_SURVIVOR__!.getScene().data.get('qa-damage-hit')));
  await page.waitForFunction(()=>window.__ANIME_SURVIVOR__!.getScene().scene.isPaused());
  const state=await page.evaluate(()=>{
    const scene=window.__ANIME_SURVIVOR__!.getScene();
    const text=scene.children.list.find(o=>o.getData('damage-number')&&(o as Phaser.GameObjects.BitmapText).visible) as Phaser.GameObjects.BitmapText;
    const hit=scene.data.get('qa-damage-hit') as {x:number;y:number};
    return{hit,x:text.x,y:text.y,scroll:text.scrollFactorX,screenX:text.x-scene.cameras.main.scrollX,
      screenY:text.y-scene.cameras.main.scrollY,scale:text.scaleX};
  });
  expect(state.x).toBe(state.hit.x);expect(state.y).toBeCloseTo(state.hit.y-14,0);
  expect(state.scroll).toBe(1);expect(state.screenX).toBeGreaterThan(0);expect(state.screenX).toBeLessThan(1280);
  expect(state.screenY).toBeGreaterThan(0);expect(state.screenY).toBeLessThan(720);expect(state.scale).toBeLessThanOrEqual(1);
  await page.screenshot({path:'test-results/damage-popup-real-hit.png'});
  expect(errors).toEqual([]);
});
