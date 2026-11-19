import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../world.js', import.meta.url), 'utf8');
const marker = '  return { init, update, draw, stop,';
assert(source.includes(marker));
const ink = new Proxy({}, {
  get: (target, key) => target[key] ?? (key === 'measureText' ? text => ({ width: text.length * 5 }) : () => {}),
});
class Media { play() { return Promise.resolve(); } pause() {} }
const runtime = { Image: Media, Audio: Media, window: {}, setTimeout: () => {}, document: { createElement: () => ({ getContext: () => ink }) } };
const checks = `
  canvas = { width: 320, height: 240 }; ctx = document.createElement('canvas').getContext('2d'); map = buildMap();
  window.qa = {
    applySave, getSaveData, tideEnding, tideInteraction, tideSave, openTide, tideKey, consumeItem,
    chooseOpeningMove, tideWearBlade, updateTideWorld, tideArenaStart, totalDefense, updateFishing: updateTideFishing,
    place(scene, x) { platformScene = scene; sidePlayer.x = x; sidePlayer.onGround = true; loadSceneMobs(scene); },
    closeDialogue() { const done = dialogue.onDone; dialogue = null; if (done) done(); },
    stash: (key, n) => { inventory[key] = n; }, reveal: id => addLore(id), get: () => ({ story, inventory, equipment, tide, panel, tideArena, tideFishing, sideMobs }),
    down: () => keys.add('s'), completeWave: () => { for (const m of tideArena.mobs) m.dead = true; }
  };
`;
new vm.Script(source.replace(marker, checks + marker)).runInNewContext(runtime);
const q = runtime.window.qa;
const legacy = { version: 6, houseSpawnMigrated: true, story: { ch4Done: true }, equipment: { armor: true }, inventory: { coins: 80, ember: 2, toadskin: 1 } };
q.applySave(legacy); q.place('court', 801);
assert.equal(q.get().story.ch4Done, true);
assert.equal(q.tideSave().ending, '');
assert.match(q.tideInteraction(801).label, /LOWER WELL/);
q.tideInteraction(801).act();
assert.equal(q.getSaveData().platformScene, 'well');
q.applySave({ ...legacy, story: { ch4Done: false } }); q.place('court', 801);
assert.equal(q.tideInteraction(801), null);

q.applySave(legacy); q.place('village', 267); q.openTide('forge');
q.tideKey('arrowdown'); q.tideKey('e');
assert.equal(q.tideSave().forge.sword, 1);
assert.equal(q.get().inventory.coins, 64);
q.tideKey('e');
assert.equal(q.tideSave().forge.sword, 2);
q.tideKey('e');
assert.equal(q.get().inventory.coins, 36);
for (let n = 0; n < 50; n++) q.tideWearBlade();
assert.equal(q.tideSave().wear.sword, 100);
q.down(); assert.equal(q.chooseOpeningMove(), 'undertow');
q.tideKey('arrowup'); q.tideKey('e');
assert.equal(q.tideSave().wear.sword, 0);
assert.equal(q.get().inventory.coins, 28);
q.openTide('outfit'); q.stash('coins', 50);
const base = q.totalDefense();
q.tideKey('e'); q.tideKey('arrowdown'); q.tideKey('e');
assert.equal(q.totalDefense(), base + 4);
q.tideKey('e'); assert.equal(q.totalDefense(), base + 1);
q.openTide('cook'); q.tideKey('e');
assert.equal(q.get().inventory.chowder, 0);
q.stash('saltfin', 1); q.tideKey('e');
assert.equal(q.get().inventory.saltfin, 0);
assert.equal(q.consumeItem('chowder', false), true);
assert.equal(q.tideSave().mealTime, 90);
const saved = q.getSaveData();
q.applySave(saved);
assert.equal(q.tideSave().meal, 'chowder');
assert.equal(q.tideSave().forge.sword, 2);
assert.equal(q.tideSave().cowlOn, true);

q.applySave(legacy); q.place('village', 810); q.tideKey('escape');
q.tideInteraction(810).act(); q.tideInteraction(810).act();
assert.equal(q.get().inventory.saltfin, 0);
q.tideInteraction(810).act();
q.updateFishing(q.get().tideFishing.bite + .01); q.tideInteraction(810).act();
assert.equal(q.get().inventory.saltfin, 1);
q.tideInteraction(670).act(); q.closeDialogue();
q.tideInteraction(670).act(); q.closeDialogue();
assert.equal(q.get().inventory.saltfin, 0);
assert.equal(q.get().story.netReturned, true);
q.tideInteraction(1450).act();
assert.equal(q.getSaveData().platformScene, 'vault');
q.tideInteraction(608).act(); assert.equal(q.tideInteraction(608), null);
assert.equal(q.get().inventory.coins, 138);

q.place('ring', 220); q.tideArenaStart();
for (let n = 1; n <= 3; n++) {
  q.updateTideWorld(2);
  assert.equal(q.get().tideArena.wave, n);
  assert.ok(q.get().sideMobs.every(m => m.arenaWave));
  q.completeWave();
}
q.updateTideWorld(2); assert.equal(q.tideSave().arenaWins, 1);
q.updateTideWorld(2); assert.equal(q.get().inventory.coins, 188);

for (const outcome of ['shutter', 'homeward']) {
  q.applySave({ ...legacy, story: { ch4Done: true, wellBossDone: true } }); q.place('well', 1928);
  q.tideEnding('homeward'); assert.equal(q.tideSave().ending, '');
  if (outcome === 'homeward') q.reveal('wellnames');
  q.tideEnding(outcome); q.closeDialogue();
  assert.equal(q.tideSave().ending, outcome);
  assert.equal(q.get().inventory.coins, 125);
  q.tideEnding(outcome);
  assert.equal(q.get().inventory.coins, 125);
  q.applySave(q.getSaveData());
  assert.equal(q.tideSave().ending, outcome);
}
console.log('Salt Coast regression checks passed: legacy saves, temper/repair, mastery, armor set, cooking, fishing, treasure, arena and both endings.');
