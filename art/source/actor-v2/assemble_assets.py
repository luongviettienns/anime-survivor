"""Import original art unchanged; assemble data for isolated asset review only."""
import hashlib,json,shutil
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parent
GAME=next((p for p in ROOT.parents if (p/'docs/ART_CONTRACT.json').is_file()),Path('C:/Users/ASUS/Desktop/AnimeSurvivor-Antigravity-Starter'))
OUT=ROOT/'site/assets/actor-v2'
DIRECTIONS=['down','up','left','right']
def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def write(p,x):
 p.parent.mkdir(parents=True,exist_ok=True)
 q=p.with_suffix(p.suffix+'.pending');q.write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');q.replace(p)
def retained(key,direction,pose,anim,index=0):
 return {'key':key,'direction':direction,'pose':pose,'path':str(GAME/'art/source/ai-overhaul'/key/anim/f'{index:03}.png'),'prompt':'Retained original PNG, unchanged; no mirroring.'}
def import_records():
 records={}
 for p in sorted((ROOT/'source').glob('*.json')):
  e=read(p)
  if 'pose' not in e:continue
  e.setdefault('key','kirito');records[e['key'],e['direction'],e['pose']]=e
 plan=read(ROOT/'plan.json')
 for key in plan['enemies']:
  for direction,anim in [('down','walk'),('up','walk-up'),('right','walk-side')]:
   records[key,direction,'neutral']=retained(key,direction,'neutral',anim)
   if key in plan['enemy_cast']['entities']:
    cast={'down':'cast','up':'cast-up','right':'cast-side'}[direction]
    for i,pose in enumerate(['cast_windup','cast_release']):records[key,direction,pose]=retained(key,direction,pose,cast,i)
 for ident,e in records.items():
  key,direction,pose=ident;source=Path(e['path'])
  target=ROOT/'source/originals'/key/direction/f'{pose}.png'
  if not source.is_file():source=target
  runtime=OUT/'originals'/key/direction/f'{pose}.png'
  for to in [target,runtime]:
   to.parent.mkdir(parents=True,exist_ok=True)
   if source.resolve()!=to.resolve():shutil.copyfile(source,to)
  assert source.read_bytes()==target.read_bytes()==runtime.read_bytes()
  im=Image.open(source);assert im.mode=='RGBA',(ident,im.mode)
  mask=im.getchannel('A').point(lambda a:255 if a>=128 else 0);box=mask.getbbox();assert box,(ident,'empty')
  e['edge_contact']=min(box[:2])<=0 or box[2]>=im.width or box[3]>=im.height
  if e['edge_contact'] and e['prompt'].startswith('Retained') is False:e['rejected']='source touches canvas edge; excluded from animation'
  left,right=int(im.width*.25),int(im.width*.75)
  b=mask.crop((left,0,right,im.height)).getbbox()
  foot=b[3] if key=='kirito' else box[3]
  anchor=[im.width//2,im.height//2] if key=='phantom_vfx' else [im.width//2,foot+(18 if pose.startswith('run_pass') else 0)]
  e.update({'original':runtime.relative_to(OUT).as_posix(),'size':list(im.size),'source_anchor':anchor,'body_bbox':[left+b[0],b[1],left+b[2],b[3]],'alpha128_bbox':list(box),'sha256':hashlib.sha256(source.read_bytes()).hexdigest()})
 return plan,records
def clip_specs(plan):
 if 'explicit_clips' in plan:return plan['explicit_clips']
 specs={}
 for d in DIRECTIONS:
  for action,c in plan['character']['clips'].items():specs[f'kirito_{action}_{d}']={'entity':'kirito','direction':d,'action':action,**c}
  for entity in plan['enemies']:
   for action,c in plan['reactions'].items():specs[f'{entity}_{action}_{d}']={'entity':entity,'direction':d,'action':action,**c}
   if entity in plan['enemy_cast']['entities']:
    c=plan['enemy_cast'];specs[f'{entity}_cast_{d}']={'entity':entity,'direction':d,'action':'cast','poses':c['poses'],'durations_ms':c['durations_ms'],'loop':False}
 for action,c in plan.get('phantom_vfx',{}).items():specs[f'phantom_vfx_{action}_right']={'entity':'phantom_vfx','direction':'right','action':action,**c}
 return specs
def assemble(complete=False):
 plan,records=import_records();specs=clip_specs(plan);missing=[];ready={}
 for name,c in specs.items():
  ids=[(c['entity'],c['direction'],pose) for pose in c['poses']]
  absent=[i for i in ids if i not in records or records[i].get('rejected')]
  if absent:missing.extend('/'.join(i) for i in absent);continue
  fx=c['entity']=='phantom_vfx'
  n=records[ids[0]] if fx else records[c['entity'],c['direction'],'neutral'];box=n['body_bbox'] if c['entity']=='kirito' else n['alpha128_bbox'];height=(box[2]-box[0]) if fx else (box[3]-box[1]);target=96 if fx else plan['display_body_height_px'][c['entity']]
  ready[name]={**c,'records':[records[i] for i in ids],'display_scale':target/height,'body_reference_height':height,'body_target_height':target,'effect':fx}
 missing=sorted(set(missing))
 if complete and missing:raise AssertionError(f'Missing {len(missing)} poses: {missing}')
 write(ROOT/'source/provenance.json',{'reference_rights':'User-supplied character reference; rights unverified','tool':'built-in image_gen; one independently generated frame per PNG','originals_byte_identical':len(records),'records':list(records.values())})
 print(f'{len(records)} originals; {len(ready)}/{len(specs)} ready clips; {len(missing)} poses pending')
 return plan,ready,missing

