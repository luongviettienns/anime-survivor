"""Automated Naruto Shippuden (Option 2) Blender 3D + Pixel-Art Finisher Pipeline."""
from __future__ import annotations
import runpy
import subprocess
from pathlib import Path

BLENDER_EXE = r"D:\dowload\blender.exe"
ROOT = Path(__file__).resolve().parents[1]
BLENDER_SCRIPT = ROOT / "scripts/blender_render_shinobi.py"


def run_pipeline() -> None:
    if Path(BLENDER_EXE).is_file():
        print("Step 1: Running Blender 5.2 Headless 3D Naruto Shippuden build & render...")
        subprocess.run([BLENDER_EXE, "--background", "--python", str(BLENDER_SCRIPT)], check=True)
    else:
        print("Step 1: Blender executable not found at default path; using pixel-locked pass directly.")

    print("Step 2: Generating pixel-locked 32x32 Naruto Shippuden frames, Rasengan orb & Rogue Ninja enemy...")
    import generate_assets
    generate_assets.main()

    print("Step 3: Validating sprites byte-for-byte against ART_CONTRACT.json...")
    import validate_sprites
    validate_sprites.verify()

    print("Step 4: Updating QA contact sheet preview (art/contact_sheet.png)...")
    runpy.run_path(str(ROOT / "scripts/make_contact_sheet.py"))

    print("\nSUCCESS: Naruto Shippuden 3D source + pixel-perfect spritesheets generated and verified!")


if __name__ == "__main__":
    run_pipeline()
