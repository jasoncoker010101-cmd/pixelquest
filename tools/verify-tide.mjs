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
    down: () => keys.add('s'), completeWave: () => { for (const m of tideArena.mobs) m.dead = true; },
    interact: () => nearbyInteraction(),
    defeat: type => defeatMob(sideMobs.find(m => m.type === type), 1),
    music: desiredMusic, startAmbush: startNickAmbush,
    stepAmbush: updateNickAmbush, health: () => stats.health, boss: theBoss,
    ring: key => ringFerryBell(BELLS.find(b => b.key === key)),
    clearControls: clearHeldInput, currentWeapon
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

q.applySave({ ...legacy, story: { chapterDone: true, ch2Started: true, metWren: true, pages: ['watch'] } });
q.clearControls();
q.place('pass', 1971);
assert.match(q.interact().label, /WORK ORDER/);
q.interact().act(); q.closeDialogue();
assert.equal(q.get().story.seamOrder, true);
q.place('cinder', 1255);
q.interact().act();
assert.equal(q.getSaveData().platformScene, 'seam');
assert.equal(q.get().story.seamSeen, true);
q.place('seam', 245); q.interact().act();
assert.ok(q.get().story.fires.includes('seam'));
q.place('seam', 1052); q.interact().act();
assert.equal(q.get().inventory.seamore, 0);
q.defeat('seamFiend');
q.interact().act();
assert.equal(q.get().inventory.seamore, 1);
assert.equal(q.interact(), null);
q.applySave(q.getSaveData());
q.place('seam', 1052);
assert.ok(!q.get().sideMobs.some(m => m.type === 'seamFiend'));
assert.equal(q.interact(), null);
q.place('pass', 1971);
const beforePay = q.get().inventory.coins;
q.interact().act();
assert.equal(q.get().inventory.coins, beforePay + 24);
q.interact().act(); q.closeDialogue();
assert.equal(q.get().inventory.coins, beforePay + 24);

q.place('pass', 1750);
assert.match(q.interact().label, /VI.*FORGE/);
q.interact().act();
for (let i = 0; i < 3; i++) q.tideKey('arrowdown');
q.tideKey('e'); q.tideKey('e');
assert.equal(q.get().inventory.seamore, 1, 'A failed recipe must not spend other materials');
assert.equal(q.get().inventory.coins, beforePay + 24);
q.tideKey('escape');
q.place('pass', 2070);
q.startAmbush(); const musicStart = q.music().bossIntro;
q.stepAmbush(3.8);
assert.ok(q.music().bossIntro > musicStart);
q.stepAmbush(1.4);
assert.equal(q.health(), 1);
q.stepAmbush(3.4);
assert.equal(q.health(), 1);
assert.equal(q.get().story.nickAmbushed, true);
assert.equal(q.getSaveData().sideX, 1917);
q.applySave(q.getSaveData());
assert.equal(q.health(), 1);
q.place('pass', 2094); q.interact().act();
assert.equal(q.getSaveData().platformScene, 'frost');
assert.equal(q.boss().type, 'nick');
q.defeat('nick');
assert.equal(q.get().inventory.frostcore, 1);
assert.equal(q.get().story.passBossDefeated, false, 'Optional boss must not complete Chapter 2');
q.place('pass', 1750); q.interact().act();
for (let i = 0; i < 3; i++) q.tideKey('arrowdown');
q.tideKey('e'); q.tideKey('e');
assert.equal(q.currentWeapon(), 'frostedge');
assert.equal(q.get().inventory.seamore, 0);
assert.equal(q.get().inventory.frostcore, 0);
q.tideKey('e');
assert.equal(q.get().inventory.frostedge, 1);
q.tideKey('escape');
q.applySave(q.getSaveData());
assert.equal(q.currentWeapon(), 'frostedge');
assert.ok(q.get().story.pages.includes('watch'), 'Existing journals keep their learned stories');

q.applySave({ ...legacy, story: { ch4Done: false, saltBossDone: true } });
q.place('harbor', 260);
assert.match(q.interact().label, /NESSA/); q.interact().act(); q.closeDialogue();
assert.ok(q.get().story.pages.includes('ferrysong'));
for (const key of ['shell', 'star', 'anchor']) q.ring(key);
assert.equal(q.get().story.ferryOpened, true);
q.place('court', 655); q.interact().act(); q.closeDialogue();
assert.equal(q.get().story.ch4Done, true);
q.place('vault', 1960); q.interact().act(); q.closeDialogue();
assert.ok(q.get().story.pages.includes('wellnames'));
console.log('Exploration regression checks passed: work order, cave, checkpoint, guarded cache, payout, ambush, save, boss trophy, crafting, and spoken quest clues.');
