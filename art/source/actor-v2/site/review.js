const catalog=await fetch('/assets/actor-v2/catalog.json').then(r=>r.json());
const root='/assets/actor-v2/';
const ui=Object.fromEntries(['entity','action','direction','zoom','status','pause','step','replay'].map(id=>[id,document.getElementById(id)]));
const entities=[...new Set(Object.values(catalog.clips).map(c=>c.entity))];
for(const key of entities)ui.entity.add(new Option(key,key));
ui.entity.value=entities.includes('kirito')?'kirito':entities[0];
let scene,actor,active,clock=0,paused=false,loading=false,frameIndex=0;
function actions(){const current=ui.action.value;ui.action.replaceChildren();for(const a of new Set(Object.values(catalog.clips).filter(c=>c.entity===ui.entity.value).map(c=>c.action)))ui.action.add(new Option(a,a));if([...ui.action.options].some(o=>o.value===current))ui.action.value=current;}
actions();
class Review extends Phaser.Scene{
 preload(){this.load.image('grass','/assets/grass.png');for(const [key,c] of Object.entries(catalog.comparison))this.load.image(key,root+c.file);}
 create(){
  scene=this;this.add.tileSprite(640,360,2000,1400,'grass').setTileScale(256/this.textures.get('grass').getSourceImage().width);
  this.add.ellipse(640,420,76,24,0x111522,.24);
  const line=this.add.graphics().lineStyle(1,0xf6dfa2,.6);line.lineBetween(380,420,900,420);
  for(const [i,[key,c]] of Object.entries(Object.entries(catalog.comparison))){
   const x=Number(i)===0?460:820;const im=this.textures.get(key).getSourceImage();
   this.add.image(x-c.anchor[0]*c.scale,420-c.anchor[1]*c.scale,key).setOrigin(0).setScale(c.scale);
   this.add.text(x,443,key==='naruto'?'Naruto · 128px':'Elite · 128px',{fontSize:'12px',color:'#fff',stroke:'#111',strokeThickness:3}).setOrigin(.5);
  }
  this.cameras.main.centerOn(640,360).setZoom(Number(ui.zoom.value));
  loadClip();
 }
 update(_time,delta){
  if(!active||loading)return;
  if(!paused)clock+=delta;
  const total=active.durations_ms.reduce((a,b)=>a+b,0);
  let t=active.loop?clock%total:Math.min(clock,total-.001),index=0;
  while(index<active.durations_ms.length-1&&t>=active.durations_ms[index])t-=active.durations_ms[index++];
  if(index!==frameIndex){frameIndex=index;actor.setFrame(active.name+'/'+String(index).padStart(3,'0'));}
  window.__ASSET_QA__={ready:true,clip:active.name,entity:active.entity,direction:active.direction,action:active.action,frame:frameIndex,count:active.frame_count,zoom:this.cameras.main.zoom,scale:actor.scaleX,flipX:actor.flipX,bodyHeight:active.body_target_height,sourceCanvas:active.canvas,complete:catalog.complete};
  ui.status.textContent=(catalog.complete?'Đủ phạm vi rút gọn; một số hướng đã hoãn':'Đang dựng bổ sung · '+catalog.missing.length+' pose còn thiếu')+' · '+active.name+' · frame '+(frameIndex+1)+'/'+active.frame_count+(active.effect?' · VFX ':' · thân ')+active.body_target_height+'px × zoom '+ui.zoom.value;
 }
}
function loadClip(){
 if(!scene||loading)return;
 const found=Object.entries(catalog.clips).find(([,c])=>c.entity===ui.entity.value&&c.action===ui.action.value&&(c.effect||c.direction===ui.direction.value));
 if(!found){active=undefined;actor?.setVisible(false);window.__ASSET_QA__={ready:false,pending:true};ui.status.textContent='Hướng/động tác này đã hoãn trong phạm vi rút gọn.';return;}
 const [name,c]=found;loading=true;window.__ASSET_QA__={ready:false};
 actor?.destroy();actor=undefined;if(scene.textures.exists('active'))scene.textures.remove('active');
 scene.load.multiatlas('active',root+c.atlas,root.slice(0,-1));
 scene.load.once('complete',()=>{
  active={...c,name,direction:c.effect?ui.direction.value:c.direction};clock=0;frameIndex=0;paused=false;
  actor=scene.add.sprite(640,420,'active',name+'/000').setOrigin(c.anchor[0]/c.canvas[0],c.anchor[1]/c.canvas[1]).setScale(c.display_scale);
  if(c.effect)actor.setAngle({right:0,down:90,left:180,up:-90}[active.direction]);
  loading=false;
  if(active.entity!==ui.entity.value||active.action!==ui.action.value||active.direction!==ui.direction.value)loadClip();
 });scene.load.start();
}
ui.entity.onchange=()=>{actions();loadClip();};ui.action.onchange=loadClip;ui.direction.onchange=loadClip;
ui.zoom.onchange=()=>scene?.cameras.main.setZoom(Number(ui.zoom.value));
ui.replay.onclick=()=>{clock=0;paused=false;};ui.pause.onclick=()=>{paused=!paused;};
ui.step.onclick=()=>{if(!active)return;paused=true;const i=(frameIndex+1)%active.frame_count;clock=active.durations_ms.slice(0,i).reduce((a,b)=>a+b,0)+.01;};
window.addEventListener('keydown',e=>{
 if(e.target instanceof HTMLSelectElement)return;
 const dirs={w:'up',ArrowUp:'up',s:'down',ArrowDown:'down',a:'left',ArrowLeft:'left',d:'right',ArrowRight:'right'};
 if(dirs[e.key]){e.preventDefault();ui.direction.value=dirs[e.key];loadClip();return;}
 const action={1:'lv1',2:'lv2',3:'lv3',j:'basic',Shift:'dash',h:'hit',k:'death'}[e.key];
 if(action&&[...ui.action.options].some(o=>o.value===action)){ui.action.value=action;loadClip();}
 if(e.code==='Space'){e.preventDefault();clock=0;paused=false;}
});
new Phaser.Game({type:Phaser.AUTO,parent:'stage',width:1280,height:720,pixelArt:false,antialias:true,backgroundColor:'#263520',scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_HORIZONTALLY},scene:Review,audio:{noAudio:true}});

