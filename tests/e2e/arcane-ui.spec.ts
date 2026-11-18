import { expect, test } from '@playwright/test';
import type Phaser from 'phaser';
import { xpThreshold } from '../../src/domain/progression';
import type { WeaponInventory } from '../../src/domain/weapons';
import type { VfxSystem } from '../../src/game/systems/VfxSystem';
import type { DamageSystem } from '../../src/game/systems/DamageSystem';

type Runtime=Phaser.Scene&{vfx:VfxSystem;damage:DamageSystem;spawnTimer:Phaser.Time.TimerEvent;
  weapon:{inventory:WeaponInventory};passives:{heavyStrikeEvery:number;heavyStrikeBonus:number}};

test.beforeEach(async({page})=>{
  await page.goto('/?play=1');await page.waitForFunction(()=>Boolean(window.__ANIME_SURVIVOR__));
  await page.evaluate(()=>{
    const api=window.__ANIME_SURVIVOR__!,scene=api.getScene() as unknown as Runtime;
    api.clearEnemies();scene.spawnTimer.paused=true;scene.damage.state.invulnerableUntilMs=Infinity;
    Object.assign(scene.weapon.inventory,{orb:0,slash:0,orbital:0,mine:0});
  });
});

test('crystal HUD assets remain anchored at different browser viewport sizes and camera positions',async({page})=>{
  for(const size of [{width:1280,height:800},{width:1600,height:900},{width:800,height:600}]){
    await page.setViewportSize(size);
    await page.evaluate(()=>{
      const api=window.__ANIME_SURVIVOR__!,scene=api.getScene() as unknown as Runtime;
      scene.damage.state.hp=60;if(!api.getCounts().enemies){const p=api.getPlayerPosition();api.spawnBossAt(p.x+250,p.y);}
      if(api.getProgression().xp===0)api.grantXp(1);
      const p=api.getPlayerPosition();api.teleportPlayer(p.x+100,p.y+100);
    });
    await page.waitForTimeout(80);
    const hud=await page.evaluate(()=>{
      const scene=window.__ANIME_SURVIVOR__!.getScene();
      const image=(tag:string)=>scene.children.list.find(o=>o.getData(tag)) as Phaser.GameObjects.Image;
      const hp=image('hud-hp-pip'),xp=image('hud-xp-pip');
      const timer=image('hud-timer'),kills=image('hud-kills');
      const crowns=scene.children.list.filter(o=>o.getData('hud-boss-crown')) as Phaser.GameObjects.Image[];
      return {width:scene.scale.width,hp:{x:hp.x,y:hp.y,visible:hp.visible},xp:{x:xp.x,visible:xp.visible},
        timer:timer.x,killsRight:kills.getBounds().right,crowns:crowns.map(c=>({x:c.x,y:c.y,visible:c.visible}))};
    });
    expect(hud.width).toBe(1280);expect(hud.timer).toBe(640);expect(hud.killsRight).toBeLessThanOrEqual(1264);
    expect(hud.hp.x).toBeCloseTo(76+2+224*0.6);expect(hud.hp.y).toBe(55);expect(hud.hp.visible).toBe(true);
    expect(hud.xp.visible).toBe(true);expect(hud.xp.x).toBeGreaterThan(16);expect(hud.xp.x).toBeLessThan(1156);
    expect(hud.crowns).toEqual([{x:302,y:681,visible:true},{x:978,y:681,visible:true}]);
  }
  await page.setViewportSize({width:1280,height:800});
  await page.screenshot({path:'test-results/arcane-hud.png'});
});

