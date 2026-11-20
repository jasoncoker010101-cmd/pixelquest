import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../world.js', import.meta.url), 'utf8');
const marker = '  return { init, update, draw, stop,';
assert(source.includes(marker));
const gradient = { addColorStop() {} };
const ink = new Proxy({}, {
  get: (target, key) => target[key] ?? (key === 'measureText' ? text => ({ width: text.length * 5 })
    : String(key).endsWith('Gradient') ? () => gradient : () => {}),
});
class Media { play() { return Promise.resolve(); } pause() {} }
const runtime = {
  Image: Media, Audio: Media, window: {}, setTimeout: () => {},
  document: { createElement: () => ({ getContext: () => ink }) }
};
const hook = `
  canvas = { width: 320, height: 240 }; ctx = document.createElement('canvas').getContext('2d'); map = buildMap();
  window.roadQA = {
    reset(save = {}) {
      panel = null; paused = false; time = 0; hitStop = 0; platformMode = true; introActive = false;
      applySave(save); clearHeldInput();
      Object.assign(sidePlayer, { deadTime: 0, hurtTime: 0, roll: null, atk: null, onGround: true, y: SIDE_GROUND_Y });
      enterRegion(save.platformScene || 'forest', save.sideX || 100, 1);
    },
    pos(x) { sidePlayer.x = x; sidePlayer.y = SIDE_GROUND_Y; sidePlayer.onGround = true; },
    interaction: nearbyInteraction, save: getSaveData, draw: drawPlatformer, openShop, buyShopItem,
    shop: () => ({ shopkeeper, stock: shopStock().map(item => item.name) }),
    mobs: () => sideMobs, defeat(type) { defeatMob(sideMobs.find(m => m.type === type && !m.dead), 1); },
    residents: () => townActors, lore: () => LORE, map: TIDE_MAP, fires: FIRES, roads: TOWN_ROADS,
    portrait: drawPortrait,
    castIdentity: id => id === 'morwen' ? 'storybook:0' : Object.hasOwn(DISTINCT_TOWN_ROWS, id) ? 'storybook:' + DISTINCT_TOWN_ROWS[id]
      : Object.hasOwn(WATCH_CAST_ROWS, id) ? 'watch:' + WATCH_CAST_ROWS[id] : residentArt[id] ? 'resident:' + id : null,
    openFireMap: openFastTravelMap,
    seal: () => ({ x: WATCH_SEAL_X, dad: dad?.x, arenaLeft: REGIONS.hollow.arena.left, outro: !!bossOutro }),
    tickBossOutro: updateBossOutro,
    pose: (who, walk, portrait) => villageNpcFrame(who, walk, portrait),
    travel: fastTravel, moonThreshold, tick: update, controllerAction,
    capture(fn) { onSave = fn; },
    finish() {
      const heard = dialogue.lines.map(l => l.who);
      while (dialogue) { time += .17; dialogue.shown = dialogue.lines[dialogue.i].text.length; advanceDialogue(); }
      return heard;
    },
    key(k) { onKeyDown({ key: k, preventDefault() {}, stopPropagation() {} }); },
    pointer() { onCanvasPointer({ preventDefault() {} }); },
    phaseBossTypes: Object.keys(PHASE_SHOWS),
    phaseBoss(type) {
      const boss = makeMob(type, sidePlayer.x + 52, 80, 0);
      sideMobs.splice(0, sideMobs.length, boss); boss.dormant = false;
      bossFight = { active: true, ev: {} };
      damageMob(boss, boss.maxHp + 2, 1, 0, true, false);
      return boss;
    },
    hitBoss(boss) { damageMob(boss, 4, 1, 0, false, false); },
    phase() { return { active: bossFight.active, cine: bossFight.phaseTwo, adds: sideMobs.filter(m => m.summoned).length }; },
    state() { return { moon: moonVisit?.beat, panel, paused, count: mobShots.length + bossWaves.length + playerWaves.length,
      held: keys.size, attack: !!sidePlayer.atk, dialogue: dialogue?.lines[dialogue.i].who }; }
  };
`;
new vm.Script(source.replace(marker, hook + marker)).runInNewContext(runtime);
const q = runtime.window.roadQA;
const prior = { houseSpawnMigrated: true, equipment: { armor: true }, inventory: { coins: 100 },
  stats: { health: 15, maxHealth: 30, level: 9 }, story: { metBram: true } };
const action = (x, label) => { q.pos(x); const spot = q.interaction(); assert.match(spot?.label || '', label); spot.act(); };
const current = (id) => assert.equal(q.save().platformScene, id);
const talked = id => assert(q.finish().includes(id), `Missing dialogue for ${id}`);

