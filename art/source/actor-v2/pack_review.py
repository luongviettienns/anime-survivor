"""Padding-only sheets and original-page atlases for the isolated asset preview."""
import argparse,sys,hashlib
from PIL import Image
from assemble_assets import ROOT,GAME,OUT,read,write,assemble
sys.path.insert(0,str(GAME/'scripts'))
import pack_frames,validate_sprites
CELL=2048
ANCHOR=[1024,1536]
FRAMES=ROOT/'frames'
def baseline():
 items={}
 for key,path in [('naruto',GAME/'art/source/naruto-ai/idle/000.png'),('elite',GAME/'art/source/ai-overhaul/enemy_elite/walk/000.png')]:
  im=Image.open(path);assert im.mode=='RGBA';b=im.getchannel('A').point(lambda a:255 if a>=128 else 0).getbbox()
  to=OUT/'comparison'/f'{key}.png';to.parent.mkdir(parents=True,exist_ok=True);to.write_bytes(path.read_bytes())
  items[key]={'file':to.relative_to(OUT).as_posix(),'anchor':[im.width//2,b[3]],'scale':128/(b[3]-b[1]),'body_height':128}
 return items
def build(complete=False,archive=True):
 plan,ready,missing=assemble(complete)
 contract={'version':1,'sprites':{},'single_images':{}}
 clips={}
 for name,c in ready.items():
  frames=[];pages={};anchor=[1024,1024] if c.get('effect') else ANCHOR
  for i,e in enumerate(c['records']):
   im=Image.open(OUT/e['original'])
   offset=[anchor[a]-e['source_anchor'][a] for a in range(2)]
   assert min(offset)>=1 and all(offset[a]+im.size[a]<CELL for a in range(2)),(name,i,offset,im.size)
   page_index,slot=divmod(i,4);page_name=f'{name}_page{page_index}'
   count=min(4,len(c['records'])-page_index*4)
   columns=2 if count%2==0 else count
   contract['sprites'][page_name]={'frame_width':CELL,'frame_height':CELL,'columns':columns,'rows':count//columns,'order':['play'],'animations':{'play':count}}
   if archive:
    padded=Image.new('RGBA',(CELL,CELL));padded.paste(im,tuple(offset))
    cut=padded.crop((offset[0],offset[1],offset[0]+im.width,offset[1]+im.height))
    assert cut.tobytes()==im.tobytes()
    to=FRAMES/page_name/'play'/f'{slot:03}.png';to.parent.mkdir(parents=True,exist_ok=True);padded.save(to)
   rect=[(slot%columns)*CELL,(slot//columns)*CELL,CELL,CELL]
   frames.append({'index':i,'pose':e['pose'],'duration_ms':c['durations_ms'][i],'original':e['original'],'source_anchor':e['source_anchor'],'offset':offset,'sheet':page_name+'.png','rect':rect,'source_sha256':e['sha256']})
   page=pages.setdefault(e['original'],{'image':e['original'],'frames':[]})
   page['frames'].append({'filename':f'{name}/{i:03}','frame':{'x':0,'y':0,'w':im.width,'h':im.height},'rotated':False,'trimmed':True,'spriteSourceSize':{'x':offset[0],'y':offset[1],'w':im.width,'h':im.height},'sourceSize':{'w':CELL,'h':CELL}})
  clip={k:v for k,v in c.items() if k!='records'}
  clip.update({'frame_count':len(frames),'canvas':[CELL,CELL],'anchor':anchor,'frames':frames,'atlas':name+'.atlas.json','integration':'asset-only, not applied to gameplay'})
  clip['release_events']=[{'frame':i,'time_ms':sum(c['durations_ms'][:i])} for i in c.get('release_frames',[])]
  if c['action']=='death':clip['end_policy']='hold fallen; external cleanup only'
  write(OUT/(name+'.atlas.json'),{'textures':list(pages.values()),'meta':{'format':'RGBA8888','scale':'1','app':'lossless isolated art review'}})
  clips[name]=clip
 if archive:
  pack_frames.CONTRACT=contract
  pack_frames.pack_all(FRAMES,OUT/'sheets')
  validate_sprites.CONTRACT=contract;validate_sprites.FRAMES=FRAMES;validate_sprites.OUT=OUT/'sheets';validate_sprites.verify()
 write(ROOT/'package-contract.json',contract)
 write(OUT/'catalog.json',{'version':1,'complete':not missing,'missing':missing,'camera_zoom':plan['preview_zoom'],'pixel_policy':plan['quality'],'comparison':baseline(),'clips':clips})
 print(f'Built {len(clips)} clips with {sum(c["frame_count"] for c in clips.values())} frames. Archive={archive}, complete={not missing}')
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--complete',action='store_true');p.add_argument('--preview-only',action='store_true');args=p.parse_args();build(args.complete,not args.preview_only)

