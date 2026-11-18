"""Validate the compact native-pose batch and every archival sheet crop."""
import hashlib
from actor_v3_art import ROOT, read
import validate_sprites

def verify():
    records = read(ROOT / 'source/provenance.json')['records']
    if len(records) != 13:
        raise ValueError(f'Expected approved13original poses, found {len(records)}')
    for entry in records:
        source = ROOT / 'source/originals' / entry['key'] / entry['direction'] / f"{entry['pose']}.png"
        if hashlib.sha256(source.read_bytes()).hexdigest() != entry['sha256']:
            raise ValueError(f'{source}: original PNG bytes changed')
    validate_sprites.CONTRACT = read(ROOT / 'contract.json')
    validate_sprites.FRAMES = ROOT / 'frames'
    validate_sprites.OUT = ROOT / 'sheets'
    validate_sprites.verify()
    print('PASS13unchanged original PNGs and all compact animation crops')

if __name__ == '__main__':
    verify()