q.reset(prior);
const distinct = ['morwen', 'sayo', 'neri', 'aki', 'reeve', 'senn'].map(q.castIdentity);
assert(distinct.every(id => /^(storybook|watch):\d$/.test(id)));
assert.equal(new Set(distinct).size, distinct.length);
action(151, /ALDER/); current('aldersend'); assert(q.save().story.aldersendVisited);
action(45, /WOODLAND/); current('forest');
action(151, /ALDER/);
for (const n of [...q.residents()]) {
  assert(q.castIdentity(n.id), `Missing sprite for ${n.id}`);
  action(n.x, new RegExp(n.id === 'reeve' ? 'REEVE' : n.id, 'i'));
  if (n.id === 'linnet') assert.equal(q.pose(n.id).pose, 'talk');
  talked(n.id); q.portrait(n.id, 0, 0);
  assert(q.save().story['met_' + n.id]);
  if (n.id === 'elin') {
    assert.equal(q.shop().shopkeeper, 'elin');
    assert(!q.shop().stock.includes('Fortune Wheel'));
    q.buyShopItem(0); assert.equal(q.save().inventory.bread, 1);
    q.key('Escape');
  }
}
assert.equal(q.save().stats.health, 30);
assert(q.save().story.alderOrder);
action(795, /SQUARE BOARD/); talked('page');
action(650, /FAST TRAVEL/); assert(q.save().story.fires.includes('alderfire'));
action(1650, /ORCHARD/); current('orchard'); q.draw();
q.pos(974); assert(!q.interaction(), 'Shortcut opens only after clearing the shed');
q.defeat('granarycat'); assert(q.save().story.granaryCleared);
action(974, /HEDGE/); current('aldersend');
action(1368, /FENNA/); talked('fenna'); assert(q.save().story.alderPaid);
const paid = q.save().inventory.coins;
action(1368, /FENNA/); talked('fenna'); assert.equal(q.save().inventory.coins, paid);
const orchardSave = q.save();
q.reset({ ...orchardSave, platformScene: 'orchard', sideX: 74 });
assert(!q.mobs().some(m => m.type === 'granarycat'));
assert(q.save().story.pages.includes('alderorder'));

q.reset({ ...prior, platformScene: 'hollow', story: { ...prior.story, hollowSeen: true } });
const seal = q.seal();
assert(seal.x < seal.dad && seal.dad < seal.arenaLeft, 'The seal must be on the approach to the arena');
action(seal.dad, /TALK TO DAD/); talked('aldric');
assert(!q.save().story.dadFound && !q.save().story.chapterDone);
q.pos(3240); assert(!q.interaction(), 'Ashen Pass is locked before defeating Grukk');
q.defeat('ogre');
const aftermath = q.save();
assert(aftermath.story.bossDefeated && !aftermath.story.dadFound && aftermath.inventory.watchblade === 1);
assert(q.seal().outro);
for (let i = 0; i < 56; i++) q.tickBossOutro(.033);
assert(!q.seal().outro && !q.save().story.dadFound, 'The victory beat must not trigger an automatic reunion');
q.reset({ ...aftermath, sideX: 3060 });
assert(!q.seal().outro && !q.interaction(), 'Legacy post-boss saves lead to the seal and not the old throne position');
action(3240, /CHECK THE EAST ROAD/); current('hollow');
action(seal.dad, /HOLD THE SEAL/); talked('aldric');
const reunited = q.save();
assert(reunited.story.dadFound && reunited.story.chapterDone && reunited.story.pages.includes('aldric') && !reunited.story.ch2Started);
q.reset(reunited);
action(3240, /TALK TO DAD FIRST/);
action(seal.dad, /TALK TO DAD/); talked('aldric');
assert(q.save().story.ch2Started && q.save().story.pages.includes('oath'));
q.reset(q.save());
action(3240, /ASHEN PASS/); current('pass');

const ch3 = { ...prior, platformScene: 'gloam', sideX: 2153,
  story: { ...prior.story, chapterDone: true, ch2Done: true, gloamEntered: true, gloamGate: true,
    gloamBossDefeated: true, ch3Done: true, pages: ['seren'] } };
