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

  // The opening cinematic remains unchanged; all playable scenes now use side-view platform controls.
  const SIDE_GROUND_Y = 196;
  const HOUSE_SIDE_WIDTH = 960;
  const FOREST_SIDE_WIDTH = 4000;
  let platformMode = true;
  let platformScene = 'house';
  let sideCameraX = 0;
  let sideJumpQueued = false;
  let sideAttackQueued = false;
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
  const BOSS_ARENA = { left: 2640, right: 3200, trigger: 2700 };
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
                atkTime: 1.25, hit: [0.57, 0.72], cd: [1.0, 1.6], xp: 150, coins: [25, 30], drops: [['crown', 1]], voice: 'ogre', armor: true }
  };
  const SCENE_MOBS = {
    forest: [['mushroom', 900, 70], ['goblin', 1370, 90], ['eye', 1750, 110], ['goblin', 2050, 90], ['mushroom', 2450, 80],
             ['goblin', 2620, 70], ['goblin', 2900, 100], ['eye', 3150, 110], ['goblin', 3350, 90]],
    hollow: [['skeleton', 520, 90], ['ghost', 820, 120], ['mushroom', 1080, 80], ['skeleton', 1380, 90], ['eye', 1620, 120],
             ['ghost', 1900, 120], ['skeleton', 2160, 100], ['eye', 2400, 110], ['skeleton', 2500, 60]]
  };
  let sideMobs = [];
  function makeMob(type, x, range, i) {
    const T = MOB_TYPES[type];
    const dir = i % 2 ? 1 : -1;
    return { type, T, x, y: SIDE_GROUND_Y - (T.fly || 0), home: x, min: x - range, max: x + range, dir, patrolDir: dir, phase: i * 1.3,
      runUntil: 0, hp: T.hp, maxHp: T.hp, attackCooldown: 0.8 + i * 0.3, attackTime: 0, attackHit: true, hurtTime: 0, deadTime: 0, dead: false,
      respawn: 0, moving: false, kvx: 0, flash: 0, walk: 0, showHpUntil: 0, blockTime: 0, bob: Math.random() * 6 };
  }
  function loadSceneMobs(scene) {
    sideMobs = (SCENE_MOBS[scene] || []).map(([type, x, range], i) => makeMob(type, x, range, i));
    if (scene === 'hollow' && !story.bossDefeated) {
      const boss = makeMob('ogre', 3020, 120, 0);
      boss.dir = -1; boss.patrolDir = -1; boss.dormant = true;
      sideMobs.push(boss);
    }
  }
  // Story flags that persist in the save slot.
  const story = { campReached: false, hollowEntered: false, bossStarted: false, bossDefeated: false, dadFound: false, chapterDone: false, pages: [] };

  // First-play cinematic: pixel planet, narrated countryside pan, then the bedroom.
  let introActive = false, introTime = 0, introAudio = null, introSoundChar = 0, introTextSegment = '', introLastReveal = 0, introWolfHowlOne = false, introWolfHowlTwo = false, introWolfHowlEcho = false;
  const INTRO_DURATION = 45.5;
  // 'pad' while a controller is being used, so prompts show PlayStation buttons.
  let inputMode = 'keyboard';
  function setInputMode(mode) { inputMode = mode === 'pad' ? 'pad' : 'keyboard'; }
  const PAD_LABELS = { E: '✕', ENTER: '✕', SPACE: '✕', J: '□', I: '△', C: 'TOUCHPAD', ESC: '○', P: 'OPTIONS' };
  function K(key) { return inputMode === 'pad' ? (PAD_LABELS[key] || key) : key; }
  function padRumble(strong, weak, ms) {
    if (inputMode === 'pad' && typeof window.pqRumble === 'function') window.pqRumble(strong, weak, ms);
  }
  function finishIntro() {
    introActive = false;
    introTime = INTRO_DURATION;
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
  function introBlip() {
    try {
      const AudioCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtor) return;
      if (!introAudio) introAudio = new AudioCtor();
      if (introAudio.state === 'suspended') introAudio.resume();
      const osc = introAudio.createOscillator();
      const gain = introAudio.createGain();
      const now = introAudio.currentTime;
      osc.type = 'square';
      const notes = [690, 760, 720, 820];
      osc.frequency.setValueAtTime(notes[introSoundChar % notes.length], now);
      gain.gain.setValueAtTime(0.012, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.019);
      osc.connect(gain); gain.connect(introAudio.destination);
      osc.start(now); osc.stop(now + 0.02);
      introSoundChar++;
    } catch (_) {}
  }
  function pqAsset(path) {
    const revision = window.PQ_REV || 'latest';
    const separator = path.includes('?') ? '&' : '?';
    return path + separator + 'pqrev=' + encodeURIComponent(revision);
  }
  // Use the user's actual uploaded howl recordings from the assets folder.
  const introWolfHowlAudioOne = new Audio(pqAsset('./assets/first-wolf-howl.mp3'));
  const introWolfHowlAudioTwo = new Audio(pqAsset('./assets/distant-wolf-howl.mp3'));
  introWolfHowlAudioOne.preload = 'auto';
  introWolfHowlAudioTwo.preload = 'auto';
  function playIntroWolfAudio(audio, volume, rate = 1) {
    try {
      audio.pause(); audio.currentTime = 0; audio.volume = volume; audio.playbackRate = rate;
      const playback = audio.play();
      if (playback && playback.catch) playback.catch(() => {});
    } catch (_) {}
  }
  function introTextBox(lines, reveal, segment) {
    if (introTextSegment !== segment) { introTextSegment = segment; introLastReveal = 0; }
    const full = lines.join(' ');
    const targetReveal = Math.min(full.length, Math.max(0, Math.floor(reveal)));
    // Play exactly once for each newly revealed letter or number. Spaces and punctuation stay silent.
    for (let i = introLastReveal; i < targetReveal; i++) {
      if (/[A-Za-z0-9]/.test(full[i])) introBlip();
    }
    introLastReveal = Math.max(introLastReveal, targetReveal);
    const shown = full.slice(0, targetReveal);
    const words = shown.split(' ');
    const output = [];
    let line = '';
    for (const word of words) {
      const next = line ? line + ' ' + word : word;
      if (next.length > 43 && line) { output.push(line); line = word; }
      else line = next;
    }
    if (line) output.push(line);
    const visible = Math.min(3, output.length);
    const y = 186;
    ctx.fillStyle = 'rgba(8,10,22,.88)';
    ctx.fillRect(13, y, 294, 39);
    ctx.strokeStyle = '#d7bd83'; ctx.lineWidth = 1; ctx.strokeRect(13.5, y + .5, 293, 38);
    ctx.font = '8px monospace'; ctx.textAlign = 'left'; ctx.fillStyle = '#fff0ce';
    for (let i = 0; i < visible; i++) ctx.fillText(output[i], 22, y + 12 + i * 10);
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
    tex.img.src = pqAsset(src);
    return tex;
  }
  const introEarthDay = introTexture('./assets/intro/earth-day.png');
  const introEarthNight = introTexture('./assets/intro/earth-night.png');
  const introMoonTex = introTexture('./assets/intro/moon.png');
  const introBlackIdle = new Image();
  introBlackIdle.src = pqAsset('./assets/werewolves/Black_Werewolf/Idle.png');
  const introRedIdle = new Image();
  introRedIdle.src = pqAsset('./assets/werewolves/Red_Werewolf/Idle.png');
  const introBlackHurt = new Image();
  introBlackHurt.src = pqAsset('./assets/werewolves/Black_Werewolf/Hurt.png');
  const introRedHurt = new Image();
  introRedHurt.src = pqAsset('./assets/werewolves/Red_Werewolf/Hurt.png');

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
    const moonR = 12;
    if (introMoonTex.data) {
      const moonGlow = ctx.createRadialGradient(mx, my, moonR * 0.8, mx, my, moonR * 2.1);
      moonGlow.addColorStop(0, 'rgba(220,225,240,.16)');
      moonGlow.addColorStop(1, 'rgba(220,225,240,0)');
      ctx.fillStyle = moonGlow; ctx.beginPath(); ctx.arc(mx, my, moonR * 2.2, 0, Math.PI * 2); ctx.fill();
      const moon = renderIntroSphere('moon', moonR, 0.4 + t * 0.01, light);
      ctx.drawImage(moon, Math.round(mx - moon.width / 2), Math.round(my - moon.height / 2));
    }
    // Faint lens ghosts along the sun axis.
    ctx.globalCompositeOperation = 'lighter';
    [[70, 58, 7, 'rgba(255,190,120,.06)'], [118, 82, 3, 'rgba(160,210,255,.08)'], [214, 128, 11, 'rgba(140,170,255,.035)']].forEach(([x, y, r, c]) => {
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalCompositeOperation = 'source-over';
    drawIntroVignette(0.9);

    // Title card with tracked lettering.
    const ta = Math.max(0, Math.min(1, (t - 0.6) / 1.2)) * (1 - Math.max(0, Math.min(1, (t - 5.6) / 0.8)));
    if (ta > 0) {
      ctx.globalAlpha = ta;
      ctx.textAlign = 'center'; ctx.font = 'bold 12px monospace';
      const word = 'E A R T H';
      ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillText(word, 161, 30);
      ctx.fillStyle = '#f4e8c5'; ctx.fillText(word, 160, 29);
      const lw = 30 + 24 * Math.min(1, (t - 0.6) / 1.4);
      const lg = ctx.createLinearGradient(160 - lw, 0, 160 + lw, 0);
      lg.addColorStop(0, 'rgba(215,189,131,0)'); lg.addColorStop(0.5, 'rgba(215,189,131,.9)'); lg.addColorStop(1, 'rgba(215,189,131,0)');
      ctx.fillStyle = lg; ctx.fillRect(160 - lw, 34, lw * 2, 1);
      ctx.globalAlpha = 1;
    }
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
        const base = Math.round(top(x + w / 2)) + 3;
        g.fillStyle = '#151f33'; g.fillRect(x, base - h, w, h);
        g.beginPath(); g.moveTo(x - 2, base - h); g.lineTo(x + w / 2, base - h - 5 - (i % 3)); g.lineTo(x + w + 2, base - h); g.closePath(); g.fill();
        if (i % 2 === 0) g.fillRect(x + w - 3, base - h - 6, 2, 4);
        const wins = w > 9 ? 2 : 1;
        for (let k = 0; k < wins; k++) INTRO_VILLAGE.push({ x: x + 2 + k * (w - 5), y: base - h + 3, f: introHash(i * 3 + k) });
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
    const skyMoon = getIntroSkyMoon();
    if (skyMoon) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(skyMoon, Math.round(moonX - skyMoon.width / 2), Math.round(moonY - skyMoon.height / 2));
    }
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
      [[-34, base - 19], [-18, base - 19], [33, base - 19]].forEach(([ox, wy]) => {
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
      const chX = INTRO_HOUSE_X - 44 + 68 - cam, chY = base - 34 - 34;
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

  function drawIntro() {
    const t = introTime;
    ctx.fillStyle = '#03050d'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (t < 8.5) {
      drawIntroSpace(t);
      drawIntroLetterbox();
      if (t > 1.6) introTextBox(['EARTH. A familiar world of oceans, forests, and endless skies.'], (t - 1.6) * 17, 'earth');
      const fadeIn = 1 - Math.min(1, t / 1.2);
      const fadeOut = Math.max(0, Math.min(1, (t - 6.6) / 1.9));
      const a = Math.max(fadeIn, fadeOut);
      if (a > 0) { ctx.fillStyle = 'rgba(0,0,0,' + a + ')'; ctx.fillRect(0, 0, 320, 240); }
    } else if (t < 38.5) {
      drawIntroNight(t);
      drawIntroLetterbox();
      if (t > 9.0 && t < 14.3) {
        introTextBox(['Long ago, people built quiet homes and villages between the fields and forests.'], (t - 9.0) * 17, 'settled-world');
      } else if (t >= 14.8 && t < 20.0) {
        introTextBox(['Then strange energy stirred in forgotten places, and the wilderness began to change.'], (t - 14.8) * 17, 'awakening');
      } else if (t >= 20.5 && t < 25.7) {
        introTextBox(['Unfamiliar creatures appeared. Some were gentle. Others became fierce and territorial.'], (t - 20.5) * 17, 'creatures');
      } else if (t >= 26.2 && t < 32.0) {
        introTextBox(['At night, the wilds grow restless. Even a familiar path can become dangerous.'], (t - 26.2) * 17, 'nightfall');
      } else if (t >= 32.2 && t < 37.4) {
        introTextBox(['Still, people make a life here, one small home at the edge of a much bigger world.'], (t - 32.2) * 17, 'frontier');
      }
      const fadeIn = 1 - Math.min(1, (t - 8.5) / 1.4);
      const fadeOut = Math.max(0, Math.min(1, (t - 36.8) / 1.7));
      const a = Math.max(fadeIn, fadeOut);
      if (a > 0) { ctx.fillStyle = 'rgba(0,0,0,' + a + ')'; ctx.fillRect(0, 0, 320, 240); }
    } else {
      const p = Math.min(1, (t - 38.5) / 1.4);
      ctx.save();
      ctx.translate(160, 120); ctx.scale(1.22 - p * .22, 1.22 - p * .22); ctx.translate(-160, -120);
      drawHouseInterior();
      ctx.restore();
      const fadeIn = 1 - Math.min(1, (t - 38.5) / 0.9);
      if (fadeIn > 0) { ctx.fillStyle = 'rgba(0,0,0,' + fadeIn + ')'; ctx.fillRect(0, 0, 320, 240); }
      if (t < 44.4) {
        introTextBox(['And here, at the edge of the wilderness, a new day begins...'], (t - 39.0) * 17, 'new-day');
      }
      const fade = Math.max(0, Math.min(1, (t - 44.5) / 1));
      if (fade > 0) { ctx.fillStyle = 'rgba(0,0,0,' + fade + ')'; ctx.fillRect(0, 0, 320, 240); }
    }
    if (t < INTRO_DURATION - 1) {
      ctx.fillStyle = 'rgba(235,229,211,.55)'; ctx.font = '6px monospace'; ctx.textAlign = 'right';
      ctx.fillText('PRESS ANY BUTTON TO SKIP', 306, 236);
    }
  }
  let worldClock = 0.28, wolfSpawned = false, wolfNoticeCooldown = 0;
  const wolves = [];
  const DAY_LENGTH = 180;
  let battle = null;
  const BATTLE_FADE = 0.7;
  // CC0 forest-enemy sprite sheet by Vomdrache (OpenGameArt).
  // The middle cell of row two is the detailed grey wolf used in battles.
  const battleWolfSprite = new Image();
  battleWolfSprite.src = 'https://opengameart.org/sites/default/files/enemies_081719_zp.png';
  // User-provided free werewolf sprites: idle poses converted to compact 48px images.
  // Use only the supplied animated sheets in the intro; no legacy standing sprites.
  const introBlackWalk = new Image();
  introBlackWalk.src = pqAsset('./assets/werewolves/Black_Werewolf/walk.png');
  const introBlackRun = new Image();
  introBlackRun.src = pqAsset('./assets/werewolves/Black_Werewolf/Run.png');
  const introRedWalk = new Image();
  introRedWalk.src = pqAsset('./assets/werewolves/Red_Werewolf/Walk.png');
  const introRedRun = new Image();
  introRedRun.src = pqAsset('./assets/werewolves/Red_Werewolf/Run.png');
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
  playerSheet.src = pqAsset('./assets/player-character3.png');

  // Actual knight sprite sheets from the ZIP the player added to the repository.
  const knightSprites = {};
  ['Idle','Run','Attacks','Hurt','Death','Jump'].forEach(name => {
    const image = new Image();
    image.src = pqAsset('./assets/knight/' + name + '.png');
    knightSprites[name.toLowerCase()] = image;
  });
  knightSprites.air = new Image();
  knightSprites.air.src = pqAsset('./assets/knight/attack_from_air.png');
  // Monster sheets (single-row strips). Loaded once per file.
  const mobSheets = {};
  function mobSheet(T, anim) {
    const key = T.src + anim[0];
    if (!mobSheets[key]) {
      const img = new Image();
      img.src = pqAsset('./assets/' + T.src + anim[0] + '.png');
      mobSheets[key] = img;
    }
    return mobSheets[key];
  }
  Object.values(MOB_TYPES).forEach(T => Object.values(T.anims).forEach(an => { if (an) mobSheet(T, an); }));
  function loadImg(path) { const i = new Image(); i.src = pqAsset('./assets/' + path); return i; }
  const hollowArt = {
    back: loadImg('hollow/back.png'), middle: loadImg('hollow/middle.png'), ground: loadImg('hollow/ground.png'), log: loadImg('hollow/log.png'),
    dadIdle: loadImg('hollow/dad-idle.png'), dadRun: loadImg('hollow/dad-run.png'), dadSlash: loadImg('hollow/dad-slash.png')
  };
  // Mini knight used in the top-down house once Dad's armor is on (2 cols x 4 rows of 90x45).
  const miniKnight = { idle: loadImg('knight/mini-idle.png'), run: loadImg('knight/mini-run.png') };
  function imgReady(i) { return i && i.complete && i.naturalWidth > 0; }

  // Forest pack artwork: separate terrain tiles and large transparent decorations.
  const forestTilesSheet = new Image();
  let forestTilesReady = false;
  forestTilesSheet.onload = () => { forestTilesReady = true; };
  forestTilesSheet.onerror = () => { forestTilesReady = false; };
  forestTilesSheet.src = pqAsset('./assets/forest_pack/TopDownFantasy-Forest/Tiles/Tileset.png');

  const forestDecorSheet = new Image();
  let forestDecorReady = false;
  forestDecorSheet.onload = () => { forestDecorReady = true; };
  forestDecorSheet.onerror = () => { forestDecorReady = false; };
  forestDecorSheet.src = pqAsset('./assets/forest_pack/TopDownFantasy-Forest/Decorations/Decorations.png');

  
  // Supplied side-scrolling forest background by Eder Muniz.
  const sideForestBackground = new Image();
  let sideForestBackgroundReady = false;
  sideForestBackground.onload = () => { sideForestBackgroundReady = true; };
  sideForestBackground.onerror = () => { sideForestBackgroundReady = false; };
  sideForestBackground.src = pqAsset('./assets/free_forest/Free Pixel Art Forest/Preview/Background.png');

  const inventory = { berries: 3, wood: 0, fish: 0, fang: 0, tonic: 0, coins: 0, bread: 0, bone: 0, spore: 0, eye: 0, wisp: 0, boneblade: 0, crown: 0 };
  // Dad's armor is a cosmetic outfit set. It is saved with the player and shown in the world and inventory.
  const equipment = { armor: false, weapon: 'sword' };
  let quickSlot = 'berries';
  const newItems = new Set();
  const stats = { level: 1, health: 20, maxHealth: 20, stamina: 100, maxStamina: 100, strength: 5, defense: 2, steps: 0, playTime: 0, xp: 0, kills: 0, goblinKills: 0, atkUp: 0, defUp: 0 };

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
  interiorArtSheet.src = pqAsset('./assets/interiors/Pixel_Interiors/Interior.png');

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
  interiorSheet.src = pqAsset('./assets/kenney-interior-tilemap.png');

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
    battle = { wolf:w, wolfHP:12, maxWolfHP:12, phase:'intro', fade:0, message:'A wild wolf appeared!', menu:0, turn:0 };
    keys.clear();
    player.moving = false;
  }

  function updateBattle(dt) {
    if (!battle) return;
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
        battle = null;
      }
    }
  }

  function battleAction(action) {
    if (!battle || battle.phase !== 'command') return;
    if (action === 'fight') {
      const damage = Math.max(3, stats.strength + 2);
      battle.wolfHP = Math.max(0, battle.wolfHP - damage);
      if (battle.wolfHP <= 0) {
        battle.message = 'The wolf ran back into the forest!';
        battle.phase = 'outro';
        return;
      }
      battle.message = 'You stand your ground! The wolf lunges!';
      stats.health = Math.max(0, stats.health - 2);
      if (stats.health <= 0) {
        battle.message = 'You are worn out! The wolf retreats.';
        battle.phase = 'outro';
      }
    } else if (action === 'run') {
      battle.message = 'You escaped from the wolf!';
      battle.phase = 'outro';
    }
  }

  function drawBattleWolfFallback() {
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


  function drawBattleWolf() {
    if (!battleWolfSprite.complete || !battleWolfSprite.naturalWidth || !battleWolfSprite.naturalHeight) {
      drawBattleWolfFallback();
      return;
    }
    const bob = Math.sin(time * 2.2) * 1.2;
    const cellW = battleWolfSprite.naturalWidth / 3;
    const cellH = battleWolfSprite.naturalHeight / 4;
    // The detailed grey wolf is centered in the second row of this CC0 sheet.
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = 'rgba(0,0,0,0.34)';
    ctx.fillRect(202, 190, 98, 9);
    // Set it farther back on the right so the player and wolf have clear space between them.
    ctx.drawImage(
      battleWolfSprite,
      cellW, cellH, cellW, cellH,
      198, 88 + bob, 104, 104
    );
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
    // Small top-down version of Dad's armor display (the side-view one is far too tall here).
    ctx.save();
    ctx.translate(x, baseY);
    ctx.scale(0.26, 0.26);
    ctx.translate(-x, -baseY);
    if (equipment.armor) {
      // Empty stand once the armor has been taken.
      ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(x - 29, baseY - 2, 58, 4);
      ctx.fillStyle = '#4b3027'; ctx.fillRect(x - 3, baseY - 69, 6, 65); ctx.fillRect(x - 18, baseY - 5, 36, 4);
      ctx.fillRect(x - 22, baseY - 69, 44, 6);
      ctx.fillStyle = '#80533a'; ctx.fillRect(x - 24, baseY - 3, 48, 3);
    } else {
      drawDadArmorStand(x, baseY);
    }
    ctx.restore();
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
    return platformScene === 'house' ? HOUSE_SIDE_PLATFORMS : platformScene === 'hollow' ? HOLLOW_SIDE_PLATFORMS : FOREST_SIDE_PLATFORMS;
  }
  function outdoorScene() { return platformScene === 'forest' || platformScene === 'hollow'; }

  function sideWorldWidth() {
    return platformScene === 'house' ? HOUSE_SIDE_WIDTH : platformScene === 'hollow' ? HOLLOW_SIDE_WIDTH : FOREST_SIDE_WIDTH;
  }

  function updateSideCamera(dt) {
    let target = clamp(sidePlayer.x - canvas.width * 0.43, 0, Math.max(0, sideWorldWidth() - canvas.width));
    if (bossFight && (bossFight.active || bossFight.intro)) target = clamp((BOSS_ARENA.left + BOSS_ARENA.right) / 2 - canvas.width / 2 + (sidePlayer.x - (BOSS_ARENA.left + BOSS_ARENA.right) / 2) * 0.5, BOSS_ARENA.left - 20, BOSS_ARENA.right - canvas.width + 20);
    sideCameraX += (target - sideCameraX) * Math.min(1, dt * 7);
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
    air:      { sheet: 'air', cols: 2, frames: [2, 3, 4, 5, 6], fps: 16, active: [1, 2, 3], reach: 52, dmg: 2, knock: 90, lunge: 0, next: null, air: true, stamina: 8 }
  };
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
                 desc: ['Grukk\'s rusted crown.', 'The curse clings to it.'], lore: 'Iron, bone and moonstone. Dad says it was forged from the first Moonfall shard.' }
  };
  const ITEM_ORDER = ['berries', 'bread', 'fish', 'tonic', 'wood', 'fang', 'spore', 'eye', 'bone', 'wisp', 'boneblade', 'crown'];
  const RARITY_COLOR = { common: '#8a7a68', uncommon: '#5fbf6a', rare: '#5fa8ff', legend: '#f2c14e' };
  const INV_TABS = ['ITEMS', 'GEAR', 'STATS', 'QUEST', 'LORE'];
  const ARMOR_DEFENSE = 3, SWORD_ATTACK = 2;
  let invTab = 0, invSel = 0, gearSel = 0, invOpenTime = 0;
  let hitStop = 0, screenShake = 0, comboTimer = 0, lastMove = null, landTime = 0;
  const combatFx = [], damageNumbers = [], pickups = [];
  let levelUpUntil = 0;

  function xpForNext(level) { return 20 + level * 15; }
  function totalDefense() { return stats.defense + (stats.defUp || 0) + (equipment.armor ? ARMOR_DEFENSE : 0); }
  function totalAttack() { return stats.strength + (stats.atkUp || 0) + (equipment.armor ? (equipment.weapon === 'boneblade' && inventory.boneblade > 0 ? 3 : SWORD_ATTACK) : 0); }

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
    victory: [['victory'], 0.7], gameover: [['gameover'], 0.6]
  };
  const sfxBuffers = {}, sfxLoading = {};
  let sfxPreloaded = false;
  function audioCtx() {
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return null;
    if (!introAudio) introAudio = new AudioCtor();
    if (introAudio.state === 'suspended') introAudio.resume();
    return introAudio;
  }
  function loadSfxFile(file) {
    if (sfxBuffers[file] || sfxLoading[file]) return;
    const ac = audioCtx(); if (!ac || !window.fetch) return;
    sfxLoading[file] = fetch(pqAsset('./assets/audio/sfx/' + file + '.mp3'))
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
      src.playbackRate.value = rate * (0.94 + Math.random() * 0.12);
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
    else sfx(kind === 'death' ? 'die' : 'monsterHurt', 0.7, 0.9);
  }

  // Music: looping tracks per area, cross-faded every frame.
  const MUSIC_FILES = { house: 'house', forest: 'forest', ambience: 'forest_ambience', hollow: 'hollow', boss: 'boss', camp: 'camp' };
  const MUSIC_VOL = { house: 0.32, forest: 0.34, ambience: 0.22, hollow: 0.38, boss: 0.42, camp: 0.34 };
  const musicTracks = {};
  function musicTrack(key) {
    if (!musicTracks[key]) {
      const a = new Audio(pqAsset('./assets/audio/music/' + MUSIC_FILES[key] + '.mp3'));
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
    if (platformScene === 'hollow') {
      if (bossFight && bossFight.active) return { boss: 1 };
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
      t.v += (target - t.v) * Math.min(1, dt * 1.6);
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
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return;
    if (typeof settings !== 'undefined' && settings && settings.sound === false) return;
    try {
      if (!introAudio) introAudio = new AudioCtor();
      if (introAudio.state === 'suspended') introAudio.resume();
      const ac = introAudio, now = ac.currentTime;
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
    if (!sidePlayer.onGround) return groundBelowDistance() > 22 ? 'air' : 'slash1';
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
    if (sidePlayer.onGround && move.lunge) sidePlayer.vx = sidePlayer.facing * move.lunge;
    if (move.air) { sidePlayer.vy = Math.min(sidePlayer.vy, -40); sidePlayer.vx *= 0.3; }
    stats.stamina = Math.max(0, stats.stamina - (move.stamina || 0));
    comboTimer = 0;
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
    if (sideAttackQueued) {
      sideAttackQueued = false;
      if (sidePlayer.atk) {
        const move = KNIGHT_MOVES[sidePlayer.atk.name];
        if (move.next) sidePlayer.atk.queued = move.next;
      } else if (sidePlayer.attackCooldown <= 0 && !panel && sidePlayer.hurtTime <= 0) {
        startKnightMove(chooseOpeningMove());
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
      sfx(atk.name === 'finisher' || atk.name === 'thrust' ? 'swingBig' : 'swing');
    }
    if (idx >= move.frames.length) {
      const queued = atk.queued;
      sidePlayer.atk = null;
      if (queued && sidePlayer.onGround) { startKnightMove(queued); return; }
      lastMove = atk.name;
      comboTimer = move.next ? 0.32 : 0;
      sidePlayer.attackCooldown = move.recover || 0.05;
      return;
    }
    sidePlayer.attackTime = 1;
    if (outdoorScene() && move.active.includes(idx)) knightHitCheck(atk, move);
  }

  function mobTop(m) { return m.y - m.T.bodyH; }
  function weaponAttack() { return equipment.weapon === 'boneblade' ? 3 : 2; }

  function damageMob(m, dmg, f, knock, big, crit) {
    // Skeletons sometimes raise their shield against hits from the front.
    if (m.T.block && !m.dead && m.attackTime <= 0 && m.hurtTime <= 0 && Math.random() < m.T.block && Math.sign(sidePlayer.x - m.x) === m.dir) {
      m.blockTime = 0.4; m.flash = 0.04; m.kvx = f * knock * 0.4;
      spawnSparks(m.x - f * 10, m.y - m.T.bodyH * 0.6, f, 6, ['#ffffff', '#c9d6ff']);
      addDamageNumber(m.x, mobTop(m) - 8, 'BLOCK', '#c9d6ff');
      sfx('clash'); hitStop = 0.04; return;
    }
    dmg = Math.max(1, dmg);
    m.hp = Math.max(0, m.hp - dmg);
    m.flash = 0.07; m.showHpUntil = time + 3;
    if (!m.T.armor) {
      m.hurtTime = 0.3; m.kvx = f * knock; m.attackTime = 0; m.attackHit = true;
      m.attackCooldown = Math.max(m.attackCooldown, 0.55); m.dir = -f;
    } else {
      m.kvx = f * knock * 0.12;
    }
    hitStop = big ? 0.075 : 0.05;
    screenShake = Math.max(screenShake, big ? 2.5 : 1.2);
    spawnSparks(m.x - f * 8, m.y - m.T.bodyH * 0.6, f, big ? 12 : 7, m.type === 'ghost' ? ['#d8fbff', '#7fe3ff', '#ffffff'] : ['#fff6d0', '#ffd27a', '#ff9a4a']);
    addDamageNumber(m.x, mobTop(m) - 10, crit ? dmg + '!' : dmg, crit ? '#ffdf6b' : '#ffffff');
    sfx(big ? 'hitBig' : 'hit');
    mobVoice(m, 'hurt');
    padRumble(big ? 0.7 : 0.35, big ? 0.9 : 0.6, big ? 140 : 80);
    if (m.hp <= 0) defeatMob(m, f);
  }

  function knightHitCheck(atk, move) {
    const f = sidePlayer.facing;
    const near = sidePlayer.x + f * 4, far = sidePlayer.x + f * move.reach;
    const lo = Math.min(near, far) - 12, hi = Math.max(near, far) + 12;
    // The sword sweeps roughly the knight's own height: feet to helmet plus a little.
    const swingTop = sidePlayer.y - 46, swingBottom = sidePlayer.y + 4;
    sideMobs.forEach((m, i) => {
      if (m.dead || m.dormant || atk.hit.has(i)) return;
      if (m.x + m.T.width / 2 < lo || m.x - m.T.width / 2 > hi) return;
      if (m.y < swingTop || mobTop(m) > swingBottom) return;
      atk.hit.add(i);
      const bonus = Math.floor((totalAttack() - 5) / 4);
      const crit = Math.random() < 0.12;
      const big = atk.name === 'finisher' || atk.name === 'thrust' || crit;
      damageMob(m, move.dmg + bonus + (crit ? 1 : 0), f, move.knock, big, crit);
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
    const T = m.T;
    m.dead = true; m.deadTime = 0; m.respawn = T.boss ? Infinity : 24; m.attackTime = 0;
    m.kvx = T.armor ? 0 : f * 160;
    hitStop = T.boss ? 0.3 : 0.11; screenShake = Math.max(screenShake, T.boss ? 7 : 3.5);
    stats.kills = (stats.kills || 0) + 1;
    if (m.type === 'goblin') stats.goblinKills = (stats.goblinKills || 0) + 1;
    mobVoice(m, 'death');
    const dropY = m.y - T.bodyH * 0.6;
    const coins = T.coins[0] + Math.floor(Math.random() * (T.coins[1] - T.coins[0] + 1));
    for (let i = 0; i < coins; i++) pickups.push({ type: 'coin', amount: 1, x: m.x, y: dropY, vx: (Math.random() - 0.5) * 140, vy: -150 - Math.random() * 90, age: 0 });
    T.drops.forEach(([item, chance], k) => {
      if (Math.random() < chance) pickups.push({ type: item, amount: 1, x: m.x, y: dropY, vx: (k % 2 ? -1 : 1) * f * 60, vy: -190 - k * 20, age: 0 });
    });
    gainXp(T.xp);
    if (T.boss) onBossDefeated(m);
  }

  function gainXp(amount) {
    stats.xp = (stats.xp || 0) + amount;
    addDamageNumber(sidePlayer.x, sidePlayer.y - 64, '+' + amount + ' XP', '#9be37a');
    while (stats.xp >= xpForNext(stats.level)) {
      stats.xp -= xpForNext(stats.level);
      stats.level++;
      stats.maxHealth += 4; stats.strength += 1;
      if (stats.level % 2 === 0) stats.defense += 1;
      stats.health = stats.maxHealth; stats.stamina = stats.maxStamina;
      levelUpUntil = time + 2.4;
      notice = 'LEVEL UP! You reached level ' + stats.level + '.'; noticeUntil = time + 2.6;
      sfx('level'); padRumble(0.4, 0.4, 260);
      if (onSave) onSave(getSaveData());
    }
  }

  function hurtSidePlayer(amount, fromDir, who) {
    stats.health = Math.max(0, stats.health - amount);
    sidePlayer.hurtTime = 0.36; sidePlayer.invulnTime = 1.1;
    sidePlayer.atk = null; sidePlayer.attackTime = 0; comboTimer = 0;
    sidePlayer.vx = fromDir * 150; sidePlayer.vy = -120; sidePlayer.onGround = false;
    hitStop = 0.06; screenShake = Math.max(screenShake, 2.5);
    addDamageNumber(sidePlayer.x, sidePlayer.y - 58, amount, '#ff6b6b');
    spawnSparks(sidePlayer.x, sidePlayer.y - 28, fromDir, 6, ['#ff8a8a', '#ffffff']);
    sfx('hurt');
    padRumble(0.9, 0.5, stats.health <= 0 ? 420 : 200);
    if (stats.health <= 0) {
      sidePlayer.deadTime = 1.9; sidePlayer.deathAge = 0;
      notice = 'You were overwhelmed. Returning to the trail...'; noticeUntil = time + 2.2;
    } else { notice = (who || 'Something') + ' hit you!'; noticeUntil = time + 1.2; }
  }

  function updateCombatFx(dt) {
    screenShake = Math.max(0, screenShake - dt * 14);
    comboTimer = Math.max(0, comboTimer - dt);
    landTime = Math.max(0, landTime - dt);
    for (let i = combatFx.length - 1; i >= 0; i--) {
      const p = combatFx[i];
      p.life -= dt;
      if (p.kind !== 'ring' && p.kind !== 'shock') { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.kind === 'dust' ? 30 : 420) * dt; }
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
        else {
          inventory[p.type] = (inventory[p.type] || 0) + p.amount;
          if (!newItems.has(p.type) && (inventory[p.type] || 0) === p.amount) newItems.add(p.type);
          notice = '+1 ' + ITEM_DEFS[p.type].name; noticeUntil = time + 1.6;
          sfx(ITEM_DEFS[p.type].rarity === 'rare' || ITEM_DEFS[p.type].rarity === 'legend' ? 'gem' : 'pickup');
        }
        pickups.splice(i, 1);
      } else if (p.age > 30) pickups.splice(i, 1);
    }
  }

  function drawCombatFx() {
    ctx.save();
    combatFx.forEach(p => {
      const a = Math.max(0, p.life / p.max);
      if (p.kind === 'shock') {
        const r = 6 + (1 - a) * 58;
        ctx.strokeStyle = 'rgba(255,236,190,' + a * 0.9 + ')'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(p.x, p.y, r, r * 0.22, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = 'rgba(160,220,255,' + a * 0.6 + ')'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(p.x, p.y, r * 0.7, r * 0.16, 0, 0, Math.PI * 2); ctx.stroke();
      } else if (p.kind === 'ring') {
        ctx.strokeStyle = 'rgba(255,240,200,' + a + ')'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(p.x, p.y, 4 + (1 - a) * 14, 0, Math.PI * 2); ctx.stroke();
      } else {
        ctx.globalAlpha = p.kind === 'dust' ? a * 0.6 : a;
        ctx.fillStyle = p.color;
        const s = p.kind === 'dust' ? 2 : (a > 0.5 ? 2 : 1);
        ctx.fillRect(Math.round(p.x), Math.round(p.y), s, s);
        ctx.globalAlpha = 1;
      }
    });
    pickups.forEach(p => {
      const bob = p.vy === 0 ? Math.sin(time * 5 + p.x) * 1.5 : 0;
      if (p.type === 'coin') {
        const w = Math.max(1, Math.round(Math.abs(Math.cos(time * 7 + p.x)) * 5));
        ctx.fillStyle = '#7a4a12'; ctx.fillRect(Math.round(p.x - w / 2) - 1, Math.round(p.y + bob) - 3, w + 2, 7);
        ctx.fillStyle = '#f2c14e'; ctx.fillRect(Math.round(p.x - w / 2), Math.round(p.y + bob) - 2, w, 5);
        ctx.fillStyle = '#fff1a8'; ctx.fillRect(Math.round(p.x - w / 2), Math.round(p.y + bob) - 2, 1, 2);
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
    const art = ICONS[name];
    if (!art) return;
    for (let r = 0; r < 12; r++) {
      const row = art[r];
      for (let c = 0; c < 12; c++) {
        const ch = row[c];
        if (!ch || ch === '.') continue;
        ctx.fillStyle = ICON_PALETTE[ch] || '#ff00ff';
        ctx.fillRect(x + c * scale, y + r * scale, scale, scale);
      }
    }
  }

  function updatePlatformer(dt) {
    if (hitStop > 0) { hitStop -= dt; sideMobs.forEach(g => { g.flash = Math.max(0, (g.flash || 0) - dt); }); updateSideCamera(dt); return; }
    time += dt;
    saveTimer += dt;
    if (saveTimer >= 5) {
      saveTimer = 0;
      if (onSave) onSave(getSaveData());
    }

    sidePlayer.attackCooldown = Math.max(0, sidePlayer.attackCooldown - dt);
    sidePlayer.attackTime = Math.max(0, sidePlayer.attackTime - dt);
    sidePlayer.hurtTime = Math.max(0, sidePlayer.hurtTime - dt);
    sidePlayer.invulnTime = Math.max(0, sidePlayer.invulnTime - dt);
    updateCombatFx(dt);
    if (sidePlayer.deadTime > 0) {
      sidePlayer.deadTime -= dt; sidePlayer.deathAge = (sidePlayer.deathAge || 0) + dt;
      sidePlayer.vx *= Math.max(0, 1 - dt * 8);
      sidePlayer.x = clamp(sidePlayer.x + sidePlayer.vx * dt, 16, sideWorldWidth() - 16);
      if (sidePlayer.y < SIDE_GROUND_Y) { sidePlayer.vy += 820 * dt; sidePlayer.y = Math.min(SIDE_GROUND_Y, sidePlayer.y + sidePlayer.vy * dt); } else sidePlayer.vy = 0;
      if (sidePlayer.deadTime <= 0) {
        if (bossFight) endBossFight(false);
        sidePlayer.x = platformScene === 'hollow' ? 130 : 72; sidePlayer.y = SIDE_GROUND_Y; sidePlayer.vx = 0; sidePlayer.vy = 0;
        sidePlayer.onGround = true; sidePlayer.invulnTime = 1.6; sidePlayer.atk = null; sidePlayer.hurtTime = 0; sidePlayer.facing = 1;
        pickups.length = 0;
        stats.health = Math.max(1, Math.ceil(stats.maxHealth * 0.65));
        notice = platformScene === 'hollow' ? 'You wake at the edge of the Hollow.' : 'You made it back to the forest entrance.'; noticeUntil = time + 2.5;
      }
      sideAttackQueued = false; sideJumpQueued = false; updateSideCamera(dt); return;
    }
    if (dialogue || (bossFight && bossFight.intro)) {
      sidePlayer.vx = 0; sidePlayer.moving = false; sidePlayer.atk = null;
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

    if (!panel && (sidePlayer.atk || sidePlayer.hurtTime > 0)) {
      // Committed: attacks carry their own lunge and hits knock the knight back.
      const friction = sidePlayer.onGround ? 10 : 2;
      sidePlayer.vx *= Math.max(0, 1 - dt * friction);
      sidePlayer.moving = false;
      stats.stamina = Math.min(stats.maxStamina, stats.stamina + 6 * dt);
    } else if (!panel) {
      let direction = 0;
      if (keys.has('arrowleft') || keys.has('a')) direction -= 1;
      if (keys.has('arrowright') || keys.has('d')) direction += 1;
      const sprinting = direction !== 0 && keys.has('shift') && stats.stamina > 0;
      const targetSpeed = direction * (sprinting ? 154 : 112);
      const response = Math.min(1, dt * (direction ? 12 : 15));
      sidePlayer.vx += (targetSpeed - sidePlayer.vx) * response;
      if (direction) sidePlayer.facing = direction < 0 ? -1 : 1;
      sidePlayer.moving = Math.abs(sidePlayer.vx) > 8;

      if (sideJumpQueued && sidePlayer.onGround) {
        sidePlayer.vy = -292;
        sidePlayer.onGround = false;
        spawnDust(sidePlayer.x, sidePlayer.y, 4);
        sfx('cloth', 0.5, 1.2);
      }
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
      sidePlayer.onGround = true;
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

    if (outdoorScene()) { updateForestCombat(dt); updateStory(dt); }
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
    const outline = '#26313b', steel = '#718493', light = '#c5d0d3';
    const shade = '#435665', gold = '#c49a55';
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

  const bossWaves = [];   // ground shockwaves from the Hollow King's club
  function playerBodyOverlaps(top, bottom) { return sidePlayer.y - 40 < bottom && sidePlayer.y > top; }
  function updateForestCombat(dt) {
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
      m.x = clamp(m.x, 30, platformScene === 'forest' ? 3540 : platformScene === 'hollow' && !T.boss && !m.summoned ? BOSS_ARENA.left - 40 : sideWorldWidth() - 30);
      if (!T.boss && m.summoned) m.x = clamp(m.x, BOSS_ARENA.left + 20, BOSS_ARENA.right - 20);
      if (T.boss && bossFight && bossFight.active) m.x = clamp(m.x, BOSS_ARENA.left + 30, BOSS_ARENA.right - 30);
      if (m.dead) {
        m.deadTime += dt; m.respawn -= dt;
        if (m.respawn <= 0 && Math.abs(sidePlayer.x - m.home) > 240) {
          Object.assign(m, makeMob(m.type, m.home, (m.max - m.min) / 2, 1), { patrolDir: m.patrolDir });
        }
        continue;
      }
      if (m.dormant) { m.walk += dt * 6; continue; }
      const enraged = T.boss && m.hp <= m.maxHp / 2;
      if (enraged && !m.enraged) {
        m.enraged = true; m.attackTime = 0; m.attackCooldown = 1.2;
        sfx('roar', 1, 0.8); screenShake = 6; padRumble(1, 1, 500);
        notice = 'Grukk roars and the Hollow answers...'; noticeUntil = time + 2.4;
        [BOSS_ARENA.left + 60, BOSS_ARENA.right - 60].forEach((x, k) => {
          const g = makeMob('ghost', x, 60, k); g.respawn = Infinity; g.summoned = true; g.flash = 0.3; sideMobs.push(g);
        });
      }
      m.attackCooldown = Math.max(0, m.attackCooldown - dt);
      m.attackTime = Math.max(0, m.attackTime - dt);
      m.hurtTime = Math.max(0, m.hurtTime - dt);
      const dx = sidePlayer.x - m.x;
      const distance = Math.abs(dx);
      const speedMul = enraged ? 1.45 : 1;
      m.moving = false;
      if (m.hurtTime > 0 || m.kvx || m.blockTime > 0) {
        // Staggered.
      } else if (m.attackTime > 0) {
        if (T.fly && m.type === 'eye') m.x += m.dir * 60 * dt;   // the eye lunges through its bite
      } else if (playerAlive && !safeZone() && distance < T.chase && Math.abs(sidePlayer.y - SIDE_GROUND_Y) < 120) {
        m.dir = dx < 0 ? -1 : 1;
        m.runUntil = Math.max(m.runUntil, time + 0.25);
        if (distance > T.reach - 8) {
          const speed = T.speed * speedMul;
          m.x += m.dir * speed * dt;
          m.walk += speed * dt / 6;
          m.moving = true;
        } else if (m.attackCooldown <= 0) {
          m.attackTime = T.atkTime / speedMul; m.atkLen = m.attackTime; m.attackHit = false; m.waveDone = false;
          m.attackCooldown = (T.cd[0] + Math.random() * (T.cd[1] - T.cd[0])) / speedMul;
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
        if (m.attackTime > 0 && m.type === 'eye') {
          const p = 1 - m.attackTime / m.atkLen;
          hover += Math.sin(Math.min(1, p) * Math.PI) * (T.fly - 18);
        }
        m.y += (hover - m.y) * Math.min(1, dt * 10);
      } else m.y = SIDE_GROUND_Y;
      // Damage window, measured as a share of the swing so animation and hit agree.
      if (m.attackTime > 0 && !m.attackHit) {
        const p = 1 - m.attackTime / m.atkLen;
        if (p >= T.hit[0] && p <= T.hit[1]) {
          if (T.boss && !m.waveDone) {
            m.waveDone = true;
            screenShake = Math.max(screenShake, 5); padRumble(0.9, 0.9, 220); sfx('slam', 1, 0.75);
            spawnDust(m.x + m.dir * 60, SIDE_GROUND_Y, 10);
            bossWaves.push({ x: m.x + m.dir * 58, dir: m.dir, life: enraged ? 2.6 : 1.9, hit: false });
            if (enraged) bossWaves.push({ x: m.x - m.dir * 30, dir: -m.dir, life: 1.6, hit: false });
          }
          const facing = Math.sign(dx) === m.dir || distance < 12;
          if (distance < T.reach + 4 && facing && playerBodyOverlaps(m.y - T.bodyH - 6, m.y + 4) && sidePlayer.invulnTime <= 0 && playerAlive) {
            m.attackHit = true;
            hurtSidePlayer(Math.max(1, T.dmg - Math.floor(totalDefense() / 2)), m.dir, T.boss ? 'Grukk' : 'The ' + T.name.toLowerCase());
          }
        } else if (p > T.hit[1]) m.attackHit = true;
      }
      // Ground walkers block the knight's path; fliers and ghosts drift through.
      if (!T.fly) {
        const gap = sidePlayer.x - m.x, half = T.width / 2 + 9;
        if (Math.abs(gap) < half && Math.abs(sidePlayer.y - SIDE_GROUND_Y) < 8 && !sidePlayer.atk) {
          sidePlayer.x = m.x + (gap < 0 ? -half : half);
          sidePlayer.vx = 0;
        }
      }
    }
    for (let i = sideMobs.length - 1; i >= 0; i--) if (sideMobs[i].summoned && sideMobs[i].dead && sideMobs[i].deadTime > 1.5) sideMobs.splice(i, 1);
    for (let i = bossWaves.length - 1; i >= 0; i--) {
      const w = bossWaves[i];
      w.x += w.dir * 175 * dt; w.life -= dt;
      if (Math.random() < 0.5) spawnDust(w.x, SIDE_GROUND_Y, 1);
      if (!w.hit && Math.abs(w.x - sidePlayer.x) < 12 && sidePlayer.y > SIDE_GROUND_Y - 12 && sidePlayer.invulnTime <= 0 && playerAlive) {
        w.hit = true; hurtSidePlayer(Math.max(1, 5 - Math.floor(totalDefense() / 2)), w.dir, 'The shockwave');
      }
      if (w.life <= 0 || w.x < BOSS_ARENA.left || w.x > BOSS_ARENA.right) bossWaves.splice(i, 1);
    }
  }

  // Generic monster renderer: picks the animation from state, anchors feet,
  // flips to face the target, and flashes white on hit.
  const mobFlashCanvas = document.createElement('canvas');
  const mobFlashCtx = mobFlashCanvas.getContext('2d');
  function mobFrame(m) {
    const T = m.T, A = T.anims;
    if (m.dead) {
      if (A.death) { const n = A.death[1]; return [A.death, Math.min(n - 1, Math.floor(m.deadTime * 9))]; }
      return [A.idle, 0];
    }
    if (m.blockTime > 0 && A.block) return [A.block, Math.min(A.block[1] - 1, Math.floor((0.4 - m.blockTime) * 10))];
    if (m.hurtTime > 0 && A.hurt) return [A.hurt, Math.min(A.hurt[1] - 1, Math.floor((0.3 - m.hurtTime) / 0.3 * A.hurt[1]))];
    if (m.attackTime > 0) { const n = A.attack[1]; return [A.attack, Math.min(n - 1, Math.floor((1 - m.attackTime / m.atkLen) * n))]; }
    if (m.moving && !m.dormant) { const an = A.move; return [an, Math.floor(m.walk * an[2] / 14) % an[1]]; }
    return [A.idle, Math.floor(time * A.idle[2]) % A.idle[1]];
  }
  function drawMob(m) {
    const T = m.T;
    const [anim, frame] = mobFrame(m);
    const img = mobSheet(T, anim);
    if (!imgReady(img)) return;
    let alpha = T.alpha || 1;
    if (m.dead) {
      const fadeStart = T.boss ? 1.6 : (anim[1] / 9 + 0.5);
      alpha *= Math.max(0, 1 - Math.max(0, m.deadTime - fadeStart) / 0.6);
      if (T.boss) alpha *= m.deadTime < 1.6 ? (Math.floor(m.deadTime * 14) % 2 ? 0.5 : 1) : 1;
      if (alpha <= 0) return;
    }
    const sc = T.scale, w = T.fw * sc, h = T.fh * sc;
    const flip = T.faceLeft ? m.dir > 0 : m.dir < 0;
    const sink = T.boss && m.dead ? Math.min(14, m.deadTime * 6) : 0;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(Math.round(m.x), Math.round(m.y + sink));
    if (flip) ctx.scale(-1, 1);
    ctx.drawImage(img, frame * T.fw, 0, T.fw, T.fh, -T.ax * sc, -T.ay * sc, w, h);
    if (m.flash > 0) {
      mobFlashCanvas.width = T.fw; mobFlashCanvas.height = T.fh;
      mobFlashCtx.clearRect(0, 0, T.fw, T.fh);
      mobFlashCtx.drawImage(img, frame * T.fw, 0, T.fw, T.fh, 0, 0, T.fw, T.fh);
      mobFlashCtx.globalCompositeOperation = 'source-in';
      mobFlashCtx.fillStyle = '#ffffff'; mobFlashCtx.fillRect(0, 0, T.fw, T.fh);
      mobFlashCtx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = alpha * 0.85;
      ctx.drawImage(mobFlashCanvas, -T.ax * sc, -T.ay * sc, w, h);
    }
    ctx.restore();
  }
  function drawSideMobs() {
    sideMobs.forEach(m => {
      if (m.dead && m.deadTime > 3) return;
      // ground shadow
      const dist = SIDE_GROUND_Y - m.y;
      ctx.fillStyle = 'rgba(0,0,0,' + Math.max(0.08, 0.3 - dist / 300) + ')';
      ctx.beginPath(); ctx.ellipse(Math.round(m.x), SIDE_GROUND_Y + 1, m.T.width * (m.T.boss ? 1.1 : 0.8), 3, 0, 0, Math.PI * 2); ctx.fill();
      drawMob(m);
      // Telegraph: a red glint before a heavy swing.
      if (!m.dead && m.attackTime > 0 && (1 - m.attackTime / m.atkLen) < m.T.hit[0] && Math.floor(time * 16) % 2) {
        ctx.fillStyle = '#ff5050';
        ctx.fillRect(Math.round(m.x + m.dir * (m.T.width / 2 + 2)), Math.round(mobTop(m) + 4), 2, 2);
      }
      if (!m.dead && !m.T.boss && !m.dormant && (time < m.showHpUntil || m.hp < m.maxHp)) {
        const bw = 22, bx = Math.round(m.x - bw / 2), by = Math.round(mobTop(m) - 7);
        ctx.fillStyle = '#120c14'; ctx.fillRect(bx - 1, by - 1, bw + 2, 4);
        ctx.fillStyle = '#4a1820'; ctx.fillRect(bx, by, bw, 2);
        ctx.fillStyle = '#e04848'; ctx.fillRect(bx, by, Math.round(bw * m.hp / m.maxHp), 2);
      }
    });
    bossWaves.forEach(w => {
      const a = Math.min(1, w.life * 2);
      ctx.fillStyle = 'rgba(255,190,120,' + a * 0.85 + ')';
      ctx.fillRect(Math.round(w.x) - 4, SIDE_GROUND_Y - 9, 8, 9);
      ctx.fillStyle = 'rgba(255,240,200,' + a + ')';
      ctx.fillRect(Math.round(w.x) - 2, SIDE_GROUND_Y - 13, 4, 13);
      ctx.fillStyle = 'rgba(120,70,40,' + a * 0.8 + ')';
      ctx.fillRect(Math.round(w.x) - w.dir * 10, SIDE_GROUND_Y - 4, 6, 4);
    });
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
    ctx.translate(Math.round(x), Math.round(y));
    ctx.scale(facing < 0 ? -scale : scale, scale);
    ctx.drawImage(sheet, col * 128, row * 64, 128, 64, -62, -64, 128, 64);
    ctx.restore();
    return true;
  }

  function knightPose() {
    const ks = knightSprites;
    if (sidePlayer.deadTime > 0) {
      return { sheet: ks.death, cols: 2, frame: Math.min(3, Math.floor((sidePlayer.deathAge || 0) * 7)) };
    }
    if (sidePlayer.hurtTime > 0) {
      return { sheet: ks.hurt, cols: 2, frame: Math.min(2, Math.floor((0.36 - sidePlayer.hurtTime) / 0.36 * 3)) };
    }
    if (sidePlayer.atk) {
      const atk = sidePlayer.atk, move = KNIGHT_MOVES[atk.name];
      if (move.air) {
        // attack_from_air: frames 0-2 dive, 3 impact, 4-6 shockwave and recover.
        if (atk.phase === 'impact') return { sheet: ks.air, cols: 2, frame: Math.min(6, 3 + Math.floor(atk.t * 14)) };
        if (atk.phase === 'hang') return { sheet: ks.air, cols: 2, frame: 0 };
        return { sheet: ks.air, cols: 2, frame: 1 + Math.floor(atk.t * 16) % 2 };
      }
      const idx = Math.min(move.frames.length - 1, Math.floor(atk.t * move.fps));
      return { sheet: ks.attacks, cols: move.cols, frame: move.frames[idx] };
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
    const y = Math.round(sidePlayer.y);
    // The knight sheets are used whenever they are loaded so attacks always
    // animate; the story requires Dad's armor before the forest anyway.
    const useKnight = (equipment.armor || outdoorScene()) && knightSprites.idle && knightSprites.idle.complete && knightSprites.idle.naturalWidth;
    // Ground shadow shrinks while airborne.
    const air = Math.max(0, SIDE_GROUND_Y - y);
    const groundBelow = sidePlayer.onGround ? y : SIDE_GROUND_Y;
    const shadowW = Math.max(6, 22 - air * 0.12);
    ctx.fillStyle = 'rgba(0,0,0,.28)';
    ctx.fillRect(Math.round(x - shadowW / 2), groundBelow - 1, Math.round(shadowW), 2);
    if (useKnight) {
      // Blink while invulnerable after being hit.
      if (sidePlayer.invulnTime > 0 && sidePlayer.deadTime <= 0 && sidePlayer.hurtTime <= 0 && Math.floor(time * 18) % 2 === 0) return;
      const pose = knightPose();
      if (!pose.sheet || !pose.sheet.complete || !pose.sheet.naturalWidth) pose.sheet = knightSprites.idle;
      drawKnightCell(pose.sheet, pose.frame, pose.cols, x, y + 1, sidePlayer.facing);
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
    // Helmet and visor.
    ctx.fillStyle = '#202b36'; ctx.fillRect(x - 13, groundY - 91, 26, 23);
    ctx.fillStyle = '#718493'; ctx.fillRect(x - 10, groundY - 88, 20, 17);
    ctx.fillStyle = '#c5d0d3'; ctx.fillRect(x - 8, groundY - 87, 8, 4);
    ctx.fillStyle = '#26313b'; ctx.fillRect(x - 10, groundY - 77, 20, 4);
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
    FOREST_SIDE_PLATFORMS.slice(1).forEach(drawSidePlatform);

    drawSideMobs();

    drawCamp();
    drawLoreSpots();
    drawSidePlayer();
    drawCombatFx();
    ctx.restore();
    drawSideOverlays(sidePlayer.x > CAMP.start ? "BRAM'S CAMP" : 'WOODLAND');
  }

  // ===========================================================================
  // Story: lore pages, dialogue, the forest camp, the Hollow, the boss and Dad.
  // ===========================================================================
  const LORE = [
    { id: 'watch', kind: 'stone', scene: 'forest', x: 600, title: 'The Silver Watch', where: 'Rune stone, forest trail', hint: 'A stone near the start of the trail.',
      text: 'HERE STOOD THE SILVER WATCH. Sworn to guard the seal over the Hollow, where the moon fell forty winters ago. We hold the line so the village may sleep.', sign: '- Captain Aldric' },
    { id: 'page1', kind: 'page', scene: 'forest', x: 1600, title: 'Journal: Day 1', where: "Dad's journal, deep forest", hint: 'Somewhere in the middle of the forest.',
      text: "Day 1. The goblins aren't raiding. They're running. Their camps are empty and the fires still warm. Something in the Hollow is driving them out of the deep woods, toward the village. Toward home.", sign: '- A.' },
    { id: 'page2', kind: 'page', scene: 'forest', x: 3738, title: 'Journal: Day 3', where: "Dad's journal, Bram's camp", hint: 'At the camp on the far side of the forest.',
      text: "Day 3. Old Bram has kept this camp since the Moonfall. He says the seal is cracking and the dead walk again. I'm going in. Rowan, if you're reading this, go home. ...You never listen. Then rest by the fire first.", sign: '- A.' },
    { id: 'moonfall', kind: 'stone', scene: 'hollow', x: 700, title: 'The Moonfall', where: 'Rune stone, the Hollow', hint: 'A stone near the mouth of the Hollow.',
      text: 'THE MOON WEPT A SHARD OF ITSELF AND IT FELL HERE. Where it struck, the dead do not rest and the wild things grow wrong. Take nothing the moon has dropped.' },
    { id: 'page3', kind: 'page', scene: 'hollow', x: 1800, title: 'Journal: Day 5', where: "Dad's journal, the Hollow", hint: 'Deep inside the Hollow.',
      text: "Day 5. I found the one behind it all. A goblin chief grown huge on the shard's light. He calls himself Grukk, the Hollow King, and wears the shard in his crown. I can't beat him alone. I'll hide past his throne and wait.", sign: '- A.' },
    { id: 'aldric', kind: 'page', scene: null, x: 0, title: "Aldric's Story", where: 'Told by Dad, after the battle', hint: 'Find Dad.',
      text: "The Silver Watch didn't fall to monsters. We fell to the shard. It whispers. Half my brothers took it up and became the skeletons you fought. I buried it under a seal and never told you. Grukk dug it up. His crown is broken now, but the shard itself is gone. Deeper." }
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
    stone: { name: 'RUNE STONE', color: '#b8d8ff' },
    page: { name: "DAD'S JOURNAL", color: '#e8d2a0' }
  };
  function startDialogue(lines, onDone) {
    dialogue = { lines, i: 0, shown: 0, onDone, t: time };
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
    if (who === 'rowan' && imgReady(knightSprites.idle)) {
      ctx.drawImage(knightSprites.idle, 50, 20, 28, 28, x - 2, y - 2, 56, 56);
    } else if (who === 'aldric' && imgReady(hollowArt.dadIdle)) {
      ctx.drawImage(hollowArt.dadIdle, 50, 55, 28, 28, x - 2, y - 2, 56, 56);
    } else if (who === 'grukk') {
      const img = mobSheet(MOB_TYPES.ogre, MOB_TYPES.ogre.anims.idle);
      if (imgReady(img)) { ctx.translate(x + 40, y); ctx.scale(-1, 1); ctx.drawImage(img, 30, 0, 64, 64, -14, -6, 70, 70); }
    } else if (who === 'bram') {
      ctx.fillStyle = '#3d2c22'; ctx.fillRect(x + 6, y + 6, 28, 34);
      ctx.fillStyle = '#5a4030'; ctx.fillRect(x + 9, y + 8, 22, 30);
      ctx.fillStyle = '#1c1410'; ctx.fillRect(x + 12, y + 13, 16, 13);
      ctx.fillStyle = '#d9a77a'; ctx.fillRect(x + 14, y + 16, 12, 8);
      ctx.fillStyle = '#1c1410'; ctx.fillRect(x + 16, y + 18, 2, 2); ctx.fillRect(x + 22, y + 18, 2, 2);
      ctx.fillStyle = '#cfcac0'; ctx.fillRect(x + 13, y + 22, 14, 12); ctx.fillRect(x + 16, y + 34, 8, 3);
    } else {
      drawItemIcon(who === 'stone' ? 'whetstone' : 'page', x + 8, y + 8, 2);
    }
    ctx.restore();
  }
  function drawDialogue() {
    if (!dialogue) return;
    const line = dialogue.lines[dialogue.i];
    const sp = SPEAKERS[line.who] || SPEAKERS.rowan;
    const x = 8, y = 166, w = 304, h = 56;
    ctx.save();
    ctx.fillStyle = 'rgba(6,5,10,.94)'; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#d6b477'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    ctx.strokeStyle = '#5a4535'; ctx.strokeRect(x + 2.5, y + 2.5, w - 5, h - 5);
    drawPortrait(line.who, x + 7, y + 8);
    ctx.font = 'bold 7px monospace';
    const tw = ctx.measureText(sp.name).width + 10;
    ctx.fillStyle = '#0d0a10'; ctx.fillRect(x + 52, y - 7, tw + 2, 12);
    ctx.fillStyle = sp.color; ctx.fillRect(x + 53, y - 6, tw, 10);
    ctx.fillStyle = '#140f16'; ctx.textAlign = 'left'; ctx.fillText(sp.name, x + 58, y + 2);
    const lines = wrapText(line.text, w - 66, '7px monospace');
    let left = Math.floor(dialogue.shown);
    lines.slice(0, 4).forEach((ln, i) => {
      const part = ln.slice(0, Math.max(0, left)); left -= ln.length + 1;
      invText(part, x + 54, y + 15 + i * 10, '#f3e7c9', '7px monospace');
    });
    if (dialogue.shown >= line.text.length && Math.floor(time * 3) % 2) {
      ctx.fillStyle = '#f2c14e';
      const ax = x + w - 12, ay = y + h - 9;
      ctx.fillRect(ax, ay, 5, 1); ctx.fillRect(ax + 1, ay + 1, 3, 1); ctx.fillRect(ax + 2, ay + 2, 1, 1);
    }
    invText((dialogue.i + 1) + '/' + dialogue.lines.length, x + w - 18, y + h - 5, '#6f6670', '5px monospace', 'right');
    ctx.restore();
  }

  // ---- Old Bram's shop ----
  const SHOP_ITEMS = [
    { name: 'Camp Bread', icon: 'bread', info: 'Heals 10 HP', price: () => 5, give: () => { inventory.bread = (inventory.bread || 0) + 1; } },
    { name: 'Red Tonic', icon: 'tonic', info: 'Full heal', price: () => 12, give: () => { inventory.tonic = (inventory.tonic || 0) + 1; } },
    { name: 'Whetstone', icon: 'whetstone', info: () => 'Sword ATK +1  (' + (stats.atkUp || 0) + '/3)', price: () => 30 + (stats.atkUp || 0) * 15, can: () => (stats.atkUp || 0) < 3, give: () => { stats.atkUp = (stats.atkUp || 0) + 1; } },
    { name: 'Iron Plating', icon: 'plate', info: () => 'Armor DEF +1  (' + (stats.defUp || 0) + '/3)', price: () => 30 + (stats.defUp || 0) * 15, can: () => (stats.defUp || 0) < 3, give: () => { stats.defUp = (stats.defUp || 0) + 1; } },
    { name: 'Sell All Loot', icon: 'coin', info: () => sellValue() ? 'Trophies & materials: +' + sellValue() + 'c' : 'Nothing to sell', sell: true },
    { name: 'Leave', icon: null, info: '', leave: true }
  ];
  let shopSel = 0, shopLine = '', shopFlash = -10;
  const SELLABLE = ['fang', 'spore', 'eye', 'bone', 'wisp', 'wood'];
  function sellValue() { return SELLABLE.reduce((sum, k) => sum + (inventory[k] || 0) * ITEM_DEFS[k].value, 0); }
  function openShop() {
    shopSel = 0;
    shopLine = ['Coin for comfort, knight. What\'ll it be?', 'Your father bought a whetstone too. Two, actually.', 'Bread\'s fresh. Mostly.'][Math.floor(Math.random() * 3)];
    openPanel('shop'); sfx('uiOpen');
  }
  function buyShopItem(i) {
    const it = SHOP_ITEMS[i];
    if (it.leave) { closeCurrentPanel(); sfx('uiClose'); return; }
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
    shopLine = it.icon === 'whetstone' ? 'Sharper than your father\'s wit.' : it.icon === 'plate' ? 'Riveted it myself. Should hold.' : 'Enjoy.';
    if (onSave) onSave(getSaveData());
  }
  function shopKey(k) {
    if (k === 'arrowup' || k === 'w') { shopSel = (shopSel + SHOP_ITEMS.length - 1) % SHOP_ITEMS.length; sfx('uiMove'); }
    else if (k === 'arrowdown' || k === 's') { shopSel = (shopSel + 1) % SHOP_ITEMS.length; sfx('uiMove'); }
    else if (k === 'e' || k === 'enter' || k === ' ') buyShopItem(shopSel);
    else if (k === 'escape' || k === 'i' || k === 'x' || k === 'backspace') { closeCurrentPanel(); sfx('uiClose'); }
  }
  function drawShop() {
    ctx.save();
    ctx.fillStyle = 'rgba(4,5,10,.7)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    invBox(56, 22, 208, 196, '#1b1621', '#d6b477');
    drawPortrait('bram', 64, 30);
    invText("OLD BRAM'S WARES", 112, 40, '#ffe3a1', 'bold 9px monospace');
    wrapText(shopLine, 140, '6px monospace').slice(0, 2).forEach((ln, i) => invText(ln, 112, 52 + i * 8, '#c9e39a', '6px monospace'));
    drawItemIcon('coin', 222, 30, 1);
    invText(String(inventory.coins || 0), 256, 39, time - shopFlash < 0.3 ? '#ffffff' : '#ffe3a1', 'bold 7px monospace', 'right');
    SHOP_ITEMS.forEach((it, i) => {
      const ry = 76 + i * 20, sel = i === shopSel;
      const price = it.price ? it.price() : 0;
      const locked = it.can && !it.can();
      const poor = it.price && (inventory.coins || 0) < price;
      invBox(66, ry, 188, 18, sel ? '#2c2433' : '#211b28', sel ? '#d6b477' : '#4b3d35');
      if (it.icon) drawItemIcon(it.icon, 69, ry + 3, 1);
      invText(it.name, 86, ry + 8, locked ? '#6f6670' : '#f3e7c9', 'bold 7px monospace');
      const info = typeof it.info === 'function' ? it.info() : it.info;
      invText(info, 86, ry + 15, '#8f8478', '5px monospace');
      if (it.price) invText(locked ? 'MAX' : price + 'c', 248, ry + 11, locked ? '#6f6670' : poor ? '#e2584f' : '#ffe3a1', 'bold 7px monospace', 'right');
      if (sel) invCursor(66, ry, 188, 18);
    });
    invText(inputMode === 'pad' ? '✥ CHOOSE   ✕ BUY   ○ LEAVE' : 'ARROWS CHOOSE   E BUY   ESC LEAVE', 160, 210, '#8f8478', '6px monospace', 'center');
    ctx.restore();
  }

  function drawChapterPanel() {
    const W = canvas.width, H = canvas.height;
    const t = time - invOpenTime;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,' + Math.min(0.9, t * 1.5) + ')'; ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = Math.min(1, Math.max(0, (t - 0.3) * 2));
    ctx.textAlign = 'center';
    ctx.font = 'bold 8px monospace'; ctx.fillStyle = '#d6b477'; ctx.fillText('CHAPTER 1', 160, 54);
    ctx.font = 'bold 16px monospace'; ctx.fillStyle = '#2a1a12'; ctx.fillText('THE HOLLOW KING', 161, 77);
    ctx.fillStyle = '#ffe3a1'; ctx.fillText('THE HOLLOW KING', 160, 76);
    ctx.fillStyle = '#d6b477'; ctx.fillRect(80, 86, 160, 1);
    ctx.font = 'bold 9px monospace'; ctx.fillStyle = '#9be37a'; ctx.fillText('COMPLETE', 160, 100);
    const rows = [
      ['LEVEL', String(stats.level)],
      ['MONSTERS DEFEATED', String(stats.kills || 0)],
      ['LORE FOUND', story.pages.length + ' / ' + LORE.length],
      ['COINS', String(inventory.coins || 0)],
      ['PLAY TIME', Math.floor(stats.playTime / 60) + ':' + String(Math.floor(stats.playTime % 60)).padStart(2, '0')]
    ];
    rows.forEach(([a, b], i) => {
      invText(a, 92, 120 + i * 12, '#b9ad9c', '7px monospace', 'left');
      invText(b, 228, 120 + i * 12, '#ffe3a1', 'bold 7px monospace', 'right');
    });
    ctx.globalAlpha = Math.min(1, Math.max(0, (t - 1.2) * 2));
    invText('The shard is still out there...', 160, 192, '#c9a8ff', '7px monospace', 'center');
    invText('CHAPTER 2 COMING SOON', 160, 204, '#8f8478', 'bold 6px monospace', 'center');
    if (t > 1.5 && Math.floor(time * 2) % 2) invText(inputMode === 'pad' ? 'PRESS ✕ TO CONTINUE' : 'PRESS E TO CONTINUE', 160, 222, '#f3e7c9', '6px monospace', 'center');
    ctx.restore();
  }

  // ---- Dad (Aldric) ----
  let dad = null;  // { x, dir, state: 'run'|'slash'|'idle', t, target, onArrive }
  let dadTalk = 0;
  let bossOutro = null;
  function updateDad(dt) {
    if (!dad) return;
    dad.t += dt;
    if (dad.state === 'run') {
      const d = dad.target - dad.x;
      dad.dir = d < 0 ? -1 : 1;
      dad.x += dad.dir * Math.min(Math.abs(d), 150 * dt);
      if (Math.abs(d) < 2) { dad.state = dad.slashOnArrive ? 'slash' : 'idle'; dad.t = 0; if (dad.slashOnArrive) sfx('swingBig'); }
    } else if (dad.state === 'slash' && dad.t > 6 / 12) {
      dad.state = 'idle'; dad.t = 0;
      if (dad.onArrive) { const f = dad.onArrive; dad.onArrive = null; f(); }
    } else if (dad.state === 'idle') {
      dad.dir = sidePlayer.x < dad.x ? -1 : 1;
      if (dad.onArrive) { const f = dad.onArrive; dad.onArrive = null; f(); }
    }
  }
  function drawDad() {
    if (!dad) return;
    const sheet = dad.state === 'run' ? hollowArt.dadRun : dad.state === 'slash' ? hollowArt.dadSlash : hollowArt.dadIdle;
    if (!imgReady(sheet)) return;
    const n = dad.state === 'run' ? 12 : dad.state === 'slash' ? 6 : 4;
    const fps = dad.state === 'run' ? 16 : dad.state === 'slash' ? 12 : 6;
    const f = dad.state === 'slash' ? Math.min(n - 1, Math.floor(dad.t * fps)) : Math.floor(dad.t * fps) % n;
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(Math.round(dad.x) - 10, SIDE_GROUND_Y - 1, 20, 2);
    ctx.save();
    ctx.translate(Math.round(dad.x), SIDE_GROUND_Y + 1);
    if (dad.dir < 0) ctx.scale(-1, 1);
    ctx.drawImage(sheet, f * 128, 0, 128, 96, -64, -96, 128, 96);
    ctx.restore();
  }
  function talkToDad() {
    const lines = [
      [{ who: 'aldric', text: "Your mother would have been proud of you today. Furious, but proud." }],
      [{ who: 'aldric', text: "The shard went deeper into the Hollow. We'll need the whole village ready." }, { who: 'rowan', text: 'Then we get ready. Together this time.' }],
      [{ who: 'aldric', text: "Bram's still selling that bread? Don't eat the burnt ones. He does it on purpose." }]
    ];
    startDialogue(lines[dadTalk++ % lines.length]);
  }

  // ---- Boss fight ----
  function theBoss() { return sideMobs.find(m => m.T.boss); }
  function startBossIntro() {
    const boss = theBoss(); if (!boss) return;
    bossFight = { intro: true, active: false, t: 0, talked: false };
    sidePlayer.x = Math.max(sidePlayer.x, BOSS_ARENA.left + 40);
    boss.dir = -1;
    sfx('roar', 1, 0.75); screenShake = 6; padRumble(1, 0.8, 600);
  }
  function updateBossIntro(dt) {
    if (!bossFight || !bossFight.intro) return;
    bossFight.t += dt;
    if (bossFight.t > 1.1 && !bossFight.talked) {
      bossFight.talked = true;
      const retry = story.bossStarted;
      story.bossStarted = true;
      const lines = retry
        ? [{ who: 'grukk', text: 'Back again, little knight? My Hollow loves the taste of you.' }]
        : [
          { who: 'grukk', text: 'Another Silver Watch whelp crawls into MY Hollow.' },
          { who: 'grukk', text: 'Your father hides like a rat behind my throne. I will crack your bones and use them to call him out.' },
          { who: 'rowan', text: "So he's alive. Then I just have to go through you." },
          { who: 'grukk', text: 'HAH! Kneel before the Hollow King!' }
        ];
      startDialogue(lines, () => {
        const boss = theBoss();
        bossFight.intro = false; bossFight.active = true;
        if (boss) { boss.dormant = false; boss.attackCooldown = 0.8; }
        sfx('roar', 0.9, 0.9);
        notice = 'Jump over his shockwaves!'; noticeUntil = time + 2.6;
      });
    }
  }
  function endBossFight(won) {
    bossFight = null;
    bossWaves.length = 0;
    for (let i = sideMobs.length - 1; i >= 0; i--) if (sideMobs[i].summoned) sideMobs.splice(i, 1);
    if (!won) {
      const boss = theBoss();
      if (boss) Object.assign(boss, { hp: boss.maxHp, dormant: true, x: 3020, dir: -1, enraged: false, attackTime: 0, hurtTime: 0, kvx: 0, dead: false });
    }
  }
  function onBossDefeated(m) {
    endBossFight(true);
    sideMobs.forEach(o => { if (o !== m && !o.dead && platformScene === 'hollow' && o.x > BOSS_ARENA.left - 100) { o.hp = 0; defeatMob(o, 1); } });
    story.bossDefeated = true;
    bossOutro = { t: 0, x: m.x, jingle: false };
    notice = 'The Hollow King has fallen.'; noticeUntil = time + 3;
    if (onSave) onSave(getSaveData());
  }
  function updateBossOutro(dt) {
    if (!bossOutro) return;
    bossOutro.t += dt;
    if (bossOutro.t > 0.9 && !bossOutro.jingle) { bossOutro.jingle = true; sfx('victory'); }
    if (bossOutro.t > 2.6 && !dad) {
      const side = sidePlayer.x > 3150 ? -1 : 1;
      dad = { x: Math.min(HOLLOW_SIDE_WIDTH - 10, sideCameraX + canvas.width + 30), dir: -1, state: 'run', t: 0, target: sidePlayer.x + side * 34, slashOnArrive: false };
      dad.onArrive = () => {
        sidePlayer.facing = dad.x < sidePlayer.x ? -1 : 1;
        startDialogue([
          { who: 'aldric', text: 'Rowan? ...Rowan! By the moon, you actually came.' },
          { who: 'rowan', text: 'You left me a note and a suit of armor. What did you think I would do?' },
          { who: 'aldric', text: "Ha. Your mother's stubbornness. I was hiding behind that throne for two days, waiting for an opening." },
          { who: 'aldric', text: "Grukk was only the start. The moon shard in his crown... it's gone. Something took it deeper into the Hollow." },
          { who: 'aldric', text: "There's a lot I never told you about the Silver Watch. Tonight, we go home. Tomorrow, I'll tell you everything." }
        ], () => {
          story.dadFound = true; story.chapterDone = true;
          addLore('aldric');
          bossOutro = null;
          if (onSave) onSave(getSaveData());
          openPanel('chapter');
        });
      };
    }
  }

  // ---- Places you can use [E] on ----
  function nearbyInteraction() {
    const x = sidePlayer.x;
    if (!sidePlayer.onGround || sidePlayer.deadTime > 0) return null;
    for (const l of LORE) {
      if (l.scene === platformScene && Math.abs(x - l.x) < 24) return { label: story.pages.includes(l.id) ? 'READ AGAIN' : 'READ', act: () => readLore(l) };
    }
    if (platformScene === 'forest') {
      if (x < 100) return { label: 'RETURN HOME', act: 'home' };
      if (Math.abs(x - CAMP.fire) < 26) return { label: 'REST BY THE FIRE', act: restAtFire };
      if (Math.abs(x - CAMP.bram) < 28) return { label: 'TRADE WITH BRAM', act: openShop };
      if (x > CAMP.sign - 20) return { label: 'ENTER THE HOLLOW', act: enterHollow };
    } else if (platformScene === 'hollow') {
      if (x < 100) return { label: 'BACK TO THE FOREST', act: leaveHollow };
      if (dad && dad.state === 'idle' && Math.abs(x - dad.x) < 32 && story.dadFound) return { label: 'TALK TO DAD', act: talkToDad };
    }
    return null;
  }
  function readLore(l) {
    const first = addLore(l.id);
    sfx(l.kind === 'stone' ? 'magic' : 'bookOpen');
    if (first) { notice = 'Lore found: ' + l.title + '  (' + story.pages.length + '/' + LORE.length + ')'; noticeUntil = time + 2.5; }
    const parts = wrapText(l.text, 238, '7px monospace');
    const chunks = [];
    for (let i = 0; i < parts.length; i += 4) chunks.push(parts.slice(i, i + 4).join(' '));
    const lines = chunks.map(t => ({ who: l.kind === 'stone' ? 'stone' : 'page', text: t }));
    if (l.sign) lines[lines.length - 1].text += '  ' + l.sign;
    startDialogue(lines, () => { if (onSave) onSave(getSaveData()); });
  }
  const CAMP = { start: 3590, tent: 3625, fire: 3700, log: 3738, bram: 3800, cart: 3842, sign: 3912 };
  function restAtFire() {
    stats.health = stats.maxHealth; stats.stamina = stats.maxStamina;
    story.rested = true;
    sfx('fire'); padRumble(0.1, 0.2, 200);
    notice = 'You rest by the fire. Health restored and game saved.'; noticeUntil = time + 2.6;
    restFlash = time;
    if (onSave) onSave(getSaveData());
  }
  let restFlash = -10;
  function enterHollow() {
    platformScene = 'hollow';
    story.hollowEntered = true;
    sidePlayer.x = 130; sidePlayer.y = SIDE_GROUND_Y; sidePlayer.vx = 0; sidePlayer.vy = 0; sidePlayer.onGround = true; sidePlayer.facing = 1;
    sideCameraX = 0; pickups.length = 0; bossWaves.length = 0;
    loadSceneMobs('hollow');
    dad = story.dadFound ? { x: 3060, dir: -1, state: 'idle', t: 0 } : null;
    sfx('creak'); keys.clear();
    sceneTitle = { text: 'THE HOLLOW', sub: 'Where the moon fell', t: time };
    if (!story.hollowSeen) {
      story.hollowSeen = true;
      setTimeout(() => {
        if (platformScene !== 'hollow' || dialogue) return;
        startDialogue([
          { who: 'rowan', text: "It's freezing in here... and the moon looks wrong. Too big. Too close." },
          { who: 'rowan', text: "Dad's footprints keep going. Stay sharp, Rowan." }
        ]);
      }, 1600);
    }
    if (onSave) onSave(getSaveData());
  }
  function leaveHollow() {
    if (bossFight) endBossFight(false);
    platformScene = 'forest';
    sidePlayer.x = CAMP.sign - 30; sidePlayer.y = SIDE_GROUND_Y; sidePlayer.vx = 0; sidePlayer.vy = 0; sidePlayer.onGround = true; sidePlayer.facing = -1;
    sideCameraX = clamp(sidePlayer.x - canvas.width * 0.43, 0, FOREST_SIDE_WIDTH - canvas.width);
    pickups.length = 0; dad = null;
    loadSceneMobs('forest');
    sfx('creak'); keys.clear();
    sceneTitle = { text: "BRAM'S CAMP", sub: 'Edge of the woodland', t: time };
    if (onSave) onSave(getSaveData());
  }
  function safeZone() {
    return (platformScene === 'forest' && sidePlayer.x > CAMP.start - 10) || (platformScene === 'hollow' && sidePlayer.x < 200);
  }
  let sceneTitle = null;
  function updateStory(dt) {
    if (platformScene === 'forest') {
      if (!story.campReached && sidePlayer.x > CAMP.start) {
        story.campReached = true;
        sceneTitle = { text: "BRAM'S CAMP", sub: 'Edge of the woodland', t: time };
        if (onSave) onSave(getSaveData());
      }
      if (!story.metBram && sidePlayer.x > CAMP.fire + 30 && sidePlayer.onGround) {
        story.metBram = true;
        startDialogue([
          { who: 'bram', text: "Whoa there! Put the sword down, I'm no goblin. Name's Bram. I keep this fire burning for anyone fool enough to travel the deep wood." },
          { who: 'bram', text: "That armor... you're Aldric's kid. He came through three days ago, heading into the Hollow. Didn't come back out." },
          { who: 'rowan', text: "Then that's where I'm going." },
          { who: 'bram', text: "Thought you'd say that. Rest by the fire, and bring me anything you loot. I'll trade fair. The Hollow is just past my sign." }
        ]);
      }
    } else if (platformScene === 'hollow') {
      if (!story.bossDefeated && !bossFight && sidePlayer.x > BOSS_ARENA.trigger && sidePlayer.deadTime <= 0) startBossIntro();
      updateBossOutro(dt);
      updateDad(dt);
    }
  }

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
  function drawLoreSpots() {
    LORE.forEach(l => {
      if (l.scene !== platformScene) return;
      const gy = SIDE_GROUND_Y, found = story.pages.includes(l.id);
      const pulse = 0.5 + Math.sin(time * 3 + l.x) * 0.5;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const col = l.kind === 'stone' ? '120,180,255' : '255,220,140';
      const g = ctx.createRadialGradient(l.x, gy - 12, 1, l.x, gy - 12, 26);
      g.addColorStop(0, 'rgba(' + col + ',' + (found ? 0.08 : 0.22 + pulse * 0.15) + ')'); g.addColorStop(1, 'rgba(' + col + ',0)');
      ctx.fillStyle = g; ctx.fillRect(l.x - 28, gy - 40, 56, 44); ctx.restore();
      if (l.kind === 'stone') {
        ctx.fillStyle = '#26262e'; ctx.fillRect(l.x - 9, gy - 26, 18, 26); ctx.fillRect(l.x - 7, gy - 29, 14, 3);
        ctx.fillStyle = '#4a4a56'; ctx.fillRect(l.x - 8, gy - 27, 15, 26);
        ctx.fillStyle = '#5c5c6a'; ctx.fillRect(l.x - 8, gy - 27, 4, 26);
        ctx.fillStyle = '#3a6a40'; ctx.fillRect(l.x - 9, gy - 4, 6, 4); ctx.fillRect(l.x + 5, gy - 6, 4, 6);
        ctx.fillStyle = found ? '#6a8ab8' : 'rgba(150,210,255,' + (0.6 + pulse * 0.4) + ')';
        [[-3, -22, 1, 6], [-3, -22, 5, 1], [1, -19, 1, 4], [-4, -13, 7, 1], [-1, -11, 1, 5], [2, -9, 1, 2]].forEach(([a, b, c, d]) => ctx.fillRect(l.x + a, gy + b, c, d));
      } else {
        const fl = Math.round(Math.sin(time * 4 + l.x) * 1);
        ctx.fillStyle = '#5a3a24'; ctx.fillRect(l.x - 6, gy - 3, 12, 3);
        ctx.fillStyle = '#e9dcbc'; ctx.fillRect(l.x - 5, gy - 6 + fl, 10, 4);
        ctx.fillStyle = '#a89c84'; ctx.fillRect(l.x - 3, gy - 5 + fl, 6, 1);
        if (!found) { ctx.fillStyle = '#ffe9a0'; ctx.fillRect(l.x - 1, gy - 14 - Math.round(pulse * 3), 2, 4); ctx.fillRect(l.x - 1, gy - 8 - Math.round(pulse * 3), 2, 1); }
      }
    });
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
    HOLLOW_SIDE_PLATFORMS.slice(1).forEach(pl => {
      if (pl.x > sideCameraX + W || pl.x + pl.w < sideCameraX) return;
      if (!imgReady(hollowArt.log)) { ctx.fillStyle = '#4a2c1a'; ctx.fillRect(pl.x, pl.y, pl.w, pl.h); return; }
      const top = pl.y - 7;
      ctx.drawImage(hollowArt.log, 0, 0, 40, 40, pl.x - 6, top, 40, 40);
      for (let x = pl.x + 34; x < pl.x + pl.w - 34; x += 32) ctx.drawImage(hollowArt.log, 80, 0, Math.min(32, pl.x + pl.w - 34 - x), 40, x, top, Math.min(32, pl.x + pl.w - 34 - x), 40);
      ctx.drawImage(hollowArt.log, 152, 0, 40, 40, pl.x + pl.w - 34, top, 40, 40);
    });
    // Entrance arch back to the forest and the King's throne in the arena.
    drawSignpost(70, 'FOREST', -1);
    drawThrone(3150);
    drawLoreSpots();
    drawDad();
    drawSideMobs();
    drawSidePlayer();
    drawCombatFx();
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
    drawSideOverlays('THE HOLLOW');
  }
  function drawThrone(x) {
    const gy = SIDE_GROUND_Y;
    ctx.fillStyle = '#1a1220'; ctx.fillRect(x - 22, gy - 58, 44, 58);
    ctx.fillStyle = '#3a2a3a'; ctx.fillRect(x - 20, gy - 56, 40, 56);
    ctx.fillStyle = '#2a1e2a'; ctx.fillRect(x - 14, gy - 50, 28, 30);
    ctx.fillStyle = '#d8cfb4'; [-20, -10, 0, 10, 18].forEach((o, i) => { ctx.fillRect(x + o, gy - 62 - (i % 2) * 5, 3, 8); ctx.fillRect(x + o - 1, gy - 63 - (i % 2) * 5, 5, 3); });
    ctx.fillStyle = '#4a3a4a'; ctx.fillRect(x - 24, gy - 20, 48, 6);
    ctx.fillStyle = '#7a4cc0'; ctx.fillRect(x - 2, gy - 46, 4, 4);
    ctx.fillStyle = 'rgba(200,160,255,' + (0.4 + Math.sin(time * 3) * 0.3) + ')'; ctx.fillRect(x - 1, gy - 45, 2, 2);
  }

  // Shared screen-space overlays for the outdoor scenes.
  function drawSideOverlays(label) {
    const W = canvas.width;
    if (sidePlayer.deadTime > 0 && sidePlayer.deadTime < 0.7) {
      ctx.fillStyle = 'rgba(0,0,0,' + (1 - sidePlayer.deadTime / 0.7) + ')'; ctx.fillRect(0, 0, W, canvas.height);
    }
    if (time - restFlash < 1.2) { ctx.fillStyle = 'rgba(255,190,100,' + (0.3 * (1 - (time - restFlash) / 1.2)) + ')'; ctx.fillRect(0, 0, W, canvas.height); }
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
    ctx.fillText(inputMode === 'pad' ? '✕ JUMP  □ ATTACK  △ BAG  TOUCHPAD QUICK ITEM  (□ IN AIR = PLUNGE)' : 'A/D MOVE  SPACE JUMP  J ATTACK  H QUICK ITEM  I BAG  (J IN AIR = PLUNGE)', 4, 236);
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
        ctx.fillStyle = platformScene === 'hollow' ? '#c9a8ff' : '#ffe3a1'; ctx.fillText(sceneTitle.text, 160, 83);
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
      ctx.fillStyle = '#ffe3a1'; ctx.font = 'bold 5px monospace'; ctx.textAlign = 'left'; ctx.fillText(inputMode === 'pad' ? 'TP' : 'H', 144, 10);
      if (time - invUseFlash < 0.3) { ctx.fillStyle = 'rgba(155,227,122,.5)'; ctx.fillRect(142, 4, 22, 22); }
      ctx.textAlign = 'left'; ctx.font = '6px monospace';
    }
    if (comboTimer > 0 || (sidePlayer.atk && sidePlayer.atk.name !== 'slash1')) {
      const step = sidePlayer.atk ? ({ slash1: 1, slash2: 2, finisher: 3, thrust: 1, air: 1 })[sidePlayer.atk.name] : ({ slash1: 1, slash2: 2 })[lastMove] || 0;
      if (step >= 2) { ctx.fillStyle = '#ffe3a1'; ctx.font = 'bold 8px monospace'; ctx.textAlign = 'left'; ctx.fillText(step + ' HIT' + (step === 3 ? '!' : ''), 8, 48); }
    }
    if (levelUpUntil > time) {
      const a = Math.min(1, (levelUpUntil - time) / 0.5);
      ctx.globalAlpha = a; ctx.textAlign = 'center';
      ctx.font = 'bold 14px monospace'; ctx.fillStyle = '#2a1a12'; ctx.fillText('LEVEL UP', 161, 71);
      ctx.fillStyle = '#ffe3a1'; ctx.fillText('LEVEL UP', 160, 70);
      ctx.font = '7px monospace'; ctx.fillStyle = '#f7e9c7'; ctx.fillText('MAX HP +4   STR +1', 160, 82);
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
    if (platformScene === 'house') drawSideInterior();
    else if (platformScene === 'hollow') drawSideHollow();
    else drawSideForest();
    drawSideHUD();
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
      notice = platformScene === 'hollow' ? 'Only cold mist here.' : 'The path continues through the trees.';
      noticeUntil = time + 1.6;
    }
  }

  function update(dt) {
    updateMusic(dt);
    if (paused) return;
    if (introActive) {
      introTime += dt;
      if (introTime >= 17.2 && !introWolfHowlOne) { introWolfHowlOne = true; introWolfHowlAudioOne.pause(); introWolfHowlAudioOne.currentTime = 0; }
      // This recording is an environmental howl from beyond the visible wolves, not from the wolf on the right.
      if (introTime >= 21.4 && !introWolfHowlTwo) { introWolfHowlTwo = true; playIntroWolfAudio(introWolfHowlAudioTwo, 0.18, 0.92); }
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
      ctx.fillStyle = '#eadbb3'; ctx.fillRect(69, 72, 182, 92);
      ctx.fillStyle = '#76553d'; ctx.strokeStyle = '#c79b5d'; ctx.lineWidth = 1;
      ctx.strokeRect(69.5, 72.5, 181, 91);
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
    if (def.type !== 'KEY ITEM') opts.push('DROP');
    opts.push('CANCEL');
    return opts;
  }
  function consumeItem(key, fromQuick) {
    const def = ITEM_DEFS[key];
    if (!def || !(inventory[key] > 0)) { sfx('uiError'); notice = 'Nothing in your quick slot.'; noticeUntil = time + 1.4; return false; }
    if (!def.heal) { notice = def.name + ' cannot be used right now.'; noticeUntil = time + 1.6; sfx('uiError'); invShake = time; return false; }
    if (stats.health >= stats.maxHealth) { notice = 'You are already at full health.'; noticeUntil = time + 1.6; sfx('uiError'); invShake = time; return false; }
    const before = stats.health;
    stats.health = Math.min(stats.maxHealth, stats.health + def.heal);
    if (def.heal >= 999) stats.stamina = stats.maxStamina;
    inventory[key]--;
    notice = 'Used ' + def.name + ' (+' + (stats.health - before) + ' HP)'; noticeUntil = time + 1.8;
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
      const fallback = ['berries', 'bread', 'fish', 'tonic'].find(k => inventory[k] > 0);
      if (!fallback) { notice = 'No food or tonics left.'; noticeUntil = time + 1.4; sfx('uiError'); return; }
      quickSlot = fallback;
    }
    consumeItem(quickSlot, true);
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
    } else sfx('uiError');
  }
  function toggleWeapon() {
    if (!equipment.armor) { sfx('uiError'); return; }
    if (!(inventory.boneblade > 0)) { notice = 'You only have the Knight Sword.'; noticeUntil = time + 1.6; sfx('uiError'); invShake = time; return; }
    equipment.weapon = equipment.weapon === 'boneblade' ? 'sword' : 'boneblade';
    sfx('draw'); invSwing = time;
    notice = (equipment.weapon === 'boneblade' ? 'Bone Blade' : 'Knight Sword') + ' equipped.'; noticeUntil = time + 1.6;
    if (onSave) onSave(getSaveData());
  }
  function runItemOption(opt) {
    const key = invMenu.key, def = ITEM_DEFS[key];
    invMenu = null;
    if (opt === 'USE') consumeItem(key, false);
    else if (opt === 'EQUIP' || opt === 'UNEQUIP') toggleWeapon();
    else if (opt === 'SET QUICK') { quickSlot = key; sfx('uiConfirm'); notice = def.name + ' set to quick slot.'; noticeUntil = time + 1.6; }
    else if (opt === 'CLEAR QUICK') { quickSlot = null; sfx('uiBack'); }
    else if (opt === 'INSPECT') { invInspect = { key, t: time }; sfx('bookOpen'); }
    else if (opt === 'DROP') {
      if (key === 'boneblade' && equipment.weapon === 'boneblade' && inventory.boneblade <= 1) equipment.weapon = 'sword';
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
      col = clamp(col + dx, 0, cols - 1); row = clamp(row + dy, 0, 2);
      const next = row * cols + col;
      invSel = Math.min(next, count - 1);
      const key = ownedItems()[invSel]; if (key) newItems.delete(key);
    } else if (invTab === 1) {
      gearSel = clamp(gearSel + dy + dx, 0, 3);
    } else if (invTab === 4) {
      loreSel = clamp(loreSel + dy + dx, 0, LORE.length - 1);
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
    if (introActive || paused) return;
    const p = canvasPoint(e);
    const inside = (x, y, w, h) => p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + h;
    if (dialogue) { advanceDialogue(); e.preventDefault(); return; }
    if (panel === 'shop') {
      SHOP_ITEMS.forEach((it, i) => { if (inside(66, 76 + i * 20, 188, 18)) { if (shopSel === i) buyShopItem(i); else { shopSel = i; sfx('uiMove'); } } });
      e.preventDefault(); return;
    }
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
      if (inside(INV_TAB_X0 + i * (INV_TAB_W + 2), 17, INV_TAB_W, 14)) { if (invTab !== i) { invTab = i; sfx('uiTab'); } return; }
    }
    if (invTab === 0) {
      const items = ownedItems();
      for (let i = 0; i < items.length; i++) {
        const r = itemSlotRect(i);
        if (inside(r.x, r.y, r.w, r.h)) { if (invSel === i) useSelectedItem(); else { invSel = i; newItems.delete(items[i]); sfx('uiMove'); } return; }
      }
    } else if (invTab === 1) {
      for (let i = 0; i < 4; i++) if (inside(120, 42 + i * 33, 182, 30)) { if (gearSel === i) useSelectedItem(); else { gearSel = i; sfx('uiMove'); } return; }
    } else if (invTab === 4) {
      for (let i = 0; i < LORE.length; i++) if (inside(120, 42 + i * 12, 182, 11)) { if (loreSel === i) useSelectedItem(); else { loreSel = i; sfx('uiMove'); } return; }
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
      invText(name, x + tabW / 2, 27, active ? '#2a1a12' : '#a99f9a', 'bold 6px monospace', 'center');
      if (i === 4 && story.pages.some(id => !loreSeen.has(id))) { ctx.fillStyle = '#ff5a4a'; ctx.fillRect(x + tabW - 4, 18, 3, 3); }
    });
    const pad = inputMode === 'pad';
    invText(pad ? 'L1' : 'Q', tabX0 - 3, 27, '#8f8478', '6px monospace', 'right');
    invText(pad ? 'R1' : 'R', tabX0 + 5 * (tabW + 2), 27, '#8f8478', '6px monospace', 'left');
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
    else drawLoreTab(RX, RY, RW);
    if (invMenu) drawItemMenu();

    // Footer hints.
    ctx.fillStyle = '#0f0c13'; ctx.fillRect(116, 211, W - 132, 14);
    const acts = invTab === 0 || invTab === 4 || (invTab === 1 && gearSel === 3);
    const hint = invMenu ? (pad ? '✥ CHOOSE   ✕ OK   ○ BACK' : 'ARROWS CHOOSE   E OK   X BACK')
      : pad ? (acts ? '✥ SELECT  ✕ ' + (invTab === 4 ? 'READ' : 'ACTIONS') + '  □ SWING  ○ CLOSE' : 'L1/R1 TAB   □ SWING   ○ CLOSE')
      : (acts ? 'ARROWS  E ' + (invTab === 4 ? 'READ' : 'ACTIONS') + '  J SWING  Q/R TAB  I CLOSE' : 'Q/R TAB   J SWING   I / ESC CLOSE');
    invText(hint, 116 + (W - 132) / 2, 221, '#c9bca6', '6px monospace', 'center');
    if (invInspect) drawInspect();
    ctx.restore();
  }

  const INV_TAB_W = 34, INV_TAB_X0 = 120;
  const loreSeen = new Set();
  function itemSlotRect(i) {
    const cols = 6, slot = 28, gap = 3, x = 118, w = 186, y = 40;
    const gx = x + Math.floor((w - (cols * slot + (cols - 1) * gap)) / 2);
    return { x: gx + (i % cols) * (slot + gap), y: y + 2 + Math.floor(i / cols) * (slot + gap), w: slot, h: slot };
  }
  function drawItemsTab(x, y, w) {
    const items = ownedItems();
    invSel = clamp(invSel, 0, Math.max(0, items.length - 1));
    const slot = 28;
    for (let i = 0; i < 18; i++) {
      const { x: sx, y: sy } = itemSlotRect(i);
      const key = items[i];
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
        const sel = i === invSel;
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
        if (key === 'boneblade' && equipment.weapon === 'boneblade') { ctx.fillStyle = '#71b86c'; ctx.fillRect(sx + slot - 7, sy + 1, 6, 6); invText('E', sx + slot - 6, sy + 6, '#102010', 'bold 5px monospace'); }
      }
    }
    if (items.length) { const r = itemSlotRect(invSel); invCursor(r.x, r.y, r.w, r.h); }
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
    const r = itemSlotRect(invSel);
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
    const blade = equipment.weapon === 'boneblade' && inventory.boneblade > 0;
    const slots = [
      { label: 'HEAD', icon: 'helm', name: 'Steel Helm', stat: 'DEF +1' },
      { label: 'BODY', icon: 'armor', name: "Dad's Armor" + (stats.defUp ? ' +' + stats.defUp : ''), stat: 'DEF +' + (2 + (stats.defUp || 0)) },
      { label: 'LEGS', icon: 'legs', name: 'Iron Greaves', stat: 'SPD  -' },
      { label: 'WEAPON', icon: blade ? 'boneblade' : 'sword', name: (blade ? 'Bone Blade' : 'Knight Sword') + (stats.atkUp ? ' +' + stats.atkUp : ''), stat: 'ATK +' + ((blade ? 3 : 2) + (stats.atkUp || 0)) }
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
      if (i === 3 && on && inventory.boneblade > 0) invText((inputMode === 'pad' ? '✕' : 'E') + ' SWAP', x + w - 10, sy + 9, '#ffe3a1', 'bold 5px monospace', 'right');
      if (i === gearSel) invCursor(x + 2, sy, w - 4, 30);
    });
    invText(on ? (inventory.boneblade > 0 ? 'Swap weapons on the WEAPON slot.' : 'Dad\'s old knight set. It still fits.') : 'Find Dad\'s armor stand in his room.', x + w / 2, y + 144, on ? '#a9c8a0' : '#e8b07a', '6px monospace', 'center');
    if (stats.atkUp || stats.defUp) invText('Bram upgrades: ATK +' + (stats.atkUp || 0) + '  DEF +' + (stats.defUp || 0), x + w / 2, y + 156, '#d6b477', '6px monospace', 'center');
  }

  function drawStatsTab(x, y, w) {
    const rows = [
      ['LEVEL', String(stats.level)],
      ['ATTACK', String(totalAttack())],
      ['DEFENSE', String(totalDefense())],
      ['MONSTERS / GOBLINS', (stats.kills || 0) + ' / ' + (stats.goblinKills || 0)],
      ['STEPS', String(stats.steps)],
      ['PLAY TIME', Math.floor(stats.playTime / 60) + ':' + String(Math.floor(stats.playTime % 60)).padStart(2, '0')]
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
      const ry = y + 60 + i * 17;
      ctx.fillStyle = i % 2 ? '#1d1824' : '#231d2a'; ctx.fillRect(x + 2, ry, w - 4, 15);
      invText(label, x + 10, ry + 10, '#b9ad9c', '7px monospace');
      invText(value, x + w - 10, ry + 10, '#ffe3a1', 'bold 7px monospace', 'right');
    });
  }

  function mainQuestSteps() {
    const inForest = outdoorScene() && !insideHouse;
    return [
      ['Read the note from Dad', dadNoteRead],
      ["Equip Dad's armor", equipment.armor],
      ['Head out into the forest', inForest || (stats.kills || 0) > 0 || story.campReached],
      ['Reach the camp at the far side', story.campReached],
      ['Enter the Hollow', story.hollowEntered],
      ['Defeat the Hollow King', story.bossDefeated],
      ['Find Dad', story.dadFound]
    ];
  }
  function drawQuestTab(x, y, w) {
    const steps = mainQuestSteps();
    invBox(x + 2, y + 2, w - 4, 112, '#201a26', '#4b3d35');
    invText('MAIN QUEST', x + 10, y + 12, '#d6b477', 'bold 6px monospace');
    invText(story.chapterDone ? 'Chapter 1 Complete' : 'Where Did Dad Go?', x + 10, y + 22, '#ffe3a1', 'bold 8px monospace');
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
    invText('Goblin Trouble', x + 10, y + 139, kills >= 5 ? '#9be37a' : '#ffe3a1', 'bold 7px monospace');
    invBar(x + 92, y + 134, w - 134, 4, kills, 5, kills >= 5 ? '#71b86c' : '#e2584f', '#3a1d22');
    invText(kills >= 5 ? 'DONE' : kills + '/5', x + w - 10, y + 139, kills >= 5 ? '#9be37a' : '#f3e7c9', 'bold 6px monospace', 'right');
    invText('Lost Pages', x + 10, y + 153, pages >= LORE.length ? '#9be37a' : '#ffe3a1', 'bold 7px monospace');
    invBar(x + 92, y + 148, w - 134, 4, pages, LORE.length, pages >= LORE.length ? '#71b86c' : '#5fa8ff', '#1d2a3a');
    invText(pages >= LORE.length ? 'DONE' : pages + '/' + LORE.length, x + w - 10, y + 153, pages >= LORE.length ? '#9be37a' : '#f3e7c9', 'bold 6px monospace', 'right');
    invText('Find Dad\'s journal pages and lore stones.', x + 10, y + 163, '#8f8478', '5px monospace');
  }

  function drawLoreTab(x, y, w) {
    invText('JOURNAL & LORE  ' + story.pages.length + '/' + LORE.length, x + 4, y + 0, '#d6b477', 'bold 6px monospace');
    LORE.forEach((entry, i) => {
      const ry = y + 2 + i * 12, found = story.pages.includes(entry.id), sel = i === loreSel;
      ctx.fillStyle = sel ? '#2c2433' : i % 2 ? '#1d1824' : '#231d2a'; ctx.fillRect(x + 2, ry, w - 4, 11);
      drawItemIcon(entry.kind === 'stone' ? 'whetstone' : 'page', x + 4, ry - 1, 1);
      invText(found ? entry.title : '? ? ?', x + 20, ry + 8, found ? (sel ? '#ffe3a1' : '#f3e7c9') : '#5f5662', (sel ? 'bold ' : '') + '6px monospace');
      if (found && !loreSeen.has(entry.id)) { ctx.fillStyle = '#e04848'; ctx.fillRect(x + w - 22, ry + 2, 15, 7); invText('NEW', x + w - 20, ry + 8, '#fff', 'bold 5px monospace'); }
      if (sel) invCursor(x + 2, ry, w - 4, 11);
    });
    const entry = LORE[loreSel], found = entry && story.pages.includes(entry.id);
    const by = y + 2 + LORE.length * 12 + 4;
    invBox(x + 2, by, w - 4, 166 - (by - y), '#201a26', '#4b3d35');
    if (!found) { invText('Not found yet.', x + w / 2, by + 20, '#8f8478', '7px monospace', 'center'); invText(entry.hint, x + w / 2, by + 32, '#6f6670', '6px monospace', 'center'); return; }
    const lines = wrapText(entry.text, w - 18, '6px monospace');
    lines.slice(0, 9).forEach((ln, i) => invText(ln, x + 8, by + 10 + i * 8, '#d9cdb8', '6px monospace'));
    if (lines.length > 9) invText('... ' + (inputMode === 'pad' ? '✕' : 'E') + ' READ ALL', x + w - 8, by + 84, '#ffe3a1', 'bold 5px monospace', 'right');
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
    ctx.fillStyle = '#ffe4ae';
    ctx.fillText('PAUSED', 160, 83);
    ctx.fillStyle = '#a9b6ae';
    ctx.font = '7px monospace';
    ctx.fillText('THE WOODS CAN WAIT', 160, 96);

    const options = ['RESUME', 'SAVE & EXIT TO TITLE'];
    options.forEach((label, i) => {
      const y = 108 + i * 25;
      const selected = i === pauseSelection;
      ctx.fillStyle = selected ? '#d3a56b' : '#302a35';
      ctx.fillRect(78, y, 164, 19);
      ctx.strokeStyle = selected ? '#fff0bf' : '#80604a';
      ctx.lineWidth = 1;
      ctx.strokeRect(78.5, y + 0.5, 163, 18);
      ctx.font = selected ? 'bold 9px monospace' : '9px monospace';
      ctx.fillStyle = selected ? '#241a25' : '#ead9bb';
      ctx.fillText((selected ? '> ' : '') + label, 160, y + 13);
    });

    ctx.fillStyle = '#b7b3ad';
    ctx.font = '6px monospace';
    ctx.fillText(inputMode === 'pad' ? '↑ / ↓ SELECT     ✕ CHOOSE' : '↑ / ↓ SELECT     ENTER CHOOSE', 160, 165);
    ctx.fillText(inputMode === 'pad' ? '○ OR OPTIONS TO RESUME' : 'ESC OR P TO RESUME', 160, 175);
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
      version: 6,
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
      story: { ...story, pages: story.pages.slice() },
      quickSlot,
      newItems: Array.from(newItems),
      loreSeen: Array.from(loreSeen)
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
    Object.assign(story, { campReached: false, hollowEntered: false, hollowSeen: false, metBram: false, rested: false, bossStarted: false, bossDefeated: false, dadFound: false, chapterDone: false, pages: [] });
    dialogue = null; bossFight = null; bossOutro = null; dad = null; bossWaves.length = 0;
    armorTutorialPending = false; armorQuestActive = false; dadNoteRead = false;
    Object.assign(stats, { level: 1, health: 20, maxHealth: 20, stamina: 100, maxStamina: 100, strength: 5, defense: 2, steps: 0, playTime: 0, xp: 0, kills: 0, goblinKills: 0, atkUp: 0, defUp: 0 });
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
      if (saveData.equipment.weapon === 'boneblade') equipment.weapon = 'boneblade';
    }
    if (saveData.story && typeof saveData.story === 'object') {
      Object.keys(story).forEach(k => { if (k !== 'pages' && typeof saveData.story[k] === 'boolean') story[k] = saveData.story[k]; });
      ['hollowSeen', 'metBram', 'rested'].forEach(k => { if (typeof saveData.story[k] === 'boolean') story[k] = saveData.story[k]; });
      if (Array.isArray(saveData.story.pages)) story.pages = saveData.story.pages.filter(id => LORE.some(l => l.id === id));
    }
    if (typeof saveData.quickSlot === 'string' && ITEM_DEFS[saveData.quickSlot]) quickSlot = saveData.quickSlot;
    else if (saveData.quickSlot === null) quickSlot = null;
    if (Array.isArray(saveData.newItems)) saveData.newItems.forEach(k => { if (ITEM_DEFS[k]) newItems.add(k); });
    if (Array.isArray(saveData.loreSeen)) saveData.loreSeen.forEach(k => loreSeen.add(k));
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
    if (saveData.stats && typeof saveData.stats === 'object') {
      Object.keys(stats).forEach(k => {
        if (Number.isFinite(saveData.stats[k])) stats[k] = saveData.stats[k];
      });
      stats.maxHealth = Math.max(1, stats.maxHealth);
      stats.maxStamina = Math.max(1, stats.maxStamina);
      stats.health = clamp(stats.health, 0, stats.maxHealth);
      stats.stamina = clamp(stats.stamina, 0, stats.maxStamina);
    }
    if (Number.isFinite(saveData.stepDistance)) stepDistance = Math.max(0, saveData.stepDistance);
    if (Number.isFinite(saveData.worldClock)) worldClock = ((saveData.worldClock % 1) + 1) % 1;
    // One-time migration: older slots, including earlier version-2 slots,
    // must begin in the kid's bedroom. Later saves preserve the real location.
    if (saveData.houseSpawnMigrated !== true) {
      insideHouse = true;
      interiorPlayer.x = KID_SPAWN.x;
      interiorPlayer.y = KID_SPAWN.y;
      interiorPlayer.facing = KID_SPAWN.facing;
      return;
    }
    insideHouse = saveData.insideHouse === true;
    if (insideHouse) {
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
    if (dialogue && !paused) {
      if (!e.repeat && ['e', 'enter', ' ', 'j', 'k', 'f', 'escape', 'x'].includes(k)) advanceDialogue();
      e.preventDefault(); e.stopPropagation(); return;
    }
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
        pauseSelection = (pauseSelection + 1) % 2;
      } else if (k === 'arrowdown' || k === 's') {
        pauseSelection = (pauseSelection + 1) % 2;
      } else if (k === 'enter' || k === ' ' || k === 'e') {
        if (pauseSelection === 0) {
          paused = false;
          pauseSelection = 0;
        } else {
          const saveData = getSaveData();
          paused = false;
          stop();
          if (onExit) onExit(saveData);
        }
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
    if ((k === 'j' || k === 'k' || k === 'f') && platformMode && outdoorScene()) {
      if (!e.repeat && !panel) sideAttackQueued = true;
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
      if (platformMode && (k === 'arrowup' || k === 'w' || k === ' ') && !e.repeat && !String(e.code || '').startsWith('Pad')) sideJumpQueued = true;
    }
  }

  function onKeyUp(e) { keys.delete(e.key.toLowerCase()); }

  function init(c, exitCallback, saveData = null, saveCallback = null) {
    canvas = c;
    ctx = canvas.getContext('2d');
    onExit = exitCallback;
    onSave = saveCallback;
    saveTimer = 0;
    map = buildMap();
    keys.clear();
    panel = null;
    paused = false;
    pauseSelection = 0;
    notice = '';
    time = 0;
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
    platformScene = saveData && (saveData.platformScene === 'forest' || saveData.platformScene === 'hollow') ? saveData.platformScene : 'house';
    sidePlayer.x = saveData && Number.isFinite(saveData.sideX) ? clamp(saveData.sideX, 20, sideWorldWidth() - 20) : (platformScene === 'house' ? 410 : 72);
    // Never resume mid-arena: start the boss walk-in from the Hollow's last stretch instead.
    if (platformScene === 'hollow' && !story.bossDefeated && sidePlayer.x > BOSS_ARENA.left - 60) sidePlayer.x = BOSS_ARENA.left - 120;
    sidePlayer.y = SIDE_GROUND_Y; sidePlayer.vx = 0; sidePlayer.vy = 0; sidePlayer.onGround = true;
    sidePlayer.facing = 1; sidePlayer.moving = false; sidePlayer.walk = 0;
    dadNoteRead = !!(saveData && saveData.sideNoteRead);
    sideJumpQueued = false; sideAttackQueued = false; sidePlayer.attackTime = 0; sidePlayer.attackCooldown = 0; sidePlayer.hurtTime = 0; sidePlayer.invulnTime = 0; sidePlayer.deadTime = 0; sidePlayer.atk = null;
    combatFx.length = 0; damageNumbers.length = 0; pickups.length = 0; hitStop = 0; screenShake = 0; comboTimer = 0;
    loadSceneMobs(platformScene === 'hollow' ? 'hollow' : 'forest');
    dad = platformScene === 'hollow' && story.dadFound ? { x: 3060, dir: -1, state: 'idle', t: 0 } : null;
    sceneTitle = null;
    sideCameraX = Math.max(0, sidePlayer.x - canvas.width * 0.43);
    insideHouse = platformScene === 'house';
    introActive = !saveData || typeof saveData !== 'object';
    introTime = 0; introSoundChar = 0; introTextSegment = ''; introLastReveal = 0;
    introWolfFleePaths = null;
    introWolfHowlOne = false; introWolfHowlTwo = false; introWolfHowlEcho = false;
    if (introActive) {
      try {
        const AudioCtor = window.AudioContext || window.webkitAudioContext;
        if (AudioCtor) { if (!introAudio) introAudio = new AudioCtor(); if (introAudio.state === 'suspended') introAudio.resume(); }
      } catch (_) {}
    }
    if (introActive) { insideHouse = true; interiorPlayer.x = KID_SPAWN.x; interiorPlayer.y = KID_SPAWN.y; interiorPlayer.facing = KID_SPAWN.facing; }
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keyup', onKeyUp);
    canvas.addEventListener('pointerdown', onCanvasPointer);
    const maxCamX = Math.max(0, MAP_W * TILE - canvas.width);
    const maxCamY = Math.max(0, MAP_H * TILE - canvas.height);
    camX = Math.round(clamp(player.x + 8 - canvas.width / 2, 0, maxCamX));
    camY = Math.round(clamp(player.y + 8 - canvas.height / 2, 0, maxCamY));
  }

  function stop() {
    window.removeEventListener('keydown', onKeyDown, true);
    window.removeEventListener('keyup', onKeyUp);
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
    inputMode = 'pad';
    unlockAudio();
    if (introActive) { finishIntro(); return; }
    if (dialogue && !paused) { if (action === 'primary' || action === 'attack' || action === 'back') advanceDialogue(); return; }
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
        if (pauseSelection === 0) {
          paused = false;
          pauseSelection = 0;
          keys.clear();
        } else {
          const saveData = getSaveData();
          paused = false;
          stop();
          if (onExit) onExit(saveData);
        }
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
      if (inForest) { sideAttackQueued = true; padRumble(0.05, 0.25, 60); }
      return;
    }
    if (action === 'primary') {
      if (inForest && !forestInteractAvailable()) sideJumpQueued = true;
      else interact();
      return;
    }
    if (action === 'inventory') { openPanel('inventory'); return; }
    if (action === 'stats') { if (inForest) useQuickSlot(); else openPanel('stats'); return; }
    // ○ with nothing open does nothing, so it never pauses by accident.
  }
  return { init, update, draw, stop, controllerAction, setInputMode };
})();