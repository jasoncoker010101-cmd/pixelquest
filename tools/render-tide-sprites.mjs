import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Original Ione sprite, with hand-laid polygon silhouettes and frame offsets.
// Regenerate the shipped PNG strips with Node and ImageMagick.
const dest = fileURLToPath(new URL('../assets/tide/', import.meta.url));
const poly = (color, points) => `<polygon fill="${color}" points="${points}"/>`;
const px = (color, x, y, w, h) => `<rect fill="${color}" x="${x}" y="${y}" width="${w}" height="${h}"/>`;
const frame = (i, lit) => {
  const bob = [0, -2, -4, -2, 0][i];
  const dark = '#111b2c', cloak = lit ? '#3c8294' : '#46636e', ice = lit ? '#86dfd9' : '#6c8c91', gold = lit ? '#f6efd0' : '#be9869';
  const lanternX = [0, 2, 4, 0, -2][i];
  const lanternY = [0, -3, -6, -4, -1][i];
  return `<g transform="translate(${i * 64},${bob})">` + [
    lit ? poly('#368391', '25,16 20,2 10,10 4,23 10,36 7,50 17,58 19,42 21,29 28,20') : '',
    lit ? poly('#64b2b0', '36,17 44,4 53,12 58,26 54,42 59,52 45,57 44,37 40,27') : '',
    lit ? poly('#a5e7d5', '16,11 20,4 22,13 19,18 17,30 14,32') : '',
    lit ? poly('#a5e7d5', '47,8 51,12 55,23 52,29 51,19') : '',
    poly(dark, `26,20 40,20 49,37 46,59 51,73 47,85 32,79 25,85 17,81 16,62 21,38`),
    poly(cloak, `26,24 38,25 45,37 42,54 44,64 46,80 36,76 31,77 24,80 22,75 20,64 23,49`),
    poly('#294758', `25,40 32,45 37,38 36,63 43,78 34,76 31,77 25,78 27,65`),
    poly(ice, '23,37 30,40 31,48 28,60 25,70 21,73 23,69 25,57'),
    poly(ice, '37,35 44,36 41,48 39,58 43,72 39,70 35,59 36,50'),
    poly(dark, '20,23 23,11 28,9 33,3 40,10 46,15 43,29 35,37 23,34'),
    poly(cloak, '23,23 25,13 30,12 33,7 38,12 43,16 40,27 35,33 25,30'),
    poly(gold, '24,17 27,14 36,14 40,18 37,20 28,20 25,22'),
    poly(dark, '24,21 29,19 38,21 36,26 30,32 26,29'),
    px(lit ? '#deffd4' : '#f8bb77', 26, 22, 3, 2), px(lit ? '#deffd4' : '#f8bb77', 31, 22, 3, 2),
    poly(dark, '24,31 20,45 14,51 11,43 16,38 19,29'),
    poly(cloak, '22,34 19,43 16,45 14,43 19,38'),
    poly(gold, '19,39 16,42 14,42 14,40'),
    `<g transform="translate(${lanternX},${lanternY})">`,
    poly(dark, '9,43 14,42 17,48 17,61 13,65 6,64 2,61 2,48 5,46'),
    poly(gold, '6,48 14,48 15,51 15,60 5,62 4,58 4,52'),
    poly(lit ? '#c9ffe7' : '#ffde99', '7,50 13,50 13,59 6,60 6,54'),
    px(lit ? '#f8fff2' : '#fff0bc', 8, 52, 2, 5), px('#6b7777', 11, 49, 1, 11),
    '</g>'
  ].join('') + '</g>';
};
for (const lit of [false, true]) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="96">${Array.from({ length: 5 }, (_, i) => frame(i, lit)).join('')}</svg>`;
  const name = lit ? 'keeper-lantern' : 'keeper';
  const p = spawnSync('convert', ['-background', 'none', '+antialias', 'svg:-', `PNG32:${dest}${name}.png`], { input: svg, encoding: 'utf8' });
  if (p.status !== 0) throw new Error(p.stderr || 'ImageMagick convert failed');
}