test('arcane banner/cards/socket stay inside the canvas and mouse and keyboard choose upgrades',async({page})=>{
  await page.evaluate(()=>window.__ANIME_SURVIVOR__!.grantXp(9));
  await page.waitForFunction(()=>window.__ANIME_SURVIVOR__!.getUpgradeChoices().length===3);
  const cards=await page.evaluate(()=>{
    const scene=window.__ANIME_SURVIVOR__!.getScene().scene.get('UpgradeScene');
    const bounds=scene.children.list.filter(o=>o.getData('upgrade-card')!==undefined).map(o=>{
      const card=o as Phaser.GameObjects.NineSlice;const b=card.getBounds();
      return {x:card.x,y:card.y,left:b.left,right:b.right,top:b.top,bottom:b.bottom};
    });
    const banner=scene.children.list.find(o=>o.getData('upgrade-banner')) as Phaser.GameObjects.Image;
    return {bounds,banner:{x:banner.x,top:banner.getBounds().top,bottom:banner.getBounds().bottom}};
  });
  expect(cards.bounds.map(b=>b.x)).toEqual([324,640,956]);expect(cards.banner.x).toBe(640);
  expect(cards.banner.top).toBeGreaterThanOrEqual(0);
  for(const b of cards.bounds){expect(b.left).toBeGreaterThan(16);expect(b.right).toBeLessThan(1264);expect(b.top).toBeGreaterThan(cards.banner.bottom+20);expect(b.bottom).toBeLessThan(704);}
  await page.waitForTimeout(250);await page.screenshot({path:'test-results/arcane-upgrades.png'});
  const canvas=await page.locator('canvas').boundingBox();expect(canvas).not.toBeNull();
  await page.mouse.click(canvas!.x+cards.bounds[1]!.x*canvas!.width/1280,canvas!.y+cards.bounds[1]!.y*canvas!.height/720);
  await page.waitForFunction(()=>window.__ANIME_SURVIVOR__!.getUpgradeChoices().length===0);
  expect((await page.evaluate(()=>window.__ANIME_SURVIVOR__!.getProgression())).pendingUpgrades).toBe(0);
  const progress=await page.evaluate(()=>window.__ANIME_SURVIVOR__!.getProgression());
  await page.evaluate(amount=>window.__ANIME_SURVIVOR__!.grantXp(amount),xpThreshold(progress.level)-progress.xp);
  await page.waitForFunction(()=>window.__ANIME_SURVIVOR__!.getUpgradeChoices().length===3);
  await page.keyboard.press('1');
  await page.waitForFunction(()=>window.__ANIME_SURVIVOR__!.getUpgradeChoices().length===0);
});

test('critical damage uses a small icon and larger digits, explosion damage uses a burst with no manga word labels',async({page})=>{
  await page.evaluate(()=>{
    const api=window.__ANIME_SURVIVOR__!,scene=api.getScene() as unknown as Runtime,p=api.getPlayerPosition();
    scene.vfx.spawnDamageText(p.x-110,p.y-60,24,scene.time.now,false);
    scene.vfx.spawnDamageText(p.x,p.y-60,128,scene.time.now,true);
    scene.vfx.spawnDamageText(p.x+110,p.y-60,80,scene.time.now,false,true);scene.scene.pause();
  });
  const damage=await page.evaluate(()=>{
    const scene=window.__ANIME_SURVIVOR__!.getScene();
    const numbers=scene.children.list.filter(o=>o.getData('damage-number')&&(o as Phaser.GameObjects.BitmapText).visible) as Phaser.GameObjects.BitmapText[];
    return {numbers:numbers.map(n=>({text:n.text,size:n.fontSize,font:n.font})),
      icons:scene.children.list.filter(o=>o.getData('damage-crit-icon')&&(o as Phaser.GameObjects.Image).visible).length,
      bursts:scene.children.list.filter(o=>o.getData('damage-explosion')&&(o as Phaser.GameObjects.Image).visible).length,
      words:['label_crit','label_smash','label_boom'].some(key=>scene.textures.exists(key))};
  });
  expect(damage.numbers).toEqual([{text:'24',size:12,font:'font_damage_anime'},{text:'128',size:16,font:'font_damage_anime'},{text:'80',size:14,font:'font_damage_anime'}]);
  expect(damage.icons).toBe(1);expect(damage.bursts).toBe(1);expect(damage.words).toBe(false);
  await page.screenshot({path:'test-results/anime-damage-numbers.png'});
  await page.evaluate(()=>{
    const api=window.__ANIME_SURVIVOR__!,scene=api.getScene() as unknown as Runtime;
    scene.scene.resume();scene.vfx.clear();scene.passives.heavyStrikeEvery=0;scene.passives.heavyStrikeBonus=0;scene.weapon.inventory.mine=1;
    const p=api.getPlayerPosition();api.spawnEnemyAt(p.x+25,p.y+28);
  });
  await page.waitForFunction(()=>window.__ANIME_SURVIVOR__!.getScene().children.list.some(o=>o.getData('damage-explosion')&&(o as Phaser.GameObjects.Image).visible));
});
