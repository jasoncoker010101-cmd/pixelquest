import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = process.argv[2] ? path.resolve(process.argv[2]) : fileURLToPath(new URL('../', import.meta.url));
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
for (const [i, match] of [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].entries()) {
  new vm.Script(match[1], { filename: `index.html inline script ${i + 1}` });
}

const js = fs.readFileSync(path.join(root, 'world.js'), 'utf8');
const refs = new Set();
const ref = value => {
  const name = value.split('?')[0].replace(/^\.\//, '');
  if (name.startsWith('assets/')) refs.add(name);
};
class Media {
  constructor(src) { if (src) ref(src); }
  set src(value) { ref(value); }
}
const context = {
  Image: Media, Audio: Media, window: {},
  document: { createElement: () => ({ getContext: () => ({}) }) }
};
const marker = '  return { init, update, draw, stop,';
assert(js.includes(marker), 'Could not locate runtime data for validation');
new vm.Script(js.replace(marker, `
  window.buildData = { REGIONS, SCENE_MOBS, MOB_TYPES, STORY_DEFAULTS, LORE, FIRES, SFX_BANK, MUSIC_FILES, BOSS_FORMS, BOSS_LINES };
${marker}`), { filename: 'world.js' }).runInNewContext(context);
const { REGIONS, SCENE_MOBS, MOB_TYPES, STORY_DEFAULTS, LORE, FIRES, SFX_BANK, MUSIC_FILES, BOSS_FORMS, BOSS_LINES } = context.window.buildData;
const unique = (rows, name) => assert.equal(new Set(rows.map(row => row.id)).size, rows.length, `Duplicate ${name} IDs`);
unique(LORE, 'lore');
unique(FIRES, 'fire');
for (const item of [...LORE, ...FIRES]) {
  assert(!item.scene || (REGIONS[item.scene] && item.x >= 0 && item.x < REGIONS[item.scene].width), `Invalid location for ${item.id}`);
}
for (const [key, region] of Object.entries(REGIONS)) {
  assert(region.entry >= 0 && region.entry < region.width, `Invalid entry point for ${key}`);
  if (region.boss) {
    assert(MOB_TYPES[region.boss]?.boss && BOSS_FORMS[region.boss] && BOSS_LINES[region.boss], `Incomplete boss in ${key}`);
    assert(Object.hasOwn(STORY_DEFAULTS, region.bossFlag), `Missing boss save flag ${region.bossFlag}`);
    const { left, trigger, right } = region.arena;
    assert(left < trigger && trigger < region.bossX && region.bossX < right && right <= region.width, `Invalid arena for ${key}`);
  }
  if (region.peaceful) assert(!SCENE_MOBS[key]?.length, `Peaceful region ${key} contains enemy spawns`);
}
for (const [scene, mobList] of Object.entries(SCENE_MOBS)) {
  for (const [mob, x] of mobList) assert(MOB_TYPES[mob] && x >= 0 && x < REGIONS[scene]?.width, `Invalid ${mob} spawn in ${scene}`);
}
const sheet = name => fs.readFileSync(path.join(root, name));
for (const [key, type] of Object.entries(MOB_TYPES)) {
  for (const [anim, data] of Object.entries(type.anims || {})) {
    if (!data) continue;
    const [file, frames] = data;
    const name = `assets/${type.src}${file}.png`;
    ref(name);
    const png = sheet(name);
    assert(png.subarray(1, 4).toString() === 'PNG', `Not a PNG: ${name}`);
    assert(png.readUInt32BE(16) >= type.fw * frames && png.readUInt32BE(20) >= type.fh,
      `Frame cell out of bounds: ${key}.${anim} in ${name}`);
  }
}
for (const [files] of Object.values(SFX_BANK)) for (const file of files) ref(`assets/audio/sfx/${file}.mp3`);
for (const file of Object.values(MUSIC_FILES)) ref(`assets/audio/music/${file}.mp3`);
for (const content of [html, js]) {
  for (const [, name] of content.matchAll(/['"]((?:\.\/)?assets\/[^'"\r\n]+\.(?:png|jpe?g|b64|mp3))['"]/gi)) ref(name);
}
for (const name of refs) assert(fs.statSync(path.join(root, name)).size > 0, `Empty runtime asset: ${name}`);
console.log(`Verified ${Object.keys(REGIONS).length} regions, ${LORE.length} lore entries, ${FIRES.length} campfires, ${Object.keys(MOB_TYPES).length} monster types, and ${refs.size} runtime asset references.`);
