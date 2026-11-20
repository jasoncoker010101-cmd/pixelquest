import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = process.argv[2] ? path.resolve(process.argv[2]) : fileURLToPath(new URL('../', import.meta.url));
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
assert.match(html, /<script\s+defer\s+src="\.\/world\.js(?:\?v=[\w.-]+)?"\s*><\/script>/, 'Game must load the same-site runtime directly');
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
  window.buildData = { REGIONS, SCENE_MOBS, MOB_TYPES, STORY_DEFAULTS, LORE, FIRES, SFX_BANK, MUSIC_FILES, BOSS_FORMS, BOSS_LINES, PHASE_SHOWS, FOUNDRY };
  window.bloodTest = { bloodDrops, spawnBlood, updateBlood, setBloodEffects };
  window.balanceTest = { xpForNext, gainXp, bossHitFloor, hurtByBoss, stats, equipment, skarnAttackFrame, SKARN_HEW, SKARN_SLAM };
  window.introTest = { introBookPage, introBookPose, introCaptionAt, INTRO_CAPTIONS, INTRO_DURATION, INTRO_SPACE_END, INTRO_LORE, INTRO_BOOK_END };
${marker}`), { filename: 'world.js' }).runInNewContext(context);
const { REGIONS, SCENE_MOBS, MOB_TYPES, STORY_DEFAULTS, LORE, FIRES, SFX_BANK, MUSIC_FILES, BOSS_FORMS, BOSS_LINES, PHASE_SHOWS, FOUNDRY } = context.window.buildData;
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
    assert(SFX_BANK[PHASE_SHOWS[region.boss]?.cue], `Missing phase-two show or sound in ${key}`);
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
for (const [id, [w, h, count, ms, ax, ay]] of Object.entries(FOUNDRY)) {
  const name = `assets/pvfx/${id}.png`, png = sheet(name);
  assert(png.subarray(1, 4).toString() === 'PNG', `Invalid PVFX strip: ${name}`);
  assert.equal(png.readUInt32BE(16), w * count, `Invalid PVFX frames: ${id}`);
  assert.equal(png.readUInt32BE(20), h, `Invalid PVFX height: ${id}`);
  assert(ms > 0 && ax >= 0 && ax < w && ay >= 0 && ay < h, `Invalid timing or pivot: ${id}`);
}
for (const [id, w, h] of [['moon-idle', 2550, 150], ['moon-jump-start', 750, 150], ['moon-jump-loop', 450, 150],
  ['moon-land', 600, 150], ['moon-dash', 2250, 150], ['moon-portrait', 160, 160],
  ['observer-1', 1024, 255], ['observer-2', 512, 255], ['observer-3', 1792, 255]]) {
  const png = sheet(`assets/court-road/${id}.png`);
  assert.equal(png.readUInt32BE(16), w, `Invalid strip width: ${id}`);
  assert.equal(png.readUInt32BE(20), h, `Invalid strip height: ${id}`);
}
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
for (const [boss, show] of Object.entries(PHASE_SHOWS)) {
  assert(BOSS_FORMS[boss] && FOUNDRY[show.aura] && FOUNDRY[show.burst], `Missing phase-two art for ${boss}`);
}
for (const [files] of Object.values(SFX_BANK)) for (const file of files) ref(`assets/audio/sfx/${file}.mp3`);
for (const file of Object.values(MUSIC_FILES)) ref(`assets/audio/music/${file}.mp3`);
for (const content of [html, js]) {
  for (const [, name] of content.matchAll(/['"]((?:\.\/)?assets\/[^'"\r\n]+\.(?:svg|png|jpe?g|b64|mp3))['"]/gi)) ref(name);
}
for (const name of refs) assert(fs.statSync(path.join(root, name)).size > 0, `Empty runtime asset: ${name}`);

const { bloodDrops, spawnBlood, updateBlood, setBloodEffects } = context.window.bloodTest;
spawnBlood(64, 96, 1, false);
const lightCount = bloodDrops.length;
assert(lightCount > 0, 'A direct hit should create blood particles');
for (let tick = 0; tick < 36; tick++) updateBlood(1 / 60, [{ x: 0, y: 115, w: 160 }]);
assert(bloodDrops.some(p => p.settled && p.y === 114), 'Blood should settle on raised platforms');
for (let tick = 0; tick < 100; tick++) updateBlood(1 / 60, []);
assert.equal(bloodDrops.length, 0, 'Blood splashes should expire');
spawnBlood(64, 96, 1, true);
assert(bloodDrops.length > lightCount, 'Heavy hits should create a larger burst');
for (let hit = 0; hit < 20; hit++) spawnBlood(64, 96, 1, true);
assert(bloodDrops.length <= 128, 'Keep the particle budget bounded');
setBloodEffects(false);
spawnBlood(64, 96, 1, true);
assert.equal(bloodDrops.length, 0, 'Turning blood off clears existing blood and suppresses new bursts');
const { xpForNext, gainXp, bossHitFloor, hurtByBoss, stats, skarnAttackFrame, SKARN_HEW, SKARN_SLAM } = context.window.balanceTest;
assert.equal(skarnAttackFrame(SKARN_HEW), 4, 'First hit must land on the first axe contact');
assert.equal(skarnAttackFrame(SKARN_SLAM), 10, 'Mirebreaker must launch on the second axe contact');
assert.equal(skarnAttackFrame(.56), 9, 'Hold the raised axe before the slam');
assert.equal(skarnAttackFrame(1), 15, 'The final attack pose stays in the strip');
for (let level = 1; level <= 30; level++) {
  assert(xpForNext(level) > 20 + level * 15, 'Slower than the legacy XP curve');
  assert(xpForNext(level + 1) > xpForNext(level), 'XP cost rises with level');
}
Object.assign(stats, { level: 1, xp: 0, health: 6, stamina: 10, maxHealth: 20 });
gainXp(xpForNext(1) - 1);
assert.equal(stats.level, 1, 'Do not level below the threshold');
gainXp(1);
assert.equal(stats.level, 2);
assert.equal(stats.maxHealth, 23);
assert.equal(stats.health, 12, 'Leveling no longer fully heals');
assert.equal(stats.stamina, 40);
Object.assign(stats, { health: 120, maxHealth: 120, defense: 100 });
hurtByBoss(6, 1, 'Test boss', true);
assert.equal(120 - stats.health, bossHitFloor(120, true, false), 'Endgame armor cannot trivialize a direct hit');
assert(bossHitFloor(120, true, false) > bossHitFloor(120, false, false), 'Phase two is more dangerous');
assert(bossHitFloor(120, true, false) > bossHitFloor(120, true, true), 'Hazards are less damaging than direct hits');

const { introBookPage, introBookPose, introCaptionAt, INTRO_CAPTIONS, INTRO_DURATION, INTRO_SPACE_END, INTRO_LORE, INTRO_BOOK_END } = context.window.introTest;
assert(!refs.has('assets/audio/intro-orus.mp3'), 'The text-only opening must not load the voice track');
assert.equal(introBookPage(0), 0, 'Start on the cover/Earth spread');
assert.equal(introBookPose(.2).open, 0);
assert(introBookPose(1).open > 0 && introBookPose(1).open < 1);
assert.equal(introBookPose(1.8).open, 1);
let pageStart = INTRO_SPACE_END;
INTRO_LORE.forEach(({ seconds }, i) => {
  assert.equal(introBookPage(pageStart + 0.25), i + 1, 'Open each flashback on its own page');
  assert.equal(introBookPage(pageStart + seconds - 0.1), i + 1, 'Hold each page for its story text');
  assert(introBookPose(pageStart + .1).fold > 0, 'The previous illustration stays on the face of the turning page');
  assert(introBookPose(pageStart + .55).fold < 0, 'The page turns over the spine');
  assert(!introBookPose(pageStart + .1, i + 1, true).turn, 'Reduced motion disables page folds');
  assert(!introBookPose(pageStart + .7).turn);
  pageStart += seconds;
});
assert.equal(introBookPage(INTRO_BOOK_END + 0.1), 5, 'The frontier begins as an illustration');
assert.equal(introBookPose(INTRO_BOOK_END + .3).zoom, 0, 'The turn completes before zooming');
assert(introBookPose(INTRO_BOOK_END + 1.45).zoom > introBookPose(INTRO_BOOK_END + .9).zoom, 'The village grows out of the illustration');
assert.equal(introBookPage(INTRO_BOOK_END + 1.7), 6, 'The frontier opens into the world');
let captionEnd = 0;
for (const [start, end, line] of INTRO_CAPTIONS) {
  assert(start >= captionEnd && end > start && end < INTRO_DURATION && line.length, 'Invalid or overlapping story text');
  assert.equal(introCaptionAt((start + end) / 2), line, 'Text is available without an audio setting or track');
  captionEnd = end;
}

console.log(`Verified ${Object.keys(REGIONS).length} regions, ${LORE.length} lore entries, ${FIRES.length} campfires, ${Object.keys(MOB_TYPES).length} monster types, and ${refs.size} runtime asset references.`);
