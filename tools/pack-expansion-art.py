"""Build runtime strips from the project's original uploads (Pillow required).

Pass the directory containing the extracted Horror Enemy Pack as argv[1].
The ZIP assets are read directly. Frame art is preserved and only repacked.
"""
from io import BytesIO
from pathlib import Path
from sys import argv
from zipfile import ZipFile
from PIL import Image

root = Path(__file__).resolve().parents[1] / 'assets'
out = root / 'court-road'
out.mkdir(exist_ok=True)


def write(name, frames):
    frames = list(frames)
    w, h = frames[0].size
    assert all(im.size == (w, h) for im in frames)
    sheet = Image.new('RGBA', (w * len(frames), h))
    for i, image in enumerate(frames):
        sheet.paste(image, (i * w, 0))
    sheet.save(out / f'{name}.png', optimize=True)


def read(archive, name):
    return Image.open(BytesIO(archive.read(name))).convert('RGBA')


def row(name, im, w, h, count, r=0):
    write(name, (im.crop((i * w, r * h, (i + 1) * w, (r + 1) * h)) for i in range(count)))


with ZipFile(next(root.glob('Moonstone*.zip'))) as archive:
    for anim in ['Idle', 'Jump Loop', 'Jump Start', 'Land', 'Dash']:
        files = sorted(n for n in archive.namelist() if f'/{anim}-' in n and '/No BG/frame' in n)
        write('moon-' + anim.lower().replace(' ', '-'), (read(archive, n) for n in files))
    name = next(n for n in archive.namelist() if n.endswith('/Facing_Straight.png'))
    write('moon-portrait', [read(archive, name)])

with ZipFile(root / 'Dark Mage.zip') as archive:
    for name in ['static-idle', 'walk', 'blast-ATK', 'damaged', 'death']:
        write('scribe-' + name.split('-ATK')[0], [read(archive, f'Sheets/dm-{name}.png')])

with ZipFile(root / 'SkeletonKnight.zip') as archive:
    for name, source in {'idle': 'IDLE', 'walk': 'WALK', 'attack': 'SIDE_SWING', 'hurt': 'HURT', 'death': 'DEATH'}.items():
        write('sentinel-' + name, [read(archive, f'RELEASE/{source}.png')])

with ZipFile(root / 'NightBorne (1).zip') as archive:
    im = read(archive, 'NightBorne.png')
    for i, (name, count) in enumerate(zip(['idle', 'walk', 'attack', 'hurt', 'death'], [9, 6, 12, 5, 23])):
        row('nightborne-' + name, im, 80, 80, count, i)

with ZipFile(root / 'Enemy in the dark - Free Pack.zip') as archive:
    sheets = [n for n in archive.namelist() if n.endswith('.png') and '__MACOSX' not in n]
    for i, filename in enumerate(sorted(sheets), 1):
        im = read(archive, filename)
        write('observer-' + str(i), (im.crop((0, y, 256, y + 255)) for y in range(0, im.height, 255)))

horror = Path(argv[1])
for name, source, w, h, tags in [
    ('granary', 'Cat monster', 48, 32, {'idle': (5, 4), 'walk': (2, 4), 'attack': (6, 6), 'hurt': (7, 2), 'death': (8, 9)}),
    ('gutter', 'Abomination', 112, 48, {'idle': (0, 4), 'walk': (1, 4), 'attack': (2, 10), 'hurt': (3, 2), 'death': (4, 9)}),
    ('vigil', 'Mad Ghost', 64, 64, {'idle': (0, 4), 'walk': (1, 4), 'attack': (2, 7), 'hurt': (5, 2), 'death': (6, 9)}),
    ('cantor', 'Mage', 112, 48, {'idle': (0, 4), 'walk': (1, 4), 'attack': (2, 10), 'hurt': (3, 2), 'death': (4, 9)}),
]:
    file = next(f for f in horror.rglob(f'{source}-Sheet *.png') if 'separated tags' in f.name.lower())
    im = Image.open(file).convert('RGBA')
    for anim, (index, count) in tags.items():
        if (name, anim) == ('vigil', 'attack'):
            frames = [im.crop((i * w, j * h, (i + 1) * w, (j + 1) * h)) for j, n in [(2, 5), (3, 2), (4, 4)] for i in range(n)]
            write(name + '-' + anim, frames)
        else:
            row(name + '-' + anim, im, w, h, count, index)
