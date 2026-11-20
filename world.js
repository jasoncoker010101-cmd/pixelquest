// world.js - Pixelquest overworld
const Overworld = (() => {
  const TILE = 16;
  const MAP_W = 40;
  const MAP_H = 30;
  const SPEED = 60;
  const SOLID = new Set(['B', 'W', 'H', 'R', 'D']);
  const SPAWN = { x: 20, y: 15 };
  const GAME_KEYS = ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'];

  let canvas, ctx, onExit, onSave, saveTimer = 0, map = [];
  let time = 0;

  // All playable scenes use side-view platform controls.
  const SIDE_GROUND_Y = 196;
  const HOUSE_SIDE_WIDTH = 960;
  const FOREST_SIDE_WIDTH = 4000;
  let platformMode = true;
  let platformScene = 'house';
  let sideCameraX = 0;
  let sideJumpQueued = false;
  let sideAttackQueued = false;
  let sideRollQueued = false, sideUpperQueued = false, flashUntil = 0;
  let dadNoteRead = false;
  let armorTutorialPending = false;
  let armorQuestActive = false;
  const sidePlayer = { x: 410, y: SIDE_GROUND_Y, vx: 0, vy: 0, onGround: true, facing: 1, moving: false, walk: 0, attackTime: 0, attackCooldown: 0, hurtTime: 0, invulnTime: 0, deadTime: 0, atk: null, deathAge: 0 };
  const HOUSE_SIDE_PLATFORMS = [
    { x: 0, y: SIDE_GROUND_Y, w: HOUSE_SIDE_WIDTH, h: 44 },
    { x: 24, y: 160, w: 82, h: 10 },
    { x: 110, y: 151, w: 54, h: 9 },
    { x: 344, y: 160, w: 82, h: 10 },
    { x: 532, y: 158, w: 88, h: 10 },
    { x: 688, y: 158, w: 88, h: 10 }
  ];
  const FOREST_SIDE_PLATFORMS = [
    { x: 0, y: SIDE_GROUND_Y, w: FOREST_SIDE_WIDTH, h: 44 },
    { x: 276, y: 160, w: 104, h: 10 },
    { x: 452, y: 139, w: 104, h: 10 },
    { x: 666, y: 160, w: 116, h: 10 },
    { x: 884, y: 132, w: 104, h: 10 },
    { x: 1092, y: 158, w: 116, h: 10 },
    { x: 1300, y: 120, w: 104, h: 10 },
    { x: 1510, y: 154, w: 140, h: 10 },
    { x: 1760, y: 132, w: 110, h: 10 },
    { x: 1985, y: 160, w: 140, h: 10 },
    { x: 2230, y: 122, w: 110, h: 10 },
    { x: 2450, y: 154, w: 150, h: 10 },
    { x: 2700, y: 132, w: 110, h: 10 },
    { x: 2910, y: 160, w: 124, h: 10 },
    { x: 3150, y: 130, w: 110, h: 10 },
    { x: 3370, y: 154, w: 140, h: 10 }
  ];
  const HOLLOW_SIDE_WIDTH = 3300;
  // The Hollow: a haunted wood past the forest camp, ending in the Hollow King's arena.
  const HOLLOW_SIDE_PLATFORMS = [
    { x: 0, y: SIDE_GROUND_Y, w: HOLLOW_SIDE_WIDTH, h: 44 },
    { x: 300, y: 158, w: 128, h: 10 },
    { x: 560, y: 132, w: 112, h: 10 },
    { x: 980, y: 150, w: 144, h: 10 },
    { x: 1240, y: 124, w: 112, h: 10 },
    { x: 1700, y: 156, w: 128, h: 10 },
    { x: 1960, y: 130, w: 112, h: 10 },
    { x: 2280, y: 150, w: 144, h: 10 }
  ];
  // Chapter 2: the Ashen Pass, a red-rock canyon beyond the Hollow.
  const PASS_SIDE_WIDTH = 4300;
  const PASS_SIDE_PLATFORMS = [
    { x: 0, y: SIDE_GROUND_Y, w: PASS_SIDE_WIDTH, h: 44 },
    { x: 420, y: 160, w: 96, h: 12 }, { x: 610, y: 132, w: 80, h: 12 },
    { x: 1080, y: 156, w: 112, h: 12 }, { x: 1290, y: 126, w: 96, h: 12 }, { x: 1480, y: 150, w: 80, h: 12 },
    { x: 2300, y: 158, w: 112, h: 12 }, { x: 2510, y: 128, w: 96, h: 12 }, { x: 2720, y: 104, w: 80, h: 12 },
    { x: 2960, y: 150, w: 128, h: 12 }, { x: 3260, y: 132, w: 96, h: 12 }
  ];
  // Chapter 3: Gloamhold, the drowned city of the Silver Watch.
  const GLOAM_SIDE_WIDTH = 4700;
  const GLOAM_SIDE_PLATFORMS = [
    { x: 0, y: SIDE_GROUND_Y, w: GLOAM_SIDE_WIDTH, h: 44 },
    { x: 380, y: 160, w: 96, h: 12 }, { x: 600, y: 134, w: 64, h: 12 }, { x: 860, y: 156, w: 128, h: 12 },
    { x: 1180, y: 128, w: 96, h: 12 }, { x: 1420, y: 154, w: 96, h: 12 }, { x: 1660, y: 120, w: 64, h: 12 },
    { x: 2520, y: 158, w: 128, h: 12 }, { x: 2760, y: 130, w: 96, h: 12 }, { x: 3000, y: 106, w: 64, h: 12 },
    { x: 3240, y: 150, w: 128, h: 12 }, { x: 3520, y: 126, w: 96, h: 12 }
  ];
  // Every outdoor region: size, boss arena, campfires and where you arrive.
  const REGIONS = {
    forest: { name: 'WOODLAND', width: FOREST_SIDE_WIDTH, entry: 72, color: '#ffe3a1' },
    hollow: { name: 'THE HOLLOW', width: HOLLOW_SIDE_WIDTH, entry: 130, color: '#c9a8ff', arena: { left: 2640, right: 3200, trigger: 2700 }, boss: 'ogre', bossX: 3020, bossFlag: 'bossDefeated' },
    pass:   { name: 'ASHEN PASS', width: PASS_SIDE_WIDTH, entry: 90, color: '#ffb48a', arena: { left: 3680, right: 4240, trigger: 3740 }, boss: 'mare', bossX: 4080, bossFlag: 'passBossDefeated' },
    gloam:  { name: 'GLOAMHOLD', width: GLOAM_SIDE_WIDTH, entry: 90, color: '#8fd8ff', arena: { left: 4080, right: 4640, trigger: 4140 }, boss: 'demon', bossX: 4460, bossFlag: 'gloamBossDefeated' },
    harbor: { name: 'LANTERN QUAY', width: 920, entry: 66, color: '#ffe1a1', peaceful: true, plats: [{ x: 0, y: SIDE_GROUND_Y, w: 920, h: 44 }] },
    court: { name: 'THE PALE COURT', width: 846, entry: 65, color: '#b8e5d0', peaceful: true, plats: [{ x: 0, y: SIDE_GROUND_Y, w: 846, h: 44 }] }
  };
  // Rest points (also fast-travel points on the world map).
  const FIRES = [
    { id: 'camp', scene: 'forest', x: 3700, name: "Bram's Camp" },
    { id: 'lookout', scene: 'pass', x: 1900, name: "Wren's Lookout" },
    { id: 'gate', scene: 'gloam', x: 2240, name: 'Gloamhold Gate' },
    { id: 'quay', scene: 'harbor', x: 177, name: 'Lantern Quay' }
  ];
  function region() { return REGIONS[platformScene] || REGIONS.forest; }
  // The live arena follows the current region (kept as one object so older code keeps working).
  const BOSS_ARENA = { left: 2640, right: 3200, trigger: 2700 };
  function syncArena() { Object.assign(BOSS_ARENA, region().arena || { left: 1e9, right: 1e9, trigger: 1e9 }); }
  // Monster roster. Sheets are single-row strips; ax/ay is the feet anchor inside a cell.
  // LuizMelo's "Monsters Creatures Fantasy" creatures face right, Ansimuz's ghost and ogre face left.
  const MOB_TYPES = {
    goblin:   { name: 'Goblin', src: 'mobs/goblin/', anims: { idle: ['idle', 4, 8], move: ['run', 8, 13], attack: ['attack', 8], hurt: ['take_hit', 4], death: ['death', 4] },
                fw: 150, fh: 150, ax: 75, ay: 101, scale: 1.12, bodyH: 40, width: 20, hp: 5, speed: 82, chase: 230, reach: 46, dmg: 4,
                atkTime: 0.72, hit: [0.7, 0.92], cd: [1.3, 1.8], xp: 12, coins: [2, 5], drops: [['fang', 0.6], ['tonic', 0.16], ['bread', 0.14]], voice: 'goblin', kind: 'goblin' },
    skeleton: { name: 'Skeleton', src: 'mobs/skeleton/', anims: { idle: ['idle', 4, 6], move: ['walk', 4, 7], attack: ['attack', 8], hurt: ['take_hit', 4], death: ['death', 4], block: ['shield', 4] },
                fw: 150, fh: 150, ax: 78, ay: 101, scale: 1.0, bodyH: 50, width: 22, hp: 9, speed: 50, chase: 220, reach: 54, dmg: 5,
                atkTime: 0.95, hit: [0.72, 0.92], cd: [1.6, 2.2], xp: 20, coins: [3, 6], drops: [['bone', 0.65], ['boneblade', 0.12]], voice: 'bones', block: 0.28 },
    mushroom: { name: 'Shroom', src: 'mobs/mushroom/', anims: { idle: ['idle', 4, 6], move: ['run', 8, 11], attack: ['attack', 8], hurt: ['take_hit', 4], death: ['death', 4] },
                fw: 150, fh: 150, ax: 75, ay: 101, scale: 1.0, bodyH: 36, width: 18, hp: 7, speed: 46, chase: 180, reach: 38, dmg: 3,
                atkTime: 0.8, hit: [0.72, 0.92], cd: [1.4, 2.0], xp: 14, coins: [1, 4], drops: [['spore', 0.6], ['berries', 0.3]], voice: 'squish' },
    eye:      { name: 'Watcher', src: 'mobs/flying_eye/', anims: { idle: ['flight', 8, 12], move: ['flight', 8, 15], attack: ['attack', 8], hurt: ['take_hit', 4], death: ['death', 4] },
                fw: 150, fh: 150, ax: 77, ay: 92, scale: 0.9, bodyH: 28, width: 18, fly: 50, hp: 4, speed: 96, chase: 240, reach: 40, dmg: 3,
                atkTime: 0.7, hit: [0.7, 0.92], cd: [1.4, 2.0], xp: 15, coins: [1, 4], drops: [['eye', 0.5]], voice: 'eye' },
    ghost:    { name: 'Wraith', src: 'hollow/', anims: { idle: ['ghost-idle', 7, 8], move: ['ghost-chase', 4, 9], attack: ['ghost-shriek', 4], hurt: null, death: ['ghost-vanish', 7] },
                fw: 64, fh: 80, ax: 32, ay: 61, faceLeft: true, scale: 1.0, bodyH: 40, width: 18, fly: 14, alpha: 0.88, hp: 6, speed: 66, chase: 260, reach: 42, dmg: 4,
                atkTime: 0.8, hit: [0.45, 0.85], cd: [1.5, 2.1], xp: 18, coins: [2, 5], drops: [['wisp', 0.5]], voice: 'ghost' },
    ogre:     { name: 'Grukk, the Hollow King', boss: true, src: 'hollow/', anims: { idle: ['ogre-idle', 4, 6], move: ['ogre-walk', 6, 8], attack: ['ogre-attack', 7], hurt: null, death: null },
                fw: 144, fh: 80, ax: 62, ay: 80, faceLeft: true, scale: 1.35, bodyH: 76, width: 36, hp: 70, speed: 40, chase: 700, reach: 70, dmg: 8,
                atkTime: 1.25, hit: [0.57, 0.72], cd: [1.0, 1.6], xp: 150, coins: [25, 30], drops: [['crown', 1]], voice: 'ogre', armor: true, short: 'Grukk',
                enrageText: 'Grukk roars and the Hollow answers...', summon: 'ghost' },
    // ---- Chapter 2 and 3 creatures (Ansimuz Gothicvania, CC0; all face left) ----
    hound:    { name: 'Ash Hound', src: 'beasts/', anims: { idle: ['hound-idle', 11, 10], move: ['hound-run', 5, 14], attack: ['hound-jump', 6], hurt: null, death: null },
                fw: 64, fh: 48, ax: 34, ay: 48, faceLeft: true, scale: 1.15, bodyH: 26, width: 34, hp: 7, speed: 118, chase: 260, reach: 44, dmg: 5, pounce: 230,
                atkTime: 0.6, hit: [0.3, 0.75], cd: [1.2, 1.8], xp: 18, coins: [2, 5], drops: [['ember', 0.55], ['bread', 0.1]], voice: 'hound' },
    crow:     { name: 'Carrion Crow', src: 'beasts/', anims: { idle: ['crow-fly', 2, 8], move: ['crow-fly', 2, 10], attack: ['crow-fly', 2], hurt: null, death: null },
                fw: 48, fh: 48, ax: 26, ay: 40, faceLeft: true, scale: 1, bodyH: 22, width: 18, fly: 62, dive: true, hp: 3, speed: 110, chase: 250, reach: 40, dmg: 3,
                atkTime: 0.75, hit: [0.4, 0.75], cd: [1.2, 1.9], xp: 10, coins: [1, 3], drops: [['feather', 0.6]], voice: 'crow' },
    skull:    { name: 'Fire Skull', src: 'beasts/', anims: { idle: ['skull-fire', 8, 12], move: ['skull-fire', 8, 14], attack: ['skull-fire', 8], hurt: null, death: null },
                fw: 96, fh: 112, ax: 46, ay: 92, faceLeft: true, scale: 0.55, bodyH: 30, width: 22, fly: 46, ranged: true, hp: 5, speed: 52, chase: 230, reach: 150, dmg: 4,
                atkTime: 0.8, hit: [0.5, 0.6], cd: [1.8, 2.6], xp: 16, coins: [2, 4], drops: [['ember', 0.5]], voice: 'skull', light: '255,140,60' },
    lamp:     { name: 'Lamplighter', src: 'beasts/', anims: { idle: ['lamp-walk', 6, 6], move: ['lamp-walk', 6, 9], attack: ['lamp-walk', 6], hurt: null, death: ['lamp-rise', 11, 12, 'rev'], rise: ['lamp-rise', 11, 12] },
                fw: 32, fh: 48, ax: 15, ay: 48, faceLeft: true, scale: 1.2, bodyH: 38, width: 18, hp: 9, speed: 40, chase: 220, reach: 40, dmg: 5,
                atkTime: 0.8, hit: [0.55, 0.8], cd: [1.4, 2.0], xp: 22, coins: [3, 6], drops: [['lampglass', 0.55], ['tonic', 0.12]], voice: 'ghost', light: '255,200,110', riser: true },
    toad:     { name: 'Bog Toad', src: 'beasts/', anims: { idle: ['toad-idle', 4, 6], move: ['toad-jump', 4, 8], attack: ['toad-attack', 3], hurt: null, death: null },
                fw: 80, fh: 64, ax: 38, ay: 64, scale: 1.0, bodyH: 34, width: 40, hp: 16, speed: 34, chase: 200, reach: 62, dmg: 6,
                atkTime: 0.9, hit: [0.6, 0.85], cd: [1.6, 2.4], xp: 26, coins: [3, 7], drops: [['toadskin', 0.6]], voice: 'squish' },
    mare:     { name: 'Ashmane, the Pale Mare', boss: true, ai: 'mare', src: 'beasts/', anims: { idle: ['mare-idle', 4, 7], move: ['mare-run', 3, 12], attack: ['mare-run', 3], hurt: null, death: null },
                fw: 160, fh: 96, ax: 82, ay: 95, faceLeft: true, scale: 1.0, bodyH: 62, width: 64, hp: 95, speed: 70, chase: 900, reach: 60, dmg: 8,
                atkTime: 1, hit: [0, 1], cd: [1, 1.6], xp: 260, coins: [40, 50], drops: [['palemane', 1], ['emberedge', 1]], voice: 'ogre', armor: true, short: 'Ashmane',
                enrageText: 'Ashmane screams. Hounds answer from the cliffs...', summon: 'hound' },
    demon:    { name: 'Vael, the Moon-Eater', boss: true, ai: 'demon', src: 'beasts/', anims: { idle: ['demon-idle', 6, 8], move: ['demon-idle', 6, 10], attack: ['demon-breath', 18], hurt: null, death: null },
                fw: 312, fh: 220, ax: 190, ay: 186, faceLeft: true, scale: 0.72, bodyH: 84, width: 70, fly: 30, hp: 150, speed: 60, chase: 900, reach: 90, dmg: 9,
                atkTime: 1.5, hit: [0.42, 0.78], cd: [1, 1.6], xp: 420, coins: [60, 80], drops: [['sigil', 1], ['moonsilver', 1]], voice: 'ogre', armor: true, short: 'Vael',
                enrageText: 'Vael swallows the moonlight. The skulls burn brighter...', summon: 'skull' }
  };
  const SCENE_MOBS = {
    forest: [['mushroom', 900, 70], ['goblin', 1370, 90], ['eye', 1750, 110], ['goblin', 2050, 90], ['mushroom', 2450, 80],
             ['goblin', 2620, 70], ['goblin', 2900, 100], ['eye', 3150, 110], ['goblin', 3350, 90]],
    hollow: [['skeleton', 520, 90], ['ghost', 820, 120], ['mushroom', 1080, 80], ['skeleton', 1380, 90], ['eye', 1620, 120],
             ['ghost', 1900, 120], ['skeleton', 2160, 100], ['eye', 2400, 110], ['skeleton', 2500, 60]],
    pass:   [['hound', 520, 90], ['crow', 800, 120], ['hound', 1150, 100], ['skull', 1420, 90], ['crow', 1600, 110],
             ['hound', 2360, 110], ['skull', 2620, 100], ['toad', 2860, 70], ['hound', 3100, 100], ['crow', 3300, 120], ['skull', 3480, 80]],
    gloam:  [['lamp', 480, 70], ['crow', 720, 110], ['skeleton', 980, 90], ['lamp', 1260, 80], ['ghost', 1500, 120], ['toad', 1780, 70],
             ['lamp', 2620, 80], ['skull', 2860, 100], ['skeleton', 3080, 90], ['ghost', 3300, 120], ['lamp', 3560, 80], ['skull', 3800, 100], ['skeleton', 3900, 60]]
  };
  let sideMobs = [];
  function makeMob(type, x, range, i) {
    const T = MOB_TYPES[type];
    const dir = i % 2 ? 1 : -1;
    return { type, T, x, y: SIDE_GROUND_Y - (T.fly || 0), home: x, min: x - range, max: x + range, dir, patrolDir: dir, phase: i * 1.3,
      runUntil: 0, hp: T.hp, maxHp: T.hp, attackCooldown: 0.8 + i * 0.3, attackTime: 0, attackHit: true, hurtTime: 0, deadTime: 0, dead: false,
      respawn: 0, moving: false, kvx: 0, flash: 0, walk: 0, showHpUntil: 0, blockTime: 0, retreatTime: 0, bob: Math.random() * 6 };
  }
  function loadSceneMobs(scene) {
    sideMobs = (SCENE_MOBS[scene] || []).filter(([type]) => !MOB_TYPES[type].done || !story[MOB_TYPES[type].done])
      .filter(([type]) => (type !== 'reever' || !story.reeverDown) && (type !== 'seamFiend' || !story.seamCleared)).map(([type, x, range], i) => makeMob(type, x, range, i));
    sideMobs.forEach(m => { if (m.T.riser) m.dormant = true; if (!m.T.done && !['reever', 'seamFiend'].includes(m.type)) rollElite(m); });
    const R = REGIONS[scene];
    if (R && R.boss && !story[R.bossFlag]) {
      const boss = makeMob(R.boss, R.bossX, 120, 0);
      boss.dir = -1; boss.patrolDir = -1; boss.dormant = true;
      sideMobs.push(boss);
    }
  }
  // Story flags that persist in the save slot.
  const STORY_DEFAULTS = { campReached: false, hollowEntered: false, hollowSeen: false, metBram: false, rested: false, bossStarted: false, bossDefeated: false, dadFound: false, chapterDone: false,
    ch2Started: false, passEntered: false, metWren: false, passBossStarted: false, passBossDefeated: false, ch2Done: false,
    nickAmbushed: false, nickBossSeen: false, nickDefeated: false,
    gloamEntered: false, gloamGate: false, gloamBossStarted: false, gloamBossDefeated: false, ch3Done: false,
    harborEntered: false, ferryOpened: false, courtEntered: false, ch4Done: false, trailCache: false };
  const story = Object.assign({}, STORY_DEFAULTS, { pages: [], fires: [], lastFire: null });

  // First-play cinematic: illustrated Moonfall book, countryside, then the bedroom.
  let introActive = false, introTime = 0, introAudio = null, introWolfHowlOne = false, introWolfHowlTwo = false, introWolfHowlEcho = false;
  let introBookCue = -1;
  let introReplayOnly = false;
  const INTRO_SPACE_END = 8.5;
  const INTRO_LORE = [
    { id: 'long-winter', seconds: 11.0, heading: ['THE LONG', 'WINTER'] },
    { id: 'morwens-vow', seconds: 9.7, heading: ["MORWEN'S", 'VOW'] },
    { id: 'moonfall', seconds: 8.4, heading: ['THE', 'MOONFALL'] },
    { id: 'hollow-seal', seconds: 7.8, heading: ['THE', 'HOLLOW'] }
  ];
  const INTRO_LORE_LENGTH = INTRO_LORE.reduce((n, scene) => n + scene.seconds, 0);
  const INTRO_DURATION = 46.5 + INTRO_LORE_LENGTH;
  const INTRO_BOOK_END = INTRO_SPACE_END + INTRO_LORE_LENGTH;
  const INTRO_PAGE_STARTS = [0, INTRO_SPACE_END];
  for (const scene of INTRO_LORE) INTRO_PAGE_STARTS.push(INTRO_PAGE_STARTS.at(-1) + scene.seconds);
  const BOOK_OPEN_AT = .48, BOOK_OPEN_TIME = 1.05, BOOK_TURN_TIME = .66, BOOK_EXIT_TIME = 1.6;
  const INTRO_CAPTIONS = [
    [1.85, 7.9, "Come a little closer. That's Earth down there. Looks peaceful enough, doesn't it?"],
    [9.18, 15.25, 'Twenty winters ago, the moon went dark for nine nights. And on one of those nights…'],
    [15.25, 18.9, 'Morwen lost her little girl. Lys never woke.'],
    [19.99, 25.6, 'Come spring, Morwen reached up to pull the moon down herself.'],
    [25.6, 29.08, 'She meant to make another. One that would never, ever wane.'],
    [29.75, 37.43, 'The Silver Watch stopped her. But the moon? It broke. Burning pieces rained across the land.'],
    [38.13, 44.75, 'The biggest fell in the Hollow. They buried it. Sealed it away. Or so the Watch told us.'],
    [46.10, 52.48, "Oh, the years went by. Folks lit their hearths again. But the land didn't forget."],
    [52.58, 57.95, 'Where those pieces fell, beasts changed. Even the dead stopped resting.'],
    [61.0, 66.46, 'Hear that? Some nights, the wolves in those hills walk on two legs.'],
    [66.46, 70.16, 'Still, people make a home here. They always have.'],
    [75.80, 80.85, 'And here, right at the edge of it all… Rowan. Time to wake up.'],
  ];
  function introLoreAt(t) {
    for (let i = 0; i < INTRO_LORE.length; i++) {
      if (t >= INTRO_PAGE_STARTS[i + 1] && t < INTRO_PAGE_STARTS[i + 2]) {
        return { scene: INTRO_LORE[i], t: t - INTRO_PAGE_STARTS[i + 1] };
      }
    }
    return null;
  }
  function introCaptionAt(t) {
    return INTRO_CAPTIONS.find(([start, end]) => t >= start && t < end)?.[2] || null;
  }
  function introBookPage(t, lore = introLoreAt(t)) {
    return t < INTRO_SPACE_END ? 0 : lore ? INTRO_LORE.indexOf(lore.scene) + 1 : t < INTRO_BOOK_END + BOOK_EXIT_TIME ? 5 : 6;
  }
  function introBookPose(t, page = introBookPage(t), reduced = false) {
    const open = reduced ? Number(t >= BOOK_OPEN_AT) : smooth01((t - BOOK_OPEN_AT) / BOOK_OPEN_TIME);
    const age = t - INTRO_PAGE_STARTS[page];
    const turn = !reduced && page > 0 && page < 6 && age >= 0 && age < BOOK_TURN_TIME;
    return { open, turn, fold: turn ? Math.cos(Math.PI * smooth01(age / BOOK_TURN_TIME)) : 0,
      zoom: page === 5 ? smooth01((age - BOOK_TURN_TIME) / (BOOK_EXIT_TIME - BOOK_TURN_TIME)) : 0 };
  }
  let inputMode = 'keyboard';
  function setInputMode(mode) { inputMode = mode === 'pad' || mode === 'touch' ? mode : 'keyboard'; }
  const PAD_LABELS = { E: '✕', ENTER: '✕', SPACE: '✕', J: '□', I: '△', C: 'TOUCHPAD', ESC: '○', P: 'OPTIONS' };
  const TOUCH_LABELS = { E: 'USE', ENTER: 'USE', SPACE: 'JUMP', J: 'ATK', I: 'BAG', ESC: 'PAUSE' };
  function K(key) {
    const labels = inputMode === 'pad' ? PAD_LABELS : inputMode === 'touch' ? TOUCH_LABELS : null;
    return labels?.[key] || key;
  }
  function padRumble(strong, weak, ms) {
    if (inputMode === 'pad' && typeof window.pqRumble === 'function') window.pqRumble(strong, weak, ms);
  }
  function finishIntro() {
    introActive = false;
    introTime = INTRO_DURATION;
    [introWolfHowlAudioOne, introWolfHowlAudioTwo].forEach(a => { a.pause(); a.currentTime = 0; });
    if (introReplayOnly) {
      introReplayOnly = false;
      stop();
      onExit?.();
      return;
    }
    insideHouse = true;
    interiorPlayer.x = KID_SPAWN.x;
    interiorPlayer.y = KID_SPAWN.y;
    interiorPlayer.facing = KID_SPAWN.facing;
    interiorPlayer.moving = false;
    interiorPlayer.walk = 0;
    platformMode = true;
    platformScene = 'house';
    sidePlayer.x = 410; sidePlayer.y = SIDE_GROUND_Y; sidePlayer.vx = 0; sidePlayer.vy = 0; sidePlayer.onGround = true;
    sidePlayer.facing = 1; sidePlayer.moving = false; sidePlayer.walk = 0;
    sideCameraX = Math.max(0, sidePlayer.x - (canvas ? canvas.width : 320) * 0.43); sideJumpQueued = false; panel = null;
    keys.clear();
  }
  // Use the user's actual uploaded howl recordings from the assets folder.
  const introWolfHowlAudioOne = new Audio('./assets/first-wolf-howl.mp3');
  const introWolfHowlAudioTwo = new Audio('./assets/distant-wolf-howl.mp3');
  introWolfHowlAudioOne.preload = 'auto';
  introWolfHowlAudioTwo.preload = 'auto';
  function playIntroWolfAudio(audio, volume, rate = 1) {
    if (typeof settings !== 'undefined' && settings.sound === false) return;
    try {
      audio.pause(); audio.currentTime = 0; audio.volume = volume; audio.playbackRate = rate;
      const playback = audio.play();
      if (playback && playback.catch) playback.catch(() => {});
    } catch (_) {}
  }
  function drawIntroCaptions() {
    const caption = introCaptionAt(introTime);
    if (!caption) return;
    const output = wrapText(caption, 272, '9px monospace');
    const height = 11 + output.length * 11;
    const y = 225 - height;
    ctx.save();
    ctx.fillStyle = 'rgba(8,10,22,.88)';
    ctx.fillRect(13, y, 294, height);
    ctx.strokeStyle = '#d7bd83'; ctx.lineWidth = 1; ctx.strokeRect(13.5, y + .5, 293, height - 1);
    ctx.font = '9px monospace'; ctx.textAlign = 'left'; ctx.fillStyle = '#fff0ce';
    output.forEach((line, i) => ctx.fillText(line, 22, y + 12 + i * 11));
    ctx.restore();
  }
  // Broken, pixel-stepped sound distortions. These are intentionally not smooth circles.
  function drawGlitchHowl(x, y, intensity, seed = 0) {
    ctx.save();
    const colors = ['rgba(210,225,255,', 'rgba(150,190,255,', 'rgba(245,245,255,'];
    for (let band = 0; band < 4; band++) {
      const reach = 17 + band * 7 + intensity * 5;
      const start = x + (band % 2 ? -1 : 1) * 8;
      ctx.strokeStyle = colors[band % colors.length] + (0.12 + intensity * 0.28) + ')';
      ctx.lineWidth = 1;
      ctx.beginPath();
      let begun = false;
      for (let n = 0; n < 18; n++) {
        const px = start + n * (reach / 17);
        const jitter = Math.sin((n + seed * 2 + band) * 2.7) * 3 + ((n + band) % 3 - 1) * 2;
        const py = y + jitter + band * 2.2;
        // Deliberately skip chunks and use short stepped segments for a glitchy look.
        if ((n + band + seed) % 5 === 1 || (n + band) % 7 === 0) { begun = false; continue; }
        if (!begun) { ctx.moveTo(Math.round(px), Math.round(py)); begun = true; }
        else ctx.lineTo(Math.round(px), Math.round(py));
      }
      ctx.stroke();
    }
    // Tiny displaced pixel fragments flicker around the sound.
    for (let p = 0; p < 8; p++) {
      if ((p + Math.floor(intensity * 6)) % 3 === 0) continue;
      ctx.fillStyle = 'rgba(205,225,255,' + (0.12 + intensity * 0.25) + ')';
      ctx.fillRect(Math.round(x + ((p * 19 + seed * 13) % 53) - 25), Math.round(y + ((p * 11) % 23) - 11), 2 + (p % 2), 1);
    }
    ctx.restore();
  }
  function drawDistantHowlGlitch(x, y, progress) {
    // Source is beyond the visible tree line, away from either wolf.
    const pulse = 0.35 + 0.65 * Math.abs(Math.sin(introTime * 5.1));
    drawGlitchHowl(x, y, pulse, Math.floor(introTime * 7));
    // A few faint horizontal image tears sell the sound as distant/otherworldly.
    ctx.save();
    for (let n = 0; n < 4; n++) {
      const yy = Math.round(y + Math.sin(introTime * 9 + n * 2) * (5 + n * 2));
      const xx = Math.round(x - 25 + ((introTime * 17 + n * 21) % 28));
      ctx.fillStyle = 'rgba(175,205,255,' + (0.04 + pulse * 0.1) + ')';
      ctx.fillRect(xx, yy, 12 + n * 3, 1);
    }
    ctx.restore();
  }
  // ===========================================================================
  // Cinematic intro renderer.
  //  0.0 - 8.5   Space: textured, lit Earth with clouds, city lights and a Moon.
  //  8.5 - 38.5  Side-view moonlit countryside: village, werewolves, the home.
  //  38.5 - end  Bedroom (unchanged).
  // Textures are NASA public-domain maps (Blue Marble, Earth at Night,
  // Clementine lunar map), downsampled into assets/intro/.
  // ===========================================================================
  function introTexture(src) {
    const tex = { img: new Image(), data: null, w: 0, h: 0 };
    tex.img.crossOrigin = 'anonymous';
    tex.img.onload = () => {
      try {
        const c = document.createElement('canvas');
        c.width = tex.img.naturalWidth; c.height = tex.img.naturalHeight;
        const g = c.getContext('2d');
        g.drawImage(tex.img, 0, 0);
        tex.data = g.getImageData(0, 0, c.width, c.height).data;
        tex.w = c.width; tex.h = c.height;
      } catch (_) { tex.data = null; }
    };
    tex.img.src = src;
    return tex;
  }
  const introEarthDay = introTexture('./assets/intro/earth-day.png');
  const introEarthNight = introTexture('./assets/intro/earth-night.png');
  const introMoonTex = introTexture('./assets/intro/moon.png');
  const introBlackIdle = new Image();
  introBlackIdle.src = './assets/werewolves/Black_Werewolf/Idle.png';
  const introRedIdle = new Image();
  introRedIdle.src = './assets/werewolves/Red_Werewolf/Idle.png';
  const introBlackHurt = new Image();
  introBlackHurt.src = './assets/werewolves/Black_Werewolf/Hurt.png';
  const introRedHurt = new Image();
  introRedHurt.src = './assets/werewolves/Red_Werewolf/Hurt.png';

  function introHash(n) {
    const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return s - Math.floor(s);
  }
  function introNoise3(x, y, z) {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const xf = x - xi, yf = y - yi, zf = z - zi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
    const h = (a, b, c) => introHash(a * 57 + b * 113 + c * 271);
    const l = (a, b, k) => a + (b - a) * k;
    return l(
      l(l(h(xi, yi, zi), h(xi + 1, yi, zi), u), l(h(xi, yi + 1, zi), h(xi + 1, yi + 1, zi), u), v),
      l(l(h(xi, yi, zi + 1), h(xi + 1, yi, zi + 1), u), l(h(xi, yi + 1, zi + 1), h(xi + 1, yi + 1, zi + 1), u), v),
      w);
  }
  function introFbm(x, y, z, oct = 4) {
    let a = 0.5, f = 1, s = 0;
    for (let i = 0; i < oct; i++) { s += a * introNoise3(x * f, y * f, z * f); f *= 2.03; a *= 0.5; }
    return s;
  }
  const smooth01 = p => { p = Math.max(0, Math.min(1, p)); return p * p * (3 - 2 * p); };
  const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

  // Seamless equirectangular cloud map, generated once on the sphere surface.
  let introCloudMap = null;
  function getIntroCloudMap() {
    if (introCloudMap) return introCloudMap;
    const W = 160, H = 80, map = new Float32Array(W * H);
    for (let j = 0; j < H; j++) {
      const lat = (0.5 - (j + 0.5) / H) * Math.PI;
      for (let i = 0; i < W; i++) {
        const lon = ((i + 0.5) / W) * Math.PI * 2;
        const x = Math.cos(lat) * Math.cos(lon), y = Math.sin(lat), z = Math.cos(lat) * Math.sin(lon);
        // Stretch along longitude for banded, weather-like systems.
        let n = introFbm(x * 2.6 + 9, y * 4.4, z * 2.6, 5);
        const band = 0.55 + 0.45 * Math.abs(Math.sin(lat * 3.1));
        n = (n - 0.47) * 3.2 * band;
        map[j * W + i] = Math.max(0, Math.min(1, n));
      }
    }
    introCloudMap = { W, H, map };
    return introCloudMap;
  }

  const introSphereCanvases = {};
  // Per-pixel lit sphere. kind: 'earth' or 'moon'. rotation in radians.
  function renderIntroSphere(kind, radius, rotation, light) {
    const D = radius * 2 + 2;
    const key = kind + D;
    let entry = introSphereCanvases[key];
    if (!entry) {
      const c = document.createElement('canvas'); c.width = D; c.height = D;
      const g = c.getContext('2d');
      entry = introSphereCanvases[key] = { c, g, img: g.createImageData(D, D) };
    }
    const out = entry.img.data;
    out.fill(0);
    const ll = Math.hypot(light[0], light[1], light[2]);
    const Lx = light[0] / ll, Ly = light[1] / ll, Lz = light[2] / ll;
    let Hx = Lx, Hy = Ly, Hz = Lz + 1; const hl = Math.hypot(Hx, Hy, Hz); Hx /= hl; Hy /= hl; Hz /= hl;
    const tilt = kind === 'earth' ? -0.41 : 0.1, ct = Math.cos(tilt), st = Math.sin(tilt);
    const day = kind === 'earth' ? introEarthDay : introMoonTex;
    const clouds = kind === 'earth' ? getIntroCloudMap() : null;
    const cloudRot = rotation * 1.18 + 0.6;
    const R = radius;
    for (let j = 0; j < D; j++) {
      for (let i = 0; i < D; i++) {
        const nx = (i + 0.5 - D / 2) / R, ny = (j + 0.5 - D / 2) / R;
        const r2 = nx * nx + ny * ny;
        if (r2 > 1) continue;
        const nz = Math.sqrt(1 - r2);
        // Body coordinates with an axial tilt.
        const bx = nx * ct - ny * st, by = nx * st + ny * ct;
        const lat = Math.asin(Math.max(-1, Math.min(1, -by)));
        const lonBase = Math.atan2(bx, nz);
        let u = ((lonBase + rotation) / (Math.PI * 2)) % 1; if (u < 0) u += 1;
        const v = 0.5 - lat / Math.PI;
        const lambert = nx * Lx + ny * Ly + nz * Lz;
        const bayer = (BAYER4[(j & 3) * 4 + (i & 3)] / 16 - 0.5) * 0.09;
        const k = (j * D + i) * 4;
        let r, g, b;
        if (kind === 'earth') {
          let dr = 20, dg = 60, db = 140;
          if (day.data) {
            const ti = ((Math.min(day.h - 1, Math.floor(v * day.h)) * day.w) + Math.min(day.w - 1, Math.floor(u * day.w))) * 4;
            dr = day.data[ti]; dg = day.data[ti + 1]; db = day.data[ti + 2];
          }
          const ocean = db > dr + 18 && db > dg;
          // Richer, slightly stylised palette.
          if (ocean) { dr = dr * 0.55 + 6; dg = dg * 0.8 + 22; db = db * 0.95 + 40; }
          else { dr *= 1.08; dg *= 1.12; db *= 0.92; }
          let cloud = 0;
          if (clouds) {
            let cu = ((lonBase + cloudRot) / (Math.PI * 2)) % 1; if (cu < 0) cu += 1;
            cloud = clouds.map[Math.min(clouds.H - 1, Math.floor(v * clouds.H)) * clouds.W + Math.min(clouds.W - 1, Math.floor(cu * clouds.W))];
          }
          const lit = Math.max(0, Math.min(1, (lambert + 0.1) / 0.32 + bayer * 4));
          const shade = 0.25 + 0.75 * Math.max(0, lambert);
          let cr = dr * shade, cg = dg * shade, cb = db * shade;
          if (ocean) {
            const spec = Math.pow(Math.max(0, nx * Hx + ny * Hy + nz * Hz), 38) * (1 - cloud);
            cr += spec * 190; cg += spec * 200; cb += spec * 210;
          }
          cr = cr * (1 - cloud) + 245 * shade * cloud;
          cg = cg * (1 - cloud) + 248 * shade * cloud;
          cb = cb * (1 - cloud) + 255 * shade * cloud;
          // Night side: deep blue base plus warm city lights under thin cloud.
          let city = 0;
          if (introEarthNight.data) {
            const ni = ((Math.min(introEarthNight.h - 1, Math.floor(v * introEarthNight.h)) * introEarthNight.w) + Math.min(introEarthNight.w - 1, Math.floor(u * introEarthNight.w))) * 4;
            city = Math.max(0, introEarthNight.data[ni] - 30) / 225;
          }
          city *= (1 - cloud * 0.8);
          const nr = 4 + city * 255, ng = 8 + city * 190, nb = 22 + city * 90;
          r = cr * lit + nr * (1 - lit);
          g = cg * lit + ng * (1 - lit);
          b = cb * lit + nb * (1 - lit);
          // Atmosphere: blue fresnel rim, strongest on the sunlit limb.
          const rim = Math.pow(1 - nz, 2.6);
          const rimLit = Math.max(0.15, Math.min(1, lambert + 0.55));
          r += rim * 70 * rimLit; g += rim * 150 * rimLit; b += rim * 255 * rimLit;
          // Warm sunset band along the terminator.
          const term = Math.max(0, 1 - Math.abs(lambert - 0.06) / 0.07) * 0.3 * lit;
          r += term * 90; g += term * 28;
        } else {
          let m = 170;
          if (day.data) {
            const ti = ((Math.min(day.h - 1, Math.floor(v * day.h)) * day.w) + Math.min(day.w - 1, Math.floor(u * day.w))) * 4;
            m = day.data[ti];
          }
          m = 70 + (m - 60) * 1.25;
          const lit = Math.max(0, Math.min(1, (lambert + 0.03) / 0.16 + bayer * 3));
          const shade = (0.35 + 0.65 * Math.max(0, lambert)) * lit + 0.05;
          // Slight limb darkening for a real, rounded moon.
          const limb = 0.72 + 0.28 * nz;
          r = m * shade * limb * 1.02 + 6; g = m * shade * limb * 1.0 + 8; b = m * shade * limb * 0.94 + 14;
        }
        out[k] = Math.min(255, r); out[k + 1] = Math.min(255, g); out[k + 2] = Math.min(255, b);
        // Anti-aliased, but still pixel-crisp edge.
        const edge = Math.max(0, Math.min(1, (1 - Math.sqrt(r2)) * R * 1.4));
        out[k + 3] = 255 * Math.min(1, edge + 0.25);
      }
    }
    entry.g.putImageData(entry.img, 0, 0);
    return entry.c;
  }

  // Static full moon for the night sky (rendered once).
  let introSkyMoon = null;
  function getIntroSkyMoon() {
    if (!introSkyMoon && introMoonTex.data) introSkyMoon = renderIntroSphere('moon', 19, 0.2, [-0.12, -0.08, 1]);
    return introSkyMoon;
  }

  // A stepped fault line, not a soft streak: every segment snaps to the game grid.
  const MOON_FAULTS = [
    [[0.31,-1.02],[0.12,-0.65],[0.20,-0.49],[-0.08,-0.22],[0,-0.04],[-0.29,0.30],[-0.23,0.50],[-0.54,0.88]],
    [[-0.08,-0.22],[-0.36,-0.24],[-0.60,-0.51],[-0.83,-0.52]],
    [[0,-0.04],[0.27,0.07],[0.47,0.36],[0.91,0.43]],
    [[-0.29,0.30],[-0.55,0.25],[-0.72,0.42]],
    [[0.20,-0.49],[0.45,-0.55],[0.58,-0.76]]
  ];
  function drawFracturedMoon(x, y, r, surface, t, intensity = 0.7) {
    x = Math.round(x); y = Math.round(y);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (surface) ctx.drawImage(surface, x - (r + 1), y - (r + 1));
    else {
      for (let row = -r; row <= r; row++) {
        const half = Math.floor(Math.sqrt(r * r - row * row));
        ctx.fillStyle = row > r * 0.55 ? '#8e90af' : '#d3d4e8';
        ctx.fillRect(x - half, y + row, half * 2 + 1, 1);
      }
      ctx.fillStyle = '#a5a6c2';
      ctx.fillRect(x - Math.round(r * 0.55), y - 3, Math.ceil(r / 3), 3);
      ctx.fillRect(x + Math.round(r * 0.27), y + 3, Math.ceil(r / 4), 2);
    }
    const walk = (line, paint) => {
      for (let k = 1; k < line.length; k++) {
        const [ax, ay] = line[k - 1].map(v => Math.round(v * r));
        const [bx, by] = line[k].map(v => Math.round(v * r));
        const n = Math.max(Math.abs(bx - ax), Math.abs(by - ay), 1);
        for (let j = 0; j <= n; j++) {
          const dx = Math.round(ax + (bx - ax) * j / n), dy = Math.round(ay + (by - ay) * j / n);
          if (dx * dx + dy * dy <= r * r) paint(dx, dy);
        }
      }
    };
    MOON_FAULTS.forEach((line, i) => walk(line, (dx, dy) => {
      if ((dx + 1) ** 2 + (dy + 1) ** 2 <= r * r) {
        ctx.fillStyle = i === 0 ? '#9e84c9' : '#7a668f';
        ctx.fillRect(x + dx + 1, y + dy + 1, 1, 1);
      }
      ctx.fillStyle = i === 0 ? '#161126' : '#3d2b55';
      ctx.fillRect(x + dx, y + dy, 1, i === 0 && r >= 18 && dx * dx + (dy + 1) ** 2 <= r * r ? 2 : 1);
    }));
    ctx.fillStyle = '#ffcae6';
    ctx.globalAlpha *= intensity * (0.7 + Math.sin(t * 2.8) * 0.25);
    const q = Math.round(r * 0.15);
    ctx.fillRect(x - q, y + q, 1, 1);
    ctx.fillRect(x + q, y - Math.round(r * 0.48), 1, 1);
    for (let k = 0; k < 4; k++) {
      const drift = Math.sin(t * (0.7 + k * 0.15) + k * 2);
      ctx.fillRect(x + r + 2 + k * 3, y + Math.round(r * 0.27 + k * 3 + drift * 2), k === 0 ? 2 : 1, 1);
    }
    ctx.restore();
  }

  // ---- Starfield and Milky Way (pre-rendered) ----
  let introStarfield = null;
  function getIntroStarfield() {
    if (introStarfield) return introStarfield;
    const c = document.createElement('canvas'); c.width = 360; c.height = 240;
    const g = c.getContext('2d');
    const img = g.createImageData(360, 240), d = img.data;
    for (let y = 0; y < 240; y++) {
      for (let x = 0; x < 360; x++) {
        const k = (y * 360 + x) * 4;
        // Diagonal galactic band with dusty structure.
        const along = (x * 0.55 + y * 0.83), across = (x * 0.83 - y * 0.55) - 60;
        const band = Math.exp(-(across * across) / (2 * 38 * 38));
        const dust = introFbm(x / 34, y / 34, 3.3, 5);
        const lanes = Math.max(0, introFbm(x / 18 + 7, y / 18, 1.1, 4) - 0.52) * 2.4;
        const glow = Math.max(0, band * (dust * 1.25 - 0.28) - lanes * band * 0.6);
        const hue = introNoise3(along / 70, 2.2, 0.5);
        d[k] = 6 + glow * (55 + hue * 45);
        d[k + 1] = 8 + glow * (48 + hue * 10);
        d[k + 2] = 20 + glow * (95 - hue * 20);
        d[k + 3] = 255;
        const sr = introHash(x * 0.913 + y * 37.17);
        const density = 0.006 + band * 0.05;
        if (sr < density) {
          const bright = 90 + introHash(x * 3.1 + y * 0.77) * 165;
          const tint = introHash(x + y * 3.7);
          d[k] = Math.min(255, bright * (tint < 0.2 ? 1 : 0.85 + tint * 0.15));
          d[k + 1] = Math.min(255, bright * 0.92);
          d[k + 2] = Math.min(255, bright * (tint > 0.75 ? 1 : 0.9 + 0.1 * tint) + 18);
        }
      }
    }
    g.putImageData(img, 0, 0);
    introStarfield = c;
    return c;
  }
  const INTRO_BRIGHT_STARS = Array.from({ length: 22 }, (_, i) => ({
    x: introHash(i * 7.3) * 340, y: introHash(i * 3.9 + 1) * 200,
    s: introHash(i * 5.1 + 2), tw: introHash(i * 9.7 + 4) * 6.28,
    c: ['#ffffff', '#cfe0ff', '#ffe7c2', '#d9d0ff'][i % 4]
  }));
  function drawIntroBrightStars(offsetX, offsetY, alpha, t) {
    for (const s of INTRO_BRIGHT_STARS) {
      const tw = 0.55 + 0.45 * Math.sin(t * (1.3 + s.s * 2) + s.tw);
      const x = Math.round(((s.x - offsetX) % 340 + 340) % 340 - 10), y = Math.round(s.y - offsetY);
      ctx.globalAlpha = alpha * tw;
      ctx.fillStyle = s.c;
      ctx.fillRect(x, y, 1, 1);
      if (s.s > 0.62) {
        ctx.globalAlpha = alpha * tw * 0.45;
        ctx.fillRect(x - 1, y, 3, 1); ctx.fillRect(x, y - 1, 1, 3);
        if (s.s > 0.86) { ctx.globalAlpha = alpha * tw * 0.2; ctx.fillRect(x - 3, y, 7, 1); ctx.fillRect(x, y - 3, 1, 7); }
      }
    }
    ctx.globalAlpha = 1;
  }

  let introVignette = null;
  function drawIntroVignette(strength) {
    if (!introVignette) {
      const c = document.createElement('canvas'); c.width = 320; c.height = 240;
      const g = c.getContext('2d');
      const grad = g.createRadialGradient(160, 120, 70, 160, 120, 215);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(0.7, 'rgba(0,0,0,.35)');
      grad.addColorStop(1, 'rgba(0,0,0,.85)');
      g.fillStyle = grad; g.fillRect(0, 0, 320, 240);
      introVignette = c;
    }
    ctx.globalAlpha = strength; ctx.drawImage(introVignette, 0, 0); ctx.globalAlpha = 1;
  }
  function drawIntroLetterbox() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, 320, 12);
    ctx.fillRect(0, 228, 320, 12);
  }

  // ---- Space scene ----
  function drawIntroSpace(t) {
    const drift = t * 1.6;
    ctx.drawImage(getIntroStarfield(), -Math.round(drift), 0);
    drawIntroBrightStars(drift * 1.4, 0, 1, t);
    // Off-screen sun: warm glare from the upper left, consistent with the lighting.
    let glare = ctx.createRadialGradient(-30, 30, 4, -30, 30, 190);
    glare.addColorStop(0, 'rgba(255,240,215,.55)');
    glare.addColorStop(0.25, 'rgba(255,200,150,.14)');
    glare.addColorStop(1, 'rgba(255,190,140,0)');
    ctx.fillStyle = glare; ctx.fillRect(0, 0, 320, 240);

    const push = smooth01(t / 8.5);
    const R = Math.round(50 + push * 6);
    const ex = 160, ey = 106 + Math.round(push * 2);
    const light = [-0.86, -0.3, 0.32];
    // Soft atmospheric halo, brighter on the lit side.
    const halo = ctx.createRadialGradient(ex - 8, ey - 4, R * 0.9, ex, ey, R * 1.32);
    halo.addColorStop(0, 'rgba(110,180,255,.42)');
    halo.addColorStop(0.45, 'rgba(70,140,255,.14)');
    halo.addColorStop(1, 'rgba(40,90,220,0)');
    ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(ex, ey, R * 1.35, 0, Math.PI * 2); ctx.fill();
    ctx.imageSmoothingEnabled = false;
    if (introEarthDay.data) {
      const earth = renderIntroSphere('earth', R, 1.9 + t * 0.085, light);
      ctx.drawImage(earth, Math.round(ex - earth.width / 2), Math.round(ey - earth.height / 2));
    }
    // The Moon drifts across the foreground on its orbit.
    const mp = t / 8.5;
    const mx = 286 - mp * 38, my = 52 + mp * 12;
    const moonR = 16;
    {
      const moonGlow = ctx.createRadialGradient(mx, my, moonR * 0.8, mx, my, moonR * 2.1);
      moonGlow.addColorStop(0, 'rgba(220,225,240,.16)');
      moonGlow.addColorStop(1, 'rgba(220,225,240,0)');
      ctx.fillStyle = moonGlow; ctx.beginPath(); ctx.arc(mx, my, moonR * 2.2, 0, Math.PI * 2); ctx.fill();
      const moon = introMoonTex.data ? renderIntroSphere('moon', moonR, 0.4 + t * 0.01, [-0.72, -0.32, 0.63]) : null;
      drawFracturedMoon(mx, my, moonR, moon, t);
    }
    // Faint lens ghosts along the sun axis.
    ctx.globalCompositeOperation = 'lighter';
    [[70, 58, 7, 'rgba(255,190,120,.06)'], [118, 82, 3, 'rgba(160,210,255,.08)'], [214, 128, 11, 'rgba(140,170,255,.035)']].forEach(([x, y, r, c]) => {
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalCompositeOperation = 'source-over';
    drawIntroVignette(0.9);

  }

  // ---- Night countryside (side view, parallax) ----
  const INTRO_HOUSE_X = 1392;
  const INTRO_RIDGE_X = 660;
  function introGroundY(x) {
    const ridge = Math.exp(-Math.pow((x - INTRO_RIDGE_X) / 150, 2)) * 24;
    const yard = Math.exp(-Math.pow((x - INTRO_HOUSE_X) / 170, 2)) * 6;
    return 186 - ridge + yard * 0.6 + Math.sin(x / 61) * 2.6 + Math.sin(x / 23 + 1.3) * 1.1;
  }
  const introLayers = {};
  function introLayer(name, width, painter) {
    if (introLayers[name]) return introLayers[name];
    const c = document.createElement('canvas'); c.width = width; c.height = 240;
    const g = c.getContext('2d');
    painter(g, width);
    introLayers[name] = c;
    return c;
  }
  function paintPine(g, x, baseY, h, col, lit) {
    const w = h * 0.42;
    g.fillStyle = col;
    for (let tier = 0; tier < 4; tier++) {
      const ty = baseY - h + tier * h * 0.2;
      const tw = w * (0.35 + tier * 0.22);
      g.beginPath();
      g.moveTo(x, ty - 2);
      g.lineTo(x - tw, ty + h * 0.3);
      g.lineTo(x + tw, ty + h * 0.3);
      g.closePath(); g.fill();
    }
    g.fillRect(Math.round(x - 1), Math.round(baseY - h * 0.15), 2, Math.round(h * 0.15) + 1);
    if (lit) {
      // Moonlit edge on the upper-right of each tier.
      g.fillStyle = lit;
      for (let tier = 0; tier < 4; tier++) {
        const ty = baseY - h + tier * h * 0.2;
        const tw = w * (0.35 + tier * 0.22);
        g.beginPath();
        g.moveTo(x, ty - 2); g.lineTo(x + tw, ty + h * 0.3); g.lineTo(x + tw - 2, ty + h * 0.3); g.lineTo(x, ty + 1);
        g.closePath(); g.fill();
      }
    }
  }
  function getIntroMountains() {
    return introLayer('mountains', 560, (g, W) => {
      for (let x = 0; x < W; x++) {
        const n = introFbm(x / 70, 0.5, 2.1, 5);
        const top = Math.round(150 - n * 92 + Math.sin(x / 140) * 8);
        g.fillStyle = '#26304e'; g.fillRect(x, top, 1, 240 - top);
        // Moonlit snowy crest on left-facing slopes.
        const prev = Math.round(150 - introFbm((x - 1) / 70, 0.5, 2.1, 5) * 92 + Math.sin((x - 1) / 140) * 8);
        if (top < 108) {
          g.fillStyle = prev > top ? 'rgba(170,190,230,.55)' : 'rgba(120,140,190,.35)';
          g.fillRect(x, top, 1, Math.max(1, Math.round((108 - top) * 0.18)));
        }
      }
      const haze = g.createLinearGradient(0, 100, 0, 170);
      haze.addColorStop(0, 'rgba(60,80,130,0)'); haze.addColorStop(1, 'rgba(60,80,130,.55)');
      g.fillStyle = haze; g.fillRect(0, 90, W, 150);
    });
  }
  const INTRO_VILLAGE = [];
  function getIntroHills() {
    return introLayer('hills', 820, (g, W) => {
      const top = x => 150 - Math.sin(x / 90) * 9 - Math.sin(x / 37 + 2) * 3 - Math.exp(-Math.pow((x - 170) / 120, 2)) * 8;
      g.fillStyle = '#1c2a44';
      for (let x = 0; x < W; x++) { const y = Math.round(top(x)); g.fillRect(x, y, 1, 240 - y); }
      g.fillStyle = 'rgba(110,130,180,.35)';
      for (let x = 0; x < W; x++) { const y = Math.round(top(x)); g.fillRect(x, y, 1, 1); }
      // A distant village: cottages, a chapel and warm windows.
      const houses = [[62, 9, 7], [80, 12, 8], [101, 8, 6], [118, 11, 9], [150, 9, 7], [196, 10, 8], [214, 8, 6], [236, 12, 9], [262, 9, 7], [300, 8, 6]];
      houses.forEach(([x, w, h], i) => {
        const base = Math.round(top(x + w / 2)) + 5 + i % 3;
        const art = gloamArt.town;
        const wide = i % 3 !== 0, src = wide ? TOWN_PARTS.small : TOWN_PARTS.tall;
        const dw = w + 6, dh = h + (wide ? 5 : 13);
        g.imageSmoothingEnabled = false;
        if (imgReady(art)) g.drawImage(tintedSheet(art, '31,34,59,.31'), ...src, x - 3, base - dh, dw, dh);
        else {
          g.fillStyle = '#151f33'; g.fillRect(x, base - h, w, h);
          g.beginPath(); g.moveTo(x - 2, base - h); g.lineTo(x + w / 2, base - dh); g.lineTo(x + w + 2, base - h); g.closePath(); g.fill();
        }
        INTRO_VILLAGE.push({ x: x + Math.round(w / 2), y: base - (wide ? 5 : 8), f: introHash(i * 3) });
      });
      // Chapel with a steeple.
      const cx = 172, cb = Math.round(top(cx)) + 3;
      g.fillStyle = '#151f33'; g.fillRect(cx, cb - 12, 12, 12); g.fillRect(cx + 3, cb - 22, 6, 10);
      g.beginPath(); g.moveTo(cx + 2, cb - 22); g.lineTo(cx + 6, cb - 31); g.lineTo(cx + 10, cb - 22); g.closePath(); g.fill();
      INTRO_VILLAGE.push({ x: cx + 5, y: cb - 19, f: 0.4, big: true });
      // Windmill on the far hill.
      const mx = 360, mb = Math.round(top(mx)) + 2;
      g.beginPath(); g.moveTo(mx - 4, mb); g.lineTo(mx - 2, mb - 16); g.lineTo(mx + 2, mb - 16); g.lineTo(mx + 4, mb); g.closePath(); g.fill();
      INTRO_VILLAGE.push({ x: mx - 1, y: mb - 9, f: 0.7, mill: { x: mx, y: mb - 16 } });
    });
  }
  function getIntroTreeline() {
    return introLayer('treeline', 1180, (g, W) => {
      for (let i = 0; i < 260; i++) {
        const x = (i * 4.6 + introHash(i) * 6);
        // Leave the area near the village open, thicken toward the wild forest.
        const wild = Math.max(0, Math.min(1, (x - 300) / 220));
        if (introHash(i + 0.5) > 0.25 + wild * 0.75) continue;
        const h = 12 + introHash(i * 2.3) * 14 + wild * 10;
        const base = 168 + Math.sin(x / 50) * 3;
        paintPine(g, x, base, h, '#132036', 'rgba(90,115,165,.5)');
      }
      g.fillStyle = '#132036'; g.fillRect(0, 166, W, 74);
    });
  }
  function getIntroGround() {
    return introLayer('ground', 1720, (g, W) => {
      // Back trees of the wild forest, standing on the main ground plane.
      for (let i = 0; i < 70; i++) {
        const x = 860 + i * 7.5 + introHash(i * 4.1) * 6;
        if (x > INTRO_HOUSE_X - 70 && x < INTRO_HOUSE_X + 70) continue;
        const h = 34 + introHash(i * 1.7) * 30;
        paintPine(g, x, introGroundY(x) + 2, h, '#0f1b2c', 'rgba(120,150,205,.45)');
      }
      // Grass mass with a moonlit top edge and darker soil.
      for (let x = 0; x < W; x++) {
        const y = Math.round(introGroundY(x));
        g.fillStyle = '#20382f'; g.fillRect(x, y, 1, 240 - y);
        g.fillStyle = '#4a6b55'; g.fillRect(x, y, 1, 1);
        g.fillStyle = '#2b4a3c'; g.fillRect(x, y + 1, 1, 2);
        if (introHash(x * 1.37) > 0.55) { g.fillStyle = '#3c5c49'; g.fillRect(x, y - 1 - Math.floor(introHash(x * 0.71) * 3), 1, 2); }
        const soil = 14 + Math.round(introHash(x * 0.21) * 3);
        g.fillStyle = '#19281f'; g.fillRect(x, y + soil, 1, 240 - y - soil);
      }
      // Dirt road that leads to the home.
      for (let x = 980; x < W; x++) {
        const y = Math.round(introGroundY(x));
        g.fillStyle = '#4b4033'; g.fillRect(x, y + 3, 1, 4);
        g.fillStyle = '#5d5040'; g.fillRect(x, y + 3, 1, 1);
        if (introHash(x * 2.1) > 0.8) { g.fillStyle = '#6c6150'; g.fillRect(x, y + 4 + (x % 3), 1, 1); }
      }
      // Rocks on the ridge where the wolves stop.
      [[612, 7, 4], [716, 9, 5], [736, 5, 3], [578, 4, 3]].forEach(([x, w, h]) => {
        const y = introGroundY(x) + 2;
        g.fillStyle = '#3a4152'; g.beginPath(); g.ellipse(x, y - h / 2, w, h, 0, Math.PI, 0); g.fill();
        g.fillStyle = 'rgba(170,185,220,.45)'; g.fillRect(x - w + 3, Math.round(y - h), w, 1);
      });
      // Fence along the road near the house.
      for (let x = INTRO_HOUSE_X - 150; x < INTRO_HOUSE_X - 54; x += 12) {
        const y = Math.round(introGroundY(x));
        g.fillStyle = '#3e3328'; g.fillRect(x, y - 9, 2, 10);
        g.fillStyle = '#4d4033'; g.fillRect(x, y - 7, 12, 1); g.fillRect(x, y - 4, 12, 1);
      }
      // Signpost on the way home.
      const sx = 1180, sy = Math.round(introGroundY(sx));
      g.fillStyle = '#3e3328'; g.fillRect(sx, sy - 16, 2, 17);
      g.fillStyle = '#56473a'; g.beginPath(); g.moveTo(sx - 8, sy - 15); g.lineTo(sx + 10, sy - 15); g.lineTo(sx + 13, sy - 12.5); g.lineTo(sx + 10, sy - 10); g.lineTo(sx - 8, sy - 10); g.closePath(); g.fill();
      paintIntroHouse(g);
    });
  }
  function paintIntroHouse(g) {
    const x = INTRO_HOUSE_X - 44, w = 88, base = Math.round(introGroundY(INTRO_HOUSE_X)) + 2;
    const wallTop = base - 34;
    // Big oak behind the house.
    g.fillStyle = '#122030';
    [[x + 92, wallTop - 22, 22], [x + 104, wallTop - 8, 18], [x + 80, wallTop - 4, 16]].forEach(([cx, cy, r]) => { g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill(); });
    g.fillRect(x + 92, wallTop, 5, 34);
    const home = settlementArt['timber-home'];
    if (imgReady(home)) {
      g.imageSmoothingEnabled = false;
      g.fillStyle = '#484558'; g.fillRect(x + 65, base - 77, 10, 36);
      g.fillStyle = '#625969'; g.fillRect(x + 63, base - 78, 14, 3);
      g.drawImage(tintedSheet(home, '24,25,53,.33'), x - 1, base - 83, 90, 88);
      for (const wx of [x + 16, x + 69]) {
        g.fillStyle = '#443343'; g.fillRect(wx - 2, base - 23, 11, 10);
        g.fillStyle = '#dfa562'; g.fillRect(wx, base - 22, 7, 7);
        g.fillStyle = '#5c3b3b'; g.fillRect(wx + 3, base - 22, 1, 7);
      }
      return;
    }
    // Stone foundation.
    g.fillStyle = '#3d4250'; g.fillRect(x - 2, base - 6, w + 4, 6);
    g.fillStyle = '#4e5464';
    for (let i = 0; i < 12; i++) g.fillRect(x + i * 8 + (i % 2) * 2, base - 5 + (i % 2) * 2, 5, 2);
    // Timber walls with plank lines.
    g.fillStyle = '#5a4433'; g.fillRect(x, wallTop, w, 28);
    g.fillStyle = '#4b382a';
    for (let yy = wallTop + 3; yy < base - 6; yy += 4) g.fillRect(x, yy, w, 1);
    g.fillStyle = '#3a2b20'; g.fillRect(x, wallTop, 3, 28); g.fillRect(x + w - 3, wallTop, 3, 28); g.fillRect(x + 42, wallTop, 3, 28);
    // Chimney.
    g.fillStyle = '#5b4a45'; g.fillRect(x + 64, wallTop - 32, 9, 22);
    g.fillStyle = '#6e5b55'; g.fillRect(x + 63, wallTop - 33, 11, 3);
    // Gabled shingle roof.
    const peakY = wallTop - 28;
    g.fillStyle = '#3a2a2e';
    g.beginPath(); g.moveTo(x - 9, wallTop + 1); g.lineTo(x + w / 2, peakY); g.lineTo(x + w + 9, wallTop + 1); g.closePath(); g.fill();
    g.fillStyle = '#4b363a';
    for (let row = 0; row < 7; row++) {
      const yy = peakY + 4 + row * 4;
      const half = (yy - peakY) * ((w / 2 + 9) / (wallTop + 1 - peakY));
      for (let s = -half; s < half; s += 6) g.fillRect(Math.round(x + w / 2 + s + (row % 2) * 3), yy, 4, 2);
    }
    // Moonlit roof edge.
    g.strokeStyle = 'rgba(175,190,230,.55)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(x + w / 2, peakY); g.lineTo(x + w + 9, wallTop + 1); g.stroke();
    // Attic window.
    g.fillStyle = '#2a1f1c'; g.fillRect(x + w / 2 - 4, peakY + 10, 8, 8);
    // Door and porch.
    g.fillStyle = '#2f2219'; g.fillRect(x + 48, base - 26, 13, 20);
    g.fillStyle = '#4a3526'; g.fillRect(x + 49, base - 25, 11, 19);
    g.fillStyle = '#c9a25c'; g.fillRect(x + 57, base - 16, 1, 2);
    g.fillStyle = '#3a2b20'; g.fillRect(x + 44, base - 30, 21, 3);
    // Window frames (the warm glass is drawn later with additive light).
    [[x + 10, base - 24], [x + 26, base - 24], [x + 72, base - 24]].forEach(([wx, wy]) => {
      g.fillStyle = '#2a1f17'; g.fillRect(wx - 1, wy - 1, 12, 12);
      g.fillStyle = '#e2a24f'; g.fillRect(wx, wy, 10, 10);
      g.fillStyle = '#2a1f17'; g.fillRect(wx + 4, wy, 2, 10); g.fillRect(wx, wy + 4, 10, 2);
      g.fillStyle = '#3a2b20'; g.fillRect(wx - 2, wy + 10, 14, 2);
    });
    g.fillStyle = '#e8b968'; g.fillRect(x + w / 2 - 3, peakY + 11, 6, 6);
    g.fillStyle = '#2a1f1c'; g.fillRect(x + w / 2 - 0.5, peakY + 11, 1, 6);
    // Mailbox by the road.
    const mx = x + w + 18, my = Math.round(introGroundY(mx));
    g.fillStyle = '#3e3328'; g.fillRect(mx, my - 11, 2, 12);
    g.fillStyle = '#7a2e2e'; g.fillRect(mx - 4, my - 16, 10, 6);
    g.fillStyle = '#c94c3c'; g.fillRect(mx + 6, my - 19, 1, 5); g.fillRect(mx + 6, my - 19, 3, 2);
  }

  function introTint(img, frameX, frameW, frameH, tint, rim) {
    // Tint a sprite frame for moonlight and add a cool rim light on its moon side.
    if (!introTint.c) { introTint.c = document.createElement('canvas'); introTint.g = introTint.c.getContext('2d'); }
    const c = introTint.c, g = introTint.g;
    c.width = frameW; c.height = frameH;
    g.imageSmoothingEnabled = false;
    g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, frameW, frameH);
    if (rim) {
      g.drawImage(img, frameX, 0, frameW, frameH, rim[0], rim[1], frameW, frameH);
      g.globalCompositeOperation = 'source-in';
      g.fillStyle = rim[2]; g.fillRect(0, 0, frameW, frameH);
      g.globalCompositeOperation = 'source-over';
    }
    if (!introTint.b) { introTint.b = document.createElement('canvas'); introTint.bg = introTint.b.getContext('2d'); }
    const b = introTint.b, bg = introTint.bg;
    b.width = frameW; b.height = frameH;
    bg.imageSmoothingEnabled = false;
    bg.globalCompositeOperation = 'source-over';
    bg.clearRect(0, 0, frameW, frameH);
    bg.drawImage(img, frameX, 0, frameW, frameH, 0, 0, frameW, frameH);
    bg.globalCompositeOperation = 'multiply';
    bg.fillStyle = tint; bg.fillRect(0, 0, frameW, frameH);
    bg.globalCompositeOperation = 'destination-in';
    bg.drawImage(img, frameX, 0, frameW, frameH, 0, 0, frameW, frameH);
    g.drawImage(b, 0, 0);
    return c;
  }

  // Wolf choreography. Positions are analytic so frame-stepping and skipping are stable.
  const INTRO_WOLVES = [
    { red: false, startX: 318, stopX: 676, walkStart: 14.9, walkEnd: 20.6, flinch: 21.45, flee: 22.42 },
    { red: true, startX: 280, stopX: 638, walkStart: 15.3, walkEnd: 21.0, flinch: 21.6, flee: 22.15 }
  ];
  const WOLF_WALK_STRIDE = 46;  // px travelled per full walk cycle at 0.5 scale
  const WOLF_RUN_STRIDE = 104;  // px travelled per full gallop cycle
  const WOLF_RUN_MAX = 215, WOLF_RUN_TAU = 0.38;
  function introWolfState(w, t) {
    if (t < w.walkStart) return { x: w.startX - 40 * (w.walkStart - t), dir: 1, anim: 'walk', dist: 0 };
    if (t < w.walkEnd) {
      // Trapezoidal speed profile: steady walk that slows naturally to a stop.
      const T = w.walkEnd - w.walkStart, D = w.stopX - w.startX, dec = 1.4;
      const v = D / (T - dec / 2);
      const s = t - w.walkStart;
      let d;
      if (s < T - dec) d = v * s;
      else { const q = s - (T - dec); d = v * (T - dec) + v * q - v * q * q / (2 * dec); }
      return { x: w.startX + d, dir: 1, anim: 'walk', dist: d, speed: s < T - dec ? v : v * (1 - (s - (T - dec)) / dec) };
    }
    if (t < w.flee) {
      const hurt = t >= w.flinch && t < w.flinch + 0.42;
      return { x: w.stopX, dir: 1, anim: hurt ? 'hurt' : 'idle', since: t - w.walkEnd };
    }
    const s = t - w.flee;
    const d = WOLF_RUN_MAX * (s - WOLF_RUN_TAU * (1 - Math.exp(-s / WOLF_RUN_TAU)));
    return { x: w.stopX - d, dir: -1, anim: 'run', dist: d, speed: WOLF_RUN_MAX * (1 - Math.exp(-s / WOLF_RUN_TAU)), runTime: s };
  }
  const introDust = [];
  let introDustLast = [0, 0], introDustTime = -1;
  function drawIntroWolves(t, cam) {
    if (t < introDustTime) { introDust.length = 0; introDustLast = [0, 0]; }
    introDustTime = t;
    INTRO_WOLVES.forEach((w, idx) => {
      const st = introWolfState(w, t);
      if (t < w.walkStart - 2) return;
      const sx = st.x - cam;
      if (sx < -80 || sx > 400) return;
      const gy = introGroundY(st.x);
      let sheet, frame, frames;
      const pick = (black, red) => (w.red ? red : black);
      if (st.anim === 'walk') sheet = pick(introBlackWalk, introRedWalk);
      else if (st.anim === 'run') sheet = pick(introBlackRun, introRedRun);
      else if (st.anim === 'hurt') sheet = pick(introBlackHurt, introRedHurt);
      else sheet = pick(introBlackIdle, introRedIdle);
      if (!sheet.complete || !sheet.naturalWidth) return;
      frames = Math.max(1, Math.floor(sheet.naturalWidth / 128));
      if (st.anim === 'walk') frame = Math.floor((st.dist / WOLF_WALK_STRIDE) * frames + idx * 4) % frames;
      else if (st.anim === 'run') frame = Math.floor((st.dist / WOLF_RUN_STRIDE) * frames) % frames;
      else if (st.anim === 'hurt') frame = Math.min(frames - 1, Math.floor((t - w.flinch) * 6));
      else frame = Math.floor(st.since * 7 + idx * 3) % frames;
      // Ground contact shadow.
      ctx.fillStyle = 'rgba(4,8,18,.45)';
      ctx.beginPath(); ctx.ellipse(Math.round(sx), Math.round(gy + 1), st.anim === 'run' ? 17 : 14, 2.5, 0, 0, Math.PI * 2); ctx.fill();
      // Body follows the slope of the hill.
      const slope = Math.atan2(introGroundY(st.x + 6) - introGroundY(st.x - 6), 12) * 0.7;
      const tinted = introTint(sheet, frame * 128, 128, 128, w.red ? '#9a8fb8' : '#8d97c6', [1, -1, 'rgba(190,205,255,.85)']);
      ctx.save();
      ctx.translate(Math.round(sx), Math.round(gy + 1));
      ctx.rotate(slope);
      if (st.dir < 0) ctx.scale(-1, 1);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(tinted, -32, -64, 64, 64);
      ctx.restore();
      // Kicked-up dust on each footfall while galloping.
      if (st.anim === 'run') {
        const step = Math.floor(st.dist / (WOLF_RUN_STRIDE / 2));
        if (step > introDustLast[idx]) {
          introDustLast[idx] = step;
          introDust.push({ x: st.x + 10, y: gy, born: t, seed: step + idx * 31 });
        }
      }
    });
    for (let i = introDust.length - 1; i >= 0; i--) {
      const p = introDust[i], age = t - p.born;
      if (age > 0.9 || age < 0) { introDust.splice(i, 1); continue; }
      for (let k = 0; k < 4; k++) {
        const ox = (introHash(p.seed * 7 + k) - 0.2) * 14 * (0.4 + age);
        const oy = -age * (6 + k * 3);
        ctx.fillStyle = 'rgba(120,128,150,' + (0.35 * (1 - age / 0.9)) + ')';
        const r = 1 + age * 4;
        ctx.fillRect(Math.round(p.x - cam + ox - r / 2), Math.round(p.y + oy - r / 2), Math.ceil(r), Math.ceil(r));
      }
    }
  }

  function introSkyPalette(t) {
    const n = smooth01((t - 8.5) / 7.5);
    const mix = (a, b) => 'rgb(' + a.map((v, i) => Math.round(v + (b[i] - v) * n)).join(',') + ')';
    return {
      top: mix([28, 30, 74], [4, 7, 22]),
      mid: mix([92, 64, 118], [14, 22, 52]),
      low: mix([224, 132, 98], [38, 50, 92]),
      night: n
    };
  }

  function introCamera(t) {
    // Returns ground-layer camera x and zoom.
    let cam, zoom = 1, focusY = 150;
    if (t < 14.5) {
      const e = smooth01((t - 8.5) / 6);
      cam = 0 + e * 330;
    } else if (t < 25.5) {
      const e = smooth01((t - 14.5) / 7.5);
      cam = 330 + e * 190;
      zoom = 1 + smooth01((t - 16.5) / 5) * 0.2;
      focusY = 160;
    } else if (t < 31) {
      const e = smooth01((t - 25.5) / 5.5);
      cam = 520 + e * 712;
      zoom = 1.2 - e * 0.2;
      focusY = 160 + e * 16;
    } else {
      const e = smooth01((t - 31) / 7.5);
      cam = 1232 + e * 6;
      zoom = 1 + e * 0.22;
      focusY = 176;
    }
    return { cam, zoom, focusY };
  }

  function drawIntroNight(t) {
    const { cam, zoom, focusY } = introCamera(t);
    const howlAge = t - 21.4;
    const shake = howlAge >= 0 && howlAge < 2.4 ? (1 - howlAge / 2.4) * (0.6 + 0.4 * Math.abs(Math.sin(howlAge * 8))) : 0;
    const shx = shake * (Math.sin(t * 39) * 2.2 + Math.sin(t * 17) * 1.0);
    const shy = shake * (Math.cos(t * 31) * 1.6 + Math.sin(t * 23) * 0.7);
    const sky = introSkyPalette(t);
    const grad = ctx.createLinearGradient(0, 0, 0, 190);
    grad.addColorStop(0, sky.top); grad.addColorStop(0.55, sky.mid); grad.addColorStop(1, sky.low);
    ctx.fillStyle = grad; ctx.fillRect(0, 0, 320, 240);
    // Stars come out as the dusk fades.
    ctx.globalAlpha = 0.25 + sky.night * 0.75;
    ctx.drawImage(getIntroStarfield(), -Math.round(cam * 0.02) - 10, -40);
    ctx.globalAlpha = 1;
    drawIntroBrightStars(cam * 0.03, 40, sky.night, t);

    ctx.save();
    ctx.translate(160 + shx, focusY + shy);
    ctx.scale(zoom, zoom);
    ctx.translate(-160, -focusY);

    // Rising full moon with a large soft halo.
    const rise = smooth01((t - 8.5) / 9);
    const moonX = 214 - cam * 0.03, moonY = 128 - rise * 82;
    const halo = ctx.createRadialGradient(moonX, moonY, 10, moonX, moonY, 90);
    halo.addColorStop(0, 'rgba(225,230,255,' + (0.28 * (0.4 + sky.night * 0.6)) + ')');
    halo.addColorStop(0.3, 'rgba(160,180,240,' + (0.1 * (0.4 + sky.night * 0.6)) + ')');
    halo.addColorStop(1, 'rgba(120,140,220,0)');
    ctx.fillStyle = halo; ctx.fillRect(moonX - 95, moonY - 95, 190, 190);
    drawFracturedMoon(moonX, moonY, 19, getIntroSkyMoon(), t, 0.65 + 0.35 * smooth01((t - 14.8) / 1.4));
    // Thin drifting clouds crossing the moon.
    for (let i = 0; i < 4; i++) {
      const cx = ((i * 140 + t * (5 + i * 2) - cam * 0.05) % 460 + 460) % 460 - 70;
      const cy = 40 + i * 17;
      ctx.fillStyle = 'rgba(' + (sky.night > 0.5 ? '60,72,110' : '120,90,120') + ',' + (0.32 - i * 0.04) + ')';
      ctx.fillRect(Math.round(cx), cy, 62 - i * 6, 2);
      ctx.fillRect(Math.round(cx + 10), cy - 2, 34, 2);
      ctx.fillStyle = 'rgba(200,210,245,' + (0.1 * sky.night) + ')';
      ctx.fillRect(Math.round(cx + 10), cy - 2, 34, 1);
    }

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(getIntroMountains(), -Math.round(cam * 0.12), -6);
    const hillsX = -Math.round(cam * 0.32);
    ctx.drawImage(getIntroHills(), hillsX, 0);
    // Village windows flicker with candlelight; the windmill turns slowly.
    ctx.globalCompositeOperation = 'lighter';
    for (const w of INTRO_VILLAGE) {
      const x = w.x + hillsX;
      if (x < -6 || x > 326) continue;
      const fl = 0.75 + 0.25 * Math.sin(t * (5 + w.f * 4) + w.f * 20);
      ctx.fillStyle = 'rgba(255,190,90,' + (0.85 * fl) + ')';
      ctx.fillRect(x, w.y, w.big ? 2 : 1, w.big ? 3 : 2);
      ctx.fillStyle = 'rgba(255,160,70,' + (0.12 * fl) + ')';
      ctx.fillRect(x - 2, w.y - 2, 5, 6);
    }
    ctx.globalCompositeOperation = 'source-over';
    const mill = INTRO_VILLAGE.find(w => w.mill);
    if (mill) {
      const mx = mill.mill.x + hillsX, my = mill.mill.y;
      ctx.strokeStyle = '#151f33'; ctx.lineWidth = 1;
      for (let b = 0; b < 4; b++) {
        const a = t * 0.8 + b * Math.PI / 2;
        ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(mx + Math.cos(a) * 9, my + Math.sin(a) * 9); ctx.stroke();
      }
    }
    // Low mist between the hills and the forest.
    for (let i = 0; i < 3; i++) {
      const fx = ((t * (4 + i * 3) - cam * (0.4 + i * 0.1)) % 360 + 360) % 360 - 40;
      ctx.fillStyle = 'rgba(120,140,190,' + (0.06 + 0.02 * i) + ')';
      ctx.fillRect(Math.round(fx), 150 + i * 6, 160, 3);
      ctx.fillRect(Math.round(fx + 200), 153 + i * 5, 120, 2);
    }
    ctx.drawImage(getIntroTreeline(), -Math.round(cam * 0.55), 0);

    // Main ground plane.
    ctx.drawImage(getIntroGround(), -Math.round(cam), 0);
    // Warm light from the home's windows and chimney smoke.
    const hx = INTRO_HOUSE_X - cam;
    if (hx > -120 && hx < 440) {
      const base = Math.round(introGroundY(INTRO_HOUSE_X)) + 2;
      ctx.globalCompositeOperation = 'lighter';
      const flick = 0.9 + 0.1 * Math.sin(t * 7.3) * Math.sin(t * 3.1);
      [[-25, base - 19], [28, base - 19]].forEach(([ox, wy]) => {
        const lx = hx + ox;
        const g2 = ctx.createRadialGradient(lx, wy, 2, lx, wy, 26);
        g2.addColorStop(0, 'rgba(255,170,80,' + (0.32 * flick) + ')');
        g2.addColorStop(1, 'rgba(255,140,60,0)');
        ctx.fillStyle = g2; ctx.fillRect(lx - 26, wy - 26, 52, 52);
        // Light spilling onto the yard.
        ctx.fillStyle = 'rgba(255,170,80,' + (0.07 * flick) + ')';
        ctx.beginPath(); ctx.moveTo(lx - 6, base); ctx.lineTo(lx + 6, base); ctx.lineTo(lx + 13, base + 12); ctx.lineTo(lx - 13, base + 12); ctx.closePath(); ctx.fill();
      });
      // Porch lantern.
      const lan = ctx.createRadialGradient(hx + 3, base - 31, 1, hx + 3, base - 31, 16);
      lan.addColorStop(0, 'rgba(255,210,120,' + (0.55 * flick) + ')'); lan.addColorStop(1, 'rgba(255,170,80,0)');
      ctx.fillStyle = lan; ctx.fillRect(hx - 13, base - 47, 32, 32);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#ffd890'; ctx.fillRect(Math.round(hx + 2), base - 32, 2, 3);
      // Chimney smoke rising and leaning with the breeze.
      const chX = INTRO_HOUSE_X - 44 + 70 - cam, chY = base - 77;
      for (let k = 0; k < 9; k++) {
        const life = ((t * 0.35 + k / 9) % 1);
        const px = chX + life * 26 + Math.sin(life * 6 + k) * 2;
        const py = chY - life * 44;
        const r = 2 + life * 7;
        ctx.fillStyle = 'rgba(150,160,190,' + (0.22 * (1 - life)) + ')';
        ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
      }
    }

    drawIntroWolves(t, cam);

    // The distant answering howl: glitchy sound waves from beyond the right tree line.
    if (t >= 21.4 && t < 24.6) drawDistantHowlGlitch(296, 126, (t - 21.4) / 3.2);
    // Birds burst out of the treetops when the howl hits.
    if (t >= 21.55 && t < 26) {
      const a = t - 21.55;
      ctx.fillStyle = '#0b1220';
      for (let b = 0; b < 7; b++) {
        const bx = 250 + b * 9 - a * (34 + b * 6) + Math.sin(b * 2) * 6;
        const by = 120 - a * (22 + b * 3) - b * 3 + Math.sin(a * 6 + b) * 2;
        const flap = Math.floor(a * 10 + b) % 2;
        ctx.fillRect(Math.round(bx) - 2, Math.round(by) - flap, 2, 1);
        ctx.fillRect(Math.round(bx) + 1, Math.round(by) - flap, 2, 1);
        ctx.fillRect(Math.round(bx), Math.round(by), 1, 1);
      }
    }
    // Fireflies in the meadow near home.
    if (t > 24) {
      ctx.globalCompositeOperation = 'lighter';
      for (let f = 0; f < 18; f++) {
        const fx = 1040 + introHash(f * 3.3) * 420 + Math.sin(t * 0.7 + f) * 8 - cam;
        const fy = introGroundY(fx + cam) - 6 - introHash(f * 1.9) * 26 + Math.sin(t * 1.3 + f * 2) * 4;
        const blink = Math.max(0, Math.sin(t * (1.5 + introHash(f) * 2) + f * 4));
        if (fx < -4 || fx > 324 || blink < 0.05) continue;
        ctx.fillStyle = 'rgba(200,255,140,' + (0.85 * blink) + ')'; ctx.fillRect(Math.round(fx), Math.round(fy), 1, 1);
        ctx.fillStyle = 'rgba(170,255,120,' + (0.15 * blink) + ')'; ctx.fillRect(Math.round(fx) - 1, Math.round(fy) - 1, 3, 3);
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    // Foreground grass silhouettes swaying in the wind (fastest parallax layer).
    ctx.fillStyle = '#0a130f';
    for (let i = 0; i < 90; i++) {
      const wx = i * 23 + introHash(i) * 12;
      const x = ((wx - cam * 1.35) % 2070 + 2070) % 2070 - 20;
      if (x < -20 || x > 340) continue;
      const h = 8 + introHash(i * 2.2) * 14;
      const sway = Math.sin(t * 1.6 + i) * 2;
      for (let b = -2; b <= 2; b++) {
        ctx.beginPath();
        ctx.moveTo(x + b * 2, 242); ctx.lineTo(x + b * 3 + sway + b, 242 - h + Math.abs(b) * 2); ctx.lineTo(x + b * 2 + 2, 242);
        ctx.closePath(); ctx.fill();
      }
    }
    ctx.restore();

    // Cool moonlight grade, stronger at night, plus a vignette.
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = 'rgba(' + Math.round(255 - sky.night * 40) + ',' + Math.round(240 - sky.night * 20) + ',255,1)';
    ctx.fillRect(0, 0, 320, 240);
    ctx.globalCompositeOperation = 'source-over';
    drawIntroVignette(0.75 + sky.night * 0.25);
  }

  function loreShape(color, points) {
    ctx.fillStyle = color;
    ctx.beginPath();
    points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    ctx.closePath(); ctx.fill();
  }

  function drawLoreMorwen(x, y, frame) {
    // Morwen alone uses the Hime design. No resident substitutes for her.
    if (imgReady(distinctCastArt)) ctx.drawImage(distinctCastArt, frame * 20, 0, 20, 29, x - 34, y - 99, 68, 99);
  }
  function drawLoreWatchStandard(x, ground, scale) {
    ctx.save(); ctx.translate(x, ground); ctx.scale(scale, scale);
    ctx.fillStyle = '#c3cfdb'; ctx.fillRect(-1, -76, 2, 76);
    loreShape('#566887', [[0,-69],[25,-66],[23,-39],[12,-45],[0,-40]]);
    loreShape('#e1d9bc', [[12,-64],[16,-59],[13,-53],[9,-56]]);
    loreShape('#d8dee9', [[0,-84],[-3,-76],[3,-76]]);
    ctx.restore();
  }
  function introPlate(image, x, y, w, h, tint) {
    if (imgReady(image)) ctx.drawImage(tint ? tintedSheet(image, tint) : image, x, y, w, h);
  }

  function drawIntroLore({ scene, t }) {
    const reduced = prefersReducedMotion(), motion = reduced ? 0 : t;
    const sky = ctx.createLinearGradient(0, 0, 0, 225);
    sky.addColorStop(0, '#18182e'); sky.addColorStop(1, '#59527b');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, 320, 240);

    if (scene.id === 'long-winter') {
      introPlate(coastArt['court-wall'], 0, -8, 320, 168, '44,46,74,.31');
      ctx.fillStyle = '#202036'; ctx.fillRect(0, 152, 320, 88);
      const prop = (id, x, y, w, h) => drawInteriorArt(...PI_ART[id], x, y, w, h);
      prop('rugBlue', 50, 112, 225, 118);
      prop('windowBlue', 51, 22, 85, 80);
      ctx.save();
      ctx.beginPath(); ctx.rect(65, 35, 57, 46); ctx.clip();
      ctx.fillStyle = '#25304c'; ctx.fillRect(65, 35, 57, 46);
      introPlate(frostArt[3], 63, 35, 66, 52);
      for (let i = 0; i < 22; i++) {
        ctx.fillStyle = i % 4 === 0 ? '#d6e4f3' : '#8e9eb6';
        ctx.fillRect(65 + (introHash(i * 5.7) * 57 + motion * 3) % 57, 35 + (introHash(i * 9.3) * 46 + motion * 7) % 46, 1, 1);
      }
      ctx.fillStyle = '#656583'; ctx.fillRect(92, 35, 2, 46); ctx.fillRect(65, 57, 57, 2);
      ctx.restore();
      prop('nightstand', 240, 108, 45, 47); prop('lamp', 251, 77, 24, 38);
      prop('bedDoubleBlue', 156, 89, 87, 100);
      ctx.fillStyle = 'rgba(20,22,45,.23)'; ctx.fillRect(0, 0, 320, 240);
      tideGlow(263, 95, 60, '255,175,112', .42);
      tideGlow(99, 71, 73, '143,176,255', .22);
      drawLoreMorwen(129, 181, 0);
    } else if (scene.id === 'hollow-seal') {
      introPlate(hollowArt.back, 0, -20, 320, 240, '39,24,69,.44');
      introPlate(hollowArt.middle, 0, 0, 320, 240, '30,21,49,.26');
      introPlate(hollowArt.ground, 0, 154, 320, 80, '57,37,76,.33');
      const ward = smooth01((t - 4.0) / 1.4);
      tideGlow(161, 125, 86, '192,149,255', .55 - ward * .18);
      introPlate(sceneryArt['crystal-1'], 117, 81, 86, 86, '145,128,247,.58');
      drawFoundry('hex-sigil', 160, 151, motion, 1.45, 1, ward * .76, true);
    } else {
      drawIntroBrightStars(0, 0, .74, motion);
      introPlate(passArt.far, 0, 20, 320, 192, '64,52,109,.58');
      introPlate(gloamArt.forest, 0, 54, 320, 186, '43,36,77,.38');
      const y = scene.id === 'morwens-vow' ? 54 + Math.round(smooth01(motion / 5) * 13) : 71;
      const breakAt = 4.36, fractured = scene.id === 'moonfall' && t >= breakAt;
      tideGlow(205, y, 69, '171,179,248', .33);
      if (fractured) {
        drawFracturedMoon(205, y, 20, getIntroSkyMoon(), motion, 1);
        const fall = reduced ? .62 : smooth01((t - breakAt) / 3);
        for (let i = 0; fall > .04 && i < 7; i++) {
          const x = 205 + fall * (i - 3) * 29, sy = y + fall * (45 + i * 13), size = i === 4 ? 24 : 13;
          tideGlow(x, sy, size, '179,140,252', .28);
          introPlate(sceneryArt['crystal-1'], x - size / 2, sy - size / 2, size, size, '181,153,251,.57');
        }
      } else {
        const moon = getIntroSkyMoon();
        if (moon) ctx.drawImage(moon, 185, y - 20);
        else { ctx.fillStyle = '#e2ddf2'; ctx.beginPath(); ctx.arc(205, y, 19, 0, Math.PI * 2); ctx.fill(); }
        drawFoundry('arc-discharge', 155, 111, motion, .87, 1, .56, true);
      }
      if (scene.id === 'moonfall') {
        drawLoreWatchStandard(58, 204, .85);
        drawLoreWatchStandard(89, 194, .65);
      }
      drawLoreMorwen(scene.id === 'moonfall' ? 151 : 110, 198,
        reduced ? 0 : fractured ? 4 + Math.floor(motion * 4) % 2 : Math.floor(motion * 4) % 4);
    }
    drawIntroVignette(.48);
  }

  function bookEmblem(x, y, r, page) {
    ctx.save(); ctx.translate(x, y);
    ctx.strokeStyle = '#a88043'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0, 0, r + 5, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#5a4852'; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ebcc8e'; ctx.beginPath(); ctx.arc(-2, -2, r - 4, .8, 5.75); ctx.lineTo(0, 3); ctx.closePath(); ctx.fill();
    loreShape('#c7a1c4', [[5,-8],[11,-1],[6,9],[2,3]]);
    if (page > 0) {
      ctx.fillStyle = '#f1d6a0';
      for (let i = 0; i < page; i++) ctx.fillRect(-r + 4 + i * 5, r + 11, 2, 2);
    }
    ctx.restore();
  }

  function drawBookCover(fold) {
    if (fold <= .005) return;
    ctx.save(); ctx.translate(132, 41); ctx.scale(fold * 1.42, 1);
    ctx.fillStyle = '#110d17'; ctx.fillRect(-3, 4, 121, 158);
    ctx.fillStyle = '#342333'; ctx.fillRect(0, 0, 116, 156);
    ctx.fillStyle = '#513747'; ctx.fillRect(5, 2, 108, 150);
    ctx.fillStyle = '#2b202c'; ctx.fillRect(13, 6, 96, 139);
    ctx.strokeStyle = '#ba9251'; ctx.strokeRect(16.5, 12.5, 85, 129);
    for (const cx of [17, 98]) for (const cy of [13, 137]) ctx.fillRect(cx, cy, 4, 4);
    ctx.fillStyle = '#916e51';
    for (const y of [19, 42, 120, 135]) ctx.fillRect(0, y, 11, 3);
    bookEmblem(59, 60, 21, 0);
    if (!drawPaper('panel', 24, 94, 70, 26)) { ctx.fillStyle = '#dbc39a'; ctx.fillRect(24, 94, 70, 26); }
    ctx.fillStyle = '#493241'; ctx.font = 'bold 10px Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText('MOONFALL', 59, 110);
    ctx.restore();
  }

  function drawBookBackground() {
    const bg = ctx.createRadialGradient(157, 114, 26, 157, 114, 195);
    bg.addColorStop(0, '#54363b'); bg.addColorStop(.65, '#241b28'); bg.addColorStop(1, '#0c0b15');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, 320, 240);
    for (let i = 0; i < 13; i++) {
      const y = 16 + i * 18;
      ctx.fillStyle = i % 2 ? 'rgba(172,110,78,.10)' : 'rgba(8,6,14,.23)';
      ctx.fillRect(0, y, 320, 1);
    }
  }

  const BOOK_ART = [143, 53, 144, 108];
  const BOOK_SCREEN = [0, 0, 320, 240];
  let bookArtCanvas = null;
  function renderBookPlate(page, lore, t) {
    if (!bookArtCanvas) {
      bookArtCanvas = document.createElement('canvas');
      bookArtCanvas.width = 320; bookArtCanvas.height = 240;
    }
    const main = ctx;
    ctx = bookArtCanvas.getContext('2d');
    ctx.save();
    try {
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = '#0b0d1b'; ctx.fillRect(0, 0, 320, 240);
      if (lore) drawIntroLore(lore);
      else if (page === 5) drawIntroNight(t);
      else drawIntroSpace(t);
    } finally { ctx.restore(); ctx = main; }
    return bookArtCanvas;
  }
  function drawBookIllustration(page, lore, t, [x, y, w, h]) {
    // Crop the same 4:3 artwork at each size; never stretch the illustration.
    const art = renderBookPlate(page, lore, t);
    const s = Math.max(w / 320, h / 240);
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.drawImage(art, x + (w - 320 * s) / 2, y + (h - 240 * s) / 2, 320 * s, 240 * s);
    ctx.restore();
  }
  function drawBookLeft(page, lore) {
    loreShape('#dcc398', [[24,43],[110,40],[132,48],[131,190],[112,184],[24,184]]);
    ctx.strokeStyle = '#987449'; ctx.strokeRect(34.5, 53.5, 78, 121);
    const title = lore?.scene.heading || (page === 5 ? ['THE', 'FRONTIER'] : ['BEFORE THE', 'MOONFALL']);
    bookEmblem(74, 89, 19, page);
    ctx.fillStyle = '#574033'; ctx.textAlign = 'center'; ctx.font = 'bold 11px Georgia, serif';
    title.forEach((line, i) => ctx.fillText(line, 74, 131 + i * 13));
    ctx.fillStyle = '#a47e4f'; ctx.fillRect(55, 153, 38, 1);
  }
  function drawBookRight(page, lore, t) {
    loreShape('#ead7ae', [[132,48],[287,42],[296,48],[296,185],[136,192]]);
    ctx.strokeStyle = '#987449'; ctx.strokeRect(142.5, 52.5, 145, 109);
    drawBookIllustration(page, lore, t, BOOK_ART);
    ctx.fillStyle = '#6b5140'; ctx.font = '7px monospace'; ctx.textAlign = 'center';
    ctx.fillText(['I', 'II', 'III', 'IV', 'V', 'VI'][page], 215, 181);
  }
  function drawStorybook(page, lore, t) {
    const reduced = prefersReducedMotion();
    const { open, turn, fold, zoom } = introBookPose(introTime, page, reduced);
    const coverFold = Math.cos(Math.PI * open);
    const prevTime = turn ? INTRO_PAGE_STARTS[page] - .001 : 0;
    const prevLore = turn ? introLoreAt(prevTime) : null;
    drawBookBackground();
    ctx.save();
    if (zoom > 0 && !reduced) {
      // Push the camera through the printed frame, keeping the paper attached.
      const [x, y, w, h] = BOOK_ART, cx = x + w / 2, cy = y + h / 2;
      const scale = 1 + (320 / w - 1) * zoom;
      ctx.translate(cx + (160 - cx) * zoom, cy + (120 - cy) * zoom);
      ctx.scale(scale, scale);
      ctx.translate(-cx, -cy);
    }
    ctx.translate(-52 * (1 - open) ** 2, 0);
    if (open > 0) {
      // Hide the left page until the cover swings past the binding.
      const left = open === 1 ? 13 : 132 - Math.max(0, -coverFold) * 119;
      ctx.save(); ctx.beginPath(); ctx.rect(left, 32, 309 - left, 177); ctx.clip();
      ctx.fillStyle = '#100c16'; ctx.fillRect(13, 42, 294, 160);
      loreShape('#5b3a48', [[16,38],[119,35],[136,42],[285,35],[306,45],[304,193],[139,205],[124,199],[16,194]]);
      loreShape('#bc9467', [[21,40],[124,36],[136,42],[288,39],[300,48],[299,187],[137,199],[124,193],[22,188]]);
      drawPaper('panel', 22, 37, 278, 155);
      drawBookLeft(turn ? page - 1 : page, turn ? prevLore : lore);
      drawBookRight(page, lore, t);
      if (turn && Math.abs(fold) > .004) {
        ctx.save();
        ctx.translate(132, 0); ctx.scale(Math.abs(fold), 1); ctx.translate(-132, 0);
        if (fold > 0) drawBookRight(page - 1, prevLore, prevTime);
        else drawBookLeft(page, lore);
        ctx.fillStyle = `rgba(94,55,37,${.33 * (1 - Math.abs(fold))})`;
        ctx.fillRect(fold > 0 ? 132 : 24, 48, fold > 0 ? 163 : 108, 136);
        ctx.restore();
      }
      const gutter = ctx.createLinearGradient(120, 0, 146, 0);
      gutter.addColorStop(0, 'rgba(88,48,38,0)'); gutter.addColorStop(.5, 'rgba(88,48,38,.43)'); gutter.addColorStop(1, 'rgba(88,48,38,0)');
      ctx.fillStyle = gutter; ctx.fillRect(120, 45, 26, 147);
      loreShape('#833d49', [[128,46],[133,46],[133,204],[130,201],[127,204]]);
      ctx.restore();
    }
    if (open < .5) drawBookCover(coverFold);
    ctx.restore();
    if (page === 5 && zoom > 0) {
      ctx.save(); ctx.globalAlpha = zoom;
      if (reduced) drawBookIllustration(page, lore, t, BOOK_SCREEN);
      drawIntroLetterbox();
      ctx.restore();
    }
  }

  function drawIntro() {
    const lore = introLoreAt(introTime);
    const t = introTime < INTRO_SPACE_END ? introTime : introTime - INTRO_LORE_LENGTH;
    const page = introBookPage(introTime, lore);
    ctx.fillStyle = '#03050d'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (page < 6) {
      drawStorybook(page, lore, t);
    } else if (t < 38.5) {
      drawIntroNight(t);
      drawIntroLetterbox();
      const fadeOut = Math.max(0, Math.min(1, (t - 36.8) / 1.7));
      if (fadeOut > 0) { ctx.fillStyle = 'rgba(0,0,0,' + fadeOut + ')'; ctx.fillRect(0, 0, 320, 240); }
    } else {
      const p = Math.min(1, (t - 38.5) / 1.4);
      ctx.save();
      ctx.translate(160, 120); ctx.scale(1.22 - p * .22, 1.22 - p * .22); ctx.translate(-160, -120);
      drawHouseInterior();
      ctx.restore();
      const fadeIn = 1 - Math.min(1, (t - 38.5) / 0.9);
      if (fadeIn > 0) { ctx.fillStyle = 'rgba(0,0,0,' + fadeIn + ')'; ctx.fillRect(0, 0, 320, 240); }
      const fade = Math.max(0, Math.min(1, (t - 45.5) / 1));
      if (fade > 0) { ctx.fillStyle = 'rgba(0,0,0,' + fade + ')'; ctx.fillRect(0, 0, 320, 240); }
    }
    drawIntroCaptions();
    ctx.fillStyle = 'rgba(235,229,211,.72)'; ctx.font = '6px monospace'; ctx.textAlign = 'left';
    ctx.fillText(inputMode === 'touch' ? 'TAP TO SKIP' : 'PRESS ANY BUTTON TO SKIP', 14, 236);
  }
  let worldClock = 0.28, wolfSpawned = false, wolfNoticeCooldown = 0;
  const wolves = [];
  const DAY_LENGTH = 180;
  let battle = null;
  const BATTLE_FADE = 0.7;
  // CC0 forest-enemy sprite sheet by Vomdrache (OpenGameArt).
  // The middle cell of row two is the detailed grey wolf used in battles.
  // User-provided free werewolf sprites: idle poses converted to compact 48px images.
  // Use only the supplied animated sheets in the intro; no legacy standing sprites.
  const introBlackWalk = new Image();
  introBlackWalk.src = './assets/werewolves/Black_Werewolf/walk.png';
  const introBlackRun = new Image();
  introBlackRun.src = './assets/werewolves/Black_Werewolf/Run.png';
  const introRedWalk = new Image();
  introRedWalk.src = './assets/werewolves/Red_Werewolf/Walk.png';
  const introRedRun = new Image();
  introRedRun.src = './assets/werewolves/Red_Werewolf/Run.png';
  let introWolfFleePaths = null;

  let camX = 0, camY = 0;
  let panel = null;
  let dialogue = null;   // { lines: [{name, text, color}], i, shown, onDone }
  let bossFight = null;  // { active, intro, t }
  let paused = false;
  let pauseSelection = 0;
  let notice = '';
  let noticeUntil = 0;
  let stepDistance = 0;
  const keys = new Set();
  const player = { x: SPAWN.x * TILE, y: SPAWN.y * TILE, facing: 'down', moving: false, walk: 0 };
  const playerSheet = new Image();
  let playerSheetReady = false;
  playerSheet.onload = () => { playerSheetReady = true; };
  playerSheet.onerror = () => { playerSheetReady = false; };
  playerSheet.src = './assets/player-character3.png';

  // Actual knight sprite sheets from the ZIP the player added to the repository.
  const knightSprites = {};
  ['Idle','Run','Attacks','Hurt','Death','Jump','Roll','Pray','Health'].forEach(name => {
    const image = new Image();
    image.src = './assets/knight/' + name + '.png';
    knightSprites[name.toLowerCase()] = image;
  });
  knightSprites.air = new Image();
  knightSprites.air.src = './assets/knight/attack_from_air.png';
  // Monster sheets (single-row strips). Loaded once per file.
  const mobSheets = {};
  function mobSheet(T, anim) {
    const key = T.src + anim[0];
    if (!mobSheets[key]) {
      const img = new Image();
      img.src = './assets/' + T.src + anim[0] + '.png';
      mobSheets[key] = img;
    }
    return mobSheets[key];
  }
  Object.values(MOB_TYPES).forEach(T => Object.values(T.anims).forEach(an => { if (an) mobSheet(T, an); }));
  function loadImg(path) { const i = new Image(); i.src = './assets/' + path; return i; }
  const paperArt = {
    dialogue: loadImg('paper-ui/dialogue.png'), panel: loadImg('paper-ui/panel.png'),
    ribbon: loadImg('paper-ui/ribbon.png'), button: loadImg('paper-ui/button.png'),
    selected: loadImg('paper-ui/button-selected.png')
  };
  function prefersReducedMotion() {
    return !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  }
  function drawPaper(key, x, y, w, h) {
    const img = paperArt[key];
    if (!imgReady(img)) return false;
    ctx.save(); ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, x, y, w, h); ctx.restore();
    return true;
  }
  const hollowArt = {
    back: loadImg('hollow/back.png'), middle: loadImg('hollow/middle.png'), ground: loadImg('hollow/ground.png'), log: loadImg('hollow/log.png'),
    dadIdle: loadImg('hollow/dad-idle.png'), dadWard: loadImg('distinct-cast/aldric-at-seal.png')
  };
  // Mini knight used in the top-down house once Dad's armor is on (2 cols x 4 rows of 90x45).
  const beastArt = { wrenIdle: loadImg('beasts/wren-idle.png'), wrenRun: loadImg('beasts/wren-run.png') };
  const coastArt = Object.fromEntries(['coast-sky', 'coast-ridge', 'coast-rock', 'boat-far', 'boat-middle', 'boat-front', 'front', 'court-wall', 'court-tile', 'ferrier'].map(key => [key, loadImg('chapter4/' + key + '.png')]));
  const miniKnight = { idle: loadImg('knight/mini-idle.png'), run: loadImg('knight/mini-run.png') };
  function imgReady(i) { return i && i.complete && i.naturalWidth > 0; }

  // Forest pack artwork: separate terrain tiles and large transparent decorations.
  const forestTilesSheet = new Image();
  let forestTilesReady = false;
  forestTilesSheet.onload = () => { forestTilesReady = true; };
  forestTilesSheet.onerror = () => { forestTilesReady = false; };
  forestTilesSheet.src = './assets/forest_pack/TopDownFantasy-Forest/Tiles/Tileset.png';

  const forestDecorSheet = new Image();
  let forestDecorReady = false;
  forestDecorSheet.onload = () => { forestDecorReady = true; };
  forestDecorSheet.onerror = () => { forestDecorReady = false; };
  forestDecorSheet.src = './assets/forest_pack/TopDownFantasy-Forest/Decorations/Decorations.png';

  
  // Supplied side-scrolling forest background by Eder Muniz.
  const sideForestBackground = new Image();
  let sideForestBackgroundReady = false;
  sideForestBackground.onload = () => { sideForestBackgroundReady = true; };
  sideForestBackground.onerror = () => { sideForestBackgroundReady = false; };
  sideForestBackground.src = './assets/free_forest/Free Pixel Art Forest/Preview/Background.png';

  const inventory = { berries: 3, wood: 0, fish: 0, fang: 0, tonic: 0, coins: 0, bread: 0, bone: 0, spore: 0, eye: 0, wisp: 0, boneblade: 0, crown: 0,
    ember: 0, feather: 0, lampglass: 0, toadskin: 0, emberedge: 0, moonsilver: 0, palemane: 0, sigil: 0, locket: 0 };
  // Dad's armor is a cosmetic outfit set. It is saved with the player and shown in the world and inventory.
  const equipment = { armor: false, weapon: 'sword' };
  let quickSlot = 'berries';
  const newItems = new Set();
  const stats = { level: 1, health: 20, maxHealth: 20, stamina: 100, maxStamina: 100, strength: 5, defense: 2, steps: 0, playTime: 0, xp: 0, kills: 0, goblinKills: 0, atkUp: 0, defUp: 0, perkAtk: 0, perkDef: 0, critUp: 0, luck: 0, thirst: 0, chargeUp: 0, elites: 0, chests: 0 };

  const bunnies = [
    { x: 17 * TILE, y: 10 * TILE, vx: 0, vy: 0, flee: 0, hop: 0 },
    { x: 22 * TILE, y: 20 * TILE, vx: 0, vy: 0, flee: 0, hop: 1.4 },
    { x: 6 * TILE, y: 18 * TILE, vx: 0, vy: 0, flee: 0, hop: 2.3 },
    { x: 36 * TILE, y: 21 * TILE, vx: 0, vy: 0, flee: 0, hop: 0.8 }
  ];

  const fish = [
    { x: 28.3 * TILE, y: 8.4 * TILE, phase: 0.4, period: 4.9, duration: 0.85 },
    { x: 31.2 * TILE, y: 10.1 * TILE, phase: 2.5, period: 6.3, duration: 0.9 },
    { x: 33.2 * TILE, y: 7.3 * TILE, phase: 4.2, period: 7.1, duration: 0.8 }
  ];

  const HOUSE = { x: 8 * TILE, y: 8 * TILE, w: 7 * TILE, h: 5 * TILE };
  const HOUSE_DOOR = { x: HOUSE.x + HOUSE.w / 2, y: HOUSE.y + 67 };
  let insideHouse = false;
  const interiorPlayer = { x: 208, y: 184, facing: 'up', moving: false, walk: 0 };
  // ---------------------------------------------------------------------------
  // Top-down family home. One coordinate space is shared by drawing, collision
  // and the player (no extra zoom), so furniture and walls always line up.
  //
  //   +-----------+------+-----------+
  //   | Dad's room| Bath | Your room |   back of the house (private rooms)
  //   +--door-----+-door-+-----door--+
  //   |            hallway           |
  //   +---door----+      +--door-----+
  //   | Kitchen & |Entry | Living    |   front of the house
  //   |  dining   |      |  room     |
  //   +-----------+-DOOR-+-----------+
  // ---------------------------------------------------------------------------
  const HOME = Object.freeze({
    left: 18, right: 302, top: 28, bottom: 222,
    backWallY: 100, frontWallY: 140,      // tops of the two interior walls (12px thick)
    leftWallX: 124, rightWallX: 186,      // left edges of the two interior walls (10px thick)
    frontDoor: { x1: 148, x2: 172 }
  });
  const HOUSE_ROOMS = {
    dad:     { x1: 18,  y1: 28,  x2: 124, y2: 100 },
    bath:    { x1: 134, y1: 28,  x2: 186, y2: 100 },
    kid:     { x1: 196, y1: 28,  x2: 302, y2: 100 },
    hall:    { x1: 18,  y1: 112, x2: 302, y2: 140 },
    kitchen: { x1: 18,  y1: 152, x2: 124, y2: 222 },
    entry:   { x1: 134, y1: 140, x2: 186, y2: 222 },
    living:  { x1: 196, y1: 152, x2: 302, y2: 222 }
  };
  // Wall rectangles: [x, y, width, height]. Horizontal interior walls are 12px
  // (4px cap + 8px visible face); door gaps are simply left out.
  const INTERIOR_WALLS = [
    // Outer shell. The back wall is tall so windows and pictures can hang on it.
    [8, 4, 304, 24], [8, 4, 10, 228], [302, 4, 10, 228],
    [8, 222, 140, 10], [172, 222, 140, 10],
    // Back wall of the hallway: doors to Dad's room, the bathroom and your room.
    [18, 100, 40, 12], [86, 100, 61, 12], [173, 100, 61, 12], [262, 100, 40, 12],
    // Front wall of the hallway: kitchen door, open entry, living-room door.
    [18, 140, 70, 12], [116, 140, 18, 12], [186, 140, 14, 12], [228, 140, 74, 12],
    // Walls between the side rooms.
    [124, 4, 10, 96], [186, 4, 10, 96],
    [124, 140, 10, 82], [186, 140, 10, 82]
  ];
  const HOUSE_DOORS = [
    // Interior doorways, used to draw door frames and thresholds.
    { x1: 58, x2: 86, y: 100 }, { x1: 147, x2: 173, y: 100 }, { x1: 234, x2: 262, y: 100 },
    { x1: 88, x2: 116, y: 140 }, { x1: 200, x2: 228, y: 140 }
  ];
  // Player positions are the sprite's top-left (feet hitbox is x+3..x+12, y+9..y+15).
  const KID_SPAWN = { x: 250, y: 58, facing: 'down' };   // beside your bed
  const ENTRY_SPAWN = { x: 152, y: 192, facing: 'up' };  // just inside the front door
  const HOUSE_LAYOUT_VERSION = 2;
  const interiorArtSheet = new Image();
  let interiorArtReady = false;
  interiorArtSheet.onload = () => { interiorArtReady = true; };
  interiorArtSheet.onerror = () => { interiorArtReady = false; };
  interiorArtSheet.src = './assets/interiors/Pixel_Interiors/Interior.png';

  function drawInteriorArt(sx, sy, sw, sh, x, y, w, h) {
    if (!interiorArtReady) return;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(interiorArtSheet, sx, sy, sw, sh, x, y, w, h);
    ctx.restore();
  }

  const interiorSheet = new Image();
  let interiorSheetReady = false;
  interiorSheet.onload = () => { interiorSheetReady = true; };
  interiorSheet.onerror = () => { interiorSheetReady = false; };
  interiorSheet.src = './assets/kenney-interior-tilemap.png';

  function drawInteriorSprite(col, row, cols, rows, x, y, drawW = cols * 16, drawH = rows * 16) {
    if (!interiorSheetReady) return;
    const sx = col * 17, sy = row * 17;
    const sw = cols * 17 - 1, sh = rows * 17 - 1;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(interiorSheet, sx, sy, sw, sh, x, y, drawW, drawH);
    ctx.restore();
  }

  const MAILBOX = { x: 15.4 * TILE, y: 12.4 * TILE };
  // Dad's note rests on his nightstand; the armor stand is by his doorway.
  const DAD_NOTE = { x: 77, y: 52 };   // where the player stands to read it (player centre)
  const DAD_ARMOR = { x: 108, y: 88 }; // centre of the armor stand footprint
  function interiorCenter() {
    return { x: interiorPlayer.x + 8, y: interiorPlayer.y + 12 };
  }
  function dadNoteDistance() { const c = interiorCenter(); return Math.hypot(c.x - DAD_NOTE.x, c.y - DAD_NOTE.y); }
  function dadArmorDistance() { const c = interiorCenter(); return Math.hypot(c.x - DAD_ARMOR.x, c.y - DAD_ARMOR.y); }
  function nearDadNote() { return dadNoteDistance() < 16; }
  function nearDadArmor() { return dadArmorDistance() < 20; }
  function nearFrontDoor() {
    const c = interiorCenter();
    return c.x > HOME.frontDoor.x1 - 6 && c.x < HOME.frontDoor.x2 + 6 && c.y > 196;
  }

  // Furniture. Each entry owns its artwork AND its collision footprint, so the
  // two can never drift apart. Tall pieces stand against a wall and overlap the
  // wall face (3/4 view); their footprint is only the part touching the floor.
  //   art: [sx, sy, sw, sh] from Pixel_Interiors/Interior.png, or draw: fn(x, y, w, h)
  //   solid: [x1, y1, x2, y2] footprint, omitted for rugs and wall decor
  //   layer: 'floor' (rugs), 'wall' (hung on a wall) or default (depth-sorted)
  const PI_ART = {
    bedDoubleBlue: [16, 50, 43, 46], bedSinglePink: [160, 47, 30, 49],
    wardrobe: [64, 115, 35, 45], nightstand: [240, 181, 26, 27], lamp: [207, 179, 18, 27],
    bookshelf: [336, 38, 48, 58], chest: [496, 428, 24, 20], toyHorse: [541, 423, 29, 25],
    globe: [580, 431, 15, 17], diningSet: [16, 335, 70, 33], roundTable: [195, 329, 45, 39],
    barrel: [399, 377, 19, 23], vegCrate: [166, 403, 29, 29], plateRack: [16, 387, 24, 45],
    plantBig: [336, 424, 38, 24], plantPink: [432, 424, 19, 24], plantRed: [467, 424, 14, 24],
    rugBeige: [240, 544, 81, 62], rugBlue: [544, 544, 79, 60], rugOrange: [112, 544, 110, 77], rugRed: [16, 544, 78, 46],
    windowBlue: [572, 250, 40, 38], windowPink: [622, 250, 40, 38],
    painting: [501, 377, 36, 25], clock: [549, 381, 17, 18], frameA: [439, 378, 16, 22], frameB: [471, 378, 16, 22]
  };
  const HOUSE_FURNITURE = [
    // ----- Dad's bedroom (back left) -----
    { art: 'painting', x: 31, y: 9, w: 26, h: 18, layer: 'wall' },
    { art: 'clock', x: 71, y: 11, w: 11, h: 12, layer: 'wall' },
    { art: 'rugBeige', x: 30, y: 62, w: 58, h: 34, layer: 'floor' },
    { art: 'bedDoubleBlue', x: 21, y: 22, w: 43, h: 46, solid: [21, 30, 64, 66] },
    { art: 'nightstand', x: 68, y: 25, w: 18, h: 19, solid: [68, 31, 86, 43], id: 'dad-nightstand' },
    { art: 'wardrobe', x: 91, y: 13, w: 31, h: 40, solid: [91, 33, 122, 52] },
    { art: 'chest', x: 32, y: 70, w: 22, h: 18, solid: [32, 76, 54, 87] },
    { draw: 'armorStand', x: 108, y: 94, solid: [100, 85, 116, 95] },

    // ----- Bathroom (back centre) -----
    { art: 'windowBlue', x: 139, y: 8, w: 17, h: 16, layer: 'wall' },
    { draw: 'mirror', x: 173, y: 9, w: 11, h: 12, layer: 'wall' },
    { draw: 'bathMat', x: 158, y: 58, w: 18, h: 10, layer: 'floor' },
    { draw: 'tub', x: 135, y: 24, w: 21, h: 42, solid: [135, 28, 156, 66] },
    { draw: 'toilet', x: 157, y: 25, w: 14, h: 20, solid: [157, 28, 171, 45] },
    { draw: 'sink', x: 172, y: 24, w: 13, h: 19, solid: [172, 28, 185, 43] },

    // ----- Your bedroom (back right) -----
    { art: 'windowPink', x: 234, y: 7, w: 22, h: 20, layer: 'wall' },
    { art: 'rugBlue', x: 214, y: 58, w: 50, h: 30, layer: 'floor' },
    { art: 'bookshelf', x: 199, y: 12, w: 30, h: 37, solid: [199, 34, 229, 48] },
    { art: 'nightstand', x: 251, y: 27, w: 16, h: 17, solid: [251, 33, 267, 44] },
    { art: 'lamp', x: 254, y: 17, w: 10, h: 15, z: 45 },
    { art: 'bedSinglePink', x: 270, y: 22, w: 30, h: 49, solid: [270, 30, 300, 70] },
    { art: 'toyHorse', x: 205, y: 76, w: 17, h: 15, solid: [206, 83, 221, 91] },
    { art: 'chest', x: 274, y: 78, w: 20, h: 16, solid: [274, 84, 294, 94] },

    // ----- Hallway -----
    { art: 'frameA', x: 104, y: 101, w: 8, h: 10, layer: 'wall' },
    { art: 'frameB', x: 207, y: 101, w: 8, h: 10, layer: 'wall' },
    { draw: 'runner', x: 30, y: 120, w: 260, h: 13, layer: 'floor' },
    { art: 'plantRed', x: 21, y: 112, w: 12, h: 22, solid: [21, 126, 33, 134] },
    { art: 'plantPink', x: 287, y: 113, w: 13, h: 20, solid: [287, 126, 300, 134] },

    // ----- Kitchen and dining (front left) -----
    { art: 'clock', x: 70, y: 141, w: 9, h: 10, layer: 'wall' },
    { draw: 'fridge', x: 20, y: 137, w: 15, h: 33, solid: [20, 152, 35, 170] },
    { draw: 'counter', x: 35, y: 150, w: 16, h: 20, sink: true, solid: [35, 152, 51, 170] },
    { draw: 'stove', x: 51, y: 150, w: 16, h: 20, solid: [51, 152, 67, 170] },
    { draw: 'counter', x: 67, y: 150, w: 19, h: 20, solid: [67, 152, 86, 170] },
    { art: 'rugRed', x: 34, y: 174, w: 62, h: 36, layer: 'floor' },
    { art: 'diningSet', x: 35, y: 178, w: 60, h: 28, solid: [37, 184, 93, 202] },
    { art: 'barrel', x: 20, y: 197, w: 15, h: 18, solid: [20, 206, 35, 215] },
    { art: 'vegCrate', x: 104, y: 199, w: 19, h: 19, solid: [104, 207, 123, 218] },

    // ----- Entry (front centre) -----
    { draw: 'runner', x: 150, y: 160, w: 20, h: 44, layer: 'floor' },
    { draw: 'doormat', x: 150, y: 210, w: 20, h: 10, layer: 'floor' },
    { art: 'plantPink', x: 136, y: 199, w: 12, h: 19, solid: [136, 210, 148, 218] },
    { art: 'plantRed', x: 173, y: 197, w: 11, h: 21, solid: [173, 210, 184, 218] },

    // ----- Living room (front right) -----
    { art: 'rugOrange', x: 232, y: 170, w: 66, h: 42, layer: 'floor' },
    { art: 'lamp', x: 232, y: 140, w: 12, h: 19, solid: [233, 153, 243, 159] },
    { draw: 'sofa', x: 246, y: 146, w: 52, h: 24, solid: [246, 152, 298, 170] },
    { art: 'roundTable', x: 256, y: 178, w: 32, h: 26, solid: [258, 184, 286, 200] },
    { draw: 'armchair', x: 205, y: 180, w: 22, h: 22, solid: [205, 186, 227, 202] },
    { art: 'plantBig', x: 262, y: 201, w: 36, h: 21, solid: [264, 210, 296, 221] },
    { art: 'plantPink', x: 267, y: 176, w: 9, h: 12, z: 201 }
  ];

  function interiorBlocked(px, py) {
    // px/py are the sprite's top-left; collide using the feet only.
    const left = px + 3, right = px + 12, top = py + 9, bottom = py + 15;
    for (const [x, y, w, h] of INTERIOR_WALLS) {
      if (left < x + w && right > x && top < y + h && bottom > y) return true;
    }
    for (const f of HOUSE_FURNITURE) {
      if (!f.solid) continue;
      const [x1, y1, x2, y2] = f.solid;
      if (left < x2 && right > x1 && top < y2 && bottom > y1) return true;
    }
    // Keep the player inside the front doorway instead of walking out of the house.
    return bottom > HOME.bottom + 2;
  }

  function rng(seed) {
    let s = seed >>> 0;
    return () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  function buildMap() {
    const rand = rng(1337);
    const grid = [];
    for (let y = 0; y < MAP_H; y++) {
      const row = [];
      for (let x = 0; x < MAP_W; x++) {
        const border = x === 0 || y === 0 || x === MAP_W - 1 || y === MAP_H - 1;
        row.push(border ? 'B' : rand() < 0.05 ? 'F' : 'G');
      }
      grid.push(row);
    }

    const put = (x, y, tile) => {
      if (x > 0 && y > 0 && x < MAP_W - 1 && y < MAP_H - 1) grid[y][x] = tile;
    };
    const fill = (x0, y0, x1, y1, tile) => {
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) put(x, y, tile);
    };

    // Lake and rocky bank
    fill(26, 6, 34, 12, 'W');
    [[25, 7], [25, 11], [35, 9], [28, 13], [30, 13]].forEach(([x, y]) => put(x, y, 'R'));

    // House footprint and front door
    fill(8, 8, 14, 12, 'H');
    put(11, 12, 'D');

    // Roads and path leading to the house
    fill(2, 15, 37, 15, 'P');
    fill(11, 13, 11, 14, 'P');
    fill(20, 16, 20, 27, 'P');

    for (let y = 1; y < MAP_H - 1; y++) {
      for (let x = 1; x < MAP_W - 1; x++) {
        const tile = grid[y][x];
        if (tile !== 'G' && tile !== 'F') continue;
        if (Math.hypot(x - SPAWN.x, y - SPAWN.y) < 4) continue;
        if (rand() < 0.065) {
          // Keep full-size trees separated so their canopies do not pile up.
          let clear = true;
          for (let ny = Math.max(1, y - 1); ny <= Math.min(MAP_H - 2, y + 1); ny++) {
            for (let nx = Math.max(1, x - 1); nx <= Math.min(MAP_W - 2, x + 1); nx++) {
              if (grid[ny][nx] === 'T') clear = false;
            }
          }
          if (clear) grid[y][x] = 'T';
        }
      }
    }
    return grid;
  }

  function tileAt(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return 'B';
    return map[ty][tx];
  }

  function mailboxBlocked(px, py) {
    const left = MAILBOX.x - 5, right = MAILBOX.x + 5;
    const top = MAILBOX.y - 14, bottom = MAILBOX.y + 2;
    const playerLeft = px + 3, playerRight = px + 12;
    const playerTop = py + 9, playerBottom = py + 15;
    return playerLeft < right && playerRight > left && playerTop < bottom && playerBottom > top;
  }

  function blocked(px, py) {
    // Test the whole lower-body hitbox, not just its four corners.
    // This prevents slipping through the edges of trees, rocks, water, and buildings.
    const left = px + 3, right = px + 12;
    const top = py + 9, bottom = py + 15;
    const minTileX = Math.floor(left / TILE);
    const maxTileX = Math.floor((right - 0.001) / TILE);
    const minTileY = Math.floor(top / TILE);
    const maxTileY = Math.floor((bottom - 0.001) / TILE);

    for (let ty = minTileY; ty <= maxTileY; ty++) {
      for (let tx = minTileX; tx <= maxTileX; tx++) {
        if (SOLID.has(tileAt(tx, ty))) return true;
      }
    }

    // The tree canopy is decorative; only the narrow visible trunk blocks walking.
    for (let ty = Math.max(0, minTileY - 1); ty <= Math.min(MAP_H - 1, maxTileY); ty++) {
      for (let tx = Math.max(0, minTileX - 1); tx <= Math.min(MAP_W - 1, maxTileX + 1); tx++) {
        if (tileAt(tx, ty) !== 'T') continue;
        const trunkLeft = tx * TILE + 5;
        const trunkRight = tx * TILE + 11;
        const trunkTop = ty * TILE + 9;
        const trunkBottom = ty * TILE + 16;
        if (left < trunkRight && right > trunkLeft && top < trunkBottom && bottom > trunkTop) return true;
      }
    }
    return mailboxBlocked(px, py);
  }

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  function isNight() { const h = worldClock % 1; return h >= 0.76 || h < 0.19; }
  function clockLabel() { const hour = Math.floor((worldClock % 1) * 24); return (hour % 12 || 12) + ':00 ' + (hour >= 12 ? 'PM' : 'AM'); }
  function spawnWolves() {
    wolves.length = 0;
    // Keep the night encounter readable: only two wolves patrol the area.
    const offsets = [[-150,-85],[150,85],[-155,85],[155,-85],[0,-175],[0,175]];
    for (let i = 0; i < offsets.length && wolves.length < 2; i++) {
      const [ox, oy] = offsets[i];
      let x = clamp(player.x + ox, TILE * 2, (MAP_W - 3) * TILE);
      let y = clamp(player.y + oy, TILE * 2, (MAP_H - 3) * TILE);
      for (let n = 0; n < 12 && blocked(x, y); n++) {
        x = clamp(x + (i % 2 ? 16 : -16), TILE * 2, (MAP_W - 3) * TILE);
        y = clamp(y + (i % 2 ? -16 : 16), TILE * 2, (MAP_H - 3) * TILE);
      }
      if (!blocked(x, y) && Math.hypot(player.x - x, player.y - y) > 110) {
        wolves.push({ x, y, attackCooldown: 0, howl: i * 0.7 });
      }
    }
  }
  function updateWolves(dt) {
    if (!isNight()) { wolves.length = 0; wolfSpawned = false; return; }
    if (!wolfSpawned) {
      spawnWolves();
      wolfSpawned = true;
      notice = 'Two wolves are roaming nearby...';
      noticeUntil = time + 3.5;
    }
    wolves.forEach(w => {
      const dx = player.x - w.x, dy = player.y - w.y;
      const distance = Math.max(1, Math.hypot(dx, dy));
      // Wolves remain calm at a distance, then slowly approach when the player gets close.
      const speed = distance <= 145 ? 22 : 0;
      const vx = dx / distance * speed, vy = dy / distance * speed;
      const nx = w.x + vx * dt, ny = w.y + vy * dt;
      if (!blocked(nx, w.y)) w.x = nx;
      if (!blocked(w.x, ny)) w.y = ny;
      w.attackCooldown = Math.max(0, w.attackCooldown - dt);
      // The encounter starts only when a wolf reaches very close range.
      if (distance < 27 && !battle) {
        beginBattle(w);
        return;
      }
    });
    wolfNoticeCooldown = Math.max(0, wolfNoticeCooldown - dt);
  }
  function drawWolf(w) {
    const x=Math.round(w.x-camX), y=Math.round(w.y-camY), bob=Math.round(Math.sin(time*8+w.howl));
    ctx.fillStyle='rgba(0,0,0,0.3)'; ctx.fillRect(x-7,y+6,16,3);
    ctx.fillStyle='#343847'; ctx.fillRect(x-5,y+1+bob,3,6); ctx.fillRect(x+3,y+1+bob,3,6);
    ctx.fillStyle='#202431'; ctx.fillRect(x-6,y+5+bob,4,2); ctx.fillRect(x+2,y+5+bob,4,2);
    ctx.fillStyle='#596174'; ctx.fillRect(x-7,y-4+bob,14,8); ctx.fillRect(x+4,y-6+bob,5,7);
    ctx.fillStyle='#8992a2'; ctx.fillRect(x-4,y-5+bob,8,3);
    ctx.fillStyle='#343847'; ctx.fillRect(x-9,y-5+bob,3,2); ctx.fillRect(x-11,y-7+bob,3,3);
    ctx.fillStyle='#687286'; ctx.fillRect(x+5,y-8+bob,7,7); ctx.fillRect(x+7,y-11+bob,2,4); ctx.fillRect(x+11,y-10+bob,2,4);
    ctx.fillStyle='#c2c4c8'; ctx.fillRect(x+10,y-4+bob,5,3);
    ctx.fillStyle='#e7bd64'; ctx.fillRect(x+10,y-7+bob,2,2);
    ctx.fillStyle='#171923'; ctx.fillRect(x+14,y-3+bob,1,1);
  }

  function drawAtlasSprite(sheet, ready, sx, sy, sw, sh, dx, dy, dw = sw, dh = sh) {
    if (!ready) return false;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sheet, sx, sy, sw, sh, dx, dy, dw, dh);
    ctx.restore();
    return true;
  }

  function drawGrass(px, py, h) {
    ctx.fillStyle = '#5b8f3e';
    ctx.fillRect(px, py, TILE, TILE);
    if (h % 3 === 0) {
      ctx.fillStyle = '#4b7a33';
      ctx.fillRect(px + ((h >> 3) % 12), py + ((h >> 5) % 12), 2, 1);
    }
  }

  function drawDirtPathTile(px, py, tx, ty, seed) {
    // Slightly vary the soil tone by location so neighboring tiles blend
    // into a continuous trail rather than reading as a checkerboard.
    const tones = ['#987044', '#a27a4d', '#a98252', '#936b43'];
    const tone = tones[(Math.abs(seed) >>> 3) % tones.length];
    ctx.fillStyle = tone;
    ctx.fillRect(px, py, TILE, TILE);

    // Scattered, world-coordinate-anchored soil flecks and tiny stones.
    // Their positions don't restart in a repeated atlas pattern at each tile.
    for (let n = 0; n < 7; n++) {
      const gx = tx * 16 + ((Math.abs((tx * 127 + ty * 311 + n * 47) ^ (seed >>> 2)) >>> 0) % 16);
      const gy = ty * 16 + ((Math.abs((tx * 283 + ty * 101 + n * 71) ^ (seed >>> 4)) >>> 0) % 16);
      const lx = gx - tx * 16, ly = gy - ty * 16;
      ctx.fillStyle = n % 3 === 0 ? '#c29a65' : n % 3 === 1 ? '#795638' : '#b18a59';
      ctx.fillRect(px + lx, py + ly, n % 4 === 0 ? 2 : 1, 1);
    }

    // Soft, broken grass fringe where the path meets the surrounding ground.
    const edges = [
      { dx: 0, dy: -1, side: 'top' }, { dx: 0, dy: 1, side: 'bottom' },
      { dx: -1, dy: 0, side: 'left' }, { dx: 1, dy: 0, side: 'right' }
    ];
    for (const edge of edges) {
      if (tileAt(tx + edge.dx, ty + edge.dy) === 'P') continue;
      for (let n = 0; n < 3; n++) {
        const pos = (Math.abs((tx * 193 + ty * 389 + n * 83 + seed) | 0) % 15) + 1;
        const gx = edge.side === 'left' ? 0 : edge.side === 'right' ? 14 : pos;
        const gy = edge.side === 'top' ? 0 : edge.side === 'bottom' ? 14 : pos;
        ctx.fillStyle = n % 2 ? '#687b43' : '#78894b';
        ctx.fillRect(px + gx, py + gy, 2, 1);
      }
    }

    // A few worn lighter patches break up the center without adding clutter.
    const patchX = 3 + (Math.abs(seed) % 9);
    const patchY = 3 + ((Math.abs(seed >>> 5) || 1) % 9);
    ctx.fillStyle = 'rgba(198,157,99,0.28)';
    ctx.fillRect(px + patchX, py + patchY, 2, 1);
  }

  function drawTile(tile, px, py, tx, ty) {
    const h = Math.abs((tx * 73856093) ^ (ty * 19349663));
    switch (tile) {
      case 'W': {
        // Water center tile from the forest atlas. Keep the fallback animated.
        if (!drawAtlasSprite(forestTilesSheet, forestTilesReady, 16, 176, 16, 16, px, py, TILE, TILE)) {
          ctx.fillStyle = '#2d6ea6';
          ctx.fillRect(px, py, TILE, TILE);
          const wave = Math.floor(Math.sin(time * 2 + tx * 0.8 + ty) * 2);
          ctx.fillStyle = '#5b9bd5';
          ctx.fillRect(px + 2 + (h % 6) + wave, py + 5 + ((h >> 3) % 7), 4, 1);
        }
        break;
      }
      case 'F': {
        // Ground-only leafy grass variant; no oversized plants stamped on every tile.
        if (!drawAtlasSprite(forestTilesSheet, forestTilesReady, 80, 16, 16, 16, px, py, TILE, TILE)) drawGrass(px, py, h);
        break;
      }
      case 'P': {
        // Draw the trail as one continuous, irregular dirt surface instead of
        // stamping the same square atlas tile over and over.
        drawDirtPathTile(px, py, tx, ty, h);
        break;
      }
      case 'T':
      case 'B':
      case 'G': {
        // Clean grass base under trees and open ground.
        if (!drawAtlasSprite(forestTilesSheet, forestTilesReady, 16, 16, 16, 16, px, py, TILE, TILE)) drawGrass(px, py, h);
        break;
      }
      case 'R': {
        // Rocky shore tile from the terrain atlas.
        if (!drawAtlasSprite(forestTilesSheet, forestTilesReady, 96, 16, 16, 16, px, py, TILE, TILE)) {
          drawGrass(px, py, h);
          ctx.fillStyle = '#7d7d86';
          ctx.beginPath(); ctx.ellipse(px + 8, py + 10, 5, 4, 0, 0, Math.PI * 2); ctx.fill();
        }
        break;
      }
      case 'H':
      case 'D': {
        // Continue the forest ground beneath the house instead of exposing
        // the canvas background as a dark square around the building.
        if (!drawAtlasSprite(forestTilesSheet, forestTilesReady, 16, 16, 16, 16, px, py, TILE, TILE)) {
          drawGrass(px, py, h);
        }
        break;
      }
      default:
        drawGrass(px, py, h);
    }
  }

  function forestTreeSprites() {
    // Verified source rectangles for four tree silhouettes in Decorations.png.
    return [
      { sx: 0, sy: 144, sw: 64, sh: 96, w: 32, h: 48 },
      { sx: 64, sy: 144, sw: 64, sh: 96, w: 32, h: 48 },
      { sx: 128, sy: 160, sw: 48, sh: 80, w: 24, h: 40 },
      { sx: 176, sy: 160, sw: 48, sh: 80, w: 24, h: 40 }
    ];
  }

  function drawForestTrees(foreground = false) {
    if (!forestDecorReady) return;
    const variants = forestTreeSprites();
    const firstY = Math.max(0, Math.floor(camY / TILE) - 4);
    const lastY = Math.min(MAP_H - 1, Math.floor((camY + canvas.height) / TILE));
    const firstX = Math.max(0, Math.floor(camX / TILE) - 1);
    const lastX = Math.min(MAP_W - 1, Math.floor((camX + canvas.width) / TILE));
    const trees = [];
    for (let ty = firstY; ty <= lastY; ty++) {
      for (let tx = firstX; tx <= lastX; tx++) {
        if (map[ty][tx] !== 'T') continue;
        const hash = Math.abs((tx * 73856093) ^ (ty * 19349663));
        const tree = variants[hash % variants.length];
        const groundY = ty * TILE + 16;
        // Depth-sort the tree relative to the player: trees farther away draw
        // behind, trees nearer the bottom of the screen draw in front.
        if ((groundY > player.y + 16) !== foreground) continue;
        trees.push({ tx, ty, tree, groundY });
      }
    }
    trees.sort((a, b) => a.groundY - b.groundY || a.tx - b.tx);
    for (const { tx, ty, tree } of trees) {
      const dx = Math.round(tx * TILE + 8 - tree.w / 2 - camX);
      const dy = Math.round(ty * TILE + 16 - tree.h - camY);
      drawAtlasSprite(forestDecorSheet, forestDecorReady,
        tree.sx, tree.sy, tree.sw, tree.sh, dx, dy, tree.w, tree.h);
    }
  }

  function drawForestMushrooms() {
    if (!forestDecorReady) return;
    // A handful of deliberate, fixed forest-floor spots, not random tile clutter.
    const spots = [
      { x: 5, y: 6, sx: 160 }, { x: 19, y: 7, sx: 192 },
      { x: 23, y: 22, sx: 224 }, { x: 36, y: 18, sx: 160 },
      { x: 4, y: 25, sx: 192 }
    ];
    for (const spot of spots) {
      if (!['G', 'F'].includes(tileAt(spot.x, spot.y))) continue;
      const px = Math.round(spot.x * TILE + 1 - camX);
      const py = Math.round(spot.y * TILE + 1 - camY);
      drawAtlasSprite(forestDecorSheet, forestDecorReady,
        spot.sx, 0, 16, 16, px, py, 14, 14);
    }
  }

  function drawHouse() {
    const x = Math.round(HOUSE.x - camX);
    const y = Math.round(HOUSE.y - camY);
    const cx = x + HOUSE.w / 2;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // A small, soft shadow keeps the house grounded in the grass.
    ctx.fillStyle = 'rgba(24, 20, 18, 0.28)';
    ctx.beginPath();
    ctx.ellipse(cx, y + 78, 63, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Chimney is placed behind the roof so it looks built into the house.
    ctx.fillStyle = '#352d32';
    ctx.fillRect(x + 82, y - 20, 15, 35);
    ctx.fillStyle = '#80534a';
    ctx.fillRect(x + 85, y - 18, 9, 31);
    ctx.fillStyle = '#a56e59';
    ctx.fillRect(x + 83, y - 22, 13, 4);
    ctx.fillStyle = '#594047';
    ctx.fillRect(x + 87, y - 13, 2, 3);
    ctx.fillRect(x + 91, y - 6, 2, 3);

    // Dark outline and warm timber wall.
    ctx.fillStyle = '#49352e';
    ctx.fillRect(x + 7, y + 27, HOUSE.w - 14, 54);
    ctx.fillStyle = '#bd8954';
    ctx.fillRect(x + 11, y + 30, HOUSE.w - 22, 46);
    ctx.fillStyle = '#d9ad70';
    ctx.fillRect(x + 14, y + 32, HOUSE.w - 28, 5);

    // Broad wooden boards, with darker seams and sturdy corner beams.
    for (let row = 0; row < 4; row++) {
      const boardY = y + 40 + row * 9;
      ctx.fillStyle = row % 2 ? '#c6955e' : '#d0a06a';
      ctx.fillRect(x + 13, boardY, HOUSE.w - 26, 7);
      ctx.fillStyle = '#9a6947';
      ctx.fillRect(x + 13, boardY + 7, HOUSE.w - 26, 1);
    }
    ctx.fillStyle = '#704a36';
    ctx.fillRect(x + 12, y + 31, 5, 45);
    ctx.fillRect(x + HOUSE.w - 17, y + 31, 5, 45);
    ctx.fillStyle = '#e0b87b';
    ctx.fillRect(x + 17, y + 35, 2, 37);
    ctx.fillRect(x + HOUSE.w - 19, y + 35, 2, 37);

    // Low stone foundation ties the cottage into the forest palette.
    ctx.fillStyle = '#514743';
    ctx.fillRect(x + 8, y + 72, HOUSE.w - 16, 10);
    const stones = [
      [10, 74, 13], [25, 74, 15], [43, 74, 12],
      [58, 74, 16], [77, 74, 14], [94, 74, 9]
    ];
    stones.forEach(([sx, sy, sw], i) => {
      ctx.fillStyle = i % 2 ? '#95816b' : '#766454';
      ctx.fillRect(x + sx, y + sy, sw, 5);
      ctx.fillStyle = '#b09a7b';
      ctx.fillRect(x + sx + 2, y + sy, Math.max(3, sw - 5), 1);
    });

    // Pixel-stepped roof silhouette: no smooth triangle edges or flat purple fill.
    const roofRows = [
      [-16, 4], [-12, 10], [-8, 16], [-4, 22], [0, 28],
      [4, 34], [8, 40], [12, 46], [16, 52], [20, 58],
      [24, 63], [28, 66]
    ];
    roofRows.forEach(([rowY, half]) => {
      ctx.fillStyle = '#302b35';
      ctx.fillRect(cx - half - 4, y + rowY, half * 2 + 8, 5);
      ctx.fillStyle = '#65434a';
      ctx.fillRect(cx - half, y + rowY, half * 2, 4);
    });

    // Shingle bands and staggered seams give the roof texture at game scale.
    const shingleRows = [
      { yy: -7, half: 15 }, { yy: 1, half: 27 },
      { yy: 9, half: 39 }, { yy: 17, half: 51 },
      { yy: 25, half: 62 }
    ];
    shingleRows.forEach((row, index) => {
      const left = cx - row.half + 3;
      const width = row.half * 2 - 6;
      ctx.fillStyle = '#895b58';
      ctx.fillRect(left, y + row.yy, width, 2);
      ctx.fillStyle = '#49333e';
      for (let seam = 0; seam < 8; seam++) {
        const sx = left + ((seam * 13 + (index % 2) * 6) % Math.max(1, width - 2));
        ctx.fillRect(sx, y + row.yy + 2, 2, 3);
      }
    });
    ctx.fillStyle = '#a16e61';
    ctx.fillRect(cx - 3, y - 14, 6, 3);
    ctx.fillStyle = '#3a2d38';
    ctx.fillRect(x - 9, y + 27, HOUSE.w + 18, 5);

    // Two small, bright windows with chunky wooden frames.
    [[x + 22, y + 43], [x + HOUSE.w - 40, y + 43]].forEach(([wx, wy]) => {
      ctx.fillStyle = '#49332e';
      ctx.fillRect(wx - 2, wy - 2, 19, 19);
      ctx.fillStyle = '#d9b77d';
      ctx.fillRect(wx, wy, 15, 15);
      ctx.fillStyle = '#47778a';
      ctx.fillRect(wx + 2, wy + 2, 11, 11);
      ctx.fillStyle = '#9bc4c0';
      ctx.fillRect(wx + 3, wy + 3, 4, 3);
      ctx.fillStyle = '#3f382f';
      ctx.fillRect(wx + 7, wy + 2, 2, 11);
      ctx.fillRect(wx + 2, wy + 7, 11, 2);
      ctx.fillStyle = '#8a563e';
      ctx.fillRect(wx - 1, wy + 15, 17, 3);
    });

    // Porch canopy, two support posts, and a short stone step.
    const porchX = cx - 19;
    ctx.fillStyle = '#3a2d35';
    ctx.fillRect(porchX - 2, y + 49, 42, 6);
    ctx.fillStyle = '#81534a';
    ctx.fillRect(porchX, y + 49, 38, 3);
    ctx.fillStyle = '#b47a58';
    ctx.fillRect(porchX + 3, y + 52, 32, 1);
    ctx.fillStyle = '#5b3e31';
    ctx.fillRect(porchX + 2, y + 53, 3, 25);
    ctx.fillRect(porchX + 33, y + 53, 3, 25);
    ctx.fillStyle = '#c09260';
    ctx.fillRect(porchX + 3, y + 55, 1, 20);
    ctx.fillRect(porchX + 34, y + 55, 1, 20);

    // Front door stays centered on the existing entrance and interaction point.
    const doorX = cx - 8;
    ctx.fillStyle = '#49332e';
    ctx.fillRect(doorX - 2, y + 52, 20, 29);
    ctx.fillStyle = '#805039';
    ctx.fillRect(doorX, y + 54, 16, 26);
    ctx.fillStyle = '#a56e46';
    ctx.fillRect(doorX + 2, y + 56, 12, 2);
    ctx.fillStyle = '#5b382c';
    ctx.fillRect(doorX + 3, y + 61, 10, 15);
    ctx.fillStyle = '#bd8754';
    ctx.fillRect(doorX + 4, y + 62, 8, 2);
    ctx.fillRect(doorX + 4, y + 73, 8, 2);
    ctx.fillStyle = '#edc66f';
    ctx.fillRect(doorX + 12, y + 67, 2, 2);
    ctx.fillStyle = '#a18b73';
    ctx.fillRect(cx - 14, y + 80, 28, 4);
    ctx.fillStyle = '#d0baa0';
    ctx.fillRect(cx - 11, y + 80, 22, 1);

    ctx.restore();
  }

  function drawHouseDoorPrompt() {
    if (insideHouse || Math.hypot(player.x - HOUSE_DOOR.x, player.y - HOUSE_DOOR.y) > 52) return;
    const x = Math.round(HOUSE_DOOR.x - camX), y = Math.round(HOUSE_DOOR.y - camY) - 24;
    ctx.fillStyle = 'rgba(15,12,24,0.92)'; ctx.fillRect(x - 24, y - 8, 48, 14);
    ctx.strokeStyle = '#f4d27b'; ctx.strokeRect(x - 23.5, y - 7.5, 47, 13);
    ctx.fillStyle = '#fff0bd'; ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center';
    ctx.fillText('[ ' + K('E') + ' ] ENTER', x, y + 1);
  }

  function drawMailbox() {
    const x = Math.round(MAILBOX.x - camX);
    const y = Math.round(MAILBOX.y - camY);
    ctx.fillStyle = 'rgba(15,10,10,0.25)';
    ctx.fillRect(x - 5, y + 2, 13, 3);
    ctx.fillStyle = '#68452c';
    ctx.fillRect(x, y - 1, 3, 17);
    ctx.fillStyle = '#9e292d';
    ctx.fillRect(x - 5, y - 12, 14, 10);
    ctx.fillRect(x - 3, y - 15, 10, 4);
    ctx.fillStyle = '#d95a4f';
    ctx.fillRect(x - 3, y - 10, 10, 5);
    ctx.fillStyle = '#f2d69b';
    ctx.fillRect(x + 1, y - 8, 3, 2);
    // Raised little red flag
    ctx.fillStyle = '#f2c45d';
    ctx.fillRect(x + 8, y - 14, 2, 7);
    ctx.fillStyle = '#e44e46';
    ctx.fillRect(x + 9, y - 14, 5, 3);
  }

  function drawInteractionPrompt() {
    const distance = Math.hypot(player.x - MAILBOX.x, player.y - MAILBOX.y);
    if (distance > 52) return;
    const x = Math.round(MAILBOX.x - camX);
    const y = Math.round(MAILBOX.y - camY) - 27;
    const pulse = 0.55 + 0.45 * Math.sin(time * 8);
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.fillStyle = 'rgba(15, 12, 24, 0.92)';
    ctx.fillRect(x - 28, y - 9, 56, 15);
    ctx.strokeStyle = '#f4d27b';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 27.5, y - 8.5, 55, 14);
    ctx.fillStyle = '#fff0bd';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('[ ' + K('E') + ' ] INTERACT', x, y + 1);
    ctx.restore();
  }

  function drawFish() {
    fish.forEach((f, i) => {
      const phase = (time + f.phase) % f.period;
      const jumping = phase < f.duration;
      const p = jumping ? phase / f.duration : 0;
      const lift = jumping ? Math.sin(p * Math.PI) * 23 : 0;
      const travel = jumping ? Math.sin(p * Math.PI) * 9 : 0;
      const x = Math.round(f.x + travel - camX);
      const y = Math.round(f.y - lift - camY);

      if (jumping) {
        ctx.fillStyle = 'rgba(210,240,255,0.7)';
        ctx.fillRect(x - 2, y + 6, 1, 3);
        ctx.fillRect(x + 4, y + 7, 1, 2);
      } else if (phase > f.period - 0.45) {
        ctx.fillStyle = '#b6e9f5';
        ctx.fillRect(Math.round(f.x - camX) - 3, Math.round(f.y - camY) + 3, 7, 1);
      }

      ctx.fillStyle = i === 1 ? '#f2a64c' : '#e5c75d';
      ctx.fillRect(x - 4, y - 2, 8, 5);
      ctx.fillStyle = i === 1 ? '#ffe0a0' : '#fff0a2';
      ctx.fillRect(x - 2, y - 2, 4, 2);
      ctx.fillStyle = '#d77b44';
      ctx.fillRect(x + 3, y - 1, 3, 3);
      ctx.fillStyle = '#20243a';
      ctx.fillRect(x - 2, y - 1, 1, 1);
    });
  }

  function drawBunny(b) {
    const x = Math.round(b.x - camX);
    const y = Math.round(b.y - camY);
    const hop = b.flee > 0 ? Math.abs(Math.sin(b.hop * 2)) * 4 : Math.abs(Math.sin(time * 2 + b.hop)) * 1.5;
    ctx.fillStyle = 'rgba(20,20,20,0.22)';
    ctx.fillRect(x - 5, y + 5, 12, 2);
    ctx.fillStyle = '#eee4d2';
    ctx.fillRect(x - 4, y - 2 - hop, 9, 7);
    ctx.fillRect(x + 2, y - 5 - hop, 3, 7);
    ctx.fillRect(x - 2, y - 7 - hop, 3, 8);
    ctx.fillStyle = '#d7b9a9';
    ctx.fillRect(x - 1, y - 6 - hop, 1, 4);
    ctx.fillRect(x + 3, y - 4 - hop, 1, 4);
    ctx.fillStyle = '#fff8ed';
    ctx.fillRect(x - 6, y + 1 - hop, 4, 4);
    ctx.fillStyle = '#3b2930';
    ctx.fillRect(x + 2, y - 1 - hop, 1, 1);
    ctx.fillStyle = '#d78b91';
    ctx.fillRect(x + 4, y + 1 - hop, 1, 1);
  }

  function drawPlayerFallback(sx, sy) {
    const stride=player.moving ? Math.sin(player.walk) : 0, a=stride>0?1:0, b=stride<0?1:0;
    ctx.fillStyle='rgba(0,0,0,0.3)'; ctx.fillRect(sx+2,sy+15,12,2);
    ctx.fillStyle='#39405a'; ctx.fillRect(sx+4,sy+11+a,3,4-a); ctx.fillRect(sx+9,sy+11+b,3,4-b);
    ctx.fillStyle='#24283d'; ctx.fillRect(sx+3,sy+14+a,4,2); ctx.fillRect(sx+9,sy+14+b,4,2);
    ctx.fillStyle='#8f352d'; ctx.fillRect(sx+3,sy+6,10,7);
    ctx.fillStyle='#d65b3e'; ctx.fillRect(sx+4,sy+6,8,2);
    ctx.fillStyle='#542b35'; ctx.fillRect(sx+3,sy+11,10,2);
    ctx.fillStyle='#e2bd68'; ctx.fillRect(sx+7,sy+11,2,2);
    ctx.fillStyle='#61364a'; ctx.fillRect(sx+2,sy+7,3,5);
    ctx.fillStyle='#d99b70'; ctx.fillRect(sx+6,sy+4,4,3);
    ctx.fillStyle='#efc39a'; ctx.fillRect(sx+4,sy+2,8,6); ctx.fillRect(sx+3,sy+4,2,3); ctx.fillRect(sx+11,sy+4,2,3);
    ctx.fillStyle='#392638'; ctx.fillRect(sx+3,sy+1,10,3); ctx.fillRect(sx+3,sy+2,2,5); ctx.fillRect(sx+11,sy+2,2,4);
    ctx.fillStyle='#624052'; ctx.fillRect(sx+5,sy,5,2);
    if(player.facing==='up'){ctx.fillStyle='#392638';ctx.fillRect(sx+3,sy+2,10,6);}
    else {
      ctx.fillStyle='#302333';
      if(player.facing==='down'){ctx.fillRect(sx+6,sy+5,1,1);ctx.fillRect(sx+10,sy+5,1,1);}
      else if(player.facing==='left'){ctx.fillRect(sx+4,sy+5,1,1);ctx.fillRect(sx+2,sy+4,2,2);}
      else {ctx.fillRect(sx+11,sy+5,1,1);ctx.fillRect(sx+12,sy+4,2,2);}
    }
    ctx.fillStyle='#f1d28c'; ctx.fillRect(sx+6,sy+7,4,1);
  }

  function drawPlayer(sx, sy) {
    // The character sheet uses 32x32 frames. Keep the same ground anchor as
    // the old 16x16 sprite: centered on sx+8, with the feet at sy+16.
    if (!playerSheetReady) return drawPlayerFallback(sx, sy);

    const direction = player.facing;
    let idleRow, walkRow, flip = false;
    if (direction === 'up') {
      idleRow = 4; walkRow = 5;
    } else if (direction === 'left') {
      idleRow = 2; walkRow = 3; flip = true;
    } else if (direction === 'right') {
      idleRow = 2; walkRow = 3; flip = false;
    } else {
      idleRow = 0; walkRow = 1;
    }

    const frame = player.moving
      ? Math.floor(player.walk * 0.72) % 6
      : Math.floor(time * 2) % 2;
    const row = player.moving ? walkRow : idleRow;
    const dx = sx - 8;
    const dy = sy - 16;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(sx + 2, sy + 14, 12, 2);
    if (flip) {
      ctx.translate(dx + 32, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(playerSheet, frame * 32, row * 32, 32, 32, 0, dy, 32, 32);
    } else {
      ctx.drawImage(playerSheet, frame * 32, row * 32, 32, 32, dx, dy, 32, 32);
    }
    ctx.restore();
  }
  // In the top-down house, Rowan wears the same knight armor as outside: a
  // scaled-down copy of the knight sheets (2 x 4 grid of 90 x 45 cells).
  function drawHouseKnight(sx, sy) {
    const moving = interiorPlayer.moving;
    const sheet = moving && imgReady(miniKnight.run) ? miniKnight.run : miniKnight.idle;
    const f = moving ? Math.floor(interiorPlayer.walk * 0.9) % 8 : Math.floor(time * 7) % 8;
    const col = f % 2, row = Math.floor(f / 2);
    let face = interiorPlayer.hf || 1;
    if (interiorPlayer.facing === 'left') face = -1; else if (interiorPlayer.facing === 'right') face = 1;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(sx + 1, sy + 14, 14, 2);
    ctx.translate(sx + 8, sy + 16);
    if (face < 0) ctx.scale(-1, 1);
    ctx.drawImage(sheet, col * 90, row * 45, 90, 45, -44, -45, 90, 45);
    ctx.restore();
  }
  function beginBattle(w) {
    if (battle) return;
    bloodDrops.length = 0;
    battle = { wolf:w, wolfHP:12, maxWolfHP:12, phase:'intro', fade:0, message:'A wild wolf appeared!', menu:0, turn:0 };
    keys.clear();
    player.moving = false;
  }

  function updateBattle(dt) {
    if (!battle) return;
    updateBlood(dt, BATTLE_BLOOD_FLOOR);
    if (battle.phase === 'intro') {
      battle.fade = Math.min(1, battle.fade + dt / BATTLE_FADE);
      if (battle.fade >= 1) battle.phase = 'command';
    } else if (battle.phase === 'outro') {
      battle.fade = Math.max(0, battle.fade - dt / BATTLE_FADE);
      if (battle.fade <= 0) {
        if (battle.wolf) {
          const i = wolves.indexOf(battle.wolf);
          if (i >= 0) wolves.splice(i,1);
        }
        bloodDrops.length = 0;
        battle = null;
      }
    }
  }

  function battleAction(action) {
    if (!battle || battle.phase !== 'command') return;
    if (action === 'fight') {
      const damage = Math.max(3, stats.strength + 2);
      battle.wolfHP = Math.max(0, battle.wolfHP - damage);
      spawnBlood(232, 135, 1, battle.wolfHP <= 0);
      if (battle.wolfHP <= 0) {
        battle.message = 'The wolf ran back into the forest!';
        battle.phase = 'outro';
        return;
      }
      battle.message = 'You stand your ground! The wolf lunges!';
      stats.health = Math.max(0, stats.health - 2);
      spawnBlood(108, 145, -1, stats.health <= 0);
      if (stats.health <= 0) {
        battle.message = 'You are worn out! The wolf retreats.';
        battle.phase = 'outro';
      }
    } else if (action === 'run') {
      battle.message = 'You escaped from the wolf!';
      battle.phase = 'outro';
    }
  }

  function drawBattleWolf() {
    // Large, layered pixel-art wolf, facing the player.
    const x=224, y=100, bob=Math.sin(time*2.2)*1.2;
    ctx.save(); ctx.translate(x,y+bob); ctx.scale(0.72,0.72);
    ctx.fillStyle='rgba(0,0,0,0.38)'; ctx.fillRect(-38,55,112,10);
    // Back legs and paws
    ctx.fillStyle='#252b3b'; ctx.fillRect(-22,28,17,31); ctx.fillRect(30,27,17,32);
    ctx.fillStyle='#151b29'; ctx.fillRect(-28,51,25,9); ctx.fillRect(25,51,27,9);
    // Tail
    ctx.fillStyle='#424b61'; ctx.fillRect(-46,0,22,12); ctx.fillRect(-57,-10,17,13);
    ctx.fillStyle='#7b879b'; ctx.fillRect(-59,-10,9,7);
    // Body layers
    ctx.fillStyle='#465269'; ctx.fillRect(-29,-5,80,47);
    ctx.fillStyle='#68758a'; ctx.fillRect(-17,-12,57,19);
    ctx.fillStyle='#8792a2'; ctx.fillRect(-8,-9,32,9);
    ctx.fillStyle='#343e53'; ctx.fillRect(-28,17,76,16);
    // Chest ruff
    ctx.fillStyle='#aab0b8'; ctx.fillRect(28,-2,21,37); ctx.fillRect(34,7,19,22);
    ctx.fillStyle='#d0c9bc'; ctx.fillRect(37,13,10,12);
    // Front legs
    ctx.fillStyle='#4b566d'; ctx.fillRect(0,26,15,31); ctx.fillRect(35,25,15,32);
    ctx.fillStyle='#222938'; ctx.fillRect(-3,52,22,9); ctx.fillRect(31,52,23,9);
    // Neck and head
    ctx.fillStyle='#59667c'; ctx.fillRect(31,-24,31,34);
    ctx.fillStyle='#768398'; ctx.fillRect(40,-31,30,30);
    ctx.fillStyle='#3b455a'; ctx.fillRect(42,-42,12,17); ctx.fillRect(61,-39,12,16);
    ctx.fillStyle='#a2aaba'; ctx.fillRect(45,-39,5,9); ctx.fillRect(64,-36,5,8);
    ctx.fillStyle='#7c899c'; ctx.fillRect(62,-19,24,17);
    ctx.fillStyle='#c5c5c2'; ctx.fillRect(68,-8,24,10); ctx.fillRect(78,-3,13,6);
    ctx.fillStyle='#242a38'; ctx.fillRect(85,-5,7,5);
    // Eye and brow
    ctx.fillStyle='#242b3a'; ctx.fillRect(66,-23,13,6);
    ctx.fillStyle='#f0bd55'; ctx.fillRect(69,-22,6,4);
    ctx.fillStyle='#171b27'; ctx.fillRect(73,-22,2,3);
    ctx.fillStyle='#3a4050'; ctx.fillRect(61,-29,18,5);
    // Fur highlights
    ctx.fillStyle='#9ca6b5'; ctx.fillRect(-8,-6,19,4); ctx.fillRect(10,1,17,4);
    ctx.fillStyle='#d3d7d8'; ctx.fillRect(42,1,7,5); ctx.fillRect(51,7,5,5);
    ctx.restore();
  }


  // ----- Hand-drawn pieces that the interior sprite sheet does not include. -----
  // Palette taken from Pixel_Interiors so everything matches.
  const HP = { ink: '#0f1835', dark: '#5a3234', wood: '#c99969', woodMid: '#ae864e', woodDeep: '#926b41', woodShade: '#775035', light: '#dac17f' };
  function hpRect(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }
  function hpBox(x, y, w, h, fill) { hpRect(x, y, w, h, HP.ink); hpRect(x + 1, y + 1, w - 2, h - 2, fill); }

  function drawHouseFridge(x, y, w, h) {
    hpBox(x, y, w, h, '#dfe5e8');
    hpRect(x + w - 4, y + 1, 3, h - 2, '#b7c2c8');
    hpRect(x + 1, y + 1, w - 5, 1, '#f7fafb');
    hpRect(x + 1, y + 12, w - 2, 1, HP.ink);
    hpRect(x + 3, y + 5, 1, 5, '#6c7a84'); hpRect(x + 3, y + 15, 1, 7, '#6c7a84');
    hpRect(x + 6, y + 4, 4, 3, '#e98a6b'); // a magnet
  }
  function drawHouseCounter(x, y, w, h, sink) {
    // Stone worktop over wooden cupboards.
    hpBox(x, y, w, h, HP.wood);
    hpRect(x + 1, y + 1, w - 2, 8, '#d9d2c4');
    hpRect(x + 1, y + 8, w - 2, 1, '#a99d88');
    hpRect(x + 1, y + 9, w - 2, 1, HP.ink);
    const doors = Math.max(1, Math.round((w - 2) / 9));
    const dw = (w - 2) / doors;
    for (let i = 0; i < doors; i++) {
      const dx = Math.round(x + 1 + i * dw);
      hpRect(dx + 1, y + 11, Math.round(dw) - 2, h - 13, HP.woodMid);
      hpRect(dx + 1, y + 11, Math.round(dw) - 2, 1, HP.light);
      hpRect(dx + Math.round(dw / 2) - 1, y + 14, 1, 2, HP.dark);
    }
    if (sink) {
      hpRect(x + 3, y + 2, w - 6, 5, '#6f8792');
      hpRect(x + 4, y + 3, w - 8, 3, '#9fb9c4');
      hpRect(x + Math.floor(w / 2) - 1, y + 1, 2, 2, '#c5d0d3');
    }
  }
  function drawHouseStove(x, y, w, h) {
    hpBox(x, y, w, h, '#4a505c');
    hpRect(x + 1, y + 1, w - 2, 8, '#363b45');
    for (const [bx, by] of [[3, 2], [9, 2], [3, 5], [9, 5]]) { hpRect(x + bx, y + by, 4, 2, '#7a808c'); hpRect(x + bx + 1, y + by, 2, 1, '#1d2028'); }
    hpRect(x + 1, y + 9, w - 2, 1, HP.ink);
    hpRect(x + 3, y + 12, w - 6, 5, '#1d2028');
    hpRect(x + 4, y + 13, w - 8, 1, '#5f6672');
    hpRect(x + 3, y + 11, w - 6, 1, '#aab2bd');
  }
  function drawHouseSofa(x, y, w, h) {
    const c = '#a8513f', hi = '#c96b55', sh = '#7a3a31';
    hpBox(x, y, w, h, sh);                       // frame
    hpRect(x + 1, y + 1, w - 2, 8, c);           // backrest
    hpRect(x + 2, y + 2, w - 4, 1, hi);
    hpBox(x, y + 6, 7, h - 6, c); hpBox(x + w - 7, y + 6, 7, h - 6, c); // arms
    hpRect(x + 1, y + 7, 5, 1, hi); hpRect(x + w - 6, y + 7, 5, 1, hi);
    const seatW = (w - 14) / 3;
    for (let i = 0; i < 3; i++) {
      const sx = Math.round(x + 7 + i * seatW);
      hpBox(sx, y + 9, Math.round(seatW), h - 11, c);
      hpRect(sx + 1, y + 10, Math.round(seatW) - 2, 2, hi);
    }
    hpRect(x + 2, y + h - 2, w - 4, 1, HP.dark);
  }
  function drawHouseArmchair(x, y, w, h) {
    const c = '#a8513f', hi = '#c96b55', sh = '#7a3a31';
    hpBox(x, y, w, h, sh);
    hpRect(x + 1, y + 1, w - 2, 7, c); hpRect(x + 2, y + 2, w - 4, 1, hi);
    hpBox(x, y + 5, 6, h - 5, c); hpBox(x + w - 6, y + 5, 6, h - 5, c);
    hpBox(x + 6, y + 8, w - 12, h - 10, c); hpRect(x + 7, y + 9, w - 14, 2, hi);
  }
  function drawHouseTub(x, y, w, h) {
    hpBox(x, y, w, h, '#f4f0e4');
    hpRect(x + w - 3, y + 1, 2, h - 2, '#d3cfc2');
    hpBox(x + 3, y + 5, w - 6, h - 9, '#8fbccd');
    hpRect(x + 4, y + 6, w - 8, h - 11, '#b9dde8');
    hpRect(x + 5, y + 8, 3, 1, '#e8f6fa'); hpRect(x + 8, y + 14, 4, 1, '#e8f6fa');
    hpRect(x + Math.floor(w / 2) - 2, y + 1, 4, 3, '#aab8bd'); // taps
  }
  function drawHouseToilet(x, y, w, h) {
    hpBox(x + 1, y, w - 2, 7, '#f2eee0');                  // cistern against the wall
    hpRect(x + 2, y + 1, w - 4, 1, '#ffffff');
    hpBox(x, y + 6, w, h - 6, '#f7f3e8');                  // bowl
    hpRect(x + 3, y + 9, w - 6, h - 13, '#c5d3cb');
    hpRect(x + 4, y + 10, w - 8, 1, '#e6eeea');
  }
  function drawHouseSink(x, y, w, h) {
    hpRect(x + Math.floor(w / 2) - 3, y + 8, 6, h - 8, HP.ink);
    hpRect(x + Math.floor(w / 2) - 2, y + 8, 4, h - 9, '#d9d4c6');
    hpBox(x, y, w, 9, '#f4f0e4');
    hpRect(x + 3, y + 2, w - 6, 5, '#8fbccd');
    hpRect(x + Math.floor(w / 2) - 1, y + 1, 2, 2, '#aab8bd');
  }
  function drawHouseMirror(x, y, w, h) {
    hpBox(x, y, w, h, '#c49a55');
    hpRect(x + 2, y + 2, w - 4, h - 4, '#a9cbd6');
    hpRect(x + 3, y + 3, 2, h - 7, '#e2f1f5');
  }
  function drawHouseRunner(x, y, w, h) {
    hpRect(x, y, w, h, '#6d4140');
    hpRect(x + 2, y + 2, w - 4, h - 4, '#9b5a4a');
    hpRect(x + 4, y + 4, w - 8, h - 8, '#c08a5e');
    for (let i = x + 10; i < x + w - 10; i += 16) hpRect(i, y + Math.floor(h / 2), 6, 1, '#9b5a4a');
  }
  function drawHouseDoormat(x, y, w, h) {
    hpRect(x, y, w, h, '#5d4a33'); hpRect(x + 1, y + 1, w - 2, h - 2, '#8a7350');
    for (let i = x + 3; i < x + w - 2; i += 3) hpRect(i, y + 2, 1, h - 4, '#6f5b3e');
  }
  function drawHouseBathMat(x, y, w, h) {
    hpRect(x, y, w, h, '#4f7f86'); hpRect(x + 1, y + 1, w - 2, h - 2, '#79aab0');
    hpRect(x + 2, y + 3, w - 4, 1, '#a6cfd2'); hpRect(x + 2, y + h - 4, w - 4, 1, '#a6cfd2');
  }

  function drawHouseFloors() {
    const planks = (r, base, line, dark, light) => {
      hpRect(r.x1, r.y1, r.x2 - r.x1, r.y2 - r.y1, base);
      for (let y = r.y1; y < r.y2; y += 8) {
        hpRect(r.x1, y, r.x2 - r.x1, 1, light);
        hpRect(r.x1, y + 7, r.x2 - r.x1, 1, dark);
        const offset = (Math.floor(y / 8) % 2) * 17;
        for (let x = r.x1 + 6 + offset; x < r.x2; x += 34) hpRect(x, y + 1, 1, 6, line);
      }
    };
    const tiles = (r, a, b, grout) => {
      hpRect(r.x1, r.y1, r.x2 - r.x1, r.y2 - r.y1, grout);
      for (let y = r.y1; y < r.y2; y += 8) for (let x = r.x1; x < r.x2; x += 8) {
        hpRect(x, y, Math.min(7, r.x2 - x), Math.min(7, r.y2 - y), ((x - r.x1) / 8 + (y - r.y1) / 8) % 2 ? a : b);
      }
    };
    // Whole ground floor in warm timber, then tiled wet rooms on top.
    planks({ x1: HOME.left, y1: HOME.top, x2: HOME.right, y2: HOME.bottom }, '#b9794c', 'rgba(76,39,31,.35)', '#8c533b', '#d39a61');
    planks(HOUSE_ROOMS.kid, '#c08a5e', 'rgba(76,39,31,.3)', '#94603f', '#dcab73');
    tiles(HOUSE_ROOMS.bath, '#d6e0d7', '#c3d3cb', '#9fb6ae');
    tiles(HOUSE_ROOMS.kitchen, '#d9c6a0', '#b98a62', '#8c6a4c');
    // Wood under the front doorway.
    hpRect(HOME.frontDoor.x1, HOME.bottom, HOME.frontDoor.x2 - HOME.frontDoor.x1, 10, '#6d4140');
    hpRect(HOME.frontDoor.x1 + 1, HOME.bottom + 1, HOME.frontDoor.x2 - HOME.frontDoor.x1 - 2, 3, '#9b6550');
  }

  function drawHouseWalls() {
    // Back wall: tall wallpapered face per room with a timber cap and skirting.
    const backFace = (x1, x2, paper, stripe) => {
      hpRect(x1, 8, x2 - x1, 20, paper);
      for (let x = x1 + 3; x < x2; x += 6) hpRect(x, 8, 1, 13, stripe);
      hpRect(x1, 21, x2 - x1, 5, HP.woodMid);       // wainscot rail
      hpRect(x1, 21, x2 - x1, 1, HP.light);
      hpRect(x1, 26, x2 - x1, 2, '#3a222b');        // skirting shadow
    };
    hpRect(8, 4, 304, 4, '#704333'); hpRect(8, 4, 304, 1, '#a96749');
    backFace(18, 124, '#8f6f5d', '#9d7c69');
    backFace(134, 186, '#8fb0aa', '#9dbcb6');
    backFace(196, 302, '#7d8fae', '#8a9cba');
    // Interior horizontal walls: 4px cap and an 8px face toward the room below.
    const hWall = (x, y, w) => {
      hpRect(x, y, w, 4, '#704333'); hpRect(x, y, w, 1, '#a96749');
      hpRect(x, y + 4, w, 8, '#9a6a4c');
      for (let i = x + 4; i < x + w; i += 8) hpRect(i, y + 4, 1, 6, '#875a40');
      hpRect(x, y + 10, w, 2, '#3a222b');
    };
    // Side and outer walls are seen from above as timber caps.
    const vWall = (x, y, w, h) => {
      hpRect(x, y, w, h, '#704333');
      hpRect(x + 1, y, 2, h, '#a96749');
      hpRect(x + w - 2, y, 2, h, '#4b2c2c');
    };
    for (const [x, y, w, h] of INTERIOR_WALLS) {
      if (y === 4 && w > h) continue;             // the back wall was drawn above
      if (h === 12 && w > h) hWall(x, y, w);
      else vWall(x, y, w, h);
    }
    // Door frames on the interior doorways.
    for (const d of HOUSE_DOORS) {
      // Door posts and a worn wooden threshold so each opening reads as a doorway.
      hpRect(d.x1, d.y, 3, 12, '#4b2c2c'); hpRect(d.x2 - 3, d.y, 3, 12, '#4b2c2c');
      hpRect(d.x1 + 1, d.y, 1, 12, '#a96749'); hpRect(d.x2 - 2, d.y, 1, 12, '#a96749');
      hpRect(d.x1 + 3, d.y + 4, d.x2 - d.x1 - 6, 6, '#a5714e');
      hpRect(d.x1 + 3, d.y + 4, d.x2 - d.x1 - 6, 1, '#d39a61');
      hpRect(d.x1 + 3, d.y + 9, d.x2 - d.x1 - 6, 1, '#7a4a35');
    }
    // Front door, seen from inside: a closed wooden door set in the front wall.
    const fd = HOME.frontDoor, fw = fd.x2 - fd.x1;
    hpRect(fd.x1 - 3, HOME.bottom, fw + 6, 10, '#4b2c2c');
    hpRect(fd.x1, HOME.bottom + 1, fw, 9, '#8a5638');
    for (let x = fd.x1 + 4; x < fd.x2; x += 5) hpRect(x, HOME.bottom + 1, 1, 9, '#6e432d');
    hpRect(fd.x1, HOME.bottom + 1, fw, 1, '#c58a57');
    hpRect(fd.x2 - 5, HOME.bottom + 4, 2, 2, '#e3c06a');
  }

  function drawHouseFurniturePiece(f) {
    if (f.art) { const a = PI_ART[f.art]; drawInteriorArt(a[0], a[1], a[2], a[3], f.x, f.y, f.w, f.h); }
    else if (f.draw === 'fridge') drawHouseFridge(f.x, f.y, f.w, f.h);
    else if (f.draw === 'counter') drawHouseCounter(f.x, f.y, f.w, f.h, f.sink);
    else if (f.draw === 'stove') drawHouseStove(f.x, f.y, f.w, f.h);
    else if (f.draw === 'sofa') drawHouseSofa(f.x, f.y, f.w, f.h);
    else if (f.draw === 'armchair') drawHouseArmchair(f.x, f.y, f.w, f.h);
    else if (f.draw === 'tub') drawHouseTub(f.x, f.y, f.w, f.h);
    else if (f.draw === 'toilet') drawHouseToilet(f.x, f.y, f.w, f.h);
    else if (f.draw === 'sink') drawHouseSink(f.x, f.y, f.w, f.h);
    else if (f.draw === 'mirror') drawHouseMirror(f.x, f.y, f.w, f.h);
    else if (f.draw === 'runner') drawHouseRunner(f.x, f.y, f.w, f.h);
    else if (f.draw === 'doormat') drawHouseDoormat(f.x, f.y, f.w, f.h);
    else if (f.draw === 'bathMat') drawHouseBathMat(f.x, f.y, f.w, f.h);
    else if (f.draw === 'armorStand') drawTopDownArmorStand(f.x, f.y);
    if (f.id === 'dad-nightstand') {
      // Dad's folded note on top of his nightstand.
      hpRect(f.x + 4, f.y + 3, 11, 7, 'rgba(35,18,24,.35)');
      hpRect(f.x + 3, f.y + 2, 11, 7, '#eadbb3');
      hpRect(f.x + 4, f.y + 3, 9, 1, '#fff0cc');
      hpRect(f.x + 5, f.y + 5, 6, 1, '#b59a70');
      if (!dadNoteRead) hpRect(f.x + 8, f.y - 2 + Math.round(Math.sin(time * 4)), 2, 2, '#ffe28a');
    }
  }

  function drawHousePrompt(text, cx, y) {
    ctx.font = 'bold 7px monospace';
    const w = Math.ceil(ctx.measureText(text).width) + 10;
    const x = Math.round(clamp(cx - w / 2, 4, 316 - w));
    hpRect(x, y, w, 13, 'rgba(15,12,24,.94)');
    ctx.strokeStyle = '#f4d27b'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, 12);
    ctx.fillStyle = '#fff0bd'; ctx.textAlign = 'center';
    ctx.fillText(text, x + w / 2, y + 9);
  }

  function drawHouseInterior() {
    ctx.fillStyle = '#160d20';
    ctx.fillRect(0, 0, 320, 240);
    drawHouseFloors();
    for (const f of HOUSE_FURNITURE) if (f.layer === 'floor') drawHouseFurniturePiece(f);
    drawHouseWalls();
    for (const f of HOUSE_FURNITURE) if (f.layer === 'wall') drawHouseFurniturePiece(f);

    // Depth-sort furniture and the player by where they touch the floor, so the
    // player walks in front of things below them and behind things above them.
    const items = HOUSE_FURNITURE
      .filter(f => !f.layer)
      .map(f => ({ z: f.z != null ? f.z : (f.solid ? f.solid[3] : f.y + f.h), f }));
    items.push({ z: interiorPlayer.y + 15.5, player: true });
    items.sort((a, b) => a.z - b.z);
    for (const item of items) {
      if (!item.player) { drawHouseFurniturePiece(item.f); continue; }
      const oldFacing = player.facing, oldMoving = player.moving, oldWalk = player.walk;
      player.facing = interiorPlayer.facing;
      player.moving = interiorPlayer.moving;
      player.walk = interiorPlayer.walk;
      if (equipment.armor && imgReady(miniKnight.idle)) drawHouseKnight(Math.round(interiorPlayer.x), Math.round(interiorPlayer.y));
      else drawPlayer(Math.round(interiorPlayer.x), Math.round(interiorPlayer.y));
      player.facing = oldFacing; player.moving = oldMoving; player.walk = oldWalk;
    }

    if (introActive || panel) return;
    if (nearDadArmor() && (!nearDadNote() || dadArmorDistance() < dadNoteDistance())) {
      drawHousePrompt(equipment.armor ? 'ARMOR EQUIPPED' : '[ ' + K('E') + ' ] EQUIP ARMOR', DAD_ARMOR.x - 20, 58);
    } else if (nearDadNote()) {
      drawHousePrompt('[ ' + K('E') + ' ] READ NOTE', DAD_NOTE.x, 70);
    } else if (nearFrontDoor()) {
      drawHousePrompt('[ ' + K('E') + ' ] GO OUTSIDE', 160, 178);
    }
  }

  function drawTopDownArmorStand(x, baseY) {
    const p = (c, dx, dy, w, h) => { ctx.fillStyle = c; ctx.fillRect(x + dx, baseY + dy, w, h); };
    p('rgba(10,8,15,.52)', -11, -3, 22, 5);
    p('#372b27', -2, -25, 4, 23); p('#82543b', -1, -24, 2, 21);
    p('#4a3528', -9, -19, 18, 3); p('#a27850', -8, -19, 16, 1);
    p('#4e3429', -9, -4, 18, 4); p('#b08a5d', -8, -4, 16, 1);
    if (equipment.armor) return;
    p('#172532', -5, -29, 10, 12); p('#7092a0', -4, -30, 8, 10);
    p('#b9d7dd', -3, -30, 5, 2); p('#9ebcc6', -4, -28, 2, 7);
    p('#121922', -4, -25, 8, 2); p('#cbdad8', -1, -23, 2, 3);
    p('#192c35', -10, -18, 20, 6); p('#799ca8', -9, -18, 5, 4); p('#587582', 4, -18, 5, 4);
    p('#b3cbd1', -9, -18, 4, 1); p('#9bbbc7', 5, -18, 4, 1);
    p('#304852', -5, -17, 10, 10); p('#86a6b0', -4, -16, 7, 6);
    p('#c8dce0', -3, -15, 4, 2); p('#594132', -5, -9, 10, 2); p('#dea85d', -1, -9, 2, 2);
    p('#5f7d8c', -5, -7, 3, 4); p('#5f7d8c', 2, -7, 3, 4);
  }

  function drawHouseHUD() {
    if (notice && time < noticeUntil) {
      ctx.fillStyle = 'rgba(12,10,20,.9)';
      ctx.fillRect(48, 205, 224, 17);
      ctx.strokeStyle = '#d9b56b'; ctx.strokeRect(48.5, 205.5, 223, 16);
      ctx.fillStyle = '#fff0c8'; ctx.textAlign = 'center'; ctx.font = '7px monospace';
      ctx.fillText(notice, 160, 216);
    } else if (dadNoteRead) {
      const text = equipment.armor ? "QUEST: GO OUTSIDE AND CROSS THE FOREST" : "QUEST: EQUIP DAD'S ARMOR (DAD'S ROOM)";
      ctx.font = '7px monospace';
      const w = ctx.measureText(text).width + 10;
      ctx.fillStyle = 'rgba(12,10,20,.82)'; ctx.fillRect(4, 4, w, 13);
      ctx.fillStyle = '#ffe6b2'; ctx.textAlign = 'left';
      ctx.fillText(text, 9, 13);
    }
  }

  function drawBattle() {
    ctx.fillStyle='#17233a'; ctx.fillRect(0,0,canvas.width,canvas.height);
    // Distant forest silhouettes and a moonlit clearing
    ctx.fillStyle='#202f43';
    for(let i=0;i<9;i++){const x=i*42-10;ctx.fillRect(x,55,25,105);ctx.fillRect(x+7,35,12,35);}
    ctx.fillStyle='#33465a'; ctx.fillRect(0,147,canvas.width,93);
    ctx.fillStyle='#50634c'; ctx.fillRect(0,173,canvas.width,67);
    ctx.fillStyle='#71815a'; ctx.fillRect(0,180,canvas.width,3);
    // Soft moon glow
    const glow=ctx.createRadialGradient(245,65,5,245,65,95);
    glow.addColorStop(0,'rgba(173,195,231,0.22)');glow.addColorStop(1,'rgba(173,195,231,0)');
    ctx.fillStyle=glow;ctx.fillRect(140,0,180,165);
    // Player shown close-up from behind on the left
    ctx.fillStyle='rgba(0,0,0,0.3)';ctx.fillRect(35,180,105,16);
    ctx.save();ctx.translate(76,108);ctx.scale(4.8,4.8);const oldFacing=player.facing;player.facing='up';drawPlayer(8,16);player.facing=oldFacing;ctx.restore();
    drawBattleWolf();
    drawBlood();
    // Battle HUD
    ctx.fillStyle='rgba(10,14,27,0.94)';ctx.fillRect(12,10,133,47);
    ctx.strokeStyle='#e4d5b5';ctx.lineWidth=2;ctx.strokeRect(13,11,131,45);
    ctx.fillStyle='#fff0ce';ctx.textAlign='left';ctx.font='bold 10px monospace';ctx.fillText('YOUR ADVENTURER',20,25);
    ctx.font='8px monospace';ctx.fillText('HP '+stats.health+' / '+stats.maxHealth,20,39);
    drawBar(20,43,112,7,stats.health,stats.maxHealth,'#c74f54');
    ctx.fillStyle='rgba(10,14,27,0.94)';ctx.fillRect(190,12,119,43);
    ctx.strokeStyle='#e4d5b5';ctx.strokeRect(190.5,12.5,118,42);
    ctx.fillStyle='#fff0ce';ctx.font='bold 10px monospace';ctx.fillText('WILD WOLF',199,27);
    drawBar(199,35,99,8,battle.wolfHP,battle.maxWolfHP,'#a7c66b');
    ctx.fillStyle='rgba(8,12,23,0.96)';ctx.fillRect(7,190,306,44);
    ctx.strokeStyle='#d7c69e';ctx.strokeRect(8,191,304,42);
    ctx.fillStyle='#fff0ce';ctx.font='9px monospace';ctx.textAlign='left';ctx.fillText(battle.message,16,205);
    if(battle.phase==='command'){
      ctx.fillStyle='#f5dca6';ctx.font='bold 9px monospace';
      ctx.fillText('1  FIGHT',18,222);ctx.fillText('2  RUN',111,222);
    } else {
      ctx.fillStyle='#c8d5e7';ctx.font='8px monospace';ctx.fillText('...',18,222);
    }
    if(battle.phase==='intro') {ctx.fillStyle='rgba(4,7,16,'+(1-battle.fade)+')';ctx.fillRect(0,0,canvas.width,canvas.height);}
    if(battle.phase==='outro') {ctx.fillStyle='rgba(4,7,16,'+(1-battle.fade)+')';ctx.fillRect(0,0,canvas.width,canvas.height);}
  }


  function sidePlatforms() {
    if (REGIONS[platformScene] && REGIONS[platformScene].plats) return REGIONS[platformScene].plats;
    return platformScene === 'house' ? HOUSE_SIDE_PLATFORMS : platformScene === 'hollow' ? HOLLOW_SIDE_PLATFORMS
      : platformScene === 'pass' ? PASS_SIDE_PLATFORMS : platformScene === 'gloam' ? GLOAM_SIDE_PLATFORMS : FOREST_SIDE_PLATFORMS;
  }
  function outdoorScene() { return !!REGIONS[platformScene]; }

  function sideWorldWidth() {
    return platformScene === 'house' ? HOUSE_SIDE_WIDTH : region().width;
  }

  function updateSideCamera(dt) {
    let target = clamp(sidePlayer.x - canvas.width * 0.43, 0, Math.max(0, sideWorldWidth() - canvas.width));
    if (moonVisit) target = clamp(moonVisit.x - canvas.width * .60, 0, sideWorldWidth() - canvas.width);
    if (bossFight && (bossFight.active || bossFight.intro)) target = clamp((BOSS_ARENA.left + BOSS_ARENA.right) / 2 - canvas.width / 2 + (sidePlayer.x - (BOSS_ARENA.left + BOSS_ARENA.right) / 2) * 0.5, BOSS_ARENA.left - 20, BOSS_ARENA.right - canvas.width + 20);
    if (bossFight && bossFight.cine && bossFight.t < (bossFight.phaseTwo ? PHASE_END : CINE_END) - 0.3) {
      const b = theBoss();
      if (b) target = clamp(b.x - canvas.width / 2 + (b.type === 'mare' ? 10 : 0), 0, Math.max(0, sideWorldWidth() - canvas.width));
      sideCameraX += (target - sideCameraX) * Math.min(1, dt * 3.2);
      return;
    }
    sideCameraX += (target - sideCameraX) * Math.min(1, dt * (bossFight && bossFight.intro ? 4 : 7));
  }

  // ---------------------------------------------------------------------------
  // Knight combat: frame-accurate moves taken from assets/knight/Attacks.png
  // (8 x 5 grid of 128 x 64 cells, knight faces right) and attack_from_air.png.
  // Each move lists the frames it plays, which of those frames deal damage,
  // its reach, damage, knockback, forward lunge, and the move it chains into.
  // ---------------------------------------------------------------------------
  const KNIGHT_MOVES = {
    slash1:   { sheet: 'attacks', cols: 8, frames: [1, 2, 3, 4, 5], fps: 20, active: [2, 3], reach: 50, dmg: 1, knock: 95, lunge: 60, next: 'slash2', stamina: 6 },
    slash2:   { sheet: 'attacks', cols: 8, frames: [6, 7, 8, 9], fps: 18, active: [1, 2], reach: 50, dmg: 1, knock: 110, lunge: 60, next: 'finisher', stamina: 6 },
    finisher: { sheet: 'attacks', cols: 8, frames: [15, 16, 17, 18, 19, 20, 21, 22], fps: 17, active: [2, 3, 4], reach: 64, dmg: 2, knock: 230, lunge: 95, next: null, shake: 3, stop: 0.09, recover: 0.18, stamina: 10 },
    thrust:   { sheet: 'attacks', cols: 8, frames: [10, 11, 12, 13, 14], fps: 16, active: [1, 2, 3], reach: 56, dmg: 2, knock: 170, lunge: 190, next: 'slash2', shake: 1.5, stamina: 12 },
    air:      { sheet: 'air', cols: 2, frames: [2, 3, 4, 5, 6], fps: 16, active: [1, 2, 3], reach: 52, dmg: 2, knock: 90, lunge: 0, next: null, air: true, stamina: 8 },
    // Rising slash: an upward crescent that pops enemies into the air and
    // reaches fliers overhead. Works on the ground (with a small hop) or in the air.
    upper:    { sheet: 'attacks', cols: 8, frames: [9, 2, 3, 7, 7, 6], fps: 18, active: [2, 3, 4], reach: 46, dmg: 2, knock: 40, lunge: 30, next: null, upper: true, stamina: 10, recover: 0.12, fx: 'upper' },
    // Down slash (Hollow Knight style "pogo"): hold down + attack in the air.
    // Striking an enemy or a fireball below bounces the knight back up.
    down:     { sheet: 'air', cols: 2, frames: [0, 0, 1, 1, 2, 2], fps: 24, active: [0, 1, 2, 3], reach: 0, dmg: 1, knock: 60, lunge: 0, next: null, down: true, stamina: 3, recover: 0.03 },
    // Moonblade: released after charging. Big crescent swing plus a blue wave.
    power:    { sheet: 'attacks', cols: 8, frames: [14, 15, 16, 17, 18, 19, 20, 21], fps: 16, active: [2, 3], reach: 66, dmg: 4, knock: 260, lunge: 120, next: null, shake: 5, stop: 0.12, recover: 0.22, stamina: 0, fx: 'power' }
  };
  const ROLL_TIME = 0.4, ROLL_IFRAMES = 0.3, ROLL_SPEED = 236, ROLL_STAMINA = 18, CHARGE_TIME = 0.5, POWER_STAMINA = 28;
  let attackHeld = false, attackHeldAt = 0, attackBuffer = 0, rollBuffer = 0;
  const atkGhosts = [];     // short afterimages that make swings read as one smooth motion
  function downHeld() { return keys.has('arrowdown') || keys.has('s'); }
  function dirHeld() { return (keys.has('arrowleft') || keys.has('a')) !== (keys.has('arrowright') || keys.has('d')); }
  const playerWaves = [];   // blue Moonblade crescents
  // rarity: common / uncommon / rare / legend. value: what Old Bram pays per item.
  const ITEM_DEFS = {
    berries:   { name: 'Wild Berries', type: 'CONSUMABLE', rarity: 'common', value: 1, heal: 4, icon: 'berry',
                 desc: ['Sweet and juicy berries', 'from the meadow.'], lore: 'Mom used to bake these into pies every harvest. The bushes behind the house still remember her.' },
    bread:     { name: 'Camp Bread', type: 'CONSUMABLE', rarity: 'common', value: 2, heal: 10, icon: 'bread',
                 desc: ['A crusty loaf from', 'Old Bram\'s cart.'], lore: 'Baked on a hot stone by the campfire. Bram swears the secret is a pinch of ash.' },
    fish:      { name: 'River Fish', type: 'CONSUMABLE', rarity: 'common', value: 2, heal: 8, icon: 'fish',
                 desc: ['Fresh from the lake.', 'Hearty and filling.'], lore: 'Silver-scaled and still cold from the lake. Dad taught you to catch these.' },
    tonic:     { name: 'Red Tonic', type: 'CONSUMABLE', rarity: 'uncommon', value: 6, heal: 999, icon: 'tonic',
                 desc: ['A bubbling goblin brew.', 'Restores all health.'], lore: 'Goblins steal these from travellers. It smells awful and works perfectly.' },
    wood:      { name: 'Firewood', type: 'MATERIAL', rarity: 'common', value: 1, icon: 'wood',
                 desc: ['Dry split logs. Useful', 'for a campfire.'], lore: 'Split by Dad the morning before he left. The axe is still in the stump.' },
    fang:      { name: 'Goblin Fang', type: 'TROPHY', rarity: 'common', value: 3, icon: 'fang',
                 desc: ['Proof you bested a', 'goblin.'], lore: 'Yellowed and sharp. Goblins file their teeth before a raid.' },
    spore:     { name: 'Glow Spore', type: 'MATERIAL', rarity: 'common', value: 2, icon: 'spore',
                 desc: ['Shed by a walking', 'mushroom. Faintly warm.'], lore: 'The shrooms only started walking after the Moonfall. Nobody knows why.' },
    eye:       { name: 'Watcher Eye', type: 'TROPHY', rarity: 'uncommon', value: 4, icon: 'eye',
                 desc: ['It still seems to', 'follow you.'], lore: 'Watchers are the Hollow King\'s spies. Whatever one sees, he sees.' },
    bone:      { name: 'Old Bone', type: 'MATERIAL', rarity: 'common', value: 3, icon: 'bone',
                 desc: ['From a risen soldier', 'of the Hollow.'], lore: 'Some of these skeletons still wear Silver Watch badges. They were knights once.' },
    wisp:      { name: 'Hollow Wisp', type: 'MATERIAL', rarity: 'rare', value: 6, icon: 'wisp',
                 desc: ['A cold blue light', 'left by a wraith.'], lore: 'A piece of a soul the Hollow could not keep. It hums when you hold it close.' },
    boneblade: { name: 'Bone Blade', type: 'WEAPON', rarity: 'rare', value: 15, icon: 'boneblade', atk: 3,
                 desc: ['A sword of fused bone.', 'ATK +3. Equip in GEAR.'], lore: 'Carved by the dead for the dead. Heavier than steel, and it never dulls.' },
    crown:     { name: 'Hollow Crown', type: 'KEY ITEM', rarity: 'legend', value: 0, icon: 'crown',
                 desc: ['Grukk\'s rusted crown.', 'The curse clings to it.'], lore: 'Iron, bone and moonstone. Dad says it was forged from the first Moonfall shard.' },
    ember:     { name: 'Living Ember', type: 'MATERIAL', rarity: 'common', value: 4, icon: 'ember',
                 desc: ['Still warm. It never', 'quite goes out.'], lore: 'Shaken loose from an ash hound or a burning skull. Bram would pay well for these.' },
    feather:   { name: 'Crow Feather', type: 'TROPHY', rarity: 'common', value: 2, icon: 'feather',
                 desc: ['Black as a moonless', 'night.'], lore: 'The carrion crows of the pass follow the Pale Court, eating what the riders leave behind.' },
    lampglass: { name: 'Lamp Glass', type: 'MATERIAL', rarity: 'uncommon', value: 6, icon: 'lampglass',
                 desc: ['A cracked lamp pane', 'from Gloamhold.'], lore: 'Moonsilver once burned behind this glass. Hold it to your eye and the dark looks a little less dark.' },
    toadskin:  { name: 'Bog Toad Hide', type: 'MATERIAL', rarity: 'uncommon', value: 5, icon: 'toadskin',
                 desc: ['Thick, warty and', 'surprisingly tough.'], lore: 'Toads swelled to the size of carts after the Black Tide. Their hide turns a blade like old leather armor.' },
    emberedge: { name: 'Ember Edge', type: 'WEAPON', rarity: 'rare', value: 30, icon: 'emberedge', atk: 4,
                 desc: ['A blade that smoulders.', 'ATK +4. Equip in GEAR.'], lore: 'Forged from Ashmane\'s cooling heart-fire. The steel is always warm to the touch.' },
    moonsilver:{ name: 'Moonsilver Blade', type: 'WEAPON', rarity: 'legend', value: 60, icon: 'moonsilver', atk: 6,
                 desc: ['The lost sword of the', 'Watch. ATK +6.'], lore: 'Captain Ysolde\'s sword, swallowed by Vael. It sings faintly when the moon is out.' },
    palemane:  { name: 'Pale Mane', type: 'KEY ITEM', rarity: 'legend', value: 0, icon: 'palemane',
                 desc: ['A lock of cold blue', 'fire from Ashmane.'], lore: 'It burns without heat. Wren says the Pale Queen braids her own hair with the same fire.' },
    sigil:     { name: 'Watch Sigil', type: 'KEY ITEM', rarity: 'legend', value: 0, icon: 'sigil',
                 desc: ['The seal of Gloamhold', 'recovered from Vael.'], lore: 'The silver crescent of the Watch. With it, the gates of the old Watch fortresses will open again.' },
    locket:    { name: "Seren's Locket", type: 'KEY ITEM', rarity: 'legend', value: 0, icon: 'locket',
                 desc: ['Your mother\'s locket.', 'Still warm.'], lore: 'A baby\'s portrait and a note: I did not leave you. I am still singing.' }
  };
  const ITEM_ORDER = ['berries', 'bread', 'fish', 'tonic', 'wood', 'fang', 'spore', 'eye', 'bone', 'wisp', 'ember', 'feather', 'lampglass', 'toadskin', 'boneblade', 'emberedge', 'moonsilver', 'crown', 'palemane', 'sigil', 'locket'];
  const WEAPONS = { sword: { name: 'Knight Sword', atk: 2, icon: 'sword', arc: '230,240,255' }, boneblade: { name: 'Bone Blade', atk: 3, icon: 'boneblade', arc: '240,230,200' },
    emberedge: { name: 'Ember Edge', atk: 4, icon: 'emberedge', arc: '255,170,90' }, moonsilver: { name: 'Moonsilver Blade', atk: 6, icon: 'moonsilver', arc: '140,210,255' } };
  function currentWeapon() { const w = equipment.weapon; return w !== 'sword' && WEAPONS[w] && inventory[w] > 0 ? w : 'sword'; }
  function ownedWeapons() { return Object.keys(WEAPONS).filter(w => w === 'sword' || inventory[w] > 0); }
  WEAPONS.watchblade = { name: 'Watchrunner', atk: 4, icon: 'watchblade', arc: '143,230,188', rollCost: 13 };
  ITEM_DEFS.watchblade = { ...WEAPONS.watchblade, rarity: 'rare', type: 'WEAPON', value: 0, bound: true,
    desc: ['ATK +4. Rolls cost 13 stamina', 'instead of 18 while equipped.'], lore: 'A Watch courier’s blade, taken from the Hollow King’s hoard.' };
  ITEM_ORDER.push('watchblade');
  inventory.watchblade = 0;
  const RARITY_COLOR = { common: '#8a7a68', uncommon: '#5fbf6a', rare: '#5fa8ff', legend: '#f2c14e' };
  const INV_TABS = ['ITEMS', 'GEAR', 'STATS', 'QUEST', 'LORE', 'MAP', 'RELICS'];
  const ARMOR_DEFENSE = 3, SWORD_ATTACK = 2;
  let invTab = 0, invSel = 0, gearSel = 0, invOpenTime = 0;
  let hitStop = 0, screenShake = 0, comboTimer = 0, lastMove = null, landTime = 0;
  const combatFx = [], damageNumbers = [], pickups = [];
  let bloodEffects = true, bloodBurst = 0;
  const bloodDrops = [];
  const BLOOD_COLORS = ['#87182c', '#b41e35', '#db3048', '#ff6571'];
  const BLOOD_LIMIT = 128;
  const BATTLE_BLOOD_FLOOR = [{ x: 0, y: 184, w: 320 }];
  const DRY_MOBS = new Set(['skeleton', 'ghost', 'shade', 'skull', 'lamp', 'mourn', 'tidemaw']);

  function setBloodEffects(enabled) {
    bloodEffects = enabled;
    if (!enabled) bloodDrops.length = 0;
  }

  function spawnBlood(x, y, direction, heavy) {
    if (!bloodEffects) return;
    const seed = ++bloodBurst * 67;
    const count = heavy ? 22 : 13;
    for (let i = 0; i < count; i++) {
      const a = introHash(seed + i * 3), b = introHash(seed + i * 3 + 1), c = introHash(seed + i * 3 + 2);
      const life = 0.48 + a * 0.23;
      bloodDrops.push({ x: x + a * 6 - 3, y: y + b * 8 - 4,
        vx: direction * (30 + a * (heavy ? 135 : 95)) * (i % 5 === 0 ? -0.48 : 1), vy: -26 - b * 104,
        life, size: i % 5 === 0 ? (heavy ? 4 : 3) : i % 3 ? 2 : 1, color: BLOOD_COLORS[Math.floor(c * BLOOD_COLORS.length)] });
    }
    if (bloodDrops.length > BLOOD_LIMIT) bloodDrops.splice(0, bloodDrops.length - BLOOD_LIMIT);
  }
  function updateBlood(dt, platforms) {
    for (let i = bloodDrops.length - 1; i >= 0; i--) {
      const p = bloodDrops[i];
      p.life -= dt;
      if (p.life <= 0) { bloodDrops.splice(i, 1); continue; }
      if (p.settled) continue;
      const previousY = p.y;
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 460 * dt;
      if (p.y < previousY) continue;
      let surface = Infinity;
      for (const pl of platforms) {
        if (p.x >= pl.x && p.x < pl.x + pl.w && previousY <= pl.y && p.y >= pl.y) surface = Math.min(surface, pl.y);
      }
      if (surface < Infinity) {
        p.y = surface - 1;
        p.settled = true;
        p.life = 0.45 + p.size * 0.1;
      }
    }
  }
  function drawBlood() {
    ctx.save();
    for (const p of bloodDrops) {
      ctx.globalAlpha = Math.min(1, p.life * (p.settled ? 2.4 : 6));
      ctx.fillStyle = p.settled ? '#821a30' : p.color;
      ctx.fillRect(Math.round(p.x), Math.round(p.y) - (p.settled ? 0 : p.size - 1), p.settled ? p.size + 1 : p.size, p.settled ? 1 : p.size);
    }
    ctx.restore();
  }
  let levelUpUntil = 0;

  const MILESTONE_INTERVAL = 5;
  function nextMilestone(level) { return (Math.floor(level / MILESTONE_INTERVAL) + 1) * MILESTONE_INTERVAL; }
  function xpForNext(level) { return 42 + level * 20 + 3 * (level - 1) ** 2 + Math.max(0, level - 2) * 7; }
  function totalDefense() { return stats.defense + (stats.defUp || 0) + (stats.perkDef || 0) + (equipment.armor ? ARMOR_DEFENSE + tideDefense() : 0); }
  function totalAttack() { return stats.strength + (stats.atkUp || 0) + (stats.perkAtk || 0) + (equipment.armor ? WEAPONS[currentWeapon()].atk + (tide.forge[currentWeapon()] || 0) : 0); }

  // ---------- Audio: recorded CC0 sound effects + area music ----------
  const SFX_BANK = {
    swing: [['swing1', 'swing2', 'swing3', 'swing4'], 0.55],
    swingBig: [['swing_heavy'], 0.7],
    swoosh: [['swing1', 'swing2', 'swing3', 'swing4'], 0.55],
    swooshBig: [['swing_heavy'], 0.7],
    hit: [['hit0', 'hit1', 'slash_flesh'], 0.7],
    hitBig: [['hit_heavy', 'slash_flesh'], 0.85],
    clash: [['clash0', 'clash1'], 0.6],
    slam: [['hit_heavy'], 0.95],
    hurt: [['player_hurt'], 0.75],
    pickup: [['item_get'], 0.5],
    use: [['drink'], 0.7],
    eat: [['chop'], 0.5],
    level: [['levelup'], 0.6],
    tick: [['coin'], 0.35],
    coin: [['coin'], 0.35],
    coins: [['coins'], 0.6],
    gem: [['gem'], 0.55],
    land: [['land'], 0.4],
    stepGrass: [['step_grass0', 'step_grass1', 'step_grass2', 'step_grass3', 'step_grass4'], 0.22],
    stepWood: [['step_wood0', 'step_wood1', 'step_wood2', 'step_wood3', 'step_wood4'], 0.2],
    doorOpen: [['door_open'], 0.6], doorClose: [['door_close'], 0.6],
    armor: [['armor_clank'], 0.7], cloth: [['cloth'], 0.6], belt: [['belt'], 0.6],
    draw: [['draw_sword'], 0.6],
    bookOpen: [['book_open'], 0.6], bookFlip: [['book_flip'], 0.55], bookClose: [['book_close'], 0.55],
    uiMove: [['ui_move'], 0.35], uiTab: [['ui_tab'], 0.45], uiOpen: [['ui_open'], 0.5], uiClose: [['ui_close'], 0.5],
    uiConfirm: [['ui_confirm'], 0.5], uiError: [['ui_error'], 0.45], uiBack: [['ui_back'], 0.45],
    goblin: [['goblin1', 'goblin3', 'goblin5', 'goblin9'], 0.5],
    goblinHurt: [['goblin12', 'goblin15'], 0.55],
    monster: [['monster1', 'monster2', 'monster3'], 0.45],
    monsterHurt: [['monster5', 'monster11'], 0.5],
    ghost: [['monster14'], 0.45],
    die: [['creature_die'], 0.6],
    roar: [['roar'], 0.9],
    squish: [['squish'], 0.55],
    latch: [['latch'], 0.6], magic: [['magic'], 0.55], fire: [['fire'], 0.5], creak: [['creak'], 0.5],
    victory: [['victory'], 0.7], gameover: [['gameover'], 0.6],
    roll: [['cloth'], 0.7, 1.25], dodge: [['swing2'], 0.6, 1.6], charge: [['magic'], 0.45, 0.6],
    ready: [['gem'], 0.6, 0.8], wave: [['swing_heavy'], 0.9, 0.8], waveHum: [['magic'], 0.5, 1.4],
    hound: [['monster2', 'monster3'], 0.5, 1.5], crow: [['monster14'], 0.35, 2], skull: [['fire'], 0.5, 1.3],
    mare: [['roar'], 0.8, 1.3], demon: [['roar'], 1, 0.6], rest: [['fire'], 0.5, 0.9]
  };
  const sfxBuffers = {}, sfxLoading = {};
  let sfxPreloaded = false;
  function audioCtx() {
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return null;
    if (!introAudio) introAudio = new AudioCtor();
    if (introAudio.state === 'suspended') introAudio.resume().catch(() => {});
    return introAudio;
  }
  function loadSfxFile(file) {
    if (sfxBuffers[file] || sfxLoading[file]) return;
    const ac = audioCtx(); if (!ac || !window.fetch) return;
    sfxLoading[file] = fetch('./assets/audio/sfx/' + file + '.mp3')
      .then(r => r.arrayBuffer())
      .then(b => new Promise((res, rej) => ac.decodeAudioData(b, res, rej)))
      .then(buf => { sfxBuffers[file] = buf; })
      .catch(() => {});
  }
  function preloadSfx() {
    if (sfxPreloaded) return; sfxPreloaded = true;
    Object.values(SFX_BANK).forEach(([files]) => files.forEach(loadSfxFile));
  }
  function sfx(name, vol = 1, rate = 1) {
    if (typeof settings !== 'undefined' && settings && settings.sound === false) return;
    const entry = SFX_BANK[name];
    if (!entry) { synthSfx(name); return; }
    try {
      const ac = audioCtx(); if (!ac) return;
      preloadSfx();
      const files = entry[0];
      const file = files[Math.floor(Math.random() * files.length)];
      const buf = sfxBuffers[file];
      if (!buf) { loadSfxFile(file); synthSfx(name); return; }
      const src = ac.createBufferSource(); src.buffer = buf;
      src.playbackRate.value = rate * (entry[2] || 1) * (0.94 + Math.random() * 0.12);
      const g = ac.createGain(); g.gain.value = entry[1] * vol;
      src.connect(g); g.connect(ac.destination); src.start();
    } catch (_) {}
  }
  function mobVoice(m, kind) {
    const v = m.T.voice;
    if (v === 'goblin') sfx(kind === 'death' ? 'die' : kind === 'hurt' ? 'goblinHurt' : 'goblin', 0.9, kind === 'death' ? 1.3 : 1);
    else if (v === 'ogre') sfx(kind === 'death' ? 'roar' : kind === 'hurt' ? 'monsterHurt' : 'monster', 1, 0.7);
    else if (v === 'ghost') sfx(kind === 'death' ? 'magic' : 'ghost', 0.8, 1.2);
    else if (v === 'squish') sfx(kind === 'death' ? 'squish' : 'squish', 0.8, kind === 'hurt' ? 1.2 : 1);
    else if (v === 'eye') sfx(kind === 'death' ? 'die' : 'monster', 0.6, 1.5);
    else if (v === 'hound') sfx(kind === 'death' ? 'die' : 'hound', 0.8, kind === 'death' ? 1.4 : 1);
    else if (v === 'crow') sfx(kind === 'death' ? 'die' : 'crow', 0.6, 1.6);
    else if (v === 'skull') sfx(kind === 'death' ? 'fire' : 'skull', 0.7, 1.2);
    else sfx(kind === 'death' ? 'die' : 'monsterHurt', 0.7, 0.9);
  }

  // Music: looping tracks per area, cross-faded every frame.
  const MUSIC_FILES = { house: 'house', forest: 'forest', ambience: 'forest_ambience', hollow: 'hollow', boss: 'boss', bossMare: 'boss_mare', bossVael: 'boss_vael', bossIntro: 'boss_intro', camp: 'camp', pass: 'pass', gloam: 'gloam' };
  const MUSIC_VOL = { house: 0.32, forest: 0.34, ambience: 0.22, hollow: 0.38, boss: 0.42, bossMare: 0.4, bossVael: 0.42, bossIntro: 0.5, camp: 0.34, pass: 0.36, gloam: 0.4 };
  const musicTracks = {};
  function musicTrack(key) {
    if (!musicTracks[key]) {
      const a = new Audio('./assets/audio/music/' + MUSIC_FILES[key] + '.mp3');
      a.loop = true; a.preload = 'auto'; a.volume = 0;
      musicTracks[key] = { a, v: 0, playing: false };
    }
    return musicTracks[key];
  }
  function desiredMusic() {
    if (introActive) return {};
    if (!platformMode && insideHouse) return { house: 1 };
    if (!platformMode) return { forest: 1, ambience: 1 };
    if (platformScene === 'house') return { house: 1 };
    if (moonVisit) return { gloam: moonVisit.beat === 'depart' ? .28 : .06 };
    if (platformScene === 'aldersend') return { house: .57, forest: .19 };
    if (platformScene === 'gateward') return { camp: .58, gloam: .23 };
    if (platformScene === 'orchard') return { forest: .62, ambience: .42 };
    if (platformScene === 'annex') return { hollow: .67, gloam: .18 };
    if (nickScene) {
      const ramp = clamp(nickScene.t / 3.8, 0, 1);
      return { bossIntro: (.50 + ramp * .78) * (1 - clamp((nickScene.t - NICK_IMPACT - .30) / 1.05, 0, 1)) };
    }
    if (platformScene === 'pass' && !story.nickAmbushed && !bossFight && sidePlayer.x > NICK_OMEN && sidePlayer.x < NICK_TRAP + 195) {
      const ramp = clamp((sidePlayer.x - NICK_OMEN) / (NICK_TRAP - NICK_OMEN), 0, 1);
      return { pass: .76 * (1 - ramp), bossIntro: .50 * ramp };
    }
    if (bossFight && bossFight.intro) return { bossIntro: 1 };
    if (bossFight && bossFight.active) { const b = theBoss(); return b && b.type === 'mare' ? { bossMare: 1 } : b && ['demon', 'nick'].includes(b.type) ? { bossVael: 1 } : { boss: 1 }; }
    if (platformScene === 'frost' || platformScene === 'seam') return { hollow: .58, ambience: .22 };
    if (platformScene === 'pass') return Math.abs(sidePlayer.x - 1900) < 260 ? { camp: 0.8, pass: 0.4 } : { pass: 1 };
    if (platformScene === 'harbor') return { camp: 0.7, ambience: 0.35 };
    if (platformScene === 'court') return { gloam: 0.45 };
    if (platformScene === 'village') return { house: .53, ambience: .48 };
    if (platformScene === 'ring') return tideArena ? { bossMare: .65 } : { pass: .44, ambience: .4 };
    if (platformScene === 'vault') return { hollow: .72, ambience: .18 };
    if (platformScene === 'well') return tide.ending ? { house: .55 } : { gloam: .57, hollow: .22 };
    if (platformScene === 'gloam') return Math.abs(sidePlayer.x - 2240) < 220 ? { camp: 0.7, gloam: 0.5 } : { gloam: 1, ambience: 0.25 };
    if (platformScene === 'hollow') {
      if (story.chapterDone) return { camp: 1 };
      return { hollow: 1, ambience: 0.5 };
    }
    if (sidePlayer.x > 3560) return { camp: 1, ambience: 0.6 };
    return { forest: 1, ambience: 1 };
  }
  let musicUnlocked = false;
  function updateMusic(dt) {
    const on = typeof settings === 'undefined' || !settings || settings.music !== false;
    const want = on && musicUnlocked ? desiredMusic() : {};
    const duck = paused ? 0.3 : panel || dialogue ? 0.55 : 1;
    Object.keys(MUSIC_FILES).forEach(key => {
      const target = (want[key] || 0) * MUSIC_VOL[key] * duck;
      if (!target && !musicTracks[key]) return;
      const t = musicTrack(key);
      t.v += (target - t.v) * Math.min(1, dt * (bossFight && bossFight.intro ? 3.2 : 1.6));
      if (Math.abs(target - t.v) < 0.002) t.v = target;
      if (t.v > 0.001 && !t.playing) {
        t.playing = true;
        const p = t.a.play(); if (p && p.catch) p.catch(() => { t.playing = false; });
      } else if (t.v <= 0.001 && t.playing && !target) {
        t.playing = false; t.a.pause();
      }
      try { t.a.volume = Math.max(0, Math.min(1, t.v)); } catch (_) {}
    });
  }
  function unlockAudio() {
    musicUnlocked = true;
    audioCtx(); preloadSfx();
  }

  function synthSfx(name) {
    if (typeof settings !== 'undefined' && settings && settings.sound === false) return;
    try {
      const ac = audioCtx();
      if (!ac) return;
      const now = ac.currentTime;
      const out = ac.createGain(); out.connect(ac.destination);
      const noise = (dur) => {
        const buf = ac.createBuffer(1, Math.ceil(ac.sampleRate * dur), ac.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        const src = ac.createBufferSource(); src.buffer = buf; return src;
      };
      if (name === 'swoosh' || name === 'swooshBig') {
        const big = name === 'swooshBig', dur = big ? 0.22 : 0.15;
        const src = noise(dur), bp = ac.createBiquadFilter();
        bp.type = 'bandpass'; bp.Q.value = 1.4;
        bp.frequency.setValueAtTime(big ? 2600 : 2200, now);
        bp.frequency.exponentialRampToValueAtTime(big ? 380 : 600, now + dur);
        out.gain.setValueAtTime(0.0001, now);
        out.gain.exponentialRampToValueAtTime(big ? 0.11 : 0.07, now + 0.03);
        out.gain.exponentialRampToValueAtTime(0.0001, now + dur);
        src.connect(bp); bp.connect(out); src.start(now); src.stop(now + dur);
      } else if (name === 'hit' || name === 'hitBig') {
        const big = name === 'hitBig';
        const osc = ac.createOscillator(); osc.type = 'triangle';
        osc.frequency.setValueAtTime(big ? 170 : 210, now);
        osc.frequency.exponentialRampToValueAtTime(big ? 45 : 70, now + 0.14);
        const og = ac.createGain(); og.gain.setValueAtTime(big ? 0.22 : 0.16, now);
        og.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
        osc.connect(og); og.connect(out); osc.start(now); osc.stop(now + 0.17);
        const src = noise(0.07), hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1800;
        const ng = ac.createGain(); ng.gain.setValueAtTime(0.09, now); ng.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
        src.connect(hp); hp.connect(ng); ng.connect(out); src.start(now); src.stop(now + 0.07);
        out.gain.value = 1;
      } else if (name === 'hurt') {
        const osc = ac.createOscillator(); osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now); osc.frequency.exponentialRampToValueAtTime(90, now + 0.2);
        const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
        out.gain.setValueAtTime(0.08, now); out.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
        osc.connect(lp); lp.connect(out); osc.start(now); osc.stop(now + 0.23);
      } else if (name === 'pickup' || name === 'use' || name === 'level' || name === 'tick') {
        const notes = name === 'level' ? [523, 659, 784, 1046] : name === 'use' ? [440, 660] : name === 'tick' ? [880] : [880, 1320];
        const step = name === 'level' ? 0.09 : 0.06;
        notes.forEach((f, i) => {
          const osc = ac.createOscillator(); osc.type = name === 'tick' ? 'square' : 'sine';
          const g = ac.createGain(), t = now + i * step;
          const vol = name === 'tick' ? 0.025 : 0.07;
          g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
          g.gain.exponentialRampToValueAtTime(0.0001, t + (name === 'tick' ? 0.04 : 0.14));
          osc.frequency.value = f; osc.connect(g); g.connect(out); osc.start(t); osc.stop(t + 0.16);
        });
        out.gain.value = 1;
      }
    } catch (err) { /* audio is optional */ }
  }

  function spawnSparks(x, y, dir, count, palette) {
    for (let i = 0; i < count; i++) {
      const a = (Math.random() - 0.5) * 1.6 + (dir > 0 ? 0 : Math.PI);
      const sp = 70 + Math.random() * 150;
      combatFx.push({ kind: 'spark', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, life: 0.22 + Math.random() * 0.2, max: 0.4, color: palette[i % palette.length] });
    }
    combatFx.push({ kind: 'ring', x, y, life: 0.16, max: 0.16 });
  }
  function spawnDust(x, y, count) {
    for (let i = 0; i < count; i++) {
      combatFx.push({ kind: 'dust', x: x + (Math.random() - 0.5) * 14, y: y - 1, vx: (Math.random() - 0.5) * 50, vy: -10 - Math.random() * 25, life: 0.35 + Math.random() * 0.2, max: 0.55, color: '#b8a98a' });
    }
  }
  function addDamageNumber(x, y, text, color) {
    damageNumbers.push({ x, y, text: String(text), color, life: 0.8, vy: -48 });
  }

  // Distance from the knight's feet to the first surface below him.
  function groundBelowDistance() {
    let best = Infinity;
    for (const pl of sidePlatforms()) {
      if (sidePlayer.x + 10 > pl.x && sidePlayer.x - 10 < pl.x + pl.w && pl.y >= sidePlayer.y - 1) best = Math.min(best, pl.y - sidePlayer.y);
    }
    return best;
  }

  function chooseOpeningMove() {
    // High enough off the ground: a plunging strike that drives the knight down
    // and hits on landing. Too close to the ground: just slash and land.
    const upHeld = keys.has('arrowup') || keys.has('w');
    if (upHeld) return 'upper';
    if (!sidePlayer.onGround && downHeld()) return 'down';
    if (!sidePlayer.onGround) return groundBelowDistance() > 22 ? 'air' : 'slash1';
    if (downHeld() && tideMastered()) return 'undertow';
    if (comboTimer > 0 && lastMove && KNIGHT_MOVES[lastMove].next) return KNIGHT_MOVES[lastMove].next;
    if (Math.abs(sidePlayer.vx) > 132) return 'thrust';
    return 'slash1';
  }

  function startKnightMove(name) {
    const move = KNIGHT_MOVES[name];
    let dir = 0;
    if (keys.has('arrowleft') || keys.has('a')) dir -= 1;
    if (keys.has('arrowright') || keys.has('d')) dir += 1;
    if (dir) sidePlayer.facing = dir;
    sidePlayer.atk = { name, t: 0, hit: new Set(), queued: null, swooshed: false, phase: move.air ? 'hang' : null };
    if (sidePlayer.onGround && move.lunge) sidePlayer.vx = sidePlayer.facing * move.lunge * 0.35;
    if (move.down) { sidePlayer.vy = Math.min(sidePlayer.vy, 40); sfx('swing'); }
    if (move.air) { sidePlayer.vy = Math.min(sidePlayer.vy, -40); sidePlayer.vx *= 0.3; }
    if (move.upper) {
      // A short hop on the ground, a little lift in the air (allows juggles).
      sidePlayer.vy = sidePlayer.onGround ? -175 : Math.min(sidePlayer.vy, -130);
      sidePlayer.onGround = false;
      spawnDust(sidePlayer.x, sidePlayer.y, 5);
    }
    stats.stamina = Math.max(0, stats.stamina - (move.stamina || 0));
    comboTimer = 0;
    if (name === 'finisher' && hasRelic('echoblade')) playerWaves.push({ x: 0, y: 0, f: sidePlayer.facing, age: 0, life: 0.5, hit: new Set(), dist: 0, delay: 0.16, small: true, dmg: 2 });
  }

  // Plunging strike: a short hang, a fast dive, then the ground-impact frames
  // and shockwave play only once the knight's feet are on solid ground.
  function updatePlunge(atk, dt) {
    atk.t += dt;
    if (atk.phase === 'hang') {
      sidePlayer.vy = Math.min(sidePlayer.vy, 0) * 0.5;
      if (atk.t > 0.09) { atk.phase = 'dive'; atk.t = 0; sfx('swingBig'); }
    } else if (atk.phase === 'dive') {
      sidePlayer.vy = 560; sidePlayer.vx *= Math.max(0, 1 - dt * 10);
      if (sidePlayer.onGround) {
        atk.phase = 'impact'; atk.t = 0;
        screenShake = Math.max(screenShake, 4); hitStop = 0.05;
        spawnDust(sidePlayer.x - 10, sidePlayer.y, 6); spawnDust(sidePlayer.x + 10, sidePlayer.y, 6);
        combatFx.push({ kind: 'shock', x: sidePlayer.x, y: sidePlayer.y, life: 0.32, max: 0.32 });
        sfx('slam'); padRumble(0.8, 0.9, 160);
        plungeHitCheck();
      }
    } else if (atk.phase === 'impact') {
      sidePlayer.vx = 0;
      if (atk.t >= 4 / 14) { sidePlayer.atk = null; sidePlayer.attackCooldown = 0.16; lastMove = 'air'; comboTimer = 0; }
    }
    sidePlayer.attackTime = 1;
  }

  function updateKnightAttack(dt) {
    if (sideUpperQueued) {
      sideUpperQueued = false;
      if (!sidePlayer.atk && !sidePlayer.charge && sidePlayer.attackCooldown <= 0 && !panel && sidePlayer.hurtTime <= 0) startKnightMove('upper');
      else if (sidePlayer.atk && KNIGHT_MOVES[sidePlayer.atk.name].next) sidePlayer.atk.queued = 'upper';
    }
    updateCharge(dt);
    if (sidePlayer.charge) { sideAttackQueued = false; sidePlayer.attackTime = 1; return; }
    // Presses are buffered briefly so a tap during a roll, a landing or the
    // end of a swing still comes out, which keeps combos flowing.
    if (sideAttackQueued) { sideAttackQueued = false; attackBuffer = 0.22; }
    if (attackBuffer > 0) {
      attackBuffer -= dt;
      if (sidePlayer.atk) {
        const move = KNIGHT_MOVES[sidePlayer.atk.name];
        if (move.next) { sidePlayer.atk.queued = move.next; attackBuffer = 0; }
      } else if (!sidePlayer.roll && sidePlayer.attackCooldown <= 0 && !panel && sidePlayer.hurtTime <= 0) {
        startKnightMove(chooseOpeningMove()); attackBuffer = 0;
      }
    }
    const atk = sidePlayer.atk;
    if (!atk) { sidePlayer.attackTime = 0; return; }
    const move = KNIGHT_MOVES[atk.name];
    if (move.air) { updatePlunge(atk, dt); return; }
    atk.t += dt;
    const idx = Math.floor(atk.t * move.fps);
    if (!atk.swooshed && idx >= move.active[0]) {
      atk.swooshed = true;
      if (!move.down) sfx(atk.name === 'finisher' || atk.name === 'thrust' || atk.name === 'power' ? 'swingBig' : 'swing');
      if (sidePlayer.onGround && move.lunge) sidePlayer.vx = sidePlayer.facing * move.lunge;
      if (move.down) combatFx.push({ kind: 'downarc', x: sidePlayer.x, y: sidePlayer.y, f: sidePlayer.facing, color: WEAPONS[currentWeapon()].arc, life: 0.18, max: 0.18, vx: 0, vy: 0 });
      if (move.fx === 'upper') combatFx.push({ kind: 'arc', x: sidePlayer.x + sidePlayer.facing * 8, y: sidePlayer.y - 26, f: sidePlayer.facing, r: 34, up: true, color: WEAPONS[currentWeapon()].arc, life: 0.2, max: 0.2, vx: 0, vy: 0 });
      if (move.fx === 'power') { releaseMoonblade(); sfx('waveHum'); }
      if (atk.name === 'undertow') {
        combatFx.push({ kind: 'arc', x: sidePlayer.x + sidePlayer.facing * 30, y: sidePlayer.y - 23,
          f: sidePlayer.facing, r: 43, color: WEAPONS[currentWeapon()].arc, life: .24, max: .24, vx: 0, vy: 0, art: 'quickdraw-slash' });
        sfx('waveHum', .55, 1.22);
      }
    }
    if (idx >= move.frames.length) {
      const queued = atk.queued;
      sidePlayer.atk = null;
      if (queued && sidePlayer.onGround) { startKnightMove(queued); return; }
      lastMove = atk.name;
      comboTimer = move.next ? 0.32 : 0;
      sidePlayer.attackCooldown = move.recover || 0.05;
      // Still holding the attack button after a swing: start charging the Moonblade.
      if (attackHeld && atk.name !== 'power' && atk.name !== 'upper' && sidePlayer.onGround) tryStartCharge();
      return;
    }
    sidePlayer.attackTime = 1;
    if (outdoorScene() && move.active.includes(idx)) { if (move.down) downHitCheck(atk); else knightHitCheck(atk, move); }
    // A down slash that bounced can be repeated right away for chained pogos.
    if (move.down && atk.bounced && atk.t > 0.1) { sidePlayer.atk = null; lastMove = 'down'; return; }
    // Landing mid down-slash ends it cleanly.
    if (move.down && sidePlayer.onGround && atk.t > 0.05) { sidePlayer.atk = null; sidePlayer.attackCooldown = 0.06; lastMove = 'down'; return; }
    // Recovery frames can be cancelled by moving or jumping.
    const lastActive = Math.max(...move.active);
    if (!move.down && !move.fx && idx > lastActive + 1 && !atk.queued && (dirHeld() || sideJumpQueued)) {
      sidePlayer.atk = null; lastMove = atk.name; comboTimer = move.next ? 0.32 : 0; sidePlayer.attackCooldown = 0.04;
    }
  }

  // Pogo: hits the area under the knight's feet and bounces him off anything struck.
  function downHitCheck(atk) {
    const x = sidePlayer.x, top = sidePlayer.y - 8, bottom = sidePlayer.y + 30;
    let struck = false;
    sideMobs.forEach(m => {
      if (m.dead || m.dormant || atk.hit.has(m)) return;
      if (Math.abs(m.x - x) > m.T.width / 2 + 16) return;
      if (m.y < top || mobTop(m) > bottom) return;
      atk.hit.add(m); struck = true;
      const bonus = Math.floor((totalAttack() - 5) / 4), crit = Math.random() < 0.12;
      damageMob(m, KNIGHT_MOVES.down.dmg + bonus + (crit ? 1 : 0), m.x < x ? -1 : 1, KNIGHT_MOVES.down.knock, crit, crit);
    });
    for (let i = mobShots.length - 1; i >= 0; i--) {
      const sh = mobShots[i];
      if (Math.abs(sh.x - x) < 20 && sh.y > top && sh.y < bottom) {
        spawnSparks(sh.x, sh.y, sidePlayer.facing, 8, ['#ffd27a', '#ff8a3a', '#ffffff']); sfx('clash', 0.6, 1.3);
        mobShots.splice(i, 1); struck = true;
      }
    }
    if (struck && !atk.bounced) pogoBounce(atk);
  }
  function pogoBounce(atk) {
    atk.bounced = true;
    sidePlayer.vy = -300; sidePlayer.onGround = false;
    sidePlayer.invulnTime = Math.max(sidePlayer.invulnTime, 0.18);
    stats.stamina = Math.min(stats.maxStamina, stats.stamina + 3);
    combatFx.push({ kind: 'ring', x: sidePlayer.x, y: sidePlayer.y + 10, life: 0.2, max: 0.2, vx: 0, vy: 0 });
    for (let k = 0; k < 6; k++) combatFx.push({ kind: 'spark', x: sidePlayer.x + (Math.random() - 0.5) * 16, y: sidePlayer.y + 10, vx: (Math.random() - 0.5) * 120, vy: 40 + Math.random() * 60, color: k % 2 ? '#ffffff' : '#bfe6ff', life: 0.25, max: 0.25 });
    hitStop = Math.max(hitStop, 0.05);
    sfx('clash', 0.5, 1.5); padRumble(0.3, 0.6, 70);
  }

  // ---------------------------------------------------------------------------
  // Dodge roll, Moonblade charge and its blue crescent wave.
  // ---------------------------------------------------------------------------
  function attackPressed() { attackHeld = true; attackHeldAt = time; }
  function attackReleased() {
    attackHeld = false;
    const c = sidePlayer.charge;
    if (!c) return;
    sidePlayer.charge = null;
    if (c.ready) {
      stats.stamina = Math.max(0, stats.stamina - POWER_STAMINA);
      startKnightMove('power');
      sidePlayer.vx = sidePlayer.facing * 120;
    }
  }
  function tryStartCharge() {
    if (sidePlayer.charge || sidePlayer.roll || !platformMode || !outdoorScene()) return;
    if (stats.stamina < POWER_STAMINA) { notice = 'Not enough stamina to charge the Moonblade.'; noticeUntil = time + 1.2; return; }
    sidePlayer.charge = { t: 0, ready: false };
    sfx('charge');
  }
  function updateCharge(dt) {
    // Holding attack while standing still also begins a charge.
    if (!sidePlayer.charge && attackHeld && !sidePlayer.atk && sidePlayer.onGround && sidePlayer.hurtTime <= 0 && !sidePlayer.roll && time - attackHeldAt > 0.25 && sidePlayer.attackCooldown <= 0) tryStartCharge();
    const c = sidePlayer.charge;
    if (!c) return;
    if (sidePlayer.hurtTime > 0 || sidePlayer.deadTime > 0 || panel || !sidePlayer.onGround) { sidePlayer.charge = null; return; }
    if (!attackHeld) { attackReleased(); return; }
    c.t += dt;
    sidePlayer.vx *= Math.max(0, 1 - dt * 12);
    // Blue motes rush in toward the blade.
    if (Math.random() < dt * (c.ready ? 26 : 40)) {
      const a = Math.random() * Math.PI * 2, r = 26 + Math.random() * 18;
      const cx = sidePlayer.x, cy = sidePlayer.y - 22;
      combatFx.push({ kind: 'mote', x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, tx: cx, ty: cy, color: Math.random() < 0.5 ? '#8fd8ff' : '#e6f6ff', life: 0.34, max: 0.34, vx: 0, vy: 0 });
    }
    if (!c.ready && c.t >= chargeTime()) {
      c.ready = true;
      combatFx.push({ kind: 'ring', x: sidePlayer.x, y: sidePlayer.y - 24, blue: true, art: 'arc-discharge', life: 0.3, max: 0.3, vx: 0, vy: 0 });
      sfx('ready'); padRumble(0.2, 0.5, 90);
    }
  }
  function releaseMoonblade() {
    const f = sidePlayer.facing;
    playerWaves.push({ x: sidePlayer.x + f * 26, y: sidePlayer.y - 24, f, age: 0, life: 0.75, hit: new Set(), dist: 0, frost: currentWeapon() === 'frostedge' });
    combatFx.push({ kind: 'arc', x: sidePlayer.x + f * 6, y: sidePlayer.y - 26, f, r: 46, color: '120,200,255', life: 0.24, max: 0.24, vx: 0, vy: 0 });
    flashUntil = time + 0.08;
    screenShake = Math.max(screenShake, 4);
    sfx('wave'); padRumble(0.7, 1, 180);
  }
  function updatePlayerWaves(dt) {
    for (let i = playerWaves.length - 1; i >= 0; i--) {
      const w = playerWaves[i];
      if (w.delay > 0) { w.delay -= dt; if (w.delay <= 0) { w.f = sidePlayer.facing; w.x = sidePlayer.x + w.f * 22; w.y = sidePlayer.y - 24; sfx('waveHum', 0.6); } continue; }
      w.age += dt;
      const step = (360 - w.age * 180) * dt;
      w.x += w.f * step; w.dist += step;
      if (Math.random() < dt * 60) combatFx.push({ kind: 'spark', x: w.x - w.f * 6, y: w.y + (Math.random() - 0.5) * 34, vx: -w.f * 40, vy: (Math.random() - 0.5) * 30, color: Math.random() < 0.5 ? '#8fd8ff' : '#ffffff', life: 0.3, max: 0.3 });
      sideMobs.forEach(m => {
        if (m.dead || m.dormant || w.hit.has(m)) return;
        if (Math.abs(m.x - w.x) > m.T.width / 2 + 10) return;
        if (m.y < w.y - 30 || mobTop(m) > w.y + 30) return;
        w.hit.add(m);
        const bonus = Math.floor((totalAttack() - 5) / 4);
        damageMob(m, (w.dmg || 4) + bonus, w.f, w.small ? 120 : 220, true, false);
        foundryImpact('magic-hit', m.x, w.y, w.f);
      });
      // A half-health hit can clear the wave list from inside damageMob.
      if (bossFight?.phaseTwo) return;
      if (w.age >= w.life || w.x < 0 || w.x > sideWorldWidth()) playerWaves.splice(i, 1);
    }
  }
  function drawPlayerWaves() {
    if (!playerWaves.length) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    playerWaves.forEach(w => {
      if (w.delay > 0) return;
      const a = Math.max(0, 1 - w.age / w.life);
      const s = (1 + w.age * 0.6) * (w.small ? 0.62 : 1);
      for (let t = 3; t >= 0; t--) {
        const x = w.x - w.f * t * 9;
        ctx.globalAlpha = a * (t === 0 ? 1 : 0.28 - t * 0.05);
        ctx.strokeStyle = t === 0 ? '#e8f8ff' : w.frost ? '#8985ef' : '#4fb6ff';
        ctx.lineWidth = t === 0 ? 3 : 6;
        ctx.beginPath();
        ctx.ellipse(x - w.f * 10 * s, w.y, 14 * s, 24 * s, 0, w.f > 0 ? -1.25 : Math.PI - 1.25 + 0, w.f > 0 ? 1.25 : Math.PI + 1.25);
        ctx.stroke();
      }
      ctx.globalAlpha = a * 0.5;
      ctx.strokeStyle = '#7fd0ff'; ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.ellipse(w.x - w.f * 12 * s, w.y, 14 * s, 24 * s, 0, w.f > 0 ? -1.1 : Math.PI - 1.1, w.f > 0 ? 1.1 : Math.PI + 1.1);
      ctx.stroke();
      if (w.frost) {
        ctx.fillStyle = '#c0f3ff';
        for (let j = 0; j < 11; j++) {
          const x = w.x - w.f * ((j * 11 + w.age * 150) % 85), y = w.y + Math.sin(j * 2.4 + w.age * 9) * 25;
          ctx.fillRect(Math.round(x), Math.round(y), 2 + j % 3, 1 + j % 2);
        }
      }
    });
    ctx.restore();
  }

  function tryRoll(quiet) {
    if (!platformMode || !outdoorScene() || panel || dialogue) return false;
    if (sidePlayer.roll || sidePlayer.deadTime > 0 || sidePlayer.hurtTime > 0 || !sidePlayer.onGround) return false;
    if ((sidePlayer.rollCooldown || 0) > 0) return false;
    if (sidePlayer.atk && KNIGHT_MOVES[sidePlayer.atk.name].air) return false;
    const cost = WEAPONS[currentWeapon()].rollCost || ROLL_STAMINA;
    if (stats.stamina < cost) { if (!quiet) { notice = 'Too tired to roll.'; noticeUntil = time + 1; } return quiet ? false : true; }
    let dir = 0;
    if (keys.has('arrowleft') || keys.has('a')) dir -= 1;
    if (keys.has('arrowright') || keys.has('d')) dir += 1;
    if (!dir) dir = sidePlayer.facing;
    sidePlayer.facing = dir;
    sidePlayer.atk = null; sidePlayer.charge = null; sidePlayer.attackTime = 0; comboTimer = 0;
    sidePlayer.roll = { t: 0, dir, perfect: false, trail: [] };
    stats.stamina = Math.max(0, stats.stamina - cost);
    spawnDust(sidePlayer.x - dir * 6, sidePlayer.y, 6);
    sfx('roll');
    return true;
  }
  function updateRoll(dt) {
    const r = sidePlayer.roll;
    r.t += dt;
    const k = Math.min(1, r.t / ROLL_TIME);
    // Fast burst out of the crouch, then a smooth glide to a stop.
    const burst = Math.min(1, r.t / 0.05);
    sidePlayer.vx = r.dir * ROLL_SPEED * (0.55 + 0.6 * burst) * (1 - Math.pow(k, 1.6) * 0.8);
    if (Math.floor(r.t * 40) !== Math.floor((r.t - dt) * 40)) {
      r.trail.push({ x: sidePlayer.x, y: sidePlayer.y, t: r.t, life: 0.14 });
      if (Math.random() < 0.5) spawnDust(sidePlayer.x - r.dir * 8, sidePlayer.y, 1);
    }
    emberRoll(r);
    r.trail.forEach(g => g.life -= dt);
    r.trail = r.trail.filter(g => g.life > 0);
    if (r.t >= ROLL_TIME) { sidePlayer.roll = null; sidePlayer.rollCooldown = 0.08; sidePlayer.vx *= 0.55; landTime = 0.05; }
  }
  // Called by every enemy hit test. During the roll's invincible window a
  // would-be hit becomes a "perfect dodge": stamina back and a blue flash.
  function canHitPlayer() {
    const r = sidePlayer.roll;
    if (r && r.t < ROLL_IFRAMES) {
      if (!r.perfect) {
        r.perfect = true;
        stats.stamina = Math.min(stats.maxStamina, stats.stamina + 14 + (hasRelic('breakwater') ? 12 : 0));
        addDamageNumber(sidePlayer.x, sidePlayer.y - 56, 'DODGE', '#8fd8ff');
        combatFx.push({ kind: 'ring', x: sidePlayer.x, y: sidePlayer.y - 22, blue: true, life: 0.3, max: 0.3, vx: 0, vy: 0 });
        hitStop = Math.max(hitStop, 0.06);
        sfx('dodge'); onPerfectDodge();
      }
      return false;
    }
    return sidePlayer.invulnTime <= 0;
  }

  function mobTop(m) { return m.y - m.T.bodyH; }
  function weaponAttack() { return WEAPONS[currentWeapon()].atk; }
  function strikeRing(m, death) {
    const rgb = m.T.boss ? (BOSS_FORMS[m.type]?.[2] ? hexRgb(BOSS_FORMS[m.type][2]) : '230,190,135')
      : m.T.spores ? '173,224,112' : DRY_MOBS.has(m.type) || m.T.fly ? '138,216,250' : '255,201,133';
    const life = death ? .4 : .2;
    combatFx.push({ kind: 'strikeRing', x: m.x, y: m.y - m.T.bodyH * .48, color: rgb,
      radius: m.T.boss ? 30 : death ? 16 : 10, life, max: life, vx: 0, vy: 0 });
  }

  function damageMob(m, dmg, f, knock, big, crit, companion = false) {
    if (m.dead || m.dormant || (bossFight && (bossFight.phaseTwo || (m.T.boss && bossFight.intro)))) return;
    // Skeletons sometimes raise their shield against hits from the front.
    if (m.T.block && !m.dead && m.attackTime <= 0 && m.hurtTime <= 0 && Math.random() < m.T.block && Math.sign(sidePlayer.x - m.x) === m.dir) {
      m.blockTime = 0.4; m.flash = 0.04; m.kvx = f * knock * 0.4;
      spawnSparks(m.x - f * 10, m.y - m.T.bodyH * 0.6, f, 6, ['#ffffff', '#c9d6ff']);
      addDamageNumber(m.x, mobTop(m) - 8, 'BLOCK', '#c9d6ff');
      sfx('clash'); hitStop = 0.04; return;
    }
    dmg = fortuneDamage(Math.max(1, dmg));
    const halfway = Math.ceil(m.maxHp / 2);
    const turns = m.T.boss && bossFight && bossFight.active && !m.enraged && m.hp - dmg <= halfway;
    if (turns) dmg = m.hp - halfway;
    m.hp = Math.max(0, m.hp - dmg);
    if (!companion && dmg > 0) tideWearBlade();
    m.flash = 0.07; m.showHpUntil = time + 3;
    if (!m.T.armor) {
      m.hurtTime = 0.3; m.kvx = f * knock; m.attackTime = 0; m.attackHit = true;
      m.attackCooldown = Math.max(m.attackCooldown, 0.55);
      if (m.type !== 'nick' || m.st !== 'ray') m.dir = -f;
    } else {
      m.kvx = f * knock * 0.12;
    }
    hitStop = big ? 0.075 : 0.05;
    screenShake = Math.max(screenShake, big ? 2.5 : 1.2);
    spawnSparks(m.x - f * 8, m.y - m.T.bodyH * 0.6, f, big ? 12 : 7, m.type === 'ghost' ? ['#d8fbff', '#7fe3ff', '#ffffff'] : ['#fff6d0', '#ffd27a', '#ff9a4a']);
    if (big && dmg > 0) strikeRing(m, false);
    if (dmg > 0 && !DRY_MOBS.has(m.type)) spawnBlood(m.x, m.y - m.T.bodyH * 0.52, f, big || m.hp === 0);
    addDamageNumber(m.x, mobTop(m) - 10, crit ? dmg + '!' : dmg, crit ? '#ffdf6b' : '#ffffff');
    sfx(big ? 'hitBig' : 'hit');
    mobVoice(m, 'hurt');
    padRumble(big ? 0.7 : 0.35, big ? 0.9 : 0.6, big ? 140 : 80);
    if (m.hp <= 0) defeatMob(m, f);
    if (crit) onCrit(m, f);
    if (turns) beginBossSecondPhase(m);
  }

  function knightHitCheck(atk, move) {
    const f = sidePlayer.facing;
    const near = sidePlayer.x + f * 4, far = sidePlayer.x + f * move.reach;
    const lo = Math.min(near, far) - 12, hi = Math.max(near, far) + 12;
    // The sword sweeps roughly the knight's own height: feet to helmet plus a little.
    const swingTop = sidePlayer.y - (move.upper ? 88 : move.fx === 'power' ? 58 : 46), swingBottom = sidePlayer.y + 4;
    sideMobs.forEach(m => {
      if (m.dead || m.dormant || atk.hit.has(m)) return;
      if (m.x + m.T.width / 2 < lo || m.x - m.T.width / 2 > hi) return;
      if (m.y < swingTop || mobTop(m) > swingBottom) return;
      atk.hit.add(m);
      const bonus = Math.floor((totalAttack() - 5) / 4);
      const crit = Math.random() < critChance();
      const big = atk.name === 'finisher' || atk.name === 'thrust' || atk.name === 'power' || crit;
      damageMob(m, crit ? Math.ceil((move.dmg + bonus) * 1.6) : move.dmg + bonus, f, move.knock, big, crit);
      // The rising slash pops light enemies into the air for a follow-up.
      if (move.upper && !m.dead && !m.T.armor && !m.T.fly && !m.T.boss && m.blockTime <= 0) { m.liftV = -250; m.lift = Math.max(m.lift || 0, 1); }
    });
  }

  function plungeHitCheck() {
    sideMobs.forEach(m => {
      if (m.dead || m.dormant) return;
      const dx = m.x - sidePlayer.x;
      if (Math.abs(dx) > 62 + m.T.width / 2) return;
      if (Math.abs(m.y - sidePlayer.y) > 34 + (m.T.fly || 0)) return;
      const f = dx < 0 ? -1 : 1;
      const bonus = Math.floor((totalAttack() - 5) / 4);
      damageMob(m, 3 + bonus, f, 200, true, false);
    });
  }

  function defeatMob(m, f) {
    if (m.dead) return;
    const T = m.T;
    m.dead = true; m.deadTime = 0; m.respawn = T.boss || T.done || m.arenaWave || ['reever', 'seamFiend'].includes(m.type) ? Infinity : 24; m.attackTime = 0;
    m.kvx = T.armor ? 0 : f * 160;
    hitStop = T.boss ? 0.3 : 0.11; screenShake = Math.max(screenShake, T.boss ? 7 : 3.5);
    stats.kills = (stats.kills || 0) + 1;
    if (m.type === 'goblin') stats.goblinKills = (stats.goblinKills || 0) + 1;
    mobVoice(m, 'death');
    strikeRing(m, true);
    if (!T.boss && !T.anims.death) spawnSparks(m.x, m.y - T.bodyH * 0.5, f, 10, ['#5a5060', '#8a8090', '#2a2430', T.light ? '#ffb347' : '#c8324a']);
    const dropY = m.y - T.bodyH * 0.6;
    const coinMul = (hasRelic('giltooth') ? 1.6 : 1) * (m.elite ? (m.elite.gold ? 4 : 2) : 1) * (bloodMoon ? 1.5 : 1) * blessCoins();
    const coins = Math.round((T.coins[0] + Math.floor(Math.random() * (T.coins[1] - T.coins[0] + 1))) * coinMul);
    for (let i = 0; i < coins; i++) pickups.push({ type: 'coin', amount: 1, x: m.x, y: dropY, vx: (Math.random() - 0.5) * 140, vy: -150 - Math.random() * 90, age: 0 });
    T.drops.forEach(([item, chance], k) => {
      // A completed boss is saved immediately and cannot be fought again.
      // Put unique guaranteed loot in the bag before writing that save.
      if (T.boss && chance === 1 && (WEAPONS[item] || ITEM_DEFS[item]?.type === 'KEY ITEM')) {
        if (!inventory[item]) tideGrant(item, 1);
        return;
      }
      if (Math.random() < chance) pickups.push({ type: item, amount: 1, x: m.x, y: dropY, vx: (k % 2 ? -1 : 1) * f * 60, vy: -190 - k * 20, age: 0 });
    });
    fortuneOnKill(m, dropY);
    if (!m.arenaWave) depthsOnKill(m);
    tideOnKill(m);
    if (m.type === 'seamFiend') {
      story.seamCleared = true;
      notice = 'The mine cache is unguarded.'; noticeUntil = time + 3;
      tidePersist();
    }
    if (T.xp) gainXp(Math.round(T.xp * (m.elite ? 1.75 : 1) * (bloodMoon ? 1.4 : 1)));
    if (T.done) { story[T.done] = true; tidePersist(); }
    if (T.boss) onBossDefeated(m);
  }

  function gainXp(amount) {
    stats.xp = (stats.xp || 0) + amount;
    addDamageNumber(sidePlayer.x, sidePlayer.y - 64, '+' + amount + ' XP', '#9be37a');
    let gainedLevel = false, milestone = false;
    while (stats.xp >= xpForNext(stats.level)) {
      stats.xp -= xpForNext(stats.level);
      stats.level++;
      stats.maxHealth += 3; stats.strength += 1;
      if (stats.level % 2 === 0) stats.defense += 1;
      stats.health = Math.min(stats.maxHealth, stats.health + 6);
      stats.stamina = Math.min(stats.maxStamina, stats.stamina + 30);
      gainedLevel = true;
      if (stats.level % MILESTONE_INTERVAL === 0) {
        pendingPerks.push({ level: stats.level, cards: [] });
        milestone = true;
      }
    }
    if (gainedLevel) {
      levelUpUntil = time + 2.4;
      notice = milestone ? 'Milestone blessing earned!' : 'Level ' + stats.level + ' reached.';
      noticeUntil = time + 2.6;
      sfx('level', milestone ? 1 : .55); padRumble(0.4, 0.4, 260);
      if (onSave) onSave(getSaveData());
    }
  }

  function bossHitFloor(maxHealth, enraged, hazard) {
    return Math.max(hazard ? 2 : 3, Math.ceil(maxHealth * (hazard ? (enraged ? .08 : .06) : (enraged ? .12 : .09))));
  }
  function hurtByBoss(raw, fromDir, who, enraged, hazard = false) {
    const defense = totalDefense();
    const mitigation = Math.min(.42, defense / (defense + 17));
    const amount = Math.ceil((raw + (enraged ? 2 : 0)) * (1 - mitigation));
    hurtSidePlayer(amount, fromDir, who, bossHitFloor(stats.maxHealth, enraged, hazard));
  }
  function hurtSidePlayer(amount, fromDir, who, minimum = 1) {
    amount = Math.max(minimum, fortuneHurt(amount));
    if (equipment.armor && tide.coatTemper > 0) tide.armorWear = Math.min(100, tide.armorWear + 5);
    stats.health = Math.max(0, stats.health - amount);
    sidePlayer.hurtTime = 0.36; sidePlayer.invulnTime = 1.1;
    sidePlayer.atk = null; sidePlayer.attackTime = 0; comboTimer = 0; sidePlayer.charge = null; sidePlayer.roll = null; sidePlayer.drink = null;
    sidePlayer.vx = fromDir * 150; sidePlayer.vy = -120; sidePlayer.onGround = false;
    hitStop = 0.06; screenShake = Math.max(screenShake, 2.5);
    addDamageNumber(sidePlayer.x, sidePlayer.y - 58, amount, '#ff6b6b');
    spawnSparks(sidePlayer.x, sidePlayer.y - 28, fromDir, 6, ['#ff8a8a', '#ffffff']);
    if (amount > 0) spawnBlood(sidePlayer.x, sidePlayer.y - 28, fromDir, stats.health <= 0);
    sfx('hurt');
    padRumble(0.9, 0.5, stats.health <= 0 ? 420 : 200);
    if (stats.health <= 0 && phoenixRevive()) {
      notice = 'The Phoenix Plume burns away your death!'; noticeUntil = time + 2.4;
    } else if (stats.health <= 0) {
      sidePlayer.deadTime = 1.9; sidePlayer.deathAge = 0;
      notice = 'You were overwhelmed. Returning to the trail...'; noticeUntil = time + 2.2;
    } else { notice = (who || 'Something') + ' hit you!'; noticeUntil = time + 1.2; }
  }

  function updateCombatFx(dt) {
    screenShake = Math.max(0, screenShake - dt * 14);
    comboTimer = Math.max(0, comboTimer - dt);
    landTime = Math.max(0, landTime - dt);
    if (bloodDrops.length) updateBlood(dt, sidePlatforms());
    for (let i = combatFx.length - 1; i >= 0; i--) {
      const p = combatFx[i];
      p.life -= dt;
      if (p.kind === 'mote') { const k = Math.min(1, dt * 9); p.x += (p.tx - p.x) * k; p.y += (p.ty - p.y) * k; }
      else if (p.kind === 'downarc') { p.x = sidePlayer.x; p.y = sidePlayer.y; }
      else if (p.kind !== 'ring' && p.kind !== 'shock' && p.kind !== 'arc' && p.kind !== 'foundry') { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.kind === 'dust' ? 30 : 420) * dt; }
      if (p.life <= 0) combatFx.splice(i, 1);
    }
    for (let i = damageNumbers.length - 1; i >= 0; i--) {
      const d = damageNumbers[i];
      d.life -= dt; d.y += d.vy * dt; d.vy *= Math.max(0, 1 - dt * 4);
      if (d.life <= 0) damageNumbers.splice(i, 1);
    }
    for (let i = pickups.length - 1; i >= 0; i--) {
      const p = pickups[i];
      p.age += dt;
      const dx = sidePlayer.x - p.x, dy = (sidePlayer.y - 20) - p.y;
      const dist = Math.hypot(dx, dy);
      if (p.age > 0.55 && dist < 70 && sidePlayer.deadTime <= 0) {
        const pull = 420 / Math.max(12, dist);
        p.vx += dx * pull * dt; p.vy += dy * pull * dt;
        p.vx *= 0.9; p.vy *= 0.9;
        p.x += p.vx * dt; p.y += p.vy * dt;
      } else {
        p.vy += 640 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.y > SIDE_GROUND_Y - 4) { p.y = SIDE_GROUND_Y - 4; p.vy = -Math.abs(p.vy) * 0.35; p.vx *= 0.6; if (Math.abs(p.vy) < 25) p.vy = 0; }
      }
      if (p.age > 0.55 && dist < 13) {
        if (p.type === 'coin') { inventory.coins = (inventory.coins || 0) + p.amount; sfx('tick'); }
        else if (p.type === 'relic') { pickups.splice(i, 1); grantRelic(p.relic); continue; }
        else {
          inventory[p.type] = (inventory[p.type] || 0) + p.amount;
          if (!newItems.has(p.type) && (inventory[p.type] || 0) === p.amount) newItems.add(p.type);
          notice = '+1 ' + ITEM_DEFS[p.type].name; noticeUntil = time + 1.6;
          sfx(ITEM_DEFS[p.type].rarity === 'rare' || ITEM_DEFS[p.type].rarity === 'legend' ? 'gem' : 'pickup');
        }
        pickups.splice(i, 1);
      } else if (p.age > 30 && p.type !== 'relic') pickups.splice(i, 1);
    }
  }

  function drawCombatFx() {
    ctx.save();
    combatFx.forEach(p => {
      const a = Math.max(0, p.life / p.max);
      if (p.art && !prefersReducedMotion() && drawFoundry(p.art, p.x, p.y, (1 - a) * (p.kind === 'foundry' ? p.max : .53),
        p.art === 'quickdraw-slash' ? .91 : .66, p.f || 1, a > .35 ? .91 : a * 2.6)) return;
      if (p.kind === 'shock') {
        const r = 6 + (1 - a) * 58;
        ctx.strokeStyle = 'rgba(255,236,190,' + a * 0.9 + ')'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(p.x, p.y, r, r * 0.22, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = 'rgba(160,220,255,' + a * 0.6 + ')'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(p.x, p.y, r * 0.7, r * 0.16, 0, 0, Math.PI * 2); ctx.stroke();
      } else if (p.kind === 'arc') {
        // Sword crescent: a thick bright arc that sweeps then fades.
        const k = 1 - a, f = p.f;
        let a0, a1;
        if (p.up) { a0 = f > 0 ? 0.9 : Math.PI - 0.9; a1 = f > 0 ? -2.2 : Math.PI + 2.2; }
        else { a0 = f > 0 ? -1.5 : Math.PI + 1.5; a1 = f > 0 ? 1.2 : Math.PI - 1.2; }
        const sweep = a0 + (a1 - a0) * Math.min(1, k * 2.4);
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (let w = 3; w >= 1; w--) {
          ctx.strokeStyle = 'rgba(' + p.color + ',' + (a * (w === 1 ? 0.95 : 0.25)) + ')';
          ctx.lineWidth = w === 1 ? 2 : w * 3;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, Math.min(a0, sweep), Math.max(a0, sweep)); ctx.stroke();
        }
        ctx.strokeStyle = 'rgba(255,255,255,' + a + ')'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r - 3, Math.min(a0, sweep), Math.max(a0, sweep)); ctx.stroke();
        ctx.restore();
      } else if (p.kind === 'downarc') {
        // Down-slash crescent sweeping under the knight's feet.
        const k = 1 - a, f = p.f;
        const a0 = f > 0 ? 0.05 : Math.PI - 0.05, a1 = f > 0 ? Math.PI - 0.05 : 0.05;
        const sweep = a0 + (a1 - a0) * Math.min(1, k * 2.6);
        const cx = p.x, cy = p.y + 2;
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (let w = 3; w >= 1; w--) {
          ctx.strokeStyle = 'rgba(' + p.color + ',' + (a * (w === 1 ? 0.95 : 0.25)) + ')';
          ctx.lineWidth = w === 1 ? 2 : w * 3;
          ctx.beginPath(); ctx.ellipse(cx, cy, 24, 20, 0, Math.min(a0, sweep), Math.max(a0, sweep)); ctx.stroke();
        }
        ctx.strokeStyle = 'rgba(255,255,255,' + a + ')'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(cx, cy, 21, 17, 0, Math.min(a0, sweep), Math.max(a0, sweep)); ctx.stroke();
        ctx.restore();
      } else if (p.kind === 'mote') {
        ctx.globalAlpha = a; ctx.fillStyle = p.color; ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 2); ctx.globalAlpha = 1;
      } else if (p.kind === 'ring') {
        ctx.strokeStyle = p.blue ? 'rgba(140,215,255,' + a + ')' : 'rgba(255,240,200,' + a + ')'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(p.x, p.y, 4 + (1 - a) * 14, 0, Math.PI * 2); ctx.stroke();
      } else if (p.kind === 'strikeRing') {
        const r = 4 + (1 - a) * p.radius;
        ctx.strokeStyle = 'rgba(' + p.color + ',' + (a * .85) + ')'; ctx.lineWidth = a > .65 ? 2 : 1;
        ctx.beginPath(); ctx.ellipse(p.x, p.y, r, r * .7, 0, 0, Math.PI * 2); ctx.stroke();
      } else if (p.kind !== 'foundry') {
        ctx.globalAlpha = p.kind === 'dust' ? a * 0.6 : a;
        ctx.fillStyle = p.color;
        const s = p.kind === 'dust' ? 2 : (a > 0.5 ? 2 : 1);
        ctx.fillRect(Math.round(p.x), Math.round(p.y), s, s);
        ctx.globalAlpha = 1;
      }
    });
    if (bloodDrops.length) drawBlood();
    pickups.forEach(p => {
      const bob = p.vy === 0 ? Math.sin(time * 5 + p.x) * 1.5 : 0;
      if (p.type === 'coin') {
        const w = Math.max(1, Math.round(Math.abs(Math.cos(time * 7 + p.x)) * 5));
        ctx.fillStyle = '#7a4a12'; ctx.fillRect(Math.round(p.x - w / 2) - 1, Math.round(p.y + bob) - 3, w + 2, 7);
        ctx.fillStyle = '#f2c14e'; ctx.fillRect(Math.round(p.x - w / 2), Math.round(p.y + bob) - 2, w, 5);
        ctx.fillStyle = '#fff1a8'; ctx.fillRect(Math.round(p.x - w / 2), Math.round(p.y + bob) - 2, 1, 2);
      } else if (p.type === 'relic') {
        const RR = RARITY[RELICS[p.relic].rarity], py = Math.round(p.y + bob);
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const bg = ctx.createLinearGradient(0, py - 90, 0, py);
        bg.addColorStop(0, 'rgba(' + RR.glow + ',0)'); bg.addColorStop(1, 'rgba(' + RR.glow + ',.5)');
        ctx.fillStyle = bg; ctx.fillRect(Math.round(p.x) - 4, py - 90, 8, 90);
        const gg = ctx.createRadialGradient(p.x, py, 1, p.x, py, 14);
        gg.addColorStop(0, 'rgba(' + RR.glow + ',.6)'); gg.addColorStop(1, 'rgba(' + RR.glow + ',0)');
        ctx.fillStyle = gg; ctx.fillRect(p.x - 14, py - 14, 28, 28); ctx.restore();
        drawRelicIcon(p.relic, Math.round(p.x) - 4, py - 4, 1);
      } else {
        ctx.fillStyle = 'rgba(255,230,150,' + (0.25 + Math.sin(time * 6) * 0.1) + ')';
        ctx.fillRect(Math.round(p.x) - 8, Math.round(p.y + bob) - 8, 16, 16);
        drawItemIcon(ITEM_DEFS[p.type].icon, Math.round(p.x) - 6, Math.round(p.y + bob) - 6, 1);
      }
    });
    ctx.textAlign = 'center'; ctx.font = 'bold 8px monospace';
    damageNumbers.forEach(d => {
      ctx.globalAlpha = Math.min(1, d.life / 0.3);
      ctx.fillStyle = '#120c14'; ctx.fillText(d.text, Math.round(d.x) + 1, Math.round(d.y) + 1);
      ctx.fillStyle = d.color; ctx.fillText(d.text, Math.round(d.x), Math.round(d.y));
    });
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // 12 x 12 pixel-art item icons (drawn at 1x for pickups, 2x in the inventory).
  // ---------------------------------------------------------------------------
  const ICON_PALETTE = {
    k: '#1b1420', y: '#f2c14e', Y: '#fff1a8', o: '#b9802a',
    r: '#c8324a', R: '#ff8090', p: '#74173a', g: '#4f9a3a', G: '#9bd96f',
    b: '#7a4a2a', B: '#ad7444', l: '#e3bd84', d: '#4b2b18',
    c: '#4f8fd1', C: '#a9d6ff', n: '#28487f', w: '#f4efe0', W: '#ffffff', s: '#a89c84',
    m: '#7b8e9c', M: '#d3dde0', h: '#45586a', u: '#c49a55', t: '#5a3a24', v: '#8fd0ff',
    e: '#7a4cc0', E: '#c9a8ff', q: '#2fbfa0', Q: '#b8fff0', f: '#d8cfb4', F: '#a0947a', x: '#e8542e'
  };
  const ICONS = {
    ember: [
      '............',
      '.....x......',
      '....xx......',
      '....xYx.....',
      '...xYYx.x...',
      '..xxYYYxx...',
      '..xYYWYYx...',
      '..xYWWWYx...',
      '..xxYWYxx...',
      '...xxYxx....',
      '....xxx.....',
      '............'],
    feather: [
      '..........k.',
      '.........kk.',
      '........kek.',
      '.......kekk.',
      '......kekk..',
      '.....kekk...',
      '....kekk....',
      '...kekk.....',
      '..kkkk......',
      '..kk........',
      '.k..........',
      '............'],
    lampglass: [
      '....kkkk....',
      '...kyyyyk...',
      '...kkkkkk...',
      '...kCvvCk...',
      '...kvWCvk...',
      '...kCvCvk...',
      '...kvCWvk...',
      '...kCvvCk...',
      '...kkkkkk...',
      '....kyyk....',
      '.....kk.....',
      '............'],
    toadskin: [
      '............',
      '..kkkkkkkk..',
      '.kgGggGggGk.',
      '.kggqggqggk.',
      '.kGggGggggk.',
      '.kggggGgqgk.',
      '.kgqgggggGk.',
      '.kggGgqgggk.',
      '.kGgggggGgk.',
      '..kkkkkkkk..',
      '............',
      '............'],
    emberedge: [
      '..........kk',
      '.........kxk',
      '........kxYk',
      '.......kxYk.',
      '......kxYk..',
      '.....kxYk...',
      '..k.kxYk....',
      '..kkxYk.....',
      '...kYk......',
      '..kdkkk.....',
      '.kdk........',
      '.kk.........'],
    moonsilver: [
      '..........kk',
      '.........kCk',
      '........kCWk',
      '.......kCWk.',
      '......kCWk..',
      '.....kCWk...',
      '..y.kCWk....',
      '..yyCWk.....',
      '...yWk......',
      '..kcyyy.....',
      '.kck........',
      '.kk.........'],
    palemane: [
      '......C.....',
      '.....CvC....',
      '....CvWvC...',
      '...CvWWv....',
      '...vWWvC....',
      '..CvWvC.....',
      '..vWvC......',
      '..CvC.......',
      '...vC.......',
      '....C.......',
      '............',
      '............'],
    sigil: [
      '....kkkk....',
      '..kkMMMMkk..',
      '.kMMWkkkMMk.',
      '.kMWk...kMk.',
      'kMWk.....kk.',
      'kMWk........',
      'kMWk.....kk.',
      '.kMWk...kMk.',
      '.kMMWkkkMMk.',
      '..kkMMMMkk..',
      '....kkkk....',
      '............'],
    locket: [
      '.....yy.....',
      '....y..y....',
      '.....yy.....',
      '....kkkk....',
      '...kyYYyk...',
      '..kyYEEYyk..',
      '..kyEWEEyk..',
      '..kyYEEYyk..',
      '...kyYYyk...',
      '....kkkk....',
      '............',
      '............'],
    bread: [
      '............',
      '............',
      '....kkkk....',
      '..kkBllBkk..',
      '.kBllBBllBk.',
      'kBlBBllBBlBk',
      'kBBlBBBlBBBk',
      'kbBBBBBBBBbk',
      'kbbbbbbbbbbk',
      '.kkbbbbbbkk.',
      '...kkkkkk...',
      '............'],
    bone: [
      '............',
      '.kk......kk.',
      'kffk....kffk',
      'kfFfk..kfFfk',
      '.kffkkkkffk.',
      '..kffffffk..',
      '..kFFFFFFk..',
      '.kffkkkkffk.',
      'kfFfk..kfFfk',
      'kffk....kffk',
      '.kk......kk.',
      '............'],
    spore: [
      '............',
      '...kkkkkk...',
      '..kxxwxxxk..',
      '.kxwxxxwxxk.',
      'kxxxxwxxxxxk',
      'kkkkkkkkkkkk',
      '....kffk....',
      '....kfFk....',
      '....kffk....',
      '...kfffFk...',
      '...kkkkkk...',
      '............'],
    eye: [
      '............',
      '...kkkkkk...',
      '..kwwwwwwk..',
      '.kwwrrrrwwk.',
      'kwwrRkkrrwwk',
      'kwwrkkkkrwwk',
      'kwwrkkkkrwwk',
      'kwwrrkkrrwwk',
      '.kwwrrrrwwk.',
      '..kwwwwwwk..',
      '...kkkkkk...',
      '............'],
    wisp: [
      '.....kk.....',
      '....kQQk....',
      '...kQvQk....',
      '...kvQvvk...',
      '..kvQQvvk...',
      '..kvQWQvvk..',
      '.kvQWWQvck..',
      '.kcvQQvcck..',
      '.kccvvccnk..',
      '..kncccnk...',
      '...kkkkk....',
      '............'],
    boneblade: [
      '..........kk',
      '.........kfk',
      '........kfFk',
      '.......kfFk.',
      '......kfFk..',
      '.....kfFk...',
      '..k.kfFk....',
      '..kkfFk.....',
      '...kFk......',
      '..kbkkk.....',
      '.kbk........',
      '.kk.........'],
    crown: [
      '............',
      '............',
      '.k...kk...k.',
      'kyk.kyyk.kyk',
      'kyykyyyykyyk',
      'kyyyyeyyyyyk',
      'kyoyyEyyoyyk',
      'kyyyyyyyyyyk',
      'koyoyoyoyoyk',
      'kkkkkkkkkkkk',
      '............',
      '............'],
    page: [
      '............',
      '..kkkkkkk...',
      '..kwwwwwwk..',
      '..kwsssswkk.',
      '..kwwwwwwwk.',
      '..kwsssssswk',
      '..kwwwwwwwwk',
      '..kwssssswwk',
      '..kwwwwwwwwk',
      '..kwsssswwwk',
      '..kkkkkkkkkk',
      '............'],
    whetstone: [
      '............',
      '............',
      '............',
      '....kkkkkk..',
      '..kkmMMMmk..',
      '.kmMMMMmmhk.',
      'kmmmmmmhhhk.',
      'khhhhhhhhk..',
      '.kkkkkkkk...',
      '............',
      '............',
      '............'],
    plate: [
      '............',
      '..kkkkkkkk..',
      '.kmMMMMMMmk.',
      '.kmMmmmmMmk.',
      '.kmmmmmmmhk.',
      '.kmmmuummhk.',
      '.kmmmuummhk.',
      '.khmmmmmhhk.',
      '..khmmmmhk..',
      '...khhhhk...',
      '....kkkk....',
      '............'],
    berry: [
      '.....gg.....',
      '....gGg.....',
      '...kkgkkk...',
      '..krRkkrRk..',
      '.krRrrkrRrk.',
      '.krrrpkrrpk.',
      '..kpkkrRkk..',
      '...kkrRrrk..',
      '....krrrpk..',
      '....kpppk...',
      '.....kkk....',
      '............'],
    wood: [
      '............',
      '............',
      '..kkkkkkkk..',
      '.kBBBBBBBkk.',
      'kbbbbbbbkllk',
      'kBBBBBBBkldk',
      'kbbbbbbbkllk',
      '.kkkkkkkkkk.',
      '.kBBBBBkllk.',
      'kbbbbbbkldk.',
      '.kkkkkkkkk..',
      '............'],
    fish: [
      '............',
      '............',
      '....kkkk....',
      '..kkCCCCk.kk',
      '.kCCWkcCCkck',
      'kccckccccckk',
      'kcnccccccckk',
      '.kcnnnnnckck',
      '..kknnnnk.kk',
      '....kkkk....',
      '............',
      '............'],
    tonic: [
      '....kkkk....',
      '....kttk....',
      '....kkkk....',
      '.....kvk....',
      '....kvvvk...',
      '...kRrrrrk..',
      '..kRWrrrrpk.',
      '..kRrrrrrpk.',
      '..krrrrrrpk.',
      '..kprrrrppk.',
      '...kkppkkk..',
      '....kkkk....'],
    fang: [
      '............',
      '...kkkkk....',
      '..kWwwwwk...',
      '..kwwwwwsk..',
      '...kwwwwsk..',
      '....kwwwsk..',
      '....kwwsk...',
      '.....kwsk...',
      '.....kwk....',
      '.....kk.....',
      '............',
      '............'],
    coin: [
      '............',
      '....kkkk....',
      '..kkyyyykk..',
      '.kyYyyyyyok.',
      '.kYyykkyyok.',
      'kyYyk..kyyok',
      'kyyyk..kyyok',
      '.kyyykkyyok.',
      '.kyyyyyyook.',
      '..kkooookk..',
      '....kkkk....',
      '............'],
    helm: [
      '....kkkk....',
      '..kkMMmmkk..',
      '.kMMmmmmmhk.',
      '.kMmmmmmmhk.',
      'kMmmmmmmmmhk',
      'kmkkkkkkkkhk',
      'kmk.k..k.khk',
      'kmmkkkkkkmhk',
      'kmmmmuummmhk',
      '.khmmmmmmhk.',
      '..kkkkkkkk..',
      '............'],
    armor: [
      '..kk....kk..',
      '.kMmkkkkmhk.',
      'kMmmmMMmmmhk',
      'kmmmMmmmmmhk',
      'kkmmMmmumhkk',
      '.kmmmmuummk.',
      '.kmmmmmmmhk.',
      '.khkkkkkkhk.',
      '.kmmuummmhk.',
      '.kmmmmmmmhk.',
      '..khhhhhhk..',
      '...kkkkkk...'],
    legs: [
      '............',
      '..kkkkkkkk..',
      '..kmmukummk.',
      '..kMmkkMmhk.',
      '..kMmk.kMhk.',
      '..kMmk.kMhk.',
      '..kmhk.kmhk.',
      '..kMmk.kMhk.',
      '..kmhk.kmhk.',
      '.kmmhk.kmmhk',
      '.kkkkk.kkkkk',
      '............'],
    sword: [
      '..........kk',
      '.........kMk',
      '........kMhk',
      '.......kMhk.',
      '......kMhk..',
      '.....kMhk...',
      '.kk.kMhk....',
      '.kukMhk.....',
      '..kuhk......',
      '.ktkuuk.....',
      'ktk..kk.....',
      'kk..........']
  };
  function drawItemIcon(name, x, y, scale = 2) {
    const watchblade = name === 'watchblade';
    if (watchblade) name = 'sword';
    const art = TIDE_ICONS[name] || ICONS[name];
    if (!art) return;
    for (let r = 0; r < 12; r++) {
      const row = art[r];
      for (let c = 0; c < 12; c++) {
        const ch = row[c];
        if (!ch || ch === '.') continue;
        ctx.fillStyle = (watchblade && ({ M: '#c2f6d6', h: '#56a290', u: '#ad8254' })[ch]) ||
          (TIDE_ICONS[name] ? TIDE_INK : ICON_PALETTE)[ch] || '#ff00ff';
        ctx.fillRect(x + c * scale, y + r * scale, scale, scale);
      }
    }
  }

  function recoverAtCheckpoint() {
    const fire = FIRES.find(f => f.id === story.lastFire && f.scene === platformScene);
    Object.assign(sidePlayer, { x: fire ? fire.x - 30 : region().entry, y: SIDE_GROUND_Y, vx: 0, vy: 0,
      roll: null, charge: null, onGround: true, invulnTime: 1.6, atk: null, hurtTime: 0, facing: 1 });
    pickups.length = 0;
    stats.health = Math.max(1, Math.ceil(stats.maxHealth * .65));
    notice = fire ? 'You wake near ' + fire.name + '.' : 'You wake at the entrance.';
    noticeUntil = time + 2.5;
  }

  function updatePlatformer(dt) {
    syncArena();
    if (nickScene) { time += dt; updateNickAmbush(dt); return; }
    if (moonVisit) { time += dt; updateMoonVisit(dt); updateSideCamera(dt); return; }
    if (hitStop > 0) { hitStop -= dt; sideMobs.forEach(g => { g.flash = Math.max(0, (g.flash || 0) - dt); }); updateSideCamera(dt); return; }
    time += dt;
    updatePerkPanel();
    if (!panel && !dialogue && !bossFight?.cine) tide.mealTime = Math.max(0, tide.mealTime - dt);
    if (tideFishing) updateTideFishing(dt);
    saveTimer += dt;
    if (saveTimer >= 5) {
      saveTimer = 0;
      if (onSave) onSave(getSaveData());
    }

    sidePlayer.attackCooldown = Math.max(0, sidePlayer.attackCooldown - dt);
    sidePlayer.attackTime = Math.max(0, sidePlayer.attackTime - dt);
    sidePlayer.hurtTime = Math.max(0, sidePlayer.hurtTime - dt);
    sidePlayer.invulnTime = Math.max(0, sidePlayer.invulnTime - dt);
    sidePlayer.rollCooldown = Math.max(0, (sidePlayer.rollCooldown || 0) - dt);
    updateCombatFx(dt);
    updateFortune(dt);
    updateDepths(dt);
    updateAmbient(dt);
    if (sidePlayer.deadTime > 0) {
      sidePlayer.deadTime -= dt; sidePlayer.deathAge = (sidePlayer.deathAge || 0) + dt;
      sidePlayer.vx *= Math.max(0, 1 - dt * 8);
      sidePlayer.x = clamp(sidePlayer.x + sidePlayer.vx * dt, 16, sideWorldWidth() - 16);
      if (sidePlayer.y < SIDE_GROUND_Y) { sidePlayer.vy += 820 * dt; sidePlayer.y = Math.min(SIDE_GROUND_Y, sidePlayer.y + sidePlayer.vy * dt); } else sidePlayer.vy = 0;
      if (sidePlayer.deadTime <= 0) {
        if (tideArena) { tideArena = null; loadSceneMobs(platformScene); }
        if (bossFight) endBossFight(false);
        recoverAtCheckpoint();
        if (onSave) onSave(getSaveData());
      }
      sideAttackQueued = false; sideJumpQueued = false; updateSideCamera(dt); return;
    }
    if (dialogue || (bossFight && bossFight.intro)) {
      sidePlayer.vx = 0; sidePlayer.moving = false; sidePlayer.atk = null; sidePlayer.roll = null; sidePlayer.charge = null;
      sideJumpQueued = false; sideAttackQueued = false;
      if (dialogue) updateDialogue(dt);
      if (bossFight) updateBossIntro(dt);
      updateDad(dt);
      if (!sidePlayer.onGround) { sidePlayer.vy += 820 * dt; sidePlayer.y = Math.min(SIDE_GROUND_Y, sidePlayer.y + sidePlayer.vy * dt); if (sidePlayer.y >= SIDE_GROUND_Y) { sidePlayer.onGround = true; sidePlayer.vy = 0; } }
      updateSideCamera(dt);
      return;
    }
    if (armorTutorialPending) {
      sidePlayer.vx = 0; sidePlayer.moving = false;
      sideJumpQueued = false; sideAttackQueued = false;
      updateSideCamera(dt);
      return;
    }
    // Menus pause the action so goblins cannot attack while the bag is open.
    if (panel) {
      sidePlayer.vx = 0; sidePlayer.moving = false;
      sideJumpQueued = false; sideAttackQueued = false;
      updateSideCamera(dt);
      return;
    }

    maybeOpenPerks();
    if (panel) { clearHeldInput(); sidePlayer.vx = 0; sidePlayer.moving = false; return; }
    updatePlayerWaves(dt);
    if (sideRollQueued) { sideRollQueued = false; if (!tryRoll()) rollBuffer = 0.18; }
    else if (rollBuffer > 0) { rollBuffer -= dt; if (tryRoll(true)) rollBuffer = 0; }
    if (sidePlayer.pray) {
      sidePlayer.pray.t += dt; sidePlayer.vx = 0; sidePlayer.moving = false;
      if (sidePlayer.pray.t >= 2.1) sidePlayer.pray = null;
      sideAttackQueued = false; sideJumpQueued = false;
    } else if (sidePlayer.drink) {
      sidePlayer.drink.t += dt; sidePlayer.vx *= Math.max(0, 1 - dt * 12); sidePlayer.moving = false;
      if (sidePlayer.drink.t >= 0.55) sidePlayer.drink = null;
      sideAttackQueued = false;
    } else if (sidePlayer.roll) {
      updateRoll(dt);
      sidePlayer.moving = false;
      sideJumpQueued = false;
    } else if (!panel && (sidePlayer.atk || sidePlayer.hurtTime > 0)) {
      // Committed: attacks carry their own lunge and hits knock the knight back.
      const a = sidePlayer.atk, m = a && KNIGHT_MOVES[a.name];
      if (!sidePlayer.onGround && m && !m.air && sidePlayer.hurtTime <= 0) {
        // Keep steering in the air while swinging.
        let d = 0; if (keys.has('arrowleft') || keys.has('a')) d -= 1; if (keys.has('arrowright') || keys.has('d')) d += 1;
        sidePlayer.vx += (d * 112 - sidePlayer.vx) * Math.min(1, dt * 7);
      } else {
        const friction = sidePlayer.onGround ? 10 : 2;
        sidePlayer.vx *= Math.max(0, 1 - dt * friction);
      }
      sidePlayer.moving = false;
      stats.stamina = Math.min(stats.maxStamina, stats.stamina + 6 * dt);
    } else if (!panel) {
      let direction = 0;
      if (keys.has('arrowleft') || keys.has('a')) direction -= 1;
      if (keys.has('arrowright') || keys.has('d')) direction += 1;
      const sprinting = direction !== 0 && keys.has('shift') && stats.stamina > 0;
      const targetSpeed = direction * (sprinting ? 154 : 112) * blessSpeed() * (tideMounted() ? 1.55 : 1);
      const response = Math.min(1, dt * (direction ? 12 : 15));
      sidePlayer.vx += (targetSpeed - sidePlayer.vx) * response;
      if (direction) sidePlayer.facing = direction < 0 ? -1 : 1;
      sidePlayer.moving = Math.abs(sidePlayer.vx) > 8;

      if (sideJumpQueued && sidePlayer.onGround) {
        sidePlayer.vy = -292;
        sidePlayer.onGround = false;
        spawnDust(sidePlayer.x, sidePlayer.y, 4);
        sfx('cloth', 0.5, 1.2);
      } else if (sideJumpQueued) tryAirJump();
      if (sprinting) stats.stamina = Math.max(0, stats.stamina - 20 * dt);
      else stats.stamina = Math.min(stats.maxStamina, stats.stamina + 13 * dt);
      if (sidePlayer.moving) {
        const before = Math.floor(sidePlayer.walk / 4);
        sidePlayer.walk += Math.abs(sidePlayer.vx) * dt / 7.5;
        if (sidePlayer.onGround && Math.floor(sidePlayer.walk / 4) !== before) sfx('stepGrass', 0.8 + (sprinting ? 0.3 : 0));
      }
    } else {
      sidePlayer.vx *= Math.max(0, 1 - dt * 18);
      sidePlayer.moving = false;
    }
    sideJumpQueued = false;
    updateKnightAttack(dt);
    if (bossFight && bossFight.phaseTwo) { updateSideCamera(dt); return; }

    const oldFeet = sidePlayer.y;
    let nextX = clamp(sidePlayer.x + sidePlayer.vx * dt, 16, sideWorldWidth() - 16);
    if (bossFight && bossFight.active) nextX = clamp(nextX, BOSS_ARENA.left + 12, BOSS_ARENA.right - 12);
    sidePlayer.x = nextX;
    sidePlayer.vy += 820 * dt;
    const nextFeet = sidePlayer.y + sidePlayer.vy * dt;
    let landing = null;
    if (sidePlayer.vy >= 0) {
      for (const platform of sidePlatforms()) {
        const overlapsX = sidePlayer.x + 10 > platform.x && sidePlayer.x - 10 < platform.x + platform.w;
        if (overlapsX && oldFeet <= platform.y + 1 && nextFeet >= platform.y) {
          if (!landing || platform.y < landing.y) landing = platform;
        }
      }
    }
    if (landing) {
      if (!sidePlayer.onGround && sidePlayer.vy > 180) { landTime = 0.08; spawnDust(sidePlayer.x, landing.y, 5); if (!(sidePlayer.atk && sidePlayer.atk.phase === 'dive')) sfx('land', 0.7); }
      sidePlayer.y = landing.y;
      sidePlayer.vy = 0;
      sidePlayer.onGround = true; sidePlayer.airJumped = false;
    } else {
      sidePlayer.y = nextFeet;
      sidePlayer.onGround = false;
    }

    if (sidePlayer.y > canvas.height + 80) {
      sidePlayer.x = Math.max(40, sidePlayer.x - 100);
      sidePlayer.y = SIDE_GROUND_Y;
      sidePlayer.vx = 0;
      sidePlayer.vy = 0;
      sidePlayer.onGround = true;
      notice = 'You find your footing again.';
      noticeUntil = time + 2;
    }

    stats.playTime += dt;
    const moved = Math.abs(sidePlayer.vx) * dt;
    stepDistance += moved;
    while (stepDistance >= 20) { stats.steps++; stepDistance -= 20; }

    if (platformScene === 'pass' && !story.nickAmbushed && !bossFight && !dialogue && stats.health > 0 && sidePlayer.x >= NICK_TRAP &&
        sidePlayer.x < NICK_TRAP + 195 && sidePlayer.onGround) { startNickAmbush(); return; }
    if (moonThreshold()) { startMoonVisit(); return; }
    if (outdoorScene()) { updateForestCombat(time < witchUntil ? dt * 0.3 : dt); updateStory(dt); }
    updateTideWorld(dt);
    updateSideCamera(dt);
  }

  function drawSidePlatform(platform) {
    ctx.fillStyle = '#49342f';
    ctx.fillRect(platform.x, platform.y, platform.w, platform.h);
    ctx.fillStyle = '#6e8b48';
    ctx.fillRect(platform.x, platform.y, platform.w, 4);
    ctx.fillStyle = '#9cac5c';
    for (let x = platform.x + 5; x < platform.x + platform.w - 3; x += 19) {
      ctx.fillRect(x, platform.y + 1, 5, 1);
    }
    ctx.fillStyle = '#76513b';
    for (let x = platform.x + 8; x < platform.x + platform.w - 4; x += 28) {
      ctx.fillRect(x, platform.y + 10, 4, 2);
      ctx.fillStyle = '#5a4035';
      ctx.fillRect(x + 10, platform.y + 20, 3, 1);
      ctx.fillStyle = '#76513b';
    }
  }

  // A non-weapon armor overlay that follows the player's existing side-view frames.
  // The same pixels are enlarged for the inventory character preview.
  function drawKnightArmorOverlay(px, py, scale = 1) {
    const pixel = (x, y, w, h, color) => {
      ctx.fillStyle = color;
      ctx.fillRect(
        Math.round(px + x * scale),
        Math.round(py + y * scale),
        Math.max(1, Math.round(w * scale)),
        Math.max(1, Math.round(h * scale))
      );
    };
    const [outline, steel, light, shade, gold] = TIDE_DYES[tide.dye] || TIDE_DYES.iron;
    pixel(9, 2, 14, 3, outline);
    pixel(7, 5, 18, 9, outline);
    pixel(9, 6, 14, 6, steel);
    pixel(10, 6, 7, 2, light);
    pixel(8, 10, 16, 3, shade);
    pixel(11, 10, 10, 1, outline);
    pixel(13, 13, 5, 1, gold);
    pixel(5, 14, 7, 6, outline);
    pixel(20, 14, 7, 6, outline);
    pixel(6, 15, 5, 4, steel);
    pixel(21, 15, 5, 4, steel);
    pixel(8, 14, 16, 11, outline);
    pixel(10, 15, 12, 8, steel);
    pixel(11, 16, 5, 2, light);
    pixel(17, 16, 4, 6, shade);
    pixel(15, 18, 2, 3, gold);
    pixel(6, 20, 5, 5, shade);
    pixel(21, 20, 5, 5, shade);
    pixel(7, 21, 3, 3, light);
    pixel(22, 21, 3, 3, light);
    pixel(9, 24, 14, 3, outline);
    pixel(10, 24, 12, 2, shade);
    pixel(11, 25, 3, 1, gold);
    pixel(10, 27, 5, 4, outline);
    pixel(17, 27, 5, 4, outline);
    pixel(11, 28, 3, 2, steel);
    pixel(18, 28, 3, 2, steel);
  }

  const bossWaves = [];
  const SKARN_HEW = 0.21, SKARN_SLAM = 0.76;
  function skarnAttackFrame(p) {
    // The second upswing holds for a beat; the axe hits on source frames 5 and 11.
    const marks = [[0,0], [SKARN_HEW,4], [.49,9], [.64,9], [SKARN_SLAM,10], [1,16]];
    for (let i = 1; i < marks.length; i++) {
      const [end, b] = marks[i], [start, a] = marks[i - 1];
      if (p < end) return Math.floor(a + (b - a) * (p - start) / (end - start));
    }
    return 15;
  }
  function updateSkarnSwing(m, playerAlive, distance, dx, enraged) {
    const p = 1 - m.attackTime / m.atkLen;
    if (enraged && p >= .49 && !m.chargeCue) { m.chargeCue = true; sfx('charge', .78, .66); }
    for (const [mark, flag, slam] of [[SKARN_HEW, 'hewDone', false], [SKARN_SLAM, 'waveDone', true]]) {
      if (p < mark || m[flag]) continue;
      m[flag] = true;
      const x = m.x + m.dir * (slam ? 55 : 28);
      if (slam && enraged) {
        screenShake = Math.max(screenShake, 8);
        padRumble(0.95, 0.9, 260);
        sfx('slam', 1, 0.65);
        spawnDust(x, SIDE_GROUND_Y, 18);
        for (const [site, dir, life] of [[x, m.dir, 2.35], [m.x - m.dir * 20, -m.dir, 1.95]]) {
          bossWaves.push({ x: site, dir, life, hit: false, kind: 'mire', age: 0, enraged });
        }
      } else {
        sfx('swingBig', 0.72, slam ? 0.68 : 0.88);
        if (slam) spawnDust(x, SIDE_GROUND_Y, 8);
      }
      if (distance < m.T.reach + 4 && (Math.sign(dx) === m.dir || distance < 12) &&
          playerBodyOverlaps(m.y - m.T.bodyH - 6, m.y + 4) && playerAlive && canHitPlayer()) {
        hurtByBoss(m.T.dmg, m.dir, 'Skarn', enraged);
      }
    }
  }
  function playerBodyOverlaps(top, bottom) { return sidePlayer.y - 40 < bottom && sidePlayer.y > top; }
  function updateForestCombat(dt) {
    if (bossFight && bossFight.phaseTwo) return;
    const playerAlive = sidePlayer.deadTime <= 0;
    for (const m of sideMobs) {
      const T = m.T;
      m.flash = Math.max(0, (m.flash || 0) - dt);
      m.blockTime = Math.max(0, m.blockTime - dt);
      m.bob += dt;
      if (m.kvx) {
        m.x += m.kvx * dt;
        m.kvx *= Math.max(0, 1 - dt * 9);
        if (Math.abs(m.kvx) < 4) m.kvx = 0;
      }
      m.x = clamp(m.x, 30, platformScene === 'forest' ? 3540 : region().arena && !T.boss && !m.summoned ? BOSS_ARENA.left - 40 : sideWorldWidth() - 30);
      if (!T.boss && m.summoned) m.x = clamp(m.x, BOSS_ARENA.left + 20, BOSS_ARENA.right - 20);
      if (T.boss && bossFight && bossFight.active) m.x = clamp(m.x, BOSS_ARENA.left + 30, BOSS_ARENA.right - 30);
      if (m.dead) {
        m.deadTime += dt; m.respawn -= dt;
        if (T.fly && !T.anims.death) m.y = Math.min(SIDE_GROUND_Y, m.y + dt * (40 + m.deadTime * 300));
        if (m.respawn <= 0 && Math.abs(sidePlayer.x - m.home) > 240) {
          Object.assign(m, makeMob(m.type, m.home, (m.max - m.min) / 2, 1), { patrolDir: m.patrolDir, elite: null });
          rollElite(m);
        }
        continue;
      }
      if (m.dormant) {
        m.walk += dt * 6;
        // Lamplighters lie as a guttering lamp until you come close, then rise.
        if (T.riser && !m.rising && Math.abs(sidePlayer.x - m.x) < 130 && playerAlive) { m.rising = 0.001; sfx('ghost', 0.6, 0.8); }
        if (m.rising) { m.rising += dt; if (m.rising > 11 / 12) { m.rising = 0; m.dormant = false; m.attackCooldown = 0.6; } }
        continue;
      }
      const enraged = T.boss && !!m.enraged;
      if (T.ai) { updateBossAI(m, dt, enraged, playerAlive); continue; }
      const swingWasActive = m.attackTime > 0;
      m.attackCooldown = Math.max(0, m.attackCooldown - dt);
      m.attackTime = Math.max(0, m.attackTime - dt);
      m.hurtTime = Math.max(0, m.hurtTime - dt);
      let dx = sidePlayer.x - m.x;
      let distance = Math.abs(dx);
      const speedMul = (enraged ? 1.45 : 1) * (m.elite && m.elite.spd || 1);
      m.moving = false;
      if (swingWasActive && !m.attackTime && m.type === 'goblin') m.retreatTime = .28;
      if (m.hurtTime > 0 || m.kvx || m.blockTime > 0) {
        // Staggered.
      } else if (m.attackTime > 0) {
        if (T.fly && (m.type === 'eye' || T.dive)) m.x += m.dir * 60 * dt;   // the eye lunges through its bite
        if (T.pounce) { const p = 1 - m.attackTime / m.atkLen; if (p > 0.2 && p < 0.7) m.x += m.dir * T.pounce * dt; }
        if (m.type === 'goblin') {
          const p = 1 - m.attackTime / m.atkLen;
          if (p > .48 && p < T.hit[0]) m.x += m.dir * 35 * dt;
        }
      } else if (m.retreatTime > 0 && playerAlive && distance < T.reach + 16 && !safeZone()) {
        m.retreatTime = Math.max(0, m.retreatTime - dt);
        m.x -= m.dir * 67 * dt; m.walk -= 11 * dt; m.moving = true;
      } else if (playerAlive && !safeZone() && distance < T.chase && Math.abs(sidePlayer.y - SIDE_GROUND_Y) < 120) {
        m.retreatTime = 0;
        m.dir = dx < 0 ? -1 : 1;
        m.runUntil = Math.max(m.runUntil, time + 0.25);
        if (distance > T.reach - 8) {
          const speed = T.speed * speedMul;
          m.x += m.dir * speed * dt;
          m.walk += speed * dt / 6;
          m.moving = true;
        } else if (m.attackCooldown <= 0) {
          m.attackTime = T.atkTime / (m.type === 'skarn' && enraged ? 1 : speedMul); m.atkLen = m.attackTime;
          m.attackHit = false; m.waveDone = false; m.hewDone = false; m.chargeCue = false;
          m.attackCooldown = (T.cd[0] + Math.random() * (T.cd[1] - T.cd[0])) / speedMul * (m.elite && m.elite.cd || 1);
          if (T.boss) m.attackCooldown = Math.max(m.attackCooldown, m.atkLen + (enraged ? 0.62 : 0.82));
          if (Math.random() < 0.6) mobVoice(m, 'attack');
        }
      } else {
        const speed = (time < m.runUntil ? T.speed : T.speed * 0.3);
        m.dir = m.patrolDir;
        m.x += m.patrolDir * speed * dt;
        m.walk += speed * dt / 6;
        m.moving = true;
        if (m.x < m.min) { m.x = m.min; m.patrolDir = 1; m.dir = 1; }
        if (m.x > m.max) { m.x = m.max; m.patrolDir = -1; m.dir = -1; }
      }
      // Height: walkers stand on the ground, fliers hover and dive while biting.
      if (T.fly) {
        let hover = SIDE_GROUND_Y - T.fly + Math.sin(m.bob * 3) * 4;
        if (m.attackTime > 0 && (m.type === 'eye' || T.dive)) {
          const p = 1 - m.attackTime / m.atkLen;
          hover += Math.sin(Math.min(1, p) * Math.PI) * (T.fly - 18);
        }
        m.y += (hover - m.y) * Math.min(1, dt * 10);
      } else {
        // Ground walkers; a rising slash can pop them into the air.
        if (m.liftV || m.lift > 0) {
          m.liftV += 900 * dt;
          m.lift = Math.max(0, (m.lift || 0) - m.liftV * dt);
          m.hurtTime = Math.max(m.hurtTime, 0.08);
          if (m.lift <= 0) { if (m.liftV > 150) { spawnDust(m.x, SIDE_GROUND_Y, 5); sfx('land', 0.5); } m.lift = 0; m.liftV = 0; }
        }
        m.y = SIDE_GROUND_Y - (m.lift || 0);
        if (T.pounce && m.attackTime > 0) { const p = 1 - m.attackTime / m.atkLen; m.y -= Math.max(0, Math.sin(Math.min(1, Math.max(0, (p - 0.15) / 0.6)) * Math.PI)) * 22; }
      }
      dx = sidePlayer.x - m.x; distance = Math.abs(dx);
      // Damage window, measured as a share of the swing so animation and hit agree.
      if (m.attackTime > 0 && m.type === 'skarn') {
        updateSkarnSwing(m, playerAlive, distance, dx, enraged);
      } else if (m.attackTime > 0 && !m.attackHit) {
        const p = 1 - m.attackTime / m.atkLen;
        if (p >= T.hit[0] && p <= T.hit[1]) {
          if (T.boss && !m.waveDone) {
            m.waveDone = true;
            screenShake = Math.max(screenShake, 5); padRumble(0.9, 0.9, 220); sfx('slam', 1, 0.75);
            spawnDust(m.x + m.dir * 60, SIDE_GROUND_Y, 10);
            if (!T.volley || (m.type === 'tidemaw' && enraged)) {
              bossWaves.push({ x: m.x + m.dir * 45, dir: m.dir, life: enraged ? 2.3 : 1.9, hit: false, enraged });
              if (enraged && !T.volley) bossWaves.push({ x: m.x - m.dir * 30, dir: -m.dir, life: 1.6, hit: false, enraged });
            }
            if (T.volley) {
              const n = T.volley + (enraged ? 1 : 0), sx = m.x + m.dir * 24, sy = m.y - T.bodyH * 0.6;
              const base = Math.atan2(sidePlayer.y - 22 - sy, sidePlayer.x - sx);
              for (let k = 0; k < n; k++) { const a = base + (k - (n - 1) / 2) * 0.2; mobShots.push({ x: sx, y: sy, vx: Math.cos(a) * 125, vy: Math.sin(a) * 125, life: 3, dmg: Math.max(2, T.dmg - 3), who: T.short, kind: T.shot || 'fire', boss: true, enraged }); }
              sfx(T.shot === 'moon' ? 'magic' : 'fire', 0.8);
            }
          }
          const facing = Math.sign(dx) === m.dir || distance < 12;
          if (T.sheetCast) {
            // The projectile is already drawn in the supplied blast sheet.
            // Follow the source frames instead of drawing a second projectile.
            const index = clamp(Math.floor(p * T.anims.attack[1]) - 7, 0, 6);
            const front = [48, 110, 132, 130, 135, 132, 120][index] * T.scale;
            const along = dx * m.dir;
            if (along >= front - 42 && along <= front + 8 && playerBodyOverlaps(m.y - 31, m.y - 9) && playerAlive && canHitPlayer()) {
              m.attackHit = true;
              hurtSidePlayer(Math.max(1, T.dmg - Math.floor(totalDefense() / 2)), m.dir, T.name);
              foundryImpact('magic-hit', sidePlayer.x, m.y - 20, m.dir);
            }
          } else if (T.ranged) {
            if (!m.waveDone) {
              m.waveDone = true; m.attackHit = true;
              const sx = m.x + m.dir * 10, sy = m.y - T.bodyH * 0.5;
              const tx = sidePlayer.x, ty = sidePlayer.y - 20, d = Math.max(1, Math.hypot(tx - sx, ty - sy));
              mobShots.push({ x: sx, y: sy, vx: (tx - sx) / d * 120, vy: (ty - sy) / d * 120, life: 2.6, dmg: T.dmg + eliteDmg(m), who: T.shot === 'moon' ? 'Moonfire' : 'A fireball', kind: T.shot || 'fire' });
              sfx(T.shot === 'moon' ? 'magic' : 'skull', 0.7);
            }
          } else if (distance < T.reach + 4 && facing && playerBodyOverlaps(m.y - T.bodyH - 6, m.y + 4) && playerAlive && canHitPlayer()) {
            m.attackHit = true;
            if (T.boss) hurtByBoss(T.dmg, m.dir, T.short, enraged);
            else hurtSidePlayer(Math.max(1, T.dmg + eliteDmg(m) - Math.floor(totalDefense() / 2)), m.dir, m.elite ? 'The ' + m.elite.name.toLowerCase() + ' ' + T.name.toLowerCase() : 'The ' + T.name.toLowerCase());
          }
        } else if (p > T.hit[1]) m.attackHit = true;
      }
      // Ground walkers block the knight's path; fliers and ghosts drift through.
      if (!T.fly) {
        const gap = sidePlayer.x - m.x, half = T.width / 2 + 9;
        if (Math.abs(gap) < half && Math.abs(sidePlayer.y - SIDE_GROUND_Y) < 8 && !sidePlayer.atk && !sidePlayer.roll && !(m.lift > 0)) {
          sidePlayer.x = m.x + (gap < 0 ? -half : half);
          sidePlayer.vx = 0;
        }
      }
    }
    for (let i = sideMobs.length - 1; i >= 0; i--) if (sideMobs[i].summoned && sideMobs[i].dead && sideMobs[i].deadTime > 1.5) sideMobs.splice(i, 1);
    for (let i = bossWaves.length - 1; i >= 0; i--) {
      const w = bossWaves[i];
      const mire = w.kind === 'mire';
      w.x += w.dir * (mire ? 192 : 175) * dt; w.life -= dt;
      if (mire) w.age += dt;
      else if (Math.random() < 0.5) spawnDust(w.x, SIDE_GROUND_Y, 1);
      if (!w.hit && Math.abs(w.x - sidePlayer.x) < (mire ? 17 : 12) && sidePlayer.y > SIDE_GROUND_Y - (mire ? 20 : 12) && playerAlive && canHitPlayer()) {
        w.hit = true; hurtByBoss(mire ? 6 : 5, w.dir, mire ? 'Mirebreaker' : 'The shockwave', w.enraged, true);
      }
      if (w.life <= 0 || w.x < BOSS_ARENA.left || w.x > BOSS_ARENA.right) bossWaves.splice(i, 1);
    }
    updateHazards(dt, playerAlive);
  }

  // ---------------------------------------------------------------------------
  // Hazards shared by Chapter 2-3 enemies: fireballs and burning ground.
  // ---------------------------------------------------------------------------
  const mobShots = [], groundFires = [];
  const fireballImg = loadImg('beasts/fireball.png');
  function updateHazards(dt, playerAlive) {
    const pf = sidePlayer.facing;
    for (let i = mobShots.length - 1; i >= 0; i--) {
      const s = mobShots[i];
      s.life -= dt; s.x += s.vx * dt; s.y += s.vy * dt;
      if (Math.random() < dt * 30) combatFx.push({ kind: 'spark', x: s.x, y: s.y, vx: -s.vx * 0.1 + (Math.random() - 0.5) * 20, vy: -20, color: Math.random() < 0.5 ? '#ffb347' : '#ff6a2a', life: 0.25, max: 0.25 });
      // A sword swing knocks fireballs out of the air.
      const ahead = (s.x - sidePlayer.x) * pf;
      if (sidePlayer.atk && sidePlayer.attackTime > 0 && ahead > -6 && ahead < 52 && Math.abs(s.y - (sidePlayer.y - 24)) < 34) {
        foundryImpact(s.kind === 'moon' ? 'magic-hit' : 'fireball-impact', s.x, s.y, pf);
        spawnSparks(s.x, s.y, pf, 5, ['#ffd27a', '#ff8a3a', '#ffffff']); sfx('clash', 0.6, 1.3); mobShots.splice(i, 1); continue;
      }
      if (playerAlive && Math.abs(s.x - sidePlayer.x) < 10 && s.y > sidePlayer.y - 42 && s.y < sidePlayer.y + 2 && canHitPlayer()) {
        const dir = Math.sign(s.vx) || 1;
        if (s.boss) hurtByBoss(s.dmg, dir, s.who, s.enraged, true);
        else hurtSidePlayer(Math.max(1, s.dmg - Math.floor(totalDefense() / 2)), dir, s.who);
        foundryImpact(s.kind === 'moon' ? 'magic-hit' : 'fireball-impact', s.x, s.y, dir);
        spawnSparks(s.x, s.y, dir, 5, ['#ffd27a', '#ff8a3a']);
        mobShots.splice(i, 1); continue;
      }
      if (s.life <= 0 || s.y > SIDE_GROUND_Y + 4) {
        if (s.y > SIDE_GROUND_Y) {
          foundryImpact(s.kind === 'moon' ? 'magic-hit' : 'fireball-impact', s.x, SIDE_GROUND_Y - 2, Math.sign(s.vx) || 1);
          spawnSparks(s.x, SIDE_GROUND_Y - 2, 1, 4, ['#ffb347', '#ff6a2a']);
        }
        mobShots.splice(i, 1);
      }
    }
    for (let i = groundFires.length - 1; i >= 0; i--) {
      const f = groundFires[i];
      f.life -= dt;
      if (playerAlive && sidePlayer.onGround && Math.abs(f.x - sidePlayer.x) < 8 && f.life > 0.3 && canHitPlayer()) {
        hurtByBoss(4, sidePlayer.x < f.x ? -1 : 1, 'Pale fire', f.enraged, true);
      }
      if (f.life <= 0) groundFires.splice(i, 1);
    }
  }
  function drawHazards() {
    groundFires.forEach(f => {
      const a = Math.min(1, f.life / 0.6), gy = SIDE_GROUND_Y + 1, fx = Math.round(f.x);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(fx, gy - 4, 1, fx, gy - 4, 14);
      g.addColorStop(0, 'rgba(80,170,255,' + 0.35 * a + ')'); g.addColorStop(1, 'rgba(80,170,255,0)');
      ctx.fillStyle = g; ctx.fillRect(fx - 14, gy - 18, 28, 20);
      [[-3, 0.8, 0], [0, 1.25, 1.7], [3, 0.9, 3.1]].forEach(([ox, k, ph]) => {
        const h = (8 + Math.sin(time * 17 + f.x * 0.3 + ph) * 3) * k * a, sway = Math.sin(time * 11 + ph + f.x) * 1.5;
        ctx.fillStyle = 'rgba(60,140,255,' + 0.7 * a + ')';
        ctx.beginPath(); ctx.moveTo(fx + ox - 3, gy); ctx.quadraticCurveTo(fx + ox - 3, gy - h * 0.5, fx + ox + sway, gy - h); ctx.quadraticCurveTo(fx + ox + 3, gy - h * 0.5, fx + ox + 3, gy); ctx.fill();
        ctx.fillStyle = 'rgba(210,240,255,' + 0.8 * a + ')';
        ctx.beginPath(); ctx.moveTo(fx + ox - 1.5, gy); ctx.quadraticCurveTo(fx + ox - 1, gy - h * 0.35, fx + ox + sway * 0.5, gy - h * 0.6); ctx.quadraticCurveTo(fx + ox + 1, gy - h * 0.35, fx + ox + 1.5, gy); ctx.fill();
      });
      ctx.restore();
    });
    mobShots.forEach(s => {
      ctx.save();
      ctx.translate(Math.round(s.x), Math.round(s.y));
      ctx.rotate(Math.atan2(s.vy, s.vx) + Math.PI);
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(0, 0, 1, 0, 0, 14);
      g.addColorStop(0, s.kind === 'moon' ? 'rgba(150,210,255,.6)' : 'rgba(255,150,60,.6)'); g.addColorStop(1, 'rgba(255,80,20,0)');
      ctx.fillStyle = g; ctx.fillRect(-14, -14, 28, 28);
      ctx.globalCompositeOperation = 'source-over';
      if (imgReady(fireballImg)) ctx.drawImage(fireballImg, (Math.floor(time * 14) % 3) * 19, 0, 19, 16, -6, -8, 19, 16);
      else { ctx.fillStyle = '#ffb347'; ctx.fillRect(-3, -3, 6, 6); }
      ctx.restore();
    });
  }

  // ---------------------------------------------------------------------------
  // Boss behaviours for Ashmane (charging mare) and Vael (flying demon).
  // ---------------------------------------------------------------------------
  function bossTouch(m, rangeX, top, dmg) {
    if (Math.abs(sidePlayer.x - m.x) < rangeX && sidePlayer.y > top && canHitPlayer()) {
      hurtByBoss(dmg, m.dir, m.T.short, m.enraged);
      return true;
    }
    return false;
  }
  function updateBossAI(m, dt, enraged, playerAlive) {
    const T = m.T;
    m.st = m.st || 'stalk'; m.stT = (m.stT || 0) + dt;
    m.attackTime = 0; m.moving = false;
    const dx = sidePlayer.x - m.x, face = dx < 0 ? -1 : 1;
    const L = BOSS_ARENA.left + 46, R = BOSS_ARENA.right - 46;
    const go = (st) => { m.st = st; m.stT = 0; };
    if (T.ai === 'nick') {
      updateNickBoss(m, dt, enraged, playerAlive, dx, face, L, R, go);
    } else if (T.ai === 'mare') {
      m.y = SIDE_GROUND_Y;
      if (m.st === 'stalk') {
        m.dir = face;
        if (Math.abs(dx) > 110) { m.x += face * T.speed * dt; m.moving = true; m.walk += dt * 9; }
        if (playerAlive && Math.abs(dx) < 64 && m.stT > 0.5 && Math.random() < dt * 2) go('stomp');
        else if (m.stT > (enraged ? 0.75 : 1.25)) {
          // Too close to a wall to build speed: gallop away to the far side first.
          const room = face > 0 ? R - m.x : m.x - L;
          if (room < 150 || Math.abs(dx) < 70) { m.retreatX = face > 0 ? L + 10 : R - 10; if (Math.abs(m.retreatX - m.x) < 150) m.retreatX = m.x < (L + R) / 2 ? R - 10 : L + 10; go('retreat'); }
          else go('windup');
        }
      } else if (m.st === 'retreat') {
        const d = m.retreatX - m.x; m.dir = d < 0 ? -1 : 1;
        m.x += m.dir * Math.min(Math.abs(d), T.speed * 2.6 * dt); m.moving = true; m.walk += dt * 13;
        if (Math.random() < dt * 14) spawnDust(m.x - m.dir * 26, SIDE_GROUND_Y, 1);
        if (Math.abs(d) < 3 || m.stT > 2.2) go('windup');
      } else if (m.st === 'windup') {
        if (m.stT < dt * 1.5) { sfx('mare'); m.dir = face; }
        if (Math.random() < dt * 20) spawnDust(m.x - m.dir * 26, SIDE_GROUND_Y, 1);
        m.tele = true;
        if (m.stT > (enraged ? 0.58 : 0.76)) { m.tele = false; m.chargeDir = m.dir; m.trailX = m.x; go('charge'); screenShake = Math.max(screenShake, 2); }
      } else if (m.st === 'charge') {
        const sp = enraged ? 410 : 340;
        m.dir = m.chargeDir; m.x += m.dir * sp * dt; m.moving = true; m.walk += dt * 15;
        if (Math.abs(m.x - m.trailX) > 22) { m.trailX = m.x; groundFires.push({ x: m.x - m.dir * 20, life: enraged ? 2.1 : 1.6, enraged }); }
        if (Math.random() < dt * 30) spawnDust(m.x - m.dir * 30, SIDE_GROUND_Y, 1);
        if (playerAlive && bossTouch(m, 34, SIDE_GROUND_Y - 44, T.dmg)) padRumble(1, 1, 220);
        if ((m.dir > 0 && m.x >= R) || (m.dir < 0 && m.x <= L)) { m.x = clamp(m.x, L, R); screenShake = Math.max(screenShake, 4); sfx('slam', 0.8, 0.9); spawnDust(m.x + m.dir * 30, SIDE_GROUND_Y, 8); go('stun'); }
      } else if (m.st === 'stun') {
        if (m.stT > (enraged ? 1.02 : 1.35)) go(enraged && !m.second && Math.random() < 0.45 ? (m.second = true, 'windup') : (m.second = false, 'stalk'));
      } else if (m.st === 'stomp') {
        m.tele = m.stT < 0.45;
        if (m.stT > 0.45 && !m.stomped) {
          m.stomped = true; screenShake = Math.max(screenShake, 5); sfx('slam', 1, 0.8); padRumble(0.9, 0.9, 200);
          bossWaves.push({ x: m.x + 30, dir: 1, life: 1.6, hit: false, enraged }, { x: m.x - 30, dir: -1, life: 1.6, hit: false, enraged });
          spawnDust(m.x, SIDE_GROUND_Y, 10);
        }
        if (m.stT > 0.95) { m.stomped = false; m.tele = false; go('stalk'); }
      }
      m.x = clamp(m.x, L, R);
    } else if (T.ai === 'demon') {
      m.dir = face;
      const hoverY = SIDE_GROUND_Y - 74 + Math.sin(time * 2.2) * 5;
      const lowY = SIDE_GROUND_Y - 22;
      m.walk += dt * 10;
      if (m.st === 'stalk') {
        const tx = clamp(sidePlayer.x - face * 110, L, R);
        m.x += (tx - m.x) * Math.min(1, dt * 1.6);
        m.y += (hoverY - m.y) * Math.min(1, dt * 3);
        if (m.stT > (enraged ? 1.0 : 1.6)) {
          const r = Math.random();
          go(r < 0.4 ? 'descend' : r < 0.75 ? 'orbs' : 'swoop');
          m.target = { x: clamp(sidePlayer.x - face * 96, L, R) };
        }
      } else if (m.st === 'descend') {
        m.x += (m.target.x - m.x) * Math.min(1, dt * 4);
        m.y += (lowY - m.y) * Math.min(1, dt * 4);
        if (m.stT > 0.7) { m.dir = face; m.breathDir = face; go('breath'); m.atkLen = T.atkTime; sfx('demon'); }
      } else if (m.st === 'breath') {
        m.dir = m.breathDir; m.y = lowY;
        m.attackTime = Math.max(0.0001, T.atkTime - m.stT); m.atkLen = T.atkTime;
        const p = m.stT / T.atkTime;
        if (p >= T.hit[0] && p <= T.hit[1]) {
          const x0 = m.x + m.dir * 20, x1 = m.x + m.dir * 175;
          const lo = Math.min(x0, x1), hi = Math.max(x0, x1);
          for (let k = 0; k < 3; k++) { const fx = x0 + (x1 - x0) * Math.random(); combatFx.push({ kind: 'spark', x: fx, y: SIDE_GROUND_Y - 4 - Math.random() * 30, vx: m.dir * 60, vy: -40 - Math.random() * 40, color: ['#8fd8ff', '#ffffff', '#5fa8ff'][k], life: 0.4, max: 0.4 }); }
          if (playerAlive && sidePlayer.x > lo && sidePlayer.x < hi && sidePlayer.y > SIDE_GROUND_Y - 46 && !m.breathHit && canHitPlayer()) {
            m.breathHit = true; hurtByBoss(T.dmg, m.dir, 'Moonfire', enraged);
          }
          if (Math.random() < dt * 8) screenShake = Math.max(screenShake, 1.5);
        }
        if (m.stT >= T.atkTime) { m.breathHit = false; m.attackTime = 0; go('recover'); }
      } else if (m.st === 'recover') {
        m.y = lowY;
        if (m.stT > (enraged ? 0.76 : 1.15)) go('stalk');
      } else if (m.st === 'orbs') {
        m.y += (SIDE_GROUND_Y - 100 - m.y) * Math.min(1, dt * 3);
        m.tele = m.stT < 0.5;
        if (m.stT > 0.5 && !m.fired) {
          m.fired = true; sfx('skull', 1, 0.7);
          const n = enraged ? 5 : 3;
          for (let k = 0; k < n; k++) {
            const sx = m.x + m.dir * 16, sy = m.y - 50;
            const tx = sidePlayer.x + (k - (n - 1) / 2) * 34, ty = SIDE_GROUND_Y - 14, d = Math.max(1, Math.hypot(tx - sx, ty - sy));
            mobShots.push({ x: sx, y: sy, vx: (tx - sx) / d * 135, vy: (ty - sy) / d * 135, life: 3, dmg: 6, who: 'Moonfire', kind: 'moon', boss: true, enraged });
          }
        }
        if (m.stT > 1.2) { m.fired = false; m.tele = false; go('stalk'); }
      } else if (m.st === 'swoop') {
        if (!m.swoop) m.swoop = { x0: m.x, y0: m.y, tx: sidePlayer.x, t: 0 };
        const s = m.swoop; s.t += dt;
        m.tele = s.t < 0.35;
        if (s.t > 0.35) {
          const k = Math.min(1, (s.t - 0.35) / 0.7);
          m.x = s.x0 + (s.tx + face * 60 - s.x0) * k;
          m.y = s.y0 + Math.sin(k * Math.PI) * (lowY - s.y0 + 4);
          if (k > 0.3 && k < 0.75 && !s.hit && playerAlive && Math.abs(sidePlayer.x - m.x) < 40 && bossTouch(m, 40, m.y - 80, T.dmg)) s.hit = true;
          if (k >= 1) { m.swoop = null; m.tele = false; go('stalk'); }
        }
      }
      m.x = clamp(m.x, L, R);
    }
  }

  // Generic monster renderer: picks the animation from state, anchors feet,
  // flips to face the target, and flashes white on hit.
  const mobFlashCanvas = document.createElement('canvas');
  const mobFlashCtx = mobFlashCanvas.getContext('2d');
  function mobFrame(m) {
    const T = m.T, A = T.anims;
    if (m.dead) {
      if (A.death) { const n = A.death[1], f = Math.min(n - 1, Math.floor(m.deadTime * (A.death[2] || 9))); return [A.death, A.death[3] === 'rev' ? n - 1 - f : f]; }
      return [A.idle, 0];
    }
    const reveal = phasePose(m);
    if (reveal !== null && (A.attack || A.idle)) {
      const strip = A.attack || A.idle;
      const p = prefersReducedMotion() ? .55 : smooth01(reveal);
      return [strip, Math.min(strip[1] - 1, Math.floor(p * strip[1]))];
    }
    if (A.rise && m.dormant) return [A.rise, m.rising ? Math.min(A.rise[1] - 1, Math.floor(m.rising * A.rise[2])) : 0];
    if (T.ai === 'nick' && m.st === 'ray') return [NICK_RAY, nickRayFrame(m.stT, nickFireAt(m.enraged))];
    if (T.ai === 'mare') {
      if (m.st === 'charge' || m.st === 'stalk' && m.moving) return [A.move, Math.floor(m.walk) % A.move[1]];
      return [A.idle, Math.floor(time * (m.st === 'windup' || m.st === 'stomp' ? 14 : m.st === 'stun' ? 4 : 7)) % A.idle[1]];
    }
    if (T.ai === 'demon' && m.st !== 'breath') return [A.idle, Math.floor(m.walk) % A.idle[1]];
    if (m.blockTime > 0 && A.block) return [A.block, Math.min(A.block[1] - 1, Math.floor((0.4 - m.blockTime) * 10))];
    if (m.hurtTime > 0 && A.hurt) return [A.hurt, Math.min(A.hurt[1] - 1, Math.floor((0.3 - m.hurtTime) / 0.3 * A.hurt[1]))];
    if (m.attackTime > 0) {
      const n = A.attack[1], t = 1 - m.attackTime / m.atkLen;
      const f = m.type === 'skarn' ? skarnAttackFrame(t) : t * n;
      return [A.attack, clamp(Math.floor(f), 0, n - 1)];
    }
    if (m.moving && !m.dormant) { const an = A.move; return [an, ((Math.floor(m.walk * an[2] / 14) % an[1]) + an[1]) % an[1]]; }
    return [A.idle, Math.floor(time * A.idle[2]) % A.idle[1]];
  }
  function drawMob(m) {
    const T = m.T;
    if (T.tideArt) { drawReever(m); return; }
    if (T.art) { drawChampion(m); return; }
    const [anim, frame] = mobFrame(m);
    const img0 = mobSheet(T, anim);
    if (!imgReady(img0)) return;
    const tint = m.enraged ? hexRgb(BOSS_FORMS[m.type][2]) + (m.type === 'skarn' ? ',.15' : ',.32') : T.tint;
    const second = T.second && m.enraged ? tideArt[T.second] : null;
    const img = imgReady(second) ? second : tint ? tintedSheet(img0, tint) : img0;
    let alpha = T.alpha || 1;
    if (m.dead) {
      const fadeStart = T.boss ? 1.6 : T.anims.death ? (anim[1] / (T.anims.death[2] || 9) + 0.5) : 0.12;
      alpha *= Math.max(0, 1 - Math.max(0, m.deadTime - fadeStart) / (T.anims.death || T.boss ? 0.6 : 0.4));
      if (T.boss) alpha *= m.deadTime < 1.6 ? (Math.floor(m.deadTime * 14) % 2 ? 0.5 : 1) : 1;
      if (alpha <= 0) return;
    }
    const sc = T.scale * (m.elite ? ELITE_SCALE : 1), w = T.fw * sc, h = T.fh * sc;
    const flip = T.faceLeft ? m.dir > 0 : m.dir < 0;
    const sink = T.boss && m.dead && !T.fly ? Math.min(14, m.deadTime * 6) : 0;
    const squash = m.dead && !T.anims.death && !T.boss ? Math.max(0.2, 1 - m.deadTime * 1.6) : 1;
    ctx.save();
    ctx.globalAlpha *= alpha;
    if (T.boss && bossFight?.phaseTwo && bossFight.t > PHASE_REVEAL) ctx.filter = 'brightness(1.24)';
    ctx.translate(Math.round(m.x), Math.round(m.y + sink));
    if (flip) ctx.scale(-1, 1);
    if (m.type === 'skarn' && m.dead) {
      const collapse = Math.min(1, m.deadTime * 3);
      ctx.rotate(collapse * 1.33);
      ctx.scale(1, 1 - collapse * 0.25);
    }
    if (squash !== 1) ctx.scale(1 + (1 - squash) * 0.4, squash);
    ctx.drawImage(img, frame * T.fw, 0, T.fw, T.fh, -T.ax * sc, -T.ay * sc, w, h);
    if (m.type === 'skarn' && m.enraged && !m.dead) drawSkarnMask(anim[0], frame, T);
    if (m.type === 'skarn' && m.enraged && anim === T.anims.attack && frame === 9) {
      const p = clamp((1 - m.attackTime / m.atkLen - .49) / .27, 0, 1);
      ctx.fillStyle = '#ffdc9b';
      for (let i = 0; i < 9; i++) {
        const a = i * 2.4 + p * 4, r = 8 + (1 - p) * 16;
        ctx.fillRect(Math.round(-25 + Math.cos(a) * r), Math.round(-75 + Math.sin(a) * r * .65), i % 3 ? 2 : 3, 2);
      }
    }
    if (m.flash > 0 || (m.tele && Math.floor(time * 14) % 2)) {
      mobFlashCanvas.width = T.fw; mobFlashCanvas.height = T.fh;
      mobFlashCtx.clearRect(0, 0, T.fw, T.fh);
      mobFlashCtx.drawImage(img, frame * T.fw, 0, T.fw, T.fh, 0, 0, T.fw, T.fh);
      mobFlashCtx.globalCompositeOperation = 'source-in';
      mobFlashCtx.fillStyle = m.flash > 0 ? '#ffffff' : '#ff4a3a'; mobFlashCtx.fillRect(0, 0, T.fw, T.fh);
      mobFlashCtx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha *= m.flash > 0 ? 0.85 : 0.35;
      ctx.drawImage(mobFlashCanvas, -T.ax * sc, -T.ay * sc, w, h);
    }
    ctx.restore();
  }

  // Face anchors in Chierit's uncropped frames. No overlay on away-facing poses.
  const SKARN_EYES = {
    idle: [[132,83],[132,82],[130,83],[129,83],[128,84],[128,83],[130,83],[130,83],[130,83],[130,83],[131,83],[131,83],[132,83],[132,83],[132,83],[132,83]],
    walk: [[127,84],[130,85],[129,84],[130,83],[132,85],[130,84],[129,84],[128,85],[124,83],[126,82],[125,82],[126,82]],
    axe: [[132,83],[148,82],[148,82],[148,82],null,null,null,null,null,null,[134,86],[123,83],[130,82],[130,82],[131,82],[132,83]]
  };
  function drawSkarnMask(anim, frame, T) {
    const eye = SKARN_EYES[anim]?.[frame];
    if (!eye) return;
    const x = (eye[0] - 8 - T.ax) * T.scale, y = (eye[1] - 22 - T.ay) * T.scale;
    const p = (c, dx, dy, w, h) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x) + dx, Math.round(y) + dy, w, h); };
    p('#271b24', -15, -12, 17, 19); p('#291d26', -12, -8, 19, 20);
    p('#a67f60', -13, -9, 14, 17); p('#d4b791', -10, -7, 13, 15); p('#f8e5bd', -9, -7, 10, 3);
    p('#bba080', -9, -15, 4, 7); p('#e9d3ad', -12, -18, 3, 7); p('#dcc39f', 0, -12, 3, 5);
    p('#26191d', -2, -2, 6, 4); p('#ff9f61', 0, -1, 2, 2); p('#80514b', -2, 5, 5, 4);
    p('#f3dfb9', -7, 7, 3, 4); p('#ecd4a9', 2, 7, 2, 3);
  }

  function drawMireWave(w) {
    const tick = Math.floor(w.age * 23), a = clamp(w.life * 5, 0, 1);
    ctx.save();
    ctx.translate(Math.round(w.x), SIDE_GROUND_Y);
    ctx.scale(w.dir, 1);
    const pixel = (color, x, y, width, height, opacity = 1) => {
      ctx.globalAlpha = a * opacity; ctx.fillStyle = color; ctx.fillRect(x, y, width, height);
    };
    for (let i = 0; i < 8; i++) {
      const x = 12 - i * 5, h = Math.max(2, 20 - Math.abs(i - 2) * 5 + (tick + i * 7) % 4);
      pixel('#241b27', x - 2, -h, 7, h + 2);
      pixel(i % 2 ? '#755139' : '#996d49', x, 1 - h, 4, h - 1);
      pixel('#d7a976', x + 2, 2 - h, 2, Math.max(1, h / 3 | 0));
    }
    for (let i = 0; i < 13; i++) {
      const t = ((w.age * (2.6 + i % 3 * .47) + i * .37) % 1);
      const x = Math.round(7 - t * (24 + i * 3)), y = -Math.round(3 + 4 * t * (1 - t) * (12 + i % 5 * 5));
      const s = 2 + i % 4;
      pixel(i % 2 ? '#80543d' : '#b68555', x, y, s, s - 1, 1 - t * .75);
      pixel('#e0b580', x, y, s - 1, 1, 1 - t * .75);
    }
    ctx.restore();
  }

  // Original sprites for the three champions that used to borrow enemy sheets.
  // Draw on a small backing canvas so outlines stay sharp at the game's pixel scale.
  const championCanvas = document.createElement('canvas');
  championCanvas.width = 64; championCanvas.height = 60;
  const championInk = championCanvas.getContext('2d');
  const CHAMPION_COLORS = {
    mourn: ['#101025', '#27263e', '#3e395a', '#454961', '#6b7a97', '#7d81a3', '#b2bad2', '#d0eeff'],
    tidemaw: ['#0d1a22', '#1e3540', '#2c5357', '#3f6259', '#678e77', '#667462', '#9da585', '#a0f8dc']
  };
  function championSprite(id, stride = 0, wind = 0, strike = false, bob = 0, enrage = false) {
    const g = championInk, c = CHAMPION_COLORS[id];
    g.clearRect(0, 0, 64, 60);
    const box = (i, x, y, w, h) => { g.fillStyle = c[i]; g.fillRect(x, y, w, h); };
    const shape = (i, pts) => {
      g.fillStyle = c[i]; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
      for (let j = 1; j < pts.length; j++) g.lineTo(pts[j][0], pts[j][1]);
      g.closePath(); g.fill();
    };
    // Common coordinate system only: each body, head and carried object is distinct.
    g.save(); g.translate(0, bob);
    if (id === 'mourn') {
      shape(0, [[20,19],[37,18],[47,27],[48,42],[52,59],[42,57],[37,60],[24,56],[15,60],[11,56],[15,40],[13,31]]);
      shape(1, [[19,23],[35,22],[45,27],[45,43],[49,56],[40,54],[37,57],[26,53],[16,57],[15,54]]);
      shape(2, [[21,26],[33,30],[31,54],[25,50],[18,55],[19,44]]);
      shape(3, [[18,22],[23,21],[35,29],[43,24],[45,32],[36,41],[23,36],[16,30]]);
      box(4, 19, 25, 7, 3); box(5, 35, 28, 9, 3); box(6, 29, 33, 6, 2); box(7, 31, 34, 2, 3);
      shape(0, [[18,8],[19,2],[23,7],[34,6],[39,0],[40,18],[34,25],[23,24],[17,19]]);
      shape(4, [[20,9],[23,10],[27,7],[35,9],[38,5],[37,18],[33,22],[23,21],[19,17]]);
      box(6, 21, 11, 15, 2); box(0, 20, 14, 15, 4); box(7, 22, 15, 4, 1); box(7, 28, 15, 4, 1);
      box(3, 23, 19, 10, 2); box(6, 28, 11, 1, 9);
      g.save(); g.translate(strike ? -4 : 0, wind);
      box(0, 7, 10, 4, 48); box(5, 8, 15, 1, 40);
      shape(4, [[8,4],[13,6],[13,12],[9,15],[5,13],[4,8]]);
      box(0, 6, 7, 5, 5); box(7, 7, 8, 3, 3); box(6, 6, 13, 6, 2);
      box(4, 8, 31, 9, 5); box(6, 8, 31, 2, 3); g.restore();
      // Engraved mail, ragged hem, and a cold light leaking through the visor.
      [[25,36],[30,38],[35,39],[27,42],[32,44],[37,45],[24,47]].forEach(([x,y]) => { box(3,x,y,3,1); box(1,x+2,y+1,2,1); });
      shape(3, [[16,33],[21,32],[20,43],[15,47],[11,45]]);
      box(6, 15, 34, 3, 1); box(0, 42, 49, 2, 3); box(0, 30 + stride, 53, 2, 3);
      box(5, 38, 42, 3, 7); box(6, 37, 47, 5, 2);
    } else {
      shape(0, [[11,26],[20,18],[42,17],[47,24],[52,35],[50,48],[54,55],[47,59],[36,56],[28,59],[19,55],[10,59],[5,54],[11,47],[7,39]]);
      shape(2, [[12,28],[25,22],[44,24],[49,36],[47,47],[52,55],[47,56],[37,52],[29,56],[20,52],[12,56],[8,54],[13,44],[10,39]]);
      shape(3, [[16,29],[25,24],[42,29],[45,37],[41,51],[32,50],[26,54],[18,50],[21,40]]);
      box(1, 12, 35, 7, 3); box(4, 42, 29, 3, 12); box(1, 46, 39, 4, 9);
      shape(0, [[16,14],[21,10],[21,5],[29,3],[38,5],[39,11],[44,15],[44,23],[38,30],[23,29],[16,24]]);
      shape(4, [[18,15],[24,10],[24,7],[30,5],[37,7],[37,12],[42,15],[42,22],[37,27],[24,27],[18,23]]);
      box(6, 22, 14, 18, 3); box(0, 18, 20, 23, 4); box(7, 21, 21, 4, 2); box(7, 30, 21, 4, 2);
      box(2, 37, 18, 3, 7); box(4, 46, 39, 2, 10);
      g.save(); g.translate(strike ? -6 : 0, wind);
      box(0, 7, 27, 8, 16); box(3, 8, 28, 5, 13); box(6, 9, 28, 1, 10);
      shape(0, [[4,37],[14,37],[17,41],[17,47],[20,51],[20,54],[1,54],[1,50],[3,46],[3,41]]);
      shape(5, [[6,38],[13,38],[15,42],[15,47],[18,51],[18,52],[3,52],[5,47],[5,41]]);
      box(6, 7, 40, 2, 9); box(4, 15, 48, 2, 2); box(7, 6, 52, 9, 1);
      box(0, 9, 54, 4, 2); g.restore();
      // Encrusted iron and torn sailcloth instead of a second knight silhouette.
      [[19,25],[37,25],[26,33],[33,35],[25,43],[41,42],[30,48]].forEach(([x,y], i) => {
        box(1, x, y, 4, 3); box(i % 2 ? 5 : 4, x, y, 3, 2); box(6, x, y, 1, 1);
      });
      shape(4, [[47,32],[52,37],[50,45],[54,51],[51,53],[47,47]]);
      box(7, 25, 21, 1, 1); box(4, 10 + stride, 50, 2, 2);
    }
    if (enrage) { box(7, 27, id === 'tidemaw' ? 15 : 12, 2, 1); box(7, 33, id === 'tidemaw' ? 17 : 16, 1, 2); }
    g.restore();
    return championCanvas;
  }
  function drawChampion(m) {
    const T = m.T;
    const phase = phasePose(m) ?? (m.attackTime > 0 ? 1 - m.attackTime / m.atkLen : -1);
    const strike = phase >= T.hit[0] && phase <= T.hit[1];
    const wind = phase < 0 ? 0 : strike ? 3 : phase < T.hit[0] ? -6 : -1;
    const stride = m.moving ? Math.round(Math.sin(m.walk * 0.7) * 2) : 0;
    const bob = m.moving ? -Math.abs(stride) : Math.round(Math.sin(time * 3) * 0.6);
    const pic = championSprite(T.art, stride, wind, strike, bob, m.enraged);
    ctx.save(); ctx.imageSmoothingEnabled = false;
    if (m.dead) ctx.globalAlpha *= Math.max(0, 1 - Math.max(0, m.deadTime - 0.3) / 1.6);
    if (m.flash > 0) ctx.filter = 'brightness(1.7)';
    else if (m.enraged) ctx.filter = 'saturate(1.38) contrast(1.13)';
    ctx.translate(Math.round(m.x), Math.round(m.y + (m.dead ? Math.min(18, m.deadTime * 10) : 0)));
    if (m.dir > 0) ctx.scale(-1, 1);
    ctx.drawImage(pic, -Math.round(T.drawH * 0.55), -T.drawH, Math.round(T.drawH * 64 / 60), T.drawH);
    ctx.restore();
  }
  function mobWarning(m) {
    const T = m.T;
    if (m.dead || m.dormant || bossFight?.cine) return null;
    if (m.type === 'skarn' && m.attackTime > 0) {
      const p = 1 - m.attackTime / m.atkLen;
      if (m.enraged && p >= .49 && !m.waveDone && p < SKARN_SLAM) return { progress: (p - .49) / (SKARN_SLAM - .49), both: true };
      if (p < SKARN_HEW) return { progress: p / SKARN_HEW };
      return null;
    }
    if (T.boss && m.tele && ['windup', 'stomp', 'orbs', 'swoop'].includes(m.st)) {
      return { progress: clamp((m.swoop?.t || m.stT) / (m.st === 'windup' ? (m.enraged ? .58 : .76) : .5), 0, 1),
        both: m.st === 'stomp', ranged: m.st === 'orbs' || m.st === 'swoop', charge: m.st === 'windup' };
    }
    if (m.attackTime <= 0 || !m.atkLen || m.attackHit) return null;
    const progress = (1 - m.attackTime / m.atkLen) / T.hit[0];
    return progress >= 0 && progress < 1 ? { progress, ranged: T.ranged || T.volley } : null;
  }
  function drawMobWarning(m, w) {
    const T = m.T, ranged = w.ranged || T.fly && !w.charge, x = Math.round(m.x);
    const y = Math.round(mobTop(m) - (T.boss ? 12 : 10));
    const color = T.boss ? '#ff9a79' : ranged ? '#a9dfff' : '#ffdc95';
    ctx.save();
    ctx.fillStyle = '#201524'; ctx.fillRect(x - 6, y - 7, 12, 8);
    ctx.fillStyle = color; ctx.fillRect(x - 1, y - 6, 2, 3); ctx.fillRect(x - 1, y - 2, 2, 1);
    ctx.fillRect(x - 6, y + 1, Math.max(1, Math.round(12 * w.progress)), 1);
    if (!ranged) {
      const reach = w.charge ? 90 : Math.min(76, T.reach + 4);
      const start = w.both ? -reach : m.dir < 0 ? -reach : 8, end = w.both ? reach : m.dir < 0 ? -8 : reach;
      const base = Math.min(SIDE_GROUND_Y, Math.round(m.y));
      ctx.globalAlpha = .46 + .44 * w.progress;
      for (let dx = start; dx < end; dx += 6) ctx.fillRect(x + dx, base - 2, 3, 1);
      ctx.fillRect(x + (m.dir < 0 ? start : end), base - 5, 1, 4);
      if (w.both) ctx.fillRect(x + (m.dir < 0 ? end : start), base - 5, 1, 4);
    }
    ctx.restore();
  }
  function drawSideMobs() {
    sideMobs.forEach(m => {
      if (m.x < sideCameraX - 170 || m.x > sideCameraX + canvas.width + 170) return;
      if (m.dead && m.deadTime > Math.max(3, (m.T.anims.death?.[1] || 0) / (m.T.anims.death?.[2] || 9) + 1.1)) return;
      // ground shadow
      const dist = SIDE_GROUND_Y - m.y;
      ctx.fillStyle = 'rgba(0,0,0,' + Math.max(0.08, 0.3 - dist / 300) + ')';
      ctx.beginPath(); ctx.ellipse(Math.round(m.x), SIDE_GROUND_Y + 1, m.T.width * (m.T.boss ? 1.1 : 0.8), 3, 0, 0, Math.PI * 2); ctx.fill();
      if (m.T.light && !m.dead) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const ly = m.y - m.T.bodyH * 0.55, fl = 34 + Math.sin(time * 9 + m.x) * 3;
        const g = ctx.createRadialGradient(m.x, ly, 2, m.x, ly, fl);
        g.addColorStop(0, 'rgba(' + m.T.light + ',.32)'); g.addColorStop(1, 'rgba(' + m.T.light + ',0)');
        ctx.fillStyle = g; ctx.fillRect(m.x - fl, ly - fl, fl * 2, fl * 2); ctx.restore();
      }
      drawEliteAura(m);
      drawBossPhaseArt(m);
      drawMob(m);
      const warning = mobWarning(m);
      if (warning) drawMobWarning(m, warning);
      if (!m.dead && !m.T.boss && !m.dormant && (time < m.showHpUntil || m.hp < m.maxHp || m.elite)) {
        const bw = 22, bx = Math.round(m.x - bw / 2), by = Math.round(mobTop(m) - 7);
        ctx.fillStyle = '#120c14'; ctx.fillRect(bx - 1, by - 1, bw + 2, 4);
        ctx.fillStyle = '#4a1820'; ctx.fillRect(bx, by, bw, 2);
        ctx.fillStyle = m.elite ? m.elite.color : '#e04848'; ctx.fillRect(bx, by, Math.round(bw * m.hp / m.maxHp), 2);
      }
      drawEliteTag(m);
    });
    bossWaves.forEach(w => {
      if (w.kind === 'mire') { drawMireWave(w); return; }
      const a = Math.min(1, w.life * 2);
      ctx.fillStyle = 'rgba(255,190,120,' + a * 0.85 + ')';
      ctx.fillRect(Math.round(w.x) - 4, SIDE_GROUND_Y - 9, 8, 9);
      ctx.fillStyle = 'rgba(255,240,200,' + a + ')';
      ctx.fillRect(Math.round(w.x) - 2, SIDE_GROUND_Y - 13, 4, 13);
      ctx.fillStyle = 'rgba(120,70,40,' + a * 0.8 + ')';
      ctx.fillRect(Math.round(w.x) - w.dir * 10, SIDE_GROUND_Y - 4, 6, 4);
    });
    drawHazards();
  }

  // Draws one full 128 x 64 knight cell. The knight's body sits at x ~62 in
  // every cell with feet on the bottom row, so anchoring there keeps the
  // whole sword arc visible and the body steady between animations.
  function drawKnightCell(sheet, frame, cols, x, y, facing, scale = 1) {
    if (!sheet || !sheet.complete || !sheet.naturalWidth) return false;
    const rows = Math.max(1, Math.round(sheet.naturalHeight / 64));
    const col = frame % cols, row = Math.floor(frame / cols) % rows;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (TIDE_DYE_FILTERS[tide.dye]) ctx.filter = (ctx.filter === 'none' ? '' : ctx.filter + ' ') + TIDE_DYE_FILTERS[tide.dye];
    ctx.translate(Math.round(x), Math.round(y));
    ctx.scale(facing < 0 ? -scale : scale, scale);
    ctx.drawImage(sheet, col * 128, row * 64, 128, 64, -62, -64, 128, 64);
    ctx.restore();
    return true;
  }

  function knightPose() {
    const ks = knightSprites;
    if (nickScene?.struck && !nickScene.awake) {
      const age = nickScene.t - NICK_IMPACT;
      return age < .28 ? { sheet: ks.hurt, cols: 2, frame: Math.min(2, Math.floor(age * 12)) }
        : { sheet: ks.death, cols: 2, frame: Math.min(3, Math.floor((age - .28) * 10)) };
    }
    if (sidePlayer.deadTime > 0) {
      return { sheet: ks.death, cols: 2, frame: Math.min(3, Math.floor((sidePlayer.deathAge || 0) * 7)) };
    }
    if (sidePlayer.hurtTime > 0) {
      return { sheet: ks.hurt, cols: 2, frame: Math.min(2, Math.floor((0.36 - sidePlayer.hurtTime) / 0.36 * 3)) };
    }
    if (sidePlayer.roll) {
      // Crouch in, two full tumbles, crouch out.
      const rt = sidePlayer.roll.t;
      if (rt < 0.035 || rt > ROLL_TIME - 0.035) return { sheet: ks.jump, cols: 2, frame: 7 };
      return { sheet: ks.roll, cols: 2, frame: Math.floor((rt - 0.035) / (ROLL_TIME - 0.07) * 8) % 4, spin: true };
    }
    if (sidePlayer.pray) {
      const t = sidePlayer.pray.t, f = t < 0.6 ? Math.floor(t / 0.6 * 6) : t < 1.5 ? 6 + Math.floor(t * 4) % 2 : Math.min(11, 8 + Math.floor((t - 1.5) / 0.6 * 4));
      return { sheet: ks.pray, cols: 4, frame: f };
    }
    if (sidePlayer.drink) return { sheet: ks.health, cols: 2, frame: Math.min(7, Math.floor(sidePlayer.drink.t / 0.55 * 8)) };
    if (sidePlayer.charge) return { sheet: ks.attacks, cols: KNIGHT_MOVES.power.cols, frame: 14 };
    if (sidePlayer.atk) {
      const atk = sidePlayer.atk, move = KNIGHT_MOVES[atk.name];
      if (move.air) {
        // attack_from_air: frames 0-2 dive, 3 impact, 4-6 shockwave and recover.
        if (atk.phase === 'impact') return { sheet: ks.air, cols: 2, frame: Math.min(6, 3 + Math.floor(atk.t * 14)) };
        if (atk.phase === 'hang') return { sheet: ks.air, cols: 2, frame: 0, dy: 15 };
        return { sheet: ks.air, cols: 2, frame: 1 + Math.floor(atk.t * 16) % 2, dy: 15 };
      }
      const idx = Math.min(move.frames.length - 1, Math.floor(atk.t * move.fps));
      return { sheet: ks[move.sheet] || ks.attacks, cols: move.cols, frame: move.frames[idx], dy: move.down ? 15 : 0 };
    }
    if (!sidePlayer.onGround) {
      const vy = sidePlayer.vy;
      const frame = vy < -170 ? 1 : vy < -50 ? 2 : vy < 30 ? 3 : vy < 120 ? 4 : vy < 230 ? 5 : 6;
      return { sheet: ks.jump, cols: 2, frame };
    }
    if (landTime > 0) return { sheet: ks.jump, cols: 2, frame: 7 };
    if (sidePlayer.moving) return { sheet: ks.run, cols: 2, frame: Math.floor(sidePlayer.walk) % 8 };
    return { sheet: ks.idle, cols: 2, frame: Math.floor(time * 7) % 8 };
  }

  function drawSidePlayer() {
    const x = Math.round(sidePlayer.x);
    let y = Math.round(sidePlayer.y);
    // The knight sheets are used whenever they are loaded so attacks always
    // animate; the story requires Dad's armor before the forest anyway.
    const useKnight = (equipment.armor || outdoorScene()) && knightSprites.idle && knightSprites.idle.complete && knightSprites.idle.naturalWidth;
    // Ground shadow shrinks while airborne.
    const air = Math.max(0, SIDE_GROUND_Y - y);
    const groundBelow = sidePlayer.onGround ? y : SIDE_GROUND_Y;
    const shadowW = Math.max(6, 22 - air * 0.12);
    ctx.fillStyle = 'rgba(0,0,0,.28)';
    ctx.fillRect(Math.round(x - shadowW / 2), groundBelow - 1, Math.round(shadowW), 2);
    if (story.kiteFound && outdoorScene()) drawTideKite(x, y);
    if (tideMounted()) {
      const frame = sidePlayer.moving ? Math.floor(time * 12) % 4 : 0;
      if (imgReady(tideArt.mount)) {
        ctx.save(); ctx.translate(x, y); ctx.scale(sidePlayer.facing, 1);
        ctx.drawImage(tideArt.mount, frame * 56, 0, 56, 32, -41, -45, 80, 46);
        ctx.restore(); y -= 14;
      }
    }
    if (useKnight) {
      const r = sidePlayer.roll, c = sidePlayer.charge;
      // Blink while invulnerable after being hit (not during a dodge roll).
      if (!r && sidePlayer.invulnTime > 0 && sidePlayer.deadTime <= 0 && sidePlayer.hurtTime <= 0 && Math.floor(time * 18) % 2 === 0) return;
      const pose = knightPose();
      if (!pose.sheet || !pose.sheet.complete || !pose.sheet.naturalWidth) pose.sheet = knightSprites.idle;
      // Afterimages while rolling.
      if (r && r.trail) r.trail.forEach((g, i) => {
        ctx.save(); ctx.globalAlpha = 0.12 + i * 0.05;
        ctx.filter = 'brightness(1.6) hue-rotate(160deg)';
        drawKnightCell(knightSprites.roll, Math.floor(Math.max(0, g.t - 0.035) / (ROLL_TIME - 0.07) * 8) % 4, 2, g.x, g.y + 1, sidePlayer.facing);
        ctx.restore();
      });
      // Moonblade charge: a pulsing blue aura behind the knight.
      if (c) {
        const k = Math.min(1, c.t / chargeTime()), pul = c.ready ? 0.55 + Math.sin(time * 16) * 0.2 : 0.25 * k;
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(x, y - 22, 2, x, y - 22, 20 + k * 14);
        g.addColorStop(0, 'rgba(140,215,255,' + pul + ')'); g.addColorStop(1, 'rgba(60,120,255,0)');
        ctx.fillStyle = g; ctx.fillRect(x - 40, y - 62, 80, 80); ctx.restore();
      }
      const atkName = sidePlayer.atk && sidePlayer.atk.name;
      const py = y + 1 + (pose.dy || 0);
      // Swing afterimages: the last couple of frames linger for a blink.
      const ghostKey = atkName ? pose.sheet.src + pose.frame : null;
      if (ghostKey && sidePlayer.lastGhostKey && sidePlayer.lastGhostKey !== ghostKey && sidePlayer.lastGhost) {
        atkGhosts.push({ ...sidePlayer.lastGhost, until: time + 0.1 });
        if (atkGhosts.length > 3) atkGhosts.shift();
      }
      sidePlayer.lastGhostKey = ghostKey;
      sidePlayer.lastGhost = ghostKey ? { sheet: pose.sheet, frame: pose.frame, cols: pose.cols, x, y: py, f: sidePlayer.facing } : null;
      for (let i = atkGhosts.length - 1; i >= 0; i--) {
        const g = atkGhosts[i], a = (g.until - time) / 0.1;
        if (a <= 0) { atkGhosts.splice(i, 1); continue; }
        ctx.save(); ctx.globalAlpha = a * 0.32; ctx.filter = 'brightness(1.8) saturate(0.4)';
        drawKnightCell(g.sheet, g.frame, g.cols, g.x, g.y, g.f);
        ctx.restore();
      }
      if (c || atkName === 'power') {
        ctx.save(); ctx.filter = 'drop-shadow(0 0 2px rgba(120,200,255,' + (c && !c.ready ? 0.5 : 0.95) + '))';
        drawKnightCell(pose.sheet, pose.frame, pose.cols, x, py, sidePlayer.facing);
        ctx.restore();
      } else drawKnightCell(pose.sheet, pose.frame, pose.cols, x, py, sidePlayer.facing);
      return;
    }
    if (!playerSheetReady) {
      ctx.fillStyle = '#342c39'; ctx.fillRect(x - 7, y - 27, 14, 26);
      ctx.fillStyle = '#9d513e'; ctx.fillRect(x - 7, y - 19, 14, 12);
      ctx.fillStyle = '#e0b27a'; ctx.fillRect(x - 6, y - 30, 12, 10);
      ctx.fillStyle = '#292331'; ctx.fillRect(x - 7, y - 31, 13, 4);
      return;
    }
    const frame = sidePlayer.moving ? Math.floor(sidePlayer.walk * 0.75) % 6 : Math.floor(time * 2) % 2;
    const row = sidePlayer.moving ? 3 : 2;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (sidePlayer.facing < 0) {
      ctx.translate(x + 16, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(playerSheet, frame * 32, row * 32, 32, 32, 0, y - 32, 32, 32);
    } else {
      ctx.drawImage(playerSheet, frame * 32, row * 32, 32, 32, x - 16, y - 32, 32, 32);
    }
    ctx.restore();
  }

  // Offscreen buffer used to flash goblins white on impact.
  let flashCanvas = null, flashCtx = null;

  function drawDadArmorStand(x, groundY) {
    // A large, unmistakable armor display in Dad's room (kept separate from the player).
    ctx.save();
    ctx.fillStyle = 'rgba(255,211,125,.12)'; ctx.fillRect(x - 31, groundY - 101, 62, 99);
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(x - 29, groundY - 2, 58, 4);
    ctx.fillStyle = '#4b3027'; ctx.fillRect(x - 3, groundY - 69, 6, 65);
    ctx.fillRect(x - 18, groundY - 5, 36, 4);
    ctx.fillStyle = '#80533a'; ctx.fillRect(x - 24, groundY - 3, 48, 3);
    ctx.fillStyle = '#a4774b'; ctx.fillRect(x - 24, groundY - 68, 48, 4);
    if (equipment.armor) { ctx.restore(); return; }
    // Helmet and visor.
    ctx.fillStyle = '#202b36'; ctx.fillRect(x - 13, groundY - 91, 26, 23);
    ctx.fillStyle = '#718493'; ctx.fillRect(x - 10, groundY - 88, 20, 17);
    ctx.fillStyle = '#c5d0d3'; ctx.fillRect(x - 8, groundY - 87, 8, 4);
    ctx.fillStyle = '#111a24'; ctx.fillRect(x - 10, groundY - 79, 20, 4);
    ctx.fillStyle = '#a5bac4'; ctx.fillRect(x - 2, groundY - 75, 4, 6);
    ctx.fillStyle = '#d9bd79'; ctx.fillRect(x - 2, groundY - 91, 4, 3);
    // Chest plate, pauldrons, arm guards and greaves.
    ctx.fillStyle = '#202b36'; ctx.fillRect(x - 19, groundY - 69, 38, 31);
    ctx.fillStyle = '#718493'; ctx.fillRect(x - 15, groundY - 66, 30, 24);
    ctx.fillStyle = '#c5d0d3'; ctx.fillRect(x - 12, groundY - 64, 10, 5);
    ctx.fillStyle = '#435665'; ctx.fillRect(x + 3, groundY - 63, 8, 18);
    ctx.fillStyle = '#c49a55'; ctx.fillRect(x - 3, groundY - 55, 6, 7);
    ctx.fillStyle = '#202b36'; ctx.fillRect(x - 27, groundY - 68, 10, 24); ctx.fillRect(x + 17, groundY - 68, 10, 24);
    ctx.fillStyle = '#8194a0'; ctx.fillRect(x - 25, groundY - 65, 6, 17); ctx.fillRect(x + 19, groundY - 65, 6, 17);
    ctx.fillStyle = '#202b36'; ctx.fillRect(x - 15, groundY - 39, 12, 25); ctx.fillRect(x + 3, groundY - 39, 12, 25);
    ctx.fillStyle = '#718493'; ctx.fillRect(x - 13, groundY - 36, 8, 19); ctx.fillRect(x + 5, groundY - 36, 8, 19);
    ctx.fillStyle = '#202b36'; ctx.fillRect(x - 17, groundY - 15, 15, 12); ctx.fillRect(x + 2, groundY - 15, 15, 12);
    ctx.fillStyle = '#aab8bd'; ctx.fillRect(x - 14, groundY - 12, 9, 7); ctx.fillRect(x + 5, groundY - 12, 9, 7);
    // Name plaque above the display makes it easy to spot from the hallway.
    ctx.fillStyle = '#39272b'; ctx.fillRect(x - 33, groundY - 105, 66, 9);
    ctx.strokeStyle = '#d4ad68'; ctx.strokeRect(x - 32.5, groundY - 104.5, 65, 8);
    ctx.fillStyle = '#fff0bd'; ctx.font = '6px monospace'; ctx.textAlign = 'center'; ctx.fillText("DAD'S ARMOR", x, groundY - 99);
    ctx.restore();
  }

  function drawSideInterior() {
    const oldText = ctx.textAlign;
    const oldFont = ctx.font;
    ctx.fillStyle = '#251a25';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(-sideCameraX, 0);

    // Side-on cutaway of the same home: Dad's room, the central hall, the player's room,
    // then the kitchen, living room and bathroom in one connected horizontal layout.
    ctx.fillStyle = '#54372f'; ctx.fillRect(0, 0, HOUSE_SIDE_WIDTH, 196);
    ctx.fillStyle = '#76503a'; ctx.fillRect(0, 24, HOUSE_SIDE_WIDTH, 166);
    for (let y = 30; y < 188; y += 14) {
      ctx.fillStyle = '#916342'; ctx.fillRect(0, y, HOUSE_SIDE_WIDTH, 2);
      ctx.fillStyle = 'rgba(37,21,27,.24)'; ctx.fillRect(0, y + 9, HOUSE_SIDE_WIDTH, 1);
    }
    ctx.fillStyle = '#4b3029'; ctx.fillRect(0, 196, HOUSE_SIDE_WIDTH, 44);
    ctx.fillStyle = '#956342'; ctx.fillRect(0, 194, HOUSE_SIDE_WIDTH, 4);
    for (let x = 0; x < HOUSE_SIDE_WIDTH; x += 32) {
      ctx.fillStyle = '#b47b50'; ctx.fillRect(x + 4, 202, 20, 2);
      ctx.fillStyle = 'rgba(40,22,24,.32)'; ctx.fillRect(x + 27, 197, 2, 18);
    }
    // Windows keep each room readable without adding clutter.
    for (const wx of [58, 372, 566, 714]) {
      ctx.fillStyle = '#392831'; ctx.fillRect(wx, 48, 52, 42);
      ctx.fillStyle = '#91b4b2'; ctx.fillRect(wx + 4, 52, 44, 34);
      ctx.fillStyle = '#d8c18c'; ctx.fillRect(wx + 24, 52, 3, 34);
      ctx.fillRect(wx + 4, 67, 44, 3);
    }
    // Doorway posts and labels preserve the room identities from the old house layout.
    const dividers = [205, 315, 500, 650, 810];
    for (const x of dividers) {
      ctx.fillStyle = '#39252c'; ctx.fillRect(x - 4, 30, 8, 142);
      ctx.fillStyle = '#94603f'; ctx.fillRect(x - 2, 30, 4, 140);
      ctx.fillStyle = '#d6a36a'; ctx.fillRect(x - 1, 31, 1, 136);
    }
    ctx.textAlign = 'center';
    ctx.font = '7px monospace';
    ctx.fillStyle = '#f2d8a9';
    ctx.fillText("DAD'S ROOM", 101, 116);
    ctx.fillText('HALLWAY', 260, 116);
    ctx.fillText('YOUR ROOM', 407, 116);
    ctx.fillText('KITCHEN', 575, 116);
    ctx.fillText('LIVING ROOM', 730, 116);
    ctx.fillText('BATH', 875, 116);

    // Existing furniture sheets are reused in the new side-view house.
    drawInteriorArt(16, 48, 47, 49, 22, 151, 82, 43);
    drawInteriorArt(336, 38, 50, 57, 111, 151, 54, 43);
    drawInteriorArt(111, 48, 48, 49, 345, 151, 82, 43);
    drawInteriorArt(16, 253, 88, 62, 535, 153, 88, 41);
    drawInteriorArt(140, 263, 66, 50, 688, 150, 85, 45);
    drawInteriorSprite(21, 7, 2, 2, 839, 164, 28, 28);
    drawInteriorSprite(23, 7, 2, 2, 878, 164, 28, 28);

    // A clearly visible folded note on Dad's dresser, with a bright paper edge.
    ctx.fillStyle = 'rgba(245,211,139,.22)'; ctx.fillRect(130, 132, 27, 18);
    ctx.fillStyle = '#4b302b'; ctx.fillRect(133, 145, 22, 3);
    ctx.fillStyle = '#eadbb3'; ctx.fillRect(134, 135, 20, 12);
    ctx.fillStyle = '#fff5d8'; ctx.fillRect(135, 136, 17, 1);
    ctx.fillStyle = '#b59a70'; ctx.fillRect(136, 139, 13, 1); ctx.fillRect(136, 142, 10, 1);
    ctx.fillStyle = '#f2e5c5'; ctx.fillRect(151, 136, 3, 3);
    ctx.strokeStyle = '#fff0c5'; ctx.strokeRect(133.5, 134.5, 20, 12);

    // Dad's armor stays on display after the player equips the set.
    drawDadArmorStand(181, 196);

    // The front door is the right-hand exit to the forest.
    ctx.fillStyle = '#3e2930'; ctx.fillRect(916, 112, 31, 84);
    ctx.fillStyle = '#80513c'; ctx.fillRect(920, 116, 23, 80);
    ctx.fillStyle = '#b67c50'; ctx.fillRect(923, 120, 17, 72);
    ctx.fillStyle = '#f0ce86'; ctx.fillRect(936, 158, 3, 3);

    drawSidePlayer();
    ctx.restore();

    ctx.fillStyle = 'rgba(10,10,18,.82)';
    ctx.fillRect(178, 4, 138, 17);
    ctx.fillStyle = '#f5e6c8'; ctx.font = '7px monospace'; ctx.textAlign = 'right';
    ctx.fillText(sidePlayer.x > 225 && !dadNoteRead ? "DAD'S ROOM  ←" : 'HOME / NOTE', 311, 15);
    ctx.fillStyle = 'rgba(8,9,16,.72)';
    ctx.fillRect(0, 226, canvas.width, 14);
    ctx.fillStyle = '#f0e5ce'; ctx.font = '7px monospace'; ctx.textAlign = 'left';
    ctx.fillText(dadNoteRead ? (equipment.armor ? 'QUEST COMPLETE: DAD\'S ARMOR EQUIPPED' : 'QUEST: FIND AND EQUIP DAD\'S ARMOR') : (inputMode === 'pad' ? 'STICK MOVE  ✕ JUMP  □ ATTACK  △ BAG' : 'A/D MOVE  SPACE JUMP  J ATTACK  E INTERACT'), 5, 236);

    const noteDistance = Math.hypot(sidePlayer.x - 144, sidePlayer.y - 164);
    const armorDistance = Math.hypot(sidePlayer.x - 181, sidePlayer.y - 164);
    if (Math.abs(sidePlayer.y - 164) < 58 && Math.min(noteDistance, armorDistance) < 43 && noteDistance <= armorDistance) {
      ctx.fillStyle = 'rgba(15,12,24,.97)'; ctx.fillRect(82 - sideCameraX, 176, 124, 16);
      ctx.strokeStyle = '#f4d27b'; ctx.lineWidth = 1; ctx.strokeRect(82.5 - sideCameraX, 176.5, 123, 15);
      ctx.fillStyle = '#fff0bd'; ctx.font = 'bold 7px monospace'; ctx.textAlign = 'center';
      ctx.fillText('[ ' + K('E') + ' ] READ DAD\'S NOTE', 144 - sideCameraX, 187);
    } else if (Math.abs(sidePlayer.y - 164) < 58 && armorDistance < 43) {
      ctx.fillStyle = 'rgba(15,12,24,.97)'; ctx.fillRect(119 - sideCameraX, 176, 125, 16);
      ctx.strokeStyle = '#f4d27b'; ctx.lineWidth = 1; ctx.strokeRect(119.5 - sideCameraX, 176.5, 124, 15);
      ctx.fillStyle = '#fff0bd'; ctx.font = 'bold 7px monospace'; ctx.textAlign = 'center';
      ctx.fillText(equipment.armor ? 'ARMOR EQUIPPED' : '[ ' + K('E') + ' ] EQUIP ARMOR', 181 - sideCameraX, 187);
    } else if (Math.abs(sidePlayer.x - 930) < 55) {
      ctx.fillStyle = 'rgba(15,12,24,.94)'; ctx.fillRect(875 - sideCameraX, 180, 110, 13);
      ctx.strokeStyle = '#f4d27b'; ctx.strokeRect(875.5 - sideCameraX, 180.5, 109, 12);
      ctx.fillStyle = '#fff0bd'; ctx.font = 'bold 7px monospace'; ctx.textAlign = 'center';
      ctx.fillText('[ ' + K('E') + ' ] ENTER FOREST', 930 - sideCameraX, 189);
    }
    ctx.textAlign = oldText;
    ctx.font = oldFont;
  }

  function drawSideForest() {
    // The background is the flattened preview from the supplied layered forest pack.
    // It includes its own canopy, trunks, undergrowth and ground, so do not paint
    // the old gradient, geometric hills, or top-down tree-atlas scenery over it.
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (sideForestBackgroundReady && sideForestBackground.naturalWidth) {
      const bgWidth = canvas.width;
      const bgHeight = canvas.height;
      const bgY = SIDE_GROUND_Y - bgHeight * 0.95;
      const offset = sideCameraX % bgWidth;
      for (let x = -offset - bgWidth; x < canvas.width + bgWidth; x += bgWidth) {
        ctx.drawImage(sideForestBackground, x, bgY, bgWidth, bgHeight);
      }
      // The art stops just under the ground line; fill the rest with soil so no
      // previous frame (e.g. the house) shows through underneath.
      const bottom = Math.floor(bgY + bgHeight) - 1;
      if (bottom < canvas.height) {
        const g = ctx.createLinearGradient(0, bottom, 0, canvas.height);
        g.addColorStop(0, '#0e1a1a'); g.addColorStop(1, '#070b0d');
        ctx.fillStyle = g; ctx.fillRect(0, bottom, canvas.width, canvas.height - bottom);
        ctx.fillStyle = 'rgba(70,96,58,0.35)';
        for (let x = -(sideCameraX % 23); x < canvas.width; x += 23) ctx.fillRect(Math.round(x), bottom + 3 + ((x * 7) & 3), 2, 1);
      }
    } else {
      ctx.fillStyle = '#536b80';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.restore();

    ctx.save();
    const shakeX = screenShake > 0 ? Math.round((Math.random() - 0.5) * screenShake * 2) : 0;
    const shakeY = screenShake > 0 ? Math.round((Math.random() - 0.5) * screenShake * 1.4) : 0;
    ctx.translate(-sideCameraX + shakeX, shakeY);
    // The supplied background already contains the forest floor. Only draw
    // the separate raised platforms here; keep the continuous ground invisible.
    sidePlatforms().slice(1).forEach(drawSidePlatform);

    drawDepthsWorld();
    drawChests();
    drawSideMobs();

    if (platformScene === 'forest') { drawOpeningTrail(); drawCamp(); drawExpansionRoad(); }
    drawLoreSpots();
    drawSidePlayer();
    drawPlayerWaves();
    drawCombatFx();
    drawFortuneFx();
    drawAmbient();
    ctx.restore();
    drawSideOverlays(platformScene !== 'forest' ? region().name : sidePlayer.x > CAMP.start ? "BRAM'S CAMP" : 'WOODLAND');
  }

  // ===========================================================================
  // Story: lore pages, dialogue, the forest camp, the Hollow, the boss and Dad.
  // ===========================================================================
  const LORE = [
    { id: 'watch', kind: 'stone', scene: 'forest', x: 600, title: 'The Silver Watch', where: 'Rune stone, forest trail', hint: 'A stone near the start of the trail.',
      text: 'HERE STOOD THE SILVER WATCH. Sworn to guard the seal over the Hollow, where the moon fell twenty winters ago. We hold the line so the village may sleep.', sign: '- Captain Aldric' },
    { id: 'page1', kind: 'page', scene: 'forest', x: 1600, title: 'Journal: Day 1', where: "Dad's journal, deep forest", hint: 'Somewhere in the middle of the forest.',
      text: "Day 1. The goblins aren't raiding. They're running. Their camps are empty and the fires still warm. Something in the Hollow is driving them out of the deep woods, toward the village. Toward home.", sign: '- A.' },
    { id: 'page2', kind: 'page', scene: 'forest', x: 3738, title: 'Journal: Day 3', where: "Dad's journal, Bram's camp", hint: 'At the camp on the far side of the forest.',
      text: "Day 3. Old Bram has kept this camp since the Moonfall. He says the seal is cracking and the dead walk again. I'm going in. Rowan, if you're reading this, go home. ...You never listen. Then rest by the fire first.", sign: '- A.' },
    { id: 'moonfall', kind: 'stone', scene: 'hollow', x: 700, title: 'The Moonfall', where: 'Rune stone, the Hollow', hint: 'A stone near the mouth of the Hollow.',
      text: 'MORWEN BROKE THE MOON, AND THE GREATEST SHARD OF IT FELL HERE. Where it struck, the dead do not rest and the wild things grow wrong. Take nothing the moon has dropped.' },
    { id: 'page3', kind: 'page', scene: 'hollow', x: 1800, title: 'Journal: Day 5', where: "Dad's journal, the Hollow", hint: 'Deep inside the Hollow.',
      text: "Day 5. Grukk dug up the shard and sold it to riders heading east. He kept a splinter for his crown. The old Watch seal is failing where they dug through. I cannot hold it and fight him at the same time. If you follow, look for the silver tree cut into the stone.", sign: '- A.' },
    { id: 'aldric', kind: 'page', scene: null, x: 0, title: "Aldric's Story", where: 'Told by Dad, after the battle', hint: 'Find Dad.',
      text: "The Silver Watch didn't fall to monsters. We fell to the shard. It whispers. Half my brothers took it up and became the skeletons you fought. I buried it under a seal and never told you. Grukk dug it up and sold it to the Pale Court for a splinter to wear in his crown. The real shard rode east a week ago." },
    { id: 'oath', kind: 'page', scene: null, x: 0, title: 'The Broken Moon', where: 'Told by Dad, in the Hollow', hint: 'Talk to Dad after Chapter 1.',
      text: "Twenty winters ago the moon-mage Morwen lost her daughter in the Long Winter, when the moon waned and did not come back for nine nights. She tried to pull the moon down and make one that never wanes. The Watch stopped her, but the moon cracked and bled shards across the land. Morwen fled east with the knights who loved her. They are the Pale Court now, and she calls herself their Queen. If she gathers the shards, she can remake the moon in her own image." },
    // ---- Chapter 2: the Ashen Pass ----
    { id: 'riders', kind: 'stone', scene: 'pass', x: 700, title: 'Warning Stone', where: 'Rune stone, Ashen Pass', hint: 'Near the mouth of the pass.',
      text: 'TURN BACK. THE PALE COURT RIDES THIS ROAD. THEIR HORSES BURN AND LEAVE NO TRACKS BUT FIRE. THEY TAKE THE LIGHT FROM LAMPS, AND THE SONG FROM THOSE WHO CAN HEAR THE MOON.' },
    { id: 'wrenlog', kind: 'page', scene: 'pass', x: 1400, title: "Wren's Scout Log", where: 'Scout log, Ashen Pass', hint: 'Halfway to the lookout fire.',
      text: "Day 31. Seven riders, pale armor, eyes like candle flames. They carried a glowing thing wrapped in black cloth. They left the mare behind to guard the road. She paces the far end of the pass and screams at night. Mother would know what to do. Mother is not here." , sign: '- W.' },
    { id: 'ashroad', kind: 'stone', scene: 'pass', x: 2450, title: 'The Ember Road', where: 'Mile stone, Ashen Pass', hint: 'Past the lookout fire.',
      text: 'GLOAMHOLD 9 LEAGUES. In the age of lamps, Silver Watch caravans carried moonsilver along this road. The red rock still holds the heat of the night the Pale Court burned it, twelve winters ago in the fever winter, when the Black Tide rose and the city beyond went dark.' },
    { id: 'letter', kind: 'page', scene: 'pass', x: 3150, title: 'Unsent Letter', where: 'A dead soldier\'s letter', hint: 'Near the end of the pass.',
      text: "My love. They say the Queen does not kill the moon-readers. She keeps them. She makes them sing to the shards until the shards remember being the moon. I would rather die on this road than hear that song. Kiss the little one for me. Tell her the lamps will come back." },
    { id: 'ashmane', kind: 'page', scene: null, x: 0, title: 'Ashmane', where: 'Told by Wren, after the battle', hint: 'Defeat the guardian of the pass.',
      text: "Ashmane was a Watch warhorse once, the finest in Gloamhold. Morwen fed her a sliver of the moon and she never stopped burning. The Queen rode her through the city gates on the night of the Black Tide. Now Gloamhold waits beyond the pass, and the riders went there with the Hollow shard." },
    // ---- Chapter 3: Gloamhold ----
    { id: 'founding', kind: 'stone', scene: 'gloam', x: 640, title: 'Founding Stone', where: 'Rune stone, Gloamhold', hint: 'At the edge of the drowned town.',
      text: 'GLOAMHOLD, CITY OF THE SILVER WATCH. Raised where the first moonbeam touched the earth. Here the Watch kept the moonwell, and the lamps of the city were lit with moonsilver so that no night would ever be truly dark.' },
    { id: 'tide', kind: 'page', scene: 'gloam', x: 1340, title: 'The Black Tide', where: 'A waterlogged diary', hint: 'In the old town.',
      text: "It came up out of the moonwell like ink. It did not drown us with water. It drowned the light. Every lamp went black at once, and the people who were standing under them simply... stopped. Then the Pale Court rode in, and their Queen laughed." },
    { id: 'lamps', kind: 'stone', scene: 'gloam', x: 1960, title: 'The Lamplighters', where: 'Rune stone, old town', hint: 'Before the city gate.',
      text: 'WE WERE THE LAMPLIGHTERS. WE STILL ARE. When the Tide took our light we kept walking the streets, lamps in hand. We do not remember why. If you meet us, knight, forgive us. And put us to rest.' },
    { id: 'captain', kind: 'page', scene: 'gloam', x: 2330, title: "Captain Ysolde's Log", where: 'Log at the city gate', hint: 'At the gate fire.',
      text: "Last entry. The Queen has the moon-readers. Even the visiting reader from the Hollow villages, the finest the Watch ever trained. They took her alive. I sent my daughter Wren away with the scouts. If anyone finds this: the Court's fortress lies beyond the eastern sea. The Pale Court. Do not go alone." , sign: '- Captain Ysolde' },
    { id: 'moonwell', kind: 'stone', scene: 'gloam', x: 3240, title: 'The Moonwell', where: 'Rune stone, castle quarter', hint: 'Inside the castle quarter.',
      text: 'BENEATH THIS HALL LIES THE MOONWELL, WHERE THE MOON\'S REFLECTION NEVER FADES. Something sleeps in it now, fat on stolen light. The skulls that burn in these halls are the faces of those it has eaten.' },
    { id: 'queen', kind: 'page', scene: 'gloam', x: 3760, title: 'Of the Pale Queen', where: 'A torn scholar\'s page', hint: 'Deep in the castle quarter.',
      text: "Morwen was not born cruel. She lost a child in the long winter and could not bear the dark. She swore she would make a moon that never wanes, so no mother would ever lose a child to the night again. That is the terrible thing about her. She believes she is saving us." },
    { id: 'seren', kind: 'page', scene: null, x: 0, title: "Seren's Locket", where: 'Found where Vael fell', hint: 'Defeat the Moon-Eater.',
      text: "Inside the locket is a tiny painting of a baby and a folded note in your mother's hand: \"Rowan, if this ever finds you, I did not leave you. They came for my voice. Listen to the moon at night. I am still singing. I am still here.\"" },
    { id: 'ferrysong', kind: 'stone', scene: 'harbor', x: 360, title: 'The Night Signal', where: 'Bellpost at Lantern Quay', hint: 'Look beyond the harbor fire.',
      text: "NIGHT FERRY: Shell first, Star second, Anchor last. Wait for the lantern across the water. Seren put the shell first so the children could remember it." },
    { id: 'boots', kind: 'page', scene: 'harbor', x: 530, title: 'The Boot List', where: 'Crates on Lantern Quay', hint: 'Search the quay beyond the bellpost.',
      text: "Two left boots. One little mitten. A tin of buttons, don't put it near the salt. Put the dry blankets on the ferry before the good wine. If Jory asks, there wasn't any good wine.", sign: '- Nessa' },
    { id: 'lysletter', kind: 'page', scene: 'court', x: 328, title: 'Lys and the Pear Tree', where: 'Bench in the outer gallery', hint: 'Look below the first gallery window.',
      text: "Mum says the tree won't bear till next year. I tied a bit of ribbon around the branch I want. If a bird takes it, I hope Mum sees where it went. She doesn't look out the window much now.", sign: '- Lys, before the Long Winter' },
    { id: 'serenledger', kind: 'page', scene: null, x: 0, title: 'The Lower Well Ledger', where: 'Outer gallery of the Pale Court', hint: 'Follow the singing through the gallery.',
      text: "Seren, moon-reader. Taken alive the night Gloamhold went dark. Twelve years in service. Sent to the Court's lower well three nights ago. Someone crossed out her next shift and wrote, 'Please, not that song again.'" }
  ];
  function addLore(id) {
    if (story.pages.includes(id)) return false;
    story.pages.push(id);
    return true;
  }

  // ---- Dialogue box (typewriter, freezes the world) ----
  const SPEAKERS = {
    rowan: { name: 'ROWAN', color: '#9fd3ff' },
    aldric: { name: 'ALDRIC', color: '#ffd27a' },
    grukk: { name: 'GRUKK', color: '#ff7a6a' },
    bram: { name: 'OLD BRAM', color: '#c9e39a' },
    wren: { name: 'WREN', color: '#ffb48a' },
    ashmane: { name: 'ASHMANE', color: '#8fd8ff' },
    vael: { name: 'VAEL', color: '#b98cff' },
    nessa: { name: 'NESSA', color: '#ffd891' },
    register: { name: 'LOWER WELL LEDGER', color: '#c3ddd2' },
    stone: { name: 'RUNE STONE', color: '#b8d8ff' },
    page: { name: "DAD'S JOURNAL", color: '#e8d2a0' }
  };
  function startDialogue(lines, onDone) {
    ctx.save();
    const pages = lines.flatMap(line => {
      const rows = wrapText(line.text, 239, '8px monospace');
      const parts = [];
      for (let i = 0; i < rows.length; i += 4) {
        const pageRows = rows.slice(i, i + 4);
        parts.push({ who: line.who, rows: pageRows, text: pageRows.join(' ') });
      }
      return parts;
    });
    ctx.restore();
    if (!pages.length) { if (onDone) onDone(); return; }
    dialogue = { lines: pages, i: 0, shown: 0, onDone, t: time };
    keys.clear(); sideAttackQueued = false; sideJumpQueued = false;
    sidePlayer.atk = null;
  }
  function updateDialogue(dt) {
    if (!dialogue) return;
    const line = dialogue.lines[dialogue.i];
    const before = Math.floor(dialogue.shown);
    dialogue.shown = Math.min(line.text.length, dialogue.shown + dt * 52);
    if (Math.floor(dialogue.shown) !== before && before % 3 === 0 && line.text[before] !== ' ') synthSfx('tick');
  }
  function advanceDialogue() {
    if (!dialogue || time - dialogue.t < 0.15) return;
    const line = dialogue.lines[dialogue.i];
    if (dialogue.shown < line.text.length) { dialogue.shown = line.text.length; return; }
    dialogue.i++; dialogue.shown = 0; dialogue.t = time;
    if (dialogue.i >= dialogue.lines.length) {
      const done = dialogue.onDone; dialogue = null;
      sfx('uiConfirm', 0.6);
      if (done) done();
    } else sfx('uiMove', 0.8);
  }
  function drawPortrait(who, x, y) {
    ctx.save();
    ctx.fillStyle = '#0d0a10'; ctx.fillRect(x - 1, y - 1, 42, 42);
    ctx.fillStyle = '#231c2a'; ctx.fillRect(x, y, 40, 40);
    ctx.beginPath(); ctx.rect(x, y, 40, 40); ctx.clip();
    ctx.imageSmoothingEnabled = false;
    if (who === 'moonkeeper' && imgReady(moonArt.portrait)) {
      ctx.drawImage(moonArt.portrait, 0, 0, 160, 160, x, y, 40, 40);
    } else if (who === 'rowan' && imgReady(knightSprites.idle)) {
      ctx.drawImage(knightSprites.idle, 50, 20, 28, 28, x - 2, y - 2, 56, 56);
    } else if (who === 'aldric' && imgReady(hollowArt.dadIdle)) {
      ctx.drawImage(hollowArt.dadIdle, 55, 55, 27, 27, x + 1, y + 1, 38, 38);
    } else if (who === 'grukk') {
      const img = mobSheet(MOB_TYPES.ogre, MOB_TYPES.ogre.anims.idle);
      if (imgReady(img)) { ctx.translate(x + 40, y); ctx.scale(-1, 1); ctx.drawImage(img, 30, 0, 64, 64, -14, -6, 70, 70); }
    } else if (who === 'wren' && imgReady(beastArt.wrenIdle)) {
      ctx.drawImage(beastArt.wrenIdle, 52, 20, 24, 24, x - 4, y - 4, 48, 48);
    } else if (who === 'nessa' && imgReady(coastArt.ferrier)) {
      ctx.drawImage(coastArt.ferrier, 5, 3, 29, 31, x - 2, y - 2, 44, 47);
    } else if (imgReady(villageNpcArt[who]?.image)) {
      const { image, head } = villageNpcArt[who];
      const { sx, sy } = villageNpcFrame(who, 0, true);
      ctx.drawImage(image, sx + head[0], sy + head[1], 34, 34, x, y, 40, 40);
    } else if (Object.hasOwn(DISTINCT_TOWN_ROWS, who) && imgReady(distinctCastArt)) {
      ctx.drawImage(distinctCastArt, 2, DISTINCT_TOWN_ROWS[who] * 29, 16, 17, x + 4, y + 2, 32, 34);
    } else if (Object.hasOwn(WATCH_CAST_ROWS, who) && imgReady(watchCastArt)) {
      ctx.drawImage(watchCastArt, 5, WATCH_CAST_ROWS[who] * 32, 22, 22, x, y, 40, 40);
    } else if (imgReady(residentArt[who])) {
      ctx.drawImage(residentArt[who], 9, 8, 31, 33, x, y, 40, 43);
    } else if (who === 'skarn') {
      const T = MOB_TYPES.skarn, img = mobSheet(T, T.anims.idle);
      if (imgReady(img)) ctx.drawImage(img, 52, 36, 45, 45, x, y, 40, 40);
    } else if (who === 'nick') {
      const img = mobSheet(MOB_TYPES.nick, MOB_TYPES.nick.anims.idle);
      if (imgReady(img)) ctx.drawImage(img, 101, 35, 74, 72, x - 2, y - 2, 44, 44);
    } else if (who === 'ashmane') {
      const img = mobSheet(MOB_TYPES.mare, MOB_TYPES.mare.anims.idle);
      if (imgReady(img)) ctx.drawImage(img, 24, 12, 48, 48, x - 4, y - 4, 48, 48);
    } else if (who === 'vael') {
      const img = mobSheet(MOB_TYPES.demon, MOB_TYPES.demon.anims.idle);
      if (imgReady(img)) ctx.drawImage(img, 136, 88, 52, 52, x - 4, y - 4, 48, 48);
    } else if (who === 'bram') {
      ctx.fillStyle = '#3d2c22'; ctx.fillRect(x + 6, y + 6, 28, 34);
      ctx.fillStyle = '#5a4030'; ctx.fillRect(x + 9, y + 8, 22, 30);
      ctx.fillStyle = '#1c1410'; ctx.fillRect(x + 12, y + 13, 16, 13);
      ctx.fillStyle = '#d9a77a'; ctx.fillRect(x + 14, y + 16, 12, 8);
      ctx.fillStyle = '#1c1410'; ctx.fillRect(x + 16, y + 18, 2, 2); ctx.fillRect(x + 22, y + 18, 2, 2);
      ctx.fillStyle = '#cfcac0'; ctx.fillRect(x + 13, y + 22, 14, 12); ctx.fillRect(x + 16, y + 34, 8, 3);
    } else if (SPEAKERS[who] && SPEAKERS[who].mob) {
      const T = MOB_TYPES[SPEAKERS[who].mob], img0 = T.art ? null : mobSheet(T, T.anims.idle);
      if (T.art) {
        ctx.drawImage(championSprite(T.art), 12, 0, 38, 38, x, y, 40, 40);
      } else if (imgReady(img0)) {
        const img = T.tint ? tintedSheet(img0, T.tint) : img0, sc = Math.min(2.2, 46 / Math.min(T.fh, T.bodyH / T.scale * 1.3));
        ctx.translate(x + 20, y + 40 + (T.fh - T.ay) * sc * 0.2); if (T.faceLeft) ctx.scale(-1, 1);
        ctx.drawImage(img, 0, 0, T.fw, T.fh, -T.ax * sc, -T.ay * sc * 0.82, T.fw * sc, T.fh * sc);
      }
    } else if (who === 'tess') {
      ctx.fillStyle = '#2a1e3a'; ctx.fillRect(x + 6, y + 4, 28, 36); ctx.fillStyle = '#3a2a50'; ctx.fillRect(x + 9, y + 7, 22, 33);
      ctx.fillStyle = '#e0b890'; ctx.fillRect(x + 13, y + 14, 14, 12); ctx.fillStyle = '#1a1020'; ctx.fillRect(x + 16, y + 18, 2, 2); ctx.fillRect(x + 22, y + 18, 2, 2);
      ctx.fillStyle = '#b86a6a'; ctx.fillRect(x + 18, y + 23, 4, 1); ctx.fillStyle = '#c8a0ff'; ctx.fillRect(x + 9, y + 6, 3, 3);
    } else {
      drawItemIcon(who === 'stone' || who === 'shrine' ? 'whetstone' : 'page', x + 8, y + 8, 2);
    }
    ctx.restore();
  }
  function drawDialogue() {
    if (!dialogue) return;
    const line = dialogue.lines[dialogue.i];
    const sp = SPEAKERS[line.who] || SPEAKERS.rowan;
    const x = 8, y = moonVisit ? 168 : 157, w = 304, h = moonVisit ? 62 : 68;
    ctx.save();
    ctx.fillStyle = 'rgba(6,5,10,.94)'; ctx.fillRect(x, y, w, h);
    const paper = drawPaper('dialogue', x, y - 6, w, h + 10);
    if (!paper) {
      ctx.strokeStyle = '#d6b477'; ctx.lineWidth = 1; ctx.strokeRect(x + .5, y + .5, w - 1, h - 1);
    }
    drawPortrait(line.who, x + 8, y + 11);
    ctx.font = 'bold 7px monospace';
    const tw = ctx.measureText(sp.name).width + 10;
    ctx.fillStyle = '#0d0a10'; ctx.fillRect(x + 52, y - 7, tw + 2, 12);
    ctx.fillStyle = sp.color; ctx.fillRect(x + 53, y - 6, tw, 10);
    ctx.fillStyle = '#140f16'; ctx.textAlign = 'left'; ctx.fillText(sp.name, x + 58, y + 2);
    let left = Math.floor(dialogue.shown);
    line.rows.forEach((ln, i) => {
      const part = ln.slice(0, Math.max(0, left)); left -= ln.length + 1;
      invText(part, x + 55, y + 14 + i * 11, paper ? '#352520' : '#f3e7c9', '8px monospace');
    });
    const footer = y + h - 15;
    ctx.fillStyle = paper ? '#a68a6b' : '#4b3c38'; ctx.fillRect(x + 14, footer, w - 28, 1);
    const ready = dialogue.shown >= line.text.length;
    const action = !ready ? 'SHOW TEXT' : dialogue.i === dialogue.lines.length - 1 ? 'CLOSE' : 'CONTINUE';
    ctx.fillStyle = '#211a22';
    ctx.fillRect(x + 13, footer + 2, 34, 11);
    ctx.fillRect(x + w - 113, footer + 2, 102, 11);
    invText((dialogue.i + 1) + ' / ' + dialogue.lines.length, x + 16, footer + 10, '#e6d4b6', '7px monospace');
    invText(K('E') + ' / TAP  ' + action, x + w - 15, footer + 10, ready ? '#ffe19c' : '#e1d3c6', 'bold 7px monospace', 'right');
    ctx.restore();
  }

  // ===========================================================================
  // FORTUNE: relics, treasure chests, elite monsters, the Blood Moon,
  // level-up blessings and Bram's Fortune Wheel. All of it runs on dice rolls.
  // ===========================================================================
  const RARITY = {
    common: { name: 'COMMON', color: '#d8cfbf', glow: '216,207,191' },
    rare:   { name: 'RARE', color: '#5fa8ff', glow: '95,168,255' },
    epic:   { name: 'EPIC', color: '#c77dff', glow: '199,125,255' },
    legend: { name: 'LEGENDARY', color: '#f2c14e', glow: '242,193,78' }
  };
  const RARITY_ORDER = ['common', 'rare', 'epic', 'legend'];
  // 8 x 8 pixel icons. a = outline, b = body, c = light, d = accent.
  const RELIC_ICONS = {
    fang:      ['..aaaa..', '.abbbba.', '.abccba.', '..abcba.', '..abba..', '...aba..', '...aa...', '..d..d..'],
    shield:    ['.aaaaaa.', 'abbcbbba', 'abccdbba', 'abbcbbba', 'abbbbbba', '.abbbba.', '..abba..', '...aa...'],
    coin:      ['..aaaa..', '.abbbba.', 'abcddbba', 'abcdbbba', 'abbbbbba', 'abbbbbba', '.abbbba.', '..aaaa..'],
    feather:   ['......aa', '.....abc', '....abca', '...abca.', '..abca..', '.abca...', '.aca....', 'a.......'],
    rose:      ['...ab...', '..abba..', '.abccba.', '..abba..', '...da...', '..dda...', '...da...', '...d....'],
    heart:     ['.aa..aa.', 'abbaabba', 'abccbbba', 'abcbbbba', '.abbbba.', '..abba..', '...aa...', '........'],
    clover:    ['.aa..aa.', 'abbaabba', 'abcbbcba', '.aabbaa.', 'abcbbcba', 'abbaabba', '.aa.da..', '....d...'],
    moon:      ['..aaa...', '.abba...', 'abca....', 'abca....', 'abca....', 'abcba...', '.abbba..', '..aaa...'],
    gem:       ['...aa...', '..acba..', '.acbbba.', 'acbbbbba', '.abbbba.', '..abba..', '...aa...', '........'],
    rune:      ['.aaaaaa.', 'abbbdbba', 'abbddbba', 'abddddba', 'abbddbba', 'abbdbbba', 'abbbbbba', '.aaaaaa.'],
    blade:     ['......ab', '.....abc', '....abc.', 'd..abc..', '.dabc...', '..dd....', '.d.d....', 'd.......'],
    flame:     ['...a....', '..aba...', '..abca..', '.abcca..', '.abccba.', 'abccdcba', 'abcddcba', '.aaaaaa.'],
    hourglass: ['aaaaaaaa', '.abbbba.', '..accb..', '...dd...', '...dd...', '..abba..', '.adddda.', 'aaaaaaaa'],
    eye:       ['..aaaa..', '.abbbba.', 'abbccbba', 'abcddcba', 'abcddcba', 'abbccbba', '.abbbba.', '..aaaa..'],
    star:      ['...aa...', '...ca...', 'aaacbaaa', '.acbbba.', '..abba..', '.abaaba.', '.aa..aa.', '........'],
    bag:       ['..aaaa..', '...dd...', '.abbbba.', 'abbccbba', 'abcbbbba', 'abbbbbba', '.abbbba.', '..aaaa..']
  };
  const RELICS = {
    wolftooth:  { name: 'Wolf Tooth', rarity: 'common', icon: 'fang', pal: ['#2a1a14', '#e8dcc0', '#fff8e6', '#c8324a'],
                  desc: '+10% critical hit chance.', lore: 'Pulled from a werewolf on the night your father left. It still wants to bite.' },
    ironbark:   { name: 'Ironbark Charm', rarity: 'common', icon: 'shield', pal: ['#1a1410', '#6b4a2a', '#a8784a', '#d6b477'],
                  desc: 'Take 1 less damage from every hit.', lore: 'Bark from the oldest tree in the woodland. Bram swears it once stopped an arrow.' },
    giltooth:   { name: 'Gilded Tooth', rarity: 'common', icon: 'coin', pal: ['#5a3a10', '#f2c14e', '#fff1a8', '#ffffff'],
                  desc: 'Monsters drop 60% more coins.', lore: "A goblin chief's gold tooth. Goblins can smell it on you, and they hate you for it." },
    crowquill:  { name: 'Crow Quill', rarity: 'rare', icon: 'feather', pal: ['#0e0c16', '#3a3452', '#a89ee0', '#ffffff'],
                  desc: 'Jump a second time in mid-air.', lore: 'A pinion from the crows that follow the Pale Court. It weighs less than nothing.' },
    nightthorn: { name: 'Night Thorn', rarity: 'rare', icon: 'rose', pal: ['#1a0a12', '#a0244a', '#ff6a8a', '#3f9a3a'],
                  desc: 'Heal 2 HP whenever you slay a foe.', lore: 'It only grows where blood was spilled under a full moon. Drink deep.' },
    emberheart: { name: 'Ember Heart', rarity: 'rare', icon: 'heart', pal: ['#2a0a06', '#d8482a', '#ffb347', '#ffffff'],
                  desc: 'Rolling through foes burns them.', lore: "Ashmane's foals are born with these where their hearts should be." },
    clover:     { name: 'Four-Leaf Clover', rarity: 'rare', icon: 'clover', pal: ['#0e2410', '#3f9a3a', '#9be37a', '#6b4a2a'],
                  desc: 'Luck up: rarer chests, more relics.', lore: 'Mother pressed it inside a book of moon songs. Dad kept the book.' },
    moonshard:  { name: 'Moon Splinter', rarity: 'epic', icon: 'moon', pal: ['#0a1430', '#7fb8ff', '#e6f6ff', '#ffffff'],
                  desc: 'Moonblade charges twice as fast.', lore: 'A sliver of the broken moon. Hold it to your ear and something is singing.' },
    glasssaint: { name: 'Glass Saint', rarity: 'epic', icon: 'gem', pal: ['#14202a', '#8fe0ff', '#e6fbff', '#ffffff'],
                  desc: '+3 damage, but you take +2 damage.', lore: 'Relic of a Watch martyr who fought without armor. He won. Once.' },
    stormrune:  { name: 'Storm Rune', rarity: 'epic', icon: 'rune', pal: ['#14121e', '#4a4660', '#6a6690', '#ffe86b'],
                  desc: 'Critical hits call down lightning.', lore: 'The lightning over the Pale Court is not weather. It answers to this stone.' },
    echoblade:  { name: 'Echo Blade', rarity: 'epic', icon: 'blade', pal: ['#101828', '#8fd8ff', '#ffffff', '#d6b477'],
                  desc: 'Combo finishers fire a moon wave.', lore: 'Every swing of this ghost-sword is followed by a second, quieter one.' },
    phoenix:    { name: 'Phoenix Plume', rarity: 'legend', icon: 'flame', pal: ['#3a0a06', '#ff6a2a', '#ffc94a', '#fff6d0'],
                  desc: 'Cheat death once. Recharges at fires.', lore: 'The firebird fell over the Ashen Pass a hundred years ago. It is still not finished dying.' },
    hourglass:  { name: 'Sands of Ages', rarity: 'legend', icon: 'hourglass', pal: ['#2a1a10', '#d6b477', '#ffe3a1', '#8fd8ff'],
                  desc: 'Perfect dodges slow time.', lore: "Morwen's first attempt to stop the night from coming. Time bent. The night came anyway." },
    bloodidol:  { name: 'Blood Moon Idol', rarity: 'legend', icon: 'eye', pal: ['#1a0408', '#8a1020', '#ff3a4a', '#ffd0d0'],
                  desc: '+60% damage while under 35% HP.', lore: 'Carved by the cult of the red moon. It wants you close to death.' }
  };
  RELICS.breakwater = { name: 'Breakwater Sigil', rarity: 'epic', icon: 'shield',
    pal: ['#10242b', '#62bfac', '#bfefdc', '#dcb17a'], exclusive: true,
    desc: 'Perfect dodges restore +12 stamina.',
    lore: 'Awarded for holding the Breakwater through three waves.' };
  const RELIC_ORDER = Object.keys(RELICS);
  const RELIC_COLS = 8;
  const fortune = { owned: [], equipped: [], slots: 2, phoenixUsed: false };
  const fortuneFx = [];
  let relicReveal = null, relicSel = 0, pendingPerks = [], perkOffer = null, wheel = null;
  let bloodMoon = false, bloodMoonAt = -10, witchUntil = 0;

  function hasRelic(id) { return fortune.equipped.includes(id); }
  function luckValue() { return (stats.luck || 0) * 0.12 + (hasRelic('clover') ? 0.4 : 0) + (bloodMoon ? 0.3 : 0) + blessLuck(); }
  function critChance() { return 0.1 + (stats.critUp || 0) * 0.05 + (hasRelic('wolftooth') ? 0.1 : 0); }
  function chargeTime() { return CHARGE_TIME * (hasRelic('moonshard') ? 0.5 : 1) * Math.pow(0.8, stats.chargeUp || 0); }
  function eliteDmg(m) { return m.elite && m.elite.dmg ? m.elite.dmg : 0; }
  function fortuneDamage(dmg) {
    if (hasRelic('glasssaint')) dmg += 3;
    if (hasRelic('bloodidol') && stats.health <= stats.maxHealth * 0.35) dmg = Math.ceil(dmg * 1.6);
    const w = currentWeapon();
    const edge = tide.wear[w] >= 100 ? 0 : (tide.forge[w] || 0);
    return blessDamage(dmg + edge + (tide.mealTime > 0 && tide.meal === 'skewer' ? 1 : 0));
  }
  function fortuneHurt(amount) {
    if (hasRelic('glasssaint')) amount += 2;
    if (hasRelic('ironbark')) amount -= 1;
    if (bloodMoon) amount += 1;
    return Math.max(1, blessHurt(amount) - (tide.mealTime > 0 && tide.meal === 'chowder' ? 1 : 0));
  }
  function rollRarity(bonus = 0, floor = 'common') {
    const L = luckValue() + bonus;
    const w = { common: 60 / (1 + L), rare: 28 * (1 + L * 0.6), epic: 10 * (1 + L), legend: 2.5 * (1 + L * 1.6) };
    const pool = RARITY_ORDER.slice(RARITY_ORDER.indexOf(floor));
    let roll = Math.random() * pool.reduce((s, r) => s + w[r], 0);
    for (const r of pool) { roll -= w[r]; if (roll <= 0) return r; }
    return pool[pool.length - 1];
  }
  function randomRelic(rarity) {
    const unowned = RELIC_ORDER.filter(id => !RELICS[id].exclusive && !fortune.owned.includes(id));
    if (!unowned.length) return null;
    const ri = RARITY_ORDER.indexOf(rarity);
    for (const d of [0, -1, 1, -2, 2, -3, 3]) {
      const r = RARITY_ORDER[ri + d]; if (!r) continue;
      const list = unowned.filter(id => RELICS[id].rarity === r);
      if (list.length) return list[Math.floor(Math.random() * list.length)];
    }
    return unowned[0];
  }
  function dropRelic(x, y, rarity) {
    const id = randomRelic(rarity);
    if (!id) { for (let i = 0; i < 12; i++) pickups.push({ type: 'coin', amount: 3, x, y, vx: (Math.random() - 0.5) * 160, vy: -170 - Math.random() * 90, age: 0 }); return; }
    pickups.push({ type: 'relic', relic: id, amount: 1, x, y, vx: (Math.random() - 0.5) * 40, vy: -230, age: 0 });
    sfx('gem', 0.7, 0.8);
  }
  function grantRelic(id, reveal = true) {
    if (fortune.owned.includes(id)) { inventory.coins = (inventory.coins || 0) + 30; return; }
    fortune.owned.push(id);
    const eq = fortune.equipped.length < fortune.slots;
    if (eq) fortune.equipped.push(id);
    relicSel = RELIC_ORDER.indexOf(id);
    if (!reveal) return;
    relicReveal = { id, t: time, equipped: eq };
    openPanel('relic');
    sfx(RELICS[id].rarity === 'legend' || RELICS[id].rarity === 'epic' ? 'victory' : 'gem', 0.7); sfx('magic', 0.5);
    padRumble(0.5, 0.7, 260);
    if (onSave) onSave(getSaveData());
  }
  function drawRelicIcon(id, x, y, s = 1, silhouette = false, iconKey, pal) {
    const R = RELICS[id] || {};
    const g = RELIC_ICONS[iconKey || R.icon]; const P = pal || R.pal;
    if (!g) return;
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
      const ch = g[r][c]; if (ch === '.') continue;
      ctx.fillStyle = silhouette ? (ch === 'a' ? '#0a080d' : '#2a2331') : P['abcd'.indexOf(ch)];
      ctx.fillRect(Math.round(x + c * s), Math.round(y + r * s), s, s);
    }
  }
  function drawRays(cx, cy, glow, a, n = 12, len = 170, spin = 0.25) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < n; i++) {
      const ang = time * spin + i * Math.PI * 2 / n, w = 0.11;
      ctx.fillStyle = 'rgba(' + glow + ',' + (a * (i % 2 ? 0.07 : 0.12)) + ')';
      ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(ang - w) * len, cy + Math.sin(ang - w) * len);
      ctx.lineTo(cx + Math.cos(ang + w) * len, cy + Math.sin(ang + w) * len);
      ctx.closePath(); ctx.fill();
    }
    const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, 46);
    g.addColorStop(0, 'rgba(' + glow + ',' + 0.45 * a + ')'); g.addColorStop(1, 'rgba(' + glow + ',0)');
    ctx.fillStyle = g; ctx.fillRect(cx - 46, cy - 46, 92, 92);
    ctx.restore();
  }

  // ---- Elite monsters ----
  const ELITE_SCALE = 1.12;
  const ELITE_AFFIXES = [
    { id: 'swift', name: 'SWIFT', color: '#7fe3ff', glow: '127,227,255', spd: 1.45 },
    { id: 'brutal', name: 'BRUTAL', color: '#ff6a4a', glow: '255,106,74', dmg: 3 },
    { id: 'tough', name: 'IRONHIDE', color: '#9be37a', glow: '155,227,122', hp: 1.8 },
    { id: 'gilded', name: 'GILDED', color: '#f2c14e', glow: '242,193,78', gold: true },
    { id: 'frenzied', name: 'FRENZIED', color: '#ff7ad9', glow: '255,122,217', spd: 1.2, cd: 0.5 }
  ];
  function makeElite(m, affix) {
    const a = affix || ELITE_AFFIXES[Math.floor(Math.random() * ELITE_AFFIXES.length)];
    m.elite = a;
    m.maxHp = m.hp = Math.ceil(m.T.hp * 1.7 * (a.hp || 1));
  }
  function rollElite(m) {
    if (m.T.boss || m.summoned || m.elite) return;
    if (platformScene === 'forest' && m.home < 1450) return;
    const ch = 0.065 + (bloodMoon ? 0.16 : 0) + Math.min(0.04, luckValue() * 0.025) + (Math.min(3, questChapter()) - 1) * 0.018;
    if (Math.random() < ch) makeElite(m);
  }
  function drawEliteAura(m) {
    if (!m.elite || m.dead || m.dormant) return;
    const T = m.T, [anim, frame] = mobFrame(m), img = mobSheet(T, anim);
    if (!imgReady(img)) return;
    const sc = T.scale * ELITE_SCALE, w = T.fw * sc, h = T.fh * sc;
    const flip = T.faceLeft ? m.dir > 0 : m.dir < 0;
    mobFlashCanvas.width = T.fw; mobFlashCanvas.height = T.fh;
    mobFlashCtx.clearRect(0, 0, T.fw, T.fh);
    mobFlashCtx.drawImage(img, frame * T.fw, 0, T.fw, T.fh, 0, 0, T.fw, T.fh);
    mobFlashCtx.globalCompositeOperation = 'source-in';
    mobFlashCtx.fillStyle = m.elite.color; mobFlashCtx.fillRect(0, 0, T.fw, T.fh);
    mobFlashCtx.globalCompositeOperation = 'source-over';
    ctx.save();
    ctx.globalAlpha = 0.55 + Math.sin(time * 6 + m.x) * 0.2;
    ctx.translate(Math.round(m.x), Math.round(m.y));
    if (flip) ctx.scale(-1, 1);
    [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([ox, oy]) => ctx.drawImage(mobFlashCanvas, -T.ax * sc + ox, -T.ay * sc + oy, w, h));
    ctx.restore();
    ctx.fillStyle = m.elite.color;
    for (let k = 0; k < 4; k++) {
      const px = m.x + Math.sin(time * 2.2 + k * 2.1 + m.x) * T.width * 0.7;
      const py = m.y - ((time * 26 + k * 17) % (T.bodyH + 14));
      ctx.globalAlpha = 0.8; ctx.fillRect(Math.round(px), Math.round(py), 1, 1 + (k % 2));
    }
    ctx.globalAlpha = 1;
  }
  function drawEliteTag(m) {
    if (!m.elite || m.dead || m.dormant) return;
    const label = m.elite.name + ' ' + m.T.name.toUpperCase();
    const y = Math.round(mobTop(m) - 12);
    ctx.font = 'bold 5px monospace'; ctx.textAlign = 'center';
    ctx.fillStyle = '#0a080d'; ctx.fillText(label, Math.round(m.x) + 1, y + 1);
    ctx.fillStyle = m.elite.color; ctx.fillText(label, Math.round(m.x), y);
    ctx.fillRect(Math.round(m.x) - 1, y - 8 + Math.round(Math.sin(time * 4) * 1), 2, 2);
    ctx.textAlign = 'left';
  }

  // ---- Combat hooks ----
  function onCrit(m, f) {
    combatFx.push({ kind: 'ring', x: m.x, y: mobTop(m) + m.T.bodyH * 0.4, life: 0.22, max: 0.22, vx: 0, vy: 0 });
    addDamageNumber(m.x, mobTop(m) - 20, 'CRIT', '#ffb347');
    if (hasRelic('stormrune')) {
      const targets = sideMobs.filter(o => !o.dead && !o.dormant && Math.abs(o.x - m.x) < 110).slice(0, 3);
      targets.forEach((o, k) => setTimeout(() => {
        if (o.dead) return;
        lightningAt(o.x, o.y);
        damageMob(o, 3, o.x < sidePlayer.x ? -1 : 1, 60, true, false);
      }, 60 + k * 90));
    }
  }
  function lightningAt(x, y) {
    const pts = []; let px = x + (Math.random() - 0.5) * 20;
    for (let yy = -10; yy < y; yy += 12) { pts.push([px, yy]); px += (Math.random() - 0.5) * 14; }
    pts.push([x, y]);
    fortuneFx.push({ kind: 'bolt', x, y, pts, life: 0.28, max: 0.28 });
    flashUntil = Math.max(flashUntil, time + 0.05);
    screenShake = Math.max(screenShake, 3);
    sfx('clash', 0.8, 0.6); sfx('hitBig', 0.6, 1.3);
    spawnSparks(x, y - 4, 1, 8, ['#ffffff', '#ffe86b', '#8fd8ff']);
  }
  function fortuneOnKill(m, dropY) {
    const T = m.T;
    const heal = (hasRelic('nightthorn') ? 2 : 0) + (stats.thirst || 0);
    if (heal && stats.health > 0) {
      stats.health = Math.min(stats.maxHealth, stats.health + heal);
      addDamageNumber(sidePlayer.x + 8, sidePlayer.y - 70, '+' + heal, '#ff6a8a');
    }
    if (m.elite) {
      spawnSparks(m.x, m.y - T.bodyH * 0.5, 1, 14, [m.elite.color, '#ffffff', m.elite.color]);
      spawnSparks(m.x, m.y - T.bodyH * 0.5, -1, 14, [m.elite.color, '#ffffff', m.elite.color]);
      combatFx.push({ kind: 'ring', x: m.x, y: m.y - T.bodyH * 0.5, life: 0.35, max: 0.35, vx: 0, vy: 0 });
      addDamageNumber(m.x, mobTop(m) - 22, 'ELITE SLAIN', m.elite.color);
      stats.elites = (stats.elites || 0) + 1;
    }
    const chance = T.boss ? 1 : m.elite ? 0.3 + (m.elite.gold ? 0.25 : 0) : 0.025;
    if (Math.random() < chance + luckValue() * 0.02) {
      dropRelic(m.x, dropY, rollRarity(T.boss ? 0.8 : m.elite ? 0.4 : 0, T.boss ? 'rare' : 'common'));
    }
  }
  function phoenixRevive() {
    if (!hasRelic('phoenix') || fortune.phoenixUsed) return false;
    fortune.phoenixUsed = true;
    stats.health = Math.ceil(stats.maxHealth * 0.5);
    sidePlayer.invulnTime = 2.2;
    for (let i = 0; i < 3; i++) spawnSparks(sidePlayer.x, sidePlayer.y - 24, i % 2 ? 1 : -1, 14, ['#ff6a2a', '#ffc94a', '#fff6d0']);
    combatFx.push({ kind: 'ring', x: sidePlayer.x, y: sidePlayer.y - 24, life: 0.5, max: 0.5, vx: 0, vy: 0 });
    fortuneFx.push({ kind: 'phoenix', x: sidePlayer.x, y: sidePlayer.y, life: 1.2, max: 1.2 });
    flashUntil = time + 0.15; hitStop = 0.25; screenShake = 6;
    sfx('fire', 0.9); sfx('victory', 0.5); padRumble(1, 1, 500);
    return true;
  }
  function onPerfectDodge() {
    if (!hasRelic('hourglass')) return;
    if (time > witchUntil) { addDamageNumber(sidePlayer.x, sidePlayer.y - 66, 'TIME SLOWS', '#ffe3a1'); sfx('magic', 0.8, 0.5); }
    witchUntil = time + 1.8;
  }
  function emberRoll(r) {
    if (!hasRelic('emberheart')) return;
    r.burned = r.burned || new Set();
    sideMobs.forEach(m => {
      if (m.dead || m.dormant || r.burned.has(m)) return;
      if (Math.abs(m.x - sidePlayer.x) > m.T.width / 2 + 10) return;
      if (m.y < sidePlayer.y - 46 || mobTop(m) > sidePlayer.y + 4) return;
      r.burned.add(m);
      spawnSparks(m.x, m.y - m.T.bodyH * 0.4, r.dir, 10, ['#ff6a2a', '#ffb347', '#fff6d0']);
      damageMob(m, 2, r.dir, 40, false, false);
    });
    if (Math.random() < 0.7) combatFx.push({ kind: 'spark', x: sidePlayer.x - r.dir * 6, y: sidePlayer.y - 3 - Math.random() * 8, vx: -r.dir * 20, vy: -40, color: Math.random() < 0.5 ? '#ff6a2a' : '#ffc94a', life: 0.35, max: 0.35 });
  }
  function tryAirJump() {
    if (!hasRelic('crowquill') || sidePlayer.airJumped || sidePlayer.onGround) return false;
    sidePlayer.airJumped = true;
    sidePlayer.vy = -262;
    for (let i = 0; i < 8; i++) combatFx.push({ kind: 'spark', x: sidePlayer.x + (Math.random() - 0.5) * 14, y: sidePlayer.y - 2, vx: (Math.random() - 0.5) * 90, vy: 20 + Math.random() * 40, color: i % 2 ? '#a89ee0' : '#3a3452', life: 0.45, max: 0.45 });
    combatFx.push({ kind: 'ring', x: sidePlayer.x, y: sidePlayer.y - 2, life: 0.2, max: 0.2, vx: 0, vy: 0 });
    sfx('swoosh', 0.6, 1.4); sfx('cloth', 0.5, 1.5);
    return true;
  }

  // ---- Treasure chests (re-rolled every time you rest at a fire) ----
  const CHEST_SPOTS = { forest: [1150, 2250, 3200], hollow: [1050, 1500, 2350], pass: [1050, 2150, 2800, 3450], gloam: [980, 1650, 2750, 3500] };
  const chestRolls = {};
  function rollChests(scene) {
    chestRolls[scene] = (CHEST_SPOTS[scene] || []).filter(() => Math.random() < 0.6).map(x => {
      const rarity = rollRarity();
      return { x: x + Math.round((Math.random() - 0.5) * 40), rarity, mimic: rarity !== 'legend' && Math.random() < 0.12, open: false, t: 0, looted: false };
    });
  }
  function sceneChests() { if (!REGIONS[platformScene]) return []; if (!chestRolls[platformScene]) rollChests(platformScene); return chestRolls[platformScene]; }
  function nearChest() { return sceneChests().find(c => !c.open && Math.abs(sidePlayer.x - c.x) < 22); }
  function openChest(c) {
    c.open = true; c.t = time;
    if (!c.mimic) depthsOnChest();
    if (c.mimic) {
      sfx('roar', 0.8, 1.5); sfx('squish', 0.8); screenShake = 5; padRumble(0.8, 0.8, 300); hitStop = 0.12;
      notice = 'MIMIC! The chest was hungry.'; noticeUntil = time + 2.4;
      spawnSparks(c.x, SIDE_GROUND_Y - 10, 1, 10, ['#c8324a', '#ff8090', '#ffffff']);
      if (Math.abs(sidePlayer.x - c.x) < 28 && canHitPlayer()) hurtSidePlayer(3, sidePlayer.x < c.x ? -1 : 1, 'The mimic');
      const types = Array.from(new Set((SCENE_MOBS[platformScene] || []).map(s => s[0]))).filter(t => !MOB_TYPES[t].riser);
      [-56, 56].forEach((off, k) => {
        const type = types[Math.floor(Math.random() * types.length)];
        const g = makeMob(type, clamp(c.x + off, 40, sideWorldWidth() - 40), 70, k);
        makeElite(g, ELITE_AFFIXES[3]); g.respawn = Infinity; g.flash = 0.3; g.attackCooldown = 0.9;
        sideMobs.push(g);
        spawnSparks(g.x, SIDE_GROUND_Y - 20, k ? 1 : -1, 12, ['#f2c14e', '#ffffff']);
      });
      return;
    }
    c.lootAt = time + 0.45;
    sfx('latch'); sfx('creak', 0.6, 1.3);
    if (c.rarity === 'legend') { notice = 'A LEGENDARY CHEST!'; noticeUntil = time + 2; }
  }
  function dropChestLoot(c) {
    c.looted = true;
    const R = { common: [6, 12, 0.12], rare: [12, 22, 0.38], epic: [24, 40, 0.78], legend: [40, 70, 1] }[c.rarity];
    const y = SIDE_GROUND_Y - 16;
    const coins = Math.round((R[0] + Math.random() * (R[1] - R[0])) * (hasRelic('giltooth') ? 1.6 : 1));
    for (let i = 0; i < coins; i++) pickups.push({ type: 'coin', amount: 1, x: c.x, y, vx: (Math.random() - 0.5) * 170, vy: -190 - Math.random() * 120, age: Math.random() * 0.2 });
    const items = { common: ['berries', 'bread'], rare: ['tonic', 'bread'], epic: ['tonic', 'tonic', 'bread'], legend: ['tonic', 'tonic', 'tonic'] }[c.rarity];
    items.forEach((it, k) => { if (c.rarity !== 'common' || Math.random() < 0.6) pickups.push({ type: it, amount: 1, x: c.x, y, vx: (k % 2 ? -1 : 1) * (30 + k * 25), vy: -240, age: 0 }); });
    if (Math.random() < R[2] + luckValue() * 0.05) dropRelic(c.x, y - 4, rollRarity(c.rarity === 'legend' ? 1 : c.rarity === 'epic' ? 0.5 : 0, c.rarity === 'legend' ? 'epic' : c.rarity === 'epic' ? 'rare' : 'common'));
    screenShake = Math.max(screenShake, c.rarity === 'legend' ? 5 : c.rarity === 'epic' ? 3 : 1.5);
    spawnSparks(c.x, y, 1, 10, [RARITY[c.rarity].color, '#ffffff']);
    spawnSparks(c.x, y, -1, 10, [RARITY[c.rarity].color, '#ffffff']);
    sfx(c.rarity === 'epic' || c.rarity === 'legend' ? 'victory' : 'coins', 0.7);
    stats.chests = (stats.chests || 0) + 1;
  }
  const CHEST_BAND = { common: ['#6f7280', '#b9bcc8'], rare: ['#2f5fa8', '#8fc4ff'], epic: ['#6a2fa0', '#d9a8ff'], legend: ['#a8741a', '#ffe08a'] };
  function drawChest(c) {
    const x = Math.round(c.x), gy = SIDE_GROUND_Y, [band, bandHi] = CHEST_BAND[c.rarity], R = RARITY[c.rarity];
    const age = c.open ? time - c.t : 0;
    // Glow and beam.
    if (!c.open && (c.rarity === 'epic' || c.rarity === 'legend')) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(x, gy - 8, 2, x, gy - 8, 30);
      g.addColorStop(0, 'rgba(' + R.glow + ',' + (0.25 + Math.sin(time * 3) * 0.08) + ')'); g.addColorStop(1, 'rgba(' + R.glow + ',0)');
      ctx.fillStyle = g; ctx.fillRect(x - 30, gy - 38, 60, 60); ctx.restore();
    }
    if (c.open && !c.mimic && age < 2.2) {
      const a = age < 0.45 ? age / 0.45 : Math.max(0, 1 - (age - 0.45) / 1.75);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const bw = 8 + age * 6;
      const g = ctx.createLinearGradient(0, gy - 160, 0, gy);
      g.addColorStop(0, 'rgba(' + R.glow + ',0)'); g.addColorStop(1, 'rgba(' + R.glow + ',' + 0.55 * a + ')');
      ctx.fillStyle = g; ctx.fillRect(x - bw / 2, gy - 160, bw, 152);
      ctx.fillStyle = 'rgba(255,255,255,' + 0.5 * a + ')'; ctx.fillRect(x - 1, gy - 150, 2, 142);
      ctx.restore();
    }
    // Mimic: a tiny tremble now and then gives it away.
    let jx = 0, jy = 0;
    if (c.mimic && !c.open && Math.sin(time * 1.3 + c.x) > 0.97) jx = Math.round(Math.sin(time * 60));
    if (c.mimic && c.open) jy = -Math.round(Math.abs(Math.sin(age * 9)) * 4 * Math.max(0, 1 - age / 1.6));
    const bx = x - 9 + jx, by = gy - 12 + jy;
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(x - 10, gy - 1, 20, 2);
    // Body.
    ctx.fillStyle = '#1a0f0a'; ctx.fillRect(bx - 1, by + 4, 20, 9);
    ctx.fillStyle = '#6b4226'; ctx.fillRect(bx, by + 5, 18, 7);
    ctx.fillStyle = '#8a5a34'; ctx.fillRect(bx, by + 5, 18, 1);
    ctx.fillStyle = '#3a2414'; ctx.fillRect(bx + 5, by + 6, 1, 6); ctx.fillRect(bx + 12, by + 6, 1, 6);
    ctx.fillStyle = band; ctx.fillRect(bx, by + 5, 2, 7); ctx.fillRect(bx + 16, by + 5, 2, 7);
    ctx.fillStyle = bandHi; ctx.fillRect(bx, by + 5, 1, 7); ctx.fillRect(bx + 16, by + 5, 1, 1);
    if (!c.open) {
      // Closed lid.
      ctx.fillStyle = '#1a0f0a'; ctx.fillRect(bx - 1, by - 1, 20, 7);
      ctx.fillStyle = '#7a4c2c'; ctx.fillRect(bx, by, 18, 5);
      ctx.fillStyle = '#9a6a40'; ctx.fillRect(bx + 1, by, 16, 1);
      ctx.fillStyle = band; ctx.fillRect(bx, by, 2, 5); ctx.fillRect(bx + 16, by, 2, 5); ctx.fillRect(bx, by + 4, 18, 1);
      ctx.fillStyle = bandHi; ctx.fillRect(bx + 7, by + 3, 4, 4); ctx.fillStyle = '#1a0f0a'; ctx.fillRect(bx + 8, by + 5, 2, 1);
      if (Math.floor(time * 2 + c.x) % 5 === 0) { ctx.fillStyle = '#ffffff'; ctx.fillRect(bx + 14 - Math.floor((time * 10) % 4), by + 1, 1, 1); }
    } else if (c.mimic) {
      // Gaping mouth, teeth and tongue.
      const open = Math.min(1, age * 5);
      const ly = by - 1 - Math.round(open * 6);
      ctx.fillStyle = '#3a0610'; ctx.fillRect(bx, ly + 5, 18, by + 5 - (ly + 5));
      ctx.fillStyle = '#c8324a'; ctx.fillRect(bx + 5, by + 2, 8, 3);
      ctx.fillStyle = '#fff6e6';
      for (let t = 0; t < 4; t++) { ctx.fillRect(bx + 2 + t * 4, by + 4, 2, 2); ctx.fillRect(bx + 3 + t * 4, ly + 5, 2, 2); }
      ctx.fillStyle = '#1a0f0a'; ctx.fillRect(bx - 1, ly - 1, 20, 7);
      ctx.fillStyle = '#7a4c2c'; ctx.fillRect(bx, ly, 18, 5);
      ctx.fillStyle = band; ctx.fillRect(bx, ly, 2, 5); ctx.fillRect(bx + 16, ly, 2, 5);
      ctx.fillStyle = Math.floor(time * 6) % 2 ? '#ff3a3a' : '#ffcc40'; ctx.fillRect(bx + 5, ly + 2, 2, 1); ctx.fillRect(bx + 11, ly + 2, 2, 1);
    } else {
      // Lid tipped back.
      ctx.fillStyle = '#1a0f0a'; ctx.fillRect(bx - 1, by - 5, 20, 6);
      ctx.fillStyle = '#5a361e'; ctx.fillRect(bx, by - 4, 18, 4);
      ctx.fillStyle = band; ctx.fillRect(bx, by - 4, 2, 4); ctx.fillRect(bx + 16, by - 4, 2, 4);
      ctx.fillStyle = c.looted ? '#2a1a12' : bandHi; ctx.fillRect(bx + 2, by + 4, 14, 2);
    }
  }
  function drawChests() { sceneChests().forEach(drawChest); }

  // ---- Fortune fx (lightning, phoenix) ----
  function updateFortune(dt) {
    for (let i = fortuneFx.length - 1; i >= 0; i--) { fortuneFx[i].life -= dt; if (fortuneFx[i].life <= 0) fortuneFx.splice(i, 1); }
    sceneChests().forEach(c => { if (c.open && !c.mimic && !c.looted && time >= c.lootAt) dropChestLoot(c); });
  }
  function drawFortuneFx() {
    if (!fortuneFx.length) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    fortuneFx.forEach(f => {
      const a = Math.max(0, f.life / f.max);
      if (f.kind === 'bolt') {
        [[5, 'rgba(143,216,255,' + 0.35 * a + ')'], [2, 'rgba(255,240,170,' + a + ')'], [1, 'rgba(255,255,255,' + a + ')']].forEach(([lw, col]) => {
          ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath();
          f.pts.forEach(([px, py], k) => (k ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.stroke();
        });
        const g = ctx.createRadialGradient(f.x, f.y, 1, f.x, f.y, 28);
        g.addColorStop(0, 'rgba(255,240,170,' + 0.6 * a + ')'); g.addColorStop(1, 'rgba(255,240,170,0)');
        ctx.fillStyle = g; ctx.fillRect(f.x - 28, f.y - 28, 56, 56);
      } else if (f.kind === 'phoenix') {
        const p = 1 - a, wing = 30 + p * 40, y = f.y - 30 - p * 30;
        ctx.globalAlpha = a;
        ctx.fillStyle = '#ff6a2a';
        for (let s = -1; s <= 1; s += 2) {
          ctx.beginPath(); ctx.moveTo(f.x, y);
          ctx.quadraticCurveTo(f.x + s * wing * 0.6, y - 26, f.x + s * wing, y - 6);
          ctx.quadraticCurveTo(f.x + s * wing * 0.5, y - 4, f.x, y + 8); ctx.fill();
        }
        ctx.fillStyle = '#ffe08a'; ctx.fillRect(f.x - 2, y - 8, 4, 18);
        ctx.globalAlpha = 1;
      }
    });
    ctx.restore();
  }

  // ---- Blood Moon ----
  function maybeBloodMoon(chance) {
    if (bloodMoon || !REGIONS[platformScene] || Math.random() >= chance) return;
    startBloodMoon();
  }
  function startBloodMoon() {
    bloodMoon = true; bloodMoonAt = time;
    sideMobs.forEach(m => { if (!m.dead && Math.random() < 0.25) rollElite(m); });
    sfx('roar', 0.8, 0.55); sfx('demon', 0.4, 0.8); screenShake = 5; padRumble(0.7, 0.9, 600);
  }
  function drawBloodMoonOverlay() {
    const W = canvas.width, H = canvas.height;
    if (bloodMoon) {
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = 'rgba(255,120,120,1)'; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'source-over';
      const g = ctx.createLinearGradient(0, 0, 0, 120);
      g.addColorStop(0, 'rgba(120,0,16,.4)'); g.addColorStop(1, 'rgba(120,0,16,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, 120);
      for (let i = 0; i < 22; i++) {
        const x = (i * 53 + time * 9 * (1 + i % 3)) % W, y = H - ((i * 37 + time * 16 * (1 + i % 2)) % H);
        ctx.fillStyle = i % 3 ? 'rgba(255,70,70,.55)' : 'rgba(255,170,150,.5)'; ctx.fillRect(Math.round(x), Math.round(y), 1, i % 4 ? 1 : 2);
      }
      ctx.restore();
      const t = time - bloodMoonAt;
      if (t < 4) {
        const a = t < 0.4 ? t / 0.4 : t > 3.2 ? (4 - t) / 0.8 : 1;
        ctx.save(); ctx.globalAlpha = a;
        ctx.fillStyle = 'rgba(20,0,4,.7)'; ctx.fillRect(0, 64, W, 50);
        ctx.fillStyle = '#c8324a'; ctx.fillRect(0, 64, W, 1); ctx.fillRect(0, 113, W, 1);
        // The red moon swells behind the words.
        const r = 14 + Math.min(1, t * 2) * 6;
        const mg = ctx.createRadialGradient(160, 88, 2, 160, 88, r * 2.2);
        mg.addColorStop(0, 'rgba(255,60,70,.5)'); mg.addColorStop(1, 'rgba(255,60,70,0)');
        ctx.fillStyle = mg; ctx.fillRect(160 - r * 2.2, 88 - r * 2.2, r * 4.4, r * 4.4);
        const text = 'THE BLOOD MOON RISES';
        ctx.font = 'bold 13px monospace'; ctx.textAlign = 'left';
        const tw = ctx.measureText(text).width; let cx = 160 - tw / 2;
        for (let i = 0; i < text.length; i++) {
          const ch = text[i], cw = ctx.measureText(ch).width, d = Math.max(0, Math.min(1, (t - i * 0.035) * 4));
          const dy = (1 - d) * -14;
          ctx.globalAlpha = a * d;
          ctx.fillStyle = '#2a0006'; ctx.fillText(ch, cx + 1, 89 + dy + 1);
          ctx.fillStyle = Math.floor(time * 10 + i) % 9 === 0 ? '#ffd0d0' : '#ff3a4a'; ctx.fillText(ch, cx, 89 + dy);
          cx += cw;
        }
        ctx.globalAlpha = a * Math.min(1, Math.max(0, t - 0.9) * 2);
        ctx.font = '6px monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#f3c6c6';
        ctx.fillText('ELITES HUNT  -  DOUBLE XP  -  RICHER LOOT  -  REST TO END IT', 160, 104);
        ctx.restore();
      }
    }
    if (time < witchUntil) {
      const a = Math.min(1, (witchUntil - time) * 2, 1);
      ctx.save();
      ctx.fillStyle = 'rgba(60,110,200,' + 0.16 * a + ')'; ctx.fillRect(0, 0, W, H);
      const vg = ctx.createRadialGradient(160, 120, 70, 160, 120, 210);
      vg.addColorStop(0, 'rgba(20,30,80,0)'); vg.addColorStop(1, 'rgba(20,30,80,' + 0.5 * a + ')');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
  }
  function drawFortuneHUD() {
    // Equipped relics next to the quick slot; the Blood Moon marker after them.
    const n = fortune.slots;
    for (let i = 0; i < n; i++) {
      const x = 167 + i * 12, y = 4, id = fortune.equipped[i];
      ctx.fillStyle = 'rgba(9,10,20,.8)'; ctx.fillRect(x, y, 11, 11);
      ctx.fillStyle = id ? RARITY[RELICS[id].rarity].color : '#3a3042'; ctx.fillRect(x, y + 10, 11, 1);
      if (id) {
        drawRelicIcon(id, x + 1.5, y + 1, 1);
        if (id === 'phoenix' && fortune.phoenixUsed) { ctx.fillStyle = 'rgba(9,10,20,.65)'; ctx.fillRect(x, y, 11, 10); }
      }
    }
    if (bloodMoon) {
      const x = 167 + n * 12 + 6, y = 9;
      ctx.fillStyle = 'rgba(255,40,60,' + (0.25 + Math.sin(time * 3) * 0.1) + ')'; ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#c8324a'; ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ff7080'; ctx.fillRect(x - 2, y - 2, 2, 1);
    }
  }

  // ---- Level-up blessings: pick 1 of 3 random cards ----
  const PERKS = [
    { id: 'vigor', name: 'VIGOR', rarity: 'common', icon: 'heart', pal: ['#2a0a0e', '#e2584f', '#ff9a90', '#fff'], desc: '+6 max HP and a full heal.', give: () => { stats.maxHealth += 6; stats.health = stats.maxHealth; } },
    { id: 'might', name: 'MIGHT', rarity: 'common', icon: 'blade', pal: ['#1a1410', '#d6b477', '#fff1c4', '#8a5a34'], desc: '+4 attack.', give: () => { stats.perkAtk = (stats.perkAtk || 0) + 4; } },
    { id: 'bulwark', name: 'BULWARK', rarity: 'common', icon: 'shield', pal: ['#14161e', '#6f7280', '#b9bcc8', '#5fa8ff'], desc: '+2 defense.', give: () => { stats.perkDef = (stats.perkDef || 0) + 2; } },
    { id: 'endure', name: 'ENDURANCE', rarity: 'common', icon: 'feather', pal: ['#0e2410', '#3f9a3a', '#9be37a', '#fff'], desc: '+20 max stamina.', give: () => { stats.maxStamina += 20; stats.stamina = stats.maxStamina; } },
    { id: 'gold', name: 'GOLD RUSH', rarity: 'common', icon: 'bag', pal: ['#3a2410', '#8a5a34', '#f2c14e', '#fff1a8'], desc: '+45 coins, right now.', give: () => { inventory.coins = (inventory.coins || 0) + 45; sfx('coins'); } },
    { id: 'keen', name: 'KEEN EYE', rarity: 'rare', icon: 'eye', pal: ['#1a1410', '#a8741a', '#ffe08a', '#1a0408'], desc: '+5% critical hit chance.', give: () => { stats.critUp = (stats.critUp || 0) + 1; }, max: () => (stats.critUp || 0) < 6 },
    { id: 'luck', name: 'FORTUNE', rarity: 'rare', icon: 'clover', pal: ['#0e2410', '#3f9a3a', '#9be37a', '#f2c14e'], desc: 'Luck up. Rarer chests, more relics.', give: () => { stats.luck = (stats.luck || 0) + 1; }, max: () => (stats.luck || 0) < 5 },
    { id: 'thirst', name: 'BLOODTHIRST', rarity: 'rare', icon: 'rose', pal: ['#1a0a12', '#a0244a', '#ff6a8a', '#3f9a3a'], desc: 'Heal 1 HP for every kill.', give: () => { stats.thirst = (stats.thirst || 0) + 1; }, max: () => (stats.thirst || 0) < 3 },
    { id: 'moon', name: 'MOONBORN', rarity: 'rare', icon: 'moon', pal: ['#0a1430', '#7fb8ff', '#e6f6ff', '#fff'], desc: 'Moonblade charges 20% faster.', give: () => { stats.chargeUp = (stats.chargeUp || 0) + 1; }, max: () => (stats.chargeUp || 0) < 3 },
    { id: 'slot', name: 'RELIC SLOT', rarity: 'epic', icon: 'star', pal: ['#2a1a40', '#c77dff', '#f0d8ff', '#fff'], desc: 'Wear one more relic.', give: () => { fortune.slots = Math.min(4, fortune.slots + 1); }, max: () => fortune.slots < 4 },
    { id: 'gamble', name: "GAMBLER'S COIN", rarity: 'epic', icon: 'coin', pal: ['#2a1a40', '#c77dff', '#f0d8ff', '#fff'], desc: 'Receive a random relic now.', give: () => { const id = randomRelic(rollRarity(0.6, 'rare')); if (id) grantRelic(id, false); else inventory.coins = (inventory.coins || 0) + 80; }, max: () => RELIC_ORDER.some(id => !RELICS[id].exclusive && !fortune.owned.includes(id)) }
  ];
  function rollPerks() {
    const L = luckValue(), w = { common: 55, rare: 33 * (1 + L * 0.5), epic: 12 * (1 + L) };
    const pool = PERKS.filter(p => !p.max || p.max()), out = [];
    while (out.length < 3 && pool.length) {
      let roll = Math.random() * pool.reduce((s, p) => s + w[p.rarity], 0), pick = pool[0];
      for (const p of pool) { roll -= w[p.rarity]; if (roll <= 0) { pick = p; break; } }
      out.push(pick); pool.splice(pool.indexOf(pick), 1);
    }
    return out;
  }
  function openPerks() {
    const reward = pendingPerks[0];
    if (!reward) return;
    const cards = reward.cards.length === 3 ? reward.cards.map(id => PERKS.find(p => p.id === id)) : rollPerks();
    reward.cards = cards.map(p => p.id);
    perkOffer = { cards, sel: 1, t: time, picked: -1, pickT: 0, level: reward.level };
    openPanel('perk');
    sfx('bookOpen', 0.7); sfx('magic', 0.5, 1.2);
    if (onSave) onSave(getSaveData());
  }
  function pickPerk() {
    const o = perkOffer;
    if (!o || o.picked >= 0 || time - o.t < 0.9) return;
    o.picked = o.sel; o.pickT = time;
    o.cards[o.sel].give();
    pendingPerks.shift();
    if (onSave) onSave(getSaveData());
    sfx('level', 0.6); sfx('uiConfirm'); padRumble(0.4, 0.6, 180);
  }
  function updatePerkPanel() {
    if (panel === 'perk' && perkOffer?.picked >= 0 && time - perkOffer.pickT >= .9) {
      panel = null; perkOffer = null;
    }
  }
  function cardRect(i) { return { x: 160 + (i - 1) * 96 - 42, y: 64, w: 84, h: 116 }; }
  function drawPerkPanel() {
    const o = perkOffer; if (!o) { panel = null; return; }
    const t = time - o.t, W = canvas.width;
    ctx.save();
    ctx.fillStyle = 'rgba(4,4,10,' + Math.min(0.86, t * 3) + ')'; ctx.fillRect(0, 0, W, canvas.height);
    drawRays(160, 120, '242,193,78', Math.min(1, t * 2) * 0.8, 16, 220, 0.12);
    const ta = Math.min(1, t * 3);
    ctx.globalAlpha = ta;
    ctx.textAlign = 'center';
    ctx.font = 'bold 15px monospace'; ctx.fillStyle = '#2a1a12'; ctx.fillText('LEVEL ' + o.level, 161, 32 + (1 - ta) * -10);
    const paper = drawPaper('ribbon', 86, 15, 148, 23);
    ctx.fillStyle = paper ? '#35251f' : '#ffe3a1'; ctx.fillText('LEVEL ' + o.level, 160, 31);
    ctx.font = '7px monospace'; ctx.fillStyle = '#d9cdb8'; ctx.fillText('THE MOON OFFERS A BLESSING. CHOOSE ONE.', 160, 45);
    ctx.fillStyle = '#d6b477'; ctx.fillRect(90, 50, 140, 1);
    ctx.globalAlpha = 1;
    o.cards.forEach((p, i) => {
      const r = cardRect(i), start = 0.3 + i * 0.16, k = clamp((t - start) / 0.4, 0, 1);
      if (k <= 0) return;
      const sel = i === o.sel && o.picked < 0, R = RARITY[p.rarity];
      let lift = sel ? -6 + Math.sin(time * 4) * 1.5 : 0, alpha = 1, grow = 1;
      if (o.picked >= 0) {
        const pt = time - o.pickT;
        if (i === o.picked) { grow = 1 + Math.min(0.12, pt * 0.4); lift = -8; }
        else { alpha = Math.max(0, 1 - pt * 3); lift = pt * 60; }
      }
      const flip = Math.abs(Math.cos(k * Math.PI)), front = k >= 0.5;
      const cx = r.x + r.w / 2, cy = r.y + r.h / 2 + lift + (1 - Math.min(1, k * 2)) * 30;
      ctx.save(); ctx.globalAlpha = alpha * Math.min(1, k * 3);
      ctx.translate(cx, cy); ctx.scale(flip * grow, grow);
      const x = -r.w / 2, y = -r.h / 2;
      if (sel || i === o.picked) {
        ctx.fillStyle = 'rgba(' + R.glow + ',' + (0.25 + Math.sin(time * 6) * 0.1) + ')'; ctx.fillRect(x - 4, y - 4, r.w + 8, r.h + 8);
      }
      ctx.fillStyle = '#0a080d'; ctx.fillRect(x - 1, y - 1, r.w + 2, r.h + 2);
      if (!front) {
        ctx.fillStyle = '#231a2c'; ctx.fillRect(x, y, r.w, r.h);
        ctx.strokeStyle = '#d6b477'; ctx.lineWidth = 1; ctx.strokeRect(x + 3.5, y + 3.5, r.w - 7, r.h - 7);
        ctx.fillStyle = '#d6b477'; ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#231a2c'; ctx.beginPath(); ctx.arc(5, -3, 12, 0, Math.PI * 2); ctx.fill();
      } else {
        const g = ctx.createLinearGradient(0, y, 0, y + r.h);
        g.addColorStop(0, '#2c2236'); g.addColorStop(1, '#141018');
        ctx.fillStyle = g; ctx.fillRect(x, y, r.w, r.h);
        ctx.fillStyle = R.color; ctx.fillRect(x, y, r.w, 2); ctx.fillRect(x, y + r.h - 2, r.w, 2); ctx.fillRect(x, y, 1, r.h); ctx.fillRect(x + r.w - 1, y, 1, r.h);
        ctx.font = 'bold 5px monospace'; ctx.textAlign = 'center'; ctx.fillStyle = R.color; ctx.fillText(R.name, 0, y + 11);
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const ig = ctx.createRadialGradient(0, y + 36, 2, 0, y + 36, 24);
        ig.addColorStop(0, 'rgba(' + R.glow + ',.45)'); ig.addColorStop(1, 'rgba(' + R.glow + ',0)');
        ctx.fillStyle = ig; ctx.fillRect(-24, y + 12, 48, 48); ctx.restore();
        drawRelicIcon(null, -16, y + 20 + Math.round(Math.sin(time * 3 + i) * 1.5), 4, false, p.icon, p.pal);
        ctx.font = 'bold 7px monospace'; ctx.fillStyle = '#fff1c4'; ctx.textAlign = 'center';
        ctx.fillText(p.name, 0, y + 66);
        ctx.fillStyle = '#d6b477'; ctx.fillRect(-20, y + 70, 40, 1);
        wrapText(p.desc, r.w - 12, '6px monospace').slice(0, 4).forEach((ln, j) => { ctx.font = '6px monospace'; ctx.fillStyle = '#d9cdb8'; ctx.fillText(ln, 0, y + 81 + j * 8); });
      }
      if (i === o.picked && time - o.pickT < 0.25) { ctx.fillStyle = 'rgba(255,255,255,' + (1 - (time - o.pickT) * 4) + ')'; ctx.fillRect(x, y, r.w, r.h); }
      ctx.restore();
    });
    if (t > 0.9 && o.picked < 0) {
      ctx.textAlign = 'center'; ctx.font = '6px monospace'; ctx.fillStyle = '#c9bca6';
      ctx.fillText(inputMode === 'pad' ? '✥ CHOOSE     ✕ TAKE BLESSING' : 'LEFT / RIGHT CHOOSE     E TAKE BLESSING', 160, 204);
    }
    ctx.restore();
  }

  // ---- Relic found ----
  function drawRelicReveal() {
    const v = relicReveal; if (!v) { panel = null; return; }
    const R = RELICS[v.id], RR = RARITY[R.rarity], t = time - v.t, W = canvas.width;
    ctx.save();
    ctx.fillStyle = 'rgba(4,4,10,' + Math.min(0.85, t * 3) + ')'; ctx.fillRect(0, 0, W, canvas.height);
    const pop = Math.min(1, t * 2.4);
    drawRays(160, 92, RR.glow, pop, 14, 200, 0.3);
    ctx.textAlign = 'center';
    ctx.font = 'bold 7px monospace'; ctx.fillStyle = RR.color; ctx.globalAlpha = pop;
    ctx.fillText('- ' + RR.name + ' RELIC -', 160, 36);
    ctx.globalAlpha = 1;
    const s = Math.max(1, Math.round(6 * (t < 0.25 ? 0.6 + t * 1.6 : 1)));
    const bob = Math.round(Math.sin(time * 2.5) * 2);
    drawRelicIcon(v.id, 160 - 4 * s, 92 - 4 * s + bob, s);
    if (t < 0.2) { ctx.fillStyle = 'rgba(255,255,255,' + (1 - t * 5) + ')'; ctx.fillRect(0, 0, W, canvas.height); }
    const ta = clamp((t - 0.3) * 3, 0, 1);
    ctx.globalAlpha = ta;
    ctx.font = 'bold 12px monospace'; ctx.fillStyle = '#1a0e1a'; ctx.fillText(R.name.toUpperCase(), 161, 145);
    ctx.fillStyle = RR.color; ctx.fillText(R.name.toUpperCase(), 160, 144);
    ctx.font = 'bold 7px monospace'; ctx.fillStyle = '#fff1c4'; ctx.fillText(R.desc, 160, 157);
    ctx.font = '6px monospace'; ctx.fillStyle = '#b3a796';
    wrapText(R.lore, 230, '6px monospace').slice(0, 3).forEach((ln, i) => ctx.fillText(ln, 160, 170 + i * 8));
    ctx.font = 'bold 6px monospace';
    ctx.fillStyle = v.equipped ? '#9be37a' : '#ffb347';
    ctx.fillText(v.equipped ? 'EQUIPPED' : 'RELIC SLOTS FULL - SWAP IN BAG > RELICS', 160, 200);
    if (t > 0.8) { ctx.font = '6px monospace'; ctx.fillStyle = '#8f8478'; ctx.fillText(inputMode === 'pad' ? '✕ CONTINUE' : 'E CONTINUE', 160, 214); }
    ctx.restore();
  }

  // ---- Bram's Fortune Wheel ----
  const WHEEL_COST = 20;
  const WHEEL_PRIZES = [
    { label: '100c', color: '#f2c14e', ink: '#2a1a12', w: 2, give: () => { inventory.coins += 100; sfx('coins'); return 'JACKPOT! 100 coins!'; } },
    { label: 'NOTHING', color: '#2a2331', ink: '#8f8478', w: 18, give: () => { sfx('uiError'); return 'Nothing. The wheel is a cruel mistress.'; } },
    { label: 'TONIC x2', color: '#a0244a', ink: '#ffe0e8', w: 12, give: () => { inventory.tonic = (inventory.tonic || 0) + 2; sfx('pickup'); return 'Two Red Tonics. Not bad.'; } },
    { label: '30c', color: '#d6b477', ink: '#2a1a12', w: 20, give: () => { inventory.coins += 30; sfx('coins'); return '30 coins. You won a little.'; } },
    { label: 'RELIC', color: '#5fa8ff', ink: '#0a1430', w: 5, give: () => { const id = randomRelic(rollRarity(0.3)); if (!id) { inventory.coins += 60; return 'You own every relic. Have 60 coins.'; } setTimeout(() => grantRelic(id), 500); return 'A RELIC! The wheel smiles on you.'; } },
    { label: 'BREAD x3', color: '#8a5a34', ink: '#fff1c4', w: 16, give: () => { inventory.bread = (inventory.bread || 0) + 3; sfx('pickup'); return 'Three loaves. Fresh. Mostly.'; } },
    { label: '60 XP', color: '#3f9a3a', ink: '#eaffd8', w: 14, give: () => { gainXp(60); return '60 experience. Wisdom of the wheel.'; } },
    { label: 'BLOOD', color: '#5a0610', ink: '#ff8090', w: 8, give: () => { if (bloodMoon) { inventory.coins += 40; return 'The moon is already red. Have 40 coins.'; } setTimeout(startBloodMoon, 300); return 'The BLOOD MOON. Bram goes very pale.'; } }
  ];
  function openWheel() {
    wheel = { angle: wheel ? wheel.angle : 0, spin: null, line: 'Twenty coins a spin. The house always wins, knight.', flash: -10, last: -1 };
    openPanel('wheel'); sfx('uiOpen');
  }
  function spinWheel() {
    if (!wheel || wheel.spin) return;
    if ((inventory.coins || 0) < WHEEL_COST) { sfx('uiError'); wheel.line = 'No coin, no spin. Come back richer.'; return; }
    inventory.coins -= WHEEL_COST; sfx('coin');
    let roll = Math.random() * WHEEL_PRIZES.reduce((s, p) => s + p.w, 0), idx = 0;
    for (let i = 0; i < WHEEL_PRIZES.length; i++) { roll -= WHEEL_PRIZES[i].w; if (roll <= 0) { idx = i; break; } }
    const seg = Math.PI * 2 / WHEEL_PRIZES.length, jitter = (Math.random() - 0.5) * seg * 0.7;
    const target = -Math.PI / 2 - (idx + 0.5) * seg - jitter;
    const from = wheel.angle;
    let delta = ((target - from) % (Math.PI * 2) + Math.PI * 4) % (Math.PI * 2);
    wheel.spin = { from, to: from + Math.PI * 2 * (5 + Math.floor(Math.random() * 2)) + delta, t0: time, dur: 3.6, idx };
    wheel.line = 'Round and round she goes...';
  }
  function updateWheel() {
    const s = wheel && wheel.spin; if (!s) return;
    const k = clamp((time - s.t0) / s.dur, 0, 1), e = 1 - Math.pow(1 - k, 4);
    wheel.angle = s.from + (s.to - s.from) * e;
    const seg = Math.PI * 2 / WHEEL_PRIZES.length, cur = Math.floor((wheel.angle + Math.PI / 2) / seg);
    if (cur !== wheel.last) { wheel.last = cur; sfx('tick', 0.6, 1.2 + Math.random() * 0.2); }
    if (k >= 1) {
      wheel.spin = null; wheel.flash = time; wheel.won = s.idx;
      wheel.line = WHEEL_PRIZES[s.idx].give();
      if (s.idx === 0 || s.idx === 4) { sfx('victory', 0.7); padRumble(0.6, 0.8, 300); }
      if (onSave) onSave(getSaveData());
    }
  }
  function drawWheel() {
    if (!wheel) { panel = null; return; }
    updateWheel();
    const W = canvas.width, cx = 160, cy = 120, r = 64, n = WHEEL_PRIZES.length, seg = Math.PI * 2 / n;
    ctx.save();
    ctx.fillStyle = 'rgba(4,4,10,.84)'; ctx.fillRect(0, 0, W, canvas.height);
    drawRays(cx, cy, '242,193,78', 0.6, 16, 200, 0.15);
    ctx.textAlign = 'center'; ctx.font = 'bold 12px monospace';
    ctx.fillStyle = '#2a1a12'; ctx.fillText("BRAM'S FORTUNE WHEEL", 161, 25); ctx.fillStyle = '#ffe3a1'; ctx.fillText("BRAM'S FORTUNE WHEEL", 160, 24);
    ctx.font = '6px monospace'; ctx.fillStyle = '#c9e39a'; ctx.fillText(wheel.line, 160, 36);
    // Rim and segments.
    ctx.fillStyle = '#0a080d'; ctx.beginPath(); ctx.arc(cx, cy, r + 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#7a5a22'; ctx.beginPath(); ctx.arc(cx, cy, r + 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#d6b477'; ctx.beginPath(); ctx.arc(cx, cy, r + 4, 0, Math.PI * 2); ctx.fill();
    WHEEL_PRIZES.forEach((p, i) => {
      const a0 = wheel.angle + i * seg, a1 = a0 + seg;
      const win = wheel.won === i && time - wheel.flash < 2 && Math.floor((time - wheel.flash) * 8) % 2 === 0;
      ctx.fillStyle = win ? '#ffffff' : p.color;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, a0, a1); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#0a080d'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a0) * r, cy + Math.sin(a0) * r); ctx.stroke();
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(a0 + seg / 2);
      ctx.font = 'bold 6px monospace'; ctx.textAlign = 'right'; ctx.fillStyle = win ? '#2a1a12' : p.ink;
      ctx.fillText(p.label, r - 6, 2); ctx.restore();
    });
    // Bulbs.
    for (let i = 0; i < 16; i++) {
      const a = i * Math.PI / 8, on = (Math.floor(time * (wheel.spin ? 12 : 3)) + i) % 2 === 0;
      ctx.fillStyle = on ? '#fff6c8' : '#7a5a22';
      ctx.fillRect(Math.round(cx + Math.cos(a) * (r + 4)) - 1, Math.round(cy + Math.sin(a) * (r + 4)) - 1, 2, 2);
    }
    // Hub with a little moon.
    ctx.fillStyle = '#0a080d'; ctx.beginPath(); ctx.arc(cx, cy, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#d6b477'; ctx.beginPath(); ctx.arc(cx, cy, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff1c4'; ctx.beginPath(); ctx.arc(cx - 1, cy, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#d6b477'; ctx.beginPath(); ctx.arc(cx + 1, cy - 1, 4, 0, Math.PI * 2); ctx.fill();
    // Pointer at the top, it kicks on every tick.
    const kick = wheel.spin ? Math.sin(time * 40) * 1.5 : 0;
    ctx.fillStyle = '#0a080d'; ctx.beginPath(); ctx.moveTo(cx - 7, cy - r - 12); ctx.lineTo(cx + 7, cy - r - 12); ctx.lineTo(cx + kick, cy - r + 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ff4a3a'; ctx.beginPath(); ctx.moveTo(cx - 5, cy - r - 11); ctx.lineTo(cx + 5, cy - r - 11); ctx.lineTo(cx + kick, cy - r + 2); ctx.closePath(); ctx.fill();
    // Coins and controls.
    drawItemIcon('coin', 254, 8, 1);
    invText(String(inventory.coins || 0), 290, 17, time - wheel.flash < 0.4 ? '#ffffff' : '#ffe3a1', 'bold 7px monospace', 'right');
    invText(inputMode === 'pad' ? '✕ SPIN (' + WHEEL_COST + 'c)    ○ LEAVE' : 'E SPIN (' + WHEEL_COST + 'c)    ESC LEAVE', 160, 214, '#c9bca6', '6px monospace', 'center');
    ctx.restore();
  }

  // ---- Panel input for the fortune screens ----
  function fortunePanel() { return panel === 'perk' || panel === 'relic' || panel === 'wheel' || panel === 'peddler'; }
  function fortuneInput(act) {
    if (panel === 'peddler') { peddlerInput(act); return; }
    if (panel === 'perk') {
      const o = perkOffer; if (!o || o.picked >= 0) return;
      if (act === 'left') { o.sel = (o.sel + 2) % 3; sfx('uiMove'); }
      else if (act === 'right') { o.sel = (o.sel + 1) % 3; sfx('uiMove'); }
      else if (act === 'ok') pickPerk();
    } else if (panel === 'relic') {
      if ((act === 'ok' || act === 'back') && relicReveal && time - relicReveal.t > 0.8) { panel = null; relicReveal = null; sfx('uiConfirm'); }
    } else if (panel === 'wheel') {
      if (act === 'ok') spinWheel();
      else if (act === 'back' && !(wheel && wheel.spin)) { panel = null; openShop(); }
    }
  }
  function fortuneKey(k) {
    if (k === 'arrowup' || k === 'w') fortuneInput('up');
    else if (k === 'arrowdown' || k === 's') fortuneInput('down');
    else if (k === 'arrowleft' || k === 'a') fortuneInput('left');
    else if (k === 'arrowright' || k === 'd') fortuneInput('right');
    else if (k === 'e' || k === 'enter' || k === ' ' || k === 'j') fortuneInput('ok');
    else if (k === 'escape' || k === 'x' || k === 'backspace' || k === 'i') fortuneInput('back');
  }
  function fortunePad(action) {
    if (action === 'primary' || action === 'attack') fortuneInput('ok');
    else if (action === 'back' || action === 'inventory') fortuneInput('back');
  }
  function fortunePointer(p) {
    if (panel === 'perk' && perkOffer) {
      for (let i = 0; i < 3; i++) {
        const r = cardRect(i);
        if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y - 8 && p.y <= r.y + r.h) { if (perkOffer.sel === i) pickPerk(); else { perkOffer.sel = i; sfx('uiMove'); } return; }
      }
    } else fortuneInput('ok');
  }
  function maybeOpenPerks() {
    if (!pendingPerks.length || paused || panel || dialogue || bossOutro || bossFight ||
        sidePlayer.deadTime > 0 || sidePlayer.hurtTime > 0 || !sidePlayer.onGround ||
        sidePlayer.pray || sidePlayer.roll || sidePlayer.atk || sidePlayer.charge || tideArena) return;
    if (!insideHouse && !safeZone() && sideMobs.some(m => !m.dead && !m.dormant && Math.abs(m.x - sidePlayer.x) < 125)) return;
    openPerks();
  }

  // ---- Bag > RELICS tab ----
  function relicSlotRect(i) { return { x: 122 + (i % RELIC_COLS) * 23, y: 84 + Math.floor(i / RELIC_COLS) * 26, w: 20, h: 22 }; }
  function toggleRelic() {
    const id = RELIC_ORDER[relicSel];
    if (!fortune.owned.includes(id)) { sfx('uiError'); invShake = time; return; }
    const at = fortune.equipped.indexOf(id);
    if (at >= 0) { fortune.equipped.splice(at, 1); sfx('uiBack'); }
    else if (fortune.equipped.length < fortune.slots) { fortune.equipped.push(id); sfx('armor', 0.6); sfx('magic', 0.4, 1.4); }
    else { sfx('uiError'); invShake = time; }
    if (onSave) onSave(getSaveData());
  }
  function drawRelicsTab(x, y, w) {
    invText('EQUIPPED  ' + fortune.equipped.length + '/' + fortune.slots, x + 4, y + 8, '#ffe3a1', 'bold 7px monospace');
    for (let i = 0; i < 4; i++) {
      const sx = x + 4 + i * 26, sy = y + 12, id = fortune.equipped[i], locked = i >= fortune.slots;
      invBox(sx, sy, 22, 22, locked ? '#100c14' : '#231d2a', id ? RARITY[RELICS[id].rarity].color : '#4b3d35');
      if (locked) { ctx.fillStyle = '#3a3042'; ctx.fillRect(sx + 8, sy + 10, 6, 5); ctx.fillRect(sx + 9, sy + 7, 4, 3); ctx.fillStyle = '#100c14'; ctx.fillRect(sx + 10, sy + 8, 2, 2); }
      else if (id) drawRelicIcon(id, sx + 3, sy + 3, 2);
    }
    invText('CRIT ' + Math.round(critChance() * 100) + '%', x + w - 4, y + 18, '#ffb347', '6px monospace', 'right');
    invText('LUCK +' + Math.round(luckValue() * 100) + '%', x + w - 4, y + 27, '#9be37a', '6px monospace', 'right');
    if (bloodMoon) invText('BLOOD MOON', x + w - 4, y + 36, '#ff5a6a', 'bold 6px monospace', 'right');
    invText('COLLECTION  ' + fortune.owned.length + '/' + RELIC_ORDER.length, x + 4, y + 41, '#b3a796', '6px monospace');
    RELIC_ORDER.forEach((id, i) => {
      const r = relicSlotRect(i), owned = fortune.owned.includes(id), eq = fortune.equipped.includes(id);
      invBox(r.x, r.y, r.w, r.h, eq ? '#2c2433' : '#1d1824', owned ? RARITY[RELICS[id].rarity].color : '#3a3042');
      drawRelicIcon(id, r.x + 3, r.y + 3, 2, !owned);
      if (eq) { ctx.fillStyle = '#9be37a'; ctx.fillRect(r.x + r.w - 4, r.y + 1, 3, 3); }
      if (i === relicSel) invCursor(r.x, r.y, r.w, r.h);
    });
    const id = RELIC_ORDER[relicSel], R = RELICS[id], owned = fortune.owned.includes(id);
    const shake = time - invShake < 0.25 ? Math.round(Math.sin(time * 80) * 2) : 0;
    invBox(x + 2 + shake, y + 98, w - 4, 70, '#1b1621', '#4b3d35');
    if (owned) {
      invText(R.name.toUpperCase(), x + 8 + shake, y + 109, RARITY[R.rarity].color, 'bold 7px monospace');
      invText(RARITY[R.rarity].name, x + w - 8 + shake, y + 109, RARITY[R.rarity].color, '5px monospace', 'right');
      invText(R.desc, x + 8 + shake, y + 119, '#fff1c4', '6px monospace');
      wrapText(R.lore, w - 18, '6px monospace').slice(0, 4).forEach((ln, i) => invText(ln, x + 8 + shake, y + 130 + i * 8, '#a99f9a', '6px monospace'));
      invText(fortune.equipped.includes(id) ? 'EQUIPPED' : fortune.equipped.length < fortune.slots ? 'READY TO EQUIP' : 'SLOTS FULL', x + w - 8 + shake, y + 164, fortune.equipped.includes(id) ? '#9be37a' : '#8f8478', 'bold 5px monospace', 'right');
    } else {
      invText('??? - ' + RARITY[R.rarity].name, x + 8 + shake, y + 109, '#6f6670', 'bold 7px monospace');
      ['Not yet found. Relics hide in treasure', 'chests and drop from elite monsters,', 'bosses and the Fortune Wheel.'].forEach((ln, i) => invText(ln, x + 8 + shake, y + 122 + i * 9, '#8f8478', '6px monospace'));
    }
  }

  // ---- Old Bram's shop ----
  const SHOP_ITEMS = [
    { name: 'Camp Bread', icon: 'bread', info: 'Heals 10 HP', price: () => 5, give: () => { inventory.bread = (inventory.bread || 0) + 1; } },
    { name: 'Red Tonic', icon: 'tonic', info: 'Full heal', price: () => 12, give: () => { inventory.tonic = (inventory.tonic || 0) + 1; } },
    { name: 'Whetstone', icon: 'whetstone', info: () => 'Sword ATK +1  (' + (stats.atkUp || 0) + '/3)', price: () => 30 + (stats.atkUp || 0) * 15, can: () => (stats.atkUp || 0) < 3, give: () => { stats.atkUp = (stats.atkUp || 0) + 1; } },
    { name: 'Iron Plating', icon: 'plate', info: () => 'Armor DEF +1  (' + (stats.defUp || 0) + '/3)', price: () => 30 + (stats.defUp || 0) * 15, can: () => (stats.defUp || 0) < 3, give: () => { stats.defUp = (stats.defUp || 0) + 1; } },
    { name: 'Fortune Wheel', icon: 'coin', info: 'Spin for prizes... or nothing', price: () => WHEEL_COST, wheel: true },
    { name: 'Sell All Loot', icon: 'coin', info: () => sellValue() ? 'Trophies & materials: +' + sellValue() + 'c' : 'Nothing to sell', sell: true },
    { name: 'Leave', icon: null, info: '', leave: true }
  ];
  let shopSel = 0, shopLine = '', shopFlash = -10, shopkeeper = 'bram';
  const shopStock = () => shopkeeper === 'bram' ? SHOP_ITEMS : SHOP_ITEMS.filter(i =>
    (shopkeeper === 'elin' ? ['bread', 'tonic'] : ['bread', 'tonic', 'plate']).includes(i.icon) || i.sell || i.leave);
  const SELLABLE = ['fang', 'spore', 'eye', 'bone', 'wisp', 'wood', 'ember', 'feather', 'lampglass', 'toadskin'];
  function sellValue() { return SELLABLE.reduce((sum, k) => sum + (inventory[k] || 0) * ITEM_DEFS[k].value, 0); }
  function openShop(who = 'bram') {
    shopkeeper = who;
    shopSel = 0;
    shopLine = who === 'elin' ? 'Pick a loaf. I’ll find you a bag.' : who === 'nessel' ? 'Keep the tonic corked till you need it.' :
      ['Coin for comfort, knight. What\'ll it be?', 'Your father bought a whetstone too. Two, actually.', 'Bread\'s fresh. Mostly.'][Math.floor(Math.random() * 3)];
    openPanel('shop'); sfx('uiOpen');
  }
  function buyShopItem(i) {
    const it = shopStock()[i];
    if (!it) return;
    if (it.leave) { closeCurrentPanel(); sfx('uiClose'); return; }
    if (it.wheel) { openWheel(); return; }
    if (it.sell) {
      const v = sellValue();
      if (!v) { sfx('uiError'); shopLine = 'Bring me fangs, bones and wisps. I pay fair.'; return; }
      SELLABLE.forEach(k => { inventory[k] = 0; });
      inventory.coins = (inventory.coins || 0) + v;
      sfx('coins'); shopFlash = time; shopLine = 'Pleasure doing business. ' + v + ' coins, as promised.';
      if (onSave) onSave(getSaveData());
      return;
    }
    const price = it.price();
    if (it.can && !it.can()) { sfx('uiError'); shopLine = 'Any more and it\'ll snap, friend.'; return; }
    if ((inventory.coins || 0) < price) { sfx('uiError'); shopLine = 'Come back with ' + (price - (inventory.coins || 0)) + ' more coins.'; return; }
    inventory.coins -= price; it.give();
    sfx(it.icon === 'whetstone' ? 'draw' : it.icon === 'plate' ? 'armor' : 'coin'); shopFlash = time;
    shopLine = shopkeeper === 'elin' ? 'Mind the crumbs out there.' : shopkeeper === 'nessel' ? 'Keep it dry if you can.' :
      it.icon === 'whetstone' ? 'Sharper than your father\'s wit.' : it.icon === 'plate' ? 'Riveted it myself. Should hold.' : 'Enjoy.';
    if (onSave) onSave(getSaveData());
  }
  function shopKey(k) {
    const length = shopStock().length;
    if (k === 'arrowup' || k === 'w') { shopSel = (shopSel + length - 1) % length; sfx('uiMove'); }
    else if (k === 'arrowdown' || k === 's') { shopSel = (shopSel + 1) % length; sfx('uiMove'); }
    else if (k === 'e' || k === 'enter' || k === ' ') buyShopItem(shopSel);
    else if (k === 'escape' || k === 'i' || k === 'x' || k === 'backspace') { closeCurrentPanel(); sfx('uiClose'); }
  }
  function drawShop() {
    ctx.save();
    ctx.fillStyle = 'rgba(4,5,10,.7)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    invBox(56, 22, 208, 196, '#1b1621', '#d6b477');
    drawPortrait(shopkeeper, 64, 30);
    invText(shopkeeper === 'elin' ? 'ELIN’S BAKEHOUSE' : shopkeeper === 'nessel' ? 'NESSEL’S COUNTER' : "OLD BRAM'S WARES", 112, 40, '#ffe3a1', 'bold 9px monospace');
    wrapText(shopLine, 140, '6px monospace').slice(0, 2).forEach((ln, i) => invText(ln, 112, 52 + i * 8, '#c9e39a', '6px monospace'));
    drawItemIcon('coin', 222, 30, 1);
    invText(String(inventory.coins || 0), 256, 39, time - shopFlash < 0.3 ? '#ffffff' : '#ffe3a1', 'bold 7px monospace', 'right');
    shopStock().forEach((it, i) => {
      const ry = 74 + i * 18, sel = i === shopSel;
      const price = it.price ? it.price() : 0;
      const locked = it.can && !it.can();
      const poor = it.price && (inventory.coins || 0) < price;
      invBox(66, ry, 188, 16, sel ? '#2c2433' : '#211b28', sel ? '#d6b477' : '#4b3d35');
      if (it.icon) drawItemIcon(it.icon, 69, ry + 2, 1);
      invText(it.name, 86, ry + 7, locked ? '#6f6670' : '#f3e7c9', 'bold 7px monospace');
      const info = typeof it.info === 'function' ? it.info() : it.info;
      invText(info, 86, ry + 14, '#8f8478', '5px monospace');
      if (it.price) invText(locked ? 'MAX' : price + 'c', 248, ry + 10, locked ? '#6f6670' : poor ? '#e2584f' : '#ffe3a1', 'bold 7px monospace', 'right');
      if (sel) invCursor(66, ry, 188, 16);
    });
    invText(inputMode === 'pad' ? '✥ CHOOSE   ✕ BUY   ○ LEAVE' : 'ARROWS CHOOSE   E BUY   ESC LEAVE', 160, 210, '#8f8478', '6px monospace', 'center');
    ctx.restore();
  }

  const CHAPTERS = {
    1: { title: 'THE HOLLOW KING', color: '#ffe3a1', tease: 'The shard is still out there...', next: 'NEXT: TALK TO DAD AT THE WATCH SEAL' },
    2: { title: 'THE ASHEN PASS', color: '#ffb48a', tease: 'The riders went to the drowned city...', next: 'NEXT: CHAPTER 3 - GLOAMHOLD' },
    3: { title: 'THE MOON-EATER', color: '#8fd8ff', tease: 'Mother is alive. The Pale Court has her.', next: 'NEXT: FOLLOW THE EAST ROAD TO LANTERN QUAY' },
    4: { title: 'THE PALE COURT', color: '#b8e5d0', tease: 'Somebody is singing beneath the gallery.', next: 'THE LOWER WELL REMAINS SEALED' }
  };
  let chapterShown = 1;
  function openChapterPanel(n) { chapterShown = n; openPanel('chapter'); sfx('victory', 0.6); }
  function drawChapterPanel() {
    const W = canvas.width, H = canvas.height;
    const t = time - invOpenTime;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,' + Math.min(0.9, t * 1.5) + ')'; ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = Math.min(1, Math.max(0, (t - 0.3) * 2));
    ctx.textAlign = 'center';
    const C = CHAPTERS[chapterShown] || CHAPTERS[1];
    ctx.font = 'bold 8px monospace'; ctx.fillStyle = '#d6b477'; ctx.fillText('CHAPTER ' + chapterShown, 160, 54);
    ctx.font = 'bold 16px monospace'; ctx.fillStyle = '#2a1a12'; ctx.fillText(C.title, 161, 77);
    ctx.fillStyle = C.color; ctx.fillText(C.title, 160, 76);
    ctx.fillStyle = '#d6b477'; ctx.fillRect(80, 86, 160, 1);
    ctx.font = 'bold 9px monospace'; ctx.fillStyle = '#9be37a'; ctx.fillText('COMPLETE', 160, 100);
    const rows = [
      ['LEVEL', String(stats.level)],
      ['MONSTERS DEFEATED', String(stats.kills || 0)],
      ['STORIES HEARD', story.pages.length + ' / ' + LORE.length],
      ['COINS', String(inventory.coins || 0)],
      ['PLAY TIME', Math.floor(stats.playTime / 60) + ':' + String(Math.floor(stats.playTime % 60)).padStart(2, '0')]
    ];
    rows.forEach(([a, b], i) => {
      invText(a, 92, 120 + i * 12, '#b9ad9c', '7px monospace', 'left');
      invText(b, 228, 120 + i * 12, '#ffe3a1', 'bold 7px monospace', 'right');
    });
    ctx.globalAlpha = Math.min(1, Math.max(0, (t - 1.2) * 2));
    invText(C.tease, 160, 192, '#c9a8ff', '7px monospace', 'center');
    invText(C.next, 160, 204, '#8f8478', 'bold 6px monospace', 'center');
    if (t > 1.5) invText(K('E') + ' / TAP TO CONTINUE', 160, 222, '#f3e7c9', '7px monospace', 'center');
    ctx.restore();
  }

  // ---- Dad (Aldric) ----
  const WATCH_SEAL_X = 2548, ALDRIC_POST_X = 2573;
  const dadAtSeal = () => ({ x: ALDRIC_POST_X, dir: -1, t: 0 });
  let dad = null;
  let dadTalk = 0;
  let bossOutro = null;
  function updateDad(dt) {
    if (!dad) return;
    dad.t += dt;
    dad.dir = story.dadFound && sidePlayer.x >= dad.x ? 1 : -1;
  }
  function drawDad() {
    if (!dad) return;
    const tending = !story.dadFound && imgReady(hollowArt.dadWard);
    const sheet = tending ? hollowArt.dadWard : hollowArt.dadIdle;
    if (!imgReady(sheet)) return;
    const f = prefersReducedMotion() ? 0 : Math.floor(dad.t * (tending ? 2 : 6)) % (tending ? 2 : 4);
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(Math.round(dad.x) - 10, SIDE_GROUND_Y - 1, 20, 2);
    ctx.save();
    ctx.translate(Math.round(dad.x), SIDE_GROUND_Y + 1);
    if (dad.dir < 0) ctx.scale(-1, 1);
    ctx.drawImage(sheet, f * 128, 0, 128, 96, -64, -96, 128, 96);
    ctx.restore();
  }
  function talkToDad() {
    if (!story.bossDefeated && !story.dadFound && !story.chapterDone) {
      startDialogue([
        { who: 'rowan', text: 'Dad?' },
        { who: 'aldric', text: 'Stay on this side of the stone. Grukk has been waiting for me to lift my hands.' },
        { who: 'rowan', text: 'Let me take over.' },
        { who: 'aldric', text: 'He will be on us before we can trade places. Stop him first. Then I need your hands here.' }
      ]);
      return;
    }
    if (!story.dadFound && !story.chapterDone) {
      startDialogue([
        { who: 'aldric', text: 'Rowan? Put your palm on the silver tree. Hold it steady.' },
        { who: 'rowan', text: 'Like this? The stone is warm.' },
        { who: 'aldric', text: 'That is it. Grukk broke the lower seal digging out the shard. This inner ward is the only thing keeping the dead below us.' },
        { who: 'rowan', text: 'How long have you been holding it?' },
        { who: 'aldric', text: 'Two days. Easier with two hands. There. Let go slowly.' },
        { who: 'aldric', text: 'His crown held only a splinter. Grukk sold the real shard to pale riders. They rode east a week ago. Are you hurt?' },
        { who: 'rowan', text: 'I can stand. Tell me what happened here.' },
        { who: 'aldric', text: 'I will. Give me one breath.' }
      ], () => {
        story.dadFound = true; story.chapterDone = true;
        addLore('aldric'); bossOutro = null;
        if (onSave) onSave(getSaveData());
        openChapterPanel(1);
      });
      return;
    }
    if (story.chapterDone && !story.ch2Started) {
      startDialogue([
        { who: 'aldric', text: 'I should have told you why I left. I thought the less you knew, the safer you would be.' },
        { who: 'aldric', text: 'Twenty winters ago, Morwen tried to pull the moon down. We call it the Moonfall.' },
        { who: 'rowan', text: 'She meant to break it?' },
        { who: 'aldric', text: 'No. Her little girl froze the winter the moon went dark. She wanted a moon that would never go dark again.' },
        { who: 'aldric', text: 'We stopped her, but not before it broke. We buried the biggest piece here. Morwen got away.' },
        { who: 'rowan', text: 'Those riders who took it. Do they serve her?' },
        { who: 'aldric', text: 'The Pale Court, yes. Find our scout in the Ashen Pass. I will stay and make sure the ward holds.' }
      ], () => {
        story.ch2Started = true; addLore('oath');
        notice = 'New path: the Ashen Pass lies at the east exit.'; noticeUntil = time + 3;
        sfx('magic');
        if (onSave) onSave(getSaveData());
      });
      return;
    }
    const lines = [
      [{ who: 'aldric', text: "Your mother would have been proud of you today. Furious, but proud." }],
      [{ who: 'aldric', text: 'The Ashen Pass is through the east exit. Find the Watch scout at the lookout fire.' }, { who: 'rowan', text: 'I will find her.' }],
      [{ who: 'aldric', text: 'Does Bram still sell that bread? Leave the burnt ones. He does it on purpose.' }],
      [{ who: 'aldric', text: "Hold your strike and let the moon gather in the blade. The Watch called it a Moonblade. I taught your mother that one." }]
    ];
    startDialogue(lines[dadTalk++ % lines.length]);
  }

  // ---- Boss fight ----
  function theBoss() { return sideMobs.find(m => m.T.boss); }
  const BOSS_LINES = {
    ogre: {
      first: [
        { who: 'grukk', text: 'Silver Watch. Another one? I left the last knight clinging to a stone.' },
        { who: 'rowan', text: "Where is he?" },
        { who: 'grukk', text: 'At his precious seal. Wait long enough and you can dig him out yourself.' }],
      retry: [{ who: 'grukk', text: "You really don't know when to quit." }],
      tip: 'Jump over his shockwaves!', flag: 'bossStarted'
    },
    mare: {
      first: [
        { who: 'ashmane', text: 'I can smell the shard on you.' },
        { who: 'rowan', text: 'Can you smell the riders who took it?' },
        { who: 'ashmane', text: 'My Queen went on ahead. She told me to keep the road clear.' },
        { who: 'rowan', text: "I take it asking nicely won't help." }],
      retry: [{ who: 'ashmane', text: 'I heard you coming this time.' }],
      tip: 'Roll through her charge, strike while she is dazed!', flag: 'passBossStarted'
    },
    demon: {
      first: [
        { who: 'vael', text: "Silver Watch. Last one I saw was trying to swim in that armor." },
        { who: 'rowan', text: 'Where did they take the shard?' },
        { who: 'vael', text: "Ask the Queen. She only tells me when it's time to eat." }],
      retry: [{ who: 'vael', text: 'I was hoping you’d come back.' }],
      tip: 'Upper slash reaches him in the air. Roll through the moonfire!', flag: 'gloamBossStarted'
    }
  };
  // ---------------------------------------------------------------------------
  // Boss entrance cinematics: letterbox bars, the camera swings to the boss,
  // it does its signature move, and its name card burns in above its head.
  const CINE_END = 4.5;
  const PHASE_REVEAL = 1.05;
  const PHASE_END = 3.55;
  // Phase-two identity, for the name card and matching sprite tint.
  const BOSS_FORMS = {
    ogre: ['THE BROKEN CROWN', "Don't touch my crown!", '#a45987', '#ffbcaa'],
    mare: ['THE UNBRIDLED', 'I never needed reins.', '#8e48a5', '#ffe3aa'],
    demon: ['THE HUNGER', "Still here? Good. I'm hungry.", '#4757a6', '#a5edff'],
    skarn: ['THE BONE MASK', "Fine. I'll wear hers.", '#825340', '#f2d6a4'],
    mourn: ['THE LAST WATCH', 'I can hear them again.', '#536699', '#c9e1ff'],
    wyrm: ['THE EMBER STAR', "Get back. It's waking up.", '#be442a', '#ffdc7a'],
    tidemaw: ['THE CRACKED BELL', 'No. Not the bell.', '#386e64', '#c3f8cb']
  };
  const PHASE_SHOWS = {
    ogre:       { aura: 'shadow-step', burst: 'air-burst', cue: 'slam', ground: true, split: true },
    mare:       { aura: 'arc-discharge', burst: 'air-burst', cue: 'fire', ground: true, split: true },
    demon:      { aura: 'hex-sigil', burst: 'void-rift', cue: 'demon' },
    skarn:      { aura: 'shadow-step', burst: 'air-burst', cue: 'slam', ground: true, split: true },
    mourn:      { aura: 'hex-sigil', burst: 'shadow-step', cue: 'ghost', split: true },
    wyrm:       { aura: 'fireball-impact', burst: 'fireball-impact', cue: 'fire', ground: true, split: true },
    tidemaw:    { aura: 'ripple', burst: 'arc-discharge', cue: 'gem', ground: true },
    saltStag:   { aura: 'ripple', burst: 'arc-discharge', cue: 'clash', ground: true, split: true },
    wellKeeper: { aura: 'hex-sigil', burst: 'void-rift', cue: 'magic' }
  };
  function beginBossSecondPhase(m) {
    Object.assign(bossFight, { phaseTwo: true, intro: true, cine: true, active: false, t: 0, ev: {}, skipPhase: false });
    clearHeldInput();
    Object.assign(sidePlayer, { atk: null, charge: null, roll: null, attackTime: 0, vx: 0 });
    Object.assign(m, { attackTime: 0, moving: false, kvx: 0, tele: false, dir: sidePlayer.x < m.x ? -1 : 1 });
    mobShots.length = groundFires.length = bossWaves.length = cineFx.length = sporeClouds.length = playerWaves.length = 0;
    sfx('magic', 0.55, 0.62);
  }
  function updateBossSecondPhase(c, boss, dt) {
    c.t += dt;
    boss.flash = Math.max(0, boss.flash - dt);
    if (!c.skipPhase && cineEvent(c, 'break', PHASE_REVEAL)) {
      boss.enraged = true;
      const show = PHASE_SHOWS[boss.type];
      if (!prefersReducedMotion()) {
        screenShake = 2.5;
        padRumble(.46, .58, 210);
      }
      sfx(show.cue, .88, .82);
    }
    if (!c.skipPhase && c.t < PHASE_END) return;
    boss.enraged = true;
    clearHeldInput();
    Object.assign(c, { phaseTwo: false, intro: false, cine: false, active: true, skipPhase: false });
    cineFx.length = 0;
    Object.assign(boss, { st: 'stalk', stT: 0, attackCooldown: 1.2, attackTime: 0, tele: false, swoop: null,
      moving: false, hewDone: false, waveDone: false, second: false, stomped: false, breathHit: false, fired: false });
    sidePlayer.invulnTime = Math.max(sidePlayer.invulnTime, 0.7);
    const flank = sidePlayer.x < (BOSS_ARENA.left + BOSS_ARENA.right) / 2 ? BOSS_ARENA.right - 55 : BOSS_ARENA.left + 55;
    const add = makeMob(boss.T.summon || 'ghost', flank, 42, 0);
    Object.assign(add, { respawn: Infinity, summoned: true, attackCooldown: 1.65, dormant: false });
    sideMobs.push(add);
  }
  function phasePose(m) {
    if (!m.T.boss || !bossFight?.phaseTwo || m !== theBoss()) return null;
    const p = (bossFight.t - PHASE_REVEAL + .26) / 1.28;
    return p >= 0 && p <= 1 ? p : null;
  }
  function drawBossPhaseArt(m) {
    if (!m.T.boss || m.dead) return;
    const show = PHASE_SHOWS[m.type];
    if (!show) return;
    const c = bossFight?.phaseTwo && m === theBoss() ? bossFight : null;
    const t = c ? c.t : time, x = m.x, y = m.y - m.T.bodyH * .54;
    const floor = Math.min(SIDE_GROUND_Y, m.y + 3);
    const size = clamp(m.T.bodyH / 60, .74, 1.28);
    if (!c) {
      // Keep combat readability: a quiet accent only during uncommitted movement.
      if (m.enraged && !m.tele && m.attackTime <= 0 && !prefersReducedMotion()) {
        drawFoundry(show.aura, x, m.T.fly ? y : floor - 7, t, size * .74, -m.dir, .23, true);
      }
      return;
    }
    const low = prefersReducedMotion(), p = t - PHASE_REVEAL;
    const fade = smooth01(t / .37) * (1 - smooth01((t - 2.64) / .69));
    if (p < 0) {
      drawFoundry(show.aura, x, m.T.fly ? y + 7 : floor - 7, .26 + t, size * (1.12 + (low ? 0 : t * .13)), -m.dir, fade * .82, true);
    } else {
      const a = fade * (1 - smooth01((p - .78) / .91));
      if (low) {
        drawFoundry(show.burst, x, show.ground ? floor - 9 : y, .36, size * 1.28, -m.dir, a, true);
      } else if (show.split) {
        for (const dir of [-1, 1]) {
          drawFoundry(show.burst, x + dir * (24 * size + p * 9), show.ground ? floor - 13 : y,
            .16 + p * .75, size * 1.44, dir, a);
        }
      } else {
        drawFoundry(show.burst, x, show.ground ? floor - 8 : y - 9, .2 + p * .78, size * 1.6, -m.dir, a);
      }
      drawFoundry('ripple', x, floor + 1, .15 + p * .71, size * 1.19, 1, a * .53);
    }
  }
  function drawSecondPhase(c, boss) {
    const [title, line, shade, hot] = BOSS_FORMS[boss.type], t = c.t;
    const k = clamp(Math.min(t * 4, (PHASE_END - t) * 4), 0, 1), bar = Math.round(29 * k);
    ctx.save();
    const vignette = ctx.createRadialGradient(boss.x - sideCameraX, boss.y - 45, 26, boss.x - sideCameraX, boss.y - 45, 169);
    vignette.addColorStop(0, 'rgba(8,6,17,0)');
    vignette.addColorStop(1, 'rgba(8,6,17,' + (.62 * k) + ')');
    ctx.fillStyle = vignette; ctx.fillRect(0, 0, 320, 240);
    ctx.fillStyle = '#080610'; ctx.fillRect(0, 0, 320, bar); ctx.fillRect(0, 240 - bar, 320, bar);
    if (t > PHASE_REVEAL) {
      ctx.globalAlpha = Math.min(k, (t - PHASE_REVEAL) * 7);
      ctx.textAlign = 'center';
      const name = bossNameParts(boss.T).name;
      ctx.font = '7px monospace'; ctx.fillStyle = '#d8cfe2'; ctx.fillText('PHASE II  /  ' + name.toUpperCase(), 160, 10);
      ctx.font = 'bold 13px monospace'; ctx.fillStyle = hot; ctx.fillText(title, 160, 25);
      ctx.fillStyle = shade; ctx.fillRect(23, 21, 40, 1); ctx.fillRect(257, 21, 40, 1);
      ctx.font = '9px monospace'; ctx.fillStyle = '#eee7dc'; ctx.fillText(line, 160, 223);
      ctx.font = '7px monospace'; ctx.fillStyle = '#aea4b1';
      ctx.fillText((inputMode === 'pad' ? '\u2715' : inputMode === 'touch' ? 'USE' : 'E') + '  SKIP', 160, 235);
    }
    ctx.restore();
  }
  const BOSS_CINE = {
    ogre:  { nameAt: 2.25, main: '#ffd88a', hot: '#fff3c8', deep: '#b8461a', glow: '255,150,50', crest: 'skull' },
    mare:  { nameAt: 2.05, main: '#bfeaff', hot: '#ffffff', deep: '#2a6fd0', glow: '90,190,255', crest: 'flame' },
    demon: { nameAt: 2.15, main: '#dcc2ff', hot: '#f4fdff', deep: '#5b2aa8', glow: '120,240,255', crest: 'moon' }
  };
  const cineFx = [];
  const cineCanvas = document.createElement('canvas'); cineCanvas.width = 320; cineCanvas.height = 70;
  const cineCtx = cineCanvas.getContext('2d');
  function bossNameParts(T) {
    const [n, ...rest] = T.name.split(', ');
    return { name: n.toUpperCase(), title: rest.join(', ').toUpperCase() };
  }
  function startBossIntro() {
    const boss = theBoss(); if (!boss) return;
    const B = BOSS_LINES[boss.type] || BOSS_LINES.ogre;
    const retry = !!story[B.flag];
    bossFight = { intro: true, active: false, t: 0, talked: false, cine: true, speed: retry ? 1.5 : 1, ev: {}, flash: 0, flashColor: '255,255,255', type: boss.type };
    cineFx.length = 0;
    // Regular monsters clear out of the arena so the duel is one on one.
    sideMobs.forEach(o => { if (o !== boss && o.type !== 'reever' && !o.dead && o.x > BOSS_ARENA.left - 220) { o.dead = true; o.deadTime = 99; o.hp = 0; o.respawn = Infinity; spawnDust(o.x, SIDE_GROUND_Y, 4); } });
    mobShots.length = 0;
    sidePlayer.x = Math.max(sidePlayer.x, BOSS_ARENA.left + 40);
    sidePlayer.facing = 1;
    boss.dir = -1; boss.attackTime = 0; boss.st = 'stalk'; boss.moving = false;
    const home = region().bossX;
    if (boss.type === 'mare') { boss.x = BOSS_ARENA.right + 90; boss.st = 'charge'; boss.moving = true; }
    else if (boss.type === 'demon') { boss.x = home; boss.y = -70; }
    else boss.x = home;
    const mt = musicTracks.bossIntro; if (mt) { try { mt.a.currentTime = 0; } catch (_) {} }
    sfx('slam', 0.6, 0.5); padRumble(0.5, 0.4, 300);
  }
  function cineBurst(x, y, n, o) {
    for (let i = 0; i < n; i++) {
      const a = (o.angle != null ? o.angle : -Math.PI / 2) + (Math.random() - 0.5) * (o.spread != null ? o.spread : Math.PI * 2);
      const sp = (o.speed || 60) * (0.4 + Math.random() * 0.8);
      cineFx.push({ kind: o.kind || 'spark', x: x + (Math.random() - 0.5) * (o.w || 0), y: y + (Math.random() - 0.5) * (o.h || 0), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        g: o.g != null ? o.g : 0, life: (o.life || 0.8) * (0.6 + Math.random() * 0.6), max: o.life || 0.8, size: o.size || 2, color: o.color || '255,255,255' });
    }
  }
  function cineEvent(c, key, at) { if (c.t >= at && !c.ev[key]) { c.ev[key] = true; return true; } return false; }
  function updateBossCine(c, boss, dt) {
    const t = c.t, th = BOSS_CINE[boss.type] || BOSS_CINE.ogre, gy = SIDE_GROUND_Y;
    c.flash = Math.max(0, c.flash - dt * 2.6);
    if (boss.attackTime > 0) boss.attackTime = Math.max(0, boss.attackTime - dt * c.speed);
    if (boss.type === 'ogre') {
      [[0.55, 1.05, 0.7], [1.45, 1.95, 1]].forEach(([s0, hit, pow], k) => {
        if (cineEvent(c, 'swing' + k, s0)) { boss.atkLen = 0.75; boss.attackTime = 0.75; sfx('swingBig', 0.8, 0.7); }
        if (cineEvent(c, 'hit' + k, hit)) {
          const hx = boss.x - 34;
          screenShake = 6 + pow * 5; padRumble(pow, pow, 260); sfx('slam', 1, 0.6 + k * 0.08);
          spawnDust(hx, gy, 14); c.flash = 0.25 * pow; c.flashColor = '255,200,140';
          cineBurst(hx, gy - 2, 18, { kind: 'rock', angle: -Math.PI / 2, spread: 2.2, speed: 150 * pow, g: 420, life: 1.1, size: 3, color: '120,100,90' });
          cineBurst(hx, gy - 2, 14, { angle: -Math.PI / 2, spread: 2.6, speed: 120, g: 160, life: 0.7, color: th.glow });
          cineFx.push({ kind: 'ring', x: hx, y: gy, r: 6, vr: 260 * pow, life: 0.5, max: 0.5, color: th.glow });
          if (k === 1) cineFx.push({ kind: 'ring', x: hx, y: gy, r: 2, vr: 160, life: 0.7, max: 0.7, color: '255,255,255' });
        }
      });
      if (cineEvent(c, 'roar', 2.15)) { sfx('roar', 1, 0.7); screenShake = 9; padRumble(1, 0.8, 700); c.flash = 0.35; c.flashColor = th.glow; c.roarAt = t; }
      if (c.roarAt && t - c.roarAt < 1.2) screenShake = Math.max(screenShake, 2.2);
    } else if (boss.type === 'mare') {
      const home = region().bossX;
      if (t > 0.35 && t < 1.5) {
        boss.st = 'charge'; boss.moving = true; boss.walk += dt * 14 * c.speed;
        const k = clamp((t - 0.35) / 1.1, 0, 1), e = 1 - Math.pow(1 - k, 2.2);
        const nx = BOSS_ARENA.right + 90 + (home - BOSS_ARENA.right - 90) * e;
        if (Math.abs(nx - (c.trailX || nx + 99)) > 12) { c.trailX = nx; cineFx.push({ kind: 'flame', x: nx + 26, y: gy, life: 1.6, max: 1.6, size: 16 + Math.random() * 8, color: th.glow, vx: 0, vy: 0, g: 0 }); }
        if (Math.random() < dt * 20) spawnDust(nx + 18, gy, 1);
        boss.x = nx;
        if (Math.floor(t * 7) !== Math.floor((t - dt * c.speed) * 7)) { sfx('land', 0.5, 0.6); screenShake = Math.max(screenShake, 1.5); }
      }
      if (cineEvent(c, 'skid', 1.5)) { boss.x = home; boss.st = 'windup'; boss.moving = false; spawnDust(boss.x + 10, gy, 16); sfx('slam', 0.8, 0.9); screenShake = 4; }
      if (cineEvent(c, 'rear', 1.8)) {
        sfx('mare', 1, 1.1); sfx('fire', 0.9, 0.7); screenShake = 8; padRumble(1, 0.9, 600); c.flash = 0.45; c.flashColor = th.glow;
        for (let i = -5; i <= 5; i++) if (i) cineFx.push({ kind: 'flame', x: boss.x + i * 15, y: gy, life: 2.6, max: 2.6, size: 30 + Math.random() * 14 - Math.abs(i) * 2, color: th.glow, vx: 0, vy: 0, g: 0, delay: Math.abs(i) * 0.05 });
        cineFx.push({ kind: 'ring', x: boss.x, y: gy - 30, r: 8, vr: 220, life: 0.6, max: 0.6, color: th.glow });
        cineBurst(boss.x, gy - 40, 30, { speed: 110, g: -20, life: 1.2, color: th.glow, w: 40, h: 30 });
      }
      if (t > 1.8 && t < 3.4 && Math.random() < dt * 30) cineBurst(boss.x + (Math.random() - 0.5) * 60, gy - 4, 1, { angle: -Math.PI / 2, spread: 0.6, speed: 50, g: -30, life: 0.9, color: th.glow });
    } else if (boss.type === 'demon') {
      const hy = gy - (boss.T.fly || 0);
      if (t < 0.35) boss.y = -70;
      else if (t < 1.75) {
        const k = (t - 0.35) / 1.4, e = 1 - Math.pow(1 - k, 3);
        boss.y = -70 + (hy - 6 + 70) * e + Math.sin(t * 9) * 3 * (1 - k);
        boss.walk += dt * 10 * c.speed;
        if (Math.floor(t * 3) !== Math.floor((t - dt * c.speed) * 3)) { sfx('swoosh', 0.6, 0.5); screenShake = Math.max(screenShake, 2); }
        if (Math.random() < dt * 24) cineBurst(boss.x + (Math.random() - 0.5) * 90, boss.y - 40, 1, { kind: 'feather', angle: Math.PI / 2, spread: 1, speed: 20, g: 18, life: 1.8, size: 2, color: '70,40,90' });
      } else {
        boss.y = hy + Math.sin(t * 3) * 2; boss.walk += dt * 8 * c.speed;
      }
      if (cineEvent(c, 'land', 1.75)) { spawnDust(boss.x, gy, 18); screenShake = 6; sfx('slam', 0.8, 0.5); cineFx.push({ kind: 'ring', x: boss.x, y: gy, r: 10, vr: 230, life: 0.6, max: 0.6, color: '160,120,255' }); }
      if (cineEvent(c, 'breath', 1.95)) {
        boss.st = 'breath'; boss.atkLen = 1.5; boss.attackTime = 1.5;
        sfx('demon', 1, 0.6); sfx('magic', 0.8, 0.5); screenShake = 9; padRumble(1, 1, 800); c.flash = 0.4; c.flashColor = th.glow;
      }
      if (c.ev.breath && boss.attackTime > 0.25) {
        // Moonfire roars upward from his jaws and rains back down as sparks.
        const mx = boss.x - 38, my = boss.y - 46;
        cineBurst(mx, my, 3, { angle: Math.PI * 0.8, spread: 0.6, speed: 170, g: 40, life: 0.7, size: 2, color: th.glow });
        if (Math.random() < 0.4) cineBurst(mx, my, 1, { kind: 'orb', angle: Math.PI * 0.8, spread: 0.5, speed: 120, g: 30, life: 0.8, size: 3, color: '200,250,255' });
      }
      if (c.ev.breath && boss.attackTime <= 0 && boss.st === 'breath') boss.st = 'stalk';
    }
    if (boss.type === 'nick') {
      if (t > .82 && t < 2.48) { boss.st = 'ray'; boss.stT = t - .82; }
      else { boss.st = 'stalk'; boss.stT = 0; }
      if (cineEvent(c, 'charge', .82)) sfx('magic', .8, .58);
      if (cineEvent(c, 'beam', 1.92)) sfx('demon', .76, 1.35);
    } else if (!['ogre', 'mare', 'demon'].includes(boss.type)) depthsCine(c, boss, dt, th);
    // Ember motes that drift around the name card.
    if (t > th.nameAt && t < CINE_END - 0.4 && Math.random() < dt * 14) {
      cineFx.push({ kind: 'mote', x: sideCameraX + 160 + (Math.random() - 0.5) * 220, y: 60 + Math.random() * 40, vx: (Math.random() - 0.5) * 10, vy: -8 - Math.random() * 10, g: 0, life: 1.6, max: 1.6, size: 1, color: th.glow });
    }
    if (cineEvent(c, 'name', th.nameAt)) { sfx('slam', 0.9, 0.45); sfx('magic', 0.5, 0.7); c.flash = Math.max(c.flash, 0.3); }
    updateCineParticles(dt);
  }
  function updateCineParticles(dt) {
    const gy = SIDE_GROUND_Y;
    for (let i = cineFx.length - 1; i >= 0; i--) {
      const f = cineFx[i];
      if (f.delay > 0) { f.delay -= dt; continue; }
      f.life -= dt; f.vy += (f.g || 0) * dt; f.x += (f.vx || 0) * dt; f.y += (f.vy || 0) * dt;
      if (f.kind === 'ring') f.r += f.vr * dt;
      if (f.kind === 'rock' && f.y > gy) { f.y = gy; f.vy *= -0.35; f.vx *= 0.6; }
      if (f.life <= 0) cineFx.splice(i, 1);
    }
  }
  function updateBossIntro(dt) {
    if (!bossFight || !bossFight.intro) return;
    const c = bossFight, boss = theBoss();
    if (c.phaseTwo && boss) { updateBossSecondPhase(c, boss, dt); return; }
    c.t += dt * (c.cine ? c.speed : 1);
    if (c.cine && boss) updateBossCine(c, boss, dt);
    if (c.cine && c.t >= CINE_END) { c.cine = false; c.t = 0; cineFx.length = 0; if (boss) { boss.st = 'stalk'; boss.moving = false; boss.attackTime = 0; } }
    if (!c.cine && c.t > 0.35 && !c.talked) {
      c.talked = true;
      const B = BOSS_LINES[boss ? boss.type : 'ogre'] || BOSS_LINES.ogre;
      const retry = story[B.flag];
      story[B.flag] = true;
      startDialogue(retry ? B.retry : typeof B.first === 'function' ? B.first() : B.first, () => {
        const b = theBoss();
        bossFight.intro = false; bossFight.active = true;
        if (b) { b.dormant = false; b.attackCooldown = 0.8; b.st = 'stalk'; b.stT = 0; }
        sfx(b && b.type === 'demon' ? 'demon' : 'roar', 0.9, 0.9);
        notice = B.tip; noticeUntil = time + 2.8;
      });
    }
  }
  function skipBossCine() {
    if (bossFight && bossFight.phaseTwo) {
      bossFight.skipPhase = true;
      return true;
    }
    if (bossFight && bossFight.cine && bossFight.t > 0.4) { bossFight.t = Math.max(bossFight.t, CINE_END - 0.45); return true; }
    return !!(bossFight && bossFight.cine);
  }
  function drawCineFx() {
    ctx.save(); ctx.translate(-Math.round(sideCameraX), 0);
    cineFx.forEach(f => {
      if (f.delay > 0) return;
      const a = clamp(f.life / f.max, 0, 1);
      if (f.kind === 'ring') {
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = 'rgba(' + f.color + ',' + a * 0.9 + ')'; ctx.lineWidth = 1 + a * 3;
        ctx.beginPath(); ctx.ellipse(f.x, f.y, f.r, f.r * 0.28, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
      } else if (f.kind === 'rock') {
        ctx.fillStyle = 'rgba(' + f.color + ',' + Math.min(1, a * 2) + ')'; ctx.fillRect(Math.round(f.x), Math.round(f.y) - f.size, f.size, f.size);
        ctx.fillStyle = 'rgba(40,30,30,' + Math.min(1, a * 2) + ')'; ctx.fillRect(Math.round(f.x), Math.round(f.y) - 1, f.size, 1);
      } else if (f.kind === 'feather') {
        ctx.fillStyle = 'rgba(' + f.color + ',' + a + ')'; ctx.fillRect(Math.round(f.x + Math.sin(f.life * 6) * 3), Math.round(f.y), 3, 1);
      } else if (f.kind === 'flame') {
        // Curved tongue of pale blue fire licking up from the ground.
        const grow = Math.min(1, (f.max - f.life) * 5), h = f.size * grow * (0.6 + a * 0.4) * (1 + Math.sin(time * 14 + f.x) * 0.12);
        ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(f.x, f.y - 4, 1, f.x, f.y - 4, h * 1.4);
        g.addColorStop(0, 'rgba(' + f.color + ',' + a * 0.22 + ')'); g.addColorStop(1, 'rgba(' + f.color + ',0)');
        ctx.fillStyle = g; ctx.fillRect(f.x - h * 1.4, f.y - 4 - h * 1.4, h * 2.8, h * 2.8);
        ctx.globalCompositeOperation = 'source-over';
        const sway = Math.sin(time * 9 + f.x * 0.3) * 2.5;
        ctx.fillStyle = 'rgba(40,110,230,' + a * 0.7 + ')';
        ctx.beginPath(); ctx.moveTo(f.x - h * 0.42, f.y); ctx.quadraticCurveTo(f.x - h * 0.5 + sway, f.y - h * 0.7, f.x + sway * 2, f.y - h * 1.15);
        ctx.quadraticCurveTo(f.x + h * 0.42 + sway, f.y - h * 0.55, f.x + h * 0.42, f.y); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(' + f.color + ',' + a * 0.85 + ')';
        ctx.beginPath(); ctx.moveTo(f.x - h * 0.3, f.y); ctx.quadraticCurveTo(f.x - h * 0.35 + sway, f.y - h * 0.6, f.x + sway * 1.6, f.y - h);
        ctx.quadraticCurveTo(f.x + h * 0.3 + sway, f.y - h * 0.5, f.x + h * 0.3, f.y); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(225,248,255,' + a * 0.6 + ')';
        ctx.beginPath(); ctx.moveTo(f.x - h * 0.08, f.y); ctx.quadraticCurveTo(f.x + sway * 0.5, f.y - h * 0.3, f.x + sway, f.y - h * 0.38); ctx.quadraticCurveTo(f.x + h * 0.08, f.y - h * 0.2, f.x + h * 0.08, f.y); ctx.closePath(); ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      } else {
        ctx.globalCompositeOperation = 'lighter';
        if (f.kind === 'orb') { ctx.fillStyle = 'rgba(' + f.color + ',' + a * 0.4 + ')'; ctx.beginPath(); ctx.arc(f.x, f.y, f.size * a + 2, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,' + a + ')'; ctx.beginPath(); ctx.arc(f.x, f.y, Math.max(0.8, f.size * a * 0.5), 0, Math.PI * 2); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; return; }
        const sz = f.size;
        ctx.fillStyle = 'rgba(' + f.color + ',' + a * 0.35 + ')'; ctx.fillRect(Math.round(f.x - sz), Math.round(f.y - sz), sz * 2 + 1, sz * 2 + 1);
        ctx.fillStyle = 'rgba(' + f.color + ',' + a + ')'; ctx.fillRect(Math.round(f.x - sz / 2), Math.round(f.y - sz / 2), Math.max(1, sz), Math.max(1, sz));
        ctx.globalCompositeOperation = 'source-over';
      }
    });
    ctx.restore();
  }
  function drawCineCrest(x, y, kind, th, a) {
    ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y);
    ctx.fillStyle = th.deep; ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(8, 0); ctx.lineTo(0, 8); ctx.lineTo(-8, 0); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = th.main; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = th.hot;
    if (kind === 'skull') { ctx.fillRect(-3, -4, 6, 5); ctx.fillRect(-2, 1, 4, 2); ctx.fillStyle = th.deep; ctx.fillRect(-2, -2, 1, 2); ctx.fillRect(1, -2, 1, 2); }
    else if (kind === 'flame') { ctx.beginPath(); ctx.moveTo(-3, 4); ctx.quadraticCurveTo(-4, -1, 0, -5); ctx.quadraticCurveTo(1, -1, 3, -2); ctx.quadraticCurveTo(4, 2, 3, 4); ctx.closePath(); ctx.fill(); }
    else { ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = th.deep; ctx.beginPath(); ctx.arc(2, -1, 3.4, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }
  function drawBossCine() {
    const c = bossFight, boss = theBoss(); if (!boss) return;
    if (c.phaseTwo) { drawSecondPhase(c, boss); return; }
    const W = canvas.width, H = canvas.height, t = c.t, th = BOSS_CINE[boss.type] || BOSS_CINE.ogre;
    const ease = k => { k = clamp(k, 0, 1); return k * k * (3 - 2 * k); };
    drawCineFx();
    // Dark vignette that tightens on the boss.
    const bx = boss.x - sideCameraX, by = boss.y - boss.T.bodyH * 0.6;
    const vk = ease(t / 0.8) * (1 - ease((t - CINE_END + 0.5) / 0.5));
    const vg = ctx.createRadialGradient(bx, by, 40, bx, by, 240);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,' + 0.55 * vk + ')');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    if (c.flash > 0) { ctx.fillStyle = 'rgba(' + c.flashColor + ',' + Math.min(0.6, c.flash) + ')'; ctx.fillRect(0, 0, W, H); }
    // Name card above the boss.
    const p = t - th.nameAt;
    if (p > 0) {
      const { name, title } = bossNameParts(boss.T);
      const out = ease((t - (CINE_END - 0.55)) / 0.4);
      const cx = Math.round(clamp(bx, 96, W - 96));
      const cy = Math.round(clamp(mobTop(boss) - 34 - out * 6, 50, 108));
      const A = 1 - out;
      // Light streak that tears open the card.
      const sk = ease(p / 0.22), fade = 1 - ease((p - 0.25) / 0.5);
      if (fade > 0) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const sw = 230 * sk;
        const g = ctx.createLinearGradient(cx - sw / 2, 0, cx + sw / 2, 0);
        g.addColorStop(0, 'rgba(' + th.glow + ',0)'); g.addColorStop(0.5, 'rgba(255,255,255,' + 0.9 * fade + ')'); g.addColorStop(1, 'rgba(' + th.glow + ',0)');
        ctx.fillStyle = g; ctx.fillRect(cx - sw / 2, cy - 1, sw, 3);
        const g2 = ctx.createRadialGradient(cx, cy, 2, cx, cy, sw / 2);
        g2.addColorStop(0, 'rgba(' + th.glow + ',' + 0.35 * fade + ')'); g2.addColorStop(1, 'rgba(' + th.glow + ',0)');
        ctx.save(); ctx.translate(cx, cy); ctx.scale(1, 0.12); ctx.translate(-cx, -cy); ctx.fillStyle = g2; ctx.fillRect(cx - sw / 2, cy - sw / 2, sw, sw); ctx.restore();
        ctx.restore();
      }
      // Big name, letter by letter, on an offscreen layer so a shine can sweep across it.
      cineCtx.clearRect(0, 0, 320, 70);
      cineCtx.font = 'bold 22px monospace'; cineCtx.textBaseline = 'alphabetic'; cineCtx.textAlign = 'left';
      const sp = 3, widths = [...name].map(ch => cineCtx.measureText(ch).width);
      const total = widths.reduce((a, b) => a + b, 0) + sp * (name.length - 1);
      let lx = 160 - total / 2;
      [...name].forEach((ch, i) => {
        const lp = p - 0.12 - i * 0.07;
        if (lp <= 0) { lx += widths[i] + sp; return; }
        const k = ease(lp / 0.22), drop = (1 - k) * -14, sc = 1 + (1 - k) * 1.2;
        cineCtx.save();
        cineCtx.translate(lx + widths[i] / 2, 44 + drop); cineCtx.scale(sc, sc);
        cineCtx.globalAlpha = k;
        cineCtx.fillStyle = 'rgba(0,0,0,.85)'; cineCtx.fillText(ch, -widths[i] / 2 + 2, 2);
        const tg = cineCtx.createLinearGradient(0, -18, 0, 2);
        tg.addColorStop(0, th.hot); tg.addColorStop(0.55, th.main); tg.addColorStop(1, th.deep);
        cineCtx.fillStyle = lp < 0.12 ? '#ffffff' : tg; cineCtx.fillText(ch, -widths[i] / 2, 0);
        cineCtx.restore();
        lx += widths[i] + sp;
      });
      const shine = (p - 0.9) / 0.6;
      if (shine > 0 && shine < 1) {
        cineCtx.save(); cineCtx.globalCompositeOperation = 'source-atop';
        const sx = 160 - total / 2 - 30 + (total + 60) * shine;
        const sg = cineCtx.createLinearGradient(sx - 14, 0, sx + 14, 0);
        sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, 'rgba(255,255,255,.85)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
        cineCtx.fillStyle = sg; cineCtx.fillRect(sx - 14, 0, 28, 70); cineCtx.restore();
      }
      ctx.save(); ctx.globalAlpha = A;
      ctx.shadowColor = 'rgba(' + th.glow + ',.9)'; ctx.shadowBlur = 10;
      ctx.drawImage(cineCanvas, cx - 160, cy - 44 + 8);
      ctx.restore();
      // Title line with ornaments that slide out from the centre.
      const tp = p - 0.2 - name.length * 0.07;
      if (tp > 0) {
        const k = ease(tp / 0.35), ty = cy + 18;
        ctx.save(); ctx.globalAlpha = A * k;
        ctx.font = 'bold 7px monospace'; ctx.textAlign = 'center';
        const spaced = title.split('').join(String.fromCharCode(8202));
        const tw = ctx.measureText(spaced).width;
        ctx.fillStyle = 'rgba(0,0,0,.8)'; ctx.fillText(spaced, cx + 1, ty + 1);
        ctx.fillStyle = th.main; ctx.fillText(spaced, cx, ty);
        const lw = 46 * k, gap = tw / 2 + 6;
        [-1, 1].forEach(d => {
          const g = ctx.createLinearGradient(cx + d * gap, 0, cx + d * (gap + lw), 0);
          g.addColorStop(0, th.main); g.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = g; ctx.fillRect(Math.min(cx + d * gap, cx + d * (gap + lw)), ty - 3, lw, 1);
          ctx.fillStyle = th.hot; ctx.fillRect(Math.round(cx + d * gap) - 1, ty - 4, 2, 3);
        });
        ctx.restore();
        drawCineCrest(cx, cy - 22, th.crest, th, A * k);
      }
    }
    // Letterbox bars.
    const bar = Math.round(26 * ease(t / 0.45) * (1 - ease((t - CINE_END + 0.45) / 0.45)));
    if (bar > 0) {
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, bar); ctx.fillRect(0, H - bar, W, bar);
      ctx.fillStyle = 'rgba(' + th.glow + ',.35)'; ctx.fillRect(0, bar, W, 1); ctx.fillRect(0, H - bar - 1, W, 1);
      if (t > 0.6 && t < CINE_END - 0.6) {
        ctx.globalAlpha = 0.5 + Math.sin(time * 4) * 0.2;
        ctx.fillStyle = '#c9c0d8'; ctx.font = '6px monospace'; ctx.textAlign = 'right';
        ctx.fillText(inputMode === 'pad' ? '✕ SKIP' : 'E SKIP', W - 6, H - bar / 2 + 2);
        ctx.globalAlpha = 1;
      }
    }
  }
  function endBossFight(won) {
    bossFight = null;
    bossWaves.length = 0; mobShots.length = 0; groundFires.length = 0;
    for (let i = sideMobs.length - 1; i >= 0; i--) if (sideMobs[i].summoned) sideMobs.splice(i, 1);
    if (!won) {
      const boss = theBoss();
      if (boss) Object.assign(boss, { hp: boss.maxHp, dormant: true, x: region().bossX, y: SIDE_GROUND_Y - (boss.T.fly || 0), dir: -1, enraged: false, attackTime: 0, hurtTime: 0, kvx: 0, dead: false, st: 'stalk', stT: 0, tele: false, swoop: null });
    }
  }
  function onBossDefeated(m) {
    endBossFight(true);
    sideMobs.forEach(o => { if (o !== m && o.type !== 'reever' && !o.dead && o.x > BOSS_ARENA.left - 100) { o.hp = 0; defeatMob(o, 1); } });
    story[region().bossFlag] = true;
    if (m.type === 'ogre' && !inventory.watchblade) tideGrant('watchblade', 1);
    if (m.type === 'saltStag') tideGrant('antler', 1);
    if (m.type === 'wellKeeper') tideGrant('wellglass', 1);
    if (m.type === 'nick') tideGrant('frostcore', 1);
    bossOutro = { t: 0, x: m.x, jingle: false, scene: platformScene };
    notice = m.type === 'ogre' ? 'Grukk has fallen. Watchrunner added to Gear.' : m.T.short + ' has fallen.';
    noticeUntil = time + 3;
    if (onSave) onSave(getSaveData());
  }
  let wren = null;   // the Watch scout
  function updateBossOutro(dt) {
    if (!bossOutro) return;
    bossOutro.t += dt;
    if (bossOutro.t > 0.9 && !bossOutro.jingle) { bossOutro.jingle = true; sfx('victory'); }
    if (bossOutro.scene === 'frost') {
      if (bossOutro.t > 2.3) {
        bossOutro = null;
        notice = 'Nick is waiting to talk.'; noticeUntil = time + 3;
      }
      return;
    }
    if (region().tide && bossOutro.t > 1.5) {
      bossOutro = null;
      if (platformScene === 'well') tideNotice('Take the east path to Seren.', 'magic');
      else tideNotice('The stag has fallen. Search the reliquary.', 'magic');
      return;
    }
    if (REGIONS[bossOutro.scene] && REGIONS[bossOutro.scene].side) { if (bossOutro.t > 2.2) depthsOutro(); return; }
    if (bossOutro.scene === 'hollow' && bossOutro.t > 1.6) {
      dad ??= dadAtSeal();
      bossOutro = null;
      notice = 'Find Aldric at the Watch seal, west of the throne.'; noticeUntil = time + 5;
      return;
    }
    if (bossOutro.scene === 'pass' && bossOutro.t > 2.4 && !bossOutro.npc) {
      bossOutro.npc = true;
      wren = { x: sideCameraX - 30, dir: 1, state: 'run', t: 0, target: sidePlayer.x - 40 };
      wren.onArrive = () => {
        sidePlayer.facing = -1;
        startDialogue([
          { who: 'wren', text: "Is she down? Good. I've spent a week trying not to get stepped on." },
          { who: 'rowan', text: 'She said her Queen rode on. Where?' },
          { who: 'wren', text: "Gloamhold. People still say the city drowned empty. It wasn't empty." },
          { who: 'wren', text: "Come on. If they took the shard there, they'll be down by the well." },
          { who: 'wren', text: "My mother was the last captain of Gloamhold. I'm going in. You can follow, if you're as stubborn as your father says." }
        ], () => {
          story.ch2Done = true; addLore('ashmane');
          bossOutro = null; wren.state = 'idle';
          if (onSave) onSave(getSaveData());
          openChapterPanel(2);
        });
      };
    }
    if (bossOutro.scene === 'gloam' && bossOutro.t > 2.6 && !bossOutro.talked) {
      bossOutro.talked = true;
      startDialogue([
        { who: 'vael', text: 'Listen. The Queen already has her singer.' },
        { who: 'rowan', text: 'Who? What did you hear?' },
        { who: 'vael', text: "Seren. Same eyes as you. Look by my hand. She dropped it at the well." },
        { who: 'rowan', text: "This is her locket. Dad said she died in the fever. Why would he tell me that?" },
        { who: 'rowan', text: "I'm bringing her home." }
      ], () => {
        story.ch3Done = true; addLore('seren');
        inventory.locket = Math.max(1, inventory.locket || 0); newItems.add('locket');
        bossOutro = null;
        if (onSave) onSave(getSaveData());
        openChapterPanel(3);
      });
    }
  }

  // ---- Places you can use [E] on ----
  function fireHere() { return FIRES.find(f => f.scene === platformScene && Math.abs(sidePlayer.x - f.x) < 26); }
  function nearbyInteraction() {
    const x = sidePlayer.x;
    if (nickScene || moonVisit || !sidePlayer.onGround || sidePlayer.deadTime > 0 || sidePlayer.roll) return null;
    const fire = fireHere();
    if (fire) return { label: 'REST / FAST TRAVEL', act: () => restAtFire(fire) };
    const witness = LORE.find(l => l.speaker && l.scene === platformScene && (!l.requires || story[l.requires]) && Math.abs(x - l.x) < 24);
    if (witness) return { label: 'TALK TO ' + SPEAKERS[witness.speaker].name, act: () => talkLore(witness) };
    const tideSpot = tideInteraction(x);
    if (tideSpot) return tideSpot;
    const settlement = expandedInteraction(x);
    if (settlement) return settlement;
    const chest = nearChest();
    if (chest) return { label: 'OPEN ' + RARITY[chest.rarity].name + ' CHEST', act: () => openChest(chest) };
    const dep = depthsInteraction(x);
    if (dep) return dep;
    if (platformScene === 'forest') {
      if (x < 100) return { label: 'RETURN HOME', act: 'home' };
      if (Math.abs(x - TRAIL.cache) < 27) return { label: story.trailCache ? 'READ TRAIL NOTE' : 'OPEN WATCH SUPPLY BOX', act: openTrailCache };
      if (Math.abs(x - TRAIL.marker) < 26) return { label: 'READ THE TRAIL MARKER', act: readTrailMarker };
      if (Math.abs(x - CAMP.bram) < 28) return { label: 'TRADE WITH BRAM', act: openShop };
      if (x > CAMP.sign - 20) return { label: 'ENTER THE HOLLOW', act: () => enterRegion('hollow', 130, 1) };
    } else if (platformScene === 'hollow') {
      if (x < 100) return { label: 'BACK TO THE FOREST', act: () => enterRegion('forest', CAMP.sign - 30, -1) };
      if (dad && !bossFight && !bossOutro && Math.abs(x - dad.x) < 32) {
        return { label: story.bossDefeated && !story.dadFound && !story.chapterDone ? 'HELP DAD HOLD THE SEAL' : 'TALK TO DAD', act: talkToDad };
      }
      if (x > HOLLOW_SIDE_WIDTH - 70 && (story.bossDefeated || story.chapterDone)) {
        if (story.ch2Started) return { label: 'TRAVEL TO THE ASHEN PASS', act: () => enterRegion('pass', REGIONS.pass.entry, 1) };
        return { label: story.chapterDone ? 'TALK TO DAD FIRST' : 'CHECK THE EAST ROAD', act: () => {
          notice = 'Dad is at the Watch seal, west of the throne.'; noticeUntil = time + 4; sfx('uiError');
        } };
      }
    } else if (platformScene === 'pass') {
      if (x < 70) return { label: 'BACK TO THE HOLLOW', act: () => enterRegion('hollow', HOLLOW_SIDE_WIDTH - 90, -1) };
      if (story.nickAmbushed && Math.abs(x - NICK_TRAIL) < 24) return { label: 'FOLLOW THE FROST TRAIL', act: () => enterRegion('frost', REGIONS.frost.entry, 1) };
      if (wren && wren.state === 'idle' && Math.abs(x - wren.x) < 30) return { label: 'TALK TO WREN', act: talkToWren };
      if (x > PASS_SIDE_WIDTH - 70 && story.passBossDefeated) return { label: 'ENTER GLOAMHOLD', act: () => enterRegion('gloam', REGIONS.gloam.entry, 1) };
    } else if (platformScene === 'gloam') {
      if (x < 70) return { label: 'BACK TO THE ASHEN PASS', act: () => enterRegion('pass', PASS_SIDE_WIDTH - 90, -1) };
      if (story.ch3Done && story.moonVisitSeen && x > GLOAM_SIDE_WIDTH - 76) return { label: 'WALK TO LANTERN QUAY', act: () => enterRegion('harbor', REGIONS.harbor.entry, 1) };
      if (wren && wren.state === 'idle' && Math.abs(x - wren.x) < 30) return { label: 'TALK TO WREN', act: talkToWren };
    } else if (platformScene === 'frost') {
      if (x < 66) return { label: 'RETURN TO THE ASHEN PASS', act: () => enterRegion('pass', NICK_TRAIL + 30, 1) };
      if (story.nickDefeated && Math.abs(x - REGIONS.frost.bossX) < 45 && !bossOutro) {
        return { label: 'TALK TO NICK', act: () => talkLore(LORE.find(l => l.id === 'nicktruth')) };
      }
    } else if (region().peaceful) {
      return coastInteraction(x);
    }
    return null;
  }
  const TRAIL = { marker: 230, cache: 422 };
  LORE.push({ id: 'trailcache', kind: 'page', title: 'The Watch Supply Box', where: 'Woodland trail',
    hint: 'Look under the green trail ribbon west of Nell.',
    text: 'Green ribbon means shelter or supplies. Red means the road isn’t safe. If you’re reading this, take what you need. Leave the ribbon for the next traveler. - A.' });
  function readTrailMarker() {
    startDialogue([{ who: 'rowan', text: 'Dad’s trail marks. Green ribbon: supplies. I can see another one ahead.' },
      { who: 'rowan', text: 'A creature rears up before it strikes. Wait for the wind-up, then roll past it or step back.' }]);
  }
  function openTrailCache() {
    const entry = LORE.find(l => l.id === 'trailcache');
    const found = !story.trailCache;
    if (found) {
      story.trailCache = true; addLore(entry.id);
      tideGrant('bread', 2); tideGrant('coins', 5);
      sfx('pickup'); tidePersist();
    }
    startDialogue([{ who: 'rowan', text: entry.text },
      ...(found ? [{ who: 'rowan', text: 'Two loaves and five coins. I can set bread as my quick item in the bag, then use it without stopping.' }] : [])]);
  }
  function drawOpeningTrail() {
    const y = SIDE_GROUND_Y;
    for (const x of [TRAIL.marker, TRAIL.cache]) {
      if (x < sideCameraX - 24 || x > sideCameraX + canvas.width + 24) continue;
      ctx.fillStyle = 'rgba(12,17,16,.55)'; ctx.fillRect(x - 13, y - 2, 27, 3);
      ctx.fillStyle = '#342a2b'; ctx.fillRect(x - 2, y - 30, 4, 30);
      ctx.fillStyle = '#805b40'; ctx.fillRect(x - 1, y - 30, 2, 27);
      ctx.fillStyle = '#78aa76'; ctx.fillRect(x - 4, y - 27, 9, 3);
      const tail = prefersReducedMotion() ? 0 : Math.round(Math.sin(time * 5 + x));
      ctx.fillRect(x + 3, y - 24, 5 + tail, 2); ctx.fillRect(x + 4, y - 22, 3, 2);
      if (x === TRAIL.cache) {
        ctx.fillStyle = '#281e21'; ctx.fillRect(x - 11, y - 13, 22, 13);
        ctx.fillStyle = '#795744'; ctx.fillRect(x - 10, y - 10, 20, 8);
        ctx.fillStyle = '#524339'; ctx.fillRect(x - 9, y - 5, 18, 1);
        ctx.fillStyle = '#b6955d'; ctx.fillRect(x - 2, y - 10, 4, 3);
        ctx.fillStyle = story.trailCache ? '#392b2a' : '#a68052';
        ctx.fillRect(x - 12, y - (story.trailCache ? 16 : 13), 24, 3);
      } else {
        ctx.fillStyle = '#543b33'; ctx.fillRect(x - 9, y - 18, 18, 7);
        ctx.fillStyle = '#be9b69'; ctx.fillRect(x + 1, y - 15, 5, 1); ctx.fillRect(x + 4, y - 16, 2, 3);
      }
    }
  }
  function talkLore(l, extra = [], done) {
    if (!l?.speaker) return;
    const remembered = !extra.length && !done && story.pages.includes(l.id) && WITNESS_REPLIES[l.id];
    startDialogue([
      ...(!remembered && l.question ? [{ who: 'rowan', text: l.question }] : []),
      { who: l.speaker, text: remembered || l.text }, ...extra
    ], () => {
      if (addLore(l.id)) { notice = 'Recorded: ' + l.title; noticeUntil = time + 2.6; }
      if (done) done();
      if (onSave) onSave(getSaveData());
    });
  }
  // Chapter 4: the ferry and the outer gallery. Correct signals unlock the route
  // permanently; an unfinished signal is local to the current visit/save run.
  const QUAY = { nessa: 260, wren: 442, dock: 853 };
  const BELLS = [{ key: 'anchor', x: 610, pitch: 0.78 }, { key: 'shell', x: 679, pitch: 1.16 }, { key: 'star', x: 748, pitch: 1.45 }];
  const FERRY_SIGNAL = ['shell', 'star', 'anchor'];
  let bellCount = 0, bellFeedback = null, bellAnimation = null;
  function ringFerryBell(bell) {
    sfx('gem', 0.85, bell.pitch);
    bellAnimation = { key: bell.key, until: time + 0.72 };
    if (story.ferryOpened) return;
    if (FERRY_SIGNAL[bellCount] !== bell.key) {
      bellCount = bell.key === FERRY_SIGNAL[0] ? 1 : 0;
      bellFeedback = { text: bellCount ? 'Signal restarted. 1 of 3.' : 'No answer. Start the signal again.', until: time + 3.2, error: true };
      return;
    }
    bellCount++;
    if (bellCount < FERRY_SIGNAL.length) {
      bellFeedback = { text: 'Bell signal: ' + bellCount + ' of 3', until: time + 2.1 };
      return;
    }
    story.ferryOpened = true;
    bellFeedback = { text: 'A light answers. Head to the dock.', until: time + 4 };
    sfx('ready', 0.6);
    if (onSave) onSave(getSaveData());
  }
  function speakAtCoast(...lines) {
    startDialogue(lines.map(([who, text]) => ({ who, text })));
  }
  function coastInteraction(x) {
    const at = (point, distance = 25) => Math.abs(x - point) < distance;
    if (platformScene === 'harbor') {
      if (x < 57) return { label: 'BACK TO GLOAMHOLD', act: () => enterRegion('gloam', GLOAM_SIDE_WIDTH - 90, -1) };
      if (at(QUAY.nessa)) return { label: 'TALK TO NESSA', act: () => {
        if (story.ferryOpened && story.pages.includes('ferrysong') && !story.pages.includes('boots')) return talkLore(LORE.find(l => l.id === 'boots'));
        if (story.ferryOpened && story.pages.includes('ferrysong')) return speakAtCoast(['nessa', "There, see that light? That's Jory. Tell him he still owes me a left boot."]);
        talkLore(LORE.find(l => l.id === 'ferrysong'));
      } };
      if (at(QUAY.wren)) return { label: 'SIT WITH WREN', act: () => speakAtCoast(
        ['wren', "My mother couldn't swim. She got seasick standing on this pier."],
        ['rowan', "Mine used to carry pebbles in her coat. There was always something to throw in the water."],
        ['wren', "Grab two while we're here. I'll keep one."]) };
      const bell = BELLS.find(b => at(b.x, 23));
      if (bell) return { label: 'RING ' + bell.key.toUpperCase(), act: () => ringFerryBell(bell) };
      if (x > QUAY.dock - 24) return story.ferryOpened
        ? { label: 'BOARD THE FERRY', act: () => enterRegion('court', REGIONS.court.entry, 1) }
        : { label: 'CHECK THE DOCK', act: () => speakAtCoast(['rowan', "I can just make out a skiff. The ferryman's waiting for a signal."]) };
    } else if (platformScene === 'court') {
      if (x < 56) return { label: 'FERRY TO LANTERN QUAY', act: () => enterRegion('harbor', QUAY.dock - 30, -1) };
      if (at(200)) return { label: 'INSPECT THE PEAR TREE', act: () => speakAtCoast(
        ['rowan', "Somebody brings water up here. The soil's still damp."],
        ['wren', "And somebody keeps tying ribbons on it. That bottom one looks older than either of us."]) };
      if (at(490)) return { label: 'LISTEN WITH WREN', act: () => speakAtCoast(
        ['wren', "Hold still a second. I thought I heard a voice."],
        ['rowan', "I had a music box that played that tune. Dad always closed it before the end."],
          ['wren', "Try the keeper by the desk. I'll listen here."]) };
      if (at(655, 30)) return { label: 'TALK TO THE GALLERY KEEPER', act: readMoonwellLedger };
      if (x > 783) return { label: 'INSPECT THE SEALED DOOR', act: () => speakAtCoast(
        ['rowan', "No handle on this side. There's warm air coming through the crack."]) };
    }
    return null;
  }
  function readMoonwellLedger() {
    const entry = LORE.find(l => l.id === 'serenledger');
    if (story.ch4Done) { talkLore(entry); return; }
    talkLore(entry, [
      { who: 'rowan', text: "Then she's alive. Can you open the lower door?" },
      { who: 'wren', text: "I heard her again. Below us, not down the hall." },
      { who: 'rowan', text: "Mum? ...It's Rowan." },
      { who: 'keeper', text: "Take my key. I'll tell them I never saw you." }
    ], () => {
      story.ch4Done = true;
      gainXp(100);
      tideNotice('The keeper unseals the lower door.', 'magic');
    });
  }
  const CAMP = { start: 3590, tent: 3625, fire: 3700, log: 3738, bram: 3800, cart: 3842, sign: 3912 };
  function restAtFire(fire) {
    depthsOnRest();
    stats.health = stats.maxHealth; stats.stamina = stats.maxStamina;
    story.rested = true;
    if (fire) {
      story.lastFire = fire.id;
      if (!story.fires.includes(fire.id)) { story.fires.push(fire.id); notice = 'Campfire lit: ' + fire.name + '. Fast travel from the MAP tab.'; }
      else notice = 'You rest by the fire. Health restored and game saved.';
    }
    noticeUntil = time + 2.8;
    sidePlayer.pray = { t: 0 }; sidePlayer.vx = 0;
    fortune.phoenixUsed = false;
    Object.keys(chestRolls).forEach(k => delete chestRolls[k]);
    if (bloodMoon) { bloodMoon = false; notice = 'The blood moon fades. Treasure has returned to the land.'; } else if (story.rested) notice += '  New treasure stirs.';
    sfx('rest'); padRumble(0.1, 0.2, 200);
    restFlash = time;
    if (onSave) onSave(getSaveData());
    if (fire && mapFires().length > 1) openFastTravelMap();
  }
  let restFlash = -10;
  const REGION_SUBS = { forest: 'Edge of the woodland', hollow: 'Where the moon fell', pass: 'Chapter 2 - The road of embers', gloam: 'Chapter 3 - The drowned city',
    harbor: 'Chapter 4 - The night ferry', court: 'Chapter 4 - The outer gallery' };
  // ===========================================================================
  // DEPTHS & WILDS: optional side areas off every chapter, each with its own
  // champion, plus things to do along the road: moon shrines, hunt bounties,
  // moon moths, a wandering peddler and random ambushes.
  // ===========================================================================
  // ---- New monsters (Ansimuz Legacy Collection, CC0) and tinted variants ----
  Object.assign(MOB_TYPES, {
    brute:    { name: 'Goblin Brute', src: 'mobs/goblin/', anims: MOB_TYPES.goblin.anims, tint: '150,40,20,.38',
                fw: 150, fh: 150, ax: 75, ay: 101, scale: 1.45, bodyH: 52, width: 26, hp: 15, speed: 58, chase: 220, reach: 58, dmg: 6,
                atkTime: 0.95, hit: [0.7, 0.92], cd: [1.6, 2.2], xp: 28, coins: [4, 8], drops: [['fang', 0.8], ['bread', 0.2]], voice: 'goblin', kind: 'goblin' },
    sneak:    { name: 'Goblin Cutthroat', src: 'mobs/goblin/', anims: MOB_TYPES.goblin.anims, tint: '20,30,70,.45',
                fw: 150, fh: 150, ax: 75, ay: 101, scale: 0.95, bodyH: 36, width: 18, hp: 4, speed: 138, chase: 260, reach: 42, dmg: 3,
                atkTime: 0.55, hit: [0.65, 0.9], cd: [0.9, 1.4], xp: 14, coins: [3, 6], drops: [['fang', 0.4], ['tonic', 0.1]], voice: 'goblin', kind: 'goblin' },
    rotshroom:{ name: 'Rot Shroom', src: 'mobs/mushroom/', anims: MOB_TYPES.mushroom.anims, tint: '70,150,40,.42', spores: true,
                fw: 150, fh: 150, ax: 75, ay: 101, scale: 1.1, bodyH: 38, width: 20, hp: 9, speed: 44, chase: 180, reach: 40, dmg: 4,
                atkTime: 0.85, hit: [0.72, 0.92], cd: [1.5, 2.1], xp: 18, coins: [2, 5], drops: [['spore', 0.8]], voice: 'squish' },
    acolyte:  { name: 'Pale Acolyte', src: 'depths/', anims: { idle: ['acolyte-walk', 6, 5], move: ['acolyte-walk', 6, 9], attack: ['acolyte-walk', 6], hurt: null, death: null },
                fw: 32, fh: 48, ax: 16, ay: 48, scale: 1.25, bodyH: 40, width: 18, ranged: true, shot: 'moon', hp: 8, speed: 42, chase: 230, reach: 140, dmg: 4,
                atkTime: 0.9, hit: [0.5, 0.6], cd: [2.0, 2.8], xp: 22, coins: [3, 7], drops: [['wisp', 0.4], ['tonic', 0.12]], voice: 'ghost', light: '170,210,255' },
    shade:    { name: 'Barrow Shade', src: 'depths/', anims: { idle: ['shade', 6, 8], move: ['shade', 6, 11], attack: ['shade', 6], hurt: null, death: null },
                fw: 64, fh: 64, ax: 32, ay: 52, faceLeft: true, scale: 1.0, bodyH: 34, width: 18, fly: 22, alpha: 0.85, blink: true, hp: 6, speed: 70, chase: 260, reach: 40, dmg: 4,
                atkTime: 0.7, hit: [0.45, 0.85], cd: [1.4, 2.0], xp: 18, coins: [2, 5], drops: [['wisp', 0.6]], voice: 'ghost' },
    fiend:    { name: 'Ember Fiend', src: 'depths/', anims: { idle: ['fiend-idle', 6, 8], move: ['fiend-idle', 6, 10], attack: ['fiend-breath', 4], hurt: null, death: null },
                fw: 80, fh: 72, ax: 40, ay: 72, faceLeft: true, scale: 0.9, bodyH: 50, width: 26, ranged: true, shot: 'fire', hp: 13, speed: 40, chase: 240, reach: 150, dmg: 5,
                atkTime: 1.0, hit: [0.55, 0.7], cd: [2.0, 2.8], xp: 30, coins: [4, 8], drops: [['ember', 0.7]], voice: 'skull', light: '255,110,40' },
    drowned:  { name: 'Drowned', src: 'depths/', anims: { idle: ['drowned', 2, 3], move: ['drowned', 2, 6], attack: ['drowned', 2], hurt: null, death: null },
                fw: 27, fh: 32, ax: 14, ay: 32, faceLeft: true, scale: 1.55, bodyH: 46, width: 22, hp: 12, speed: 52, chase: 220, reach: 46, dmg: 5,
                atkTime: 0.8, hit: [0.5, 0.85], cd: [1.4, 2.0], xp: 26, coins: [3, 7], drops: [['toadskin', 0.3], ['fish', 0.4]], voice: 'squish' },
    gazer:    { name: 'Gazer', src: 'depths/', anims: { idle: ['eyedemon', 8, 12], move: ['eyedemon', 8, 15], attack: ['eyedemon', 8], hurt: null, death: null },
                fw: 48, fh: 48, ax: 24, ay: 34, scale: 1.0, bodyH: 26, width: 20, fly: 56, dive: true, hp: 6, speed: 100, chase: 250, reach: 40, dmg: 4,
                atkTime: 0.7, hit: [0.4, 0.8], cd: [1.3, 1.9], xp: 18, coins: [2, 5], drops: [['eye', 0.5]], voice: 'eye' },
    // ---- Champions: one waits at the end of each side area ----
    skarn:    { name: 'Skarn, the Mire Chief', boss: true, champion: true, src: 'skarn/',
                anims: { idle: ['idle', 16, 10], move: ['walk', 12, 14], attack: ['axe', 16], hurt: null, death: null },
                fw: 216, fh: 128, ax: 132, ay: 122, scale: .88, faceLeft: true, bodyH: 72, width: 34, hp: 52, speed: 60, chase: 700, reach: 72, dmg: 6,
                atkTime: 1.65, hit: [SKARN_HEW, SKARN_SLAM], cd: [2.4, 2.65], xp: 150, coins: [30, 40], drops: [['cleaver', 1], ['tonic', 1]], voice: 'goblin', armor: true, short: 'Skarn',
                enrageText: 'Skarn whistles. Cutthroats drop from the trees...', summon: 'sneak' },
    mourn:    { name: 'Mourn, the Barrow Warden', boss: true, champion: true, art: 'mourn', drawH: 86,
                bodyH: 84, width: 32, hp: 68, speed: 45, chase: 700, reach: 68, dmg: 6, volley: 2, shot: 'moon',
                atkTime: 1.3, hit: [0.58, 0.77], cd: [1.9, 2.2], xp: 185, coins: [35, 45], drops: [['wardenblade', 1], ['tonic', 1]], voice: 'ghost', armor: true, short: 'Mourn', light: '150,190,255',
                enrageText: 'Mourn rings the grave-bell. The shades wake...', summon: 'shade' },
    wyrm:     { name: 'Ignaroth, the Cinder Wyrm', boss: true, champion: true, src: 'depths/', anims: { idle: ['wyrm-idle', 6, 7], move: ['wyrm-idle', 6, 10], attack: ['wyrm-breath', 7], hurt: null, death: null },
                fw: 144, fh: 64, ax: 96, ay: 64, faceLeft: true, scale: 1.75, bodyH: 70, width: 70, hp: 100, speed: 46, chase: 900, reach: 84, dmg: 7, volley: 3, shot: 'fire',
                atkTime: 1.4, hit: [0.58, 0.8], cd: [1.9, 2.3], xp: 280, coins: [45, 60], drops: [['wyrmfang', 1], ['tonic', 1]], voice: 'ogre', armor: true, short: 'Ignaroth', light: '255,120,40',
                enrageText: 'Ignaroth beats his wings. Hounds pour out of the vents...', summon: 'hound' },
    tidemaw:  { name: 'Tidemaw, the Drowned Bell', boss: true, champion: true, art: 'tidemaw', drawH: 90,
                bodyH: 83, width: 50, hp: 118, speed: 44, chase: 900, reach: 76, dmg: 8, volley: 3, shot: 'moon',
                atkTime: 1.45, hit: [0.59, 0.78], cd: [2.05, 2.4], xp: 340, coins: [55, 70], drops: [['tidecaller', 1], ['tonic', 1]], voice: 'ogre', armor: true, short: 'Tidemaw', light: '120,220,255',
                enrageText: 'Tidemaw tolls. The drowned rise from the black water...', summon: 'drowned' }
  });
  // Champion weapons.
  Object.assign(WEAPONS, {
    cleaver: { name: "Skarn's Cleaver", atk: 3, icon: 'boneblade', arc: '220,200,150' },
    wardenblade: { name: "Warden's Oath", atk: 5, icon: 'sword', arc: '180,200,255' },
    wyrmfang: { name: 'Wyrmfang', atk: 6, icon: 'emberedge', arc: '255,140,60' },
    tidecaller: { name: 'Tidecaller', atk: 7, icon: 'moonsilver', arc: '110,230,230' }
  });
  Object.assign(ITEM_DEFS, {
    cleaver:     { name: "Skarn's Cleaver", type: 'WEAPON', rarity: 'rare', value: 30, icon: 'boneblade', atk: 3, desc: ['A chipped goblin', 'cleaver. ATK +3.'], lore: 'Skarn took it off a Watch quartermaster. The quartermaster did not want it back.' },
    wardenblade: { name: "Warden's Oath", type: 'WEAPON', rarity: 'rare', value: 45, icon: 'sword', atk: 5, desc: ['A Watch greatsword', 'from the barrows. ATK +5.'], lore: 'The oath is engraved on the blade: I hold the line so the village may sleep.' },
    wyrmfang:    { name: 'Wyrmfang', type: 'WEAPON', rarity: 'legend', value: 60, icon: 'emberedge', atk: 6, desc: ['A fang still glowing', 'from within. ATK +6.'], lore: 'Ignaroth swallowed a moon shard. The heat never left his teeth.' },
    tidecaller:  { name: 'Tidecaller', type: 'WEAPON', rarity: 'legend', value: 80, icon: 'moonsilver', atk: 7, desc: ['A bell-steel blade', 'that hums. ATK +7.'], lore: 'Forged from the archive bell. When it rings, the drowned remember their names.' },
    mothlamp:    { name: 'Moth Lantern', type: 'KEY ITEM', rarity: 'rare', value: 0, icon: 'lampglass', desc: ['Holds the moon moths', 'you have found.'], lore: 'Moon moths carry slivers of the broken moon. Gather enough and they shine like it used to.' }
  });
  // Tinted copies of a sprite sheet so one sheet can be several monsters.
  const tintCache = {};
  function tintedSheet(img, tint) {
    const key = img.src + '|' + tint;
    if (tintCache[key]) return tintCache[key];
    const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(' + tint + ')'; g.fillRect(0, 0, c.width, c.height);
    tintCache[key] = c; return c;
  }

  // ---- The four side areas ----
  const DEPTH_FLAGS = { mireChamp: false, mireStarted: false, mireChampSeen: false, barrowChamp: false, barrowStarted: false, barrowChampSeen: false,
    cinderChamp: false, cinderStarted: false, cinderChampSeen: false, archiveChamp: false, archiveStarted: false, archiveChampSeen: false, peddlerMet: false };
  Object.assign(STORY_DEFAULTS, DEPTH_FLAGS); Object.keys(DEPTH_FLAGS).forEach(k => { if (!(k in story)) story[k] = false; });
  const DEPTH_W = 2400, DEPTH_ARENA = { left: 1800, right: 2360, trigger: 1860 };
  Object.assign(REGIONS, {
    mire:    { name: 'THE WITCHMIRE', width: DEPTH_W, entry: 90, color: '#9be37a', side: true, art: 'forest', ambient: 'forest', parent: 'forest', parentX: 1950,
               gradeTop: 'rgba(30,70,30,.30)', gradeBot: 'rgba(10,40,20,.45)', fog: '140,210,120', arena: { ...DEPTH_ARENA }, boss: 'skarn', bossX: 2200, bossFlag: 'mireChamp', unlock: () => true,
               plats: [{ x: 360, y: 150, w: 110, h: 10 }, { x: 560, y: 124, w: 96, h: 10 }, { x: 980, y: 140, w: 120, h: 10 }, { x: 1200, y: 112, w: 90, h: 10 }, { x: 1440, y: 146, w: 120, h: 10 }, { x: 1620, y: 120, w: 90, h: 10 }] },
    barrow:  { name: 'THE WATCH BARROWS', width: DEPTH_W, entry: 90, color: '#a8c4ff', side: true, art: 'hollow', ambient: 'hollow', parent: 'hollow', parentX: 1640,
               gradeTop: 'rgba(20,40,90,.22)', gradeBot: 'rgba(10,10,40,.30)', fog: '150,170,230', arena: { ...DEPTH_ARENA }, boss: 'mourn', bossX: 2200, bossFlag: 'barrowChamp', unlock: () => story.hollowEntered,
               plats: [{ x: 320, y: 156, w: 120, h: 10 }, { x: 600, y: 128, w: 100, h: 10 }, { x: 900, y: 150, w: 130, h: 10 }, { x: 1160, y: 120, w: 100, h: 10 }, { x: 1420, y: 150, w: 120, h: 10 }, { x: 1640, y: 126, w: 90, h: 10 }] },
    cinder:  { name: 'CINDER DEEP', width: DEPTH_W, entry: 90, color: '#ff9a5a', side: true, art: 'pass', ambient: 'pass', parent: 'pass', parentX: 2950,
               gradeTop: 'rgba(24,2,0,.62)', gradeBot: 'rgba(70,14,0,.45)', fog: '255,120,60', arena: { ...DEPTH_ARENA }, boss: 'wyrm', bossX: 2220, bossFlag: 'cinderChamp', unlock: () => story.passEntered,
               plats: [{ x: 380, y: 156, w: 96, h: 12 }, { x: 580, y: 128, w: 80, h: 12 }, { x: 940, y: 150, w: 112, h: 12 }, { x: 1150, y: 120, w: 96, h: 12 }, { x: 1400, y: 100, w: 80, h: 12 }, { x: 1600, y: 140, w: 112, h: 12 }] },
    archive: { name: 'THE SUNKEN ARCHIVE', width: DEPTH_W, entry: 90, color: '#7fe0e0', side: true, art: 'gloam', ambient: 'hollow', parent: 'gloam', parentX: 1520,
               gradeTop: 'rgba(0,40,60,.32)', gradeBot: 'rgba(0,20,40,.45)', fog: '120,220,230', arena: { ...DEPTH_ARENA }, boss: 'tidemaw', bossX: 2200, bossFlag: 'archiveChamp', unlock: () => story.gloamEntered,
               plats: [{ x: 360, y: 158, w: 128, h: 12 }, { x: 600, y: 130, w: 96, h: 12 }, { x: 880, y: 106, w: 64, h: 12 }, { x: 1100, y: 150, w: 128, h: 12 }, { x: 1380, y: 126, w: 96, h: 12 }, { x: 1600, y: 150, w: 96, h: 12 }] }
  });
  const DEPTH_IDS = ['mire', 'barrow', 'cinder', 'archive'];
  DEPTH_IDS.forEach(id => REGIONS[id].plats.unshift({ x: 0, y: SIDE_GROUND_Y, w: DEPTH_W, h: 44 }));
  ['cleaver', 'wardenblade', 'wyrmfang', 'tidecaller', 'mothlamp'].forEach(k => { if (!(k in inventory)) inventory[k] = 0; });
  Object.assign(REGION_SUBS, { mire: 'Chapter 1 - Where the goblins hide', barrow: 'Chapter 1 - Graves of the Silver Watch', cinder: 'Chapter 2 - Beneath the burning road', archive: 'Chapter 3 - Where the moon-readers studied' });
  Object.assign(SCENE_MOBS, {
    mire:    [['rotshroom', 420, 70], ['sneak', 620, 100], ['toad', 840, 70], ['rotshroom', 1020, 80], ['brute', 1200, 90], ['eye', 1320, 110], ['sneak', 1460, 100], ['toad', 1580, 60], ['rotshroom', 1700, 50]],
    barrow:  [['skeleton', 420, 80], ['shade', 620, 120], ['acolyte', 820, 60], ['skeleton', 1000, 90], ['ghost', 1160, 120], ['acolyte', 1320, 60], ['shade', 1460, 120], ['skeleton', 1600, 80], ['acolyte', 1720, 40]],
    cinder:  [['fiend', 460, 60], ['hound', 660, 100], ['skull', 840, 90], ['fiend', 1020, 60], ['hound', 1160, 100], ['crow', 1300, 120], ['fiend', 1440, 60], ['skull', 1580, 90], ['hound', 1700, 60]],
    archive: [['drowned', 420, 80], ['gazer', 620, 110], ['lamp', 800, 70], ['drowned', 960, 90], ['acolyte', 1120, 60], ['gazer', 1260, 110], ['drowned', 1420, 90], ['skeleton', 1560, 80], ['drowned', 1700, 50]]
  });
  // More monsters on the main roads, too.
  SCENE_MOBS.forest.push(['sneak', 1150, 120], ['brute', 2300, 80], ['rotshroom', 2780, 70], ['sneak', 3250, 100]);
  SCENE_MOBS.hollow.push(['acolyte', 1250, 60], ['shade', 1700, 120], ['acolyte', 2300, 60]);
  SCENE_MOBS.pass.push(['fiend', 1000, 60], ['gazer', 2500, 100], ['fiend', 3200, 60]);
  SCENE_MOBS.gloam.push(['drowned', 860, 80], ['gazer', 1420, 110], ['drowned', 2720, 80], ['acolyte', 3400, 60], ['drowned', 3660, 70]);
  Object.assign(CHEST_SPOTS, { mire: [520, 1100, 1640], barrow: [520, 1080, 1560], cinder: [560, 1080, 1620], archive: [540, 1050, 1620] });
  Object.assign(SPEAKERS, {
    skarn: { name: 'SKARN', color: '#ff9a5a', mob: 'skarn' }, mourn: { name: 'MOURN', color: '#a8c4ff', mob: 'mourn' },
    ignaroth: { name: 'IGNAROTH', color: '#ffb347', mob: 'wyrm' }, tidemaw: { name: 'TIDEMAW', color: '#7fe0e0', mob: 'tidemaw' },
    tess: { name: 'TESS THE PEDDLER', color: '#d7b6ff' }, shrine: { name: 'MOON SHRINE', color: '#cfe6ff' }, board: { name: 'HUNT BOARD', color: '#e8d2a0' }
  });
  Object.assign(BOSS_LINES, {
    skarn: { first: () => [
        { who: 'skarn', text: story.bossDefeated ? "You got rid of Grukk? Good. I never liked him." : "If Grukk sent you, tell him he can dig up his own swamp." },
        { who: 'rowan', text: "I came because you're raiding the village road." },
        { who: 'skarn', text: "We're leaving. Have you looked up lately? I’m taking what I can carry. Starting with that helmet." }],
      retry: [{ who: 'skarn', text: 'Back for more mud?' }], tip: 'Jump when the hammer hits the ground.', flag: 'mireStarted' },
    mourn: { first: [
        { who: 'mourn', text: "Don't take another step. They've dug up enough graves." },
        { who: 'rowan', text: "I'm not with them. Aldric was my father. Is my father." },
        { who: 'mourn', text: "He left me here with a bell and an oath. I rang it long after they buried me. Then the thieves came." },
        { who: 'mourn', text: "I can't let another person through. Not even you." }],
      retry: [{ who: 'mourn', text: 'You return to your grave. Good.' }], tip: 'Swing at his moonfire to break it!', flag: 'barrowStarted' },
    wyrm: { first: [
        { who: 'ignaroth', text: 'Last Watchmen down here brought a whole wagon of silver. What did you bring?' },
        { who: 'rowan', text: 'Nothing. I came for the stone you swallowed.' },
        { who: 'ignaroth', text: "You can have it when I'm done with it." }],
      retry: [{ who: 'ignaroth', text: 'Still not ash? Let me help.' }], tip: 'Roll through the fire, strike after his breath.', flag: 'cinderStarted' },
    tidemaw: { first: () => [
        { who: 'tidemaw', text: 'I used to ring for the readers. Before the water came up the stairs.' },
        { who: 'rowan', text: story.ch3Done ? 'One of them was Seren. Did you see where they took her?' : 'Do you remember any of their names?' },
        { who: 'tidemaw', text: story.ch3Done ? "I couldn't see past the door. I could hear her singing, though." : "Some. I wrote them down. The rest are gone." },
        { who: 'tidemaw', text: "Stay away from the bell." }],
      retry: [{ who: 'tidemaw', text: '...toll... toll...' }], tip: 'Break his moonfire with your sword, punish him up close.', flag: 'archiveStarted' }
  });
  Object.assign(BOSS_CINE, {
    skarn:   { nameAt: 1.9, main: '#ffcf8a', hot: '#fff3c8', deep: '#8a3a10', glow: '255,150,60', crest: 'skull' },
    mourn:   { nameAt: 2.0, main: '#c8d8ff', hot: '#ffffff', deep: '#2a3a8a', glow: '150,180,255', crest: 'moon' },
    wyrm:    { nameAt: 2.0, main: '#ffb36a', hot: '#fff0c8', deep: '#a82a10', glow: '255,110,40', crest: 'flame' },
    tidemaw: { nameAt: 2.0, main: '#a8f0f0', hot: '#ffffff', deep: '#106a7a', glow: '110,220,230', crest: 'moon' }
  });
  // Lore for the side areas, Mother's register, and the werewolves of the opening night.
  LORE.splice(1, 0,
    { id: 'howl', kind: 'page', scene: 'forest', x: 1020, title: "Trapper's Warning", where: 'Nailed to a tree, forest trail', hint: 'On the trail, not far from home.',
      text: "Wolves walked upright past the village last night. Moonstruck, the old folk call it. When the moon hangs this close, the wolves in the hills drink its light and forget they were ever wolves. Stay inside after dark. Aldric went after them at dawn and did not come back down the hill road.", sign: '- Hob, trapper' });
  LORE.push(
    { id: 'hessa', kind: 'stone', scene: 'mire', x: 740, title: "The Mire Witch's Ward", where: 'Rune stone, the Witchmire', hint: 'Near the old witch hut.',
      text: 'HESSA LIVED HERE. SHE SOLD CHARMS TO THE WATCH AND SECRETS TO MORWEN. When the moon broke, Morwen came for her one last time and asked how to bring a dead child back. Hessa said: you cannot. Morwen said: then I will make a world where children do not die.' },
    { id: 'pictos', kind: 'stone', scene: 'mire', x: 1520, title: 'Goblin Pictograms', where: 'Scratched rock, the Witchmire', hint: 'Deep in the mire.',
      text: 'Crude pictures scratched in mud-rock. A big moon. Goblins running. A goblin with a glowing crown. Pale horses carrying a shining stone east. And at the end, one small goblin hiding in the reeds, with the word SKARN under it, many times.' },
    { id: 'roll', kind: 'stone', scene: 'barrow', x: 700, title: 'Roll of the Fallen', where: 'Grave stone, the Watch Barrows', hint: 'Among the first graves.',
      text: 'HERE LIE THE BROTHERS OF THE SILVER WATCH WHO TOOK UP THE SHARD AND WERE LOST TO IT. Bertil. Osk. Mourn the Bell-Ringer. Ninety-one names. Captain Aldric sealed the shard beneath them, and set this stone so no one would forget why.' },
    { id: 'orders', kind: 'page', scene: 'barrow', x: 1380, title: "An Acolyte's Orders", where: 'A dropped scroll, the Watch Barrows', hint: 'Deep in the barrows.',
      text: 'By order of the Pale Queen: dig every Watch grave. Splinters of the Hollow shard sleep in the bones of those it took. Every splinter brings the new moon closer. Leave the goblin his crown. A king who thinks he won will not notice what we carried away.' },
    { id: 'ledger', kind: 'page', scene: 'cinder', x: 640, title: "Caravan Master's Ledger", where: 'A burnt ledger, Cinder Deep', hint: 'Near the mouth of the deep.',
      text: 'Night of the Black Tide, twelve winters ago. Three wagons of moonsilver for Gloamhold. Riders on burning horses came down the road. We hid in the old mine. Something in the dark below us was breathing. It liked the moonsilver. It liked us more.' },
    { id: 'star', kind: 'stone', scene: 'cinder', x: 1460, title: 'The Fallen Star', where: 'Scorched stone, Cinder Deep', hint: 'Deep in the cavern.',
      text: 'A SECOND SHARD FELL HERE ON THE NIGHT OF THE MOONFALL. THE MINERS CALLED IT THE EMBER STAR. A cave wyrm swallowed it whole and has not stopped burning since. The Pale Court never came for this one. Even they were afraid.' },
    { id: 'register', kind: 'page', scene: 'archive', x: 720, title: 'Register of Moon-Readers', where: 'Waterlogged register, Sunken Archive', hint: 'In the first reading hall.',
      text: "Moon-readers in residence, the winter of the fever: Brother Calden. Ilse of the Marsh. S. of the Hollow villages, here to study the well. The rest of the page tore away in the flood.", sign: '- Archive record' },
    { id: 'lys', kind: 'page', scene: 'archive', x: 1460, title: 'The Long Winter', where: 'A scholar\'s note, Sunken Archive', hint: 'Deep in the archive.',
      text: "Morwen had a daughter named Lys. In the Long Winter the moon waned for nine nights and the cold came in. Lys did not wake. Morwen sat by the window for the whole of the tenth night and asked the moon why it had looked away. The next spring she began to pull it down." },
    { id: 'skarnend', kind: 'page', scene: null, x: 0, title: "Skarn's Hoard", where: 'Found where Skarn fell', hint: 'Defeat the champion of the Witchmire.',
      text: "Skarn's hoard is mostly spoons. Under the spoons is a Watch map with the Hollow circled, and a note in a pale, elegant hand: 'Dig where the crown-wearer sleeps. Payment on delivery.' Someone paid the goblins to dig up the shard." },
    { id: 'mournend', kind: 'page', scene: null, x: 0, title: 'The Bell-Ringer', where: 'Found where Mourn fell', hint: 'Defeat the champion of the Barrows.',
      text: "Mourn died with the other Watchmen. His spirit still rang the barrow bell each night for twenty winters to keep the shard quiet. A week ago, the acolytes opened his grave. The bell went silent. After that, the wolves started walking upright." },
    { id: 'ignarothend', kind: 'page', scene: null, x: 0, title: 'The Ember Star', where: 'Found where Ignaroth fell', hint: 'Defeat the champion of Cinder Deep.',
      text: 'The wyrm coughs up the Ember Star as it dies, a shard the size of a fist, still burning. Wren will want to see this. It is one shard the Pale Queen will never have.' },
    { id: 'tidemawend', kind: 'page', scene: null, x: 0, title: "Seren's Verse", where: 'Found where Tidemaw fell', hint: 'Defeat the champion of the Sunken Archive.',
      text: "A page tucked inside the bell. 'Ring once if the water reaches the stairs. If they come for the singers, ring twice. I won't sing for her.' The note is signed S." }
  );
  // Shrines, moon moths and hunt boards placed through the world.
  const SHRINES = { forest: 2560, hollow: 1160, pass: 1660, gloam: 1850, mire: 920, barrow: 1080, cinder: 820, archive: 1180 };
  const MOTHS = {
    forest: [[1350, 98], [2280, 100], [3200, 108]], hollow: [[610, 108], [1290, 100], [2010, 106]], pass: [[650, 108], [1335, 102], [2760, 80]],
    gloam: [[630, 110], [1690, 96], [3030, 82]], mire: [[600, 100], [1245, 88], [1665, 96]], barrow: [[650, 104], [1210, 96], [1685, 102]],
    cinder: [[620, 104], [1190, 96], [1440, 76]], archive: [[650, 106], [912, 82], [1428, 102]]
  };
  const MOTH_TOTAL = Object.values(MOTHS).reduce((s, a) => s + a.length, 0);
  const BOARDS = [{ fire: 'camp', scene: 'forest', x: 3560 }, { fire: 'lookout', scene: 'pass', x: 1835 }, { fire: 'gate', scene: 'gloam', x: 2185 }];
  const BLESSINGS = [
    { id: 'swift', name: 'SWIFTFOOT', desc: 'You move faster.', color: '#9be37a' },
    { id: 'wrath', name: 'WRATH OF THE MOON', desc: '+3 damage.', color: '#ff8a6a' },
    { id: 'ward', name: 'SILVER WARD', desc: 'Take 2 less damage.', color: '#a8c4ff' },
    { id: 'fortune', name: 'FORTUNE', desc: 'Luck up, double coins.', color: '#f2c14e' },
    { id: 'mend', name: 'MOONMEND', desc: 'Slowly heal over time.', color: '#ff9ab8' }
  ];
  const depths = { moths: [], shrines: [], blessing: null, bounty: null, bountiesDone: 0, peddler: null, ambush: null, mothRewards: 0, champs: 0 };
  let peddlerSel = 0, mendTimer = 0;

  function depthR() { return REGIONS[platformScene] || {}; }
  function blessed(id) { return depths.blessing && depths.blessing.id === id && time < depths.blessing.until; }
  function blessSpeed() { return blessed('swift') ? 1.3 : 1; }
  function blessDamage(d) { return blessed('wrath') ? d + 3 : d; }
  function blessHurt(a) { return blessed('ward') ? Math.max(1, a - 2) : a; }
  function blessLuck() { return blessed('fortune') ? 0.6 : 0; }
  function blessCoins() { return blessed('fortune') ? 2 : 1; }

  // ---- Bounties from the hunt boards ----
  const BOUNTY_POOLS = { 1: ['goblin', 'sneak', 'brute', 'mushroom', 'rotshroom', 'skeleton', 'shade', 'acolyte', 'eye'], 2: ['hound', 'crow', 'skull', 'fiend', 'toad', 'gazer'], 3: ['lamp', 'drowned', 'gazer', 'acolyte', 'skeleton', 'ghost'] };
  function newBounty() {
    const ch = Math.min(3, questChapter()), roll = Math.random();
    if (roll < 0.18) return { kind: 'elite', need: 2 + Math.floor(Math.random() * 2), have: 0, reward: 40 + ch * 15, rarity: rollRarity(0.3, 'rare') };
    if (roll < 0.3) return { kind: 'chest', need: 3, have: 0, reward: 30 + ch * 10, rarity: rollRarity(0.2) };
    const pool = BOUNTY_POOLS[ch], type = pool[Math.floor(Math.random() * pool.length)];
    const need = 4 + Math.floor(Math.random() * 5);
    return { kind: 'kill', type, need, have: 0, reward: need * (4 + ch * 2), rarity: rollRarity(0.1) };
  }
  function bountyLabel(b) {
    if (!b) return 'No bounty taken';
    if (b.kind === 'elite') return 'Slay ' + b.need + ' elites';
    if (b.kind === 'chest') return 'Open ' + b.need + ' chests';
    const n = MOB_TYPES[b.type].name; return 'Slay ' + b.need + ' ' + n + (/s$/.test(n) ? '' : 's');
  }
  function useBoard() {
    const b = depths.bounty;
    if (b && b.have >= b.need) {
      inventory.coins = (inventory.coins || 0) + b.reward;
      depths.bountiesDone++; depths.bounty = null;
      sfx('victory', 0.7); padRumble(0.4, 0.5, 220);
      notice = 'Bounty claimed: +' + b.reward + ' coins.'; noticeUntil = time + 2.6;
      if (Math.random() < 0.35 + luckValue() * 0.2) dropRelic(sidePlayer.x, sidePlayer.y - 40, b.rarity);
      else pickups.push({ type: 'tonic', amount: 1, x: sidePlayer.x, y: sidePlayer.y - 40, vx: 30, vy: -200, age: 0 });
      if (onSave) onSave(getSaveData());
      return;
    }
    if (b) { startDialogue([{ who: 'board', text: 'CURRENT BOUNTY: ' + bountyLabel(b) + '. Progress ' + b.have + ' / ' + b.need + '. Reward ' + b.reward + ' coins and a ' + RARITY[b.rarity].name.toLowerCase() + ' prize.' }]); return; }
    const nb = newBounty(); depths.bounty = nb;
    sfx('bookOpen');
    startDialogue([{ who: 'board', text: 'A new notice is pinned up: ' + bountyLabel(nb) + '. Reward: ' + nb.reward + ' coins and a ' + RARITY[nb.rarity].name.toLowerCase() + ' prize. Come back to any hunt board to claim it.' }], () => { if (onSave) onSave(getSaveData()); });
  }
  function depthsOnKill(m) {
    const b = depths.bounty;
    if (b && b.have < b.need && ((b.kind === 'kill' && m.type === b.type) || (b.kind === 'elite' && m.elite))) {
      b.have++;
      if (b.have >= b.need) { notice = 'Bounty complete. Return to a hunt board.'; noticeUntil = time + 2.6; sfx('level', 0.6); }
      else addDamageNumber(sidePlayer.x, sidePlayer.y - 76, 'BOUNTY ' + b.have + '/' + b.need, '#e8d2a0');
    }
    if (m.T.spores) { for (let i = -1; i <= 1; i++) sporeClouds.push({ x: m.x + i * 14, y: SIDE_GROUND_Y - 10, life: 3.2, max: 3.2, hit: 0 }); sfx('squish', 0.6, 0.7); }
    if (m.ambush && depths.ambush && !depths.ambush.done && depths.ambush.mobs.every(o => o.dead)) finishAmbush();
  }
  function depthsOnChest() {
    const b = depths.bounty;
    if (b && b.kind === 'chest' && b.have < b.need) { b.have++; if (b.have >= b.need) { notice = 'Bounty complete. Return to a hunt board.'; noticeUntil = time + 2.6; } }
  }

  // ---- Moon shrines ----
  function useShrine() {
    const key = platformScene;
    if (depths.shrines.includes(key)) { notice = 'The shrine is quiet. Rest at a fire to rekindle it.'; noticeUntil = time + 2.2; sfx('uiError'); return; }
    depths.shrines.push(key);
    sidePlayer.pray = { t: 0 }; sidePlayer.vx = 0;
    sfx('magic', 0.8); padRumble(0.3, 0.5, 300);
    const roll = Math.random();
    if (roll < 0.14) {
      // A trial: the moon sends champions of its own.
      notice = 'THE MOON TESTS YOU. Survive the trial!'; noticeUntil = time + 2.6;
      startAmbush(sidePlayer.x, true);
      return;
    }
    if (roll < 0.22) {
      stats.health = stats.maxHealth; inventory.coins = (inventory.coins || 0) + 25;
      notice = 'A gift! Healed and 25 coins at your feet.'; noticeUntil = time + 2.6; return;
    }
    const B = BLESSINGS[Math.floor(Math.random() * BLESSINGS.length)];
    depths.blessing = { id: B.id, until: time + 120, t: time };
    notice = 'Blessing: ' + B.name + ' - ' + B.desc; noticeUntil = time + 3;
    spawnSparks(sidePlayer.x, sidePlayer.y - 30, 1, 18, [B.color, '#ffffff', '#cfe6ff']);
  }

  // ---- Moon moths ----
  function mothKey(scene, i) { return scene + ':' + i; }
  function updateMoths() {
    const list = MOTHS[platformScene]; if (!list) return;
    list.forEach(([mx, my], i) => {
      const k = mothKey(platformScene, i); if (depths.moths.includes(k)) return;
      const y = my + Math.sin(time * 2 + i) * 3;
      if (Math.abs(sidePlayer.x - mx) < 14 && sidePlayer.y - 44 < y + 6 && sidePlayer.y > y - 6) {
        depths.moths.push(k); inventory.mothlamp = 1;
        sfx('gem', 0.8, 1.3); spawnSparks(mx, y, 1, 12, ['#cfe6ff', '#ffffff', '#8fd8ff']);
        const n = depths.moths.length;
        addDamageNumber(mx, y - 10, 'MOON MOTH ' + n + '/' + MOTH_TOTAL, '#cfe6ff');
        mothMilestone(n);
        if (onSave) onSave(getSaveData());
      }
    });
  }
  const MOTH_REWARDS = [[6, 'Your lantern glows. Max health +4.'], [12, 'The moths gather. A relic falls from the light.'], [18, 'The lantern hums. A new relic slot opens.'], [MOTH_TOTAL, 'Every moth found. The old moon shines in your hands.']];
  function mothMilestone(n) {
    MOTH_REWARDS.forEach(([at, text], k) => {
      if (n !== at || depths.mothRewards > k) return;
      depths.mothRewards = k + 1;
      notice = text; noticeUntil = time + 3.2; sfx('victory', 0.7);
      if (k === 0) { stats.maxHealth += 4; stats.health = stats.maxHealth; }
      if (k === 1) dropRelic(sidePlayer.x, sidePlayer.y - 50, rollRarity(0.4, 'rare'));
      if (k === 2) fortune.slots = Math.min(4, fortune.slots + 1);
      if (k === 3) dropRelic(sidePlayer.x, sidePlayer.y - 50, 'legend');
    });
  }

  // ---- Tess, the wandering peddler ----
  function rollPeddler(scene) {
    depths.peddler = null;
    const R = REGIONS[scene]; if (!R || R.side || R.peaceful && scene !== 'village' || scene === 'ring') return;
    if (Math.random() > (scene === 'village' ? .27 : .38)) return;
    const lo = 420, hi = (R.arena ? R.arena.left : R.width) - 400;
    let x = scene === 'village' ? 925 : lo + Math.random() * Math.max(0, hi - lo);
    if (FIRES.some(f => f.scene === scene && Math.abs(f.x - x) < 200)) x = lo + 80;
    const wares = [];
    const relicR = rollRarity(0.35, 'rare'), rid = randomRelic(relicR);
    if (rid) wares.push({ kind: 'relic', id: rid, price: { common: 30, rare: 55, epic: 90, legend: 140 }[RELICS[rid].rarity] });
    wares.push({ kind: 'item', id: 'tonic', n: 2, price: 14 });
    wares.push({ kind: 'mystery', price: 25 });
    wares.push({ kind: 'bless', price: 20 });
    depths.peddler = { scene, x: Math.round(x), wares, bob: Math.random() * 6 };
  }
  function talkToPeddler() {
    const first = !story.peddlerMet; story.peddlerMet = true;
    const lines = first ? [
      { who: 'tess', text: "Oh! A knight. A real one, with the little silver tree on the shield. I'm Tess. I go where the road goes, and the road goes everywhere lately." },
      { who: 'tess', text: "Bits of the moon have been turning up in odd places. I collect them. And other things. Want to see?" }]
      : [[{ who: 'tess', text: 'Back again? The road is lonely. Buy something, it helps.' }], [{ who: 'tess', text: "Saw pale riders on the ridge last night. I hid in my own pack. It's a big pack." }], [{ who: 'tess', text: 'Mystery bundles are my favorite. Even I forget what I put in them.' }]][Math.floor(Math.random() * 3)];
    startDialogue(lines, () => { peddlerSel = 0; openPanel('peddler'); });
  }
  function peddlerBuy() {
    const p = depths.peddler; if (!p) return;
    const w = p.wares[peddlerSel]; if (!w || w.sold) { sfx('uiError'); return; }
    if ((inventory.coins || 0) < w.price) { sfx('uiError'); notice = 'Not enough coins.'; noticeUntil = time + 1.5; invShake = time; return; }
    inventory.coins -= w.price; w.sold = true; sfx('coin', 0.9);
    if (w.kind === 'relic') { panel = null; grantRelic(w.id); }
    else if (w.kind === 'item') { inventory[w.id] = (inventory[w.id] || 0) + w.n; newItems.add(w.id); notice = 'Bought ' + w.n + ' ' + ITEM_DEFS[w.id].name + '.'; noticeUntil = time + 1.8; }
    else if (w.kind === 'bless') { const B = BLESSINGS[Math.floor(Math.random() * BLESSINGS.length)]; depths.blessing = { id: B.id, until: time + 120, t: time }; notice = 'Tess burns a charm. ' + B.name + '!'; noticeUntil = time + 2.4; }
    else {
      const r = Math.random();
      if (r < 0.15) { panel = null; dropRelic(sidePlayer.x, sidePlayer.y - 40, rollRarity(0.2)); notice = 'The bundle holds a relic!'; }
      else if (r < 0.55) { inventory.coins += 45; notice = 'The bundle is full of coins. +45.'; }
      else if (r < 0.8) { inventory.bread = (inventory.bread || 0) + 3; newItems.add('bread'); notice = 'Three loaves of bread. Tess shrugs.'; }
      else { notice = 'The bundle is full of spoons. Tess looks embarrassed.'; }
      noticeUntil = time + 2.2;
    }
    if (onSave) onSave(getSaveData());
  }
  function wareName(w) {
    if (w.kind === 'relic') return RELICS[w.id].name;
    if (w.kind === 'item') return ITEM_DEFS[w.id].name + ' x' + w.n;
    if (w.kind === 'bless') return 'Shrine Charm';
    return 'Mystery Bundle';
  }
  function wareDesc(w) {
    if (w.kind === 'relic') return RARITY[RELICS[w.id].rarity].name + ' relic. ' + RELICS[w.id].desc;
    if (w.kind === 'item') return 'Heals in a pinch. Always useful.';
    if (w.kind === 'bless') return 'A random moon blessing for two minutes.';
    return 'Could be anything. Probably spoons.';
  }
  function drawPeddlerPanel() {
    const p = depths.peddler; if (!p) { panel = null; return; }
    ctx.save();
    ctx.fillStyle = 'rgba(6,4,12,.82)'; ctx.fillRect(0, 0, 320, 240);
    const x = 46, y = 44, w = 228, h = 156;
    ctx.fillStyle = '#1b1424'; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#b98cff'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    ctx.strokeStyle = '#4a3560'; ctx.strokeRect(x + 2.5, y + 2.5, w - 5, h - 5);
    invText("TESS'S PACK", x + 10, y + 16, '#e8d2ff', 'bold 9px monospace');
    ctx.fillStyle = '#f2c14e'; ctx.fillRect(x + w - 50, y + 9, 5, 5);
    invText(String(inventory.coins || 0), x + w - 10, y + 15, '#ffe3a1', 'bold 7px monospace', 'right');
    peddlerSel = clamp(peddlerSel, 0, p.wares.length - 1);
    p.wares.forEach((ware, i) => {
      const ry = y + 26 + i * 22, sel = i === peddlerSel;
      ctx.fillStyle = sel ? '#2e2240' : '#231a30'; ctx.fillRect(x + 8, ry, w - 16, 19);
      if (sel) { ctx.strokeStyle = '#d7b6ff'; ctx.strokeRect(x + 8.5, ry + 0.5, w - 17, 18); }
      ctx.fillStyle = '#0d0a10'; ctx.fillRect(x + 12, ry + 2, 15, 15);
      if (ware.kind === 'relic') drawRelicIcon(ware.id, x + 15.5, ry + 5.5, 1);
      else if (ware.kind === 'item') drawItemIcon('tonic', x + 13, ry + 3, 1);
      else { ctx.fillStyle = ware.kind === 'bless' ? '#cfe6ff' : '#b88a5a'; ctx.fillRect(x + 16, ry + 6, 7, 7); ctx.fillStyle = '#0d0a10'; ctx.fillRect(x + 19, ry + 8, 1, 3); }
      const col = ware.sold ? '#6f6670' : ware.kind === 'relic' ? RARITY[RELICS[ware.id].rarity].color : '#f3e7c9';
      invText(wareName(ware), x + 32, ry + 9, col, 'bold 7px monospace');
      invText(ware.sold ? 'SOLD' : ware.price + 'c', x + w - 14, ry + 9, ware.sold ? '#6f6670' : (inventory.coins || 0) >= ware.price ? '#ffe3a1' : '#c86a6a', 'bold 7px monospace', 'right');
      invText(wareDesc(ware).slice(0, 44), x + 32, ry + 16, '#8f8478', '5px monospace');
    });
    invText(inputMode === 'pad' ? 'UP/DOWN CHOOSE   ✕ BUY   ○ LEAVE' : 'W/S CHOOSE   E BUY   ESC LEAVE', 160, y + h - 8, '#c9bca6', '6px monospace', 'center');
    ctx.restore();
  }
  function peddlerInput(act) {
    if (act === 'up') { peddlerSel = Math.max(0, peddlerSel - 1); sfx('uiMove'); }
    else if (act === 'down') { peddlerSel = Math.min(((depths.peddler && depths.peddler.wares.length) || 1) - 1, peddlerSel + 1); sfx('uiMove'); }
    else if (act === 'ok') peddlerBuy();
    else if (act === 'back') { panel = null; sfx('uiBack'); }
  }

  // ---- Ambushes ----
  function rollAmbush(scene) {
    depths.ambush = null;
    const R = REGIONS[scene]; if (!R || R.peaceful || scene === 'ring' || scene === 'forest' && !equipment.armor) return;
    if (Math.random() > (R.side ? 0.45 : 0.3)) return;
    const hi = (R.arena ? R.arena.left : R.width - 400) - 260;
    const x = 500 + Math.random() * Math.max(100, hi - 500);
    if (FIRES.some(f => f.scene === scene && Math.abs(f.x - x) < 220)) return;
    depths.ambush = { x: Math.round(x), armed: true, done: false, mobs: [] };
  }
  function startAmbush(x, trial) {
    const types = Array.from(new Set((SCENE_MOBS[platformScene] || []).map(s => s[0]))).filter(t => !MOB_TYPES[t].riser && !MOB_TYPES[t].boss && t !== 'reever');
    const n = trial ? 3 : 3 + Math.min(2, questChapter() - 1);
    const mobs = [];
    for (let i = 0; i < n; i++) {
      const t = types[Math.floor(Math.random() * types.length)] || 'goblin';
      const side = i % 2 ? 1 : -1;
      const m = makeMob(t, clamp(x + side * (90 + i * 26), 60, sideWorldWidth() - 60), 80, i);
      m.respawn = Infinity; m.ambush = true; m.dormant = false; m.flash = 0.4; m.attackCooldown = 0.8 + i * 0.25;
      if (trial || Math.random() < 0.3) makeElite(m);
      m.dir = side < 0 ? 1 : -1;
      sideMobs.push(m); mobs.push(m);
      spawnDust(m.x, SIDE_GROUND_Y, 8);
    }
    depths.ambush = { x: Math.round(x), armed: false, done: false, mobs, t: time, trial: !!trial };
    sceneTitle = null;
    sfx('roar', 0.7, 1.1); screenShake = 5; padRumble(0.6, 0.6, 300);
    ambushBanner = { t: time, text: trial ? 'TRIAL OF THE MOON' : 'AMBUSH!' };
  }
  let ambushBanner = null;
  function finishAmbush() {
    const a = depths.ambush; a.done = true;
    const list = sceneChests();
    list.push({ x: clamp(Math.round(sidePlayer.x + sidePlayer.facing * 40), 80, sideWorldWidth() - 80), rarity: rollRarity(a.trial ? 0.6 : 0.3, 'rare'), mimic: false, open: false, t: 0, looted: false, bonus: true });
    notice = a.trial ? 'Trial passed! The moon leaves a chest.' : 'Ambush beaten! They dropped a chest.'; noticeUntil = time + 2.6;
    sfx('victory', 0.6);
    ambushBanner = { t: time, text: a.trial ? 'TRIAL PASSED' : 'AMBUSH CLEARED', good: true };
  }

  // ---- Spore clouds left by rot shrooms ----
  const sporeClouds = [];
  function updateSpores(dt) {
    for (let i = sporeClouds.length - 1; i >= 0; i--) {
      const s = sporeClouds[i]; s.life -= dt; s.hit -= dt;
      if (s.hit <= 0 && sidePlayer.deadTime <= 0 && Math.abs(sidePlayer.x - s.x) < 14 && sidePlayer.y > SIDE_GROUND_Y - 30 && canHitPlayer() && s.life < s.max - 0.4) {
        s.hit = 1; hurtSidePlayer(2, sidePlayer.x < s.x ? -1 : 1, 'Rot spores');
      }
      if (s.life <= 0) sporeClouds.splice(i, 1);
    }
  }
  function drawSpores() {
    sporeClouds.forEach(s => {
      const a = Math.min(1, s.life / 0.8) * Math.min(1, (s.max - s.life) / 0.3);
      for (let k = 0; k < 4; k++) {
        const ox = Math.sin(time * 2 + k * 1.7 + s.x) * 6, oy = Math.cos(time * 1.6 + k) * 4 - k * 4;
        ctx.fillStyle = 'rgba(140,200,70,' + 0.18 * a + ')';
        ctx.beginPath(); ctx.arc(s.x + ox, s.y + oy, 7 + k, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = 'rgba(210,255,140,' + 0.6 * a + ')';
      for (let k = 0; k < 3; k++) ctx.fillRect(Math.round(s.x + Math.sin(time * 3 + k * 2) * 8), Math.round(s.y - 6 - ((time * 10 + k * 7) % 16)), 1, 1);
    });
  }

  // ---- Entering and leaving the side areas ----
  const DEPTH_GATES = { forest: 'mire', hollow: 'barrow', pass: 'cinder', gloam: 'archive' };
  function depthsInteraction(x) {
    const R = depthR();
    const extra = forgeTrailInteraction(x);
    if (extra) return extra;
    if (depths.peddler && depths.peddler.scene === platformScene && Math.abs(x - depths.peddler.x) < 26) return { label: 'TALK TO TESS', act: talkToPeddler };
    const sh = SHRINES[platformScene];
    if (sh != null && Math.abs(x - sh) < 22) return { label: depths.shrines.includes(platformScene) ? 'SHRINE (QUIET)' : 'PRAY AT THE SHRINE', act: useShrine };
    const bd = BOARDS.find(b => b.scene === platformScene && Math.abs(x - b.x) < 20);
    if (bd) return { label: depths.bounty && depths.bounty.have >= depths.bounty.need ? 'CLAIM BOUNTY' : 'READ THE HUNT BOARD', act: useBoard };
    const dg = DEPTH_GATES[platformScene];
    if (dg && Math.abs(x - REGIONS[dg].parentX) < 24) {
      const D = REGIONS[dg];
      return { label: 'ENTER ' + D.name, act: () => enterRegion(dg, D.entry, 1) };
    }
    if (R.side) {
      if (x < 70) return { label: 'BACK TO ' + REGIONS[R.parent].name, act: () => enterRegion(R.parent, R.parentX + 30, 1) };
      if (x > R.width - 80 && story[R.bossFlag]) return { label: 'RETURN TO ' + REGIONS[R.parent].name, act: () => enterRegion(R.parent, R.parentX + 30, 1) };
    }
    return null;
  }
  function depthsOnEnter(scene, from) {
    sporeClouds.length = 0;
    if (from === scene) return;
    rollPeddler(scene);
    rollAmbush(scene);
    const R = REGIONS[scene];
    if (R && R.side && !story[R.bossFlag + 'Seen']) {
      story[R.bossFlag + 'Seen'] = true;
      const intro = {
        mire: [{ who: 'rowan', text: "Goblin tracks. And one square dent every few feet. What are they carrying?" }],
        barrow: [{ who: 'rowan', text: 'Graves. Hundreds of them. Every stone has the silver tree of the Watch on it.' }, { who: 'rowan', text: "Someone has been digging them up." }],
        cinder: [{ who: 'rowan', text: 'An old caravan mine. The air is hot enough to burn... and something down there is breathing.' }],
        archive: [{ who: 'rowan', text: story.ch3Done ? "Maybe there's something here about where they took Mother." : "The old Watch archive. Let's see what the flood left behind." }]
      }[scene];
      if (intro) setTimeout(() => { if (platformScene === scene && !dialogue && !bossFight && !bossOutro) startDialogue(intro); }, 1300);
    }
  }
  function depthsCine(c, boss, dt, th) {
    // Champions: a heavy step forward and a roar that shakes the hall.
    if (cineEvent(c, 'step', 0.6)) { boss.moving = true; sfx('slam', 0.6, 0.6); spawnDust(boss.x, SIDE_GROUND_Y, 10); screenShake = 3; }
    if (c.t > 0.6 && c.t < 1.2) { boss.x -= 30 * dt * c.speed; boss.walk += dt * 10; }
    if (cineEvent(c, 'roar', 1.25)) {
      boss.moving = false; boss.atkLen = 0.9; boss.attackTime = 0.9;
      sfx('roar', 1, boss.type === 'wyrm' ? 0.7 : 0.9); screenShake = 8; padRumble(1, 1, 600); c.flash = 0.35; c.flashColor = th.glow;
      cineFx.push({ kind: 'ring', x: boss.x, y: boss.y - boss.T.bodyH * 0.5, r: 8, vr: 240, life: 0.6, max: 0.6, color: th.glow });
      cineBurst(boss.x, boss.y - boss.T.bodyH * 0.5, 26, { angle: -Math.PI / 2, spread: Math.PI * 2, speed: 150, g: 60, life: 0.9, size: 2, color: th.glow });
    }
  }
  function depthsOutro() {
    const R = REGIONS[bossOutro.scene];
    const lore = { mire: 'skarnend', barrow: 'mournend', cinder: 'ignarothend', archive: 'tidemawend' }[bossOutro.scene];
    bossOutro = null;
    depths.champs++;
    if (lore) addLore(lore);
    notice = 'Champion slain. New lore found.'; noticeUntil = time + 3.4;
    ambushBanner = { t: time, text: 'CHAMPION SLAIN', good: true, color: R.color };
    if (onSave) onSave(getSaveData());
  }

  // ---- Per-frame update ----
  function updateDepths(dt) {
    if (!outdoorScene()) return;
    updateSpores(dt);
    updateMoths();
    if (depths.blessing && time >= depths.blessing.until) { depths.blessing = null; notice = 'Your blessing fades.'; noticeUntil = time + 1.6; }
    if (blessed('mend') && stats.health > 0 && stats.health < stats.maxHealth) { mendTimer += dt; if (mendTimer > 2.5) { mendTimer = 0; stats.health++; addDamageNumber(sidePlayer.x, sidePlayer.y - 60, '+1', '#ff9ab8'); } }
    const a = depths.ambush;
    if (a && a.armed && !bossFight && !dialogue && Math.abs(sidePlayer.x - a.x) < 40 && sidePlayer.deadTime <= 0) startAmbush(a.x, false);
    if (a && !a.armed && !a.done && a.mobs.length && a.mobs.every(o => o.dead)) finishAmbush();
  }
  // Rest rekindles the shrines.
  function depthsOnRest() { depths.shrines.length = 0; }

  // ---- World drawing: gates, shrines, boards, moths, Tess ----
  function drawDepthGate(x, D) {
    const g = SIDE_GROUND_Y, c = D.color;
    const open = D.unlock();
    // two leaning posts and a crossbeam hung with charms
    ctx.fillStyle = '#1a1210'; ctx.fillRect(x - 22, g - 46, 6, 46); ctx.fillRect(x + 16, g - 46, 6, 46);
    ctx.fillStyle = '#3a2a20'; ctx.fillRect(x - 21, g - 45, 4, 45); ctx.fillRect(x + 17, g - 45, 4, 45);
    ctx.fillStyle = '#2a1e18'; ctx.fillRect(x - 26, g - 50, 52, 6);
    ctx.fillStyle = '#4a3828'; ctx.fillRect(x - 25, g - 49, 50, 3);
    for (let i = 0; i < 4; i++) { const cx = x - 14 + i * 9, sw = Math.sin(time * 2 + i) * 1.5; ctx.fillStyle = '#5a4a38'; ctx.fillRect(Math.round(cx + sw), g - 44, 1, 5); ctx.fillStyle = c; ctx.fillRect(Math.round(cx + sw) - 1, g - 39, 3, 3); }
    // a glow from the path beyond
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const gg = ctx.createRadialGradient(x, g - 20, 2, x, g - 20, 34);
    const rgb = hexRgb(c);
    gg.addColorStop(0, 'rgba(' + rgb + ',' + (0.22 + Math.sin(time * 2) * 0.06) + ')'); gg.addColorStop(1, 'rgba(' + rgb + ',0)');
    ctx.fillStyle = gg; ctx.fillRect(x - 34, g - 54, 68, 54); ctx.restore();
    ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(x - 15, g - 40, 30, 40);
    ctx.font = 'bold 5px monospace'; ctx.textAlign = 'center';
    ctx.fillStyle = '#0d0a10'; ctx.fillRect(x - 30, g - 60, 60, 9);
    ctx.fillStyle = open ? c : '#6f6670'; ctx.fillText(D.name.replace(/^THE /, ''), x, g - 54);
  }
  function hexRgb(h) { const n = parseInt(h.slice(1), 16); return ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255); }
  function drawShrine(x) {
    const g = SIDE_GROUND_Y, used = depths.shrines.includes(platformScene);
    ctx.fillStyle = '#1c1a24'; ctx.fillRect(x - 10, g - 6, 20, 6);
    ctx.fillStyle = '#3a3848'; ctx.fillRect(x - 8, g - 8, 16, 3);
    ctx.fillStyle = '#2c2a38'; ctx.fillRect(x - 4, g - 34, 8, 27);
    ctx.fillStyle = '#4a4860'; ctx.fillRect(x - 3, g - 33, 2, 25);
    // crescent on top
    const p = used ? 0.25 : 0.7 + Math.sin(time * 3) * 0.2;
    ctx.fillStyle = 'rgba(207,230,255,' + p + ')'; ctx.beginPath(); ctx.arc(x, g - 40, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1c1a24'; ctx.beginPath(); ctx.arc(x + 3, g - 42, 5, 0, Math.PI * 2); ctx.fill();
    if (!used) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const gg = ctx.createRadialGradient(x, g - 40, 1, x, g - 40, 26);
      gg.addColorStop(0, 'rgba(160,200,255,.3)'); gg.addColorStop(1, 'rgba(160,200,255,0)');
      ctx.fillStyle = gg; ctx.fillRect(x - 26, g - 66, 52, 52); ctx.restore();
      if (Math.random() < 0.08) combatFx.push({ kind: 'spark', x: x + (Math.random() - 0.5) * 10, y: g - 40, vx: 0, vy: -20, color: '#cfe6ff', life: 0.6, max: 0.6 });
    }
  }
  function drawBoard(x) {
    const g = SIDE_GROUND_Y, b = depths.bounty, ready = b && b.have >= b.need;
    ctx.fillStyle = '#2a1c12'; ctx.fillRect(x - 12, g - 30, 3, 30); ctx.fillRect(x + 9, g - 30, 3, 30);
    ctx.fillStyle = '#5a3e26'; ctx.fillRect(x - 14, g - 34, 28, 18);
    ctx.fillStyle = '#7a5634'; ctx.fillRect(x - 13, g - 33, 26, 2);
    ctx.fillStyle = '#e8d8b0'; ctx.fillRect(x - 10, g - 30, 8, 10); ctx.fillRect(x + 1, g - 29, 9, 8);
    ctx.fillStyle = '#8a7450'; ctx.fillRect(x - 9, g - 28, 6, 1); ctx.fillRect(x - 9, g - 26, 5, 1); ctx.fillRect(x + 2, g - 27, 7, 1);
    ctx.fillStyle = '#c8324a'; ctx.fillRect(x - 7, g - 31, 2, 2); ctx.fillRect(x + 5, g - 30, 2, 2);
    if (ready || !b) {
      const bob = Math.round(Math.sin(time * 4) * 2);
      ctx.fillStyle = ready ? '#9be37a' : '#f2c14e'; ctx.fillRect(x - 1, g - 46 + bob, 3, 6); ctx.fillRect(x - 1, g - 38 + bob, 3, 2);
    }
  }
  function drawMoths() {
    const list = MOTHS[platformScene]; if (!list) return;
    ctx.save();
    list.forEach(([mx, my], i) => {
      if (depths.moths.includes(mothKey(platformScene, i))) return;
      if (mx < sideCameraX - 20 || mx > sideCameraX + canvas.width + 20) return;
      const y = my + Math.sin(time * 2 + i) * 3, x = mx + Math.sin(time * 1.3 + i * 2) * 4;
      ctx.globalCompositeOperation = 'lighter';
      const gg = ctx.createRadialGradient(x, y, 1, x, y, 16);
      gg.addColorStop(0, 'rgba(180,220,255,.45)'); gg.addColorStop(1, 'rgba(180,220,255,0)');
      ctx.fillStyle = gg; ctx.fillRect(x - 16, y - 16, 32, 32);
      ctx.globalCompositeOperation = 'source-over';
      const flap = Math.abs(Math.sin(time * 12 + i)) * 3 + 1;
      ctx.fillStyle = '#e6f4ff'; ctx.fillRect(Math.round(x) - Math.round(flap) - 1, Math.round(y) - 2, Math.round(flap), 3); ctx.fillRect(Math.round(x) + 2, Math.round(y) - 2, Math.round(flap), 3);
      ctx.fillStyle = '#8fd8ff'; ctx.fillRect(Math.round(x), Math.round(y) - 2, 2, 4);
    });
    ctx.restore();
  }
  function drawPeddler() {
    const p = depths.peddler; if (!p || p.scene !== platformScene) return;
    const x = Math.round(p.x), g = SIDE_GROUND_Y, bob = Math.round(Math.sin(time * 2 + p.bob));
    if (x < sideCameraX - 40 || x > sideCameraX + canvas.width + 40) return;
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(x, g + 1, 16, 3, 0, 0, Math.PI * 2); ctx.fill();
    // a huge pack piled with pots and a lantern
    ctx.fillStyle = '#4a3020'; ctx.fillRect(x + 1, g - 34 + bob, 16, 26);
    ctx.fillStyle = '#6a4630'; ctx.fillRect(x + 2, g - 33 + bob, 14, 3);
    ctx.fillStyle = '#8a8070'; ctx.fillRect(x + 4, g - 40 + bob, 6, 6); ctx.fillStyle = '#b8732e'; ctx.fillRect(x + 11, g - 38 + bob, 5, 4);
    ctx.fillStyle = '#2a1a10'; ctx.fillRect(x + 17, g - 30 + bob, 1, 8);
    ctx.fillStyle = '#ffd36a'; ctx.fillRect(x + 16, g - 22 + bob, 3, 4);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const gg = ctx.createRadialGradient(x + 17, g - 20, 1, x + 17, g - 20, 22); gg.addColorStop(0, 'rgba(255,200,110,.35)'); gg.addColorStop(1, 'rgba(255,200,110,0)');
    ctx.fillStyle = gg; ctx.fillRect(x - 5, g - 42, 44, 44); ctx.restore();
    drawResident('tess', x - 5, g, 1, sidePlayer.x < x ? -1 : 1);
    if (Math.abs(sidePlayer.x - x) > 40) {
      ctx.fillStyle = '#0d0a10'; ctx.fillRect(x - 14, g - 50, 28, 8);
      ctx.fillStyle = '#d7b6ff'; ctx.font = 'bold 5px monospace'; ctx.textAlign = 'center'; ctx.fillText('PEDDLER', x, g - 44);
    }
  }
  function drawDepthDecor() {
    const R = depthR(), g = SIDE_GROUND_Y, L = sideCameraX - 60, Rr = sideCameraX + canvas.width + 60;
    if (platformScene === 'mire') {
      for (let x = Math.floor(L / 140) * 140; x < Rr; x += 140) {
        // black water pools and reeds
        const k = (x / 140) % 3;
        ctx.fillStyle = 'rgba(10,25,15,.85)'; ctx.fillRect(x + 20, g, 60 + k * 10, 3);
        ctx.fillStyle = 'rgba(140,210,120,' + (0.18 + Math.sin(time * 2 + x) * 0.08) + ')'; ctx.fillRect(x + 30 + Math.round(Math.sin(time + x) * 6), g + 1, 10, 1);
        ctx.fillStyle = '#2a4a24'; for (let r = 0; r < 5; r++) ctx.fillRect(x + 4 + r * 3, g - 6 - ((r * 7 + x) % 6), 1, 6 + ((r * 7 + x) % 6));
      }
      if (740 > L && 600 < Rr) {
        // the witch hut on stilts
        const hx = 600;
        ctx.fillStyle = '#1a1410'; ctx.fillRect(hx + 4, g - 20, 3, 20); ctx.fillRect(hx + 52, g - 20, 3, 20);
        ctx.fillStyle = '#3a2a1c'; ctx.fillRect(hx, g - 50, 60, 30);
        ctx.fillStyle = '#2a1e14'; ctx.beginPath(); ctx.moveTo(hx - 6, g - 50); ctx.lineTo(hx + 30, g - 74); ctx.lineTo(hx + 66, g - 50); ctx.fill();
        ctx.fillStyle = 'rgba(160,230,120,' + (0.5 + Math.sin(time * 3) * 0.2) + ')'; ctx.fillRect(hx + 12, g - 42, 8, 7);
        ctx.fillStyle = '#120c08'; ctx.fillRect(hx + 36, g - 44, 10, 24);
      }
    } else if (platformScene === 'barrow') {
      for (let x = Math.floor(L / 70) * 70; x < Rr; x += 70) {
        if (x > R.arena.left - 40 || x < 160) continue;
        const k = (x / 70) % 4, h = 14 + k * 3;
        ctx.fillStyle = '#1e2030'; ctx.fillRect(x, g - h, 12, h);
        ctx.fillStyle = '#34384c'; ctx.fillRect(x + 1, g - h + 1, 10, 2);
        ctx.fillStyle = '#4a5068'; ctx.fillRect(x + 5, g - h + 4, 2, 6); ctx.fillRect(x + 3, g - h + 6, 6, 2);
        if (k === 1) { ctx.fillStyle = '#2a1e18'; ctx.fillRect(x + 14, g - 3, 14, 3); ctx.fillStyle = '#3a2a20'; ctx.fillRect(x + 15, g - 5, 12, 2); }
      }
    } else if (platformScene === 'cinder') {
      for (let x = Math.floor(L / 120) * 120; x < Rr; x += 120) {
        const a = 0.35 + Math.sin(time * 2 + x * 0.1) * 0.2;
        ctx.fillStyle = 'rgba(255,' + (90 + Math.round(Math.sin(x) * 30)) + ',30,' + a + ')';
        ctx.fillRect(x + 10, g + 2, 26, 1); ctx.fillRect(x + 20, g + 3, 12, 1); ctx.fillRect(x + 50, g + 1, 18, 1);
        ctx.fillStyle = '#1a0806'; ctx.beginPath(); ctx.moveTo(x + 80, 0); ctx.lineTo(x + 92, 0); ctx.lineTo(x + 86, 18 + (x % 3) * 6); ctx.fill();
      }
    } else if (platformScene === 'archive') {
      for (let x = Math.floor(L / 160) * 160; x < Rr; x += 160) {
        // drowned bookshelves
        ctx.fillStyle = '#10181c'; ctx.fillRect(x + 20, g - 56, 34, 56);
        for (let s = 0; s < 4; s++) {
          ctx.fillStyle = '#1e2a30'; ctx.fillRect(x + 21, g - 54 + s * 14, 32, 2);
          for (let b = 0; b < 6; b++) { ctx.fillStyle = ['#3a2a40', '#2a3a40', '#4a3020', '#203040'][(b + s + x / 160) % 4]; ctx.fillRect(x + 22 + b * 5, g - 52 + s * 14 + (b % 2), 4, 11 - (b % 2)); }
        }
        ctx.fillStyle = 'rgba(10,30,40,.75)'; ctx.fillRect(x, g - 6, 160, 6);
        ctx.fillStyle = 'rgba(120,220,230,' + (0.15 + Math.sin(time * 2 + x) * 0.08) + ')'; ctx.fillRect(x + 30 + Math.round(Math.sin(time + x) * 8), g - 6, 18, 1);
      }
    }
    if (R.side && story[R.bossFlag]) drawSignpost(R.width - 50, REGIONS[R.parent].name.replace(/^THE /, ''), 1);
    if (R.side) drawSignpost(60, REGIONS[R.parent].name.replace(/^THE /, ''), -1);
  }
  const sceneryArt = Object.fromEntries(['woods', 'pillars', 'crystal-1', 'plant-2'].map(name => {
    const image = new Image(); image.src = 'assets/scenery/' + name + '.png'; return [name, image];
  }));
  const sceneryByScene = {
    forest: ['plant-2', 104, 232, '#efcf81', 24, 16, .82],
    hollow: ['pillars', 372, 107, '#ba9ac9', 112, 42, .66],
    pass: ['crystal-1', 228, 166, '#ffab68', 24, 24, .76],
    gloam: ['pillars', 492, 308, '#91b9cb', 102, 38, .69],
    mire: ['woods', 302, 164, '#acb977', 168, 54, .47],
    barrow: ['pillars', 289, 142, '#a8b9ed', 112, 42, .72],
    cinder: ['crystal-1', 178, 130, '#f99055', 32, 32, .91],
    archive: ['pillars', 244, 112, '#8ed6c9', 110, 42, .76]
  };
  function drawRegionalScenery() {
    const row = sceneryByScene[platformScene];
    if (!row) return;
    const [name, spacing, seed, glow, w, h, alpha] = row, img = sceneryArt[name];
    const left = sideCameraX - 128, right = sideCameraX + 448, ground = SIDE_GROUND_Y;
    ctx.save();
    for (let i = Math.max(0, Math.floor((left - seed) / spacing)); i * spacing + seed < Math.min(right, sideWorldWidth() - 100); i++) {
      const x = i * spacing + seed + ((i * 43) % 79) - 32;
      if (FIRES.some(f => f.scene === platformScene && Math.abs(f.x - x) < 78)) continue;
      if (region().arena && x > region().arena.left && i % 2) continue;
      ctx.globalAlpha = alpha;
      if (imgReady(img)) ctx.drawImage(img, Math.round(x - w / 2), ground - h, w, h);
      // Ground glints and drifting motes mark the biome without adding fake platforms.
      ctx.fillStyle = glow;
      for (let j = 0; j < 4; j++) {
        const cycle = (time * (5 + j) + i * 13 + j * 11) % 43;
        ctx.globalAlpha = (0.30 + .27 * Math.sin(cycle * Math.PI / 43)) * (1 - cycle / 60);
        const px = x + (j - 2) * 12 + Math.sin(time * .85 + j) * 7;
        ctx.fillRect(Math.round(px), Math.round(ground - 7 - cycle), j === 0 ? 2 : 1, 1);
      }
      ctx.globalAlpha = .24; ctx.fillRect(x - 12, ground - 1, 8, 1); ctx.fillRect(x + 8, ground - 2, 5, 1);
    }
    ctx.restore();
  }
  function drawDepthsWorld() {
    if (!outdoorScene()) return;
    drawRegionalScenery();
    drawDepthDecor();
    const dg = DEPTH_GATES[platformScene];
    if (dg) drawDepthGate(REGIONS[dg].parentX, REGIONS[dg]);
    const sh = SHRINES[platformScene]; if (sh != null) drawShrine(sh);
    BOARDS.filter(b => b.scene === platformScene).forEach(b => drawBoard(b.x));
    drawForgeTrail();
    drawPeddler();
    drawMoths();
    drawSpores();
  }
  // Screen-space colour grade and fog for the side areas.
  function drawDepthsGrade() {
    const R = depthR(); if (!R.side) return;
    const W = canvas.width, H = canvas.height;
    const gr = ctx.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, R.gradeTop); gr.addColorStop(1, R.gradeBot);
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
    if (platformScene === 'cinder') {
      // The pass opens into a mine here. Broken rock occludes the old skyline.
      const offset = Math.floor(sideCameraX * 0.38);
      for (let x = 0; x < W; x += 4) {
        const u = (x + offset) * 0.064;
        const edge = Math.floor(30 + 12 * Math.sin(u) + 10 * Math.sin(u * 0.57) + 7 * Math.cos(u * 2.2));
        ctx.fillStyle = '#2a1218'; ctx.fillRect(x, 0, 4, edge);
        ctx.fillStyle = '#562529'; ctx.fillRect(x, edge - 4, 4, 3);
      }
    }
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 5; i++) {
      const fx = ((i * 97 + time * (6 + i * 2) - sideCameraX * 0.3) % 420 + 420) % 420 - 50, fy = 150 + (i % 3) * 18;
      const g = ctx.createRadialGradient(fx, fy, 2, fx, fy, 70);
      g.addColorStop(0, 'rgba(' + R.fog + ',.10)'); g.addColorStop(1, 'rgba(' + R.fog + ',0)');
      ctx.fillStyle = g; ctx.fillRect(fx - 70, fy - 70, 140, 140);
    }
    ctx.restore();
  }
  // HUD: blessing timer, bounty tracker and the ambush banner.
  function drawDepthsHUD() {
    let y = 36;
    if (depths.blessing && time < depths.blessing.until) {
      const B = BLESSINGS.find(b => b.id === depths.blessing.id), left = Math.ceil(depths.blessing.until - time);
      ctx.fillStyle = 'rgba(9,10,20,.75)'; ctx.fillRect(4, y, 92, 10);
      ctx.fillStyle = B.color; ctx.fillRect(4, y + 9, Math.round(92 * left / 120), 1);
      invText(B.name, 7, y + 7, B.color, 'bold 5px monospace');
      invText(left + 's', 93, y + 7, '#c9bca6', '5px monospace', 'right');
      y += 12;
    }
    const b = depths.bounty;
    if (b) {
      ctx.fillStyle = 'rgba(9,10,20,.75)'; ctx.fillRect(4, y, 92, 10);
      const done = b.have >= b.need;
      invText(done ? 'BOUNTY DONE' : bountyLabel(b).toUpperCase().slice(0, 18), 7, y + 7, done ? '#9be37a' : '#e8d2a0', 'bold 5px monospace');
      invText(b.have + '/' + b.need, 93, y + 7, '#c9bca6', '5px monospace', 'right');
    }
    if (ambushBanner) {
      const t = time - ambushBanner.t; if (t > 2.4) { ambushBanner = null; return; }
      const a = Math.min(1, t * 5) * Math.min(1, (2.4 - t) * 2.5), s = 1 + Math.max(0, 0.3 - t) * 1.5;
      ctx.save(); ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(0, 104, 320, 26);
      const col = ambushBanner.color || (ambushBanner.good ? '#9be37a' : '#ff5a4a');
      ctx.fillStyle = col; ctx.fillRect(0, 104, 320, 1); ctx.fillRect(0, 129, 320, 1);
      ctx.translate(160, 122); ctx.scale(s, s);
      ctx.font = 'bold 14px monospace'; ctx.textAlign = 'center';
      ctx.fillStyle = '#000'; ctx.fillText(ambushBanner.text, 1, 1);
      ctx.fillStyle = col; ctx.fillText(ambushBanner.text, 0, 0);
      ctx.restore();
    }
  }
  function depthsSave() { return { moths: depths.moths.slice(), bounty: depths.bounty, bountiesDone: depths.bountiesDone, mothRewards: depths.mothRewards, champs: depths.champs }; }
  function depthsLoad(d) {
    if (!d || typeof d !== 'object') return;
    if (Array.isArray(d.moths)) depths.moths = d.moths.filter(k => typeof k === 'string');
    if (d.bounty && typeof d.bounty === 'object' && d.bounty.need) depths.bounty = d.bounty;
    if (Number.isFinite(d.bountiesDone)) depths.bountiesDone = d.bountiesDone;
    if (Number.isFinite(d.mothRewards)) depths.mothRewards = d.mothRewards;
    if (Number.isFinite(d.champs)) depths.champs = d.champs;
  }
  function depthsReset() { Object.assign(depths, { moths: [], shrines: [], blessing: null, bounty: null, bountiesDone: 0, peddler: null, ambush: null, mothRewards: 0, champs: 0 }); sporeClouds.length = 0; }

  // Side areas on the world map, branching off their parent region.
  const DEPTH_NODES = [
    { id: 'mire', name: 'Witchmire', x: 34, y: 98, from: [44, 70] }, { id: 'barrow', name: 'Barrows', x: 70, y: 38, from: [88, 52] },
    { id: 'cinder', name: 'Cinder Deep', x: 124, y: 92, from: [120, 64] }, { id: 'archive', name: 'Archive', x: 132, y: 22, from: [146, 40] }
  ];
  function depthKnown(id) { const R = REGIONS[id]; return story[R.bossFlag + 'Seen'] || story[R.bossFlag]; }
  function drawDepthMapNodes(mx0, my0, here) {
    DEPTH_NODES.forEach(n => {
      const R = REGIONS[n.id], known = depthKnown(n.id), px = mx0 + n.x, py = my0 + n.y;
      if (!known && !R.unlock()) return;
      ctx.strokeStyle = 'rgba(122,85,48,.7)'; ctx.setLineDash([1, 2]); ctx.beginPath(); ctx.moveTo(mx0 + n.from[0], my0 + n.from[1]); ctx.lineTo(px, py); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#3a2412'; ctx.fillRect(px - 2, py - 2, 5, 5);
      ctx.fillStyle = story[R.bossFlag] ? '#71b86c' : known ? R.color : '#a08a60'; ctx.fillRect(px - 1, py - 1, 3, 3);
      invText(known ? n.name : '?', px, py + 9, known ? '#5a3e22' : '#8a7450', '5px monospace', 'center');
      if (n.id === here) { const r = 4 + (Math.sin(time * 5) + 1) * 1.5; ctx.strokeStyle = 'rgba(200,40,40,.8)'; ctx.beginPath(); ctx.arc(px + 0.5, py + 0.5, r, 0, Math.PI * 2); ctx.stroke(); }
    });
  }
  // Moves the knight to another outdoor region (or a different spot in one).
  // The Salt Coast expansion. New state is namespaced so old slots still load.
  const TIDE_POINTS = { quay: 555, camp: 132, smith: 267, cook: 487, fisher: 670, pier: 810, stable: 1018, ring: 1200, hatch: 1450 };
  const TIDE_DYES = {
    iron: ['#26313b', '#718493', '#c5d0d3', '#435665', '#c49a55'],
    kelp: ['#142c32', '#367a68', '#b5e6ad', '#285450', '#e2bd65'],
    coral: ['#31202e', '#a54d60', '#f4bba0', '#673342', '#ffcc74']
  };
  const TIDE_DYE_FILTERS = { kelp: 'sepia(.40) hue-rotate(73deg) saturate(1.65)', coral: 'sepia(.42) hue-rotate(310deg) saturate(1.9)' };
  const TIDE_GEAR = ['coatTemper', 'armorWear', 'cowl', 'boots', 'cowlOn', 'bootsOn', 'dye', 'casts', 'caught', 'meal', 'mealTime', 'ending', 'arenaWins'];
  const tide = {};
  let tideFishing = null, tideArena = null, tideService = '', tideSel = 0, tideMessage = '', kiteClock = 0;
  function tideLoad(s) {
    Object.assign(tide, { coatTemper: 0, armorWear: 0, cowl: false, boots: false, cowlOn: false, bootsOn: false, dye: 'iron', casts: 0, caught: 0,
      forge: {}, wear: {}, mastery: {}, meal: '', mealTime: 0, ending: '', arenaWins: 0 });
    tideFishing = tideArena = null; kiteClock = 0; tideRide = tideDrift = false;
    if (!s || typeof s !== 'object') return;
    for (const k of ['cowl', 'boots', 'cowlOn', 'bootsOn']) tide[k] = s[k] === true;
    tide.cowlOn &&= tide.cowl; tide.bootsOn &&= tide.boots;
    for (const [k, max] of Object.entries({ coatTemper: 1, armorWear: 100, casts: 1e6, caught: 1e6, mealTime: 90, arenaWins: 1e6 })) {
      if (Number.isFinite(s[k])) tide[k] = clamp(s[k], 0, max);
    }
    if (Object.hasOwn(TIDE_DYES, s.dye)) tide.dye = s.dye;
    if (['shutter', 'homeward'].includes(s.ending)) tide.ending = s.ending;
    if (['chowder', 'skewer'].includes(s.meal)) tide.meal = s.meal;
    for (const w of Object.keys(WEAPONS)) for (const [k, max] of [['forge', 2], ['wear', 100], ['mastery', 100]]) {
      const val = s[k]?.[w]; if (Number.isFinite(val)) tide[k][w] = clamp(Math.floor(val), 0, max);
    }
  }
  function tideSave() {
    return { ...Object.fromEntries(TIDE_GEAR.map(k => [k, tide[k]])), forge: { ...tide.forge }, wear: { ...tide.wear }, mastery: { ...tide.mastery } };
  }
  const TIDE_INK = { k: '#101d2a', t: '#41877e', T: '#91dfb1', b: '#567699', B: '#80c6e2', W: '#eeecc8', g: '#a5734d', G: '#e0b071', o: '#f19b72', r: '#9e525e' };
  const TIDE_ICONS = Object.fromEntries(Object.entries({
    saltfin: '............ ..t.....t... ..kt...kT... ...ktttTTk.. ....tTWWTk.. ..kkTTTkWk.. ...ttBBkk... .......k....',
    ghosteel: '.......tt... ....ttTBWk.. ...tTBBBWk.. ..tTBBkkk... .tTBBk..t... .tBkk..tt... ..tBTTTk.... ...kkk......',
    chowder: '............ ....W..W.... .....W..W... ..kWWWWWWk.. .kGrGoGrrGk. .kBBBBBBBBk. ..kBBBBBBk.. ...kkkkkk...',
    skewer: '.........g.. ........g... ......rBG... .....rBWo... ....rBBG.... ...rBWG..... ...kBG...... ..gk........ .g..........',
    antler: '......G..... ....g.G.G... ....G.G.G.G. ....G.GGG.G. ...GGGgGGGG. .....gGGGG.. ..gGGGGGg... .Gggg.......',
    wellglass: '.....k...... ....kTk..... ...kTBTk.... ..kTBBWTk... ...kBWTk.... ...kTWTk.... ....kTk..... .....k......',
    tideblade: '..........k. .........kT. ........kTB. .......kTBk. ......kTBk.. .....kTBk... ..k.kTBk.... ..kkTBk..... ...kGk...... ..kgkk...... .kk.........'
  }).map(([k, rows]) => [k, rows.split(' ')]));
  Object.values(TIDE_ICONS).forEach(rows => { while (rows.length < 12) rows.push('............'); });
  const tideArt = {};
  for (const id of ['village-sky', 'village-far', 'village-ridge', 'village-trees', 'salt-wall', 'salt-deep', 'salt-gold',
    'well-far', 'well-reeds', 'well-reef', 'well-sand', 'fisher', 'smith', 'cook', 'kite', 'mount', 'stag-crown', 'keeper-lantern']) {
    tideArt[id] = loadImg('tide/' + id + '.png');
  }
  const tideGround = w => ({ x: 0, y: SIDE_GROUND_Y, w, h: 44 });
  Object.assign(REGIONS, {
    village: { name: 'BRINEWICK', tide: true, peaceful: true, width: 1550, entry: 86, color: '#ffe3aa', plats: [tideGround(1550)] },
    vault: { name: 'THE SALT VAULT', tide: true, width: 2110, entry: 75, color: '#e7bc83', plats: [tideGround(2110)], arena: { left: 1260, trigger: 1350, right: 1830 }, boss: 'saltStag', bossX: 1650, bossFlag: 'saltBossDone' },
    well: { name: 'THE LOWER WELL', tide: true, width: 2070, entry: 70, color: '#a4f5ec', plats: [tideGround(2070)], arena: { left: 1230, trigger: 1330, right: 1790 }, boss: 'wellKeeper', bossX: 1600, bossFlag: 'wellBossDone' },
    ring: { name: 'BREAKWATER RING', tide: true, width: 710, entry: 76, color: '#ffc692', plats: [tideGround(710)] }
  });
  for (const flag of ['villageVisited', 'vaultVisited', 'wellVisited', 'ringVisited', 'netQuest', 'netReturned', 'tideCache', 'saltBossSeen', 'saltBossDone',
    'wellBossSeen', 'wellBossDone', 'kiteFound', 'mountFound', 'tideBounty', 'reeverDown', 'tidePaid', 'driftWitnessed']) story[flag] = STORY_DEFAULTS[flag] = false;
  FIRES.push({ id: 'brine', scene: 'village', x: TIDE_POINTS.camp, name: 'Brinewick Hearth' });
  Object.assign(REGION_SUBS, { village: 'Salt Coast / Fisher settlement', vault: 'Hidden below the tidal flats', well: 'Saga I / The last watch', ring: 'Three waves / One bell' });
  const tideWalker = { src: 'tide/', voice: 'bones', hp: 23, speed: 65, chase: 250, reach: 48, dmg: 7, atkTime: 0.85, hit: [0.53, 0.68], cd: [1.4, 2.1], xp: 30, coins: [4, 7], drops: [] };
  const tideBossAnims = (id, frames) => ({ idle: [id, frames, 5], move: [id, frames, 8], attack: [id, frames], hurt: null, death: null });
  Object.assign(MOB_TYPES, {
    hexer: { ...tideWalker, name: 'Brine Hexer', anims: tideBossAnims('hexer', 5), fw: 55, fh: 93, ax: 27, ay: 87, scale: .75, faceLeft: true,
      bodyH: 43, width: 24, fly: 13, ranged: true, reach: 144, hp: 19, dmg: 6, light: '124,222,211', drops: [['saltfin', 0.20]] },
    reever: { ...tideWalker, name: 'Low-Tide Reever', tideArt: 'reever', anims: {}, bodyH: 53, width: 22, hp: 58, speed: 87, reach: 59,
      armor: true, pounce: 150, dmg: 9, atkTime: 0.99, cd: [1.65, 2.0], xp: 95, coins: [10, 14] },
    saltStag: { ...tideWalker, name: 'Salt Stag, the Hoardbound', short: 'The Salt Stag', anims: tideBossAnims('watcher', 4), second: 'stag-crown',
      fw: 112, fh: 144, ax: 47, ay: 142, scale: .85, faceLeft: true, bodyH: 83, width: 53, hp: 130, boss: true, armor: true,
      chase: 900, reach: 76, speed: 70, dmg: 10, atkTime: 1.17, cd: [1.65, 2.0], xp: 280, coins: [25, 37] },
    wellKeeper: { ...tideWalker, name: 'Ione, Keeper of the Lower Well', short: 'Ione', anims: tideBossAnims('keeper', 5), second: 'keeper-lantern',
      fw: 64, fh: 96, ax: 32, ay: 85, scale: 1.27, faceLeft: true, bodyH: 82, width: 42, fly: 14, hp: 164, boss: true, armor: true,
      chase: 900, reach: 90, speed: 58, dmg: 10, atkTime: 1.34, cd: [1.76, 2.1], volley: 2, shot: 'fire', xp: 400, coins: [32, 44] }
  });
  Object.assign(SCENE_MOBS, {
    vault: [['hexer', 430, 59], ['hexer', 785, 80], ['reever', 1050, 48]],
    well: [['hexer', 410, 53], ['hexer', 810, 54]]
  });
  // Boss sheets defined by later chapters are not in the initial mob preload.
  // Warm up every pose so the first swing does not start on a blank frame.
  mobSheet(MOB_TYPES.hexer, MOB_TYPES.hexer.anims.idle);
  for (const T of Object.values(MOB_TYPES)) {
    if (T.boss && T.anims) for (const anim of Object.values(T.anims)) if (anim) mobSheet(T, anim);
  }
  Object.assign(SPEAKERS, {
    mara: { name: 'MARA', color: '#ffc3a5' }, teo: { name: 'TEO', color: '#ffd881' }, orrin: { name: 'ORRIN', color: '#f6a877' },
    seren: { name: 'SEREN', color: '#c6fff0' }, ione: { name: 'IONE', color: '#acf9eb', mob: 'wellKeeper' }, stag: { name: 'SALT STAG', color: '#f1ce83', mob: 'saltStag' },
    drift: { name: 'VOICE IN THE FOG', color: '#b6e5e9' }
  });
  Object.assign(BOSS_LINES, {
    saltStag: { first: [{ who: 'rowan', text: 'Someone carved a name on every crate. Were you guarding all this for them?' },
      { who: 'stag', text: 'They said they would come back. Put that coin down.' }], retry: [{ who: 'stag', text: 'Back for something else?' }],
      flag: 'saltBossSeen', tip: 'Jump the low salt waves.' },
    wellKeeper: { first: [{ who: 'ione', text: 'Hold there. The woman behind me has kept this door shut for twelve years.' },
      { who: 'rowan', text: 'Her name is Seren. Did you ever ask if she wanted to stay?' },
      { who: 'ione', text: 'She asked me to keep her son out.' }], retry: [{ who: 'ione', text: 'You have her stubborn feet.' }],
      flag: 'wellBossSeen', tip: 'Roll through the glass volleys. Save room behind you.' }
  });
  Object.assign(BOSS_FORMS, {
    saltStag: ['THE SALT CROWN', 'I kept what I could.', '#c6583c', '#ffe7a2'],
    wellKeeper: ['THE LAST LANTERN', "It was never my light.", '#307486', '#cefaf1']
  });
  Object.assign(BOSS_CINE, {
    saltStag: { nameAt: 1.85, main: '#ffd596', hot: '#fff3be', deep: '#9f542e', glow: '247,162,75', crest: 'fang' },
    wellKeeper: { nameAt: 1.85, main: '#bbf9e9', hot: '#ecfff7', deep: '#387c89', glow: '83,233,221', crest: 'moon' }
  });
  ['reever', 'wellKeeper', 'saltStag'].forEach(k => DRY_MOBS.add(k));
  Object.assign(ITEM_DEFS, {
    saltfin: { name: 'Saltfin', icon: 'saltfin', type: 'INGREDIENT', rarity: 'common', value: 2, desc: ['Caught at Brinewick.', 'Use at the cookfire.'], lore: 'They turn sideways when the salt rain starts.' },
    ghosteel: { name: 'Ghost Eel', icon: 'ghosteel', type: 'INGREDIENT', rarity: 'rare', value: 9, desc: ['A rare, luminous catch.', 'Use at the cookfire.'], lore: 'The eels only look transparent until they turn their heads.' },
    chowder: { name: 'Saltfin Chowder', icon: 'chowder', type: 'CONSUMABLE', rarity: 'uncommon', value: 6, heal: 13, meal: '-1 incoming damage', desc: ['Heals 13 HP. Ward', 'against hits for 90s.'], lore: 'Teo uses the whole fish. Nothing on the coast goes to waste.' },
    skewer: { name: 'Glow Eel Skewer', icon: 'skewer', type: 'CONSUMABLE', rarity: 'rare', value: 12, heal: 8, meal: '+1 damage', desc: ['Heals 8 HP. +1 damage', 'for 90 seconds.'], lore: 'The glow goes out over a stove. The taste stays.' },
    antler: { name: 'Salt-Crown Antler', icon: 'antler', type: 'KEY ITEM', rarity: 'rare', value: 0, desc: ['A forging component.', 'Take it to Orrin.'], lore: 'There is a knot of gold wherever the stag broke an antler.' },
    wellglass: { name: 'Keeper Glass', icon: 'wellglass', type: 'KEY ITEM', rarity: 'legend', value: 0, desc: ['Ione’s lantern glass.', 'It is still warm.'], lore: 'Melted, cast, and remelted for twelve years.' },
    tideblade: { name: 'Tideglass Blade', icon: 'tideblade', type: 'WEAPON', rarity: 'legend', value: 0, bound: true, atk: 7, desc: ['ATK +7. Land 16 hits', 'to learn Undertow.'], lore: 'Orrin bent the antler around the steel before it could cool.' }
  });
  for (const k of ['saltfin', 'ghosteel', 'chowder', 'skewer', 'antler', 'wellglass', 'tideblade']) { inventory[k] = 0; ITEM_ORDER.push(k); }
  WEAPONS.tideblade = { name: ITEM_DEFS.tideblade.name, atk: 7, icon: 'tideblade', arc: '119,248,209' };
  KNIGHT_MOVES.undertow = { ...KNIGHT_MOVES.thrust, next: null, reach: 91, dmg: 5, stamina: 20, recover: .26 };
  LORE.push(
    { id: 'maramap', title: "Mara's Tide Chart", hint: 'Bring Mara a catch at Brinewick.', text: 'When the flats turn white, count the split posts east of the last house. The third hides the vault hatch. In the vault, dig beside the broken blue jar, before the hoard.' },
    { id: 'wellnames', title: 'The Names Under Salt', hint: 'In the salt vault reliquary.', text: "Mirren. Asa. Ione. Do not close the lower sluice with someone still holding it. Name the watch, ring once, and pass the lantern from hand to hand. Nobody has to stay behind. - Lys" },
    { id: 'tideEndingShutter', title: 'Epilogue: The Closed Sluice', hint: 'Bring Seren home through the Lower Well.', text: 'Rowan and Seren took the morning ferry. She kept waiting for the boat to turn back. It never did. They left a light for Ione in the window.' },
    { id: 'tideEndingHome', title: 'Epilogue: The Homeward Bell', hint: 'Learn the names before opening the sluice.', text: 'At breakfast Ione asked if the big chair was taken. Aldric said it was his and moved to the little one. From the quay someone rang the bell, and no one had to answer.' }
  );
  BOARDS.push({ scene: 'village', x: 372 });
  function tideNotice(text, sound = 'uiConfirm') { notice = text; noticeUntil = time + 2.7; sfx(sound); }
  function tideGrant(k, n) {
    if (inventory[k] === 0 && ITEM_DEFS[k]) newItems.add(k);
    inventory[k] = (inventory[k] || 0) + n;
  }
  function tidePersist() { if (onSave) onSave(getSaveData()); }
  function tideDefense() {
    return (tide.coatTemper && tide.armorWear < 100 ? 2 : 0) + Number(tide.cowlOn) + Number(tide.bootsOn) + (tide.cowlOn && tide.bootsOn ? 2 : 0);
  }
  function tideMastered(w = currentWeapon()) { return (tide.mastery[w] || 0) >= (w === 'tideblade' ? 16 : 32); }
  function tideWearBlade() {
    const w = currentWeapon(), before = tideMastered(w);
    tide.mastery[w] = Math.min(100, (tide.mastery[w] || 0) + 1);
    if (tide.forge[w]) tide.wear[w] = Math.min(100, (tide.wear[w] || 0) + 2);
    if (!before && tideMastered(w)) tideNotice('Undertow learned! On ground: DOWN + ATTACK.', 'magic');
  }
  function tideMounted() { return ['village', 'harbor'].includes(platformScene) && story.mountFound && !!tideRide && sidePlayer.onGround; }
  let tideRide = false, tideDrift = false;
  function tideSpeak(who, text, done) { startDialogue([{ who, text }], done); }
  function talkMara() {
    if (story.netReturned) {
      const topic = story.tideCache ? "You found my father's jar? Oh, good. I didn't really want the money. Just needed to know the old story was true." : 'The old map is in your journal. Count three posts from the last stilt house.';
      return tideSpeak('mara', topic);
    }
    if (!story.netQuest) return startDialogue([
      { who: 'mara', text: "That rod is mine, technically. The pier's everybody's. Borrow it, and bring me one saltfin for the smokehouse." },
      { who: 'mara', text: "Wait for the float to dip before you pull. My father taught me by letting me get it wrong." }
    ], () => { story.netQuest = true; tidePersist(); });
    if (!inventory.saltfin) return tideSpeak('mara', 'Cast at the far pier. If you see the float go under, pull.');
    inventory.saltfin--; story.netReturned = true; addLore('maramap'); tideGrant('coins', 22);
    tidePersist();
    return tideSpeak('mara', 'A deal is a deal. Take the coins and my father’s tide chart. His vault story is probably true. The bit about the stag, I hope he made up.');
  }
  function updateTideFishing(dt) {
    if (panel || dialogue || paused) return;
    const f = tideFishing; f.t += dt;
    if (platformScene !== 'village' || Math.abs(sidePlayer.x - TIDE_POINTS.pier) > 26 || !sidePlayer.onGround) tideFishing = null;
    else if (f.t >= f.bite + .85) { tideFishing = null; tideNotice('The line went slack. Cast again.', 'uiBack'); }
    else if (f.t >= f.bite && !f.signaled) { f.signaled = true; sfx('splash'); padRumble(.26, .48, 120); }
  }
  function tideFish() {
    if (!tideFishing) {
      tide.casts++; tideFishing = { t: 0, bite: 1.8 + Math.random() * 1.4, signaled: false };
      tideNotice('Line out. Wait for the float to dip.', 'splash');
    } else {
      const landed = tideFishing.signaled;
      tideFishing = null;
      if (!landed) return tideNotice('Too soon. Watch the float.', 'uiBack');
      tide.caught++;
      const rare = tide.caught > 1 && (tide.caught % 4 === 0 || Math.random() < .14);
      tideGrant(rare ? 'ghosteel' : 'saltfin', 1);
      tideNotice(rare ? 'Rare catch: Ghost Eel!' : 'Caught a Saltfin.', rare ? 'magic' : 'coin');
      tidePersist();
    }
  }
  function tideOnKill(m) {
    if (m.type === 'reever' && platformScene === 'vault' && !m.summoned) { story.reeverDown = true; tidePersist(); }
  }
  function tideArenaStart() {
    if (tideArena) return;
    tideArena = { wave: 0, mobs: [], delay: 1 };
    tideNotice('Ready yourself. Three waves.', 'slam');
  }
  function updateTideWorld(dt) {
    if (tideArena && platformScene === 'ring' && tideArena.mobs.every(m => m.dead)) {
      tideArena.delay -= dt;
      if (tideArena.delay <= 0) {
        const a = tideArena;
        if (a.wave === 3) {
          tideArena = null; tide.arenaWins++; tideGrant('coins', tide.arenaWins === 1 ? 50 : 16); tideGrant('tonic', 1);
          const newSigil = !fortune.owned.includes('breakwater');
          if (newSigil) grantRelic('breakwater', false);
          tideNotice(newSigil ? 'Breakwater Sigil added to Relics.' : 'Breakwater cleared. Your purse is paid.', 'victory'); tidePersist();
        } else {
          const wave = [['hexer', 'hexer'], ['goblin', 'reever'], ['reever', 'hexer', 'hexer']][a.wave++];
          a.mobs = wave.map((type, i) => {
            const m = makeMob(type, sidePlayer.x < 355 ? 430 + 101 * i : 286 - 62 * i, 42, i);
            m.arenaWave = true;
            m.T = { ...m.T, chase: 650, coins: [0, 0], drops: [], xp: 0 };
            return m;
          });
          sideMobs = a.mobs.slice();
          a.delay = 1.8; tideNotice('WAVE ' + a.wave + ' / 3', 'slam');
        }
      }
    }
    kiteClock = Math.max(0, kiteClock - dt);
    if (story.kiteFound && !region().peaceful && !bossFight?.intro && kiteClock <= 0 && sidePlayer.atk) {
      const m = sideMobs.find(o => !o.dormant && !o.dead && Math.abs(o.x - sidePlayer.x) < 70);
      if (m) {
        kiteClock = 8;
        spawnSparks(m.x, mobTop(m) + 6, sidePlayer.facing, 6, ['#89f9cf', '#ffdc96']);
        damageMob(m, 2, sidePlayer.facing, 20, false, false, true);
      }
    }
  }
  function tideEnding(choice) {
    if (tide.ending || !story.wellBossDone || (choice === 'homeward' && !story.pages.includes('wellnames'))) return;
    panel = null;
    const lines = choice === 'homeward' ? [
      { who: 'rowan', text: 'Mirren. Asa. Ione. Here, take the lantern. Mum, your turn. I’ll hold it last.' },
      { who: 'ione', text: 'Lys wrote those down? I thought no one remembered the other two.' },
      { who: 'seren', text: 'I remember. Come with us, Ione. Let the door mind itself for once.' },
      { who: 'rowan', text: 'Dad keeps a light in the window. I used to think it was for him.' }
    ] : [
      { who: 'seren', text: 'The latch on your side. Pull it all the way. Ione, last ferry leaves when the sun comes up.' },
      { who: 'ione', text: 'I can’t leave the lower door. Shut it, or it will pull both of you back in.' },
      { who: 'rowan', text: 'Mum. Take my coat. We can talk once we’re outside.' },
      { who: 'seren', text: 'Let me look at you first. Just a second. You’ve got his ears.' }
    ];
    startDialogue(lines, () => {
      tide.ending = choice;
      addLore(choice === 'homeward' ? 'tideEndingHome' : 'tideEndingShutter');
      tideGrant('coins', 45); gainXp(160); tidePersist();
      openTide('epilogue');
    });
  }
  function tideInteraction(x) {
    const near = (at, n = 25) => Math.abs(x - at) < n;
    const go = (label, scene, at = REGIONS[scene].entry, dir = 1) => ({ label, act: () => enterRegion(scene, at, dir) });
    const use = (label, act) => ({ label, act });
    if (bossFight) return null;
    if (platformScene === 'harbor' && near(TIDE_POINTS.quay, 29)) return go('TAKE THE PATH TO BRINEWICK', 'village');
    if (platformScene === 'court' && story.ch4Done && x > 783) return go('DESCEND TO THE LOWER WELL', 'well');
    if (platformScene === 'village') {
      if (x < 62) return go('BACK TO LANTERN QUAY', 'harbor', TIDE_POINTS.quay, -1);
      if (near(TIDE_POINTS.smith)) return use('TALK TO ORRIN / FORGE', () => openTide('forge'));
      if (near(TIDE_POINTS.cook)) return use('COOK WITH TEO', () => openTide('cook'));
      if (tide.ending && near(561, 21)) return use('TALK TO SEREN', () =>
        tideSpeak('seren', tide.ending === 'homeward' ? "Ione's gone to see the boats. Said she'd never watched one leave in daylight." : "They've put bread in the oven. Funny, I thought I'd forgotten what that smelled like."));
      if (near(TIDE_POINTS.fisher)) return use('TALK TO MARA', talkMara);
      if (near(TIDE_POINTS.pier)) return use(tideFishing ? (tideFishing.signaled ? 'REEL NOW!' : 'WAIT FOR A BITE') : 'CAST INTO THE TIDE', tideFish);
      if (near(TIDE_POINTS.stable)) return use('VISIT THE STABLE', () => openTide('stable'));
      if (tideDrift && near(1107, 22)) return use('FOLLOW THE DRIFT LIGHT', () => {
        tideDrift = false;
        startDialogue([
          { who: 'rowan', text: 'Hello? I thought there was a boat down there.' },
          { who: 'drift', text: 'When the next boat comes in, leave one lantern lit. We used to look for it from the flats.' }
        ], () => { story.driftWitnessed = true; tideGrant('ghosteel', 1); tideNotice('A Ghost Eel washed into the shallows.', 'magic'); tidePersist(); });
      });
      if (near(TIDE_POINTS.ring)) return go('ENTER BREAKWATER RING', 'ring');
      if (near(1320)) return use('CHECK THE REEVER CONTRACT', () => openTide('contract'));
      if (near(TIDE_POINTS.hatch, 30)) return story.netReturned ? go('OPEN THE SALT VAULT', 'vault') : use('LOOK THROUGH THE REEDS', () => tideSpeak('rowan', 'The old posts go a long way into the water. I’d need a chart to make anything of them.'));
    } else if (platformScene === 'vault') {
      if (x < 62) return go('BACK TO BRINEWICK', 'village', TIDE_POINTS.hatch - 39, -1);
      if (near(608, 27) && !story.tideCache) return use('DIG BESIDE THE BLUE JAR', () => {
        story.tideCache = true; tideGrant('coins', 36); tideGrant('tonic', 1); tideNotice('Buried cache: 36 coins and a red tonic.', 'coin'); tidePersist();
      });
    } else if (platformScene === 'well') {
      if (x < 57) return go('CLIMB TO THE PALE COURT', 'court', 797, -1);
      if (story.wellBossDone && near(1928, 45)) return use(tide.ending ? 'REMEMBER THE CROSSING' : 'SPEAK TO SEREN', () => openTide(tide.ending ? 'epilogue' : 'ending'));
    } else if (platformScene === 'ring') {
      if (x < 61) return tideArena ? use('FORFEIT AND LEAVE', () => enterRegion('village', TIDE_POINTS.ring - 36, -1)) : go('BACK TO BRINEWICK', 'village', TIDE_POINTS.ring - 36, -1);
      if (!tideArena && near(220, 33)) return use('RING THE CHALLENGE BELL', tideArenaStart);
    }
    return null;
  }
  const tideRows = () => {
    const row = (title, sub, action, unavailable = false) => ({ title, sub, action, unavailable });
    const save = (text, sound) => { tideMessage = text; if (!panel) tideNotice(text, sound); else sfx(sound || 'uiConfirm'); tidePersist(); };
    const spendAll = (cost, materials, done) => {
      if (inventory.coins < cost || materials.some(([key, qty]) => inventory[key] < qty)) return tideError('You’re short on the listed materials.');
      inventory.coins -= cost;
      for (const [key, qty] of materials) inventory[key] -= qty;
      done();
    };
    const spend = (cost, material, qty, done) => spendAll(cost, material ? [[material, qty]] : [], done);
    const w = currentWeapon(), rank = tide.forge[w] || 0, wear = tide.wear[w] || 0;
    switch (tideService) {
      case 'forge': return [
        row('Repair gear · 8c', `Blade wear ${wear}% / coat wear ${tide.armorWear}%`, () => spend(8, null, 0, () => { tide.wear[w] = tide.armorWear = 0; save('Blade and coat repaired.', 'clash'); }), !wear && !tide.armorWear),
        row(`Temper ${WEAPONS[w].name} · ${rank ? 28 : 16}c`, rank >= 2 ? 'Fully tempered' : `Rank ${rank}/2 · Uses 1 Living Ember`, () => spend(rank ? 28 : 16, 'ember', 1, () => { tide.forge[w] = rank + 1; tide.wear[w] = 0; save('The blade takes a new edge.', 'clash'); }), rank >= 2),
        row('Reinforce Dad’s coat · 18c', tide.coatTemper ? 'Reinforced' : 'Uses 1 Bog Toad Hide · +2 defense until worn', () => spend(18, 'toadskin', 1, () => { tide.coatTemper = 1; tide.armorWear = 0; save('He stitched steel into the lining.', 'clash'); }), !!tide.coatTemper || !equipment.armor),
        row('Weapon recipes', 'Forge a blade from boss trophies and cave ore', () => openTide('recipes')),
        row('Brineguard outfit & dyes', 'Equip two pieces for +2 bonus defense', () => openTide('outfit'))
      ];
      case 'recipes': return [
        row('Forge Frostglass Edge · 24c', inventory.frostedge ? 'Already forged' : `Nick’s Heart ${inventory.frostcore}/1 · Seam Ore ${inventory.seamore}/1`, () => spendAll(24, [['frostcore', 1], ['seamore', 1]], () => { tideGrant('frostedge', 1); equipment.weapon = 'frostedge'; save('Frostglass Edge crafted and equipped.', 'magic'); }), inventory.frostedge > 0),
        row('Forge Tideglass Blade · 32c', inventory.tideblade ? 'Already forged' : 'Uses the Salt Stag’s antler', () => spend(32, 'antler', 1, () => { tideGrant('tideblade', 1); equipment.weapon = 'tideblade'; save('Tideglass Blade crafted and equipped.', 'magic'); }), inventory.tideblade > 0),
        row('Ask about the materials', 'Find out where to start looking', () => {
          closeCurrentPanel();
          startDialogue([{ who: platformScene === 'pass' ? 'vi' : 'orrin', text: "Nick's heart stays cold in a fire. Seam ore stays hot in the snow. For the ore, check the work order at the Lookout." }]);
        }),
        row('Back to the forge', 'Repairs, upgrades and armor', () => openTide('forge'))
      ];
      case 'outfit': {
        const toggle = (slot, name, price) => {
          const equipped = tide[slot + 'On'];
          return row(`${tide[slot] ? equipped ? 'Remove ' : 'Equip ' : 'Buy & equip '}${name}${tide[slot] ? '' : ` · ${price}c`}`, '+1 defense · part of the Brineguard set', () => {
            if (tide[slot]) { tide[slot + 'On'] = !equipped; save(equipped ? 'Piece removed.' : 'Piece equipped.', 'armor'); }
            else spend(price, null, 0, () => { tide[slot] = tide[slot + 'On'] = true; save('New armor equipped.', 'armor'); });
          });
        };
        return [toggle('cowl', 'Brineguard Cowl', 18), toggle('boots', 'Brineguard Boots', 16),
          ...[['kelp', 'Kelp green'], ['coral', 'Coral red'], ['iron', 'Original steel']].map(([id, name]) =>
            row(name + (id === 'iron' ? '' : ' · 5c'), tide.dye === id ? 'Current finish' : 'Dye the knight’s outer armor', () => spend(id === 'iron' ? 0 : 5, null, 0,
              () => { tide.dye = id; save('Armor finish applied.', 'armor'); }), tide.dye === id)),
          row('Back to the forge', 'Repairs, upgrades and crafting', () => openTide('forge'))];
      }
      case 'cook': return [
        row('Saltfin Chowder · 1 Saltfin', `Bag: ${inventory.saltfin} · Heal 13 HP; ward for 90 seconds`, () => spend(0, 'saltfin', 1, () => { tideGrant('chowder', 1); save('Chowder packed in the bag.', 'eat'); })),
        row('Glow Eel Skewer · 1 Ghost Eel', `Bag: ${inventory.ghosteel} · Heal 8 HP; +1 damage for 90s`, () => spend(0, 'ghosteel', 1, () => { tideGrant('skewer', 1); save('Skewer packed in the bag.', 'eat'); }))
      ];
      case 'stable': return [
        row(story.mountFound ? tideRide ? 'Dismount the salt hound' : 'Ride the salt hound' : 'Sponsor a salt hound · 24c', 'Ride 55% faster along the coast', () => {
          if (story.mountFound) { tideRide = !tideRide; save(tideRide ? 'Ready to ride.' : 'You dismount.'); }
          else spend(24, null, 0, () => { story.mountFound = tideRide = true; save('The salt hound comes willingly.', 'armor'); });
        }),
        row(story.kiteFound ? 'The tidekite travels with you' : 'Feed the injured tidekite', 'Uses 1 Saltfin · helps in combat every 8 seconds', () => spend(0, 'saltfin', 1, () => { story.kiteFound = true; save('The tidekite follows you.', 'magic'); }), story.kiteFound)
      ];
      case 'contract': return [row(story.tidePaid ? 'Contract closed' : story.reeverDown ? 'Turn in the Reever contract · 45c' : 'Take the Reever contract',
        'Last tracks: the eastern gallery of the hidden vault', () => {
          if (story.reeverDown) { story.tidePaid = true; tideGrant('coins', 45); save('45 coins paid from the village levy.', 'coin'); }
          else { story.tideBounty = true; save('Contract accepted. Search the Salt Vault.'); }
        }, story.tidePaid || (story.tideBounty && !story.reeverDown))];
      case 'ending': return [
        row('Share the watch', story.pages.includes('wellnames') ? 'Speak the names Lys wrote down' : 'Locked: recover the names of the old watch', () => openTide('confirmHome'), !story.pages.includes('wellnames')),
        row('Close the sluice', 'Leave the lantern with Ione', () => openTide('confirmShutter'))
      ];
      case 'confirmHome': case 'confirmShutter': return [
        row(tideService === 'confirmHome' ? 'Ring the Homeward Bell' : 'Close the Lower Well', 'Confirm the saga ending for this save', () => tideEnding(tideService === 'confirmHome' ? 'homeward' : 'shutter')),
        row('Not yet', 'Return to the choices', () => openTide('ending'))
      ];
      default: return [];
    }
  };
  const TIDE_MENUS = {
    forge: ['THE BLACKSMITH', 'Temper weapons, mend armor, or forge something new.'], recipes: ['WEAPON RECIPES', 'Boss trophies and cave ore cannot be sold or dropped.'],
    outfit: ['BRINEGUARD OUTFIT', 'Cowl + boots unlock the set bonus.'],
    cook: ['TEO’S COOKFIRE', 'Use meals from your bag. Only one buff at a time.'], stable: ['SALT HOUND STABLE', 'It’s a slow road without decent company.'],
    contract: ['REEVER CONTRACT', 'Missing gear. Broken locks. Silver for proof.'], ending: ['SEREN / THE LOWER WELL', 'The door waits. Your mother doesn’t move.'],
    confirmHome: ['THE HOMEWARD BELL', 'Bring all three of you home.'], confirmShutter: ['THE CLOSED SLUICE', 'Take Seren out before the tide comes in.'],
    epilogue: ['SAGA I COMPLETE', 'ROWAN AND THE FRACTURED MOON']
  };
  function openTide(id) { tideService = id; tideSel = 0; tideMessage = ''; openPanel('tide'); }
  function tideError(text) { tideMessage = text; sfx('uiError'); }
  function tideChoose(rows = tideRows()) {
    const row = rows[tideSel]; if (!row) return;
    if (row.unavailable) return tideError(row.sub);
    row.action();
  }
  function tideKey(k) {
    if (['escape', 'i', 'p', 'x', 'k'].includes(k)) return closeCurrentPanel();
    const rows = tideRows();
    if (['e', 'enter', ' '].includes(k)) {
      if (!rows.length) closeCurrentPanel();
      else tideChoose(rows);
    } else if (rows.length && ['arrowup', 'arrowdown', 'w', 's'].includes(k)) {
      tideSel = (tideSel + rows.length + (k === 'w' || k === 'arrowup' ? -1 : 1)) % rows.length;
      tideMessage = ''; sfx('uiMove');
    }
  }
  function tidePointer(p) {
    if (p.x >= 267 && p.x <= 296 && p.y >= 34 && p.y <= 54 || tideService === 'epilogue' && p.y >= 195) return closeCurrentPanel();
    const rows = tideRows(), r = Math.floor((p.y - 72) / 20);
    if (r >= 0 && r < rows.length && p.x >= 31 && p.x <= 289) { tideSel = r; tideChoose(rows); }
  }
  function drawTidePanel() {
    const [title, sub] = TIDE_MENUS[tideService];
    const rows = tideRows();
    ctx.save(); ctx.fillStyle = 'rgba(7,10,15,.77)'; ctx.fillRect(0, 0, 320, 240);
    invBox(22, 32, 276, 183, '#101d25', '#607d77');
    ctx.fillStyle = '#284343'; ctx.fillRect(23, 33, 274, 24);
    ctx.fillStyle = '#e7b277'; ctx.fillRect(24, 55, 272, 1);
    invText(title, 32, 48, '#fff0cf', 'bold 11px monospace');
    invText('CLOSE ×', 290, 46, '#e2e8dc', 'bold 6px monospace', 'right');
    invText(sub, 32, 66, '#accbc3', '6px monospace');
    if (tideService === 'epilogue') {
      const [label, id] = tide.ending === 'homeward' ? ['THE HOMEWARD BELL', 'tideEndingHome'] : ['THE CLOSED SLUICE', 'tideEndingShutter'];
      invText(label, 160, 105, '#f3c997', 'bold 10px monospace', 'center');
      wrapText(LORE.find(l => l.id === id).text, 220, '8px monospace').forEach((ln, i) => invText(ln, 160, 127 + i * 11, '#e2e8dc', '8px monospace', 'center'));
      invText(K('E') + ' CONTINUE EXPLORING', 160, 204, '#e6c598', 'bold 7px monospace', 'center');
    } else {
      rows.forEach((r, i) => {
        const y = 72 + i * 20;
        invBox(31, y, 258, 19, i === tideSel ? '#2a4647' : i % 2 ? '#1d3038' : '#172831', i === tideSel ? '#c59d67' : '#263f43');
        invText(r.title, 39, y + 8, r.unavailable ? '#a0aeb1' : '#fff1da', 'bold 7px monospace');
        invText(r.sub, 39, y + 15, r.unavailable ? '#819394' : '#b7d0c6', '6px monospace');
      });
      invText(tideMessage || (inputMode === 'touch' ? 'TAP A ROW  /  USE SELECTED' : 'UP/DOWN SELECT  /  ' + K('E') + ' CONFIRM'), 32, 204, '#f3c997', '6px monospace');
      invText(inventory.coins + 'c', 288, 204, '#f3c997', 'bold 7px monospace', 'right');
    }
    ctx.restore();
  }
  function tidePixel(c, x, y, w, h) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); }
  function tideShape(c, ...points) {
    ctx.fillStyle = c; ctx.beginPath();
    points.forEach(([x, y], i) => i ? ctx.lineTo(Math.round(x), Math.round(y)) : ctx.moveTo(Math.round(x), Math.round(y)));
    ctx.closePath(); ctx.fill();
  }
  function tideGlow(x, y, r, rgb, a) {
    const g = ctx.createRadialGradient(x, y, 1, x, y, r);
    g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  function drawReever(m) {
    const p = tidePixel, s = tideShape;
    const stride = m.moving ? Math.round(Math.sin(m.walk) * 5) : 0;
    const attack = phasePose(m) ?? (m.attackTime > 0 ? 1 - m.attackTime / m.atkLen : 0);
    ctx.save(); ctx.translate(Math.round(m.x), Math.round(m.y)); ctx.scale(m.dir, 1);
    if (m.dead) { ctx.globalAlpha = Math.max(0, 1 - m.deadTime / .7); ctx.rotate(Math.min(1.45, m.deadTime * 2.3)); }
    const dark = '#151b29', iron = '#42616b', shell = '#9d9a78', glint = m.flash > 0 ? '#fff' : '#ded0a0';
    s('#392e47', [-7,-46],[-23,-43],[-29,-20],[-21,-26],[-17,-9],[-9,-15],[4,-35]);
    p(dark,-10-stride,-19,8,17); p(dark,4+stride,-19,8,17);
    p(iron,-9-stride,-17,5,12); p(iron,5+stride,-17,5,12);
    p(shell,-12-stride,-6,10,5); p(shell,4+stride,-6,11,5);
    s(dark,[-13,-43],[9,-44],[16,-31],[12,-18],[-10,-19],[-14,-28]);
    s(iron,[-10,-41],[8,-41],[11,-34],[8,-24],[-8,-24],[-11,-32]);
    p(shell,-9,-40,17,4); p(glint,-4,-39,8,1); p('#29343c',-9,-24,18,4);
    s(dark,[-11,-47],[-8,-57],[4,-60],[14,-54],[16,-42],[-5,-41]);
    s(shell,[-8,-48],[-5,-55],[4,-57],[11,-52],[13,-45],[-4,-43]);
    s(glint,[-4,-55],[2,-61],[5,-55],[10,-54],[8,-51],[-6,-51]);
    p(dark,2,-50,12,3); p('#fabc77',7,-49,5,1);
    p('#735860',-13,-33,11,5); p(glint,-12,-33,5,2);
    ctx.translate(12, -30); ctx.rotate(attack ? (attack < .53 ? -1.25 : .9) : .35);
    p(dark,-2,-4,7,14); p(shell,1,-3,4,11); p('#c6a077',-4,6,12,3);
    s(iron, [1,8],[7,7],[11,26],[7,31],[2,27]); s(glint,[5,8],[7,7],[11,26],[7,31],[7,23]);
    ctx.restore();
  }
  function tideSprite(id, x, y, fw, fh, f, w, h) {
    const img = tideArt[id]; if (imgReady(img)) ctx.drawImage(img, f * fw, 0, fw, fh, Math.round(x - w / 2), Math.round(y - h), w, h);
  }
  function drawTideKite(x, y) {
    ctx.save(); ctx.translate(x - sidePlayer.facing * 32, 0); ctx.scale(sidePlayer.facing, 1);
    tideSprite('kite', 0, y - 33 + Math.sin(time * 6) * 6, 32, 32, Math.floor(time * 15) % 7, 30, 30);
    ctx.restore();
  }
  function drawTideSeren(x, y) {
    drawResident('seren', x, y, 1, sidePlayer.x < x ? -1 : 1);
  }
  function drawTideBuilding(x, w, h, tint, sign, open) {
    if (!sceneVisible(x + w / 2, w / 2 + 30)) return;
    const g = SIDE_GROUND_Y, p = tidePixel, s = tideShape, y = g - h, r = x + w, mid = x + Math.round(w / 2);
    const cool = platformScene === 'gateward' || platformScene === 'annex';
    const tower = /TOWER|WATCH|SIGNAL/.test(sign), barn = /BARN|FARM|STABLE|SHED/.test(sign);
    const market = /BAKEHOUSE|MARKET|COOKFIRE/.test(sign);
    const inn = /INN|DRY COAT/.test(sign);
    const masonry = cool || tower || /ORRIN|LOCKER|PUMP/.test(sign);
    const home = settlementArt['timber-home'];
    if (!sign && !cool && imgReady(home)) {
      const dw = Math.round(w * .84), dh = h + 31;
      ctx.drawImage(home, mid - Math.round(dw / 2), g - dh + 1, dw, dh);
      return;
    }
    if (!sign && cool && imgReady(gloamArt.town)) {
      const tall = x % 2 !== 0, [sx, sy, sw, sh] = TOWN_PARTS[tall ? 'tall' : 'small'];
      ctx.drawImage(gloamArt.town, sx, sy, sw, sh, x, y - 5, w, h + 7);
      return;
    }
    const face = masonry ? (cool ? '#505b66' : '#786862') : barn ? '#854e40' : '#b58668';
    const side = masonry ? (cool ? '#333d4d' : '#564749') : '#634047';
    const rim = masonry ? '#81918b' : '#d4a27b', ink = '#292630';
    const depth = tower ? 19 : 14, hi = tower ? 35 : inn ? 29 : barn ? 29 : 22;
    p(ink, x - 2, y + 1, w + depth + 2, h);
    p(face, x, y + 3, w, h - 5);
    s(side, [r - depth,y+3], [r+depth,y-5], [r+depth,g-7], [r-depth,g-2]);
    const wall = r - depth;
    if (masonry) {
      for (let j = y + 6, i = 0; j < g - 4; j += 7, i++) {
        p(side, x + 2, j, wall - x - 2, 1);
        for (let q = x + 4 + (i % 2) * 8; q < wall - 4; q += 14) {
          p(side, q, j + 1, 1, 5); p('rgba(236,210,172,.18)', q + 1, j + 1, 9, 1);
        }
        p('rgba(16,19,33,.31)', wall, j - 1, depth * 2, 1);
      }
    } else if (barn) {
      for (let q = x + 5; q < wall - 3; q += 6) { p('#663e36', q, y + 4, 1, h - 10); p('#ac7053', q + 1, y + 4, 1, h - 10); }
    } else {
      for (let q = x + 5; q < wall; q += 27) { p(ink, q, y + 4, 3, h - 10); p('#a17057', q + 2, y + 4, 2, h - 10); }
      p('#6b4341', x, y + 22, wall - x, 3);
      for (let q = x + 10; q < wall - 13; q += 27) s('#855e50', [q,y+8],[q+4,y+8],[q+16,y+22],[q+12,y+22]);
    }
    p('#4d4450', x - 4, g - 9, w + depth + 5, 7);
    p(rim, x - 3, g - 9, w + depth + 3, 1);
    for (let q = x + 1; q < r + depth - 2; q += 9) p('#3a343b', q, g - 6, 1, 4);
    const roof = tower
      ? [[x-9,y+5],[x+2,y-10],[mid-9,y-hi],[mid+6,y-hi-7],[r+depth+6,y-3],[r+depth+6,y+4]]
      : barn
        ? [[x-8,y+7],[x+5,y-11],[x+23,y-hi],[r-21,y-hi],[r+depth+5,y-8],[r+depth+9,y+7]]
        : [[x-10,y+7],[x+8,y-14],[mid-11,y-hi],[r-6,y-hi+2],[r+depth+8,y-5],[r+depth+8,y+6]];
    s(tint, ...roof);
    ctx.save(); ctx.beginPath();
    roof.forEach(([a, b], i) => i ? ctx.lineTo(a, b) : ctx.moveTo(a, b)); ctx.closePath(); ctx.clip();
    const shingles = settlementArt.shingle;
    if (imgReady(shingles)) {
      ctx.globalAlpha = cool ? .17 : .55;
      for (let j = y - hi - 8; j < y + 7; j += 14) for (let q = x - 12; q < r + 32; q += 12) ctx.drawImage(shingles, q, j);
      ctx.globalAlpha = 1;
    }
    for (let j = y - hi; j < y + 6; j += 5) {
      p('rgba(29,26,40,.63)', x - 10, j, w + depth + 20, 1);
      p('rgba(244,195,145,.19)', x, j + 1, w + depth + 10, 1);
    }
    s('rgba(20,23,35,.35)', [mid+5,y-hi-9],[r+31,y-10],[r+31,y+9],[wall-6,y+9]);
    ctx.restore();
    p(ink, x - 8, y + 5, w + depth + 15, 3);
    p(rim, x - 7, y + 5, w + depth + 13, 1);
    const door = barn ? mid : Math.round(x + w * .68), dw = barn ? 32 : 22;
    p(ink, door - dw / 2, g - 33, dw, 31);
    p('#503c3e', door - dw / 2 + 3, g - 30, dw - 6, 27);
    for (let a = door - dw / 2 + 4; a < door + dw / 2 - 4; a += 4) p('#71534b', a, g - 29, 1, 25);
    p('#b7875c', door + 4, g - 15, 3, 2);
    p(side, door - dw / 2 - 4, g - 3, dw + 8, 3); p(rim, door - dw / 2 - 2, g - 3, dw + 4, 1);
    const pane = (px, py, wid) => {
      p(ink, px - 2, py - 2, wid + 4, 19); p(side, px - 5, py, 3, 14); p(side, px + wid + 2, py, 3, 14);
      p(open ? (cool ? '#bad0b1' : '#ffd089') : '#39404b', px, py, wid, 13);
      p('#6a503d', px + Math.floor(wid / 2), py, 1, 13); p('#6a503d', px, py + 6, wid, 1);
      p(rim, px - 3, py + 14, wid + 6, 2);
      if (open) tideGlow(px + wid / 2, py + 6, 25, '255,185,112', .31);
    };
    pane(x + 13, g - (inn ? 56 : 43), market ? 25 : 16);
    if (inn || w > 120) pane(x + Math.round(w * .38), g - (inn ? 56 : 42), 15);
    if (tower) { pane(mid - 7, y + 14, 14); tideLantern(wall - 4, g - 30, cool ? '154,219,214' : '255,199,132'); }
    if (market) {
      s(ink, [x-6,g-39],[x+48,g-39],[x+55,g-28],[x-9,g-28]);
      for (let a = 0; a < 8; a++) {
        const q = x - 7 + a * 8;
        s(a % 2 ? '#d4aa83' : cool ? '#648e89' : '#a95553', [q,g-38],[q+7,g-38],[q+8,g-29],[q-1,g-29]);
      }
      p('#67474a', x - 5, g - 13, 49, 12); p('#ca976c', x - 7, g - 15, 53, 3);
      for (let a = 0; a < 5; a++) p(a % 2 ? '#d4a779' : '#8ca366', x + a * 9, g - 19 - a % 2, 6, 4);
    }
    if (inn) {
      p('#604351', x - 2, g - 11, 33, 3); p('#ad845f', x - 4, g - 12, 37, 2);
      p('#503b40', x + 2, g - 9, 3, 9); p('#503b40', x + 25, g - 9, 3, 9);
      tideLantern(door + 19, g - 38);
    }
    if (sign) {
      const sy = tower ? y + 34 : inn ? g - 41 : y + 9, sx = tower ? mid : door;
      ctx.font = 'bold 6px monospace';
      const sw = Math.ceil(ctx.measureText(sign).width + 10);
      p('#362d36', sx - sw / 2, sy, sw, 11);
      p(rim, sx - sw / 2, sy, sw, 1);
      invText(sign, sx, sy + 8, cool ? '#e5e4c6' : '#ffe5ab', 'bold 6px monospace', 'center');
    }
  }
  function tidePost(x, y, color = '#ae7655') {
    tidePixel('#212430', x - 2, y - 19, 5, 20); tidePixel(color, x - 1, y - 18, 2, 15); tidePixel('#d0a083', x - 2, y - 20, 5, 2);
  }
  function tideLantern(x, y, c = '255,175,105') {
    tidePixel('#312935', x - 2, y - 7, 5, 2); tidePixel('#292735', x - 3, y - 5, 7, 9);
    tidePixel('rgb(' + c + ')', x - 1, y - 4, 3, 6); tideGlow(x, y, 31 + Math.sin(time * 6 + x) * 3, c, .36);
  }
  function drawTide() {
    const p = tidePixel, shape = tideShape, R = region(), g = SIDE_GROUND_Y, W = canvas.width;
    const town = platformScene === 'village', ring = platformScene === 'ring', salt = platformScene === 'vault';
    const land = town || ring, A = tideArt, cx = Math.round(sideCameraX);
    ctx.save(); ctx.imageSmoothingEnabled = false;
    p(land ? '#3a294f' : salt ? '#181528' : '#102841', 0, 0, W, 240);
    if (land) {
      drawLayer(A['village-sky'], .06, -37, 64, 239);
      drawLayer(A['village-far'], .14, -18, 254, 193);
      drawLayer(A['village-ridge'], .27, -3, 410, 191);
      drawLayer(A['village-trees'], .4, 30, 345, 148);
      p('#563b60', 0, 161, W, 32); p('#ba7880', 0, 161, W, 1);
      for (let i = 0; i < 40; i++) p(i % 7 ? '#744e71' : '#d1948a', ((i * 59 - cx * .2 + time * 6) % 342 + 342) % 342 - 7, 162 + i * 13 % 27, 3 + i % 13, 1);
    } else if (salt) {
      drawLayer(A['salt-deep'], .10, 0, 193, 235); drawLayer(A['salt-wall'], .31, -29, 408, 231);
      ctx.globalAlpha = .42; drawLayer(A['salt-gold'], .38, 129, 331, 60); ctx.globalAlpha = 1;
    } else {
      drawLayer(A['well-far'], .12, 12, 273, 188); p('rgba(9,34,47,.58)', 0, 0, W, 211);
      drawLayer(A['well-sand'], .31, 22, 305, 195); drawLayer(A['well-reef'], .44, 9, 294, 199);
      ctx.globalAlpha = .68; drawLayer(A['well-reeds'], .56, 20, 310, 189); ctx.globalAlpha = 1;
      for (let i = 0; i < 8; i++) {
        const x = ((i * 91 - cx * .17) % 372 + 372) % 372 - 26;
        shape('rgba(136,234,247,.063)', [x,-4],[x+21,-4],[x-17,188],[x-54,188]);
      }
    }
    worldShake();
    if (town) {
      drawTideBuilding(204, 120, 60, '#5e3b43', 'ORRIN', true);
      drawTideBuilding(443, 103, 56, '#976049', 'COOKFIRE', true);
      drawTideBuilding(588, 111, 71, '#4a5860', 'MARA', false);
      drawTideBuilding(963, 120, 62, '#815e5a', 'STABLE', false);
      drawTideBuilding(1265, 102, 55, '#5a4c64', 'REEVER', false);
      for (let i = 0; i < 6; i++) {
        const x = 720 + i * 17; p('#32262c', x, 161, 4, 43); p('#865e51', x + 1, 162, 2, 21); p('#5b3f4b', x, 165, 17, 1);
        if (i % 2 === 0) p('#ead0a0', x - 1, 160, 5, 2);
      }
      shape('#453b53', [754,178],[800,178],[790,188],[765,188]); p('#b98b74', 754, 178, 46, 1);
      if (!imgReady(villageNpcArt.orrin.image)) {
        p('#5c3e37', 252, 179, 20, 5); p('#9a9e9e', 246, 175, 20, 3); p('#6e838d', 255, 178, 9, 6);
      }
      for (let i = 0; i < 6; i++) {
        const y = 175 - (i * 7 + time * 16) % 38;
        p(i % 2 ? '#ca795e' : '#ffca89', 267 + Math.sin(i + time * 7) * (3 + (175 - y) / 6), y, i % 3 ? 1 : 2, 1);
      }
      for (const [xx, id] of [[TIDE_POINTS.smith,'orrin'],[TIDE_POINTS.cook,'teo'],[TIDE_POINTS.fisher,'mara']])
        drawResident(id, xx, g, 1, sidePlayer.x < xx ? -1 : 1);
      if (tide.ending) drawTideSeren(561, g);
      for (const [x, yy, color] of [[137,171,'255,198,114'], [339,155,'255,158,101'],[572,169,'250,190,114'],[859,169,'255,179,113'],[1150,163,'255,200,141']]) {
        tidePost(x, g); tideLantern(x, yy, color);
      }
      for (const x of [1380, 1414, 1448]) { tidePost(x, g, '#796c60'); p('#dcc994', x - 2, g - 12, 5, 1); }
      if (story.netReturned) drawDepthGate(TIDE_POINTS.hatch, { name: 'SALT VAULT', color: '#e0b18a', unlock: () => true });
      drawDepthGate(TIDE_POINTS.ring, { name: 'RING', color: '#ffc0a1', unlock: () => true });
      const h = imgReady(A.mount);
      if (h && !tideMounted()) tideSprite('mount', 1062, g + 2, 56, 32, 0, 67, 38);
      if (!story.kiteFound) tideSprite('kite', 1002, g - 1, 32, 32, 1, 27, 27);
      if (tideDrift) {
        const y = 151 + Math.sin(time * 3) * 7;
        tideGlow(1107, y, 28, '177,237,244', .5); p('#d8faf1', 1106, y - 3, 3, 6); p('#5e9eaa', 1104, y, 7, 1);
      }
    }
    for (let i = Math.max(0, Math.floor((cx - 120) / 105)); i < (cx + W + 120) / 105; i++) {
      const x = i * 105, y = 95 + i * 19 % 41;
      if (!land) {
        shape(salt ? '#302339' : '#22495c', [x-7,g],[x+1,y],[x+9,y-16],[x+20,y-10],[x+23,g]);
        shape(salt ? '#523849' : '#326476', [x+7,y],[x+9,y-15],[x+16,y-10],[x+13,g],[x+8,g]);
        if (i % 4 === 1) tideLantern(x + 11, y + 22, salt ? '255,163,99' : '116,251,222');
      } else if (ring) {
        p('#403045', x, g - 64, 5, 64); p('#95645e', x + 1, g - 63, 2, 58);
        shape(i % 2 ? '#ad6261' : '#cb805f', [x+4,g-63],[x+36,g-55],[x+28,g-45],[x+4,g-46]);
        p('#d5a080', x + 4, g - 62, 8, 1);
      }
    }
    if (ring) {
      p('#70545a', 180, 183, 86, 12); p('#d29f78', 183, 183, 79, 2);
      p('#383145', 207, 135, 4, 48); p('#383145', 232, 135, 4, 48); p('#8b625b', 205, 135, 34, 4);
      shape('#dfa275', [218,143],[225,143],[230,162],[213,162]); p('#ffcb9c', 218, 146, 2, 12); p('#513d4d', 219, 162, 5, 4);
    } else if (salt) {
      p('#1e3047', 605, 181, 11, 15); p('#577a9e', 607, 182, 7, 8); p('#a3bfd0', 608, 182, 5, 1); p('#6c5260', 616, 192, 5, 2);
      if (!story.tideCache) p('#c6acd0', 619, 195, 2, 1);
      for (let j = 0; j < 12; j++) { p('#4a3545', 1410 + j * 42, 181 + j % 5, 25, 15); p(j % 3 ? '#ac7d51' : '#eccd81', 1412 + j * 42, 181 + j % 5, 20, 3); }
      p('#6d4e45', 1936, 162, 50, 34); p('#bf8f5f', 1933, 160, 56, 4); p('#ffe4a5', 1954, 155, 12, 4); tideGlow(1960, 153, 41, '255,201,124', .46);
    } else if (!land) {
      p('#0e2633', 1903, 101, 66, 95); p('#487475', 1901, 103, 3, 93); p('#487475', 1966, 103, 4, 93);
      if (story.wellBossDone) {
        if (!tide.ending) drawTideSeren(1931, g);
        tideLantern(1908, 168, '133,255,221');
      }
    }
    for (let x = Math.floor((cx - 32) / 16) * 16; x < cx + W + 32; x += 16) {
      const j = Math.abs((x * 61) >> 4);
      p(land ? '#4c3440' : salt ? '#382b42' : '#163948', x, g, 16, 46);
      p(land ? '#ae7e69' : salt ? '#a28489' : '#73b4af', x, g, 15, 2);
      p(land ? '#79574f' : salt ? '#69515e' : '#376d74', x, g + 3, 16, 2);
      p(land ? '#2f2630' : salt ? '#261d31' : '#152d3b', x + j % 7, g + 10 + j % 15, 8, 2);
      p(land ? '#986960' : salt ? '#886975' : '#4d7c81', x + j % 9, g + 6 + j % 11, 4, 1);
    }
    for (let i = 0; i < 54; i++) {
      const x = cx - 20 + ((i * 71 + Math.sin(time + i) * 10 - cx) % 360 + 360) % 360;
      const y = 34 + ((i * 9 - time * (2 + i % 4)) % 155 + 155) % 155;
      p(land ? 'rgba(251,175,135,.28)' : salt ? 'rgba(244,205,156,.32)' : 'rgba(144,237,216,.39)', x, y, i % 5 ? 1 : 2, 1);
    }
    if (town) { drawCampfire(TIDE_POINTS.camp); drawTownActors(); }
    if (tideFishing) {
      const bite = tideFishing.signaled, bob = Math.round(Math.sin(time * 6) * 1.3);
      p('#4c313a', 813, 177, 27, 1); p('#c7a691', 839, 178, 1, 10);
      p(bite ? '#fff3b6' : '#e18475', 837, 189 + bob, 5, 2);
      if (bite) { p('#fcebaa', 831, 191 + bob, 4, 1); p('#fcebaa', 845, 191 + bob, 4, 1); }
    }
    drawDepthsWorld(); drawLoreSpots(); drawSideMobs();
    drawSidePlayer(); drawPlayerWaves(); drawCombatFx(); drawFortuneFx(); drawAmbient();
    ctx.restore(); drawSideOverlays(R.name);
    if (tideArena && !dialogue && !panel) invText(`WAVE ${tideArena.wave} / 3`, 306, 34, '#ffe2b3', 'bold 7px monospace', 'right');
  }
  function enterRegion(scene, x, facing) {
    if (bossFight) endBossFight(false);
    const from = platformScene;
    moonVisit = null;
    townActors = [];
    tideArena = null;
    tideFishing = null;
    platformScene = scene; syncArena();
    sidePlayer.x = x; sidePlayer.y = SIDE_GROUND_Y; sidePlayer.vx = 0; sidePlayer.vy = 0; sidePlayer.onGround = true; sidePlayer.facing = facing || 1;
    sidePlayer.roll = null; sidePlayer.charge = null; sidePlayer.atk = null; sidePlayer.pray = null;
    sideCameraX = clamp(sidePlayer.x - canvas.width * 0.43, 0, Math.max(0, sideWorldWidth() - canvas.width));
    pickups.length = 0; bossWaves.length = 0; mobShots.length = 0; groundFires.length = 0; playerWaves.length = 0; ambient.length = 0;
    combatFx.length = 0; damageNumbers.length = 0;
    bloodDrops.length = 0;
    if (from !== scene) {
      bellCount = 0; bellFeedback = bellAnimation = null;
      tideDrift = scene === 'village' && !story.driftWitnessed && Math.random() < .16;
      if (!region().peaceful) maybeBloodMoon(questChapter() > 1 || story.bossDefeated ? 0.12 : 0.06);
    }
    loadSceneMobs(scene);
    placeNpcs();
    bossOutro = null; restoreBossOutro();
    depthsOnEnter(scene, from);
    if (from !== scene) { sfx('creak'); sceneTitle = { text: scene === 'forest' && x > CAMP.start ? "BRAM'S CAMP" : region().name, sub: REGION_SUBS[scene], t: time }; }
    keys.clear();
    if (scene === 'harbor') story.harborEntered = true;
    if (scene === 'court') story.courtEntered = true;
    if (region().tide) story[scene + 'Visited'] = true;
    if (EXPANSION_MAPS[scene]) { story[scene + 'Visited'] = true; fadeIn = time; }
    if (scene === 'hollow') story.hollowEntered = true;
    if (scene === 'hollow' && !story.hollowSeen) {
      story.hollowSeen = true;
      setTimeout(() => {
        if (platformScene !== 'hollow' || dialogue) return;
        startDialogue([
          { who: 'rowan', text: "It's freezing in here... and the moon looks wrong. Too big. Too close." },
          { who: 'rowan', text: "Dad's footprints keep going. Stay sharp, Rowan." }
        ]);
      }, 1600);
    }
    if (scene === 'pass' && !story.passEntered) {
      story.passEntered = true;
      setTimeout(() => {
        if (platformScene !== 'pass' || dialogue) return;
        startDialogue([
          { who: 'rowan', text: 'The Ashen Pass. Dad said the Watch caravans used to come through here before the Black Tide.' },
          { who: 'rowan', text: "Everything is scorched... and those hoofprints are still smoking. Riders came this way. Not long ago." }
        ]);
      }, 1500);
    }
    if (scene === 'gloam' && !story.gloamEntered) {
      story.gloamEntered = true;
      setTimeout(() => {
        if (platformScene !== 'gloam' || dialogue) return;
        startDialogue([
          { who: 'wren', text: "Gloamhold. My mother's city. It used to shine all night, they say. Silver lamps on every street." },
          { who: 'rowan', text: "Somebody's still lighting the lamps." },
          { who: 'wren', text: "That's what worries me. Stay close. Meet me at the gate fire past the old town." }
        ]);
      }, 1400);
    }
    if (onSave) onSave(getSaveData());
  }
  function placeNpcs() {
    townActors = (TOWN_CAST[platformScene] || []).map(n => ({ ...n, home: n.x, facing: 1, t: 0, walk: 0 }));
    dad = platformScene === 'hollow' ? dadAtSeal() : null;
    wren = null;
    if (platformScene === 'pass') wren = story.passBossDefeated ? { x: 4150, dir: -1, state: 'idle', t: 0 } : { x: 1940, dir: -1, state: 'idle', t: 0 };
    if (platformScene === 'gloam') wren = story.gloamBossDefeated ? { x: 4300, dir: -1, state: 'idle', t: 0 } : { x: 2280, dir: -1, state: 'idle', t: 0 };
    if (platformScene === 'harbor' || platformScene === 'court') wren = { x: platformScene === 'harbor' ? QUAY.wren : 490, dir: -1, state: 'idle', t: 0 };
  }
  function fastTravel(fire) {
    closeCurrentPanel();
    fadeIn = time;
    enterRegion(fire.scene, fire.x - 12, 1);
    notice = 'You travel to ' + fire.name + '.'; noticeUntil = time + 2;
  }
  let fadeIn = -10;
  function safeZone() {
    if (region().peaceful) return true;
    if (fireHere() || (FIRES.some(f => f.scene === platformScene && Math.abs(sidePlayer.x - f.x) < 90))) return true;
    return (platformScene === 'forest' && sidePlayer.x > CAMP.start - 10) || (platformScene !== 'forest' && sidePlayer.x < 160);
  }
  let sceneTitle = null;
  function updateNpc(n, dt) {
    if (!n) return;
    n.t += dt;
    if (n.state === 'run') {
      const d = n.target - n.x;
      n.dir = d < 0 ? -1 : 1;
      n.x += n.dir * Math.min(Math.abs(d), 150 * dt);
      if (Math.abs(d) < 2) { n.state = 'idle'; n.t = 0; }
    } else if (n.state === 'idle') {
      n.dir = sidePlayer.x < n.x ? -1 : 1;
      if (n.onArrive) { const f = n.onArrive; n.onArrive = null; f(); }
    }
  }
  function restoreBossOutro() {
    const R = region();
    if (!R.boss || !story[R.bossFlag] || R.tide || platformScene === 'frost' || platformScene === 'hollow') return;
    const page = { mire: 'skarnend', barrow: 'mournend', cinder: 'ignarothend', archive: 'tidemawend' }[platformScene];
    const missing = R.side ? !story.pages.includes(page) :
      platformScene === 'pass' ? !story.ch2Done : !story.ch3Done;
    if (missing) bossOutro = { t: 0, x: R.bossX, jingle: true, scene: platformScene };
  }
  function updateStory(dt) {
    updateTownActors(dt);
    if (platformScene === 'forest') {
      if (!story.campReached && sidePlayer.x > CAMP.start) {
        story.campReached = true;
        sceneTitle = { text: "BRAM'S CAMP", sub: 'Edge of the woodland', t: time };
        if (onSave) onSave(getSaveData());
      }
      if (!story.metBram && sidePlayer.x > CAMP.fire + 30 && sidePlayer.onGround) {
        story.metBram = true;
        startDialogue([
          { who: 'bram', text: "Sword down, if you please. I’m Bram. If I were a goblin, would I be out here wasting good firewood on travelers?" },
          { who: 'rowan', text: "I’m looking for my father. Aldric. Have you seen him?" },
          { who: 'bram', text: "I thought I knew those buckles. He went into the Hollow a few days ago. I haven’t seen him since." },
          { who: 'rowan', text: "Then that’s where I’m going too." },
          { who: 'bram', text: "Course you are. Rest first. The Hollow’s past my sign. Bring me anything you find and I’ll give you a fair price." }
        ]);
      }
    } else if (outdoorScene()) {
      const R = region();
      if (R.boss && !story[R.bossFlag] && !bossFight && sidePlayer.x > BOSS_ARENA.trigger && sidePlayer.deadTime <= 0) startBossIntro();
      updateBossOutro(dt);
      updateDad(dt);
      updateNpc(wren, dt);
      if (platformScene === 'pass' && !story.metWren && sidePlayer.x > 1780 && sidePlayer.onGround && !dialogue) {
        story.metWren = true;
        startDialogue([
          { who: 'wren', text: "Stop. Hands where I can see them. That helmet won’t stop an arrow." },
          { who: 'rowan', text: "Easy. I’m Rowan. Aldric’s son. Silver Watch, sort of." },
          { who: 'wren', text: "The Captain of the Hollow seal? Turn your head. Huh. That’s his jaw all right. Wren. I scout for what’s left of the Watch." },
          { who: 'rowan', text: "Did you see riders come through carrying a moon shard?" },
          { who: 'wren', text: "Pale Court. A week ago. I saw the light through their saddlebags. The Queen left her mare, Ashmane, to guard the road east." },
          { who: 'rowan', text: "You tried to get past her?" },
          { who: 'wren', text: "See that split in my shield? Don’t block her charge. Roll. You can warm yourself at my fire first. It never goes out." }
        ], () => { if (onSave) onSave(getSaveData()); });
      }
      if (platformScene === 'gloam' && !story.gloamGate && sidePlayer.x > 2180 && sidePlayer.onGround && !dialogue) {
        story.gloamGate = true;
        startDialogue([
          { who: 'wren', text: "This is the old gate. Past it is the castle quarter and the Moonwell. That's where they took the shard." },
          { who: 'wren', text: "Something lives down there. The lamplighters whisper its name. Vael. The Moon-Eater." },
          { who: 'rowan', text: "Then we end this here. Rest up. I'll go first." }
        ], () => { if (onSave) onSave(getSaveData()); });
      }
    }
  }
  function talkToWren() {
    if (platformScene === 'pass' && story.nickAmbushed && !story.nickDefeated && !story.passBossDefeated) {
      startDialogue([{ who: 'wren', text: "He told me where to find you. That beam glazed the whole road in ice. Rest here first. If you're going after him, follow the frost east." }]);
      return;
    }
    const lines = platformScene === 'gloam'
      ? (story.gloamBossDefeated
        ? [[{ who: 'wren', text: "Your mother... alive. Then the Court has been taking moon-readers for years. Mine too, maybe." }, { who: 'wren', text: "Whatever you decide, Rowan, I'm coming with you." }]]
        : [[{ who: 'wren', text: 'The Moonwell is past the castle hall. Upper slash if he takes to the air. Hit him hard when he lands to breathe.' }],
           [{ who: 'wren', text: "My mother used to say the lamps of Gloamhold could be seen from the moon. Now look at them." }]])
      : (story.passBossDefeated
        ? [[{ who: 'wren', text: "Gloamhold is just past the ridge. I'll meet you inside." }]]
        : [[{ who: 'wren', text: "Ashmane waits at the end of the pass. Roll through her charge. When she slams into the rocks, punish her." }],
           [{ who: 'wren', text: "Hold your attack to gather the moon in your blade. Your father used to do that. A Moonblade, he called it." }],
           [{ who: 'wren', text: "Those fire skulls spit embers. Swing at the fireballs. You can knock them right out of the air." }]]);
    wrenTalk = (wrenTalk || 0) + 1;
    startDialogue(lines[wrenTalk % lines.length]);
  }
  let wrenTalk = 0;

  // ---- Drawing: camp props ----
  function drawCampfire(x) {
    const gy = SIDE_GROUND_Y;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const flick = 1 + Math.sin(time * 13) * 0.05 + Math.sin(time * 7.3) * 0.05;
    const g = ctx.createRadialGradient(x, gy - 10, 2, x, gy - 10, 70 * flick);
    g.addColorStop(0, 'rgba(255,170,70,.42)'); g.addColorStop(0.5, 'rgba(255,110,30,.13)'); g.addColorStop(1, 'rgba(255,80,20,0)');
    ctx.fillStyle = g; ctx.fillRect(x - 80, gy - 90, 160, 110);
    ctx.restore();
    // stones and logs
    ctx.fillStyle = '#3a3438'; [-12, -7, 7, 12].forEach(o => ctx.fillRect(x + o - 2, gy - 3, 5, 3));
    ctx.fillStyle = '#4a2c1a'; ctx.fillRect(x - 11, gy - 5, 22, 3);
    ctx.fillStyle = '#6a3e22'; ctx.fillRect(x - 9, gy - 7, 7, 3); ctx.fillRect(x + 2, gy - 7, 7, 3);
    // flames: three flickering tongues
    const tongues = [[-4, 13, '#e8542e'], [3, 11, '#e8542e'], [0, 17, '#f08a2e'], [-2, 10, '#ffc34a'], [2, 8, '#ffe9a0']];
    tongues.forEach(([ox, hgt, col], i) => {
      const hh = hgt * (0.8 + 0.25 * Math.sin(time * (9 + i * 2.3) + i));
      const sway = Math.round(Math.sin(time * 6 + i) * 1.5);
      ctx.fillStyle = col;
      for (let r = 0; r < hh; r++) {
        const wdt = Math.max(1, Math.round((1 - r / hh) * (i < 3 ? 6 : 4)));
        ctx.fillRect(Math.round(x + ox - wdt / 2 + (r / hh) * sway), Math.round(gy - 7 - r), wdt, 1);
      }
    });
    // embers
    for (let i = 0; i < 5; i++) {
      const life = (time * 0.7 + i * 0.21) % 1;
      ctx.fillStyle = 'rgba(255,200,90,' + (1 - life) + ')';
      ctx.fillRect(Math.round(x + Math.sin(i * 3.1 + time * 2) * 6), Math.round(gy - 14 - life * 34), 1, 1);
    }
  }
  function drawTent(x) {
    const gy = SIDE_GROUND_Y;
    ctx.fillStyle = '#2d241e'; ctx.beginPath(); ctx.moveTo(x - 30, gy); ctx.lineTo(x, gy - 38); ctx.lineTo(x + 30, gy); ctx.fill();
    ctx.fillStyle = '#7a5c3a'; ctx.beginPath(); ctx.moveTo(x - 27, gy); ctx.lineTo(x, gy - 35); ctx.lineTo(x + 27, gy); ctx.fill();
    ctx.fillStyle = '#5e4630'; ctx.beginPath(); ctx.moveTo(x, gy - 35); ctx.lineTo(x + 27, gy); ctx.lineTo(x + 6, gy); ctx.fill();
    ctx.fillStyle = '#1a120e'; ctx.beginPath(); ctx.moveTo(x - 7, gy); ctx.lineTo(x, gy - 20); ctx.lineTo(x + 6, gy); ctx.fill();
    ctx.fillStyle = '#4a3020'; ctx.fillRect(x - 1, gy - 41, 2, 7);
  }
  function drawLogBench(x) {
    const gy = SIDE_GROUND_Y;
    ctx.fillStyle = '#3a2416'; ctx.fillRect(x - 16, gy - 7, 32, 7);
    ctx.fillStyle = '#6a4228'; ctx.fillRect(x - 16, gy - 7, 32, 2);
    ctx.fillStyle = '#8a6040'; ctx.fillRect(x + 13, gy - 6, 3, 5); ctx.fillStyle = '#5a3a24'; ctx.fillRect(x + 14, gy - 5, 1, 3);
  }
  function drawBram(x) {
    if (imgReady(residentArt.bram)) {
      const y = SIDE_GROUND_Y, dir = sidePlayer.x < x ? -1 : 1;
      tidePixel('rgba(0,0,0,.3)', x - 12, y - 1, 24, 2);
      tidePixel('#5b3c2b', x + dir * 15, y - 31, 2, 31);
      tideLantern(x + dir * 16, y - 27);
      drawResident('bram', x, y, 1, dir);
      return;
    }
    const gy = SIDE_GROUND_Y, bob = Math.round(Math.sin(time * 2) * 0.6);
    const face = sidePlayer.x < x ? -1 : 1;
    ctx.save(); ctx.translate(x, gy); if (face < 0) ctx.scale(-1, 1);
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(-9, -1, 18, 2);
    // staff with lantern
    ctx.fillStyle = '#4a3020'; ctx.fillRect(9, -38, 2, 38);
    ctx.fillStyle = '#3a2a1a'; ctx.fillRect(10, -38, 6, 1);
    ctx.fillStyle = '#2a2420'; ctx.fillRect(13, -37, 5, 7);
    ctx.fillStyle = Math.sin(time * 9) > -0.6 ? '#ffd27a' : '#f0a040'; ctx.fillRect(14, -36, 3, 5);
    // robe
    ctx.fillStyle = '#2a1e16'; ctx.fillRect(-8, -26 + bob, 16, 26 - bob);
    ctx.fillStyle = '#4e3a2a'; ctx.fillRect(-7, -25 + bob, 14, 25 - bob);
    ctx.fillStyle = '#3a2a1e'; ctx.fillRect(2, -25 + bob, 5, 25 - bob);
    ctx.fillStyle = '#6a2a22'; ctx.fillRect(-7, -14 + bob, 14, 2);
    // arm to staff
    ctx.fillStyle = '#4e3a2a'; ctx.fillRect(5, -20 + bob, 5, 4); ctx.fillStyle = '#d9a77a'; ctx.fillRect(8, -20 + bob, 2, 3);
    // hood + face + beard
    ctx.fillStyle = '#2a1e16'; ctx.fillRect(-6, -35 + bob, 13, 11);
    ctx.fillStyle = '#4e3a2a'; ctx.fillRect(-5, -34 + bob, 11, 9);
    ctx.fillStyle = '#d9a77a'; ctx.fillRect(0, -31 + bob, 5, 4);
    ctx.fillStyle = '#1a120e'; ctx.fillRect(3, -30 + bob, 1, 1);
    ctx.fillStyle = '#cfcac0'; ctx.fillRect(0, -27 + bob, 5, 6); ctx.fillRect(1, -21 + bob, 3, 2);
    ctx.restore();
    // lantern glow
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const lx = x + face * 15, g = ctx.createRadialGradient(lx, gy - 33, 1, lx, gy - 33, 22);
    g.addColorStop(0, 'rgba(255,210,120,.35)'); g.addColorStop(1, 'rgba(255,210,120,0)');
    ctx.fillStyle = g; ctx.fillRect(lx - 24, gy - 57, 48, 48); ctx.restore();
  }
  function drawCart(x) {
    const gy = SIDE_GROUND_Y;
    ctx.fillStyle = '#2a1a10'; ctx.fillRect(x - 24, gy - 22, 48, 12);
    ctx.fillStyle = '#6a4228'; ctx.fillRect(x - 23, gy - 21, 46, 10);
    ctx.fillStyle = '#4a2c1a'; for (let i = -20; i < 22; i += 9) ctx.fillRect(x + i, gy - 21, 1, 10);
    // canopy stripes
    for (let i = 0; i < 6; i++) { ctx.fillStyle = i % 2 ? '#e8d8b0' : '#a83a2e'; ctx.fillRect(x - 26 + i * 9, gy - 40, 9, 6); }
    ctx.fillStyle = '#2a1a10'; ctx.fillRect(x - 24, gy - 34, 2, 13); ctx.fillRect(x + 22, gy - 34, 2, 13);
    // goods
    ctx.fillStyle = '#c8324a'; ctx.fillRect(x - 18, gy - 27, 4, 5); ctx.fillStyle = '#ffe9a0'; ctx.fillRect(x - 17, gy - 27, 1, 1);
    ctx.fillStyle = '#ad7444'; ctx.fillRect(x - 10, gy - 26, 8, 4);
    ctx.fillStyle = '#a89c84'; ctx.fillRect(x + 2, gy - 25, 6, 3);
    ctx.fillStyle = '#7b8e9c'; ctx.fillRect(x + 11, gy - 28, 6, 6);
    // wheels
    [-14, 14].forEach(o => {
      ctx.fillStyle = '#1a120e'; ctx.beginPath(); ctx.arc(x + o, gy - 6, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#6a4228'; ctx.beginPath(); ctx.arc(x + o, gy - 6, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2a1a10'; ctx.fillRect(x + o - 1, gy - 7, 2, 2);
    });
  }
  function drawSignpost(x, text, arrowDir) {
    const gy = SIDE_GROUND_Y;
    ctx.fillStyle = '#2e2218'; ctx.fillRect(x - 2, gy - 44, 4, 44);
    ctx.fillStyle = '#4a3624'; ctx.fillRect(x - 1, gy - 44, 2, 44);
    const w = 60, y = gy - 42;
    ctx.fillStyle = '#2e2218';
    ctx.beginPath();
    if (arrowDir > 0) { ctx.moveTo(x - w / 2, y); ctx.lineTo(x + w / 2 - 6, y); ctx.lineTo(x + w / 2 + 2, y + 7); ctx.lineTo(x + w / 2 - 6, y + 14); ctx.lineTo(x - w / 2, y + 14); }
    else { ctx.moveTo(x + w / 2, y); ctx.lineTo(x - w / 2 + 6, y); ctx.lineTo(x - w / 2 - 2, y + 7); ctx.lineTo(x - w / 2 + 6, y + 14); ctx.lineTo(x + w / 2, y + 14); }
    ctx.fill();
    ctx.fillStyle = '#8a6a48'; ctx.fillRect(x - w / 2 + 1, y + 1, w - 6, 12);
    ctx.fillStyle = '#6a4e34'; ctx.fillRect(x - w / 2 + 1, y + 10, w - 6, 3);
    ctx.fillStyle = '#2a1a10'; ctx.font = 'bold 6px monospace'; ctx.textAlign = 'center';
    ctx.fillText(text, x - (arrowDir > 0 ? 2 : -2), y + 9);
  }
  const WITNESS_APPEARANCE = {
    nell: ['NELL', '#c79c61', '#643e37'], hob: ['HOB', '#accc88', '#3b523d'], mira: ['MIRA', '#e1a18d', '#734755'],
    tamsin: ['TAMSIN', '#efbe80', '#695239'], osk: ['OSK', '#9dc8e6', '#293d55'], pike: ['PIKE', '#e2ab6e', '#604333'],
    fenn: ['FENN', '#9ed8ae', '#394f45'], posta: ['POSTA', '#efb198', '#664140'], vey: ['VEY', '#acd9e1', '#274e55'],
    ysolde: ['YSOLDE', '#b5d0e8', '#3b4664'], enna: ['ENNA', '#dfbad6', '#604560'], keeper: ['GALLERY KEEPER', '#c7dfd4', '#3e5458'],
    hessa: ['HESSA', '#d1c2ee', '#4f3962'], pip: ['PIP', '#d9e790', '#435a37'], novice: ['DESERTER', '#e6aab4', '#643c4d'],
    calden: ['CALDEN', '#acd5e3', '#3d4e6c'], lys: ['LYS', '#e4c8eb', '#634c6a'], vi: ['VI THE SMITH', '#f7b07a', '#673c37']
  };
  for (const [key, [name, color]] of Object.entries(WITNESS_APPEARANCE)) SPEAKERS[key] = { name, color };
  SPEAKERS.nick = { name: 'NICK', color: '#b9f4ff', mob: 'nick' };
  // Preserve the old IDs so existing journal unlocks carry over.
  const WITNESS_STORIES = {
    watch: ['nell', 'The Silver Watch', 'Did the Watch really come this far?', "Mum took bread to their post. She'd knock on the seal with her heel just to make the captain jump. They've watched that spot since the moon fell."],
    howl: ['hob', "Hob's Warning", 'Did you see what came out last night?', "I saw a wolf open my gate with a hand. Moonstruck, Gran would've called it. Aldric followed their tracks at dawn. Haven't seen him come back."],
    page1: ['mira', 'The Empty Camps', 'Where did all the goblins go?', "Past my window. Whole families, carrying pots and babies. Their fires were still lit when I went to look. Whatever scared them is deeper in the woods."],
    page2: ['tamsin', 'Aldric at the Fire', 'You saw my dad?', "Three nights back. Bram told him the seal was cracking. Aldric left me half his supper and said to tell you to go home. He laughed when he said it. Knew you wouldn't."],
    moonfall: ['osk', 'Where the Moon Fell', 'What happened here?', "Morwen cracked the moon. Six of us went to see where the biggest piece landed. You'll pass the other five if you keep going. They won't be happy to see you."],
    page3: ['pip', 'The King and the Riders', 'What did Grukk trade away?', 'The big piece! The riders put it in a sack. He kept enough for his crown. I saw a knight press both hands against the silver tree stone. The footsteps underneath stopped.'],
    riders: ['pike', 'The Pale Riders', 'Why is the road deserted?', "I kept the lamps lit up to the bend. Then a rider took the light straight out of the glass. Didn't even slow down. I moved my post back here."],
    wrenlog: ['fenn', 'Seven Riders', 'What came through the pass?', "Seven riders carrying a light wrapped in black cloth. I followed until the mare screamed. Wren says she's still up there. I won't be going back to check."],
    ashroad: ['posta', 'The Ember Road', 'What did this road look like before?', "Cart tracks and silver dust all the way to Gloamhold. The Court burned the wagons here. Twelve winters, and the rock's still warm."],
    letter: ['novice', 'The Queen’s Singers', 'What happens to the moon-readers?', "The Queen makes them sing until the shards answer. I heard one through the wall. Next morning I walked out with my boots in my hands."],
    founding: ['vey', 'The City of Lamps', 'Who built Gloamhold?', "The Watch. There was moonsilver under the city. Gran used to turn her lamp toward the window and say the moon was borrowing her light."],
    tide: ['enna', 'The Black Tide', 'Do you remember the night it came?', "The water never reached my ankles. It was the light that drowned. My brother was under the baker's lamp when it went out. He's still there, some nights."],
    lamps: ['vey', 'The Lamplighters', 'Why do they still carry the lamps?', "We were supposed to walk until sunrise. Some of us never saw it. If you put one down, turn his lamp toward the sky. We used to do that for each other."],
    captain: ['ysolde', 'The Last Captain', 'You look like Wren.', "My daughter. I sent her away with the scouts. The Court took the moon-readers alive, including the woman from your village. The riders crossed the eastern sea."],
    moonwell: ['calden', 'Beneath the Hall', 'What’s making that noise?', "The moon's reflection never left the well. Then something moved in it. Those burning faces in the hall? It knows every one of their names."],
    queen: ['enna', 'Morwen’s Promise', "Why does she think she's helping?", "She lost a child on a night the moon didn't rise. She promised the sky would never go dark again. She'd listen if Lys told her to stop. No one else can."],
    ferrysong: ['nessa', 'The Night Signal', "Can you get me across? I'm looking for Seren.", "Seren taught the children the night signal. Ring Shell, then Star, then Anchor. Jory's still out there. Watch for his lantern."],
    boots: ['nessa', 'Nessa’s Left Boot', 'Anything I should tell Jory?', "Tell him he owes me a left boot. No, don't tell him why. And if he asks about the wine, it was never on the boat."],
    lysletter: ['keeper', 'Lys and the Pear Tree', 'Who tied the ribbons?', "Lys tied the first one. She wanted the lowest branch so she could reach it. Someone still comes by at night to tie fresh ribbon. I don't ask who."],
    serenledger: ['keeper', 'The Singer Below', 'Where did they take Seren?', "Down to the lower well. Three nights ago. She stopped halfway through her last song and said 'Rowan.' Is that you?"],
    hessa: ['hessa', 'The Witch’s Refusal', 'Did Morwen come to you?', "She asked if I could bring a dead child back. I told her no. Her tea went cold. Then she said she'd make a world where children couldn't die."],
    pictos: ['pip', 'Skarn in the Reeds', 'What are you doing out here?', "Skarn told me to hide and count to a hundred. Pale horses took the bright rock while I counted. I started again at one, in case he meant stay hidden."],
    roll: ['osk', 'The Fallen Watch', 'Is this where they buried the Watch?', "Bertil, Mourn, ninety others. Me too, if you're counting. Aldric put the shard beneath us. I'd have done the same. Most days I still hear the bell."],
    orders: ['novice', 'The Stolen Splinters', 'Who dug up these graves?', "We did. The Queen wanted what grew in their bones. Our captain said to leave Grukk his crown. Give him a crown and he'll never check the wagon."],
    ledger: ['posta', 'The Last Caravan', 'Why are there wagons in a mine?', "I drove the third one. We hid from the riders in here. That thing ate the moonsilver through the floorboards. I didn't wait to see which wagon was next."],
    star: ['hessa', 'The Ember Star', 'Why is it so warm down here?', "The wyrm swallowed a piece of moon. Even Morwen wouldn't come down after that. Watch the walls. If they light up, it's breathing in."],
    register: ['calden', 'The Moon-Readers', 'Did you know Seren?', "She took my place on the second watch. Ilse teased her for singing to the well instead of studying it. Then the water started singing back."],
    lys: ['calden', 'The Long Winter', 'Tell me about Lys.', "The moon stayed away nine nights. Lys didn't wake on the tenth. Her mother waited at the window till morning. Next spring she started pulling the moon down."],
    wellnames: ['lys', 'The Names Under Salt', 'Can we get everyone out?', "Mirren. Asa. Ione. Say their names, ring once, pass the lantern hand to hand. Don't shut the sluice while somebody's holding it. No one has to stay."]
  };
  for (const l of LORE) {
    const d = WITNESS_STORIES[l.id];
    if (!d) continue;
    [l.speaker, l.title, l.question, l.text] = d;
    l.kind = 'voice'; l.sign = ''; l.where = `Told by ${SPEAKERS[l.speaker].name}`;
    l.hint = 'Speak to ' + SPEAKERS[l.speaker].name + '.';
  }
  for (const id of ['ferrysong', 'boots']) {
    const l = LORE.find(l => l.id === id); l.scene = null; l.hint = 'Talk to Nessa at Lantern Quay.';
  }
  Object.assign(LORE.find(l => l.id === 'wellnames'), { scene: 'vault', x: 1960, requires: 'saltBossDone', hint: 'Speak to Lys in the Salt Vault.' });
  LORE.push({ id: 'nicktruth', kind: 'voice', speaker: 'nick', title: "Nick's Warning", question: 'You could have killed me. Why didn’t you?',
    text: "The Court wanted a body. I gave them a crater and sent your friend to pick you up. Next time, don't stand where they expect you to.",
    where: 'Told by Nick on Frostglass Ridge', hint: 'Speak to Nick after the duel.' });

  // The Court Road: offshoots use ordinary regions, saves, campfires and inputs.
  const EXPANSION_MAPS = {
    aldersend: { name: "ALDER'S END", width: 1720, entry: 75, color: '#f4cf88', peaceful: true, sub: 'Orchards and the old Watch road' },
    orchard: { name: 'THE OUTER ORCHARD', width: 1040, entry: 74, color: '#d6d68d', sub: 'The last rows beyond the fence' },
    gateward: { name: 'GATEWARD', width: 1620, entry: 73, color: '#9ed8d2', peaceful: true, sub: 'The neighborhood that kept its lamps' },
    annex: { name: 'THE LAMP ANNEX', width: 1700, entry: 74, color: '#a7b8ff', sub: 'Below the disused signal tower' }
  };
  const TOWN_ROADS = {
    aldersend: { from: 'forest', at: 151, back: 187, label: "TAKE THE ROAD TO ALDER'S END", returnLabel: 'BACK TO THE WOODLAND' },
    orchard: { from: 'aldersend', at: 1650, back: 1600, label: 'FOLLOW THE ORCHARD FENCE', returnLabel: "BACK TO ALDER'S END" },
    gateward: { from: 'gloam', at: 2153, back: 2127, label: 'TAKE THE LANTERN ROAD TO GATEWARD', returnLabel: 'BACK TO GLOAMHOLD' },
    annex: { from: 'gateward', at: 1520, back: 1475, label: 'DESCEND TO THE LAMP ANNEX', returnLabel: 'BACK TO GATEWARD' }
  };
  const TOWN_FIRES = { aldersend: 650, gateward: 679 };
  for (const [id, spec] of Object.entries(EXPANSION_MAPS)) {
    REGIONS[id] = { ...spec, plats: [tideGround(spec.width)] };
    REGION_SUBS[id] = spec.sub;
    STORY_DEFAULTS[id + 'Visited'] = false;
  }
  REGIONS.orchard.plats.push({ x: 344, y: 163, w: 89, h: 9 }, { x: 750, y: 149, w: 85, h: 11 });
  REGIONS.annex.plats.push({ x: 401, y: 153, w: 88, h: 10 }, { x: 840, y: 146, w: 100, h: 10 }, { x: 1204, y: 155, w: 96, h: 10 });
  FIRES.push({ id: 'alderfire', scene: 'aldersend', x: TOWN_FIRES.aldersend, name: 'Alder Square' },
    { id: 'gatewardfire', scene: 'gateward', x: TOWN_FIRES.gateward, name: 'Gateward Commons' });
  Object.assign(STORY_DEFAULTS, {
    moonVisitSeen: false, alderOrder: false, granaryCleared: false, alderPaid: false,
    lampOrder: false, scribeDown: false, lampRecovered: false, lampPaid: false
  });
  const COURT_ART = 'court-road/';
  const expansionMob = (name, prefix, size, anchor, counts, args) => ({
    name, src: COURT_ART, fw: size[0], fh: size[1], ax: anchor[0], ay: anchor[1],
    anims: { idle: [prefix + '-idle', counts[0], 7], move: [prefix + '-walk', counts[1], 11],
      attack: [prefix + '-attack', counts[2]], hurt: [prefix + '-hurt', counts[3]],
      death: [prefix + '-death', counts[4], counts[4] > 12 ? 14 : 10] },
    scale: 1, bodyH: 34, width: 18, hp: 13, speed: 55, chase: 166, reach: 37, dmg: 5,
    atkTime: .88, hit: [.53, .72], cd: [1.44, 2.06], xp: 21, coins: [2, 5], drops: [], voice: 'ghost', ...args
  });
  Object.assign(MOB_TYPES, {
    granarycat: expansionMob('Granary Stalker', 'granary', [48, 32], [21, 32], [4, 4, 6, 2, 9],
      { scale: 1.4, bodyH: 25, hp: 11, speed: 75, dmg: 4, hit: [.5, .82], done: 'granaryCleared', voice: 'hound' }),
    sentry: expansionMob('Oathless Sentry', 'sentinel', [170, 125], [50, 81], [11, 9, 7, 2, 9],
      { scale: .85, bodyH: 41, hp: 19, speed: 50, reach: 56, dmg: 6, hit: [.43, .68], xp: 35, voice: 'bones', drops: [['bone', .75]] }),
    nightborne: expansionMob('Nightborne', 'nightborne', [80, 80], [37, 64], [9, 6, 12, 5, 23],
      { scale: 1.18, bodyH: 34, hp: 28, speed: 86, reach: 47, dmg: 8, hit: [.48, .76], xp: 58, voice: 'ghost' }),
    gutter: expansionMob('Gutter Husk', 'gutter', [112, 48], [25, 48], [4, 4, 10, 2, 9],
      { bodyH: 46, width: 32, hp: 21, speed: 51, reach: 47, dmg: 6, hit: [.52, .77], xp: 29, voice: 'squish' }),
    vigil: expansionMob('Ash Vigil', 'vigil', [64, 64], [33, 63], [4, 4, 11, 2, 9],
      { fly: 17, bodyH: 36, hp: 23, speed: 67, reach: 40, dmg: 7, hit: [.45, .65], xp: 36 }),
    cantor: expansionMob('Lamp Cantor', 'cantor', [112, 48], [55, 48], [4, 4, 10, 2, 9],
      { hp: 22, speed: 41, reach: 125, ranged: true, hit: [.57, .75], shot: 'moon', xp: 40 }),
    veilscribe: expansionMob('Veil Scribe', 'scribe', [166, 98], [23, 80], [1, 4, 16, 3, 15],
      { hp: 42, scale: 1.3, bodyH: 43, speed: 42, reach: 155, chase: 220, dmg: 10,
        atkTime: 1.58, hit: [.45, .88], cd: [2.1, 2.5], sheetCast: true, light: '145,168,224', done: 'scribeDown', xp: 86 })
  });
  MOB_TYPES.veilscribe.anims.idle[0] = 'scribe-static-idle';
  MOB_TYPES.veilscribe.anims.attack[0] = 'scribe-blast';
  MOB_TYPES.veilscribe.anims.hurt[0] = 'scribe-damaged';
  SCENE_MOBS.orchard = [['mushroom', 366, 56], ['granarycat', 682, 72]];
  SCENE_MOBS.annex = [['gutter', 360, 62], ['vigil', 619, 61], ['cantor', 883, 48], ['veilscribe', 1315, 48]];
  SCENE_MOBS.forest.push(['granarycatWild', 2810, 43]);
  MOB_TYPES.granarycatWild = { ...MOB_TYPES.granarycat, done: null, name: 'Briar Cat' };
  SCENE_MOBS.hollow.push(['sentry', 2290, 50]);
  SCENE_MOBS.gloam.push(['gutter', 1840, 42], ['nightborne', 3660, 45]);
  for (const mob of new Set(Object.values(MOB_TYPES).filter(m => m.src === COURT_ART))) {
    for (const anim of Object.values(mob.anims)) mobSheet(mob, anim);
  }

  const FOUNDRY = {
    'air-burst': [112, 74, 17, 60, 8, 44],
    'arc-discharge': [100, 66, 14, 60, 50, 36],
    'chimney-smoke': [61, 64, 24, 80, 12, 61],
    'fireball-impact': [96, 64, 15, 70, 72, 38],
    'hex-sigil': [64, 66, 22, 70, 32, 36],
    'lantern-glow': [48, 60, 24, 80, 24, 30],
    'magic-hit': [48, 48, 14, 60, 24, 24],
    'quickdraw-slash': [104, 64, 11, 70, 52, 32],
    ripple: [96, 52, 24, 75, 48, 30],
    'shadow-step': [96, 60, 22, 70, 48, 50],
    'void-rift': [64, 94, 24, 80, 32, 47]
  };
  const foundrySheets = Object.fromEntries(Object.keys(FOUNDRY).map(k => [k, loadImg('pvfx/' + k + '.png')]));
  function foundryImpact(art, x, y, f) {
    if (prefersReducedMotion() || !imgReady(foundrySheets[art])) return;
    const life = art === 'fireball-impact' ? .8 : .55;
    if (combatFx.filter(p => p.kind === 'foundry').length < 8) combatFx.push({ kind: 'foundry', art, x, y, f, life, max: life });
  }
  function drawFoundry(id, x, y, age, scale = 1, facing = 1, alpha = 1, loop = false) {
    const image = foundrySheets[id];
    if (!imgReady(image) || age < 0) return false;
    const [w, h, n, ms, ax, ay] = FOUNDRY[id];
    const f = Math.floor((prefersReducedMotion() && loop ? .24 : age) * 1000 / ms);
    if (!loop && f >= n) return false;
    ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(Math.round(x), Math.round(y)); ctx.scale(facing, 1);
    ctx.drawImage(image, f % n * w, 0, w, h, Math.round(-ax * scale), Math.round(-ay * scale), Math.round(w * scale), Math.round(h * scale));
    ctx.restore();
    return true;
  }

  // Conversational first visits go into the journal; returns react to progress.
  const WITNESS_REPLIES = {
    watch: "You see a green ribbon, stop. Red ribbon, keep that sword where you can reach it.",
    howl: "I put a bar across the gate. The goats are furious. Good. Means they're still inside.",
    page1: "Saw another little pot in the road. I left it on the wall in case they come back.",
    page2: "Bram keeps asking if you ate. He won't ask twice out loud.",
    moonfall: "The others used to laugh at the way I walked. I'd give a good deal to hear it again.",
    page3: "If anybody asks about the knight, I never saw a knight. That's what I said last time.",
    riders: "If you see a pale horse, get off the road. Being right about the danger is no comfort under its hooves.",
    wrenlog: "Wren said count the riders, not the horses. I did both. Wish the numbers matched.",
    ashroad: "Still got a cart peg from the old road. Just can't bear to throw it away.",
    letter: "I keep expecting somebody to call me back inside. It's been weeks.",
    founding: "The old lampglass was blue. Gran said that was the trick. She told the kids it was magic anyway.",
    tide: "I can still tell you what the baker put on the counter that morning. That's the part that hurts.",
    lamps: "Turn them glass-up, if you can. They get hard to find in the rain.",
    captain: "If Wren asks, tell her I trusted her to find her own road.",
    moonwell: "The stairs are slick. Keep one hand free until you get through the hall.",
    queen: "She'd have understood if anybody had let her grieve. That doesn't make the rest of it right.",
    serenledger: "Go on. If anyone asks, I spent the whole evening looking for my keys.",
    nicktruth: "Don't make me knock you out twice. My reputation's already in pieces."
  };
  const townSpeaker = (id, title, scarf, coat) => {
    WITNESS_APPEARANCE[id] = [title, scarf, coat]; SPEAKERS[id] = { name: title, color: scarf };
  };
  townSpeaker('elin', 'ELIN', '#f3d09c', '#70564e');
  townSpeaker('linnet', 'LINNET', '#f2bd7e', '#7b5155');
  townSpeaker('reeve', 'REEVE SABLE', '#eac68b', '#4a5b52');
  townSpeaker('fenna', 'FENNA', '#ebae85', '#805840');
  townSpeaker('ori', 'ORI', '#bfe1a5', '#59684b');
  townSpeaker('senn', 'SERGEANT SENN', '#99c6d1', '#555e73');
  townSpeaker('tove', 'TOVE', '#bddebc', '#4d6a66');
  townSpeaker('nessel', 'NESSEL', '#e5b6a2', '#65545e');
  townSpeaker('farris', 'FARRIS', '#ffd5a5', '#6e5762');
  townSpeaker('pella', 'PELLA', '#c6e1d3', '#61556c');
  townSpeaker('martin', 'MARTIN', '#efc0a0', '#496b66');
  townSpeaker('ida', 'IDA', '#e9c585', '#6c596b');
  townSpeaker('sayo', 'SAYO', '#e3d4ff', '#5d516e');
  townSpeaker('neri', 'NERI', '#e8bd9c', '#75524a');
  townSpeaker('aki', 'AKI', '#d1e5a5', '#53674d');
  const distinctCastArt = loadImg('distinct-cast/storybook-and-town.png');
  const watchCastArt = loadImg('distinct-cast/watch-posts.png');
  const DISTINCT_TOWN_ROWS = { sayo: 1, neri: 2, aki: 3 };
  const WATCH_CAST_ROWS = { reeve: 0, senn: 1 };
  const ACTOR_POSES = new Set(['linnet', 'nessel', 'mira', 'enna', 'lys', 'seren']);
  const residentArt = Object.fromEntries([...Object.keys(WITNESS_APPEARANCE).filter(id => !Object.hasOwn(WATCH_CAST_ROWS, id) && !Object.hasOwn(DISTINCT_TOWN_ROWS, id)),
    'bram', 'seren', 'tess', 'orrin', 'mara', 'teo'].map(id => [id, loadImg(COURT_ART + 'resident-' + id + '.png')]));
  const VILLAGE_CELL_W = 96, VILLAGE_CELL_H = 104;
  const VILLAGE_NPC_SPECS = {
    // Row order matches tools/pack-village-npcs.py. Source art can face either way.
    orrin:  { file: 'smith', facing: -1, head: [29, 31], clips: { idle: [0, 7, 6], work: [1, 12, 9], talk: [2, 11, 8] } },
    linnet: { file: 'innkeeper', facing: -1, head: [30, 33], clips: { idle: [0, 7, 5], talk: [1, 10, 8] } },
    martin: { file: 'villager', facing: 1, head: [33, 32], clips: { idle: [0, 7, 5], walk: [1, 12, 12], talk: [2, 9, 8] } },
    nessel: { file: 'trader', facing: 1, head: [32, 30], clips: { idle: [0, 7, 5], sell: [1, 10, 8] } },
  };
  const villageNpcArt = Object.fromEntries(Object.entries(VILLAGE_NPC_SPECS).map(([id, spec]) =>
    [id, { ...spec, image: loadImg('village-npcs/' + spec.file + '.png') }]));
  function villageNpcFrame(who, walk = 0, portrait = false) {
    const { clips } = VILLAGE_NPC_SPECS[who];
    const still = prefersReducedMotion();
    const speaks = dialogue?.lines[dialogue.i].who === who;
    const inShop = panel === 'shop' && shopkeeper === who;
    const inConversation = dialogue?.lines.some(line => line.who === who);
    const pose = still ? 'idle' : clips.sell && inShop ? 'sell' : clips.talk && speaks ? 'talk'
      : !portrait && !inConversation && clips.walk && walk ? 'walk'
      : !portrait && !inConversation && !panel && clips.work && time % 7 < 1.35 ? 'work' : 'idle';
    const [row, frames, fps] = clips[pose];
    const clock = pose === 'walk' ? walk : pose === 'work' ? time % 7 : pose === 'talk' ? time - dialogue.t : time;
    const frame = still ? 0 : Math.floor(clock * fps) % frames;
    return { sx: frame * VILLAGE_CELL_W, sy: row * VILLAGE_CELL_H, pose };
  }
  const settlementArt = Object.fromEntries(['timber-home', 'alder-tree', 'shingle'].map(id => [id, loadImg(COURT_ART + 'town-' + id + '.png')]));
  SPEAKERS.moonkeeper = { name: 'THE MOONSTONE KEEPER', color: '#b2e5ed' };
  SPEAKERS.veilscribe = { name: 'VEIL SCRIBE', color: '#d8ceed', mob: 'veilscribe' };
  const moonArt = Object.fromEntries(['idle','jump-loop','jump-start','land','dash','portrait'].map(k => [k, loadImg(COURT_ART + 'moon-' + k + '.png')]));
  const roadObservers = [1, 2, 3].map(i => loadImg(COURT_ART + 'observer-' + i + '.png'));
  const TOWN_CAST = {
    aldersend: [
      { id: 'reeve', x: 176, pace: 25 }, { id: 'elin', x: 345, service: 'shop' },
      { id: 'linnet', x: 527, service: 'rest' }, { id: 'sayo', x: 733, pace: 8 }, { id: 'ori', x: 949, pace: 32 },
      { id: 'fenna', x: 1368, service: 'orchard' }
    ],
    gateward: [
      { id: 'senn', x: 165, pace: 24 }, { id: 'nessel', x: 421, service: 'shop' }, { id: 'neri', x: 592 },
      { id: 'farris', x: 833, service: 'rest' }, { id: 'tove', x: 1110, service: 'lamp' },
      { id: 'pella', x: 1335, pace: 26 }
    ],
    village: [{ id: 'martin', x: 351, pace: 19 }, { id: 'ida', x: 906 }, { id: 'aki', x: 1257, pace: 7 }]
  };
  const RESIDENTS = {
    reeve: [
      [['reeve', 'If you’re buying apples, market’s east. If you’re buying trouble, it usually finds its own way in.'], ['rowan', 'I’m looking for Aldric.'], ['reeve', 'He took the deep wood road. I offered a spare hand. He said to keep it here.']],
      [['reeve', 'Aldric never thanked me for keeping the watch. He always brought me a chair, though.']]
    ],
    elin: [
      [['elin', 'You’re leaving a trail of mud. Good. Means my flour isn’t the only thing on the floor.'], ['rowan', 'Is the bread for sale?'], ['elin', 'The ugly loaves are. Pretty ones go to the inn where nobody can see them in the dark.']],
      [['elin', 'Ugly loaves on the left. That one with the split end’s my favorite.']]
    ],
    linnet: [
      [['linnet', 'Welcome to the Bent Alder. Wipe your feet, then lie to me about how far you walked.'], ['rowan', 'Is there somewhere to rest?'], ['linnet', 'Take the bench or the chair. Not the stool. It’s got two legs and a reputation.']],
      [['linnet', 'Bench is yours. Someone’s left the fire just right for toast.']]
    ],
    ori: [
      [['ori', 'See that row of seedlings? I planted three. Thirteen came up.'], ['rowan', 'That’s good, isn’t it?'], ['ori', 'I was trying to grow onions. These are flowers. Keep your hands off them anyway.']],
      [['ori', 'Fenna says the rabbit did it. I say the rabbit has taste.']]
    ],
    fenna: [
      [['fenna', 'Don’t lean on that latch. It’s the only one I haven’t had to replace this week.'], ['rowan', 'What’s breaking them?'], ['fenna', 'Big cat in the outer rows. Waits till I turn my back, then a whole hen goes quiet. If you’re headed that way, follow the split fence.']],
      [['fenna', 'The grain shed, past the low wall. The hens won’t go near it.']]
    ],
    senn: [
      [['senn', 'Knock the heel of your boot on the rail. Twice.'], ['rowan', 'Why?'], ['senn', 'The drowned ones never ask why. Welcome to Gateward.']],
      [['senn', 'You can skip the rail. I remember your boots.']]
    ],
    nessel: [
      [['nessel', 'You can buy a lamp, a tonic, or the last loaf that didn’t get rained on. No one ever buys the lamp.'], ['rowan', 'They already have one?'], ['nessel', 'No. They think the dark is free.']],
      [['nessel', 'Careful with the tonic. It’ll warm you up and take the rust off a hinge.']]
    ],
    farris: [
      [['farris', 'Don’t tell me what you saw in Gloamhold. Tell me if you need a seat.'], ['rowan', 'Just a seat, then.'], ['farris', 'Good. First one’s free. So are the rest.']],
      [['farris', 'The kettle’s on. If it whistles, that’s all it is.']]
    ],
    tove: [
      [['tove', 'Someone cut the signal wire again. Clean cut, this time.'], ['rowan', 'Where does it run?'], ['tove', 'Under the east tower. Council sealed the door after the Tide. I kept a key. If you find my shutter lens, bring it wrapped. I’ll want to know where it’s been.']],
      [['tove', 'East tower. The key’s a little sticky. Lift as you turn.']]
    ],
    pella: [
      [['pella', 'Take a look at that wall. All the soot above the door, none below.'], ['rowan', 'Smoke rises.'], ['pella', 'Usually, yes. Watch what the soot does when the tide turns.']],
      [['pella', 'I leave a chalk mark at every crossing. Sometimes somebody leaves one back.']]
    ],
    martin: [
      [['martin', 'Orrin says I mend nets like I’m tying shoes. Look at the shoes. Nothing’s getting out of those.'], ['rowan', 'Mara fishes through all this wind?'], ['martin', 'Mara fishes through arguments. Wind barely counts.']],
      [['martin', 'If the float dips, reel. If it sinks and swims upstream, you’re on your own.']]
    ],
    ida: [
      [['ida', 'Don’t cross the flats in that helmet. Salt gets in a seam and works the whole winter.'], ['rowan', 'How do you get it out?'], ['ida', 'You find someone who likes you enough to help. Try Orrin first.']],
      [['ida', 'I wash the salt out at night. I swear the coats are stiff again by breakfast.']]
    ],
    sayo: [
      [['sayo', 'Hold still. Is that a tear in your sleeve or an opening you meant to leave?'], ['rowan', 'A branch took it.'], ['sayo', 'Then the branch can pay. I mend clothes in the square. Leave the armor to a smith.']],
      [['sayo', 'The bench by the fire is free. Sit with the torn side away from the sparks.']]
    ],
    neri: [
      [['neri', 'I copy the arrival lists. Tell me who you are expecting, not who you are.'], ['rowan', 'Does the list go as far as the quay?'], ['neri', 'Mine stops at the tower. The ferry keeps its own list. Find the ferrier if you need a name.']],
      [['neri', 'The rain got to the bottom of the list. I am copying it before the names lift off.']]
    ],
    aki: [
      [['aki', 'Feet off the chalk, please. That line gets longer every time a wave reaches it.'], ['rowan', 'Are you taking bets on the tide?'], ['aki', 'No. I am finding a dry route home for the children. If you want a bet, try the ring.']],
      [['aki', 'See where the chalk stops? That is the last dry patch before the reeds.']]
    ]
  };
  LORE.push(
    { id: 'moonvisit', kind: 'page', title: 'The Second Seat', where: 'East causeway, Gloamhold',
      hint: 'Leave Gloamhold by the east road after facing Vael.',
      text: 'A Veil Scribe called its master the Second Seat. The Keeper knew about Seren and her song. It could have stopped me. Instead, it told me to go on.' },
    { id: 'alderorder', kind: 'page', title: 'A Thorn in the Granary', where: "Fenna’s farm, Alder’s End",
      hint: 'Ask Fenna about the broken gate in Alder’s End.',
      text: 'Fenna’s hens won’t go near the grain shed. Follow the orchard fence past the low wall, drive the stalker out and let Fenna know.' },
    { id: 'lamporder', kind: 'page', title: 'Borrowed Light', where: 'Tove’s signal house, Gateward',
      hint: 'Ask Tove about the east signal tower.',
      text: 'Tove lent me the annex key. Someone stole the shutter lens. Search the locker past the lower gallery, beneath Gateward’s east tower.' },
    { id: 'lampsigil', kind: 'page', title: 'Orders for the Second Seat', where: 'Lamp Annex, lower gallery',
      hint: 'Check the shutter locker in the Lamp Annex.',
      text: 'An order in the locker tells the scribes to mark any moon-reader who changes a song halfway through. The Queen’s seal is stamped on the front. An unfinished crescent is scratched underneath.' }
  );
  let townActors = [], moonVisit = null;
  function updateTownActors(dt) {
    for (const n of townActors) {
      n.t += dt;
      const was = n.x;
      if (n.pace && !prefersReducedMotion()) {
        // The patrol pauses at each end; only its patrol post is interactive.
        const p = (n.t + n.home / 71) % 14;
        n.x = n.home + n.pace * Math.cos(Math.PI * clamp((p - 1) / 5, 0, 1) + Math.PI * clamp((p - 8) / 5, 0, 1));
      }
      n.walk = Math.abs(n.x - was) > .02 ? n.walk + dt : 0;
      if (Math.abs(sidePlayer.x - n.x) < 50) n.facing = sidePlayer.x < n.x ? -1 : 1;
      else if (n.walk) n.facing = n.x < was ? -1 : 1;
    }
  }
  function talkResident(n) {
    const seen = 'met_' + n.id, S = story, service = n.service;
    const say = (lines, done) => startDialogue(lines.map(([who, text]) => ({ who, text })), done);
    const mark = () => { S[seen] = true; tidePersist(); };
    const lines = RESIDENTS[n.id];
    if (service === 'orchard') {
      if (S.granaryCleared && !S.alderPaid) return say([
        ['rowan', 'You can open the grain shed. The stalker won’t be back.'],
        ['fenna', 'I’ll let the hens hear it from me. Here. If a loaf has dirt on it, it’s from my pocket, not the oven.']
      ], () => {
        S.alderOrder = S.alderPaid = true; addLore('alderorder'); tideGrant('bread', 2); tideGrant('coins', 14); gainXp(30); mark();
        tideNotice('A Thorn in the Granary completed.', 'coin');
      });
      if (S.alderPaid) return say([['fenna', 'First egg outside the shed this morning. Never thought I’d fuss over where a hen lays.']]);
      return say(lines[S.alderOrder ? 1 : 0], S.alderOrder ? null : () => {
        S.alderOrder = true; addLore('alderorder'); mark(); tideNotice('New errand: A Thorn in the Granary.', 'bookOpen');
      });
    }
    if (service === 'lamp') {
      if (S.lampRecovered && !S.lampPaid) return say([
        ['rowan', 'There was an order with the lens. It marked singers who changed their songs.'],
        ['tove', 'Put that in your pocket. This goes up in the tower tonight. If somebody comes looking, let them see us from a mile away.']
      ], () => {
        S.lampPaid = true; tideGrant('coins', 36); tideGrant('tonic', 1); gainXp(65); mark(); tideNotice('Borrowed Light completed.', 'magic');
      });
      if (S.lampPaid) return say([['tove', 'The lamp’s back on. I’ve had three complaints through the door and one thank-you through the window.']]);
      return say(lines[S.lampOrder ? 1 : 0], S.lampOrder ? null : () => {
        S.lampOrder = true; addLore('lamporder'); mark(); tideNotice('New errand: Borrowed Light.', 'bookOpen');
      });
    }
    const after = service === 'shop' ? () => openShop(n.id) : service === 'rest' ? () => {
      stats.health = stats.maxHealth; stats.stamina = stats.maxStamina;
      sfx('rest'); tideNotice('You rest at the inn. Health restored.'); tidePersist();
    } : null;
    if (S[seen] && service === 'shop') return after();
    if (S[seen] && n.id === 'reeve' && S.dadFound) return say([['reeve', 'Someone saw Aldric on his feet again. Next time you see him, tell him the road still has a chair.']]);
    if (S[seen] && n.id === 'sayo' && S.alderPaid) return say([['sayo', 'Fenna brought me an egg instead of a fee. I take it the hens are laying again.']]);
    if (S[seen] && n.id === 'neri' && S.lampPaid) return say([['neri', 'Tove sent three clear flashes from the tower. First time I could read the signal from here.']]);
    if (S[seen] && n.id === 'aki' && S.netReturned) return say([['aki', 'Mara says the old tide chart is yours. Check what time it was drawn. A path can be dry in the morning and gone by supper.']]);
    if (S[seen] && n.id === 'senn' && S.moonVisitSeen) return say([
      ['senn', 'The rain stopped dead when you were out on the causeway. Even the gutters went quiet.'],
      ['rowan', 'What did you see?'],
      ['senn', 'Nothing. That’s why I’m keeping the lanterns lit.']
    ]);
    return say(lines[S[seen] ? 1 : 0], () => { mark(); if (after) after(); });
  }
  for (const roster of Object.values(TOWN_CAST)) for (const n of roster) STORY_DEFAULTS['met_' + n.id] = false;

  function expandedInteraction(x) {
    if (bossFight) return null;
    const go = (label, scene, at, dir) => ({ label, act: () => enterRegion(scene, at, dir) });
    const here = TOWN_ROADS[platformScene];
    if (here && x < 59) return go(here.returnLabel, here.from, here.back, -1);
    for (const [scene, road] of Object.entries(TOWN_ROADS)) {
      if (road.from !== platformScene || Math.abs(x - road.at) > 22) continue;
      if (scene === 'annex' && !story.lampOrder) return { label: 'CHECK THE SIGNAL TOWER', act: () =>
        tideSpeak('rowan', 'Locked. There’s a brass plaque: “Signal House, Tove.”') };
      return go(road.label, scene, REGIONS[scene].entry, 1);
    }
    if (platformScene === 'annex' && Math.abs(x - 1550) < 28) {
      return { label: story.lampRecovered ? 'READ THE SCRIBES’ ORDER' : 'CHECK THE SHUTTER LOCKER', act: () => {
        if (!story.scribeDown) return tideSpeak('rowan', 'The locker’s locked. The figure in the gallery had a ring of keys.');
        const entry = LORE.find(l => l.id === 'lampsigil');
        tideSpeak('rowan', entry.text, () => {
          story.lampRecovered = true; addLore(entry.id); tidePersist();
          if (!story.lampPaid) tideNotice('Lens recovered. Return to Tove.', 'pickup');
        });
      } };
    }
    if (platformScene === 'orchard' && story.granaryCleared && Math.abs(x - 974) < 24) {
      return go('SLIP THROUGH THE HEDGE', 'aldersend', 1426, -1);
    }
    if (platformScene === 'aldersend' && Math.abs(x - 795) < 25) return { label: 'READ THE ALDER SQUARE BOARD', act: () =>
      tideSpeak('page', 'Bent Alder rooms to the west. Fenna’s eggs to the east. Please latch the orchard gate. Yes, this means you.') };
    if (platformScene === 'gateward' && Math.abs(x - 999) < 23) return { label: 'READ THE FLOOD MARKS', act: () =>
      tideSpeak('page', 'They marked the height of the water here in other years. The newest line is ink. It stops at the height of a lamp.') };
    const resident = townActors.find(n => Math.abs(x - n.x) < 22);
    if (resident) return { label: ({ shop: 'SHOP WITH ', rest: 'REST AT THE INN / ' }[resident.service] || 'TALK TO ') +
      SPEAKERS[resident.id].name, act: () => talkResident(resident) };
    return null;
  }

  // Gloamhold's exit scene owns its actors. Neither is inserted in sideMobs.
  const MOON_MARK = 4520;
  function moonThreshold() {
    return platformScene === 'gloam' && story.ch3Done && !story.moonVisitSeen && !bossFight && !bossOutro &&
      !dialogue && sidePlayer.x >= MOON_MARK && sidePlayer.onGround && sidePlayer.deadTime <= 0;
  }
  function startMoonVisit() {
    clearHeldInput();
    const direction = sidePlayer.x < 4610 ? 1 : -1;
    Object.assign(sidePlayer, { vx: 0, vy: 0, facing: direction, moving: false, atk: null, charge: null, roll: null, pray: null, drink: null, attackTime: 0 });
    playerWaves.length = mobShots.length = groundFires.length = bossWaves.length = 0;
    ambient.length = combatFx.length = damageNumbers.length = 0; screenShake = 0;
    sceneTitle = null;
    moonVisit = { beat: 'omen', t: 0, age: 0, dir: direction, x: direction === 1 ? Math.min(sidePlayer.x + 83, 4643) : sidePlayer.x - 79 };
    sfx('gem', .48, .56);
  }
  function setMoonBeat(beat) {
    moonVisit.beat = beat; moonVisit.t = 0;
  }
  function updateMoonVisit(dt) {
    const m = moonVisit; m.t += dt; m.age += dt;
    if (m.beat === 'omen' && m.t > .86) { setMoonBeat('descend'); sfx('cloth', .8, .64); }
    else if (m.beat === 'descend' && m.t > 1.42) {
      setMoonBeat('speak'); sfx('magic', .75, .68);
      startDialogue([
        { who: 'veilscribe', text: 'Second Seat. The locket. Shall I?' },
        { who: 'moonkeeper', text: 'Leave it. Seren hasn’t finished her song.' },
        { who: 'rowan', text: 'You know my mother?' },
        { who: 'moonkeeper', text: 'I know the verse she won’t sing.' }
      ], () => { setMoonBeat('depart'); sfx('waveHum', .58, .72); });
    } else if (m.beat === 'speak') updateDialogue(dt);
    else if (m.beat === 'depart' && m.t > 1.65) {
      moonVisit = null; clearHeldInput();
      story.moonVisitSeen = true; addLore('moonvisit'); tidePersist();
      tideNotice('The rain starts again.', 'bookFlip');
    }
  }
  function drawMoonActor(anim, f, x, y, sc = 1, facing = -1) {
    if (!imgReady(moonArt[anim])) return;
    ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.scale(facing, 1);
    ctx.drawImage(moonArt[anim], f * 150, 0, 150, 150, Math.round(-73 * sc), Math.round(-110 * sc), Math.round(150 * sc), Math.round(150 * sc));
    ctx.restore();
  }
  function drawMoonVisit() {
    const m = moonVisit, W = canvas.width, H = canvas.height;
    const low = prefersReducedMotion(), x = Math.round(m.x - sideCameraX), t = m.t;
    const leaving = m.beat === 'depart', strength = leaving ? 1 - clamp((t - .8) / .8, 0, 1) : clamp(m.age / .63, 0, 1);
    ctx.save();
    tidePixel(`rgba(9,12,34,${.43 * strength})`, 0, 0, W, H);
    const bars = Math.round(13 * strength);
    tidePixel('#060811', 0, 0, W, bars); tidePixel('#060811', 0, H - bars, W, bars);
    tideGlow(x, 126, 95, '113,173,220', .18 * strength);
    if (m.beat === 'omen') {
      drawFoundry('ripple', x - 8, 188, t, .8, 1, .65);
      drawFoundry('hex-sigil', x + 4, 172, t, .6, 1, .67);
    } else if (m.beat === 'descend') {
      const p = clamp(t / 1.21, 0, 1), y = low ? 157 : -14 + 175 * (1 - (1 - p) ** 2);
      drawFoundry('void-rift', x, 67, t, .85, 1, .75 * (1 - p * .7), true);
      if (p >= 1) drawMoonActor('land', Math.min(3, Math.floor((t - 1.21) * 15)), x, 170, .96, -m.dir);
      else drawMoonActor('jump-loop', Math.floor(t * 10) % 3, x + (low ? 0 : 28 * m.dir * (1 - p)), y, .96, -m.dir);
    } else if (!leaving) {
      drawFoundry('hex-sigil', x, 165, t, .63, 1, .35, true);
      drawMoonActor('idle', low ? 0 : Math.floor(t * 11) % 17, x, 170 + (low ? 0 : Math.sin(t * 2.9) * 2), .96, -m.dir);
    } else {
      const p = clamp((t - .22) / .95, 0, 1);
      drawFoundry('void-rift', x + 40 * m.dir, 64, t, .82, m.dir, .66 * strength, true);
      drawFoundry('air-burst', x, 152, t - .22, .8, m.dir, .7);
      ctx.globalAlpha = 1 - p;
      if (t < .25) drawMoonActor('jump-start', Math.min(4, Math.floor(t * 20)), x, 170, .96, m.dir);
      else if (!low) drawMoonActor('dash', Math.min(14, Math.floor((t - .25) * 18)), x + p * 77 * m.dir, 170 - p * p * 186, .96, m.dir);
      ctx.globalAlpha = 1;
    }
    if (m.age > .45 && (!leaving || t < 1.15)) {
      ctx.globalAlpha = leaving ? 1 - clamp(t / 1.06, 0, 1) : clamp((m.age - .45) / .52, 0, 1);
      const T = MOB_TYPES.veilscribe;
      drawMob({ T: { ...T, scale: 1.1, tint: '112,129,174,.27' }, x: x + (m.dir === 1 ? 38 : -48),
        y: SIDE_GROUND_Y - 23, dir: -m.dir, moving: m.beat === 'descend' && !low, walk: m.t * 32 });
      ctx.globalAlpha = 1;
      if (leaving) drawFoundry('shadow-step', x + 51, 188, t, .62, -1, .64);
    }
    if (m.beat === 'omen') invText('The rain goes quiet.', W / 2, 214, '#cce5e5', '7px monospace', 'center');
    ctx.restore();
    drawDialogue();
  }

  const ALDER_BUILDINGS = [
    [90, 102, 64, '#72504f', 'WATCH'], [267, 138, 68, '#9c573d', 'BAKEHOUSE'],
    [447, 175, 83, '#6d493d', 'BENT ALDER INN'], [839, 95, 61, '#896259', ''],
    [997, 104, 64, '#784e47', ''], [1171, 93, 60, '#745447', 'PUMP HOUSE'],
    [1271, 137, 67, '#7f5139', 'FENNA’S FARM'], [1463, 99, 55, '#74413f', 'BARN']
  ];
  const GATE_BUILDINGS = [
    [91, 123, 79, '#4b5a68', 'WATCH POST'], [258, 106, 64, '#555367', ''],
    [370, 133, 71, '#506675', 'LAMPLIGHT MARKET'], [501, 107, 76, '#605369', ''],
    [756, 170, 84, '#5f526e', 'THE DRY COAT'], [1050, 149, 78, '#406475', 'SIGNAL HOUSE'],
    [1216, 94, 65, '#55546b', ''], [1371, 89, 68, '#536574', ''], [1473, 93, 107, '#3e596c', 'EAST TOWER']
  ];
  function drawTownActors() {
    for (const n of townActors) {
      if (!sceneVisible(n.x, 36)) continue;
      const y = SIDE_GROUND_Y;
      tidePixel('rgba(17,12,18,.5)', n.x - 12, y - 1, 24, 3);
      drawResident(n.id, n.x, y, 1, n.facing, n.walk);
      const seen = story['met_' + n.id];
      if (!seen) {
        const py = y - 48 + (prefersReducedMotion() ? 0 : Math.round(Math.sin(time * 3 + n.x)));
        tidePixel('#202036', n.x - 6, py, 13, 7);
        tidePixel(SPEAKERS[n.id].color, n.x - 3, py + 3, 2, 1);
        tidePixel(SPEAKERS[n.id].color, n.x + 1, py + 3, 2, 1);
      }
    }
  }
  function sceneVisible(x, pad = 40) {
    return x >= sideCameraX - pad && x <= sideCameraX + canvas.width + pad;
  }
  function drawRoadGate(x, sign, cool = false) {
    if (!sceneVisible(x, 80)) return;
    const g = SIDE_GROUND_Y;
    for (const q of [x - 31, x + 28]) {
      tidePixel(cool ? '#374b5b' : '#47362e', q, g - 50, 5, 50);
      tidePixel(cool ? '#718b8e' : '#926445', q, g - 50, 2, 49);
      tideLantern(q + 3, g - 28, cool ? '158,232,227' : '255,192,112');
    }
    tidePixel(cool ? '#626d71' : '#705748', x - 33, g - 51, 68, 5);
    ctx.font = 'bold 6px monospace';
    const w = Math.ceil(ctx.measureText(sign).width + 10);
    tidePixel(cool ? '#253541' : '#302626', x - w / 2, g - 46, w, 12);
    invText(sign, x, g - 38, cool ? '#dcf2db' : '#ffe0a8', 'bold 6px monospace', 'center');
  }
  function drawExpansionRoad() {
    if (platformScene === 'forest') drawRoadGate(TOWN_ROADS.aldersend.at, 'ALDER’S END');
    if (platformScene === 'gloam') drawRoadGate(TOWN_ROADS.gateward.at, 'GATEWARD', true);
  }
  function drawTownFence(left, right, color) {
    const g = SIDE_GROUND_Y;
    tidePixel(color, left, g - 24, right - left, 2);
    tidePixel(color, left, g - 14, right - left, 2);
    for (let x = left; x <= right; x += 16) {
      tidePixel('#30292a', x, g - 29, 4, 28); tidePixel(color, x, g - 30, 2, 27);
    }
  }
  function drawOrchardTree(x, i) {
    const y = SIDE_GROUND_Y;
    const art = settlementArt['alder-tree'];
    if (imgReady(art)) {
      const w = i % 3 === 0 ? 68 : 57, h = i % 3 === 0 ? 81 : 72;
      ctx.save(); ctx.translate(Math.round(x), y + 1); if (i % 2) ctx.scale(-1, 1);
      ctx.drawImage(art, -Math.round(w / 2), -h, w, h); ctx.restore();
      if (platformScene === 'orchard') for (let j = 0; j < 4; j++) {
        const a = x - 16 + (j * 13 + i * 7) % 32, b = y - 49 + (j * 7 + i * 3) % 24;
        tidePixel('#f2a369', a, b, 2, 2);
      }
      return;
    }
    tidePixel('#4b352e', x - 4, y - 49, 9, 49);
    tidePixel('#8a5d42', x - 3, y - 40, 2, 39);
    tideShape('#365643', [x-29,y-34], [x-27,y-56], [x-16,y-69], [x+8,y-72], [x+26,y-64], [x+31,y-45], [x+18,y-34]);
    tideShape('#6d8050', [x-26,y-49], [x-18,y-64], [x+7,y-69], [x+20,y-62], [x+11,y-53], [x-16,y-48]);
    for (let j = 0; j < 10; j++) {
      const a = x - 22 + (j * 17 + i * 7) % 45, b = y - 61 + (j * 13 + i * 7) % 24;
      tidePixel(j % 4 ? '#c37554' : '#f6aa6e', a, b, 3, 3);
    }
  }
  function drawSettlementGround(base, rim, light, stone) {
    const g = SIDE_GROUND_Y, cam = Math.round(sideCameraX), W = canvas.width;
    tidePixel(base, cam - 8, g, W + 16, 48);
    tidePixel(rim, cam - 8, g, W + 16, 3);
    tidePixel(light, cam - 8, g + 3, W + 16, 1);
    for (let i = Math.floor(cam / 16); i < (cam + W + 22) / 16; i++) {
      const x = i * 16 - 4;
      tidePixel(stone, x, g + 6 + (i * 11 % 8), 12 + (i % 3), 1);
      tidePixel(stone, x + 7, g + 23 + (i * 19 % 17), 5 + (i % 7), 1);
      tidePixel(rim, x + 3, g + 7 + (i * 11 % 8), 2, 3);
    }
  }
  function drawTownFacade(buildings) {
    const g = SIDE_GROUND_Y;
    for (const [x, w, height, tint, sign] of buildings) {
      if (!sceneVisible(x + w / 2, w / 2 + 35)) continue;
      drawTideBuilding(x, w, height, tint, sign, !!sign);
      if (sign.includes('INN') || sign === 'BAKEHOUSE' || sign === 'THE DRY COAT') {
        const sx = x + Math.floor(.77 * w);
        tidePixel('#453641', sx, g - height - 25, 10, 21);
        tidePixel('#8e6252', sx - 2, g - height - 25, 14, 3);
        drawFoundry('chimney-smoke', sx + 6, g - height - 27, time + x / 200, .68, 1, .38, true);
      }
    }
  }
  function drawRoadObserver(index, x, y, fade) {
    const im = roadObservers[index], counts = [4, 2, 7];
    if (!sceneVisible(x) || !imgReady(im)) return;
    const f = prefersReducedMotion() ? 0 : Math.floor(time * 5) % counts[index];
    ctx.save(); ctx.globalAlpha = fade;
    ctx.drawImage(im, f * 256, 0, 256, 255, Math.round(x - 68), y - 112, 137, 136); ctx.restore();
  }
  function drawExpandedRegion() {
    const alder = platformScene === 'aldersend', farm = platformScene === 'orchard', gate = platformScene === 'gateward';
    const warm = alder || farm, g = SIDE_GROUND_Y, cx = Math.round(sideCameraX), W = canvas.width, R = region();
    const A = tideArt;
    ctx.save();
    tidePixel(warm ? '#66465a' : gate ? '#293b56' : '#17182b', 0, 0, W, 240);
    if (warm || gate) {
      drawLayer(A['village-sky'], .05, -37, 64, 239);
      drawLayer(A['village-far'], .16, -23, 254, 193);
      drawLayer(A['village-ridge'], .24, 0, 410, 191);
      drawLayer(A['village-trees'], .43, 35, 345, 148);
      tidePixel(warm ? 'rgba(167,113,54,.14)' : 'rgba(23,57,91,.51)', 0, 0, W, 192);
      if (gate) drawLayer(gloamArt.far, .56, 69);
    } else {
      drawLayer(A['salt-deep'], .1, 0, 193, 235);
      drawLayer(A['salt-wall'], .35, -29, 408, 231);
      tidePixel('rgba(22,28,56,.43)', 0, 0, W, 190);
    }
    worldShake();
    drawSettlementGround(warm ? '#604f39' : '#343342', warm ? '#8c764b' : '#565466', warm ? '#a08a57' : '#6c747a', warm ? '#9a7956' : '#666171');
    if (alder) {
      drawTownFacade(ALDER_BUILDINGS);
      drawRoadGate(45, 'WOODLAND'); drawRoadGate(1650, 'OUTER ORCHARD');
      drawTownFence(1131, 1240, '#866348'); drawTownFence(1431, 1590, '#866348');
      for (const [i, x] of [732, 1170, 1430, 1590].entries()) if (sceneVisible(x)) drawOrchardTree(x, i);
      drawCampfire(TOWN_FIRES.aldersend);
      drawSignpost(795, 'ALDER SQUARE', 1);
      for (let i = 0; i < 16; i++) {
        const x = 1390 + i * 14;
        tidePixel(i % 3 ? '#e8c780' : '#91a665', x, g - 8 - i % 4, 3, 5 + i % 4);
      }
    } else if (farm) {
      drawRoadGate(45, 'ALDER’S END');
      drawTownFence(116, 227, '#866348'); drawTownFence(229, 312, '#715340');
      for (let i = 0; i < 10; i++) if (sceneVisible(153 + i * 82)) drawOrchardTree(153 + i * 82, i);
      if (sceneVisible(686, 140)) drawTideBuilding(617, 142, 73, '#546051', 'GRAIN SHED', true);
      for (const x of [508, 552, 581, 732]) {
        tidePixel('#6c5140', x, g - 19, 21, 19); tidePixel('#a88051', x + 1, g - 18, 19, 2);
        tidePixel('#46352e', x + 3, g - 4, 16, 1);
      }
      if (!story.granaryCleared) {
        for (let i = 0; i < 7; i++) tidePixel('#cca782', 549 + i * 14, g - 1 - i % 3, 3, 2);
        drawRoadObserver(2, 895, 164, .56 * clamp((860 - sidePlayer.x) / 150, 0, 1));
      } else drawRoadGate(974, 'FARM SHORTCUT');
    } else if (gate) {
      drawTownFacade(GATE_BUILDINGS);
      drawRoadGate(45, 'GLOAMHOLD', true); drawRoadGate(1520, 'LAMP ANNEX', true);
      drawCampfire(TOWN_FIRES.gateward);
      drawTownFence(560, 628, '#5c7179'); drawTownFence(918, 1043, '#5c7179');
      drawSignpost(999, 'FLOOD LINE', 1);
      if (story.lampPaid && sceneVisible(1520, 120)) {
        tideGlow(1520, 97, 63, '172,231,205', .58);
        drawFoundry('lantern-glow', 1520, 97, time, .8, 1, .86, true);
      }
      for (const x of [130, 330, 573, 731, 984, 1190, 1420]) if (sceneVisible(x)) {
        tidePost(x, g, '#647078'); tideLantern(x, g - 27, '176,211,208');
        drawFoundry('lantern-glow', x, g - 27, time + x / 200, .51, 1, .58, true);
      }
    } else {
      drawRoadGate(45, 'GATEWARD', true);
      for (let i = 0; i < 14; i++) {
        const x = 130 + i * 115;
        if (!sceneVisible(x, 90)) continue;
        tidePixel('#2a2838', x - 19, 48, 38, g - 48); tidePixel('#4d4053', x - 15, 49, 3, g - 51);
        for (let j = 0; j < 16; j++) tidePixel('#504355', x - 15, 55 + j * 9, 32, 1);
        if (i % 2 === 1) tideLantern(x, 126, '129,155,219');
      }
      drawRoadObserver(0, 260, 147, .50 * clamp((300 - sidePlayer.x) / 145, 0, 1));
      drawRoadObserver(1, 1090, 163, .46 * clamp((1070 - sidePlayer.x) / 145, 0, 1));
      if (sceneVisible(1550, 85)) {
        drawTideBuilding(1501, 98, 59, '#4e4f6f', 'SHUTTER LOCKER', !story.lampRecovered);
        if (!story.lampRecovered) drawFoundry('hex-sigil', 1550, 150, time, .55, 1, .54, true);
      }
    }
    if (alder) for (const x of [229, 406, 636, 753, 910, 1073, 1263, 1570]) if (sceneVisible(x)) {
      tidePost(x, g, '#805638'); tideLantern(x, g - 22);
    }
    for (const p of R.plats.slice(1)) if (sceneVisible(p.x + p.w / 2, p.w / 2 + 20)) drawSidePlatform(p);
    drawTownActors(); drawSideMobs(); drawSidePlayer(); drawPlayerWaves(); drawCombatFx(); drawFortuneFx(); drawAmbient();
    ctx.restore();
    drawSideOverlays(R.name);
  }

  function drawResident(who, x, y, scale, direction, walk = 0) {
    const townRow = DISTINCT_TOWN_ROWS[who], watchRow = WATCH_CAST_ROWS[who];
    if (townRow !== undefined || watchRow !== undefined) {
      const town = townRow !== undefined, image = town ? distinctCastArt : watchCastArt;
      if (!imgReady(image)) return;
      const still = prefersReducedMotion(), w = town ? 20 : 32, h = town ? 29 : 32;
      const frame = still ? 0 : walk ? (town ? 6 : 1) + Math.floor(walk * 8) % 4
        : town ? Math.floor((time + townRow / 3) * 4) % 4 : 0;
      const sc = scale * (town ? 1.36 : 1.14);
      ctx.save(); ctx.imageSmoothingEnabled = false;
      ctx.translate(Math.round(x), y); ctx.scale(direction, 1);
      ctx.drawImage(image, frame * w, (town ? townRow : watchRow) * h, w, h, -w * sc / 2, -h * sc, w * sc, h * sc);
      ctx.restore();
      return;
    }
    const npc = villageNpcArt[who];
    if (imgReady(npc?.image)) {
      const { sx, sy } = villageNpcFrame(who, walk);
      const size = scale * .5;
      const dir = who === 'orrin' ? npc.facing : direction;
      ctx.save(); ctx.imageSmoothingEnabled = false;
      ctx.translate(Math.round(x), y); ctx.scale(dir * npc.facing, 1);
      ctx.drawImage(npc.image, sx, sy, VILLAGE_CELL_W, VILLAGE_CELL_H,
        -VILLAGE_CELL_W * size / 2, -VILLAGE_CELL_H * size, VILLAGE_CELL_W * size, VILLAGE_CELL_H * size);
      ctx.restore();
      return;
    }
    const low = prefersReducedMotion();
    const base = residentArt[who];
    if (!imgReady(base)) return;
    ctx.save(); ctx.imageSmoothingEnabled = false;
    const acting = ACTOR_POSES.has(who), clock = time + who.charCodeAt(0) * .25;
    const frame = low ? 0 : acting ? Math.floor(clock * 4) % 8 : walk ? 2 + Math.floor(walk * 9) % 4 : Math.abs(x - sidePlayer.x) < 55 ? 0 : 1;
    ctx.translate(Math.round(x), y); ctx.scale(direction * scale, scale);
    ctx.drawImage(base, frame * 48, 0, 48, 56, -24, acting ? -53 : -56, 48, 56);
    ctx.restore();
  }
  function drawLoreSpots() {
    const drawWitness = (who, x, found) => {
      if (!WITNESS_APPEARANCE[who] || x < sideCameraX - 32 || x > sideCameraX + canvas.width + 32) return;
      const y = SIDE_GROUND_Y;
      ctx.fillStyle = 'rgba(10,11,20,.45)'; ctx.fillRect(x - 10, y - 1, 21, 2);
      drawResident(who, x, y, 1, sidePlayer.x < x ? -1 : 1);
      if (found || nickScene) return;
      const bob = prefersReducedMotion() ? 0 : Math.round(Math.sin(time * 3 + x) * 2);
      ctx.fillStyle = '#191823'; ctx.fillRect(x - 7, y - 48 + bob, 14, 8);
      ctx.fillRect(x - 3, y - 40 + bob, 3, 2);
      ctx.fillStyle = SPEAKERS[who].color;
      for (let i = -4; i <= 4; i += 4) ctx.fillRect(x + i, y - 45 + bob, 2, 2);
    };
    for (const l of LORE) {
      if (l.speaker && l.scene === platformScene && (!l.requires || story[l.requires])) drawWitness(l.speaker, l.x, story.pages.includes(l.id));
    }
    if (platformScene === 'court') drawWitness('keeper', 655, story.ch4Done);
  }

  // A fixed work order alongside the repeatable hunt board. The seam is
  // discoverable without the order and a kill counts even if you find it first.
  const FORGE_TRAIL = { smith: 1750, notice: 1971, crack: 1255, seamFire: 245, cache: 1052, width: 1200 };
  Object.assign(STORY_DEFAULTS, { seamOrder: false, seamPaid: false, seamSeen: false, seamCleared: false, seamLooted: false });
  REGIONS.seam = { name: 'THE CINDER SEAM', width: FORGE_TRAIL.width, entry: 82, color: '#ffb181',
    plats: [tideGround(FORGE_TRAIL.width), { x: 525, y: 144, w: 116, h: 10 }, { x: 705, y: 142, w: 80, h: 10 }] };
  REGION_SUBS.seam = 'An old mine beneath Cinder Deep';
  FIRES.push({ id: 'seam', scene: 'seam', x: FORGE_TRAIL.seamFire, name: 'Cinder Seam Lantern' });
  SCENE_MOBS.seam = [['skull', 471, 54], ['seamFiend', 852, 72]];
  MOB_TYPES.seamFiend = { ...MOB_TYPES.fiend, name: 'Cinderback', hp: 40, dmg: 9, speed: 72, chase: 170,
    scale: MOB_TYPES.fiend.scale * 1.25, xp: 54, coins: [9, 13], drops: [['ember', 1]], tint: '250,95,47,.44' };
  Object.assign(ITEM_DEFS, {
    frostcore: { name: 'Nick’s Heart', type: 'KEY ITEM', rarity: 'rare', value: 0, icon: 'frostcore', desc: ['A heart of solid ice.', 'Used to forge Frostglass Edge.'], lore: 'A second heart, which Nick swears he did not need.' },
    seamore: { name: 'Seam Ore', type: 'KEY ITEM', rarity: 'rare', value: 0, icon: 'seamore', desc: ['An ore that holds heat.', 'Used to forge Frostglass Edge.'], lore: 'The Cinderback slept on the last good chunk.' },
    frostedge: { name: 'Frostglass Edge', type: 'WEAPON', rarity: 'legend', value: 0, bound: true, atk: 6, icon: 'frostedge', desc: ['ATK +6. Temper at a forge.', 'Fires a pale Moonblade arc.'], lore: 'The last thing Vi heard at the anvil was ice cracking.' }
  });
  for (const k of ['frostcore', 'seamore', 'frostedge']) { inventory[k] = 0; ITEM_ORDER.push(k); }
  Object.assign(TIDE_ICONS, {
    frostcore: '............ ...kk..kk... ..kBbkBbBk.. ..kBWWBbbk.. ..kbWBBbBk.. ...kbBWTk... ....kBBk.... .....kk.....'.split(' '),
    seamore: '............ .....kk..... ...kkGokk... ..kgGoGgok.. .kgoGggGgkk. .kgGoggGgk.. ..kggogkk... ...kkkk.....'.split(' '),
    frostedge: '..........k. .........kB. ........kWB. .......kWBk. ......kWBk.. .....kWBk... ..k.kWBk.... ..kkWBk..... ...kBk...... ..kbkk...... .kk.........'.split(' ')
  });
  WEAPONS.frostedge = { name: ITEM_DEFS.frostedge.name, atk: 6, icon: 'frostedge', arc: '166,230,255' };
  function useSeamOrder() {
    if (story.seamPaid) return startDialogue([{ who: 'board', text: 'CINDERBACK: Closed. Vi marked the work order paid in red chalk.' }]);
    if (story.seamCleared) {
      story.seamOrder = story.seamPaid = true;
      tideGrant('coins', 24);
      tideNotice('Cinderback bounty paid: 24 coins.', 'victory'); tidePersist();
      return;
    }
    story.seamOrder = true; tidePersist();
    startDialogue([
      { who: 'board', text: 'WANTED: Cinderback. 24 coins. Follow Cinder Deep to the brass rails. Look for orange light where the two mine supports touch.' },
      { who: 'vi', text: "The ore in our old strongbox is yours if you can get it out. Bring it here if you want a blade that won't crack." }
    ]);
  }
  function forgeTrailInteraction(x) {
    const F = FORGE_TRAIL, near = target => Math.abs(x - target) < 23;
    if (platformScene === 'pass') {
      if (near(F.smith)) return { label: 'TALK TO VI / FORGE', act: () => openTide('forge') };
      if (near(F.notice)) return { label: story.seamCleared && !story.seamPaid ? 'CLAIM CINDERBACK BOUNTY' : 'READ THE WORK ORDER', act: useSeamOrder };
    } else if (platformScene === 'cinder' && near(F.crack)) {
      return { label: 'SQUEEZE THROUGH THE SEAM', act: () => { story.seamSeen = true; enterRegion('seam', REGIONS.seam.entry, 1); } };
    } else if (platformScene === 'seam') {
      if (x < 62) return { label: 'BACK TO CINDER DEEP', act: () => enterRegion('cinder', F.crack - 33, -1) };
      if (near(F.cache) && !story.seamLooted) return { label: story.seamCleared ? 'OPEN THE MINE CACHE' : 'CACHE / GUARDED', act: () => {
        if (!story.seamCleared) return tideNotice('The Cinderback is still guarding it.', 'uiError');
        story.seamLooted = true; depthsOnChest();
        tideGrant('seamore', 1); tideGrant('ember', 2); tideGrant('coins', 12);
        tideNotice('Seam Ore, 2 Living Embers, and 12 coins.', 'chest'); tidePersist();
      } };
    }
    return null;
  }
  function drawForgeTrail() {
    const F = FORGE_TRAIL, g = SIDE_GROUND_Y;
    if (platformScene === 'pass') {
      const x = F.smith;
      drawSignpost(x + 22, 'FORGE', -1);
      drawResident('vi', x - 5, g, 1.05, sidePlayer.x < x ? -1 : 1);
      tidePixel('#2b2020', x + 6, g - 16, 22, 4); tidePixel('#827376', x + 7, g - 16, 20, 2);
      tidePixel('#4f4144', x + 14, g - 12, 7, 12);
      tideGlow(x + 18, g - 12, 21, '255,119,59', .34);
      drawBoard(F.notice);
      invText('WORK ORDER', F.notice, g - 41, '#ffdfb0', 'bold 6px monospace', 'center');
    } else if (platformScene === 'cinder') {
      const x = F.crack;
      tideShape('#251719', [x - 44,g],[x - 30,g - 92],[x - 11,g - 74],[x - 2,g - 64],[x + 6,g - 77],[x + 40,g - 87],[x + 47,g]);
      tideShape('#100e15', [x - 10,g],[x - 3,g - 54],[x + 7,g - 66],[x + 4,g - 16],[x + 14,g]);
      tidePixel('#7a594e', x - 28, g - 67, 4, 67); tidePixel('#7a594e', x + 25, g - 67, 4, 67);
      tidePixel('#8f6b58', x - 32, g - 70, 64, 4);
      tidePixel('#e3b875', x - 35, g - 4, 70, 2); tidePixel('#a07348', x - 32, g + 2, 68, 1);
      tideGlow(x + 1, g - 34, 22, '255,110,48', .65);
      if (story.seamSeen) invText('CINDER SEAM', x, g - 79, '#ffca92', 'bold 6px monospace', 'center');
    }
  }
  function drawCinderSeam() {
    const F = FORGE_TRAIL, W = canvas.width, H = canvas.height, g = SIDE_GROUND_Y, cx = sideCameraX;
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#100d15'); bg.addColorStop(.62, '#30222c'); bg.addColorStop(1, '#15121b');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    ctx.save(); worldShake();
    for (let x = Math.floor((cx - 75) / 80) * 80; x < cx + W + 85; x += 80) {
      const n = Math.abs(x * 13 % 37);
      tideShape('#1c1520', [x - 20,0],[x + 64,0],[x + 51,50 + n],[x + 26,90 + n],[x + 18,56],[x - 10,60]);
      tideShape('#45313b', [x - 12,g],[x + 5,g - 60 + n],[x + 32,g - 71 + n],[x + 48,g]);
      for (let i = 0; i < 5; i++) tidePixel(i % 2 ? '#65404a' : '#4d333e', x + i * 9, g - 13 - (i * 12 + n) % 43, 3 + n % 12, 2);
      if (x % 160 === 0) {
        tidePixel('#30232a', x + 4, 72, 6, g - 72); tidePixel('#67483e', x + 5, 73, 2, g - 75);
        tidePixel('#513b38', x - 25, 71, 70, 4); tideLantern(x + 19, 94, '255,142,83');
      }
      tidePixel('#25202a', x, g, 80, 44);
      tidePixel('#795349', x, g, 80, 3);
      tidePixel('#665055', x + n, g + 12, 23, 2);
      tidePixel('#47343e', x + 28, g + 23 + n % 9, 42, 3);
    }
    sidePlatforms().slice(1).forEach(p => {
      tidePixel('#463039', p.x, p.y, p.w, p.h);
      tidePixel('#967066', p.x, p.y, p.w, 2);
    });
    drawSignpost(54, 'CINDER DEEP', -1); drawCampfire(F.seamFire);
    drawChest({ x: F.cache, rarity: 'rare', open: story.seamLooted, looted: story.seamLooted, openedAt: -8 });
    drawSideMobs(); drawSidePlayer(); drawPlayerWaves(); drawCombatFx(); drawFortuneFx();
    ctx.restore(); drawSideOverlays(region().name);
  }

  const NICK_OMEN = 1950, NICK_TRAP = 2070, NICK_TRAIL = 2094;
  const NICK_CHARGE = 3.75, NICK_IMPACT = 5.13, NICK_WAKE = 7.27, NICK_END = 8.48;
  const NICK_RAY = ['nick-attack_ray', 14, 12];
  const frostArt = [1, 2, 3, 4, 5].map(n => loadImg(`frost/snow-${n}.png`));
  let nickScene = null;
  REGIONS.frost = { name: 'FROSTGLASS RIDGE', width: 1560, entry: 88, color: '#abebff', plats: [tideGround(1560)],
    boss: 'nick', bossX: 1190, bossFlag: 'nickDefeated', arena: { left: 824, trigger: 896, right: 1434 } };
  REGION_SUBS.frost = 'Ashen Pass / Beyond the frost trail';
  FIRES.push({ id: 'frost', scene: 'frost', x: 748, name: 'Frostglass Cairn' });
  SCENE_MOBS.frost = [['frostWolf', 312, 75], ['frostWolf', 563, 73]];
  MOB_TYPES.frostWolf = {
    name: 'Frost Wolf', src: 'frost/', anims: { idle: ['wolf-idle', 4, 8], move: ['wolf-run', 6, 13],
      attack: ['wolf-attack', 7], hurt: ['wolf-hit', 4], death: ['wolf-death', 8] },
    fw: 48, fh: 32, ax: 24, ay: 32, faceLeft: true, scale: 1.15, bodyH: 23, width: 23, hp: 11, speed: 105,
    chase: 160, reach: 39, dmg: 6, atkTime: .78, hit: [.28, .54], cd: [1.35, 1.9], xp: 23, coins: [3, 6],
    drops: [['fang', .66], ['tonic', .12]], voice: 'hound'
  };
  MOB_TYPES.nick = {
    name: 'Nick, the Frostglass Warden', short: 'Nick', boss: true, ai: 'nick', src: 'frost/',
    anims: { idle: ['nick-idle', 5, 7], move: ['nick-move', 8, 12], attack: ['nick-attack_peck', 11],
      ray: NICK_RAY, hurt: ['nick-hurt', 4], death: null },
    fw: 256, fh: 128, ax: 128, ay: 128, scale: .72, bodyH: 65, width: 31, hp: 98, speed: 65,
    chase: 700, reach: 58, dmg: 10, atkTime: .85, hit: [.29, .52], cd: [1.15, 1.4],
    xp: 192, coins: [32, 42], drops: [['tonic', 1]], voice: 'monster', summon: 'frostWolf'
  };
  for (const T of [MOB_TYPES.nick, MOB_TYPES.frostWolf]) {
    for (const anim of Object.values(T.anims)) if (anim) mobSheet(T, anim);
  }
  BOSS_LINES.nick = { flag: 'nickBossSeen', tip: 'Jump the ray or get behind him. Strike while he recovers.',
    first: [{ who: 'nick', text: "You're standing again. Good. This time, move when you see the light." },
      { who: 'rowan', text: "This time I'm not letting you walk away." }],
    retry: [{ who: 'nick', text: "Watch my beak, not the snow." }] };
  BOSS_CINE.nick = { nameAt: 1.9, main: '#a5eaff', hot: '#f0fdff', deep: '#204b7f', glow: '119,213,255', crest: 'moon' };
  BOSS_FORMS.nick = ['THE WHITEOUT', 'Now try it with your eyes shut.', '#3c6794', '#a7ecff'];
  PHASE_SHOWS.nick = { aura: 'ripple', burst: 'arc-discharge', cue: 'magic', split: true };
  const nickReduced = () => typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const nickEase = v => { const n = clamp(v, 0, 1); return n * n * (3 - 2 * n); };
  const nickFireAt = enraged => enraged ? .74 : 1.10;
  function nickRayFrame(t, fireAt) {
    return t < fireAt ? Math.min(6, Math.floor(Math.max(0, t) / fireAt * 7))
      : Math.min(13, 7 + Math.floor((t - fireAt) * 14));
  }
  function updateNickBoss(m, dt, enraged, playerAlive, dx, face, left, right, go) {
    const T = m.T, fireAt = nickFireAt(enraged), distance = Math.abs(dx);
    m.hurtTime = Math.max(0, m.hurtTime - dt);
    if (m.hurtTime > 0 && m.st === 'peck') go('recover');
    if (m.st === 'stalk') {
      m.dir = face;
      if (distance > 72) {
        m.x += face * T.speed * (enraged ? 1.23 : 1) * dt;
        m.moving = true; m.walk += dt * 14;
      }
      if (playerAlive && m.stT > (enraged ? .60 : .89)) {
        m.nickHit = false;
        go(distance < 55 && !m.pecked ? 'peck' : 'ray');
        m.pecked = m.st === 'peck';
        sfx(m.pecked ? 'swingBig' : 'magic', .65, m.pecked ? .95 : .54);
      }
    } else if (m.st === 'peck') {
      m.atkLen = T.atkTime;
      m.attackTime = Math.max(.001, T.atkTime - m.stT);
      if (m.stT >= .29 && m.stT < .54 && !m.nickHit && playerAlive) m.nickHit = bossTouch(m, 55, m.y - 38, T.dmg + Number(enraged) * 2);
      if (m.stT >= T.atkTime) { m.attackTime = 0; go('recover'); }
    } else if (m.st === 'ray') {
      // Face is locked at wind-up. Jump over the beam or cross behind Nick.
      if (m.stT >= fireAt && m.stT - dt < fireAt) {
        sfx('demon', .66, 1.35); sfx('clash', .6, .76);
        if (!nickReduced()) screenShake = Math.max(screenShake, 4);
      }
      const a = m.stT - fireAt, along = dx * m.dir;
      if (playerAlive && a >= 0 && a < (enraged ? .52 : .34) && !m.nickHit &&
          along > 28 && along < 282 && sidePlayer.y > m.y - 41 && sidePlayer.y < m.y + 22 && canHitPlayer()) {
        m.nickHit = true; hurtByBoss(T.dmg + 3, m.dir, 'Frostglass Ray', enraged);
      }
      if (a >= (enraged ? .64 : .52)) go('recover');
    } else if (m.stT >= (enraged ? .92 : 1.34)) go('stalk');
    m.x = clamp(m.x, left, right);
  }
  function startNickAmbush() {
    const origin = sidePlayer.x;
    const actor = makeMob('nick', origin + 218, 0, 0);
    actor.T = { ...actor.T, scale: .86, bodyH: 80 };
    nickScene = { t: 0, actor, origin, impactX: origin, impactY: sidePlayer.y - 25, struck: false, awake: false };
    clearHeldInput();
    Object.assign(sidePlayer, { facing: 1, atk: null, roll: null, pray: null, drink: null, moving: false, hurtTime: 0, invulnTime: 0, vx: 0, vy: 0 });
    mobShots.length = 0; groundFires.length = 0; playerWaves.length = 0; bossWaves.length = 0; cineFx.length = 0;
    sceneTitle = null; notice = '';
    sfx('swooshBig', .45, .55);
  }
  function wakeAfterNick() {
    if (nickScene.awake) return;
    nickScene.awake = true;
    stats.health = 1;
    story.nickAmbushed = true;
    sidePlayer.x = 1917; sidePlayer.y = SIDE_GROUND_Y; sidePlayer.onGround = true;
    sidePlayer.invulnTime = 0; sidePlayer.hurtTime = 0;
    sideCameraX = sidePlayer.x - canvas.width * .43;
    screenShake = 0;
  }
  function finishNickAmbush() {
    if (!nickScene) return;
    wakeAfterNick();
    nickScene = null;
    clearHeldInput(); cineFx.length = 0;
    sidePlayer.invulnTime = 1.6;
    notice = 'Rest at the fire. Follow the frost trail east.'; noticeUntil = time + 4.2;
    if (onSave) onSave(getSaveData());
  }
  function updateNickAmbush(dt) {
    const c = nickScene, b = c.actor;
    c.t += dt;
    const t = c.t;
    b.x = c.origin + 218 - 77 * nickEase((t - .25) / 1.14);
    b.moving = t > .25 && t < 1.39; b.walk += dt * 15;
    if (t >= NICK_CHARGE && t - dt < NICK_CHARGE) sfx('magic', .92, .55);
    if (!c.struck && t >= NICK_IMPACT) {
      c.struck = true; stats.health = 1;
      sfx('demon', 1, 1.18); sfx('slam', 1, .59); sfx('hurt', .72, .82);
      padRumble(.95, .8, 480);
      if (!nickReduced()) screenShake = 10;
      cineBurst(c.impactX, c.impactY, 33, { angle: Math.PI, spread: 2.1, speed: 155, g: 160, life: 1.05, color: '167,233,255', size: 3 });
      cineBurst(c.impactX, SIDE_GROUND_Y, 18, { angle: -2.3, spread: 1.7, speed: 90, g: 250, life: 1.24, kind: 'rock', color: '80,141,180', size: 3 });
      spawnBlood(c.impactX, c.impactY, -1, true);
    }
    if (c.struck && !c.awake) {
      const a = t - NICK_IMPACT, flight = nickEase(a / .55);
      sidePlayer.x = c.origin - 82 * flight;
      sidePlayer.y = SIDE_GROUND_Y - 25 * Math.sin(Math.PI * clamp(a / .55, 0, 1));
    }
    screenShake = Math.max(0, screenShake - dt * 21);
    updateCombatFx(dt); updateCineParticles(dt);
    if (!c.awake) {
      const target = c.origin - (c.struck ? 124 : 105) + (nickReduced() ? 0 : 24 * nickEase((t - .25) / 1.4));
      sideCameraX += (target - sideCameraX) * Math.min(1, dt * 4.6);
    }
    if (t >= NICK_WAKE) wakeAfterNick();
    if (t >= NICK_END) finishNickAmbush();
  }
  function frostSnow(intensity, clock = time) {
    const w = canvas.width, h = canvas.height;
    for (let i = 0; i < 64; i++) {
      const x = ((i * 67.7 - clock * (19 + i % 9 * 4)) % w + w) % w;
      const y = (i * 43.3 + clock * (6 + i % 7)) % h;
      ctx.globalAlpha = intensity * (.21 + i % 5 * .14);
      ctx.fillStyle = i % 4 ? '#bad9ed' : '#f0fdff';
      ctx.fillRect(Math.round(x), Math.round(y), i % 6 === 0 ? 5 : 2, i % 4 === 0 ? 2 : 1);
    }
    ctx.globalAlpha = 1;
  }
  function drawNickRay(x, y, endX, endY, elapsed, chargeAt, large) {
    if (elapsed < 0) return;
    if (elapsed < chargeAt) {
      const p = clamp(elapsed / chargeAt, 0, 1), rad = 10 + 17 * p;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const halo = ctx.createRadialGradient(x, y, 1, x, y, rad);
      halo.addColorStop(0, `rgba(137,224,255,${.2 + p * .55})`); halo.addColorStop(1, 'rgba(20,100,240,0)');
      ctx.fillStyle = halo; ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
      ctx.strokeStyle = `rgba(160,227,255,${.10 + p * .40})`; ctx.setLineDash([5, 7]);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(endX, endY); ctx.stroke(); ctx.setLineDash([]);
      for (let i = 0; i < 12; i++) {
        const a = i * 2.4 + elapsed * 4, r = rad * (.4 + (i * .16 + 1 - p) % 1);
        ctx.fillStyle = i % 3 ? '#80cfff' : '#e5fcff';
        ctx.fillRect(Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r), 2, 2);
      }
      const core = 2 + p * 5;
      ctx.fillStyle = '#eaffff'; ctx.fillRect(x - core / 2, y - core / 2, core, core);
      ctx.restore(); return;
    }
    const fired = elapsed - chargeAt, duration = large ? .89 : .53;
    if (fired >= duration) return;
    const force = (1 - nickEase((fired - duration * .44) / (duration * .56))) * (.92 + .08 * Math.sin(fired * 47));
    const reach = Math.hypot(endX - x, endY - y), wide = (large ? 53 : 26) * force;
    const span = Math.min(reach, reach * (.7 + fired * 14));
    ctx.save();
    ctx.translate(x, y); ctx.rotate(Math.atan2(endY - y, endX - x));
    for (const [color, m, alpha] of [['#7664e5', 1.61, .29], ['#297fd9', 1.18, .83], ['#55bcf7', .81, 1], ['#a4efff', .55, 1], ['#f1ffff', .27, 1]]) {
      const n = wide * m;
      ctx.globalAlpha = alpha * Math.min(1, force * 2);
      ctx.fillStyle = color; ctx.beginPath();
      ctx.moveTo(0, -n * .15); ctx.lineTo(31, -n * .39); ctx.lineTo(span, -n * .60);
      ctx.lineTo(span, n * .60); ctx.lineTo(31, n * .39); ctx.lineTo(0, n * .15); ctx.fill();
    }
    ctx.globalAlpha = force;
    for (let i = 0; i < 29; i++) {
      const px = (i * 41.2 + fired * (310 + i % 8 * 35)) % span, off = Math.sin(i * 1.9 + fired * 7.5) * wide * (.34 + px / reach * .4);
      ctx.fillStyle = i % 3 ? '#d5f9ff' : '#5cc9ff';
      ctx.fillRect(Math.round(px), Math.round(off), 3 + i % 5 * 2, i % 4 ? 1 : 2);
    }
    ctx.restore();
  }
  function drawNickAmbushWorld() {
    const c = nickScene;
    if (!c || c.awake) return;
    const b = c.actor, t = c.t;
    if (t >= NICK_CHARGE && t < NICK_IMPACT + .89) {
      const f = nickRayFrame(t - NICK_CHARGE, NICK_IMPACT - NICK_CHARGE), img = mobSheet(b.T, NICK_RAY);
      if (imgReady(img)) {
        ctx.save(); ctx.translate(b.x, b.y); ctx.scale(-b.T.scale, b.T.scale);
        ctx.drawImage(img, f * 256, 0, 256, 128, -128, -128, 256, 128); ctx.restore();
      } else drawMob(b);
      const x = b.x - 34, y = b.y - 58;
      const slope = (c.impactY - y) / (c.impactX - x);
      drawNickRay(x, y, x - 360, y - 360 * slope, t - NICK_CHARGE, NICK_IMPACT - NICK_CHARGE, true);
    } else {
      ctx.save(); ctx.globalAlpha = 1 - nickEase((t - 6.08) / .68); drawMob(b); ctx.restore();
    }
  }
  function drawNickAmbushFrame() {
    const c = nickScene, t = c.t, w = canvas.width, h = canvas.height;
    if (!c.awake) drawCineFx();
    const bar = Math.round(25 * nickEase(t / .60) * (1 - nickEase((t - NICK_WAKE) / .85)));
    const tint = .29 * nickEase(t / .62) * (1 - nickEase((t - NICK_WAKE) / .83));
    ctx.fillStyle = `rgba(24,43,91,${tint})`; ctx.fillRect(0, 0, w, h);
    frostSnow(.78 * nickEase(t / .85) * (1 - nickEase((t - NICK_WAKE) / .78)), nickReduced() ? 0 : t);
    if (t < NICK_WAKE) {
      ctx.fillStyle = '#090d18'; ctx.fillRect(0, 0, w, bar); ctx.fillRect(0, h - bar, w, bar);
      const end = t - NICK_IMPACT;
      if (end >= 0 && end < .19 && !nickReduced()) {
        ctx.fillStyle = `rgba(212,249,255,${.31 * (1 - end / .19)})`; ctx.fillRect(0, bar, w, h - bar * 2);
      }
      if (t > 1.41 && t < NICK_IMPACT) {
        const a = nickEase((t - 1.41) / .3) * (1 - nickEase((t - 4.90) / .23));
        ctx.globalAlpha = a; ctx.textAlign = 'center';
        ctx.fillStyle = '#101f34'; ctx.fillRect(56, 43, 208, 41);
        ctx.fillStyle = '#75cced'; ctx.fillRect(56, 43, 208, 1); ctx.fillRect(56, 83, 208, 1);
        ctx.font = 'bold 13px monospace'; ctx.fillStyle = '#d5f7ff'; ctx.fillText('NICK', 160, 60);
        ctx.font = '7px monospace'; ctx.fillStyle = '#97bdd8'; ctx.fillText('THE FROSTGLASS WARDEN', 160, 74);
        ctx.font = '8px monospace'; ctx.fillStyle = '#e7f5ff';
        ctx.fillText(t < 2.94 ? "Rowan. I know who you're looking for." : 'But the Court is watching.', 160, h - 9);
        ctx.globalAlpha = 1;
      }
      if (end > .15 && end < .95) {
        ctx.globalAlpha = 1 - nickEase((end - .60) / .33);
        invText('1 HP', clamp(c.origin - sideCameraX - 62, 25, 280), 102, '#ff9b94', 'bold 12px monospace', 'center');
        ctx.globalAlpha = 1;
      }
    }
    const black = t < NICK_WAKE ? nickEase((t - 6.32) / .50) : 1 - nickEase((t - NICK_WAKE) / .78);
    if (black > 0) { ctx.fillStyle = `rgba(5,8,15,${black})`; ctx.fillRect(0, 0, w, h); }
    if (t >= 6.87 && t < 7.94) {
      ctx.globalAlpha = nickEase((t - 6.87) / .16) * (1 - nickEase((t - 7.69) / .25));
      invText('WREN: Rowan. Stay with me.', 160, 189, '#ffe1c3', '8px monospace', 'center');
      ctx.globalAlpha = 1;
    }
    if (t > .4 && t < 4.85) invText(K('E') + ' SKIP', 312, 16, '#b8cbdf', '6px monospace', 'right');
  }
  function drawFrostglass() {
    const w = canvas.width, h = canvas.height, gy = SIDE_GROUND_Y;
    ctx.fillStyle = '#26364c'; ctx.fillRect(0, 0, w, h);
    for (const [i, par] of [[4,.04],[3,.16],[2,.27],[1,.52]]) drawLayer(frostArt[i], par, -15, 384, 216);
    ctx.fillStyle = 'rgba(27,57,101,.27)'; ctx.fillRect(0, 0, w, gy);
    ctx.save(); worldShake(); ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#1c2b42'; ctx.fillRect(sideCameraX - 15, gy, w + 30, h - gy + 15);
    const start = Math.floor(sideCameraX / 384) * 384;
    if (imgReady(frostArt[0])) for (let x = start - 384; x < sideCameraX + w + 40; x += 384) {
      ctx.drawImage(frostArt[0], 0, 196, 384, 20, x, gy - 6, 384, 22);
    }
    ctx.fillStyle = '#56708b';
    for (let x = Math.floor(sideCameraX / 24) * 24 - 24; x < sideCameraX + w + 24; x += 24) {
      const y = gy + 12 + (x * 7 % 11);
      ctx.fillRect(x, y, 6 + x / 24 % 6, 2);
      if (x % 72 === 0) { ctx.fillStyle = '#8eafc3'; ctx.fillRect(x - 4, gy - 6, 14, 2); ctx.fillStyle = '#56708b'; }
    }
    drawSignpost(50, 'ASHEN PASS', -1); drawCampfire(748);
    drawSideMobs(); drawSidePlayer(); drawPlayerWaves(); drawCombatFx(); drawFortuneFx();
    const b = theBoss();
    if (b && !b.dead && b.st === 'ray') drawNickRay(b.x + b.dir * 28, b.y - 42, b.x + b.dir * 285, b.y - 42,
      b.stT, nickFireAt(b.enraged), false);
    if (story.nickDefeated && (!b || b.deadTime > 2.2)) {
      drawMob({ type: 'nick', T: MOB_TYPES.nick, x: REGIONS.frost.bossX, y: gy, dir: sidePlayer.x < REGIONS.frost.bossX ? -1 : 1 });
    }
    ctx.restore();
    frostSnow(.62, nickReduced() ? 0 : time);
    drawSideOverlays('FROSTGLASS RIDGE');
  }
  function drawCamp() {
    drawTent(CAMP.tent);
    drawLogBench(CAMP.log);
    drawCart(CAMP.cart);
    drawBram(CAMP.bram);
    drawCampfire(CAMP.fire);
    drawSignpost(CAMP.sign, 'THE HOLLOW', 1);
    // gloomy treeline beyond the sign hints at the Hollow
    ctx.fillStyle = 'rgba(30,10,50,.35)'; ctx.fillRect(CAMP.sign + 30, 0, 200, SIDE_GROUND_Y + 30);
  }

  // ---- Drawing: the Hollow ----
  const hollowMist = Array.from({ length: 18 }, (_, i) => ({ x: i * 190 + (i * 53) % 90, y: 150 + (i * 37) % 40, s: 0.4 + (i % 5) * 0.15 }));
  function tileImage(img, offsetX, y, w, h) {
    const start = -((offsetX % w) + w) % w;
    for (let x = start; x < canvas.width; x += w) ctx.drawImage(img, Math.round(x), y, w, h);
  }
  // ---- Chapter 2 and 3 region art ----
  const passArt = { sky: loadImg('pass/sky.png'), far: loadImg('pass/far-mountains.png'), mid: loadImg('pass/middle-mountains.png'),
    back: loadImg('pass/back.png'), middle: loadImg('pass/middle.png'), near: loadImg('pass/near.png'), ground: loadImg('pass/ground.png') };
  const gloamArt = { sky: loadImg('gloam/sky.png'), mountains: loadImg('gloam/mountains.png'), lights: loadImg('gloam/mountains-lights.png'),
    clouds: loadImg('gloam/clouds.png'), far: loadImg('gloam/far-buildings.png'), town: loadImg('gloam/town.png'), forest: loadImg('gloam/forest.png'),
    castle: loadImg('gloam/castle.png'), brick: loadImg('gloam/brick.png'), crate: loadImg('gloam/crate.png') };
  // Crop rectangles inside the Gloamhold atlases.
  const TOWN_PARTS = { row: [191, 5, 270, 92], tall: [98, 8, 66, 89], small: [14, 34, 60, 43], lamp: [168, 49, 20, 39] };
  const CASTLE_PARTS = [[16, 0, 160, 160], [192, 0, 80, 160], [288, 0, 80, 160], [384, 0, 80, 160], [160, 176, 64, 128], [16, 176, 128, 128], [368, 176, 48, 128]];
  const CASTLE_START = 2420;
  function drawWren() {
    if (!wren) return;
    const run = wren.state === 'run', sheet = run ? beastArt.wrenRun : beastArt.wrenIdle;
    if (!imgReady(sheet)) return;
    const n = run ? 7 : 4, f = Math.floor(wren.t * (run ? 14 : 6)) % n;
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(Math.round(wren.x) - 9, SIDE_GROUND_Y - 1, 18, 2);
    ctx.save();
    ctx.translate(Math.round(wren.x), SIDE_GROUND_Y + 1);
    if (wren.dir < 0) ctx.scale(-1, 1);
    ctx.drawImage(sheet, f * 128, 0, 128, 64, -64, -64, 128, 64);
    ctx.restore();
  }
  function drawLayer(img, par, y, w, h) { if (imgReady(img)) tileImage(img, sideCameraX * par, y, w || img.width, h || img.height); }
  function drawCoast() {
    const harbor = platformScene === 'harbor', ground = SIDE_GROUND_Y;
    const W = canvas.width, H = canvas.height;
    const fill = (c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
    const art = (id, x, y, w, h) => {
      const img = coastArt[id];
      if (imgReady(img)) ctx.drawImage(img, Math.round(x), Math.round(y), w ?? img.width, h ?? img.height);
    };
    const aura = (x, y, c, r) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(' + c + ',.44)'); g.addColorStop(1, 'rgba(' + c + ',0)');
      ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    };
    ctx.save(); ctx.imageSmoothingEnabled = false;
    fill(harbor ? '#2b4f58' : '#101e25', 0, 0, W, H);
    if (harbor) {
      drawLayer(coastArt['coast-sky'], 0.08, -15, 264, 222);
      drawLayer(coastArt['coast-ridge'], 0.23, 67, 199, 103);
      fill('rgba(18,44,70,.36)', 0, 0, W, 153);
      fill('#355e67', 0, 153, W, 53);
      fill('#7c9994', 0, 153, W, 1);
      for (let i = 0; i < 42; i++) {
        const x = ((i * 57 - sideCameraX * 0.32 + Math.sin(i + time) * 5) % 336 + 336) % 336 - 8;
        fill(i % 4 ? '#547e80' : '#99b7aa', x, 155 + (i * 13) % 41, 3 + i % 12, 1);
      }
      art('boat-far', 234 - sideCameraX * 0.16, 117, 53, 44);
      art('boat-middle', 454 - sideCameraX * 0.37, 97, 89, 69);
      art('boat-front', 415 - sideCameraX * 0.45, 65, 81, 95);
      // A light offshore answers the signal; the dock lamp below repeats it.
      const bx = 400 - sideCameraX * 0.2, by = 151 + Math.sin(time * 2);
      if (story.ferryOpened) { aura(bx, by, '255,213,120', 25); fill('#fff0b4', bx, by, 2, 2); }
      for (let i = 0; i < 4; i++) {
        const gx = ((275 + i * 39 - time * (13 + i)) % 360 + 360) % 360 - 18;
        const gy = 69 + i * 12 + Math.sin(time * 3 + i) * 3;
        fill('#d4e4dd', gx, gy, 4, 1); fill('#d4e4dd', gx + 4, gy + 1, 3, 1); fill('#b6cbc8', gx + 7, gy, 3, 1);
      }
    } else {
      drawLayer(coastArt['court-wall'], 0.43, 8, 720, 228);
      fill('rgba(14,27,34,.27)', 0, 0, W, H);
      for (let i = 0; i < 16; i++) {
        const x = ((i * 51 - sideCameraX * 0.31) % 328 + 328) % 328;
        const y = 49 + (i * 31) % 133 + Math.sin(time * 1.2 + i) * 3;
        fill('rgba(186,224,197,.32)', x, y, 1, 1);
      }
    }
    worldShake();
    const x0 = Math.floor(sideCameraX / 32) * 32;
    if (harbor) {
      for (let x = x0 - 32; x < sideCameraX + W + 32; x += 32) {
        if (x < 570) {
          fill('#1c343b', x, ground, 32, 44);
          if (imgReady(coastArt['coast-rock'])) ctx.drawImage(coastArt['coast-rock'], 128, 80, 32, 32, x, ground, 32, 32);
          if (imgReady(coastArt.front)) ctx.drawImage(coastArt.front, 0, 32, 32, 25, x, ground + 21, 32, 25);
        } else {
          fill('#31282c', x + 2, ground - 11, 5, 50); fill('#6c4e3c', x + 3, ground - 10, 2, 30);
          fill('#604033', x, ground, 32, 12); fill('#be9163', x, ground, 32, 2);
          fill('#372832', x, ground + 7, 32, 1); fill('#e1aa70', x + 6, ground + 2, 1, 2);
        }
      }
      drawCampfire(177);
      // Nessa's stall: patched sail, stacked baskets and a lantern.
      fill('#553c36', 214, 138, 4, 58); fill('#553c36', 288, 138, 4, 58);
      fill('#3e3d48', 214, 142, 78, 34);
      for (let i = 0; i < 9; i++) {
        fill(i % 2 ? '#dfb077' : '#a36050', 212 + i * 9, 130 + (i > 1 && i < 7 ? 0 : 2), 9, 12);
        fill(i % 2 ? '#9b6b57' : '#744b4b', 212 + i * 9, 141, 9, 4);
      }
      if (imgReady(coastArt.ferrier)) {
        const f = [0, 1, 0, 2][Math.floor(time * 2.1) % 4];
        ctx.drawImage(coastArt.ferrier, f * 39, 0, 39, 53, QUAY.nessa - 18, ground - 48, 35, 48);
      }
      [[224,17],[277,15],[506,16],[524,10],[550,21]].forEach(([x,h]) => {
        fill('#483137', x, ground - h, 17, h); fill('#87634b', x + 1, ground - h, 15, 2);
        fill('#a37d59', x + 3, ground - h + 4, 2, h - 5); fill('#61463e', x + 1, ground - 5, 15, 2);
      });
      BELLS.forEach(b => {
        const lit = story.ferryOpened || FERRY_SIGNAL.indexOf(b.key) < bellCount;
        const swing = bellAnimation?.key === b.key && time < bellAnimation.until ? Math.round(Math.sin((bellAnimation.until - time) * 34) * 2) : 0;
        fill('#3b3538', b.x - 19, 139, 5, 57); fill('#8c705b', b.x - 18, 142, 2, 54);
        fill('#6c564a', b.x - 20, 137, 28, 4); fill('#c09463', b.x - 19, 137, 26, 1);
        fill('#273239', b.x + swing, 141, 1, 7);
        fill('#6e5540', b.x - 5 + swing, 149, 12, 9);
        fill(lit ? '#fae3a4' : '#c79d68', b.x - 3 + swing, 147, 8, 10);
        fill(lit ? '#e5b769' : '#936f50', b.x - 8 + swing, 156, 18, 3);
        fill('#3d302d', b.x - 1 + swing, 159, 4, 2);
        if (lit) aura(b.x, 154, '255,220,122', 25);
        fill('#23343c', b.x - 18, 171, 36, 12);
        invText(b.key.toUpperCase(), b.x, 179, lit ? '#fff0b4' : '#dbcfb3', 'bold 6px monospace', 'center');
      });
      fill('#513c37', QUAY.dock - 11, 132, 5, 64); fill('#a47856', QUAY.dock - 11, 132, 25, 3);
      fill('#382f33', QUAY.dock + 7, 136, 8, 11);
      fill(story.ferryOpened ? '#ffe5ac' : '#635f52', QUAY.dock + 9, 138, 4, 6);
      if (story.ferryOpened) aura(QUAY.dock + 11, 141, '255,211,115', 35);
      art('boat-middle', 868, 145 + Math.sin(time * 2), 61, 47);
    } else {
      fill('#19282b', x0 - 32, ground, W + 96, 44);
      for (let x = x0 - 32; x < sideCameraX + W + 32; x += 32) {
        if (imgReady(coastArt['court-tile'])) ctx.drawImage(coastArt['court-tile'], 320, 128, 32, 32, x, ground, 32, 32);
        fill('#859781', x, ground, 31, 1); fill('#304440', x, ground + 1, 32, 2);
        fill('#253634', x + 5, ground + 16, 26, 1);
      }
      fill('#3b3831', 180, 181, 41, 15); fill('#62654e', 181, 181, 39, 2);
      fill('#89674f', 198, 144, 6, 40); fill('#604738', 203, 143, 3, 41);
      [[181,129,22,8],[190,115,19,20],[202,122,15,17],[174,135,24,10],[207,137,18,9]].forEach(([x,y,w,h], i) => {
        fill(i % 2 ? '#759077' : '#4a6959', x, y, w, h); fill('#a3af7b', x + 3, y - 1, w - 7, 2);
      });
      [[180,140],[210,133],[194,151]].forEach(([x,y]) => { fill('#bb7c7e', x, y, 2, 8); fill('#e9baa3', x, y, 1, 4); });
      fill('#584b42', 313, 183, 32, 4); fill('#3b3332', 315, 187, 4, 9); fill('#3b3332', 340, 187, 4, 9);
      fill('#4c4037', 630, 172, 48, 6); fill('#716252', 630, 172, 48, 1);
      fill('#322d30', 634, 178, 4, 18); fill('#322d30', 670, 178, 4, 18);
      fill('#4f4240', 648, 166, 17, 6); fill('#dac5a0', 649, 166, 15, 4); aura(656, 160, '222,196,133', 25);
      fill('#3d514a', 786, 98, 54, 98); fill('#728174', 790, 103, 46, 4);
      fill('#152b2e', 791, 110, 44, 86); fill('#283938', 795, 113, 36, 83);
      for (let i = 0; i < 5; i++) fill('#1b2b2d', 798 + i * 7, 113, 1, 83);
      fill('#b9a96f', 813, 117, 1, 74); aura(813, 159, '216,211,127', 18);
      fill('#556151', 795, 144, 36, 2); fill('#101d25', 793, 168, 39, 5);
    }
    if (harbor) drawDepthGate(TIDE_POINTS.quay, { name: 'BRINEWICK', color: '#ffd396', unlock: () => true });
    else if (story.ch4Done) {
      aura(813, 169, '117,242,215', 27);
      fill('#a2ead2', 811, 142, 5, 2);
    }
    drawLoreSpots(); drawWren(); drawSidePlayer(); drawPlayerWaves(); drawCombatFx(); drawFortuneFx();
    ctx.restore();
    drawSideOverlays(region().name);
    if (!dialogue && !panel) {
      if (harbor && bellFeedback && time < bellFeedback.until) {
        invBox(56, 48, 208, 15, '#192a34', bellFeedback.error ? '#dfa48b' : '#e3bd7e');
        invText(bellFeedback.text, 160, 58, '#fff2d1', '7px monospace', 'center');
      } else if (!sceneTitle) {
        const goal = harbor ? (story.ferryOpened ? 'Board at the east dock' : 'Ask Nessa about the night signal')
          : (story.ch4Done ? 'Lower Well: east door' : "Follow Seren's voice");
        invText(goal, 312, 31, '#fff0ce', 'bold 7px monospace', 'right');
      }
    }
  }
  function worldShake() {
    const sx = screenShake > 0 ? Math.round((Math.random() - 0.5) * screenShake * 2) : 0;
    const sy = screenShake > 0 ? Math.round((Math.random() - 0.5) * screenShake * 1.4) : 0;
    ctx.translate(-Math.round(sideCameraX) + sx, sy);
  }
  function drawRockLedge(pl) {
    ctx.fillStyle = '#3b1d1d'; ctx.fillRect(pl.x, pl.y + 3, pl.w, pl.h + 3);
    ctx.fillStyle = '#8a4433'; ctx.fillRect(pl.x, pl.y, pl.w, 4);
    ctx.fillStyle = '#c56a46'; ctx.fillRect(pl.x + 2, pl.y, pl.w - 4, 1);
    ctx.fillStyle = '#5a2a24';
    for (let x = pl.x + 6; x < pl.x + pl.w - 6; x += 13) ctx.fillRect(x, pl.y + 6 + ((x / 13) % 2) * 3, 5, 2);
    ctx.beginPath(); ctx.moveTo(pl.x + 6, pl.y + pl.h + 6); ctx.lineTo(pl.x + pl.w / 2, pl.y + pl.h + 20); ctx.lineTo(pl.x + pl.w - 6, pl.y + pl.h + 6); ctx.fillStyle = '#2e1517'; ctx.fill();
  }
  function drawSidePass() {
    const W = canvas.width, H = canvas.height;
    ctx.save(); ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#f08a78'; ctx.fillRect(0, 0, W, H);
    drawLayer(passArt.sky, 0.02, 0, 320, 240);
    drawLayer(passArt.back, 0.06, -30, 512, 240);
    drawLayer(passArt.far, 0.12, 10, 320, 240);
    drawLayer(passArt.mid, 0.2, 22, 320, 240);
    drawLayer(passArt.middle, 0.35, 34, 512, 240);
    drawLayer(passArt.near, 0.55, 40, 512, 240);
    // heat haze toward the horizon
    const hz = ctx.createLinearGradient(0, 120, 0, 200);
    hz.addColorStop(0, 'rgba(255,140,90,0)'); hz.addColorStop(1, 'rgba(120,40,40,.35)');
    ctx.fillStyle = hz; ctx.fillRect(0, 120, W, 80);
    ctx.restore();

    ctx.save(); worldShake(); ctx.imageSmoothingEnabled = false;
    if (imgReady(passArt.ground)) {
      const x0 = Math.floor(sideCameraX / 32) * 32;
      for (let x = x0 - 32; x < sideCameraX + W + 32; x += 32) ctx.drawImage(passArt.ground, x, SIDE_GROUND_Y - 4, 32, 56);
    } else { ctx.fillStyle = '#5a2a24'; ctx.fillRect(sideCameraX, SIDE_GROUND_Y, W, 44); }
    sidePlatforms().slice(1).forEach(pl => { if (pl.x < sideCameraX + W && pl.x + pl.w > sideCameraX) drawRockLedge(pl); });
    // charred wagons and bones from the burned caravans
    (platformScene === 'pass' ? [880, 2150, 3420] : []).forEach((x, i) => {
      if (x < sideCameraX - 60 || x > sideCameraX + W + 60) return;
      const g = SIDE_GROUND_Y;
      ctx.fillStyle = '#2a1414'; ctx.fillRect(x - 24, g - 18, 48, 12);
      ctx.fillStyle = '#3d1c18'; ctx.fillRect(x - 22, g - 30, 3, 14); ctx.fillRect(x + 6, g - 34, 3, 18);
      ctx.strokeStyle = '#1a0c0c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x - 14, g - 5, 6, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.arc(x + 14, g - 5, 6, Math.PI * 0.2, Math.PI * 1.7); ctx.stroke();
      ctx.fillStyle = 'rgba(255,120,60,' + (0.35 + Math.sin(time * 4 + i) * 0.2) + ')'; ctx.fillRect(x - 4, g - 20, 3, 2); ctx.fillRect(x + 10, g - 19, 2, 2);
    });
    if (platformScene === 'pass') {
      drawSignpost(70, 'HOLLOW', -1);
      if (story.passBossDefeated) drawSignpost(PASS_SIDE_WIDTH - 70, 'GLOAMHOLD', 1);
      if (story.nickAmbushed) {
        for (let i = 0; i < 18; i++) {
          const x = NICK_TRAIL - 49 + i * 6, y = SIDE_GROUND_Y - 2 - i % 4;
          ctx.fillStyle = i % 3 ? '#75b5d7' : '#d1f4ff'; ctx.fillRect(x, y, 4 + i % 4, 2);
        }
        drawSignpost(NICK_TRAIL, 'FROST TRAIL', 1);
      }
    }
    drawDepthsWorld();
    FIRES.filter(f => f.scene === platformScene).forEach(f => drawCampfire(f.x));
    drawLoreSpots();
    drawWren();
    drawChests();
    drawSideMobs();
    drawSidePlayer();
    if (platformScene === 'pass') drawNickAmbushWorld();
    drawPlayerWaves();
    drawCombatFx();
    drawFortuneFx();
    drawAmbient();
    ctx.restore();
    const vg = ctx.createRadialGradient(160, 120, 110, 160, 120, 230);
    vg.addColorStop(0, 'rgba(40,10,10,0)'); vg.addColorStop(1, 'rgba(40,10,10,.45)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    drawSideOverlays(platformScene === 'pass' ? 'ASHEN PASS' : region().name);
  }
  function drawTownPart(name, x, flip) {
    const r = TOWN_PARTS[name]; if (!imgReady(gloamArt.town)) return;
    ctx.save(); ctx.translate(Math.round(x), SIDE_GROUND_Y - r[3] + 2);
    if (flip) { ctx.scale(-1, 1); ctx.translate(-r[2], 0); }
    ctx.drawImage(gloamArt.town, r[0], r[1], r[2], r[3], 0, 0, r[2], r[3]); ctx.restore();
  }
  function drawSideGloam() {
    const W = canvas.width, H = canvas.height;
    ctx.save(); ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#0b1a1c'; ctx.fillRect(0, 0, W, H);
    drawLayer(gloamArt.sky, 0, 0, 96, 240);
    // the cracked moon behind the clouds, lower now and bruised
    const mx = 70 - sideCameraX * 0.015, my = 46;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const mg = ctx.createRadialGradient(mx, my, 6, mx, my, 60); mg.addColorStop(0, 'rgba(160,220,230,.3)'); mg.addColorStop(1, 'rgba(160,220,230,0)');
    ctx.fillStyle = mg; ctx.fillRect(mx - 60, my - 60, 120, 120); ctx.restore();
    ctx.fillStyle = '#cfe6e2'; ctx.beginPath(); ctx.arc(mx, my, 15, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#0b1a1c'; ctx.beginPath(); ctx.moveTo(mx + 6, my - 15); ctx.lineTo(mx + 2, my - 2); ctx.lineTo(mx + 9, my + 4); ctx.lineTo(mx + 15, my - 3); ctx.fill();
    drawLayer(gloamArt.mountains, 0.05, 16, 96, 224);
    drawLayer(gloamArt.lights, 0.1, 30, 96, 224);
    if (imgReady(gloamArt.clouds)) tileImage(gloamArt.clouds, sideCameraX * 0.15 + time * 4, -40, 288, 224);
    const CS = platformScene === 'gloam' ? CASTLE_START : -400;
    if (sideCameraX < CS + 200) {
      // far poles and the old watchtower
      if (imgReady(gloamArt.far)) {
        const off = sideCameraX * 0.25;
        for (let i = -1; i < 4; i++) {
          const x = i * 160 - (off % 160);
          ctx.drawImage(gloamArt.far, 12, 12, 69, 66, Math.round(x), 120, 69, 66);
          if (i % 2 === 0) ctx.drawImage(gloamArt.far, 289, 14, 21, 64, Math.round(x + 110), 116, 21, 64);
        }
      }
      drawLayer(gloamArt.forest, 0.4, 108, 64, 96);
    }
    ctx.fillStyle = 'rgba(10,30,34,.3)'; ctx.fillRect(0, 0, W, H);
    ctx.restore();

    ctx.save(); worldShake(); ctx.imageSmoothingEnabled = false;
    // Castle quarter: stone hall panels standing behind the walkway.
    const CS2 = platformScene === 'gloam' ? CASTLE_START : -40;
    if (imgReady(gloamArt.castle) && sideCameraX + W > CS2) {
      let x = CS2, i = 0;
      while (x < sideWorldWidth() + 40) {
        const r = CASTLE_PARTS[i % CASTLE_PARTS.length];
        if (x + r[2] > sideCameraX && x < sideCameraX + W) ctx.drawImage(gloamArt.castle, r[0], r[1], r[2], r[3], x, SIDE_GROUND_Y - r[3], r[2], r[3]);
        x += r[2]; i++;
      }
      ctx.fillStyle = '#0a1214';
      if (platformScene === 'gloam' && CASTLE_START + 0 > sideCameraX - 20) { ctx.fillRect(CASTLE_START - 12, SIDE_GROUND_Y - 176, 16, 176); ctx.fillStyle = '#26383a'; ctx.fillRect(CASTLE_START - 10, SIDE_GROUND_Y - 176, 2, 176); }
    }
    // Town houses on the near side of the city.
    if (platformScene === 'gloam' && sideCameraX < CASTLE_START) {
      const plan = [[220, 'small'], [420, 'tall'], [560, 'lamp'], [700, 'row'], [1060, 'lamp'], [1180, 'tall', 1], [1380, 'small', 1], [1560, 'row'], [1900, 'lamp'], [2000, 'tall'], [2140, 'small']];
      plan.forEach(([x, n, f]) => { if (x < sideCameraX + W + 20 && x + 280 > sideCameraX) drawTownPart(n, x, f); });
      // lamp glows over the posts
      plan.filter(p => p[1] === 'lamp').forEach(([x]) => {
        const g = ctx.createRadialGradient(x + 10, SIDE_GROUND_Y - 32, 1, x + 10, SIDE_GROUND_Y - 32, 30);
        g.addColorStop(0, 'rgba(160,230,200,' + (0.25 + Math.sin(time * 3 + x) * 0.06) + ')'); g.addColorStop(1, 'rgba(160,230,200,0)');
        ctx.fillStyle = g; ctx.fillRect(x - 20, SIDE_GROUND_Y - 62, 60, 60);
      });
    }
    // Brick street
    if (imgReady(gloamArt.brick)) {
      const x0 = Math.floor(sideCameraX / 32) * 32;
      for (let x = x0 - 32; x < sideCameraX + W + 32; x += 32) { ctx.drawImage(gloamArt.brick, x, SIDE_GROUND_Y, 32, 32); ctx.drawImage(gloamArt.brick, 0, 8, 32, 24, x, SIDE_GROUND_Y + 32, 32, 24); }
      ctx.fillStyle = 'rgba(8,24,28,.55)'; ctx.fillRect(sideCameraX - 40, SIDE_GROUND_Y, W + 80, 44);
    } else { ctx.fillStyle = '#1d2a2c'; ctx.fillRect(sideCameraX, SIDE_GROUND_Y, W, 44); }
    // shallow black water from the Tide pooling on the street
    for (let x = Math.floor(sideCameraX / 180) * 180; x < sideCameraX + W + 180; x += 180) {
      if ((x / 180) % 3 === 1) { ctx.fillStyle = 'rgba(10,18,30,.8)'; ctx.fillRect(x + 20, SIDE_GROUND_Y, 70, 2); ctx.fillStyle = 'rgba(140,210,220,' + (0.2 + Math.sin(time * 2 + x) * 0.1) + ')'; ctx.fillRect(x + 30 + Math.round(Math.sin(time + x) * 10), SIDE_GROUND_Y, 14, 1); }
    }
    sidePlatforms().slice(1).forEach(pl => {
      if (pl.x > sideCameraX + W || pl.x + pl.w < sideCameraX) return;
      if (imgReady(gloamArt.crate)) for (let x = pl.x; x < pl.x + pl.w; x += 32) ctx.drawImage(gloamArt.crate, 0, 0, Math.min(32, pl.x + pl.w - x), 14, x, pl.y, Math.min(32, pl.x + pl.w - x), 14);
      ctx.fillStyle = 'rgba(8,24,28,.35)'; ctx.fillRect(pl.x, pl.y, pl.w, 14);
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(pl.x + 4, pl.y + 14, pl.w - 8, 3);
    });
    if (platformScene === 'gloam') { drawSignpost(70, 'ASHEN PASS', -1); drawExpansionRoad(); }
    drawDepthsWorld();
    FIRES.filter(f => f.scene === platformScene).forEach(f => drawCampfire(f.x));
    drawLoreSpots();
    drawWren();
    drawChests();
    drawSideMobs();
    drawSidePlayer();
    drawPlayerWaves();
    drawCombatFx();
    drawFortuneFx();
    drawAmbient();
    ctx.restore();
    const px = sidePlayer.x - sideCameraX, py = sidePlayer.y - 24;
    const dk = ctx.createRadialGradient(px, py, 40, px, py, 230);
    dk.addColorStop(0, 'rgba(2,8,10,0)'); dk.addColorStop(1, 'rgba(2,8,10,.4)');
    ctx.fillStyle = dk; ctx.fillRect(0, 0, W, H);
    drawSideOverlays(platformScene === 'gloam' ? 'GLOAMHOLD' : region().name);
  }

  // ---- Ambient particles (world space) ----
  const ambient = [];
  function updateAmbient(dt) {
    const W = canvas.width, s = (REGIONS[platformScene] && REGIONS[platformScene].ambient) || platformScene;
    const want = s === 'gloam' ? 70 : s === 'pass' ? 36 : 26;
    while (ambient.length < want) {
      const x = sideCameraX + Math.random() * (W + 80) - 40;
      if (s === 'gloam') ambient.push({ k: 'rain', x, y: Math.random() * 200 - 40, vx: -30, vy: 260 + Math.random() * 80, life: 9 });
      else if (s === 'pass') ambient.push({ k: 'ember', x, y: 200 + Math.random() * 40, vx: 8 + Math.random() * 14, vy: -14 - Math.random() * 20, life: 4 + Math.random() * 4, ph: Math.random() * 6 });
      else if (s === 'hollow') ambient.push({ k: 'mote', x, y: 60 + Math.random() * 130, vx: (Math.random() - 0.5) * 6, vy: -4 - Math.random() * 4, life: 3 + Math.random() * 4, ph: Math.random() * 6 });
      else ambient.push({ k: Math.random() < 0.55 ? 'fly' : 'leaf', x, y: Math.random() < 0.5 ? 120 + Math.random() * 70 : -10, vx: 6 + Math.random() * 8, vy: 10 + Math.random() * 8, life: 6 + Math.random() * 5, ph: Math.random() * 6 });
      ambient[ambient.length - 1].s = s;
    }
    for (let i = ambient.length - 1; i >= 0; i--) {
      const p = ambient[i];
      p.life -= dt;
      if (p.k === 'fly') { p.x += Math.sin(time * 1.3 + p.ph) * 12 * dt; p.y += Math.cos(time * 1.1 + p.ph) * 8 * dt; }
      else if (p.k === 'leaf') { p.x += (p.vx + Math.sin(time * 2 + p.ph) * 14) * dt; p.y += p.vy * dt; }
      else { p.x += p.vx * dt + (p.k === 'ember' ? Math.sin(time * 3 + p.ph) * 10 * dt : 0); p.y += p.vy * dt; }
      if (p.k === 'rain' && p.y > SIDE_GROUND_Y) { if (Math.random() < 0.3) combatFx.push({ kind: 'spark', x: p.x, y: SIDE_GROUND_Y - 1, vx: (Math.random() - 0.5) * 30, vy: -30, life: 0.15, color: '#9fd6e0' }); p.life = 0; }
      if (p.life <= 0 || p.s !== s || p.x < sideCameraX - 100 || p.x > sideCameraX + W + 100 || p.y > SIDE_GROUND_Y + 10) ambient.splice(i, 1);
    }
  }
  function drawAmbient() {
    ambient.forEach(p => {
      const x = Math.round(p.x), y = Math.round(p.y);
      if (p.k === 'rain') { ctx.fillStyle = 'rgba(150,200,215,.35)'; ctx.fillRect(x, y, 1, 5); }
      else if (p.k === 'ember') { const a = Math.min(1, p.life / 2) * (0.6 + Math.sin(time * 9 + p.ph) * 0.3); ctx.fillStyle = 'rgba(255,' + (120 + Math.round(Math.sin(p.ph) * 60)) + ',60,' + a + ')'; ctx.fillRect(x, y, 1 + (p.ph > 4 ? 1 : 0), 1); }
      else if (p.k === 'mote') { const a = Math.min(1, p.life) * 0.5; ctx.fillStyle = 'rgba(200,170,255,' + a + ')'; ctx.fillRect(x, y, 1, 1); }
      else if (p.k === 'fly') { const a = 0.4 + Math.sin(time * 5 + p.ph) * 0.4; ctx.fillStyle = 'rgba(230,255,140,' + Math.max(0, a) + ')'; ctx.fillRect(x, y, 1, 1); ctx.fillStyle = 'rgba(230,255,140,' + Math.max(0, a) * 0.25 + ')'; ctx.fillRect(x - 1, y - 1, 3, 3); }
      else { ctx.fillStyle = (p.ph > 3 ? '#b8732e' : '#8a9a3a'); ctx.fillRect(x, y, 2, 1); ctx.fillRect(x + (Math.sin(time * 4 + p.ph) > 0 ? 1 : 0), y + 1, 1, 1); }
    });
  }
  function drawWatchSeal() {
    if (!sceneVisible(WATCH_SEAL_X, 58)) return;
    const x = WATCH_SEAL_X, y = SIDE_GROUND_Y, repaired = story.dadFound;
    if (imgReady(sceneryArt.pillars)) {
      ctx.drawImage(sceneryArt.pillars, x - 58, y - 68, 116, 68);
    }
    tideShape('#282438', [x - 30,y],[x - 25,y - 48],[x - 12,y - 67],[x + 11,y - 67],[x + 25,y - 48],[x + 30,y]);
    tideShape('#5f5b76', [x - 25,y - 5],[x - 20,y - 46],[x - 10,y - 61],[x + 10,y - 61],[x + 20,y - 46],[x + 25,y - 5]);
    tideShape('#343248', [x - 19,y - 5],[x - 15,y - 43],[x - 8,y - 55],[x + 8,y - 55],[x + 15,y - 43],[x + 19,y - 5]);
    const grain = repaired ? '#bac7df' : '#d7a7e2';
    tidePixel(grain, x - 1, y - 36, 2, 18);
    tideShape(grain, [x,y - 27],[x - 10,y - 34],[x - 9,y - 26],[x,y - 20],[x + 9,y - 26],[x + 10,y - 34]);
    tidePixel(grain, x - 6, y - 18, 12, 1);
    if (!repaired) {
      tideShape('#171326', [x + 9,y - 60],[x + 3,y - 46],[x + 11,y - 41],[x + 6,y - 27],[x + 15,y - 40],[x + 7,y - 47]);
      if (dad) drawFoundry('hex-sigil', x, y - 31, time, .55, 1, .46, true);
    }
    if (dad && !story.dadFound && !dialogue) {
      ctx.fillStyle = '#1a1427'; ctx.fillRect(x - 25, y - 83, 50, 11);
      invText('WATCH SEAL', x, y - 75, '#dfd7ea', 'bold 7px monospace', 'center');
    }
  }
  function drawSideHollow() {
    const W = canvas.width, H = canvas.height;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#05030a'; ctx.fillRect(0, 0, W, H);
    if (imgReady(hollowArt.back)) tileImage(hollowArt.back, sideCameraX * 0.1, 0, 352, 240);
    // stars and the cursed moon
    for (let i = 0; i < 40; i++) {
      const sx = (i * 97 - sideCameraX * 0.05) % W, sy = (i * 41) % 90;
      ctx.fillStyle = 'rgba(220,210,255,' + (0.3 + 0.3 * Math.sin(time * 2 + i)) + ')';
      ctx.fillRect(Math.round((sx + W) % W), sy, 1, 1);
    }
    const mx = 238 - sideCameraX * 0.03, my = 44;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const mg = ctx.createRadialGradient(mx, my, 10, mx, my, 70);
    mg.addColorStop(0, 'rgba(190,150,255,.35)'); mg.addColorStop(1, 'rgba(120,60,200,0)');
    ctx.fillStyle = mg; ctx.fillRect(mx - 70, my - 70, 140, 140); ctx.restore();
    ctx.fillStyle = '#e6dcff'; ctx.beginPath(); ctx.arc(mx, my, 22, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c9b8f0'; [[-8, -6, 6], [6, 4, 4], [-2, 10, 3], [10, -9, 2.5]].forEach(([a, b, r]) => { ctx.beginPath(); ctx.arc(mx + a, my + b, r, 0, Math.PI * 2); ctx.fill(); });
    // a crack in the moon where the shard broke away
    ctx.fillStyle = '#05030a'; ctx.beginPath(); ctx.moveTo(mx + 14, my + 12); ctx.lineTo(mx + 22, my + 4); ctx.lineTo(mx + 20, my + 16); ctx.fill();
    ctx.fillStyle = '#7a4cc0'; ctx.fillRect(Math.round(mx + 15), Math.round(my + 10), 2, 2);
    if (imgReady(hollowArt.middle)) tileImage(hollowArt.middle, sideCameraX * 0.4, 0, 352, 240);
    ctx.fillStyle = 'rgba(40,10,70,.25)'; ctx.fillRect(0, 0, W, H);
    ctx.restore();

    ctx.save();
    const shakeX = screenShake > 0 ? Math.round((Math.random() - 0.5) * screenShake * 2) : 0;
    const shakeY = screenShake > 0 ? Math.round((Math.random() - 0.5) * screenShake * 1.4) : 0;
    ctx.translate(-Math.round(sideCameraX) + shakeX, shakeY);
    ctx.imageSmoothingEnabled = false;
    // Ground strip (its solid top sits 18px below the image top).
    if (imgReady(hollowArt.ground)) {
      const x0 = Math.floor(sideCameraX / 128) * 128;
      for (let x = x0 - 128; x < sideCameraX + W + 128; x += 128) ctx.drawImage(hollowArt.ground, x, SIDE_GROUND_Y - 18, 128, 96);
    } else { ctx.fillStyle = '#1a1424'; ctx.fillRect(sideCameraX, SIDE_GROUND_Y, W, 44); }
    // Log platforms built from the log tile's caps and middle.
    sidePlatforms().slice(1).forEach(pl => {
      if (pl.x > sideCameraX + W || pl.x + pl.w < sideCameraX) return;
      if (!imgReady(hollowArt.log)) { ctx.fillStyle = '#4a2c1a'; ctx.fillRect(pl.x, pl.y, pl.w, pl.h); return; }
      const top = pl.y - 7;
      ctx.drawImage(hollowArt.log, 0, 0, 40, 40, pl.x - 6, top, 40, 40);
      for (let x = pl.x + 34; x < pl.x + pl.w - 34; x += 32) ctx.drawImage(hollowArt.log, 80, 0, Math.min(32, pl.x + pl.w - 34 - x), 40, x, top, Math.min(32, pl.x + pl.w - 34 - x), 40);
      ctx.drawImage(hollowArt.log, 152, 0, 40, 40, pl.x + pl.w - 34, top, 40, 40);
    });
    // Entrance arch back to the forest and the King's throne in the arena.
    if (platformScene === 'hollow') { drawSignpost(70, 'FOREST', -1); drawWatchSeal(); drawThrone(3128); }
    drawDepthsWorld();
    drawLoreSpots();
    drawDad();
    if (platformScene === 'hollow' && story.ch2Started) drawSignpost(HOLLOW_SIDE_WIDTH - 34, 'ASHEN PASS', 1);
    drawChests();
    drawSideMobs();
    drawSidePlayer();
    drawPlayerWaves();
    drawCombatFx();
    drawFortuneFx();
    drawAmbient();
    // Low mist drifting in front.
    hollowMist.forEach(m => {
      const x = ((m.x + time * 8 * m.s) % (HOLLOW_SIDE_WIDTH + 200)) - 100;
      if (x < sideCameraX - 80 || x > sideCameraX + W + 80) return;
      const g = ctx.createRadialGradient(x, m.y + 20, 2, x, m.y + 20, 60);
      g.addColorStop(0, 'rgba(150,130,200,.16)'); g.addColorStop(1, 'rgba(150,130,200,0)');
      ctx.fillStyle = g; ctx.fillRect(x - 60, m.y - 40, 120, 120);
    });
    // Wisps
    for (let i = 0; i < 10; i++) {
      const wx = (i * 331 + Math.sin(time * 0.6 + i) * 30) % HOLLOW_SIDE_WIDTH, wy = 90 + Math.sin(time * 1.3 + i * 2) * 25 + (i % 3) * 18;
      if (wx < sideCameraX - 10 || wx > sideCameraX + W + 10) continue;
      ctx.fillStyle = 'rgba(140,230,255,' + (0.4 + Math.sin(time * 5 + i) * 0.3) + ')'; ctx.fillRect(Math.round(wx), Math.round(wy), 2, 2);
      ctx.fillStyle = 'rgba(140,230,255,.15)'; ctx.fillRect(Math.round(wx) - 1, Math.round(wy) - 1, 4, 4);
    }
    ctx.restore();
    // Darkness with a pool of light around the knight.
    const px = sidePlayer.x - sideCameraX, py = sidePlayer.y - 24;
    const dk = ctx.createRadialGradient(px, py, 30, px, py, 210);
    dk.addColorStop(0, 'rgba(5,2,12,0)'); dk.addColorStop(1, 'rgba(5,2,12,.62)');
    ctx.fillStyle = dk; ctx.fillRect(0, 0, W, H);
    drawSideOverlays(platformScene === 'hollow' ? 'THE HOLLOW' : region().name);
  }
  // Grukk's throne: a stepped stone dais, a tall cracked seat built from
  // slabs and bones, horned skull crest, torn banners and twin braziers.
  function drawThrone(x) {
    const gy = SIDE_GROUND_Y, R = (c, X, Y, w, h) => { ctx.fillStyle = c; ctx.fillRect(Math.round(X), Math.round(Y), w, h); };
    const glow = (X, Y, r, col, a) => {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(X, Y, 1, X, Y, r);
      g.addColorStop(0, 'rgba(' + col + ',' + a + ')'); g.addColorStop(1, 'rgba(' + col + ',0)');
      ctx.fillStyle = g; ctx.fillRect(X - r, Y - r, r * 2, r * 2); ctx.restore();
    };
    // Purple light pooled behind the seat.
    glow(x, gy - 70, 90, '120,70,200', 0.16 + Math.sin(time * 1.7) * 0.04);
    // Dais: three worn steps.
    [[62, 0], [52, 6], [42, 12]].forEach(([hw, o], i) => {
      R('#17111d', x - hw - 1, gy - 6 - o, hw * 2 + 2, 7);
      R(i === 2 ? '#4a3d52' : '#3d3245', x - hw, gy - 6 - o, hw * 2, 6);
      R('#5d4f66', x - hw, gy - 6 - o, hw * 2, 1);
      for (let k = -hw + 9; k < hw; k += 17) R('#2a2131', x + k + i * 3, gy - 5 - o, 1, 5);
    });
    R('#2a1f30', x - 64, gy - 1, 128, 2);
    const base = gy - 18;
    // Back slab with a pointed crown.
    ctx.fillStyle = '#1b1420';
    ctx.beginPath(); ctx.moveTo(x - 25, base); ctx.lineTo(x - 25, base - 62); ctx.lineTo(x - 15, base - 74); ctx.lineTo(x, base - 84); ctx.lineTo(x + 15, base - 74); ctx.lineTo(x + 25, base - 62); ctx.lineTo(x + 25, base); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#3b2f42';
    ctx.beginPath(); ctx.moveTo(x - 23, base); ctx.lineTo(x - 23, base - 61); ctx.lineTo(x - 14, base - 72); ctx.lineTo(x, base - 81); ctx.lineTo(x + 14, base - 72); ctx.lineTo(x + 23, base - 61); ctx.lineTo(x + 23, base); ctx.closePath(); ctx.fill();
    // Inner panel and carved runes.
    R('#271e2d', x - 15, base - 64, 30, 46);
    R('#33283a', x - 13, base - 62, 26, 42);
    const rp = 0.35 + Math.sin(time * 2.4) * 0.25;
    ctx.fillStyle = 'rgba(190,140,255,' + rp + ')';
    [[-8, -56], [6, -50], [-6, -42], [7, -36], [-7, -30]].forEach(([dx, dy], i) => { ctx.fillRect(x + dx, base + dy, 2, 1); ctx.fillRect(x + dx + (i % 2 ? -1 : 1), base + dy + 1, 1, 2); });
    // Cracks.
    ctx.strokeStyle = '#1a1220'; ctx.lineWidth = 1; ctx.beginPath();
    ctx.moveTo(x + 18, base - 58); ctx.lineTo(x + 14, base - 48); ctx.lineTo(x + 17, base - 40); ctx.lineTo(x + 13, base - 30);
    ctx.moveTo(x - 20, base - 20); ctx.lineTo(x - 16, base - 28); ctx.lineTo(x - 19, base - 34); ctx.stroke();
    // Bone pillars on the sides.
    [-1, 1].forEach(d => {
      const px = x + d * 29;
      R('#120d16', px - 4, base - 70, 8, 70);
      for (let yy = base - 68; yy < base; yy += 7) { R('#cbbf9f', px - 3, yy, 6, 5); R('#e8dfc4', px - 3, yy, 6, 1); R('#8f8268', px - 3, yy + 4, 6, 1); R('#6e624f', px + (d > 0 ? 2 : -3), yy + 1, 1, 3); }
      // Horn sweeping up from each pillar top.
      ctx.fillStyle = '#d9cfb3';
      ctx.beginPath(); ctx.moveTo(px - 3, base - 70); ctx.quadraticCurveTo(px + d * 12, base - 80, px + d * 6, base - 98); ctx.quadraticCurveTo(px + d * 4, base - 82, px + 3, base - 70); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#9d9076';
      ctx.beginPath(); ctx.moveTo(px + 1, base - 70); ctx.quadraticCurveTo(px + d * 8, base - 80, px + d * 6, base - 98); ctx.quadraticCurveTo(px + d * 5, base - 82, px + 3, base - 70); ctx.closePath(); ctx.fill();
      // Armrest skull.
      const sx = x + d * 22;
      R('#1a1220', sx - 6, base - 23, 12, 11);
      R('#ddd3b8', sx - 5, base - 22, 10, 7); R('#ddd3b8', sx - 3, base - 15, 6, 3);
      R('#1a1220', sx - 3, base - 20, 2, 3); R('#1a1220', sx + 1, base - 20, 2, 3);
      R('#1a1220', sx - 2, base - 14, 1, 2); R('#1a1220', sx, base - 14, 1, 2);
      ctx.fillStyle = 'rgba(190,120,255,' + (0.5 + Math.sin(time * 3 + d) * 0.3) + ')'; ctx.fillRect(sx - 3, base - 19, 1, 1); ctx.fillRect(sx + 2, base - 19, 1, 1);
    });
    // Seat with a stone lip and a fur throw.
    R('#17111d', x - 27, base - 15, 54, 16);
    R('#4b3e54', x - 26, base - 14, 52, 5);
    R('#5f5168', x - 26, base - 14, 52, 1);
    R('#352a3c', x - 24, base - 9, 48, 9);
    ctx.fillStyle = '#5a3b2a';
    ctx.beginPath(); ctx.moveTo(x - 14, base - 14); ctx.lineTo(x + 14, base - 14); ctx.lineTo(x + 12, base - 2); ctx.lineTo(x + 8, base + 1); ctx.lineTo(x + 3, base - 3); ctx.lineTo(x - 2, base + 2); ctx.lineTo(x - 7, base - 2); ctx.lineTo(x - 12, base + 1); ctx.closePath(); ctx.fill();
    R('#7a5338', x - 14, base - 14, 28, 2);
    // Crest: horned skull with a glowing gem at the crown.
    const cy = base - 72;
    R('#120d16', x - 8, cy - 1, 16, 14);
    R('#e3d9be', x - 7, cy, 14, 9); R('#e3d9be', x - 4, cy + 9, 8, 3);
    R('#b4a88c', x - 7, cy + 7, 14, 2);
    R('#1a1220', x - 5, cy + 3, 3, 3); R('#1a1220', x + 2, cy + 3, 3, 3); R('#1a1220', x - 1, cy + 6, 2, 2);
    [-1, 1].forEach(d => { ctx.fillStyle = '#cfc4a6'; ctx.beginPath(); ctx.moveTo(x + d * 6, cy + 2); ctx.quadraticCurveTo(x + d * 16, cy - 2, x + d * 14, cy - 12); ctx.quadraticCurveTo(x + d * 12, cy - 3, x + d * 5, cy + 5); ctx.closePath(); ctx.fill(); });
    const eg = 0.6 + Math.sin(time * 3) * 0.35;
    ctx.fillStyle = 'rgba(200,120,255,' + eg + ')'; ctx.fillRect(x - 4, cy + 4, 1, 1); ctx.fillRect(x + 3, cy + 4, 1, 1);
    R('#2b1840', x - 3, cy - 8, 6, 6); R('#9a5cff', x - 2, cy - 7, 4, 4); R('#e4c8ff', x - 1, cy - 7, 1, 1);
    glow(x, cy - 5, 18, '170,110,255', 0.35 + Math.sin(time * 3) * 0.15);
    // Torn banners hanging from the horns.
    [-1, 1].forEach(d => {
      const bx = x + d * 40, top = base - 66, sway = Math.sin(time * 1.3 + d) * 1.5;
      R('#2b2230', bx - 7, top - 2, 14, 2);
      ctx.fillStyle = '#4d1d38';
      ctx.beginPath(); ctx.moveTo(bx - 6, top); ctx.lineTo(bx + 6, top); ctx.lineTo(bx + 6 + sway, top + 34); ctx.lineTo(bx + 3 + sway, top + 30); ctx.lineTo(bx + sway, top + 38); ctx.lineTo(bx - 3 + sway, top + 31); ctx.lineTo(bx - 6 + sway, top + 35); ctx.closePath(); ctx.fill();
      R('#6d2a4e', bx - 6, top, 2, 30); R('#c9a35b', bx - 1, top + 8, 2, 2); R('#c9a35b', bx - 3, top + 12, 6, 1); R('#c9a35b', bx - 1, top + 14, 2, 6);
    });
    // Scattered bones and skulls on the steps.
    [[-48, -1], [44, -1], [-34, -7], [36, -13]].forEach(([dx, dy], i) => {
      if (i % 2) { R('#cfc4a6', x + dx - 4, gy + dy - 2, 8, 2); R('#e6ddc4', x + dx - 5, gy + dy - 3, 2, 3); R('#e6ddc4', x + dx + 3, gy + dy - 3, 2, 3); }
      else { R('#d7cdb2', x + dx - 3, gy + dy - 5, 6, 5); R('#1a1220', x + dx - 2, gy + dy - 4, 1, 2); R('#1a1220', x + dx + 1, gy + dy - 4, 1, 2); }
    });
    // Twin braziers with purple fire.
    [-1, 1].forEach(d => {
      const fx = x + d * 58, fy = gy - 24;
      R('#120d16', fx - 2, fy, 4, 24); R('#3a3040', fx - 1, fy, 2, 24);
      R('#120d16', fx - 7, fy - 5, 14, 6); R('#4a3d52', fx - 6, fy - 4, 12, 4); R('#6a5a72', fx - 6, fy - 4, 12, 1);
      R('#2a2131', fx - 5, gy - 2, 10, 2);
      glow(fx, fy - 10, 34, '170,100,255', 0.4 + Math.sin(time * 9 + d) * 0.08);
      for (let k = 0; k < 4; k++) {
        const ph = time * 7 + k * 1.7 + d, h = 7 + Math.sin(ph) * 3 + (k === 1 ? 4 : 0);
        ctx.fillStyle = k === 1 ? 'rgba(240,220,255,.9)' : 'rgba(170,100,255,.85)';
        ctx.beginPath(); ctx.moveTo(fx - 5 + k * 3, fy - 4); ctx.quadraticCurveTo(fx - 4 + k * 3 + Math.sin(ph * 1.3) * 2, fy - 4 - h * 0.6, fx - 3.5 + k * 3 + Math.sin(ph) * 1.5, fy - 4 - h); ctx.quadraticCurveTo(fx - 2 + k * 3, fy - 4 - h * 0.4, fx - 2 + k * 3, fy - 4); ctx.closePath(); ctx.fill();
      }
      for (let k = 0; k < 3; k++) { const e = (time * 0.8 + k * 0.33 + (d > 0 ? 0.5 : 0)) % 1; ctx.fillStyle = 'rgba(210,170,255,' + (1 - e) + ')'; ctx.fillRect(Math.round(fx + Math.sin(e * 9 + k) * 4), Math.round(fy - 10 - e * 26), 1, 1); }
    });
  }

  // Shared screen-space overlays for the outdoor scenes.
  function drawSideOverlays(label) {
    if (nickScene || moonVisit) return;
    drawDepthsGrade();
    if (bossFight && bossFight.cine) { drawBossCine(); return; }
    const W = canvas.width;
    if (!region().peaceful) drawBloodMoonOverlay();
    if (sidePlayer.deadTime > 0 && sidePlayer.deadTime < 0.7) {
      ctx.fillStyle = 'rgba(0,0,0,' + (1 - sidePlayer.deadTime / 0.7) + ')'; ctx.fillRect(0, 0, W, canvas.height);
    }
    if (time >= restFlash && time - restFlash < 1.2) { ctx.fillStyle = 'rgba(255,190,100,' + (0.3 * (1 - (time - restFlash) / 1.2)) + ')'; ctx.fillRect(0, 0, W, canvas.height); }
    if (stats.health > 0 && stats.health <= stats.maxHealth * 0.25) {
      const pulse = 0.18 + Math.sin(time * 6) * 0.08;
      const vg = ctx.createRadialGradient(160, 120, 90, 160, 120, 200);
      vg.addColorStop(0, 'rgba(160,0,0,0)'); vg.addColorStop(1, 'rgba(160,0,0,' + pulse + ')');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, canvas.height);
    }
    const boss = bossFight && (bossFight.active || bossFight.intro) && theBoss();
    if (!boss) {
      ctx.fillStyle = 'rgba(10,10,18,.72)'; ctx.fillRect(218, 4, 98, 17);
      ctx.fillStyle = '#f5e6c8'; ctx.font = '7px monospace'; ctx.textAlign = 'right';
      ctx.fillText(label, 311, 15);
    }
    ctx.fillStyle = 'rgba(8,9,16,.72)'; ctx.fillRect(0, 226, W, 14);
    ctx.fillStyle = '#f0e5ce'; ctx.font = '7px monospace'; ctx.textAlign = 'left';
    ctx.font = '6px monospace';
    ctx.fillText(inputMode === 'touch' ? (region().peaceful ? 'D-PAD MOVE    USE INTERACT    BAG JOURNAL' : 'D-PAD MOVE    JUMP    HOLD ATK TO CHARGE    ROLL DODGE')
      : region().peaceful ? (inputMode === 'pad' ? 'STICK MOVE   ✕ JUMP / INTERACT   △ JOURNAL' : 'A/D MOVE   SPACE JUMP   E INTERACT   I JOURNAL')
      : inputMode === 'pad' ? '✕ JUMP  □ ATTACK (HOLD = MOONBLADE)  ↑+□ UPPER  ↓+□ AIR POGO  ○ ROLL  △ BAG' : 'SPACE JUMP  J ATTACK (HOLD=MOONBLADE)  U UPPER  S+J AIR POGO  K ROLL  I BAG', 4, 235);
    if (time < flashUntil) { ctx.fillStyle = 'rgba(190,230,255,' + Math.min(0.5, (flashUntil - time) * 3) + ')'; ctx.fillRect(0, 0, W, canvas.height); }
    if (time - fadeIn < 0.8) { ctx.fillStyle = 'rgba(0,0,0,' + (1 - (time - fadeIn) / 0.8) + ')'; ctx.fillRect(0, 0, W, canvas.height); }
    const near = !dialogue && !panel && nearbyInteraction();
    if (near) {
      const text = '[ ' + K('E') + ' ] ' + near.label;
      ctx.font = 'bold 7px monospace';
      const w = Math.ceil(ctx.measureText(text).width) + 14;
      const x = Math.round(clamp(sidePlayer.x - sideCameraX - w / 2, 4, W - w - 4));
      const y = 150 + Math.round(Math.sin(time * 4) * 1);
      ctx.fillStyle = 'rgba(15,12,24,.94)'; ctx.fillRect(x, y, w, 13);
      ctx.strokeStyle = '#f4d27b'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, 12);
      ctx.fillStyle = '#fff0bd'; ctx.textAlign = 'center'; ctx.fillText(text, x + w / 2, y + 9);
    }
    if (boss) {
      const bw = 200, bx = 60, by = 214; // bottom of the screen, clear of the HUD
      ctx.fillStyle = 'rgba(8,6,12,.85)'; ctx.fillRect(bx - 4, by - 10, bw + 8, 20);
      invText(boss.T.name.toUpperCase(), 160, by - 2, boss.enraged ? '#ff7a6a' : '#f3e7c9', 'bold 6px monospace', 'center');
      ctx.fillStyle = '#0d0a10'; ctx.fillRect(bx - 1, by + 1, bw + 2, 6);
      ctx.fillStyle = '#3a1018'; ctx.fillRect(bx, by + 2, bw, 4);
      const hpw = Math.round(bw * boss.hp / boss.maxHp);
      ctx.fillStyle = boss.enraged ? '#ff4a3a' : '#c8324a'; ctx.fillRect(bx, by + 2, hpw, 4);
      ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fillRect(bx, by + 2, hpw, 1);
      ctx.fillStyle = '#d6b477'; ctx.fillRect(bx + bw / 2, by + 1, 1, 6);
    }
    if (sceneTitle) {
      const t = time - sceneTitle.t;
      if (t > 3.2) sceneTitle = null;
      else {
        const a = t < 0.5 ? t / 0.5 : t > 2.6 ? (3.2 - t) / 0.6 : 1;
        ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(0, 62, W, 40);
        ctx.font = 'bold 15px monospace'; ctx.fillStyle = '#1a0e1a'; ctx.fillText(sceneTitle.text, 161, 84);
        ctx.fillStyle = region().color; ctx.fillText(sceneTitle.text, 160, 83);
        ctx.font = '7px monospace'; ctx.fillStyle = '#d9cdb8'; ctx.fillText(sceneTitle.sub, 160, 95);
        ctx.restore();
      }
    }
  }

  function drawSideHUD() {
    ctx.fillStyle = 'rgba(9,10,20,.8)'; ctx.fillRect(4, 4, 136, 33);
    ctx.fillStyle = '#d6b477'; ctx.fillRect(4, 4, 136, 1); ctx.fillRect(4, 36, 136, 1);
    ctx.fillStyle = levelUpUntil > time && Math.floor(time * 8) % 2 ? '#fff1c4' : '#d6b477'; ctx.fillRect(7, 8, 21, 25);
    ctx.fillStyle = '#2a1a12'; ctx.font = 'bold 6px monospace'; ctx.textAlign = 'center';
    ctx.fillText('LV', 17.5, 16); ctx.font = 'bold 9px monospace'; ctx.fillText(String(stats.level), 17.5, 28);
    ctx.textAlign = 'left'; ctx.font = '6px monospace'; ctx.fillStyle = '#f0a29a'; ctx.fillText('HP', 32, 14);
    drawBar(43, 9, 70, 7, stats.health, stats.maxHealth, stats.health <= stats.maxHealth * 0.25 ? '#ff7a3c' : '#e2584f');
    ctx.fillStyle = '#f7e9c7'; ctx.fillText(stats.health + '/' + stats.maxHealth, 116, 15);
    ctx.fillStyle = '#a6e39a'; ctx.fillText('SP', 32, 24);
    drawBar(43, 19, 70, 6, stats.stamina, stats.maxStamina, '#71b86c');
    ctx.fillStyle = '#3b2e14'; ctx.fillRect(43, 28, 70, 3);
    ctx.fillStyle = '#f2c14e'; ctx.fillRect(43, 28, Math.round(70 * clamp((stats.xp || 0) / xpForNext(stats.level), 0, 1)), 3);
    ctx.fillStyle = '#f2d38a'; ctx.fillText('XP', 32, 32);
    ctx.fillStyle = '#f2c14e'; ctx.fillRect(117, 27, 5, 5); ctx.fillStyle = '#fff1a8'; ctx.fillRect(118, 28, 1, 2);
    ctx.fillStyle = '#ffe3a1'; ctx.fillText(String(inventory.coins || 0), 124, 32);
    if (outdoorScene()) {
      ctx.fillStyle = 'rgba(9,10,20,.8)'; ctx.fillRect(142, 4, 22, 22);
      ctx.fillStyle = '#d6b477'; ctx.fillRect(142, 4, 22, 1); ctx.fillRect(142, 25, 22, 1);
      const q = quickSlot && inventory[quickSlot] > 0 ? quickSlot : null;
      if (q) {
        drawItemIcon(ITEM_DEFS[q].icon, 147, 9, 1);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 5px monospace'; ctx.textAlign = 'right'; ctx.fillText(String(inventory[q]), 163, 24);
      } else { ctx.fillStyle = '#4a4050'; ctx.fillRect(149, 11, 8, 8); }
      ctx.fillStyle = '#ffe3a1'; ctx.font = 'bold 5px monospace'; ctx.textAlign = 'left'; ctx.fillText(inputMode === 'pad' ? 'TP' : inputMode === 'touch' ? 'ITEM' : 'H', 144, 10);
      if (time - invUseFlash < 0.3) { ctx.fillStyle = 'rgba(155,227,122,.5)'; ctx.fillRect(142, 4, 22, 22); }
      ctx.textAlign = 'left'; ctx.font = '6px monospace';
      drawFortuneHUD();
      drawDepthsHUD();
    }
    if (comboTimer > 0 || (sidePlayer.atk && sidePlayer.atk.name !== 'slash1')) {
      const step = sidePlayer.atk ? ({ slash1: 1, slash2: 2, finisher: 3, thrust: 1, air: 1 })[sidePlayer.atk.name] : ({ slash1: 1, slash2: 2 })[lastMove] || 0;
      if (step >= 2) { ctx.fillStyle = '#ffe3a1'; ctx.font = 'bold 8px monospace'; ctx.textAlign = 'left'; ctx.fillText(step + ' HIT' + (step === 3 ? '!' : ''), 8, 48); }
      const nm = sidePlayer.atk && sidePlayer.atk.name;
      if (nm === 'upper' || nm === 'power') { ctx.fillStyle = nm === 'power' ? '#8fd8ff' : '#ffe3a1'; ctx.font = 'bold 8px monospace'; ctx.textAlign = 'left'; ctx.fillText(nm === 'power' ? 'MOONBLADE' : 'UPPER SLASH', 8, 58); }
    }
    if (levelUpUntil > time) {
      const a = Math.min(1, (levelUpUntil - time) / 0.5);
      ctx.globalAlpha = a; ctx.textAlign = 'center';
      ctx.font = 'bold 14px monospace'; ctx.fillStyle = '#2a1a12'; ctx.fillText('LEVEL UP', 161, 71);
      ctx.fillStyle = '#ffe3a1'; ctx.fillText('LEVEL UP', 160, 70);
      ctx.font = '7px monospace'; ctx.fillStyle = '#f7e9c7'; ctx.fillText('NEXT BLESSING: LV ' + nextMilestone(stats.level), 160, 82);
      ctx.globalAlpha = 1;
    }
    if (notice && time < noticeUntil && !dialogue) {
      ctx.fillStyle = 'rgba(12,10,20,.9)';
      ctx.fillRect(48, 205, 224, 17);
      ctx.strokeStyle = '#d9b56b'; ctx.strokeRect(48.5, 205.5, 223, 16);
      ctx.fillStyle = '#fff0c8'; ctx.textAlign = 'center'; ctx.font = '7px monospace';
      ctx.fillText(notice, 160, 216);
    }
    drawDialogue();
  }

  function drawPlatformer() {
    const art = (REGIONS[platformScene] && REGIONS[platformScene].art) || platformScene;
    if (platformScene === 'house') drawSideInterior();
    else if (art === 'hollow') drawSideHollow();
    else if (art === 'pass') drawSidePass();
    else if (art === 'gloam') drawSideGloam();
    else if (art === 'frost') drawFrostglass();
    else if (art === 'seam') drawCinderSeam();
    else if (EXPANSION_MAPS[platformScene]) drawExpandedRegion();
    else if (region().tide) drawTide();
    else if (region().peaceful) drawCoast();
    else drawSideForest();
    if (moonVisit) { drawMoonVisit(); return; }
    if (nickScene) {
      drawNickAmbushFrame();
      if (nickScene.awake && nickScene.t > NICK_WAKE + .75) drawSideHUD();
      return;
    }
    if (!(bossFight && bossFight.cine)) drawSideHUD();
    drawPanel();
    if (armorTutorialPending) drawArmorInventoryPrompt();
    if (paused) drawPauseMenu();
  }

  function drawArmorInventoryPrompt() {
    ctx.fillStyle = 'rgba(6,8,16,.72)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#211a27'; ctx.fillRect(37, 77, 246, 86);
    ctx.strokeStyle = '#d9b56b'; ctx.lineWidth = 2; ctx.strokeRect(38, 78, 244, 84);
    ctx.textAlign = 'center'; ctx.fillStyle = '#ffe6b2'; ctx.font = 'bold 12px monospace';
    ctx.fillText('NEW OBJECTIVE', 160, 98);
    ctx.fillStyle = '#fff4d8'; ctx.font = '9px monospace';
    ctx.fillText('Press the INVENTORY button', 160, 119);
    ctx.fillText('to check your quest.', 160, 133);
    ctx.fillStyle = '#b8c9aa'; ctx.font = '7px monospace';
    ctx.fillText(inputMode === 'pad' ? 'PRESS △ TRIANGLE' : 'I / BAG', 160, 150);
  }

  function startArmorQuestFromInventory() {
    armorTutorialPending = false;
    armorQuestActive = !equipment.armor;
    openPanel('inventory', 3);
    sidePlayer.vx = 0; sidePlayer.moving = false;
    if (onSave) onSave(getSaveData());
  }

  function closeCurrentPanel() {
    const wasDadNote = panel === 'dad-note';
    if (panel === 'inventory') sfx('uiClose');
    panel = null; invMenu = null; invInspect = null;
    if (wasDadNote && dadNoteRead && !equipment.armor && !armorQuestActive) {
      armorTutorialPending = true;
    }
    if (onSave) onSave(getSaveData());
  }

  function interactPlatformer() {
    if (platformScene === 'house') {
      const nearDadObjects = Math.abs(sidePlayer.y - 164) < 58;
      const noteDistance = Math.hypot(sidePlayer.x - 144, sidePlayer.y - 164);
      const armorDistance = Math.hypot(sidePlayer.x - 181, sidePlayer.y - 164);
      if (nearDadObjects && Math.min(noteDistance, armorDistance) < 43 && noteDistance <= armorDistance) {
        panel = 'dad-note'; sfx('bookOpen');
        dadNoteRead = true;
        if (onSave) onSave(getSaveData());
        return;
      }
      if (nearDadObjects && armorDistance < 43) {
        if (!equipment.armor) {
          const completingArmorQuest = armorQuestActive || dadNoteRead;
          equipment.armor = true; sfx('armor'); setTimeout(() => sfx('belt'), 260); setTimeout(() => sfx('draw'), 560);
          armorQuestActive = false;
          armorTutorialPending = false;
          notice = completingArmorQuest ? 'Quest complete! Dad\'s armor equipped.' : "You equipped Dad's armor.";
          noticeUntil = time + 2.5;
          if (onSave) onSave(getSaveData());
        } else {
          notice = "Dad's armor is already equipped.";
          noticeUntil = time + 2;
        }
        return;
      }
      if (Math.abs(sidePlayer.x - 930) < 58) {
        if (!equipment.armor) { notice = "Dad said to take his armor first."; noticeUntil = time + 2.4; return; }
        platformScene = 'forest';
        insideHouse = false;
        sidePlayer.x = 72; sidePlayer.y = SIDE_GROUND_Y;
        sidePlayer.vx = 0; sidePlayer.vy = 0; sidePlayer.onGround = true;
        sideCameraX = 0;
        notice = 'The forest path begins here.';
        noticeUntil = time + 2.5;
        return;
      }
      notice = 'Nothing nearby to interact with.';
      noticeUntil = time + 1.8;
      return;
    }

    const near = nearbyInteraction();
    if (near && near.act === 'home') {
      platformScene = 'house';
      insideHouse = true;
      // Come back in through the front door at the bottom of the hallway.
      interiorPlayer.x = ENTRY_SPAWN.x; interiorPlayer.y = ENTRY_SPAWN.y;
      interiorPlayer.facing = ENTRY_SPAWN.facing; interiorPlayer.moving = false; interiorPlayer.walk = 0;
      keys.clear(); sideJumpQueued = false;
      sidePlayer.x = 880; sidePlayer.y = SIDE_GROUND_Y;
      sidePlayer.vx = 0; sidePlayer.vy = 0; sidePlayer.onGround = true;
      sideCameraX = Math.max(0, HOUSE_SIDE_WIDTH - canvas.width);
      notice = 'You return home.';
      noticeUntil = time + 2;
      sfx('doorClose');
      if (onSave) onSave(getSaveData());
    } else if (near) {
      near.act();
    } else {
      notice = region().peaceful ? 'Nothing nearby to interact with.' : platformScene === 'hollow' ? 'Only cold mist here.' : 'The path continues through the trees.';
      noticeUntil = time + 1.6;
    }
  }

  function update(dt) {
    updateMusic(dt);
    if (paused) return;
    if (introActive) {
      if (document.hidden) return;
      introTime += dt;
      if (introTime >= BOOK_OPEN_AT) {
        const page = introBookPage(introTime);
        if (page !== introBookCue) {
          introBookCue = page;
          if (page < 6) sfx(page === 0 ? 'bookOpen' : 'bookFlip', page === 0 ? .62 : .46);
        }
      }
      const countryTime = introTime - INTRO_LORE_LENGTH;
      if (countryTime >= 17.2 && !introWolfHowlOne) { introWolfHowlOne = true; introWolfHowlAudioOne.pause(); introWolfHowlAudioOne.currentTime = 0; }
      // This recording is an environmental howl from beyond the visible wolves, not from the wolf on the right.
      if (countryTime >= 21.4 && !introWolfHowlTwo) { introWolfHowlTwo = true; playIntroWolfAudio(introWolfHowlAudioTwo, .18, .92); }
      if (introTime >= INTRO_DURATION) finishIntro();
      return;
    }
    if (platformMode && outdoorScene()) { updatePlatformer(dt); return; }
    time += dt;
    saveTimer += dt;
    if (saveTimer >= 5) {
      saveTimer = 0;
      if (onSave) onSave(getSaveData());
    }
    if (battle) { updateBattle(dt); return; }
    if (insideHouse) {
      stats.playTime += dt;
      sideJumpQueued = false;
      updatePerkPanel();
      if (!armorTutorialPending) maybeOpenPerks();
      if (armorTutorialPending || panel) { interiorPlayer.moving = false; return; }
      let ix = 0, iy = 0;
      if (keys.has('arrowleft') || keys.has('a')) ix -= 1;
      if (keys.has('arrowright') || keys.has('d')) ix += 1;
      if (keys.has('arrowup') || keys.has('w')) iy -= 1;
      if (keys.has('arrowdown') || keys.has('s')) iy += 1;
      if (ix && iy) { ix *= Math.SQRT1_2; iy *= Math.SQRT1_2; }
      if (ix || iy) interiorPlayer.facing = iy < 0 ? 'up' : iy > 0 ? 'down' : ix < 0 ? 'left' : 'right';
      if (ix) interiorPlayer.hf = ix < 0 ? -1 : 1;
      const speed = keys.has('shift') ? 66 : 46;
      const oldX = interiorPlayer.x, oldY = interiorPlayer.y;
      const nx = oldX + ix * speed * dt;
      const ny = oldY + iy * speed * dt;
      // Resolve each axis separately so hallways stay open and the player can slide along furniture.
      if (!interiorBlocked(nx, oldY)) interiorPlayer.x = nx;
      if (!interiorBlocked(interiorPlayer.x, ny)) interiorPlayer.y = ny;
      interiorPlayer.moving = Math.abs(interiorPlayer.x - oldX) > 0.01 || Math.abs(interiorPlayer.y - oldY) > 0.01;
      if (interiorPlayer.moving) {
        const before = Math.floor(interiorPlayer.walk / 2.5);
        interiorPlayer.walk += dt * (keys.has('shift') ? 15 : 10);
        if (Math.floor(interiorPlayer.walk / 2.5) !== before) sfx('stepWood', 0.7);
      }
      return;
    }
    stats.playTime += dt;
    const wasNight = isNight();
    worldClock = (worldClock + dt / DAY_LENGTH) % 1;
    if (wasNight && !isNight()) { wolves.length=0; wolfSpawned=false; notice='Sunrise! The wolves have retreated.'; noticeUntil=time+2.5; }
    updateWolves(dt);

    // Nearby rabbits bolt away from the player, then settle down.
    bunnies.forEach(b => {
      const dx = b.x - player.x;
      const dy = b.y - player.y;
      const distance = Math.hypot(dx, dy);
      if (distance < 64 && b.flee <= 0) {
        const safeDistance = Math.max(1, distance);
        b.vx = dx / safeDistance * 86;
        b.vy = dy / safeDistance * 86;
        if (distance < 2) { b.vx = 60; b.vy = -60; }
        b.flee = 2.2;
      }
      if (b.flee > 0) {
        b.flee = Math.max(0, b.flee - dt);
        b.hop += dt * 13;
        const nx = b.x + b.vx * dt;
        const ny = b.y + b.vy * dt;
        if (!blocked(nx, b.y)) b.x = nx; else b.vx *= -0.55;
        if (!blocked(b.x, ny)) b.y = ny; else b.vy *= -0.55;
        b.x = clamp(b.x, TILE, (MAP_W - 2) * TILE);
        b.y = clamp(b.y, TILE, (MAP_H - 2) * TILE);
        if (b.flee === 0) { b.vx = 0; b.vy = 0; }
      }
    });

    let dx = 0, dy = 0;
    if (!panel) {
      if (keys.has('arrowleft') || keys.has('a')) dx -= 1;
      if (keys.has('arrowright') || keys.has('d')) dx += 1;
      if (keys.has('arrowup') || keys.has('w')) dy -= 1;
      if (keys.has('arrowdown') || keys.has('s')) dy += 1;
    }

    player.moving = dx !== 0 || dy !== 0;
    if (dx && dy) { dx *= Math.SQRT1_2; dy *= Math.SQRT1_2; }
    if (dy < 0) player.facing = 'up';
    else if (dy > 0) player.facing = 'down';
    else if (dx < 0) player.facing = 'left';
    else if (dx > 0) player.facing = 'right';

    const sprinting = player.moving && keys.has('shift') && stats.stamina > 0;
    const speed = sprinting ? 94 : SPEED;
    const oldX = player.x, oldY = player.y;
    const step = speed * dt;
    if (dx) {
      const nx = player.x + dx * step;
      if (!blocked(nx, player.y)) player.x = nx;
    }
    if (dy) {
      const ny = player.y + dy * step;
      if (!blocked(player.x, ny)) player.y = ny;
    }
    if (player.moving) player.walk += dt * (sprinting ? 15 : 10);

    const traveled = Math.hypot(player.x - oldX, player.y - oldY);
    stepDistance += traveled;
    while (stepDistance >= 20) { stats.steps++; stepDistance -= 20; }

    if (sprinting && traveled > 0) stats.stamina = Math.max(0, stats.stamina - 24 * dt);
    else stats.stamina = Math.min(stats.maxStamina, stats.stamina + 11 * dt);

    const maxCamX = Math.max(0, MAP_W * TILE - canvas.width);
    const maxCamY = Math.max(0, MAP_H * TILE - canvas.height);
    camX = Math.round(clamp(player.x + 8 - canvas.width / 2, 0, maxCamX));
    camY = Math.round(clamp(player.y + 8 - canvas.height / 2, 0, maxCamY));
  }

  function drawBar(x, y, w, h, value, max, fill) {
    ctx.fillStyle = '#17131d'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = fill; ctx.fillRect(x + 1, y + 1, Math.max(0, (w - 2) * value / max), h - 2);
    ctx.strokeStyle = '#d9c8a2'; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  }

  function drawPanel() {
    if (!panel) return;
    if (panel === 'stats') { panel = 'inventory'; invTab = 2; }
    if (panel === 'inventory') { drawInventoryScreen(); return; }
    if (panel === 'shop') { drawShop(); return; }
    if (panel === 'chapter') { drawChapterPanel(); return; }
    if (panel === 'perk') { drawPerkPanel(); return; }
    if (panel === 'relic') { drawRelicReveal(); return; }
    if (panel === 'wheel') { drawWheel(); return; }
    if (panel === 'peddler') { drawPeddlerPanel(); return; }
    if (panel === 'tide') { drawTidePanel(); return; }
    ctx.fillStyle = 'rgba(10, 12, 22, 0.94)';
    ctx.fillRect(43, 37, 234, 164);
    ctx.strokeStyle = '#d9b56b'; ctx.lineWidth = 2;
    ctx.strokeRect(44, 38, 232, 162);
    ctx.fillStyle = '#f5dca6'; ctx.textAlign = 'center';
    ctx.font = 'bold 13px monospace';
    const panelTitle = panel === 'inventory' ? 'INVENTORY' : panel === 'dad-note' ? 'A NOTE FROM DAD' : 'PLAYER STATS';
    ctx.fillText(panelTitle, 160, 57);
    ctx.font = '8px monospace';
    ctx.fillStyle = '#b9b1a5';
    ctx.fillText(inputMode === 'pad' ? (panel === 'inventory' ? 'Press △, ✕, or ○ to close' : panel === 'stats' ? 'Press TOUCHPAD, ✕, or ○ to close' : 'Press ✕ or ○ to close') : (panel === 'inventory' ? 'Press I, E, or ESC to close' : panel === 'stats' ? 'Press C, E, or ESC to close' : 'Press E, ENTER, or ESC to close'), 160, 190);

    if (panel === 'dad-note') {
      if (!drawPaper('dialogue', 66, 65, 188, 104)) {
        ctx.fillStyle = '#eadbb3'; ctx.fillRect(69, 72, 182, 92);
        ctx.strokeStyle = '#c79b5d'; ctx.lineWidth = 1;
        ctx.strokeRect(69.5, 72.5, 181, 91);
      }
      ctx.fillStyle = '#45332e'; ctx.textAlign = 'center'; ctx.font = 'bold 10px monospace';
      ctx.fillText('Son, meet me at the', 160, 96);
      ctx.fillText('other side of the forest.', 160, 116);
      ctx.fillText('Take my armor and', 160, 136);
      ctx.fillText('weapon.', 160, 151);
      ctx.fillStyle = '#8b6a48'; ctx.font = '7px monospace';
      ctx.fillText('- Dad', 224, 157);
    } else if (panel === 'inventory') {
      ctx.fillStyle = '#242333'; ctx.fillRect(55, 72, 78, 87);
      ctx.strokeStyle = '#76657a'; ctx.strokeRect(55.5, 72.5, 77, 86);
      drawInventoryCharacterPreview();
      ctx.fillStyle = '#f3e7c9'; ctx.font = 'bold 7px monospace'; ctx.textAlign = 'center';
      ctx.fillText(equipment.armor ? 'KNIGHT ARMOR' : 'ROWAN', 94, 153);

      ctx.fillStyle = '#242333'; ctx.fillRect(140, 72, 123, 87);
      ctx.strokeStyle = '#76657a'; ctx.strokeRect(140.5, 72.5, 122, 86);
      ctx.fillStyle = '#f5dca6'; ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center';
      ctx.fillText('EQUIPMENT', 201, 84);
      const slots = [
        { label: 'HEAD', value: equipment.armor ? 'STEEL HELM' : 'EMPTY' },
        { label: 'BODY', value: equipment.armor ? "DAD'S ARMOR" : 'EMPTY' },
        { label: 'LEGS', value: equipment.armor ? 'GREAVES' : 'EMPTY' },
        { label: 'WEAPON', value: equipment.armor ? 'KNIGHT SWORD' : 'EMPTY' }
      ];
      slots.forEach((slot, i) => {
        const y = 88 + i * 16;
        ctx.fillStyle = '#332f40'; ctx.fillRect(147, y, 109, 13);
        ctx.strokeStyle = '#5e536e'; ctx.strokeRect(147.5, y + 0.5, 108, 12);
        ctx.textAlign = 'left'; ctx.font = '7px monospace'; ctx.fillStyle = '#b9b1a5';
        ctx.fillText(slot.label, 153, y + 9);
        ctx.textAlign = 'right'; ctx.font = '7px monospace';
        ctx.fillStyle = equipment.armor ? '#c5d0d3' : '#a79eaa';
        ctx.fillText(slot.value, 250, y + 9);
      });
      ctx.fillStyle = '#f3e7c9'; ctx.font = '7px monospace'; ctx.textAlign = 'center';
      ctx.fillText('BERRIES x' + inventory.berries + '   WOOD x' + inventory.wood + '   FISH x' + inventory.fish, 160, 174);
      ctx.fillStyle = '#a9c8a0'; ctx.font = '7px monospace';
      ctx.fillText(equipment.armor ? 'Dad’s display stand remains in his room.' : 'Find Dad’s armor stand in his room to equip it.', 160, 184);
    } else {
      ctx.textAlign = 'left';
      ctx.font = '9px monospace';
      ctx.fillStyle = '#f1e5c8';
      ctx.fillText('LEVEL', 64, 78);
      ctx.fillText('HEALTH', 64, 99);
      ctx.fillText('STAMINA', 64, 120);
      ctx.fillText('STRENGTH', 64, 143);
      ctx.fillText('DEFENSE', 174, 78);
      ctx.fillText('STEPS', 174, 99);
      ctx.fillText('PLAY TIME', 174, 120);
      ctx.textAlign = 'right'; ctx.fillStyle = '#f5dca6';
      ctx.fillText(String(stats.level), 145, 78);
      ctx.fillText(stats.health + '/' + stats.maxHealth, 145, 99);
      ctx.fillText(Math.round(stats.stamina) + '/' + stats.maxStamina, 145, 120);
      ctx.fillText(String(stats.strength), 145, 143);
      ctx.textAlign = 'right';
      ctx.fillText(String(stats.defense), 252, 78);
      ctx.fillText(String(stats.steps), 252, 99);
      const mins = Math.floor(stats.playTime / 60);
      const secs = Math.floor(stats.playTime % 60);
      ctx.fillText(mins + ':' + String(secs).padStart(2, '0'), 252, 120);
    }
  }

  // ---------------------------------------------------------------------------
  // Full-screen inventory: ITEMS / GEAR / STATS / QUEST tabs.
  // ---------------------------------------------------------------------------
  function ownedItems() { return ITEM_ORDER.filter(k => (inventory[k] || 0) > 0); }

  function openPanel(name, tab) {
    if (name === 'stats') { panel = 'inventory'; invTab = 2; }
    else if (name === 'inventory') { panel = 'inventory'; if (typeof tab === 'number') invTab = tab; invMenu = null; invInspect = null; sfx('uiOpen'); }
    else panel = name;
    invOpenTime = time;
    mapFeedback = '';
    keys.clear();
    sidePlayer.atk = null; sideAttackQueued = false;
  }
  function togglePanel(name) {
    const wantTab = name === 'stats' ? 2 : null;
    if (panel === 'inventory' && (wantTab === null || invTab === wantTab)) { closeCurrentPanel(); return; }
    openPanel(name, wantTab === null ? invTab : wantTab);
  }

  // Item action menu (USE / EQUIP / QUICK SLOT / INSPECT / DROP) and inspect view.
  let invMenu = null;      // { key, opts, sel, t }
  let invInspect = null;   // { key, t }
  let invSwing = -10, invUseFlash = -10, invShake = -10;
  let loreSel = 0;
  function itemOptions(key) {
    const def = ITEM_DEFS[key], opts = [];
    if (def.heal) opts.push('USE');
    if (def.type === 'WEAPON') opts.push(equipment.weapon === key ? 'UNEQUIP' : 'EQUIP');
    if (def.heal) opts.push(quickSlot === key ? 'CLEAR QUICK' : 'SET QUICK');
    opts.push('INSPECT');
    if (def.type !== 'KEY ITEM' && !def.bound) opts.push('DROP');
    opts.push('CANCEL');
    return opts;
  }
  function consumeItem(key, fromQuick) {
    const def = ITEM_DEFS[key];
    if (!def || !(inventory[key] > 0)) { sfx('uiError'); notice = 'Nothing in your quick slot.'; noticeUntil = time + 1.4; return false; }
    if (!def.heal) { notice = def.name + ' cannot be used right now.'; noticeUntil = time + 1.6; sfx('uiError'); invShake = time; return false; }
    if (!def.meal && stats.health >= stats.maxHealth) { notice = 'You are already at full health.'; noticeUntil = time + 1.6; sfx('uiError'); invShake = time; return false; }
    const before = stats.health;
    stats.health = Math.min(stats.maxHealth, stats.health + def.heal);
    if (def.heal >= 999) stats.stamina = stats.maxStamina;
    inventory[key]--;
    if (def.meal) { tide.meal = key; tide.mealTime = 90; }
    notice = def.meal ? def.name + ': ' + def.meal + ' for 90s' : 'Used ' + def.name + ' (+' + (stats.health - before) + ' HP)'; noticeUntil = time + 1.8;
    invUseFlash = time;
    sfx(key === 'tonic' ? 'use' : 'eat'); padRumble(0.1, 0.3, 80);
    if (fromQuick) {
      addDamageNumber(sidePlayer.x, sidePlayer.y - 56, '+' + (stats.health - before), '#9be37a');
      for (let i = 0; i < 8; i++) combatFx.push({ kind: 'spark', x: sidePlayer.x + (Math.random() - 0.5) * 16, y: sidePlayer.y - 10 - Math.random() * 30, vx: 0, vy: -40 - Math.random() * 30, life: 0.6, max: 0.6, color: '#9be37a' });
    }
    const left = ownedItems();
    if (invSel >= left.length) invSel = Math.max(0, left.length - 1);
    if (onSave) onSave(getSaveData());
    return true;
  }
  function useQuickSlot() {
    if (panel || dialogue) return;
    if (!quickSlot || !(inventory[quickSlot] > 0)) {
      const fallback = ['berries', 'bread', 'fish', 'tonic', 'chowder', 'skewer'].find(k => inventory[k] > 0);
      if (!fallback) { notice = 'No food or tonics left.'; noticeUntil = time + 1.4; sfx('uiError'); return; }
      quickSlot = fallback;
    }
    if (consumeItem(quickSlot, true) !== false && platformMode && outdoorScene() && sidePlayer.onGround && !sidePlayer.atk && !sidePlayer.roll) sidePlayer.drink = { t: 0 };
  }
  function useSelectedItem() {
    // Opens the action menu for the highlighted item (ITEMS tab) or acts on
    // the highlighted slot in the other tabs.
    if (invTab === 0) {
      const key = ownedItems()[invSel];
      if (!key) { sfx('uiError'); return; }
      newItems.delete(key);
      invMenu = { key, opts: itemOptions(key), sel: 0, t: time };
      sfx('uiOpen');
    } else if (invTab === 1) {
      if (gearSel === 3) toggleWeapon();
      else { sfx('uiError'); invShake = time; }
    } else if (invTab === 4) {
      const entry = LORE[loreSel];
      if (entry && story.pages.includes(entry.id)) { sfx('bookFlip'); invInspect = { lore: entry.id, t: time }; }
      else sfx('uiError');
    } else if (invTab === 5) mapConfirm();
    else if (invTab === 6) toggleRelic();
    else sfx('uiError');
  }
  function toggleWeapon() {
    if (!equipment.armor) { sfx('uiError'); return; }
    const own = ownedWeapons();
    if (own.length < 2) { notice = 'You only have the Knight Sword.'; noticeUntil = time + 1.6; sfx('uiError'); invShake = time; return; }
    equipment.weapon = own[(own.indexOf(currentWeapon()) + 1) % own.length];
    sfx('draw'); invSwing = time;
    notice = WEAPONS[equipment.weapon].name + ' equipped.'; noticeUntil = time + 1.6;
    if (onSave) onSave(getSaveData());
  }
  function runItemOption(opt) {
    const key = invMenu.key, def = ITEM_DEFS[key];
    invMenu = null;
    if (opt === 'USE') consumeItem(key, false);
    else if (opt === 'EQUIP') { if (!equipment.armor) sfx('uiError'); else { equipment.weapon = key; sfx('draw'); invSwing = time; notice = def.name + ' equipped.'; noticeUntil = time + 1.6; if (onSave) onSave(getSaveData()); } }
    else if (opt === 'UNEQUIP') { equipment.weapon = 'sword'; sfx('draw'); notice = 'Knight Sword equipped.'; noticeUntil = time + 1.6; }
    else if (opt === 'SET QUICK') { quickSlot = key; sfx('uiConfirm'); notice = def.name + ' set to quick slot.'; noticeUntil = time + 1.6; }
    else if (opt === 'CLEAR QUICK') { quickSlot = null; sfx('uiBack'); }
    else if (opt === 'INSPECT') { invInspect = { key, t: time }; sfx('bookOpen'); }
    else if (opt === 'DROP') {
      if (WEAPONS[key] && equipment.weapon === key && inventory[key] <= 1) equipment.weapon = 'sword';
      inventory[key] = Math.max(0, inventory[key] - 1);
      sfx('cloth'); notice = 'Dropped 1 ' + def.name + '.'; noticeUntil = time + 1.4;
      const left = ownedItems(); if (invSel >= left.length) invSel = Math.max(0, left.length - 1);
      if (onSave) onSave(getSaveData());
    } else sfx('uiBack');
  }

  function inventoryNavigate(dx, dy) {
    if (invInspect) return;
    if (invMenu) { invMenu.sel = (invMenu.sel + dy + dx + invMenu.opts.length) % invMenu.opts.length; sfx('uiMove'); return; }
    if (invTab === 0) {
      const count = Math.max(1, ownedItems().length);
      const cols = 6;
      let col = invSel % cols, row = Math.floor(invSel / cols);
      col = clamp(col + dx, 0, cols - 1); row = clamp(row + dy, 0, Math.max(0, Math.ceil(count / cols) - 1));
      const next = row * cols + col;
      invSel = Math.min(next, count - 1);
      const key = ownedItems()[invSel]; if (key) newItems.delete(key);
    } else if (invTab === 1) {
      gearSel = clamp(gearSel + dy + dx, 0, 3);
    } else if (invTab === 4) {
      loreSel = clamp(loreSel + dy + dx, 0, LORE.length - 1);
    } else if (invTab === 5) {
      mapSel = clamp(mapSel + dy + dx, 0, Math.max(0, mapFires().length - 1));
    } else if (invTab === 6) {
      relicSel = clamp(relicSel + dx + dy * RELIC_COLS, 0, RELIC_ORDER.length - 1);
    } else return;
    sfx('uiMove');
  }
  function inventoryTab(step) {
    if (invInspect || invMenu) return;
    invTab = (invTab + step + INV_TABS.length) % INV_TABS.length;
    sfx('uiTab');
  }
  function inventoryBack() {
    if (invInspect) { invInspect = null; sfx('bookClose'); return; }
    if (invMenu) { invMenu = null; sfx('uiBack'); return; }
    closeCurrentPanel();
  }
  function inventoryConfirm() {
    if (invInspect) { invInspect = null; sfx('bookClose'); return; }
    if (invMenu) { runItemOption(invMenu.opts[invMenu.sel]); return; }
    useSelectedItem();
  }

  // Returns true when the key was consumed by the open inventory.
  function inventoryKey(k) {
    if (k === 'arrowleft' || k === 'a') inventoryNavigate(-1, 0);
    else if (k === 'arrowright' || k === 'd') inventoryNavigate(1, 0);
    else if (k === 'arrowup' || k === 'w') inventoryNavigate(0, -1);
    else if (k === 'arrowdown' || k === 's') inventoryNavigate(0, 1);
    else if (k === 'q') inventoryTab(-1);
    else if (k === 'r' || k === 'tab') inventoryTab(1);
    else if (k === 'e' || k === 'enter' || k === ' ') inventoryConfirm();
    else if (k === 'backspace' || k === 'x') inventoryBack();
    else if (k === 'j' || k === 'k' || k === 'f') { if (equipment.armor) { invSwing = time; sfx('swing'); } }
    else if (k === 'i') { invMenu = null; invInspect = null; closeCurrentPanel(); }
    else if (k === 'c') { if (invTab === 2) closeCurrentPanel(); else { invTab = 2; sfx('uiTab'); } }
    return true;
  }

  // Mouse / touch on the canvas: tabs, item slots, menu options, dialogue.
  function canvasPoint(e) {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * canvas.width / r.width, y: (e.clientY - r.top) * canvas.height / r.height };
  }
  function onCanvasPointer(e) {
    if (introActive) { finishIntro(); e.preventDefault(); return; }
    if (nickScene) { e.preventDefault(); return; }
    if (moonVisit) { if (dialogue) advanceDialogue(); e.preventDefault(); return; }
    const p = canvasPoint(e);
    const inside = (x, y, w, h) => p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + h;
    if (paused) {
      const row = Math.floor((p.y - PAUSE_ROW_Y) / PAUSE_ROW_H);
      if (row >= 0 && row < PAUSE_COUNT && inside(78, PAUSE_ROW_Y + row * PAUSE_ROW_H, 164, PAUSE_ROW_H - 1)) {
        pauseSelection = row; choosePauseOption(); e.preventDefault();
      }
      return;
    }
    if (dialogue) { advanceDialogue(); e.preventDefault(); return; }
    if (panel === 'tide') { tidePointer(p); e.preventDefault(); return; }
    if (panel === 'chapter') {
      if (time - invOpenTime > 1.5 && p.y >= 210) { panel = null; sfx('uiConfirm'); if (onSave) onSave(getSaveData()); }
      e.preventDefault(); return;
    }
    if (!panel && platformMode && outdoorScene() && nearbyInteraction() && p.y >= 144 && p.y < 172) {
      interactPlatformer(); e.preventDefault(); return;
    }
    if (fortunePanel()) { fortunePointer(p); e.preventDefault(); return; }
    if (panel === 'shop') {
      shopStock().forEach((it, i) => { if (inside(66, 74 + i * 18, 188, 16)) { if (shopSel === i) buyShopItem(i); else { shopSel = i; sfx('uiMove'); } } });
      e.preventDefault(); return;
    }
    if (panel === 'dad-note' && inside(43, 37, 234, 164)) { closeCurrentPanel(); e.preventDefault(); return; }
    if (armorTutorialPending && inside(50, 80, 220, 80)) { startArmorQuestFromInventory(); e.preventDefault(); return; }
    if (panel !== 'inventory') return;
    e.preventDefault();
    if (invInspect) { invInspect = null; sfx('bookClose'); return; }
    if (invMenu) {
      const m = invMenuRect();
      const i = Math.floor((p.y - m.y - 4) / 12);
      if (inside(m.x, m.y, m.w, m.h) && i >= 0 && i < invMenu.opts.length) { invMenu.sel = i; runItemOption(invMenu.opts[i]); }
      else { invMenu = null; sfx('uiBack'); }
      return;
    }
    for (let i = 0; i < INV_TABS.length; i++) {
      if (inside(INV_TAB_X0 + i * (INV_TAB_W + 2), 17, INV_TAB_W, 17)) { if (invTab !== i) { invTab = i; sfx('uiTab'); } return; }
    }
    if (invTab === 0) {
      const items = ownedItems();
      const off = itemOffset();
      for (let j = 0; j < 18 && j + off < items.length; j++) {
        const r = itemSlotRect(j), i = j + off;
        if (inside(r.x, r.y, r.w, r.h)) { if (invSel === i) useSelectedItem(); else { invSel = i; newItems.delete(items[i]); sfx('uiMove'); } return; }
      }
    } else if (invTab === 1) {
      for (let i = 0; i < 4; i++) if (inside(120, 42 + i * 33, 182, 30)) { if (gearSel === i) useSelectedItem(); else { gearSel = i; sfx('uiMove'); } return; }
    } else if (invTab === 4) {
      const off = loreOffset();
      for (let j = 0; j < LORE_ROWS; j++) { const i = j + off; if (i < LORE.length && inside(120, 42 + j * 12, 182, 11)) { if (loreSel === i) useSelectedItem(); else { loreSel = i; sfx('uiMove'); } return; } }
    } else if (invTab === 5) {
      const fl = mapFires();
      const off = mapFireOffset();
      if (fl.length > MAP_FIRE_ROWS && inside(188, 153, 39, 13)) {
        const step = p.x < 208 ? -MAP_FIRE_ROWS : MAP_FIRE_ROWS;
        mapSel = clamp(off + step, 0, fl.length - 1); sfx('uiMove'); return;
      }
      for (let j = 0; j < MAP_FIRE_ROWS && off + j < fl.length; j++) {
        if (!inside(120, 166 + j * 8, 182, 8)) continue;
        const i = off + j;
        if (mapSel === i) mapConfirm(); else { mapSel = i; sfx('uiMove'); }
        return;
      }
    } else if (invTab === 6) {
      for (let i = 0; i < RELIC_ORDER.length; i++) { const r = relicSlotRect(i); if (inside(r.x, r.y, r.w, r.h)) { if (relicSel === i) toggleRelic(); else { relicSel = i; sfx('uiMove'); } return; } }
    }
    if (inside(18, 17, 92, 130) && equipment.armor) { invSwing = time; sfx('swing'); }
  }

  function invBox(x, y, w, h, fill = '#1d1824', edge = '#5a4a3e') {
    ctx.fillStyle = '#0d0a10'; ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    ctx.fillStyle = fill; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = edge; ctx.fillRect(x, y, w, 1); ctx.fillRect(x, y, 1, h);
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(x, y + h - 1, w, 1); ctx.fillRect(x + w - 1, y, 1, h);
  }
  function invBar(x, y, w, h, value, max, color, dark) {
    ctx.fillStyle = '#0d0a10'; ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    ctx.fillStyle = dark; ctx.fillRect(x, y, w, h);
    const fw = Math.round(w * clamp(value / Math.max(1, max), 0, 1));
    ctx.fillStyle = color; ctx.fillRect(x, y, fw, h);
    ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.fillRect(x, y, fw, 1);
  }
  function invText(text, x, y, color = '#f3e7c9', font = '7px monospace', align = 'left') {
    ctx.font = font; ctx.textAlign = align;
    ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillText(text, x + 1, y + 1);
    ctx.fillStyle = color; ctx.fillText(text, x, y);
  }
  function invCursor(x, y, w, h) {
    const p = Math.floor(time * 4) % 2;
    ctx.strokeStyle = p ? '#ffe9a6' : '#f2c14e'; ctx.lineWidth = 1;
    ctx.strokeRect(x - 1.5, y - 1.5, w + 3, h + 3);
    ctx.fillStyle = '#ffe9a6';
    const o = 2 + p;
    [[x - o, y - o], [x + w + o - 3, y - o], [x - o, y + h + o - 3], [x + w + o - 3, y + h + o - 3]].forEach(([cx, cy], i) => {
      ctx.fillRect(cx, cy + (i < 2 ? 0 : 2), 3, 1);
      ctx.fillRect(cx + (i % 2 ? 2 : 0), cy, 1, 3);
    });
  }

  function drawInventoryCharacterPreview(cx, baseY) {
    ctx.save();
    // Spotlight and pedestal.
    const g = ctx.createRadialGradient(cx, baseY - 40, 4, cx, baseY - 40, 52);
    g.addColorStop(0, 'rgba(255,214,140,.22)'); g.addColorStop(1, 'rgba(255,214,140,0)');
    ctx.fillStyle = g; ctx.fillRect(cx - 50, baseY - 96, 100, 100);
    ctx.fillStyle = '#3a2d2a'; ctx.fillRect(cx - 26, baseY, 52, 5);
    ctx.fillStyle = '#5c463a'; ctx.fillRect(cx - 24, baseY, 48, 2);
    ctx.fillStyle = '#251c1c'; ctx.fillRect(cx - 22, baseY + 5, 44, 3);
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(cx - 14, baseY - 1, 28, 2);
    ctx.imageSmoothingEnabled = false;
    const swingT = time - invSwing;
    if (equipment.armor && swingT < 0.42 && imgReady(knightSprites.attacks)) {
      // Practice swing: frames 15-22 (the finisher) of Attacks.png, clipped to the hero card.
      const f = 15 + Math.min(7, Math.floor(swingT * 19)), col = f % 8, row = Math.floor(f / 8);
      ctx.beginPath(); ctx.rect(19, 40, 90, 108); ctx.clip();
      ctx.drawImage(knightSprites.attacks, col * 128 + 24, row * 64 + 16, 96, 48, cx + 4 - 80, baseY - 96, 192, 96);
    } else if (knightSprites.idle && knightSprites.idle.complete && knightSprites.idle.naturalWidth && equipment.armor) {
      // 2x crop of the knight's body from the idle cell.
      const f = Math.floor(time * 6) % 8, col = f % 2, row = Math.floor(f / 2);
      ctx.drawImage(knightSprites.idle, col * 128 + 44, row * 64 + 16, 40, 48, cx - 40 + 4, baseY - 96, 80, 96);
    } else if (playerSheetReady) {
      const f = Math.floor(time * 2) % 2;
      ctx.drawImage(playerSheet, f * 32, 0, 32, 32, cx - 48, baseY - 92, 96, 96);
    } else {
      ctx.fillStyle = '#342c39'; ctx.fillRect(cx - 14, baseY - 60, 28, 60);
      ctx.fillStyle = '#e0b27a'; ctx.fillRect(cx - 11, baseY - 78, 22, 18);
    }
    ctx.restore();
  }

  function drawInventoryScreen() {
    const W = canvas.width, H = canvas.height;
    ctx.save();
    ctx.fillStyle = 'rgba(4,5,10,.86)'; ctx.fillRect(0, 0, W, H);
    // Outer frame: dark wood with gold trim.
    ctx.fillStyle = '#2b1d18'; ctx.fillRect(6, 6, W - 12, H - 12);
    ctx.fillStyle = '#4a3328'; ctx.fillRect(8, 8, W - 16, H - 16);
    for (let x = 12; x < W - 12; x += 9) { ctx.fillStyle = '#3d2a21'; ctx.fillRect(x, 9, 4, 1); ctx.fillRect(x + 3, H - 10, 4, 1); }
    ctx.fillStyle = '#d6b477'; ctx.fillRect(11, 11, W - 22, 1); ctx.fillRect(11, H - 12, W - 22, 1);
    ctx.fillRect(11, 11, 1, H - 22); ctx.fillRect(W - 12, 11, 1, H - 22);
    drawPaper('panel', 5, 5, W - 10, H - 10);
    ctx.fillStyle = '#151119'; ctx.fillRect(13, 13, W - 26, H - 26);
    // Gold corner studs.
    [[9, 9], [W - 14, 9], [9, H - 14], [W - 14, H - 14]].forEach(([x, y]) => {
      ctx.fillStyle = '#7a5a22'; ctx.fillRect(x, y, 5, 5);
      ctx.fillStyle = '#f2d38a'; ctx.fillRect(x + 1, y + 1, 3, 3);
      ctx.fillStyle = '#fff1c4'; ctx.fillRect(x + 1, y + 1, 1, 1);
    });

    // Tabs.
    const tabW = INV_TAB_W, tabX0 = INV_TAB_X0;
    INV_TABS.forEach((name, i) => {
      const x = tabX0 + i * (tabW + 2), active = i === invTab;
      ctx.fillStyle = active ? '#d6b477' : '#2a2230'; ctx.fillRect(x, 17, tabW, 14);
      ctx.fillStyle = active ? '#f7e2a8' : '#3a3042'; ctx.fillRect(x, 17, tabW, 1);
      if (active) { ctx.fillStyle = '#d6b477'; ctx.fillRect(x, 31, tabW, 3); }
      invText(name, x + tabW / 2, 27, active ? '#2a1a12' : '#d2c5bd', 'bold 6px monospace', 'center');
      if (i === 4 && story.pages.some(id => !loreSeen.has(id))) { ctx.fillStyle = '#ff5a4a'; ctx.fillRect(x + tabW - 4, 18, 3, 3); }
    });
    const pad = inputMode === 'pad';
    if (inputMode !== 'touch') {
      invText(pad ? 'L1' : 'Q', tabX0 - 3, 27, '#8f8478', '6px monospace', 'right');
      invText(pad ? 'R1' : 'R', tabX0 + INV_TABS.length * (tabW + 2), 27, '#8f8478', '6px monospace', 'left');
    }
    ctx.fillStyle = '#d6b477'; ctx.fillRect(116, 34, W - 132, 1);

    // Left: hero card.
    invBox(18, 17, 92, 190, '#1b1621', '#4b3d35');
    invText('ROWAN', 64, 29, '#ffe3a1', 'bold 9px monospace', 'center');
    invText(equipment.armor ? 'KNIGHT  LV ' + stats.level : 'VILLAGER  LV ' + stats.level, 64, 38, '#b3a796', '6px monospace', 'center');
    if (quickSlot && inventory[quickSlot] > 0) {
      ctx.fillStyle = '#0d0a10'; ctx.fillRect(86, 42, 20, 20); ctx.fillStyle = '#2a2231'; ctx.fillRect(87, 43, 18, 18);
      drawItemIcon(ITEM_DEFS[quickSlot].icon, 90, 46, 1);
      invText(pad ? 'TP' : 'H', 104, 60, '#ffe3a1', 'bold 5px monospace', 'right');
    }
    drawInventoryCharacterPreview(64, 140);
    invText('HP', 23, 157, '#f0a29a', '6px monospace');
    invBar(36, 152, 68, 5, stats.health, stats.maxHealth, '#e2584f', '#4a1d22');
    invText(stats.health + '/' + stats.maxHealth, 104, 165, '#e8d9c4', '6px monospace', 'right');
    invText('SP', 23, 174, '#a6e39a', '6px monospace');
    invBar(36, 169, 68, 5, stats.stamina, stats.maxStamina, '#71b86c', '#1f3a22');
    invText('XP', 23, 189, '#f2d38a', '6px monospace');
    invBar(36, 184, 68, 5, stats.xp || 0, xpForNext(stats.level), '#f2c14e', '#3b2e14');
    // Coin purse.
    drawItemIcon('coin', 23, 193, 1);
    invText(String(inventory.coins || 0), 38, 203, '#ffe3a1', 'bold 7px monospace');
    invText('ATK ' + totalAttack() + ' DEF ' + totalDefense(), 104, 203, '#b3a796', '6px monospace', 'right');

    const RX = 118, RY = 40, RW = 186;
    if (invTab === 0) drawItemsTab(RX, RY, RW);
    else if (invTab === 1) drawGearTab(RX, RY, RW);
    else if (invTab === 2) drawStatsTab(RX, RY, RW);
    else if (invTab === 3) drawQuestTab(RX, RY, RW);
    else if (invTab === 4) drawLoreTab(RX, RY, RW);
    else if (invTab === 5) drawMapTab(RX, RY, RW);
    else drawRelicsTab(RX, RY, RW);
    if (invMenu) drawItemMenu();

    // Footer hints.
    ctx.fillStyle = '#0f0c13'; ctx.fillRect(116, 211, W - 132, 14);
    const acts = invTab === 0 || invTab === 4 || invTab === 5 || invTab === 6 || (invTab === 1 && gearSel === 3);
    const hint = invMenu ? (pad ? '✥ CHOOSE   ✕ OK   ○ BACK' : 'ARROWS CHOOSE   E OK   X BACK')
      : pad ? (acts ? '✥ SELECT  ✕ ' + (invTab === 4 ? 'READ' : invTab === 5 ? 'TRAVEL' : invTab === 6 ? 'EQUIP' : 'ACTIONS') + '  □ SWING  ○ CLOSE' : 'L1/R1 TAB   □ SWING   ○ CLOSE')
      : (acts ? 'ARROWS  E ' + (invTab === 4 ? 'READ' : invTab === 5 ? 'TRAVEL' : invTab === 6 ? 'EQUIP' : 'ACTIONS') + '  J SWING  Q/R TAB  I CLOSE' : 'Q/R TAB   J SWING   I / ESC CLOSE');
    invText(hint, 116 + (W - 132) / 2, 221, '#c9bca6', '6px monospace', 'center');
    if (invInspect) drawInspect();
    ctx.restore();
  }

  const INV_TAB_W = 23, INV_TAB_X0 = 124;
  const loreSeen = new Set();
  function itemOffset() { return Math.max(0, Math.floor(invSel / 6) - 2) * 6; }
  function itemSlotRect(i) {
    const cols = 6, slot = 28, gap = 3, x = 118, w = 186, y = 40;
    const gx = x + Math.floor((w - (cols * slot + (cols - 1) * gap)) / 2);
    return { x: gx + (i % cols) * (slot + gap), y: y + 2 + Math.floor(i / cols) * (slot + gap), w: slot, h: slot };
  }
  function drawItemsTab(x, y, w) {
    const items = ownedItems();
    invSel = clamp(invSel, 0, Math.max(0, items.length - 1));
    const slot = 28, off = itemOffset();
    if (items.length > 18) {
      const rows = Math.ceil(items.length / 6), vis = 3;
      ctx.fillStyle = '#151119'; ctx.fillRect(x + w - 3, y + 2, 2, 90);
      ctx.fillStyle = '#d6b477'; ctx.fillRect(x + w - 3, y + 2 + Math.round(90 * (off / 6) / rows), 2, Math.round(90 * vis / rows));
    }
    for (let i = 0; i < 18; i++) {
      const { x: sx, y: sy } = itemSlotRect(i);
      const key = items[i + off];
      const def = key && ITEM_DEFS[key];
      const edge = def ? RARITY_COLOR[def.rarity] : '#2c2430';
      invBox(sx, sy, slot, slot, key ? '#2a2231' : '#1d1824', key ? edge : '#2c2430');
      if (def && def.rarity !== 'common') {
        ctx.fillStyle = edge; ctx.globalAlpha = 0.16 + (def.rarity === 'legend' ? Math.sin(time * 4) * 0.08 : 0);
        ctx.fillRect(sx + 1, sy + 1, slot - 2, slot - 2); ctx.globalAlpha = 1;
        ctx.fillStyle = edge; ctx.fillRect(sx + slot - 2, sy, 2, slot); ctx.fillRect(sx, sy + slot - 2, slot, 2);
      }
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(sx + 3, sy + slot - 5, slot - 6, 2);
      if (key) {
        const sel = i + off === invSel;
        const lift = sel ? Math.round(Math.sin(time * 6) * 1) : 0;
        const shake = sel && time - invShake < 0.25 ? Math.round(Math.sin(time * 80) * 2) : 0;
        drawItemIcon(def.icon, sx + 2 + shake, sy + 2 + lift, 2);
        const qty = String(inventory[key]);
        ctx.fillStyle = '#0d0a10'; ctx.fillRect(sx + slot - 4 - qty.length * 4, sy + slot - 8, qty.length * 4 + 3, 7);
        invText(qty, sx + slot - 2, sy + slot - 2, '#ffffff', 'bold 6px monospace', 'right');
        if (newItems.has(key)) {
          ctx.fillStyle = '#e04848'; ctx.fillRect(sx - 1, sy - 1, 15, 7);
          invText('NEW', sx + 1, sy + 5, '#ffffff', 'bold 5px monospace');
        }
        if (quickSlot === key) { ctx.fillStyle = '#f2c14e'; ctx.fillRect(sx + slot - 7, sy + 1, 6, 6); invText('Q', sx + slot - 6, sy + 6, '#2a1a12', 'bold 5px monospace'); }
        if (WEAPONS[key] && currentWeapon() === key) { ctx.fillStyle = '#71b86c'; ctx.fillRect(sx + slot - 7, sy + 1, 6, 6); invText('E', sx + slot - 6, sy + 6, '#102010', 'bold 5px monospace'); }
      }
    }
    if (items.length) { const r = itemSlotRect(invSel - off); invCursor(r.x, r.y, r.w, r.h); }
    // Description card.
    const dy = y + 100;
    invBox(x + 2, dy, w - 4, 66, '#201a26', '#4b3d35');
    const key = items[invSel];
    if (!key) {
      invText('Your pack is empty.', x + w / 2, dy + 30, '#a99f9a', '7px monospace', 'center');
      invText('Defeat monsters to find loot.', x + w / 2, dy + 42, '#7f766f', '6px monospace', 'center');
      return;
    }
    const def = ITEM_DEFS[key];
    ctx.fillStyle = '#151119'; ctx.fillRect(x + 8, dy + 7, 28, 28);
    ctx.strokeStyle = RARITY_COLOR[def.rarity]; ctx.strokeRect(x + 7.5, dy + 6.5, 29, 29);
    drawItemIcon(def.icon, x + 10, dy + 9, 2);
    invText(def.name.toUpperCase(), x + 42, dy + 15, '#ffe3a1', 'bold 8px monospace');
    const tagColor = def.type === 'CONSUMABLE' ? '#71b86c' : def.type === 'TROPHY' ? '#d6b477' : def.type === 'WEAPON' ? '#ffb27a' : def.type === 'KEY ITEM' ? '#f2c14e' : '#8fa6c9';
    ctx.fillStyle = tagColor; ctx.fillRect(x + 42, dy + 19, def.type.length * 4 + 6, 9);
    invText(def.type, x + 45, dy + 26, '#141018', 'bold 6px monospace');
    const rx = x + 42 + def.type.length * 4 + 10;
    invText(def.rarity.toUpperCase(), rx, dy + 26, RARITY_COLOR[def.rarity], 'bold 6px monospace');
    invText('x' + inventory[key], x + w - 10, dy + 15, '#c9bca6', '7px monospace', 'right');
    def.desc.forEach((line, i) => invText(line, x + 10, dy + 46 + i * 9, '#d9cdb8', '7px monospace'));
    if (def.heal) {
      const heal = def.heal >= 999 ? 'FULL' : '+' + def.heal;
      const flash = time - invUseFlash < 0.3;
      invText(heal + ' HP', x + w - 10, dy + 30, flash ? '#ffffff' : '#9be37a', 'bold 6px monospace', 'right');
    } else if (def.value) invText(def.value + 'c', x + w - 10, dy + 30, '#ffe3a1', '6px monospace', 'right');
  }

  function invMenuRect() {
    const r = itemSlotRect(invSel - itemOffset());
    const h = invMenu.opts.length * 12 + 8, w = 70;
    let mx = r.x + r.w + 4, my = r.y;
    if (mx + w > 304) mx = r.x - w - 4;
    if (my + h > 206) my = 206 - h;
    return { x: mx, y: my, w, h };
  }
  function drawItemMenu() {
    const m = invMenuRect();
    const pop = Math.min(1, (time - invMenu.t) / 0.08);
    ctx.save();
    ctx.globalAlpha = pop;
    invBox(m.x, m.y, m.w, m.h, '#2a2032', '#d6b477');
    invMenu.opts.forEach((o, i) => {
      const oy = m.y + 4 + i * 12, sel = i === invMenu.sel;
      if (sel) { ctx.fillStyle = '#d6b477'; ctx.fillRect(m.x + 2, oy, m.w - 4, 11); }
      const dim = o === 'USE' && stats.health >= stats.maxHealth;
      invText((sel ? '> ' : '  ') + o, m.x + 5, oy + 8, sel ? '#2a1a12' : dim ? '#6f6670' : o === 'DROP' ? '#f0a29a' : '#f3e7c9', (sel ? 'bold ' : '') + '6px monospace');
    });
    ctx.restore();
  }

  function wrapText(text, maxW, font) {
    ctx.font = font;
    const out = [];
    text.split('\n').forEach(par => {
      let line = '';
      par.split(' ').forEach(word => {
        const t = line ? line + ' ' + word : word;
        if (ctx.measureText(t).width > maxW && line) { out.push(line); line = word; } else line = t;
      });
      out.push(line);
    });
    return out;
  }

  function drawInspect() {
    const W = canvas.width, H = canvas.height;
    const t = time - invInspect.t;
    ctx.fillStyle = 'rgba(4,4,8,' + Math.min(0.82, t * 5) + ')'; ctx.fillRect(0, 0, W, H);
    const k = Math.min(1, t / 0.14);
    const bw = 236, bh = 170, bx = (W - bw) / 2, by = 30 + (1 - k) * 12;
    ctx.globalAlpha = k;
    invBox(bx, by, bw, bh, '#1c1622', '#d6b477');
    ctx.fillStyle = '#d6b477'; ctx.fillRect(bx + 4, by + 4, bw - 8, 1); ctx.fillRect(bx + 4, by + bh - 5, bw - 8, 1);
    if (invInspect.lore) {
      const entry = LORE.find(l => l.id === invInspect.lore);
      loreSeen.add(entry.id);
      drawItemIcon(entry.kind === 'stone' ? 'whetstone' : 'page', bx + 10, by + 10, 2);
      invText(entry.title.toUpperCase(), bx + 38, by + 20, '#ffe3a1', 'bold 8px monospace');
      invText(entry.where, bx + 38, by + 30, '#8f8478', '6px monospace');
      ctx.fillStyle = entry.kind === 'stone' ? '#2a2a34' : '#e9dcbc'; ctx.fillRect(bx + 10, by + 40, bw - 20, bh - 58);
      const lines = wrapText(entry.text, bw - 32, '7px monospace');
      lines.forEach((ln, i) => invText(ln, bx + 16, by + 52 + i * 10, entry.kind === 'stone' ? '#b8d8ff' : '#3a2a22', '7px monospace'));
      if (entry.sign) invText(entry.sign, bx + bw - 16, by + bh - 24, entry.kind === 'stone' ? '#8fa6c9' : '#7a5a3a', 'italic 7px monospace', 'right');
    } else {
      const def = ITEM_DEFS[invInspect.key];
      // A slowly turning, glowing item on a pedestal.
      const cx = bx + 46, cy = by + 64;
      const glow = ctx.createRadialGradient(cx, cy, 2, cx, cy, 42);
      glow.addColorStop(0, RARITY_COLOR[def.rarity] + '88'); glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow; ctx.fillRect(cx - 44, cy - 44, 88, 88);
      const turn = Math.cos(time * 2.2);
      ctx.save(); ctx.translate(cx, cy + Math.sin(time * 3) * 2); ctx.scale(Math.abs(turn) < 0.12 ? 0.12 * Math.sign(turn || 1) : turn, 1);
      drawItemIcon(def.icon, -24, -24, 4);
      ctx.restore();
      ctx.fillStyle = '#3a2d2a'; ctx.fillRect(cx - 22, cy + 32, 44, 5); ctx.fillStyle = '#5c463a'; ctx.fillRect(cx - 20, cy + 32, 40, 2);
      invText(def.name.toUpperCase(), bx + 96, by + 22, '#ffe3a1', 'bold 9px monospace');
      invText(def.rarity.toUpperCase() + '  ' + def.type, bx + 96, by + 33, RARITY_COLOR[def.rarity], 'bold 6px monospace');
      const lines = wrapText(def.lore || def.desc.join(' '), bw - 108, '7px monospace');
      lines.forEach((ln, i) => invText(ln, bx + 96, by + 50 + i * 10, '#d9cdb8', '7px monospace'));
      const facts = [];
      if (def.heal) facts.push('Restores ' + (def.heal >= 999 ? 'all' : def.heal) + ' HP');
      if (def.atk) facts.push('Attack +' + def.atk);
      if (def.value) facts.push('Sells for ' + def.value + 'c');
      facts.push('Carrying ' + inventory[invInspect.key]);
      facts.forEach((f, i) => invText(f, bx + 96, by + 118 + i * 10, '#9fd3ff', '6px monospace'));
    }
    invText(inputMode === 'pad' ? '✕ / ○ CLOSE' : 'E / X CLOSE', bx + bw / 2, by + bh - 9, '#8f8478', '6px monospace', 'center');
    ctx.globalAlpha = 1;
  }

  function drawGearTab(x, y, w) {
    const on = equipment.armor;
    const Wp = WEAPONS[currentWeapon()];
    const slots = [
      { label: 'HEAD', icon: 'helm', name: tide.cowlOn ? 'Brineguard Cowl' : 'Steel Helm', stat: tide.cowlOn ? 'DEF +2' : 'DEF +1' },
      { label: 'BODY', icon: 'armor', name: "Dad's Armor" + (tide.coatTemper ? ' / Tempered' : ''), stat: 'DEF +' + (2 + (stats.defUp || 0) + (tide.coatTemper && tide.armorWear < 100 ? 2 : 0)) },
      { label: 'LEGS', icon: 'legs', name: tide.bootsOn ? 'Brineguard Boots' : 'Iron Greaves', stat: tide.bootsOn ? 'DEF +1' : 'SPD  -' },
      { label: 'WEAPON', icon: Wp.icon, name: Wp.name + (tide.forge[currentWeapon()] ? ' +' + tide.forge[currentWeapon()] : ''), stat: 'ATK +' + (Wp.atk + (stats.atkUp || 0) + (tide.forge[currentWeapon()] || 0)) }
    ];
    slots.forEach((s, i) => {
      const sy = y + 2 + i * 33;
      const shake = i === gearSel && time - invShake < 0.25 ? Math.round(Math.sin(time * 80) * 2) : 0;
      invBox(x + 2 + shake, sy, w - 4, 30, i === gearSel ? '#2c2433' : '#211b28', '#4b3d35');
      ctx.fillStyle = '#151119'; ctx.fillRect(x + 6, sy + 3, 24, 24);
      if (on) drawItemIcon(s.icon, x + 6, sy + 3, 2);
      else { ctx.globalAlpha = 0.18; drawItemIcon(s.icon, x + 6, sy + 3, 2); ctx.globalAlpha = 1; }
      invText(s.label, x + 36, sy + 11, '#8f8478', '6px monospace');
      invText(on ? s.name : 'Empty', x + 36, sy + 22, on ? '#f3e7c9' : '#6f6670', 'bold 7px monospace');
      if (on) invText(s.stat, x + w - 10, sy + 19, s.stat.startsWith('ATK') ? '#ffb27a' : '#9fd3ff', 'bold 7px monospace', 'right');
      if (i === 3 && on && ownedWeapons().length > 1) invText((inputMode === 'pad' ? '✕' : 'E') + ' SWAP', x + w - 10, sy + 9, '#ffe3a1', 'bold 5px monospace', 'right');
      if (i === gearSel) invCursor(x + 2, sy, w - 4, 30);
    });
    invText(on ? (ownedWeapons().length > 1 ? 'Swap weapons on the WEAPON slot.' : 'Dad\'s old knight set. It still fits.') : 'Find Dad\'s armor stand in his room.', x + w / 2, y + 144, on ? '#a9c8a0' : '#e8b07a', '6px monospace', 'center');
    if (stats.atkUp || stats.defUp) invText('Bram upgrades: ATK +' + (stats.atkUp || 0) + '  DEF +' + (stats.defUp || 0), x + w / 2, y + 156, '#d6b477', '6px monospace', 'center');
  }

  function drawStatsTab(x, y, w) {
    const rows = [
      ['LEVEL / NEXT BLESSING', stats.level + ' / ' + nextMilestone(stats.level)],
      ['ATTACK', String(totalAttack())],
      ['DEFENSE', String(totalDefense())],
      ['MONSTERS / GOBLINS', (stats.kills || 0) + ' / ' + (stats.goblinKills || 0)],
      ['STEPS', String(stats.steps)],
      ['PLAY TIME', Math.floor(stats.playTime / 60) + ':' + String(Math.floor(stats.playTime % 60)).padStart(2, '0')],
      ['CRIT / LUCK / ELITES', Math.round(critChance() * 100) + '% / +' + Math.round(luckValue() * 100) + '% / ' + (stats.elites || 0)]
    ];
    invBox(x + 2, y + 2, w - 4, 52, '#201a26', '#4b3d35');
    invText('HEALTH', x + 10, y + 14, '#f0a29a', '7px monospace');
    invText(stats.health + ' / ' + stats.maxHealth, x + w - 10, y + 14, '#f3e7c9', '7px monospace', 'right');
    invBar(x + 10, y + 17, w - 20, 4, stats.health, stats.maxHealth, '#e2584f', '#4a1d22');
    invText('STAMINA', x + 10, y + 30, '#a6e39a', '7px monospace');
    invText(Math.round(stats.stamina) + ' / ' + stats.maxStamina, x + w - 10, y + 30, '#f3e7c9', '7px monospace', 'right');
    invBar(x + 10, y + 33, w - 20, 4, stats.stamina, stats.maxStamina, '#71b86c', '#1f3a22');
    invText('EXPERIENCE', x + 10, y + 46, '#f2d38a', '7px monospace');
    invText((stats.xp || 0) + ' / ' + xpForNext(stats.level), x + w - 10, y + 46, '#f3e7c9', '7px monospace', 'right');
    invBar(x + 10, y + 49, w - 20, 3, stats.xp || 0, xpForNext(stats.level), '#f2c14e', '#3b2e14');
    rows.forEach(([label, value], i) => {
      const ry = y + 60 + i * 15;
      ctx.fillStyle = i % 2 ? '#1d1824' : '#231d2a'; ctx.fillRect(x + 2, ry, w - 4, 13);
      invText(label, x + 10, ry + 9, '#b9ad9c', '7px monospace');
      invText(value, x + w - 10, ry + 9, '#ffe3a1', 'bold 7px monospace', 'right');
    });
  }

  function questChapter() { return !story.chapterDone ? 1 : !story.ch2Done ? 2 : !story.ch3Done ? 3 : 4; }
  function mainQuestSteps() {
    const ch = questChapter();
    if (ch === 2) return [
      ['Hear the truth from Dad', story.ch2Started],
      ['Travel east to the Ashen Pass', story.passEntered],
      ['Find the Watch scout', story.metWren],
      ['Rest at the lookout fire', story.fires.includes('lookout')],
      ['Defeat the guardian of the pass', story.passBossDefeated]
    ];
    if (ch === 3) return [
      ['Enter Gloamhold', story.gloamEntered],
      ['Reach the city gate', story.gloamGate],
      ['Search the castle quarter', story.gloamBossStarted],
      ['Defeat the Moon-Eater', story.gloamBossDefeated]
    ];
    if (ch === 4) return [
      ...(!story.harborEntered || story.moonVisitSeen ? [['Follow the causeway past the castle', story.moonVisitSeen]] : []),
      ['Follow the east road to Lantern Quay', story.harborEntered],
      ['Ring the night signal for the ferry', story.ferryOpened],
      ['Cross to the Pale Court', story.courtEntered],
      ['Ask the gallery keeper about Seren', story.ch4Done],
      ['Defeat the Keeper beneath the Court', story.wellBossDone],
      ['Bring Seren home', !!tide.ending]
    ];
    const inForest = outdoorScene() && !insideHouse;
    return [
      ['Read the note from Dad', dadNoteRead],
      ["Equip Dad's armor", equipment.armor],
      ['Head out into the forest', inForest || (stats.kills || 0) > 0 || story.campReached],
      ['Reach the camp at the far side', story.campReached],
      ['Enter the Hollow', story.hollowEntered],
      ['Defeat the Hollow King', story.bossDefeated],
      ['Find Dad at the Watch seal', story.dadFound]
    ];
  }
  function drawQuestTab(x, y, w) {
    const steps = mainQuestSteps();
    invBox(x + 2, y + 2, w - 4, 112, '#201a26', '#4b3d35');
    invText('MAIN QUEST', x + 10, y + 12, '#d6b477', 'bold 6px monospace');
    invText(['', 'Ch.1  Where Did Dad Go?', 'Ch.2  The Riders East', 'Ch.3  The Drowned City', 'Ch.4  To the Pale Court'][questChapter()], x + 10, y + 22, '#ffe3a1', 'bold 8px monospace');
    const current = steps.findIndex(s => !s[1]);
    steps.forEach(([label, done], i) => {
      const sy = y + 28 + i * 12;
      ctx.fillStyle = '#0d0a10'; ctx.fillRect(x + 10, sy, 9, 9);
      ctx.fillStyle = done ? '#71b86c' : i === current ? '#3a3042' : '#211b28'; ctx.fillRect(x + 11, sy + 1, 7, 7);
      if (done) { ctx.fillStyle = '#e9ffd9'; ctx.fillRect(x + 12, sy + 4, 2, 2); ctx.fillRect(x + 14, sy + 5, 1, 1); ctx.fillRect(x + 15, sy + 2, 2, 3); }
      const color = done ? '#8f8478' : i === current ? '#fff4d8' : '#6f6670';
      invText(label, x + 25, sy + 8, color, (i === current ? 'bold ' : '') + '7px monospace');
      if (done) { ctx.font = '7px monospace'; ctx.fillStyle = '#8f8478'; ctx.fillRect(x + 25, sy + 5, Math.round(ctx.measureText(label).width), 1); }
      if (i === current) {
        const ax = x + w - 14 - (Math.floor(time * 3) % 2);
        ctx.fillStyle = '#f2c14e';
        for (let k = 0; k < 4; k++) ctx.fillRect(ax + k, sy + 4 - k, 1, k * 2 + 1);
      }
    });
    const kills = Math.min(5, stats.goblinKills || 0);
    const pages = story.pages.length;
    invBox(x + 2, y + 118, w - 4, 50, '#201a26', '#4b3d35');
    invText('SIDE QUESTS', x + 10, y + 128, '#d6b477', 'bold 6px monospace');
    const rows = [['Goblin Trouble', kills, 5, '#e2584f'], ['Stories Heard', pages, LORE.length, '#5fa8ff'], ['Moon Moths', depths.moths.length, MOTH_TOTAL, '#cfe6ff'], ['Champions', DEPTH_IDS.filter(d => story[REGIONS[d].bossFlag]).length, 4, '#ff9a5a']];
    if (story.alderOrder) rows.push(['Thorn in the Granary', story.alderPaid ? 2 : Number(story.granaryCleared), 2, '#eab174', story.granaryCleared ? 'RETURN TO FENNA' : 'CLEAR THE SHED']);
    if (story.lampOrder) rows.push(['Borrowed Light', story.lampPaid ? 3 : Number(story.scribeDown) + Number(story.lampRecovered), 3, '#99d8da',
      story.lampRecovered ? 'RETURN TO TOVE' : story.scribeDown ? 'CHECK THE LOCKER' : 'ENTER THE ANNEX']);
    rows.forEach(([label, have, need, col, hint], i) => {
      const ry = y + 135 + i * (rows.length > 4 ? 6 : 9), done = have >= need;
      invText(label, x + 10, ry, done ? '#9be37a' : '#ffe3a1', 'bold 6px monospace');
      if (!hint || done) invBar(x + 92, ry - 4, w - 134, 3, have, need, done ? '#71b86c' : col, '#2a2232');
      invText(done ? 'DONE' : hint || have + '/' + need, x + w - 10, ry, done ? '#9be37a' : '#f3e7c9', 'bold 6px monospace', 'right');
    });
  }

  // ---- MAP tab: the known world and fast travel between campfires ----
  const MAP_FIRE_ROWS = 5;
  let mapSel = 0;
  function mapFireOffset() { return Math.floor(mapSel / MAP_FIRE_ROWS) * MAP_FIRE_ROWS; }
  let mapFeedback = '';
  const MAP_NODES = [
    { id: 'home', name: 'Home', x: 14, y: 84, known: () => true },
    { id: 'wood', name: 'Woodland', x: 44, y: 70, known: () => equipment.armor },
    { id: 'camp', name: "Bram's Camp", x: 70, y: 82, known: () => story.campReached },
    { id: 'hollow', name: 'The Hollow', x: 88, y: 52, known: () => story.hollowEntered },
    { id: 'pass', name: 'Ashen Pass', x: 120, y: 64, known: () => story.passEntered },
    { id: 'gloam', name: 'Gloamhold', x: 146, y: 40, known: () => story.gloamEntered },
    { id: 'harbor', name: 'Lantern Quay', x: 159, y: 61, known: () => story.harborEntered },
    { id: 'court', name: 'Pale Court', x: 167, y: 16, known: () => story.courtEntered }
  ];
  const TIDE_MAP = [
    { id: 'aldersend', name: 'Alder’s End', x: 37, y: 48, from: [44, 70], show: () => story.aldersendVisited },
    { id: 'orchard', name: 'Orchard', x: 31, y: 30, from: [37, 48], show: () => story.orchardVisited },
    { id: 'gateward', name: 'Gateward', x: 139, y: 19, from: [146, 40], show: () => story.gatewardVisited },
    { id: 'annex', name: 'Lamp Annex', x: 111, y: 11, from: [139, 19], show: () => story.annexVisited },
    { id: 'well', name: 'Lower Well', x: 175, y: 28, from: [167, 16], show: () => story.ch4Done },
    { id: 'village', name: 'Brinewick', x: 176, y: 76, from: [159, 61], show: () => story.harborEntered },
    { id: 'ring', name: 'Arena', x: 135, y: 93, from: [176, 76], show: () => story.villageVisited },
    { id: 'vault', name: 'Salt Vault', x: 176, y: 99, from: [176, 76], show: () => story.netReturned }
  ];
  function mapFires() { return FIRES.filter(f => story.fires.includes(f.id)); }
  function travelOrigin() {
    if (!platformMode || !outdoorScene() || bossFight || tideArena || bossOutro || sidePlayer.deadTime > 0) return null;
    const fire = fireHere();
    return fire && story.fires.includes(fire.id) ? fire : null;
  }
  function openFastTravelMap() {
    const at = travelOrigin();
    mapSel = at ? Math.max(0, mapFires().findIndex(fire => fire.id !== at.id)) : 0;
    openPanel('inventory', 5);
  }
  function mapNodeHere() {
    if (!platformMode || !outdoorScene()) return 'home';
    if (platformScene === 'forest') return sidePlayer.x > CAMP.start - 200 ? 'camp' : 'wood';
    if (REGIONS[platformScene].side) return platformScene;
    return platformScene;
  }
  function drawMapTab(x, y, w) {
    const mh = 108, mx0 = x + 2, my0 = y + 2;
    // parchment
    ctx.fillStyle = '#5a3e22'; ctx.fillRect(mx0 - 1, my0 - 1, w - 2, mh + 2);
    ctx.fillStyle = '#d9c08a'; ctx.fillRect(mx0, my0, w - 4, mh);
    ctx.fillStyle = '#cdb27a';
    for (let i = 0; i < 40; i++) ctx.fillRect(mx0 + (i * 53) % (w - 6), my0 + (i * 29) % (mh - 2), 2 + (i % 3), 1);
    ctx.fillStyle = 'rgba(90,60,30,.25)'; ctx.fillRect(mx0, my0, w - 4, 3); ctx.fillRect(mx0, my0 + mh - 3, w - 4, 3);
    // the eastern sea
    ctx.fillStyle = '#9fb7a8'; ctx.beginPath(); ctx.moveTo(mx0 + 156, my0); ctx.lineTo(mx0 + w - 4, my0); ctx.lineTo(mx0 + w - 4, my0 + mh); ctx.lineTo(mx0 + 176, my0 + mh); ctx.lineTo(mx0 + 160, my0 + 60); ctx.fill();
    ctx.fillStyle = '#c8d8cc';
    for (let i = 0; i < 6; i++) ctx.fillRect(mx0 + 168 + (i % 2) * 6, my0 + 30 + i * 12 + Math.round(Math.sin(time * 2 + i) * 1), 4, 1);
    // forest, mountains and the canyon
    ctx.fillStyle = '#6f8a4a'; for (let i = 0; i < 9; i++) { const tx = mx0 + 24 + i * 6, ty = my0 + 70 + (i % 3) * 5; ctx.fillRect(tx, ty, 3, 4); ctx.fillRect(tx + 1, ty - 2, 1, 2); }
    ctx.fillStyle = '#8a6a4a'; [[96, 36], [106, 42], [130, 50], [138, 44]].forEach(([a, b]) => { ctx.beginPath(); ctx.moveTo(mx0 + a - 6, my0 + b + 6); ctx.lineTo(mx0 + a, my0 + b - 2); ctx.lineTo(mx0 + a + 6, my0 + b + 6); ctx.fill(); });
    // road
    ctx.strokeStyle = '#7a5530'; ctx.lineWidth = 1; ctx.setLineDash([2, 2]);
    ctx.beginPath(); MAP_NODES.forEach((n, i) => { const px = mx0 + n.x, py = my0 + n.y; if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); }); ctx.stroke(); ctx.setLineDash([]);
    const here = mapNodeHere();
    MAP_NODES.forEach(n => {
      const px = mx0 + n.x, py = my0 + n.y, known = n.known();
      ctx.fillStyle = '#3a2412'; ctx.fillRect(px - 3, py - 3, 7, 7);
      ctx.fillStyle = known ? (n.id === 'court' ? '#b98cff' : '#f2e2b0') : '#a08a60'; ctx.fillRect(px - 2, py - 2, 5, 5);
      const fire = FIRES.find(f => (f.id === 'camp' && n.id === 'camp') || (f.id === 'lookout' && n.id === 'pass') || (f.id === 'gate' && n.id === 'gloam') || (f.id === 'quay' && n.id === 'harbor'));
      if (fire && story.fires.includes(fire.id)) { ctx.fillStyle = '#e8542e'; ctx.fillRect(px + 4, py - 7, 3, 4); ctx.fillStyle = '#ffd36a'; ctx.fillRect(px + 5, py - 6, 1, 2); }
      const coast = n.id === 'harbor' || n.id === 'court';
      invText(known ? n.name : '???', coast ? px - 5 : px, coast ? py + 2 : py + 11, known ? '#3a2412' : '#8a7450', 'bold 5px monospace', coast ? 'right' : 'center');
      if (n.id === here) {
        const r = 5 + (Math.sin(time * 5) + 1) * 2;
        ctx.strokeStyle = 'rgba(200,40,40,' + (0.9 - (r - 5) / 8) + ')'; ctx.beginPath(); ctx.arc(px + 0.5, py + 0.5, r, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = '#c8324a'; ctx.fillRect(px - 1, py - 1, 3, 3);
      }
    });
    drawDepthMapNodes(mx0, my0, here);
    TIDE_MAP.forEach(n => {
      if (!n.show()) return;
      const px = mx0 + n.x, py = my0 + n.y, seen = story[n.id + 'Visited'], R = REGIONS[n.id];
      ctx.setLineDash([1, 2]); ctx.strokeStyle = '#67564b'; ctx.beginPath(); ctx.moveTo(mx0 + n.from[0], my0 + n.from[1]); ctx.lineTo(px, py); ctx.stroke(); ctx.setLineDash([]);
      tidePixel('#345253', px - 2, py - 2, 5, 5);
      tidePixel(seen ? (R.bossFlag && story[R.bossFlag] ? '#9be086' : R.color) : '#a7a98b', px - 1, py - 1, 3, 3);
      const label = n.id === 'vault' && !seen ? '?' : n.name;
      invText(label, n.id === 'well' || n.id === 'village' ? px - 5 : px + 3, n.id === 'well' || n.id === 'village' ? py + 2 : py + 8, '#34474a', 'bold 5px monospace', 'right');
      if (FIRES.some(f => f.scene === n.id && story.fires.includes(f.id))) tidePixel('#ee794b', px + 3, py - 6, 2, 4);
      if (here === n.id) { ctx.strokeStyle = '#b43b3b'; ctx.beginPath(); ctx.arc(px, py, 4 + Math.sin(time * 5), 0, Math.PI * 2); ctx.stroke(); }
    });
    invText('N', mx0 + 8, my0 + 12, '#5a3e22', 'bold 6px monospace', 'center');
    ctx.fillStyle = '#5a3e22'; ctx.fillRect(mx0 + 7, my0 + 14, 3, 1); ctx.fillRect(mx0 + 8, my0 + 13, 1, 6);
    // fast travel list
    const fl = mapFires(), at = travelOrigin();
    mapSel = clamp(mapSel, 0, Math.max(0, fl.length - 1));
    invBox(x + 2, y + 114, w - 4, 52, '#201a26', '#4b3d35');
    invText('CAMPFIRES', x + 8, y + 123, '#d6b477', 'bold 6px monospace');
    const off = mapFireOffset();
    if (fl.length > MAP_FIRE_ROWS) {
      invText('<', 196, y + 123, off ? '#ffe3a1' : '#645663', 'bold 7px monospace', 'center');
      invText(`${1 + off / MAP_FIRE_ROWS}/${Math.ceil(fl.length / MAP_FIRE_ROWS)}`, 207, y + 123, '#e4c498', '6px monospace', 'center');
      invText('>', 218, y + 123, off + MAP_FIRE_ROWS < fl.length ? '#ffe3a1' : '#645663', 'bold 7px monospace', 'center');
    }
    invText(mapFeedback || (at ? 'Choose a destination' : 'Rest at a fire to travel'), x + w - 8, y + 123, mapFeedback ? '#ffcb94' : at ? '#9be37a' : '#a99d8f', '5px monospace', 'right');
    if (!fl.length) invText('No campfires discovered yet.', x + w / 2, y + 145, '#8f8478', '6px monospace', 'center');
    fl.slice(off, off + MAP_FIRE_ROWS).forEach((f, j) => {
      const ry = y + 126 + j * 8, sel = off + j === mapSel;
      ctx.fillStyle = sel ? '#2c2433' : '#231d2a'; ctx.fillRect(x + 4, ry, w - 8, 8);
      ctx.fillStyle = '#e8542e'; ctx.fillRect(x + 8, ry + 2, 3, 5); ctx.fillStyle = '#ffd36a'; ctx.fillRect(x + 9, ry + 4, 1, 2);
      invText(f.name, x + 16, ry + 7, sel ? '#ffe3a1' : '#f3e7c9', (sel ? 'bold ' : '') + '6px monospace');
      invText(REGIONS[f.scene].name, x + w - 10, ry + 7, '#a19487', '5px monospace', 'right');
      if (at && at.id === f.id) invText('HERE', x + w - 58, ry + 7, '#9be37a', 'bold 5px monospace', 'right');
      if (sel) invCursor(x + 4, ry, w - 8, 8);
    });
  }
  function mapConfirm() {
    const fl = mapFires(), f = fl[mapSel], at = travelOrigin();
    if (!f) { sfx('uiError'); return; }
    if (!at) { mapFeedback = 'Rest at a campfire first'; sfx('uiError'); invShake = time; return; }
    if (at.id === f.id) { mapFeedback = 'You are already here'; sfx('uiError'); return; }
    sfx('magic'); fastTravel(f);
  }
  const LORE_ROWS = 7;
  function loreOffset() { return clamp(loreSel - 3, 0, Math.max(0, LORE.length - LORE_ROWS)); }
  function drawLoreTab(x, y, w) {
    invText('STORY JOURNAL  ' + story.pages.length + '/' + LORE.length, x + 4, y + 0, '#d6b477', 'bold 6px monospace');
    const off = loreOffset();
    ctx.fillStyle = '#151119'; ctx.fillRect(x + w - 2, y + 2, 2, LORE_ROWS * 12);
    ctx.fillStyle = '#d6b477'; ctx.fillRect(x + w - 2, y + 2 + Math.round(LORE_ROWS * 12 * off / LORE.length), 2, Math.round(LORE_ROWS * 12 * LORE_ROWS / LORE.length));
    LORE.slice(off, off + LORE_ROWS).forEach((entry, j) => {
      const i = j + off;
      const ry = y + 2 + j * 12, found = story.pages.includes(entry.id), sel = i === loreSel;
      ctx.fillStyle = sel ? '#2c2433' : i % 2 ? '#1d1824' : '#231d2a'; ctx.fillRect(x + 2, ry, w - 4, 11);
      drawItemIcon(entry.kind === 'stone' ? 'whetstone' : 'page', x + 4, ry - 1, 1);
      invText(found ? entry.title : '? ? ?', x + 20, ry + 8, found ? (sel ? '#ffe3a1' : '#f3e7c9') : '#5f5662', (sel ? 'bold ' : '') + '6px monospace');
      if (found && !loreSeen.has(entry.id)) { ctx.fillStyle = '#e04848'; ctx.fillRect(x + w - 22, ry + 2, 15, 7); invText('NEW', x + w - 20, ry + 8, '#fff', 'bold 5px monospace'); }
      if (sel) invCursor(x + 2, ry, w - 4, 11);
    });
    const entry = LORE[loreSel], found = entry && story.pages.includes(entry.id);
    const by = y + 2 + LORE_ROWS * 12 + 4;
    invBox(x + 2, by, w - 4, 166 - (by - y), '#201a26', '#4b3d35');
    if (found) invText(entry.title.toUpperCase(), x + 8, by + 9, '#ffe3a1', 'bold 6px monospace');
    if (!found) { invText('Not found yet.', x + w / 2, by + 20, '#8f8478', '7px monospace', 'center'); invText(entry.hint, x + w / 2, by + 32, '#6f6670', '6px monospace', 'center'); return; }
    const lines = wrapText(entry.text, w - 18, '6px monospace');
    lines.slice(0, 7).forEach((ln, i) => invText(ln, x + 8, by + 19 + i * 7, '#d9cdb8', '6px monospace'));
    if (lines.length > 7) invText('... ' + (inputMode === 'pad' ? '✕' : 'E') + ' READ ALL', x + w - 8, by + 72, '#ffe3a1', 'bold 5px monospace', 'right');
  }

  const PAUSE_COUNT = 4, PAUSE_ROW_Y = 99, PAUSE_ROW_H = 19;
  function choosePauseOption() {
    if (pauseSelection === 2) {
      if (typeof toggleBloodEffects === 'function') toggleBloodEffects();
      else setBloodEffects(!bloodEffects);
      sfx('uiConfirm'); return;
    }
    const exit = pauseSelection === 3, map = pauseSelection === 1;
    paused = false; pauseSelection = 0; keys.clear();
    if (map) { openFastTravelMap(); return; }
    if (exit) {
      const saveData = getSaveData();
      stop();
      if (onExit) onExit(saveData);
    }
  }

  function drawPauseMenu() {
    ctx.save();
    ctx.fillStyle = 'rgba(5, 8, 16, 0.76)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // A layered wooden-and-gold frame that matches the game's existing menus.
    ctx.fillStyle = '#211a27';
    ctx.fillRect(48, 48, 224, 144);
    ctx.fillStyle = '#563c3b';
    ctx.fillRect(52, 52, 216, 136);
    ctx.fillStyle = '#171723';
    ctx.fillRect(56, 56, 208, 128);
    ctx.strokeStyle = '#d6b477';
    ctx.lineWidth = 2;
    ctx.strokeRect(56, 56, 208, 128);
    ctx.strokeStyle = '#80604a';
    ctx.lineWidth = 1;
    ctx.strokeRect(61.5, 61.5, 197, 117);

    ctx.textAlign = 'center';
    ctx.font = 'bold 17px monospace';
    const paper = drawPaper('ribbon', 96, 65, 128, 23);
    ctx.fillStyle = paper ? '#39261f' : '#ffe4ae';
    ctx.fillText('PAUSED', 160, 83);
    ctx.fillStyle = '#a9b6ae';
    ctx.font = '7px monospace';
    ctx.fillText('THE WOODS CAN WAIT', 160, 96);

    const options = ['RESUME', 'MAP / FAST TRAVEL', 'BLOOD EFFECTS: ' + (bloodEffects ? 'ON' : 'OFF'), 'SAVE & EXIT TO TITLE'];
    options.forEach((label, i) => {
      const y = PAUSE_ROW_Y + i * PAUSE_ROW_H;
      const selected = i === pauseSelection;
      ctx.fillStyle = selected ? '#d3a56b' : '#302a35';
      ctx.fillRect(78, y, 164, PAUSE_ROW_H - 2);
      ctx.strokeStyle = selected ? '#fff0bf' : '#80604a';
      ctx.lineWidth = 1;
      ctx.strokeRect(78.5, y + 0.5, 163, PAUSE_ROW_H - 3);
      const rowPaper = drawPaper(selected ? 'selected' : 'button', 78, y, 164, PAUSE_ROW_H - 2);
      if (rowPaper) {
        ctx.fillStyle = selected ? '#f3ddb2' : '#e7d5b5';
        ctx.fillRect(106, y + 3, 108, 11);
      }
      ctx.font = selected ? 'bold 8px monospace' : '8px monospace';
      ctx.fillStyle = selected || rowPaper ? '#241a25' : '#ead9bb';
      ctx.fillText((selected ? '> ' : '') + label, 160, y + 12);
    });

    ctx.fillStyle = '#b7b3ad';
    ctx.font = '6px monospace';
    ctx.fillText(inputMode === 'touch' ? 'TAP AN OPTION' : inputMode === 'pad' ? '↑ / ↓ SELECT     ✕ CHOOSE' : '↑ / ↓ SELECT     ENTER CHOOSE', 160, 181);
    ctx.restore();
  }

  function drawHUD() {
    ctx.fillStyle = 'rgba(9, 10, 20, 0.78)';
    ctx.fillRect(3, 3, 126, 25);
    ctx.fillStyle = '#f7e9c7'; ctx.font = '8px monospace'; ctx.textAlign = 'left';
    ctx.fillText('LV ' + stats.level, 8, 12);
    ctx.fillText('HP', 8, 23);
    drawBar(25, 16, 42, 7, stats.health, stats.maxHealth, '#c74f54');
    ctx.fillText('SP', 73, 23);
    drawBar(89, 16, 34, 7, stats.stamina, stats.maxStamina, '#71b86c');

    ctx.fillStyle = 'rgba(0, 0, 0, 0.58)';
    ctx.fillRect(0, canvas.height - 12, canvas.width, 12);
    ctx.fillStyle = '#ffffff'; ctx.font = '8px monospace'; ctx.textAlign = 'left';
    ctx.fillText('WASD: WALK  SHIFT: RUN  Z: NIGHT  I: BAG  C: STATS', 4, canvas.height - 3);

    if (notice && time < noticeUntil) {
      ctx.fillStyle = 'rgba(12, 10, 20, 0.88)';
      ctx.fillRect(47, 207, 226, 20);
      ctx.strokeStyle = '#d9b56b'; ctx.strokeRect(47.5, 207.5, 225, 19);
      ctx.fillStyle = '#fff0c8'; ctx.textAlign = 'center'; ctx.font = '8px monospace';
      ctx.fillText(notice, 160, 220);
    }
  }

  function draw() {
    if (introActive) { drawIntro(); return; }
    if (platformMode && outdoorScene()) { drawPlatformer(); return; }
    if (battle) { drawBattle(); if (paused) drawPauseMenu(); return; }
    if (insideHouse) { drawHouseInterior(); drawHouseHUD(); drawPanel(); if (armorTutorialPending) drawArmorInventoryPrompt(); if (paused) drawPauseMenu(); return; }
    ctx.fillStyle = '#1b1f3a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const x0 = Math.max(0, Math.floor(camX / TILE));
    const y0 = Math.max(0, Math.floor(camY / TILE));
    const x1 = Math.min(MAP_W - 1, Math.floor((camX + canvas.width) / TILE));
    const y1 = Math.min(MAP_H - 1, Math.floor((camY + canvas.height) / TILE));

    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        drawTile(map[ty][tx], tx * TILE - camX, ty * TILE - camY, tx, ty);
      }
    }

    drawForestMushrooms();
    drawForestTrees(false);
    drawHouse();
    drawHouseDoorPrompt();
    drawMailbox();
    drawInteractionPrompt();
    drawFish();
    bunnies.forEach(drawBunny);
    wolves.forEach(drawWolf);
    drawPlayer(Math.round(player.x-camX),Math.round(player.y-camY));
    drawForestTrees(true);
    const hour=worldClock%1;
    let darkness=0;
    if(hour>=0.62&&hour<0.76) darkness=(hour-0.62)/0.14*0.48;
    else if(hour>=0.76||hour<0.19) darkness=0.48;
    else if(hour>=0.19&&hour<0.33) darkness=(0.33-hour)/0.14*0.48;
    if(darkness>0){
      ctx.fillStyle='rgba(12,17,48,'+darkness+')';ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.fillStyle='rgba(74,91,150,'+(darkness*0.18)+')';ctx.fillRect(0,0,canvas.width,canvas.height);
    }
    drawHUD();
    ctx.fillStyle='rgba(9,10,20,0.78)';ctx.fillRect(canvas.width-78,3,75,15);
    ctx.fillStyle=isNight()?'#c8d7ff':'#ffe5a1';ctx.textAlign='right';ctx.font='8px monospace';
    ctx.fillText(clockLabel(),canvas.width-7,13);
    drawPanel();
    if (paused) drawPauseMenu();
  }

  function interact() {
    // The house is top-down; only the forest uses side-view interaction.
    if (platformMode && outdoorScene()) { interactPlatformer(); return; }
    if (insideHouse) {
      if (nearDadNote() && (!nearDadArmor() || dadNoteDistance() <= dadArmorDistance())) {
        panel = 'dad-note'; sfx('bookOpen');
        dadNoteRead = true;
        if (onSave) onSave(getSaveData());
        return;
      }
      if (nearDadArmor()) {
        if (!equipment.armor) {
          const completingArmorQuest = armorQuestActive || dadNoteRead;
          equipment.armor = true; sfx('armor'); setTimeout(() => sfx('belt'), 260); setTimeout(() => sfx('draw'), 560);
          armorQuestActive = false;
          armorTutorialPending = false;
          notice = completingArmorQuest ? "Quest complete! Dad's armor equipped." : "You equipped Dad's armor.";
          noticeUntil = time + 2.5;
          if (onSave) onSave(getSaveData());
        } else {
          notice = "Dad's armor is already equipped.";
          noticeUntil = time + 2;
        }
        return;
      }
      if (nearFrontDoor()) {
        if (platformMode && !equipment.armor) {
          notice = dadNoteRead ? "Dad said to take his armor first. It's in his room." : 'You should check the note on your desk first.';
          noticeUntil = time + 2.6;
          return;
        }
        if (platformMode) {
          insideHouse = false;
          platformScene = 'forest';
          loadSceneMobs('forest'); sfx('doorOpen');
          sceneTitle = { text: 'THE WOODLAND', sub: 'Follow the trail east', t: time };
          sidePlayer.x = 72; sidePlayer.y = SIDE_GROUND_Y;
          sidePlayer.vx = 0; sidePlayer.vy = 0; sidePlayer.onGround = true;
          sidePlayer.facing = 1; sideCameraX = 0;
          sideJumpQueued = false; sideAttackQueued = false;
          keys.clear();
          if (onSave) onSave(getSaveData());
          notice = 'The forest path begins here.';
          noticeUntil = time + 2.5;
          return;
        }
        insideHouse = false;
        player.x = HOUSE_DOOR.x;
        player.y = HOUSE.y + 85;
        player.facing = 'up';
        notice = 'You step outside.';
        noticeUntil = time + 2;
      } else {
        notice = 'Nothing nearby to interact with.';
        noticeUntil = time + 1.8;
      }
      return;
    }
    if (Math.hypot(player.x - HOUSE_DOOR.x, player.y - HOUSE_DOOR.y) < 39) {
      insideHouse = true;
      interiorPlayer.x = ENTRY_SPAWN.x;
      interiorPlayer.y = ENTRY_SPAWN.y;
      interiorPlayer.facing = ENTRY_SPAWN.facing;
      interiorPlayer.moving = false;
      interiorPlayer.walk = 0;
      keys.clear();
      notice = '';
      return;
    }
    const distance = Math.hypot(player.x - MAILBOX.x, player.y - MAILBOX.y);
    if (distance < 39) {
      notice = 'The mailbox is empty for now.';
      noticeUntil = time + 2.6;
    } else {
      notice = 'Nothing nearby to interact with.';
      noticeUntil = time + 1.8;
    }
  }

  function getSaveData() {
    return {
      version: 8,
      equipment: { ...equipment },
      armorQuestActive,
      armorTutorialPending,
      platformScene,
      sideX: sidePlayer.x,
      sideNoteRead: dadNoteRead,
      houseSpawnMigrated: true,
      houseLayout: HOUSE_LAYOUT_VERSION,
      x: player.x,
      y: player.y,
      facing: player.facing,
      insideHouse,
      interiorX: interiorPlayer.x,
      interiorY: interiorPlayer.y,
      interiorWalk: interiorPlayer.walk,
      interiorFacing: interiorPlayer.facing,
      inventory: { ...inventory },
      stats: { ...stats },
      stepDistance,
      worldClock,
      story: { ...story, pages: story.pages.slice(), fires: (story.fires || []).slice() },
      chapter: questChapter(),
      area: REGIONS[platformScene] && platformScene !== 'forest' ? REGIONS[platformScene].name : platformScene === 'forest' ? (sidePlayer.x > CAMP.start ? "BRAM'S CAMP" : 'WOODLAND') : 'HOME',
      quickSlot,
      newItems: Array.from(newItems),
      loreSeen: Array.from(loreSeen),
      relics: { owned: fortune.owned.slice(), equipped: fortune.equipped.slice(), slots: fortune.slots },
      pendingPerks: pendingPerks.map(({ level, cards }) => ({ level, cards: cards.slice() })),
      depths: depthsSave(),
      tide: tideSave()
    };
  }

  function applySave(saveData) {
    // Reset the slot to a clean starting state before applying saved values.
    player.x = SPAWN.x * TILE; player.y = SPAWN.y * TILE; player.facing = 'down';
    insideHouse = false;
    interiorPlayer.x = KID_SPAWN.x; interiorPlayer.y = KID_SPAWN.y; interiorPlayer.facing = KID_SPAWN.facing; interiorPlayer.moving = false; interiorPlayer.walk = 0;
    Object.keys(inventory).forEach(k => { inventory[k] = 0; }); inventory.berries = 3;
    equipment.armor = false; equipment.weapon = 'sword';
    quickSlot = 'berries'; newItems.clear(); loreSeen.clear();
    Object.assign(story, STORY_DEFAULTS, { pages: [], fires: [], lastFire: null });
    dialogue = null; bossFight = null; bossOutro = null; nickScene = null; moonVisit = null; townActors = []; dad = null; bossWaves.length = 0;
    armorTutorialPending = false; armorQuestActive = false; dadNoteRead = false;
    Object.assign(stats, { level: 1, health: 20, maxHealth: 20, stamina: 100, maxStamina: 100, strength: 5, defense: 2, steps: 0, playTime: 0, xp: 0, kills: 0, goblinKills: 0, atkUp: 0, defUp: 0, perkAtk: 0, perkDef: 0, critUp: 0, luck: 0, thirst: 0, chargeUp: 0, elites: 0, chests: 0 });
    fortune.owned = []; fortune.equipped = []; fortune.slots = 2; fortune.phoenixUsed = false; pendingPerks = []; perkOffer = null; relicReveal = null; wheel = null;
    bloodMoon = false; witchUntil = 0; Object.keys(chestRolls).forEach(k => delete chestRolls[k]); fortuneFx.length = 0; depthsReset();
    tideLoad(saveData?.tide);
    stepDistance = 0;
    worldClock = 0.28;
    // A genuinely new slot begins in the kid's bedroom.
    if (!saveData || typeof saveData !== 'object') {
      insideHouse = true;
      return;
    }

    if (Number.isFinite(saveData.x) && Number.isFinite(saveData.y)) {
      const sx = clamp(saveData.x, TILE, (MAP_W - 2) * TILE);
      const sy = clamp(saveData.y, TILE, (MAP_H - 2) * TILE);
      if (!blocked(sx, sy)) { player.x = sx; player.y = sy; }
    }
    if (['up', 'down', 'left', 'right'].includes(saveData.facing)) player.facing = saveData.facing;
    if (saveData.equipment && typeof saveData.equipment === 'object') {
      equipment.armor = saveData.equipment.armor === true;
      if (WEAPONS[saveData.equipment.weapon]) equipment.weapon = saveData.equipment.weapon;
    }
    if (saveData.story && typeof saveData.story === 'object') {
      Object.keys(story).forEach(k => { if (k !== 'pages' && typeof saveData.story[k] === 'boolean') story[k] = saveData.story[k]; });
      ['hollowSeen', 'metBram', 'rested'].forEach(k => { if (typeof saveData.story[k] === 'boolean') story[k] = saveData.story[k]; });
      if (Array.isArray(saveData.story.pages)) story.pages = saveData.story.pages.filter(id => LORE.some(l => l.id === id));
      if (Array.isArray(saveData.story.fires)) story.fires = saveData.story.fires.filter(id => FIRES.some(f => f.id === id));
      const lf = saveData.story.lastFire;
      if (lf && FIRES.some(f => f.id === lf)) story.lastFire = lf;
    }
    if (typeof saveData.quickSlot === 'string' && ITEM_DEFS[saveData.quickSlot]) quickSlot = saveData.quickSlot;
    else if (saveData.quickSlot === null) quickSlot = null;
    if (Array.isArray(saveData.newItems)) saveData.newItems.forEach(k => { if (ITEM_DEFS[k]) newItems.add(k); });
    if (Array.isArray(saveData.loreSeen)) saveData.loreSeen.forEach(k => loreSeen.add(k));
    if (saveData.relics && typeof saveData.relics === 'object') {
      if (Array.isArray(saveData.relics.owned)) fortune.owned = saveData.relics.owned.filter(id => RELICS[id]);
      if (Number.isFinite(saveData.relics.slots)) fortune.slots = clamp(Math.floor(saveData.relics.slots), 2, 4);
      if (Array.isArray(saveData.relics.equipped)) fortune.equipped = saveData.relics.equipped.filter(id => fortune.owned.includes(id)).slice(0, fortune.slots);
    }
    depthsLoad(saveData.depths);
    dadNoteRead = saveData.sideNoteRead === true;
    if (typeof saveData.armorQuestActive === 'boolean') armorQuestActive = saveData.armorQuestActive;
    else armorQuestActive = false;
    armorTutorialPending = saveData.armorTutorialPending === true && !equipment.armor;
    // Older save slots may already have recorded the note read; show the inventory tutorial once after upgrade.
    if (dadNoteRead && !equipment.armor && typeof saveData.armorTutorialPending !== 'boolean' && typeof saveData.armorQuestActive !== 'boolean') {
      armorTutorialPending = true;
    }
    if (saveData.inventory && typeof saveData.inventory === 'object') {
      Object.keys(inventory).forEach(k => {
        if (Number.isFinite(saveData.inventory[k])) inventory[k] = Math.max(0, Math.floor(saveData.inventory[k]));
      });
    }
    if (story.bossDefeated && !inventory.watchblade) tideGrant('watchblade', 1);
    if (tide.arenaWins >= 1 && !fortune.owned.includes('breakwater')) grantRelic('breakwater', false);
    if (saveData.stats && typeof saveData.stats === 'object') {
      Object.keys(stats).forEach(k => {
        if (Number.isFinite(saveData.stats[k])) stats[k] = saveData.stats[k];
      });
      stats.maxHealth = Math.max(1, stats.maxHealth);
      stats.maxStamina = Math.max(1, stats.maxStamina);
      stats.health = clamp(stats.health, 0, stats.maxHealth);
      stats.stamina = clamp(stats.stamina, 0, stats.maxStamina);
    }
    if (Array.isArray(saveData.pendingPerks)) {
      const seen = new Set();
      for (const reward of saveData.pendingPerks) {
        if (!Number.isInteger(reward?.level) || reward.level < 2 || reward.level > stats.level || seen.has(reward.level)) continue;
        seen.add(reward.level);
        const cards = Array.isArray(reward.cards) && reward.cards.length === 3 && new Set(reward.cards).size === 3 &&
          reward.cards.every(id => PERKS.some(p => p.id === id)) ? reward.cards.slice() : [];
        pendingPerks.push({ level: reward.level, cards });
      }
      pendingPerks.sort((a, b) => a.level - b.level);
    } else if (Number.isFinite(saveData.pendingPerks)) {
      // Keep already-earned unclaimed rewards in pre-milestone saves.
      const count = clamp(Math.floor(saveData.pendingPerks), 0, Math.min(20, stats.level - 1));
      for (let level = stats.level - count + 1; level <= stats.level; level++) pendingPerks.push({ level, cards: [] });
    }
    if (Number.isFinite(saveData.stepDistance)) stepDistance = Math.max(0, saveData.stepDistance);
    if (Number.isFinite(saveData.worldClock)) worldClock = ((saveData.worldClock % 1) + 1) % 1;
    // One-time migration: older slots, including earlier version-2 slots,
    // must begin in the kid's bedroom. Later saves preserve the real location.
    if (saveData.houseSpawnMigrated !== true) {
      if (stats.health <= 0) stats.health = Math.max(1, Math.ceil(stats.maxHealth * .65));
      insideHouse = true;
      interiorPlayer.x = KID_SPAWN.x;
      interiorPlayer.y = KID_SPAWN.y;
      interiorPlayer.facing = KID_SPAWN.facing;
      return;
    }
    insideHouse = saveData.insideHouse === true;
    if (insideHouse) {
      if (stats.health <= 0) stats.health = Math.max(1, Math.ceil(stats.maxHealth * .65));
      if (Number.isFinite(saveData.interiorX)) interiorPlayer.x = clamp(saveData.interiorX, HOME.left, HOME.right - 16);
      if (Number.isFinite(saveData.interiorY)) interiorPlayer.y = clamp(saveData.interiorY, HOME.top - 8, HOME.bottom - 15);
      if (['up', 'down', 'left', 'right'].includes(saveData.interiorFacing)) interiorPlayer.facing = saveData.interiorFacing;
      if (Number.isFinite(saveData.interiorWalk)) interiorPlayer.walk = saveData.interiorWalk;
      if (interiorBlocked(interiorPlayer.x, interiorPlayer.y)) {
        interiorPlayer.x = KID_SPAWN.x; interiorPlayer.y = KID_SPAWN.y; interiorPlayer.facing = KID_SPAWN.facing;
      }
      // Saves made before the house was rebuilt hold positions from the old floor plan.
      if (saveData.houseLayout !== HOUSE_LAYOUT_VERSION) {
        interiorPlayer.x = KID_SPAWN.x; interiorPlayer.y = KID_SPAWN.y; interiorPlayer.facing = KID_SPAWN.facing;
      }
    }
  }

  function onKeyDown(e) {
    const k = e.key.toLowerCase();
    unlockAudio();
    if (introActive) { finishIntro(); e.preventDefault(); e.stopPropagation(); return; }
    if (moonVisit) {
      if (dialogue && !e.repeat && ['e', 'enter', ' ', 'x'].includes(k)) advanceDialogue();
      e.preventDefault(); e.stopPropagation(); return;
    }
    if (nickScene) {
      if (!e.repeat && nickScene.t > .4 && ['e', 'enter', 'escape'].includes(k)) finishNickAmbush();
      e.preventDefault(); e.stopPropagation(); return;
    }
    if (bossFight && bossFight.cine && !paused) { if (!e.repeat && ['e', 'enter', ' ', 'j', 'f', 'escape', 'x'].includes(k)) skipBossCine(); e.preventDefault(); e.stopPropagation(); return; }
    if (dialogue && !paused) {
      if (!e.repeat && ['e', 'enter', ' ', 'j', 'k', 'f', 'escape', 'x'].includes(k)) advanceDialogue();
      e.preventDefault(); e.stopPropagation(); return;
    }
    if (fortunePanel() && !paused) { if (!e.repeat) fortuneKey(k); e.preventDefault(); e.stopPropagation(); return; }
    if (panel === 'tide' && !paused) { if (!e.repeat) tideKey(k); e.preventDefault(); e.stopPropagation(); return; }
    if (panel === 'shop') { if (!e.repeat || k.startsWith('arrow')) shopKey(k); e.preventDefault(); e.stopPropagation(); return; }
    if (panel === 'chapter') {
      if (!e.repeat && ['e', 'enter', ' ', 'escape', 'x'].includes(k) && time - invOpenTime > 1.5) { panel = null; sfx('uiConfirm'); if (onSave) onSave(getSaveData()); }
      e.preventDefault(); e.stopPropagation(); return;
    }

    if (paused) {
      if (k === 'escape' || k === 'p') {
        paused = false;
        pauseSelection = 0;
        keys.clear();
      } else if (k === 'arrowup' || k === 'w') {
        pauseSelection = (pauseSelection + PAUSE_COUNT - 1) % PAUSE_COUNT;
      } else if (k === 'arrowdown' || k === 's') {
        pauseSelection = (pauseSelection + 1) % PAUSE_COUNT;
      } else if (k === 'enter' || k === ' ' || k === 'e') {
        choosePauseOption();
      }
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    if (armorTutorialPending) {
      if (k === 'i') { startArmorQuestFromInventory(); e.preventDefault(); e.stopPropagation(); }
      else { e.preventDefault(); e.stopPropagation(); }
      return;
    }

    if (k === 'escape' && panel) {
      if (panel === 'inventory' && (invMenu || invInspect)) { inventoryBack(); e.preventDefault(); e.stopPropagation(); return; }
      closeCurrentPanel();
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (k === 'escape' || k === 'p') {
      paused = true;
      pauseSelection = 0;
      panel = null;
      keys.clear();
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (battle) {
      if (k === '1' || k === 'enter' || k === ' ') { battleAction('fight'); e.preventDefault(); }
      else if (k === '2' || k === 'escape') { battleAction('run'); e.preventDefault(); }
      return;
    }
    if (!platformMode && (k === 'z' || e.code === 'KeyZ')) {
      if (e.repeat) return;
      const alreadyNight = isNight();
      worldClock = 0.80;
      if (!alreadyNight) {
        wolves.length = 0;
        wolfSpawned = false;
      }
      notice = 'Night has fallen...';
      noticeUntil = time + 2.5;
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (panel === 'inventory') {
      if (k === 'escape') { inventoryBack(); e.preventDefault(); e.stopPropagation(); return; }
      if (!e.repeat || k.startsWith('arrow')) inventoryKey(k);
      e.preventDefault(); e.stopPropagation(); return;
    }
    if ((k === 'j' || k === 'f') && platformMode && outdoorScene()) {
      if (!e.repeat && !panel) { sideAttackQueued = true; attackPressed(); }
      e.preventDefault(); e.stopPropagation(); return;
    }
    if ((k === 'k' || k === 'l') && platformMode && outdoorScene()) {
      if (!e.repeat && !panel) sideRollQueued = true;
      e.preventDefault(); e.stopPropagation(); return;
    }
    if (k === 'u' && platformMode && outdoorScene()) {
      if (!e.repeat && !panel) sideUpperQueued = true;
      e.preventDefault(); e.stopPropagation(); return;
    }
    if (k === 'h' && platformMode && outdoorScene()) {
      if (!e.repeat && !panel) useQuickSlot();
      e.preventDefault(); e.stopPropagation(); return;
    }
    if (k === 'i' || k === 'c') {
      if (e.repeat) return;
      if (k === 'i' && panel === 'dad-note') { closeCurrentPanel(); e.preventDefault(); return; }
      togglePanel(k === 'i' ? 'inventory' : 'stats');
      e.preventDefault();
      return;
    }
    if (k === 'm' && !panel) {
      if (!e.repeat) openFastTravelMap();
      e.preventDefault();
      return;
    }
    if (k === 'e' || k === 'enter') {
      if (!e.repeat) {
        if (panel) closeCurrentPanel();
        else interact();
      }
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (panel) {
      if (k === 'i' || k === 'c') closeCurrentPanel();
      return;
    }
    if (GAME_KEYS.includes(k) || k === 'shift' || k === ' ') {
      keys.add(k);
      if (GAME_KEYS.includes(k) || k === ' ') e.preventDefault();
      if (platformMode && (k === 'arrowup' || k === 'w' || k === ' ') && !e.repeat && !/^(Pad|TouchMove)/.test(e.code || '')) sideJumpQueued = true;
    }
  }

  function onKeyUp(e) { const k = e.key.toLowerCase(); keys.delete(k); if (!moonVisit && (k === 'j' || k === 'f')) attackReleased(); }
  function clearHeldInput() {
    keys.clear(); attackHeld = false;
    sideAttackQueued = sideJumpQueued = sideRollQueued = sideUpperQueued = false;
    attackBuffer = rollBuffer = 0;
    sidePlayer.charge = null;
  }

  function init(c, exitCallback, saveData = null, saveCallback = null, options = {}) {
    if (Array.isArray(saveData)) saveData = null;
    canvas = c;
    ctx = canvas.getContext('2d');
    onExit = exitCallback;
    onSave = saveCallback;
    saveTimer = 0;
    bellCount = 0; bellFeedback = bellAnimation = null;
    map = buildMap();
    keys.clear();
    panel = null;
    paused = false;
    pauseSelection = 0;
    notice = ''; noticeUntil = 0; levelUpUntil = 0;
    time = 0; restFlash = -10; moonVisit = null;
    wolves.length=0; wolfSpawned=false; wolfNoticeCooldown=0; battle=null; insideHouse=false;
    bunnies.forEach((b, i) => {
      const starts = [
        [17 * TILE, 10 * TILE], [22 * TILE, 20 * TILE],
        [6 * TILE, 18 * TILE], [36 * TILE, 21 * TILE]
      ];
      b.x = starts[i][0]; b.y = starts[i][1];
      b.vx = 0; b.vy = 0; b.flee = 0;
    });
    applySave(saveData);
    platformMode = true;
    const savedScene = saveData?.houseSpawnMigrated === true && Object.hasOwn(REGIONS, saveData.platformScene);
    platformScene = savedScene ? saveData.platformScene : 'house';
    syncArena();
    sidePlayer.x = savedScene && Number.isFinite(saveData.sideX) ? clamp(saveData.sideX, 20, sideWorldWidth() - 20) : (platformScene === 'house' ? 410 : region().entry);
    // Never resume mid-arena: start the boss walk-in from the Hollow's last stretch instead.
    if (REGIONS[platformScene] && region().arena && !story[region().bossFlag] && sidePlayer.x > BOSS_ARENA.left - 60) sidePlayer.x = BOSS_ARENA.left - 120;
    sidePlayer.y = SIDE_GROUND_Y; sidePlayer.vx = 0; sidePlayer.vy = 0; sidePlayer.onGround = true;
    sidePlayer.facing = 1; sidePlayer.moving = false; sidePlayer.walk = 0;
    dadNoteRead = !!(saveData && saveData.sideNoteRead);
    sideJumpQueued = false; sideAttackQueued = false; sidePlayer.attackTime = 0; sidePlayer.attackCooldown = 0; sidePlayer.hurtTime = 0; sidePlayer.invulnTime = 0; sidePlayer.deadTime = 0; sidePlayer.atk = null;
    combatFx.length = 0; damageNumbers.length = 0; pickups.length = 0; hitStop = 0; screenShake = 0; comboTimer = 0;
    bloodDrops.length = 0; bloodBurst = 0;
    setBloodEffects(typeof settings === 'undefined' || settings.blood !== false);
    loadSceneMobs(REGIONS[platformScene] ? platformScene : 'forest');
    if (region().tide || EXPANSION_MAPS[platformScene]) story[platformScene + 'Visited'] = true;
    placeNpcs();
    sidePlayer.roll = null; sidePlayer.charge = null; sidePlayer.pray = null; sidePlayer.drink = null; sidePlayer.rollCooldown = 0;
    attackHeld = false; sideRollQueued = false; sideUpperQueued = false;
    playerWaves.length = 0; mobShots.length = 0; groundFires.length = 0; ambient.length = 0;
    bossFight = null; bossOutro = null;
    dialogue = null; bossWaves.length = 0;
    restoreBossOutro();
    sceneTitle = null;
    if (stats.health <= 0) recoverAtCheckpoint();
    sideCameraX = clamp(sidePlayer.x - canvas.width * 0.43, 0, Math.max(0, sideWorldWidth() - canvas.width));
    insideHouse = platformScene === 'house';
    introActive = !saveData || typeof saveData !== 'object';
    introReplayOnly = options.replayIntro === true;
    introTime = 0; introBookCue = -1;
    introWolfFleePaths = null;
    introWolfHowlOne = false; introWolfHowlTwo = false; introWolfHowlEcho = false;
    if (introActive && (typeof settings === 'undefined' || settings.sound !== false)) {
      try { audioCtx(); } catch (_) {}
      loadSfxFile('book_open'); loadSfxFile('book_flip');
    }
    if (introActive) { insideHouse = true; interiorPlayer.x = KID_SPAWN.x; interiorPlayer.y = KID_SPAWN.y; interiorPlayer.facing = KID_SPAWN.facing; }
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clearHeldInput);
    canvas.addEventListener('pointerdown', onCanvasPointer);
    const maxCamX = Math.max(0, MAP_W * TILE - canvas.width);
    const maxCamY = Math.max(0, MAP_H * TILE - canvas.height);
    camX = Math.round(clamp(player.x + 8 - canvas.width / 2, 0, maxCamX));
    camY = Math.round(clamp(player.y + 8 - canvas.height / 2, 0, maxCamY));
  }

  function stop() {
    window.removeEventListener('keydown', onKeyDown, true);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('blur', clearHeldInput);
    if (canvas) canvas.removeEventListener('pointerdown', onCanvasPointer);
    keys.clear();
    Object.values(musicTracks).forEach(t => { try { t.a.pause(); } catch (_) {} t.playing = false; t.v = 0; });
  }

  // True when the forest shows an interaction prompt (return home / far side).
  function forestInteractAvailable() {
    return outdoorScene() && !!nearbyInteraction();
  }

  // PS5 layout: ✕ jump/interact/confirm, □ attack, ○ back, △ inventory,
  // touchpad/Create stats, Options pause.
  function controllerAction(action) {
    if (moonVisit) {
      if (dialogue && action === 'primary') advanceDialogue();
      return;
    }
    if (action === 'attackRelease') { attackReleased(); return; }
    inputMode = 'pad';
    unlockAudio();
    if (introActive) { finishIntro(); return; }
    if (nickScene) { if (nickScene.t > .4 && ['primary', 'back'].includes(action)) finishNickAmbush(); return; }
    if (bossFight && bossFight.cine && !paused) { if (action === 'primary' || action === 'attack' || action === 'back') skipBossCine(); return; }
    if (dialogue && !paused) { if (action === 'primary' || action === 'attack' || action === 'back') advanceDialogue(); return; }
    if (fortunePanel() && !paused) { fortunePad(action); return; }
    if (panel === 'tide' && !paused) {
      if (action === 'primary') tideKey('e');
      else if (action === 'back' || action === 'inventory' || action === 'pause') tideKey('escape');
      return;
    }
    if (panel === 'shop' && !paused) {
      if (action === 'primary') buyShopItem(shopSel);
      else if (action === 'back' || action === 'inventory') { closeCurrentPanel(); sfx('uiClose'); }
      return;
    }
    if (panel === 'chapter' && !paused) {
      if ((action === 'primary' || action === 'back') && time - invOpenTime > 1.5) { panel = null; sfx('uiConfirm'); if (onSave) onSave(getSaveData()); }
      return;
    }

    if (armorTutorialPending) {
      if (action === 'inventory' || action === 'primary') startArmorQuestFromInventory();
      return;
    }

    if (paused) {
      if (action === 'back' || action === 'pause') {
        paused = false;
        pauseSelection = 0;
        keys.clear();
      } else if (action === 'primary') {
        choosePauseOption();
      }
      return;
    }

    if (action === 'pause') {
      paused = true;
      pauseSelection = 0;
      panel = null;
      keys.clear();
      return;
    }

    if (battle) {
      if (action === 'primary' || action === 'attack') battleAction('fight');
      else if (action === 'back') battleAction('run');
      return;
    }

    if (panel === 'inventory') {
      if (action === 'primary') inventoryConfirm();
      else if (action === 'back') inventoryBack();
      else if (action === 'inventory') closeCurrentPanel();
      else if (action === 'attack') { if (equipment.armor) { invSwing = time; sfx('swing'); } }
      else if (action === 'stats') { if (invTab === 2) closeCurrentPanel(); else { invTab = 2; sfx('uiTab'); } }
      else if (action === 'tabPrev') inventoryTab(-1);
      else if (action === 'tabNext') inventoryTab(1);
      return;
    }
    if (panel) {
      // Any of ✕, ○, or the panel's own button closes it.
      if (action === 'primary' || action === 'back' ||
          (action === 'inventory' && (panel === 'inventory' || panel === 'dad-note')) ||
          (action === 'stats' && panel === 'stats')) closeCurrentPanel();
      else if (action === 'inventory') openPanel('inventory');
      else if (action === 'stats') openPanel('stats');
      return;
    }

    const inForest = platformMode && outdoorScene() && !insideHouse;
    if (action === 'attack') {
      if (inForest) {
        if (keys.has('arrowup')) sideUpperQueued = true; else sideAttackQueued = true;
        attackPressed(); padRumble(0.05, 0.25, 60);
      }
      return;
    }
    if (action === 'back') { if (inForest) sideRollQueued = true; return; }
    if (action === 'primary') {
      if (inForest && !forestInteractAvailable()) sideJumpQueued = true;
      else interact();
      return;
    }
    if (action === 'inventory') { openPanel('inventory'); return; }
    if (action === 'stats') { if (inForest) useQuickSlot(); else openPanel('stats'); return; }
    // ○ with nothing open does nothing, so it never pauses by accident.
  }
  function renderState() {
    return JSON.stringify({ chapter: questChapter(), scene: platformScene,
      phase: introActive ? 'intro' : paused ? 'paused' : nickScene ? 'nick-ambush' : moonVisit ? 'moon-visit' : panel || 'play',
      moonBeat: moonVisit?.beat ?? null,
      ambushTime: nickScene?.t ?? null, ambushBeat: nickScene ? nickScene.awake ? 'wake' : nickScene.struck ? 'impact' : nickScene.t >= NICK_CHARGE ? 'charge' : 'reveal' : null,
      introTime: introActive ? introTime : null,
      introBookPage: introActive ? introBookPage(introTime) : null,
      introBeat: introActive ? introLoreAt(introTime)?.scene.id ||
        (introTime < INTRO_SPACE_END ? 'earth' : introTime < 38.5 + INTRO_LORE_LENGTH ? 'countryside' : 'bedroom') : null,
      player: { x: Math.round(insideHouse ? interiorPlayer.x : sidePlayer.x), y: Math.round(insideHouse ? interiorPlayer.y : sidePlayer.y),
        health: stats.health, stamina: Math.round(stats.stamina), level: stats.level, xp: stats.xp, armor: equipment.armor, weapon: currentWeapon() },
      dialogue: dialogue?.lines[dialogue.i]?.who ?? null, interaction: !insideHouse && nearbyInteraction()?.label || null,
      inventoryTab: panel === 'inventory' ? INV_TABS[invTab] : null, rewardLevel: perkOffer?.level ?? null,
      cameraX: Math.round(sideCameraX), boss: bossFight ? (bossFight.phaseTwo ? 'phase-two-intro' : bossFight.cine ? 'intro' : bossFight.active ? 'active' : 'dialogue') : null,
      bossForm: theBoss()?.enraged ? 2 : theBoss() ? 1 : null,
      bloodEffects, bloodParticles: bloodDrops.length,
      enemies: sideMobs.filter(m => !m.dead && Math.abs(m.x - sidePlayer.x) < 220)
        .map(m => ({ type: m.type, x: Math.round(m.x), y: Math.round(m.y), hp: m.hp, warning: !!mobWarning(m) })) });
  }
  return { init, update, draw, stop, controllerAction, clearHeldInput, setInputMode, setBloodEffects, renderState };
})();