q.reset(ch3);
action(2153, /GATEWARD/); current('gateward'); q.draw();
action(1520, /SIGNAL TOWER/); talked('rowan');
for (const n of [...q.residents()]) {
  assert(q.castIdentity(n.id), `Missing sprite for ${n.id}`);
  action(n.x, new RegExp(n.id, 'i')); talked(n.id);
  if (n.id === 'nessel') {
    assert.equal(q.shop().shopkeeper, 'nessel');
    assert.equal(q.pose('nessel', 0, true).pose, 'sell');
    assert(q.shop().stock.includes('Iron Plating'));
    assert(!q.shop().stock.includes('Whetstone')); q.key('Escape');
  }
}
action(679, /FAST TRAVEL/); assert(q.save().story.fires.includes('gatewardfire'));
action(999, /FLOOD MARKS/); talked('page');
action(1520, /ANNEX/); current('annex'); q.draw();
action(1550, /LOCKER/); talked('rowan'); assert(!q.save().story.lampRecovered);
assert(q.mobs().some(m => m.type === 'veilscribe'));
q.defeat('veilscribe');
action(1550, /LOCKER/); talked('rowan'); assert(q.save().story.lampRecovered);
action(45, /GATEWARD/); current('gateward');
action(1110, /TOVE/); talked('tove'); assert(q.save().story.lampPaid);
assert(q.save().story.pages.includes('lampsigil'));
assert(q.map.find(node => node.id === 'annex').show());
action(45, /GLOAMHOLD/); current('gloam');
q.openShop(); assert(q.shop().stock.includes('Fortune Wheel')); q.key('Escape');

q.reset({ ...ch3, sideX: 4660 });
assert(q.moonThreshold());
assert(!q.interaction(), 'Quay remains locked before the scene');
const health = q.save().stats.health, x = q.save().sideX;
let saved;
q.capture(s => { saved = s; });
q.tick(.016);
assert.equal(q.state().moon, 'omen');
q.key('j'); q.key('p'); q.key('d'); q.controllerAction('attack'); q.controllerAction('pause'); q.pointer();
assert.equal(q.state().held, 0);
assert.equal(q.state().paused, false);
assert.equal(q.state().attack, false);
for (let i = 0; i < 76; i++) { q.tick(.033); q.draw(); }
assert.equal(q.state().moon, 'speak');
assert.equal(q.state().count, 0);
assert(!q.mobs().some(m => ['moonkeeper', 'veilscribe'].includes(m.type)));
assert.deepEqual([...new Set(q.finish())], ['veilscribe', 'moonkeeper', 'rowan']);
assert.equal(q.state().moon, 'depart');
for (let i = 0; i < 55; i++) { q.tick(.033); q.draw(); }
assert.equal(q.state().moon, undefined);
assert.equal(q.save().sideX, x);
assert.equal(q.save().stats.health, health);
assert(saved.story.moonVisitSeen && saved.story.pages.includes('moonvisit') && saved.story.pages.includes('seren'));
q.reset(saved);
assert(!q.moonThreshold());
action(4650, /LANTERN QUAY/); current('harbor');
q.reset({ ...ch3, platformScene: 'harbor', sideX: 100, story: { ...ch3.story, harborEntered: true } });
assert(!q.moonThreshold(), 'A legacy Quay save does not need to replay Gloamhold');
q.reset({ ...prior, platformScene: 'village', sideX: 351 });
assert.equal(q.pose('orrin').pose, 'work');
assert.equal(q.pose('orrin', 0, true).pose, 'idle');
assert.equal(q.pose('martin', 0.4).pose, 'walk');
for (const n of [...q.residents()]) { action(n.x, new RegExp(n.id, 'i')); talked(n.id); }
q.draw();

for (const [i, type] of q.phaseBossTypes.entries()) {
  q.reset({ ...prior, platformScene: 'hollow', sideX: 2900 });
  const boss = q.phaseBoss(type), halfway = Math.ceil(boss.maxHp / 2);
  assert.equal(boss.hp, halfway, `${type} must stop at the phase boundary`);
  assert(q.phase().cine);
  q.hitBoss(boss);
  assert.equal(boss.hp, halfway, 'No damage during the phase-two entrance');
  if (i % 2) q.key('e');
  for (let j = 0; j < 119 && q.phase().cine; j++) { q.tick(.033); q.draw(); }
  assert(q.phase().active && boss.enraged && !q.phase().cine, `${type} returns to combat`);
  assert.equal(q.phase().adds, 1, 'Only one phase-two reinforcement spawns');
}

console.log('Court Road regression checks passed: distinct cast, both town routes, shops, campfires, errands, Watch seal and reloads, Moon encounter, and legacy east-road progression.');
console.log('Phase-two regression checks passed for all boss forms, including skip and normal completion.');
