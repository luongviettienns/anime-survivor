"""Automated Shinobi Blender 3D-to-Pixel Pipeline."""
import subprocess
import sys
from pathlib import Path
from PIL import Image

BLENDER_EXE = r"D:\dowload\blender.exe"
ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/blender_render_shinobi.py"
FRAMES_HERO = ROOT / "art/frames/hero"

def run_pipeline():
    print("Step 1: Running Blender Headless 3D render...")
    result = subprocess.run([BLENDER_EXE, "--background", "--python", str(SCRIPT)], check=True)
    if result.returncode != 0:
        raise RuntimeError("Blender render failed")

    print("Step 2: Post-processing frames (alpha thresholding for crisp pixel art)...")
    for anim in ["idle", "walk"]:
        for f in range(4):
            path = FRAMES_HERO / anim / f"{f:03d}.png"
            with Image.open(path) as im:
                rgba = im.convert("RGBA")
                alpha = rgba.getchannel("A").point(lambda a: 255 if a >= 128 else 0)
                rgba.putalpha(alpha)
                rgba.save(path)
            print(f"Processed: {path}")

    print("Step 3: Packing frames into spritesheet...")
    import pack_frames
    pack_frames.pack_all(ROOT / "art/frames", ROOT / "public/assets")

    print("Step 4: Validating sprites byte-for-byte...")
    import validate_sprites
    validate_sprites.verify()

    print("Step 5: Updating contact sheet preview...")
    import runpy
    runpy.run_path(str(ROOT / "scripts/make_contact_sheet.py"))

    print("\nSUCCESS: All Shinobi frames rendered, packed, validated, and contact sheet updated!")

if __name__ == "__main__":
    run_pipeline()
