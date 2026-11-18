"""Validate unchanged transition originals and pixel-identical packed animation frames."""
import hashlib
from actor_v3_art import read, GAME
import validate_sprites

ROOT = GAME / 'art/source/kirito-transitions'

def verify():
    entries = read(ROOT / 'source/provenance.json')['records']
    if len(entries) != 12:
        raise ValueError(f'Expected12authored transition poses, got {len(entries)}')
    for entry in entries:
        source = ROOT / 'source/originals' / entry['key'] / entry['direction'] / f"{entry['pose']}.png"
        if hashlib.sha256(source.read_bytes()).hexdigest() != entry['sha256']:
            raise ValueError(f'{source}: original bytes changed')
    validate_sprites.CONTRACT = read(ROOT / 'contract.json')
    validate_sprites.FRAMES = ROOT / 'frames'
    validate_sprites.OUT = ROOT / 'sheets'
    validate_sprites.verify()
    print('PASS12native transition originals and all exact archival crops')

if __name__ == '__main__':
    verify()
