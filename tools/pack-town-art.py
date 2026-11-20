"""Extract and palette-swap town artwork from the project's Ansimuz archive."""
from io import BytesIO
from pathlib import Path
from zipfile import ZipFile
from PIL import Image, ImageColor

root = Path(__file__).resolve().parents[1] / 'assets'
out = root / 'court-road'
out.mkdir(exist_ok=True)
palette = {
    'elin': ('pirate', '#a4603f', '#dfaf75'), 'linnet': ('dance', '#83515b', '#eaa879'),
    'fenna': ('pirate', '#756043', '#b1ba77'), 'ori': ('kid', '#477d61', '#e3b759'),
    'farris': ('guy', '#7a565f', '#d6ad8b'), 'tove': ('guy', '#326c80', '#cae6da'),
    'nessel': ('dance', '#55635a', '#d0b887'), 'pella': ('pirate', '#4f6586', '#e1bda2'),
    'martin': ('guy', '#556954', '#ebc690'), 'ida': ('kid', '#80664c', '#d9b8a8'),
    'nell': ('pirate', '#826049', '#deb57a'), 'hob': ('guy', '#566941', '#b4d293'),
    'mira': ('dance', '#804763', '#f0ad8f'), 'tamsin': ('pirate', '#715039', '#a8ae6c'),
    'osk': ('guy', '#4b5762', '#a1bbd4'), 'pike': ('guy', '#785136', '#dba969'),
    'fenn': ('kid', '#3d6a54', '#c8c578'), 'posta': ('pirate', '#815156', '#d9ab90'),
    'vey': ('guy', '#31585f', '#a7cad4'), 'ysolde': ('pirate', '#4c526f', '#c2d8ed'),
    'enna': ('dance', '#7b527f', '#e0b8ce'), 'keeper': ('guy', '#426469', '#c2d2be'),
    'hessa': ('pirate', '#5b5375', '#c5a3cb'), 'pip': ('kid', '#627141', '#e1b869'),
    'novice': ('guy', '#5c485b', '#be96a4'), 'calden': ('guy', '#3b5974', '#a7c5cd'),
    'lys': ('dance', '#745b85', '#e2c4d8'), 'vi': ('pirate', '#76483e', '#e0a37a'),
    'bram': ('guy', '#72503a', '#c9b897'), 'seren': ('dance', '#387c75', '#c2dfc2'),
    'tess': ('pirate', '#634b75', '#bb9ac8'), 'orrin': ('guy', '#59656a', '#abb4aa'),
    'mara': ('pirate', '#3e6a77', '#a7d4bf'), 'teo': ('guy', '#835638', '#ecc77e'),
}
tiny = 'TinyRPG/Characters/Top-Down-16-bit-fantasy/Characters pack 1/'
with ZipFile(root / 'Legacy Collection.zip') as z:
    def source(name):
        return Image.open(BytesIO(z.read('Legacy Collection/Assets/' + name))).convert('RGBA')
    bases = {
        'guy': source(tiny + 'Guy/aseprite.png'),
        'kid': source(tiny + 'Blond_kid/aseprite.png'),
        'pirate': source(tiny + 'PirateGirl/spritesheet.png'),
        'dance': source('Gothicvania/Characters/Dancing Girl Files/spritesheets/hips.png'),
    }
    town = source('TinyRPG/Environments/Top-Down-Town/PNG/top-down-town-tileset.png')
    for name, box in {'timber-home': (192, 25, 272, 152), 'alder-tree': (117, 15, 173, 81),
                      'shingle': (198, 66, 210, 80)}.items():
        town.crop(box).save(out / ('town-' + name + '.png'), optimize=True)

def shade(color, ratio):
    return tuple(round(c * ratio) for c in color)

for who, (base, cloth, light) in palette.items():
    sheet = Image.new('RGBA', (48 * 8, 56))
    cloth, light = ImageColor.getrgb(cloth), ImageColor.getrgb(light)
    for i in range(8):
        if base == 'dance':
            f = bases[base].crop((i * 39, 0, (i + 1) * 39, 53))
        else:
            col = 0 if i < 2 else (i - 2) % 4
            row = 0 if i == 0 else 1
            f = bases[base].crop((col * 32, row * 32, (col + 1) * 32, (row + 1) * 32))
        box = f.getbbox()
        assert box, (who, i)
        # Fixed origin across frames; preserve the original pixel poses.
        if base != 'dance':
            cmap = {'fa fd ff': light, 'a6 c2 ff': shade(light, .65),
                    '0a 85 4a': cloth, '06 4e 2c': shade(cloth, .59),
                    '23 49 75': shade(cloth, .62), '39 78 c1': cloth, 'd6 24 11': cloth}
            cmap = {tuple(bytes.fromhex(k)): v for k, v in cmap.items()}
            if who == 'bram':
                cmap.update({(181, 85, 40): (176, 164, 148), (127, 6, 34): (86, 72, 65)})
        else:
            # Color the fabric ramp without changing skin, boots, or hair.
            cmap = {(91, 103, 49): shade(cloth, .67), (192, 177, 10): cloth,
                    (136, 140, 120): shade(light, .85), (121, 61, 78): shade(cloth, .59)}
        pixels = f.get_flattened_data() if hasattr(f, 'get_flattened_data') else f.getdata()
        f.putdata([(*cmap.get((r, g, b), (r, g, b)), a) for r, g, b, a in pixels])
        if base == 'dance':
            sheet.paste(f, (i * 48 + 5, 53 - 51))
        else:
            f = f.resize((48, 48), Image.Resampling.NEAREST)
            sheet.paste(f, (i * 48, 12))
    sheet.save(out / ('resident-' + who + '.png'), optimize=True)
