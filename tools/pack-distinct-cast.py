"""Pack selected LyniaDesign and Eldiran frames for Pixelquest's runtime."""
from io import BytesIO
from pathlib import Path
import sys
from zipfile import ZipFile

from PIL import Image

assets = Path(__file__).resolve().parents[1] / 'assets'
out = assets / 'distinct-cast'
out.mkdir(exist_ok=True)
with ZipFile(assets / 'Tiny Pixel Japan Female Character Pack.zip') as archive:
    atlas = Image.new('RGBA', (200, 116))
    for row, art in enumerate(['Hime', 'Geisha', 'Kimono_1', 'Kimono_2']):
        name = f'Tiny Pixel Japan Female Character Pack/NPC_{art}.png'
        with Image.open(BytesIO(archive.read(name))) as png:
            assert png.height == 29 and png.width >= 200
            # The first costume is used once. Do not turn color variants into new people.
            atlas.paste(png.convert('RGBA').crop((0, 0, 200, 29)), (0, row * 29))
    atlas.save(out / 'storybook-and-town.png', optimize=True)

# Eldiran's CC0 RPGCharacterSprites32x32.png can be supplied as the first argument.
with Image.open(sys.argv[1]) as png:
    source = png.convert('RGBA')
    assert source.size == (384, 672)
    key = source.getpixel((0, 32))[:3]
    atlas = Image.new('RGBA', (160, 64))
    for row, source_row in enumerate([1, 4]):
        for i, col in enumerate([8, 9, 8, 10, 8]):
            frame = source.crop((col * 32, source_row * 32, (col + 1) * 32, (source_row + 1) * 32))
            pixels = frame.get_flattened_data() if hasattr(frame, 'get_flattened_data') else frame.getdata()
            frame.putdata([(*p[:3], 0) if p[:3] == key else p for p in pixels])
            atlas.paste(frame, (i * 32, row * 32))
    atlas.save(out / 'watch-posts.png', optimize=True)

with ZipFile(assets / 'Legacy Collection.zip') as archive:
    name = 'Legacy Collection/Assets/Gothicvania/Characters/Terrible Knight/Spritesheets/player-Crouch.png'
    with Image.open(BytesIO(archive.read(name))) as png:
        assert png.size == (256, 96)
        png.convert('RGBA').save(out / 'aldric-at-seal.png', optimize=True)
