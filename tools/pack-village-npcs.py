"""Build the game's trimmed NPC atlases from the owner's CraftPix ZIP."""
from io import BytesIO
from pathlib import Path
from zipfile import ZipFile

from PIL import Image

assets = Path(__file__).resolve().parents[1] / 'assets'
out = assets / 'village-npcs'
out.mkdir(exist_ok=True)
source = assets / 'village-npc-pixel-art-character-sprite-pack.zip'
# Each row has a shared pivot so feet and held items stay aligned across poses.
roles = {
    'smith': (1, [('Idle_2', 7), ('Idle', 12), ('Dialogue', 11)]),
    'innkeeper': (2, [('Idle', 7), ('Dialogue', 10)]),
    'villager': (3, [('Idle', 7), ('Walk', 12), ('Dialogue', 9)]),
    'trader': (4, [('Idle', 7), ('Sell', 10)]),
}
left, top, width, height = 16, 24, 96, 104
with ZipFile(source) as archive:
    for role, (group, rows) in roles.items():
        atlas = Image.new('RGBA', (max(n for _, n in rows) * width, len(rows) * height))
        for row, (action, frames) in enumerate(rows):
            name = f'Peasants_{group}/{action}.png'
            with Image.open(BytesIO(archive.read(name))) as png:
                assert png.size == (128 * frames, 128), (name, png.size)
                strip = png.convert('RGBA')
            for frame in range(frames):
                cell = strip.crop((frame * 128, 0, (frame + 1) * 128, 128))
                box = cell.getbbox()
                assert box and box[0] >= left and box[1] >= top and box[2] <= left + width, (name, frame, box)
                atlas.paste(cell.crop((left, top, left + width, top + height)), (frame * width, row * height))
        atlas.save(out / f'{role}.png', optimize=True)
