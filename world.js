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
  const sidePlayer = { x: 410, y: SIDE_GROUND_Y, vx: 0, vy: 0, onGround: true, facing: 1, moving: false, walk: 0, attackTime: 0, attackCooldown: 0, hurtTime: 0, invulnTime: 0, deadTime: 0 };
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
    { x: 3370, y: 154, w: 140, h: 10 },
    { x: 3670, y: 136, w: 126, h: 10 }
  ];
  const sideGoblins = [
    { x: 1370, home: 1370, min: 1280, max: 1470, dir: -1, patrolDir: -1, runUntil: 0, phase: 0, hp: 3, maxHp: 3, attackCooldown: 0, attackTime: 0, attackHit: false, hurtTime: 0, deadTime: 0, dead: false, respawn: 0, moving: false },
    { x: 2760, home: 2760, min: 2660, max: 2860, dir: 1, patrolDir: 1, runUntil: 0, phase: 2.7, hp: 3, maxHp: 3, attackCooldown: 0, attackTime: 0, attackHit: false, hurtTime: 0, deadTime: 0, dead: false, respawn: 0, moving: false }
  ];

  // First-play cinematic: pixel planet, narrated countryside pan, then the bedroom.
  let introActive = false, introTime = 0, introAudio = null, introSoundChar = 0, introTextSegment = '', introLastReveal = 0, introWolfHowlOne = false, introWolfHowlTwo = false, introWolfHowlEcho = false;
  const INTRO_DURATION = 45.5;
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
  // Goblin Scout sheet: five horizontal animation rows, each made of
  // 600x500 cells. The werewolf sheets remain reserved for the intro.
  const goblinScoutSheet = new Image();
  goblinScoutSheet.src = pqAsset('./assets/goblinpack/GoblinScout-Sheet.png');
  const GOBLIN_FRAME_WIDTH = 600;
  const GOBLIN_FRAME_HEIGHT = 500;
  const GOBLIN_ANIMATIONS = {
    idle: { row: 0, frames: 9 },
    attack: { row: 1, frames: 6 },
    hit: { row: 2, frames: 4 },
    walk: { row: 3, frames: 6 },
    death: { row: 4, frames: 9 }
  };

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

  const inventory = { berries: 3, wood: 0, fish: 0 };
  // Dad's armor is a cosmetic outfit set. It is saved with the player and shown in the world and inventory.
  const equipment = { armor: false };
  const stats = { level: 1, health: 20, maxHealth: 20, stamina: 100, maxStamina: 100, strength: 5, defense: 2, steps: 0, playTime: 0 };

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
    ctx.fillText('[ E ] ENTER', x, y + 1);
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
    ctx.fillText('[ E ] INTERACT', x, y + 1);
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
      drawPlayer(Math.round(interiorPlayer.x), Math.round(interiorPlayer.y));
      player.facing = oldFacing; player.moving = oldMoving; player.walk = oldWalk;
    }

    if (introActive || panel) return;
    if (nearDadArmor() && (!nearDadNote() || dadArmorDistance() < dadNoteDistance())) {
      drawHousePrompt(equipment.armor ? 'ARMOR EQUIPPED' : '[ E ] EQUIP ARMOR', DAD_ARMOR.x - 20, 58);
    } else if (nearDadNote()) {
      drawHousePrompt('[ E ] READ NOTE', DAD_NOTE.x, 70);
    } else if (nearFrontDoor()) {
      drawHousePrompt('[ E ] GO OUTSIDE', 160, 178);
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
    return platformScene === 'house' ? HOUSE_SIDE_PLATFORMS : FOREST_SIDE_PLATFORMS;
  }

  function sideWorldWidth() {
    return platformScene === 'house' ? HOUSE_SIDE_WIDTH : FOREST_SIDE_WIDTH;
  }

  function updateSideCamera(dt) {
    const target = clamp(sidePlayer.x - canvas.width * 0.43, 0, Math.max(0, sideWorldWidth() - canvas.width));
    sideCameraX += (target - sideCameraX) * Math.min(1, dt * 7);
  }

  function updatePlatformer(dt) {
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
    if (sidePlayer.deadTime > 0) {
      sidePlayer.deadTime -= dt;
      sidePlayer.vx = 0; sidePlayer.vy = 0;
      if (sidePlayer.deadTime <= 0) {
        sidePlayer.x = 72; sidePlayer.y = SIDE_GROUND_Y; sidePlayer.vx = 0; sidePlayer.vy = 0;
        sidePlayer.onGround = true; sidePlayer.invulnTime = 1.6;
        stats.health = Math.max(1, Math.ceil(stats.maxHealth * 0.65));
        notice = 'You made it back to the forest entrance.'; noticeUntil = time + 2.5;
      }
      sideAttackQueued = false; sideJumpQueued = false; updateSideCamera(dt); return;
    }
    if (armorTutorialPending) {
      sidePlayer.vx = 0; sidePlayer.moving = false;
      sideJumpQueued = false; sideAttackQueued = false;
      updateSideCamera(dt);
      return;
    }

    if (!panel) {
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
      }
      if (sprinting) stats.stamina = Math.max(0, stats.stamina - 20 * dt);
      else stats.stamina = Math.min(stats.maxStamina, stats.stamina + 13 * dt);
      if (sidePlayer.moving) sidePlayer.walk += dt * (sprinting ? 13 : 9);
    } else {
      sidePlayer.vx *= Math.max(0, 1 - dt * 18);
      sidePlayer.moving = false;
    }
    sideJumpQueued = false;
    if (sideAttackQueued && sidePlayer.attackCooldown <= 0 && !panel) {
      sidePlayer.attackTime = 0.34;
      sidePlayer.attackCooldown = 0.52;
      sideAttackQueued = false;
    } else if (sideAttackQueued) sideAttackQueued = false;

    const oldFeet = sidePlayer.y;
    const nextX = clamp(sidePlayer.x + sidePlayer.vx * dt, 16, sideWorldWidth() - 16);
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

    if (platformScene === 'forest') updateForestCombat(dt);
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

  function updateForestCombat(dt) {
    const playerCenterY = sidePlayer.y - 22;
    // The player's swing has a short active window; the hitbox follows facing direction.
    if (sidePlayer.attackTime > 0.12 && sidePlayer.attackTime < 0.27) {
      const hitX = sidePlayer.x + sidePlayer.facing * 39;
      for (const goblin of sideGoblins) {
        if (goblin.dead || goblin.hurtTime > 0.1) continue;
        const dx = goblin.x - hitX;
        const dy = Math.abs((SIDE_GROUND_Y - 23) - playerCenterY);
        if (Math.abs(dx) < 37 && dy < 36 && Math.sign(goblin.x - sidePlayer.x) === sidePlayer.facing) {
          goblin.hp = Math.max(0, goblin.hp - 1);
          goblin.hurtTime = 0.28;
          goblin.moving = false;
          if (goblin.hp <= 0) { goblin.dead = true; goblin.deadTime = 0; goblin.respawn = 7; goblin.attackTime = 0; }
        }
      }
    }
    for (const goblin of sideGoblins) {
      if (goblin.dead) {
        goblin.deadTime += dt; goblin.respawn -= dt;
        if (goblin.respawn <= 0) {
          goblin.dead = false; goblin.deadTime = 0; goblin.hp = goblin.maxHp;
          goblin.x = goblin.home; goblin.attackCooldown = 1.2; goblin.moving = false;
        }
        continue;
      }
      goblin.attackCooldown = Math.max(0, goblin.attackCooldown - dt);
      goblin.attackTime = Math.max(0, goblin.attackTime - dt);
      goblin.hurtTime = Math.max(0, goblin.hurtTime - dt);
      const dx = sidePlayer.x - goblin.x;
      const distance = Math.abs(dx);
      goblin.dir = dx < 0 ? -1 : 1;
      goblin.moving = false;
      if (goblin.hurtTime <= 0 && distance < 230) {
        goblin.runUntil = Math.max(goblin.runUntil, time + 0.25);
        if (distance > 43) {
          goblin.x += goblin.dir * 76 * dt;
          goblin.moving = true;
        } else if (goblin.attackCooldown <= 0 && goblin.attackTime <= 0) {
          goblin.attackTime = 0.56; goblin.attackCooldown = 1.35; goblin.attackHit = false;
        }
      } else if (goblin.hurtTime <= 0) {
        const speed = time < goblin.runUntil ? 90 : 18;
        goblin.dir = goblin.patrolDir;
        goblin.x += goblin.patrolDir * speed * dt;
        goblin.moving = true;
        if (goblin.x < goblin.min) { goblin.x = goblin.min; goblin.patrolDir = 1; goblin.dir = 1; }
        if (goblin.x > goblin.max) { goblin.x = goblin.max; goblin.patrolDir = -1; goblin.dir = -1; }
      }
      // The scout's contact hit activates once near the middle of its attack animation.
      if (goblin.attackTime > 0.22 && goblin.attackTime < 0.34 && !goblin.attackHit) {
        goblin.attackHit = true;
        if (distance < 58 && sidePlayer.invulnTime <= 0 && sidePlayer.deadTime <= 0) {
          stats.health = Math.max(0, stats.health - Math.max(1, 3 - stats.defense));
          sidePlayer.hurtTime = 0.28; sidePlayer.invulnTime = 0.9;
          sidePlayer.vx = -goblin.dir * 78;
          if (stats.health <= 0) { sidePlayer.deadTime = 0.95; sidePlayer.attackTime = 0; notice = 'You were overwhelmed. Returning to the trail...'; noticeUntil = time + 2; }
          else { notice = 'A goblin hit you!'; noticeUntil = time + 1.2; }
        }
      }
      // Keep the player from walking through a living scout; the attack hitbox is separate.
      const bodyGap = sidePlayer.x - goblin.x;
      if (Math.abs(bodyGap) < 22 && Math.abs(sidePlayer.y - SIDE_GROUND_Y) < 8) {
        sidePlayer.x = goblin.x + (bodyGap < 0 ? -22 : 22);
        sidePlayer.vx = 0;
      }
    }
  }

  function drawKnightFrame(sheet, frame, columns, rows, x, y, width = 56, height = 56, flip = false) {
    if (!sheet || !sheet.complete || !sheet.naturalWidth) return false;
    const cellW = sheet.naturalWidth / columns, cellH = sheet.naturalHeight / rows;
    const col = frame % columns, row = Math.floor(frame / columns) % rows;
    const cropX = Math.max(0, Math.floor((cellW - cellH) / 2));
    ctx.save(); ctx.imageSmoothingEnabled = false;
    if (flip) { ctx.translate(x + width, 0); ctx.scale(-1, 1); x = 0; }
    ctx.drawImage(sheet, col * cellW + cropX, row * cellH, Math.min(cellH, cellW), cellH, x, y, width, height);
    ctx.restore(); return true;
  }

  function drawSidePlayer() {
    const x = Math.round(sidePlayer.x);
    const y = Math.round(sidePlayer.y);
    if (equipment.armor && knightSprites.idle && knightSprites.idle.complete && knightSprites.idle.naturalWidth) {
      const sheet = sidePlayer.deadTime > 0 ? knightSprites.death : sidePlayer.hurtTime > 0 ? knightSprites.hurt : sidePlayer.attackTime > 0 ? knightSprites.attacks : !sidePlayer.onGround ? knightSprites.jump : sidePlayer.moving ? knightSprites.run : knightSprites.idle;
      let frame = 0, cols = 2, rows = 4;
      if (sheet === knightSprites.attacks) { cols = 8; rows = 5; frame = Math.min(7, Math.floor((0.34 - sidePlayer.attackTime) / 0.34 * 8)); }
      else if (sheet === knightSprites.death || sheet === knightSprites.hurt) { cols = 2; rows = 2; frame = Math.min(3, Math.floor(time * 7)); }
      else { frame = Math.floor(time * (sheet === knightSprites.run ? 9 : 3)) % 8; }
      if (sidePlayer.facing < 0) {
        drawKnightFrame(sheet, frame, cols, rows, x - 29, y - 57, 58, 58, true);
      } else drawKnightFrame(sheet, frame, cols, rows, x - 29, y - 57, 58, 58, false);
      return;
    }
    if (!playerSheetReady) {
      ctx.fillStyle = 'rgba(0,0,0,.25)';
      ctx.fillRect(x - 9, y - 1, 19, 3);
      ctx.fillStyle = '#342c39'; ctx.fillRect(x - 7, y - 27, 14, 26);
      ctx.fillStyle = '#9d513e'; ctx.fillRect(x - 7, y - 19, 14, 12);
      ctx.fillStyle = '#e0b27a'; ctx.fillRect(x - 6, y - 30, 12, 10);
      ctx.fillStyle = '#292331'; ctx.fillRect(x - 7, y - 31, 13, 4);
      if (equipment.armor) drawKnightArmorOverlay(x - 16, y - 32);
      return;
    }
    const frame = sidePlayer.moving ? Math.floor(sidePlayer.walk * 0.75) % 6 : Math.floor(time * 2) % 2;
    const row = sidePlayer.moving ? 3 : 2;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = 'rgba(0,0,0,.24)';
    ctx.fillRect(x - 8, y - 1, 16, 2);
    if (sidePlayer.facing < 0) {
      ctx.translate(x + 16, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(playerSheet, frame * 32, row * 32, 32, 32, 0, y - 32, 32, 32);
      if (equipment.armor) drawKnightArmorOverlay(0, y - 32);
    } else {
      ctx.drawImage(playerSheet, frame * 32, row * 32, 32, 32, x - 16, y - 32, 32, 32);
      if (equipment.armor) drawKnightArmorOverlay(x - 16, y - 32);
    }
    ctx.restore();
  }

  function drawInventoryCharacterPreview() {
    const x = 62, y = 79;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (equipment.armor && knightSprites.idle && knightSprites.idle.complete && knightSprites.idle.naturalWidth) {
      drawKnightFrame(knightSprites.idle, 0, 2, 4, x + 4, y + 3, 56, 56, false);
    } else if (playerSheetReady) {
      ctx.drawImage(playerSheet, 0, 2 * 32, 32, 32, x, y, 64, 64);
    } else {
      ctx.fillStyle = '#342c39'; ctx.fillRect(x + 18, y + 18, 28, 42);
      ctx.fillStyle = '#e0b27a'; ctx.fillRect(x + 21, y + 5, 22, 17);
      ctx.fillStyle = '#292331'; ctx.fillRect(x + 18, y + 3, 28, 7);
    }
    ctx.restore();
  }

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
    ctx.fillText(dadNoteRead ? (equipment.armor ? 'QUEST COMPLETE: DAD\'S ARMOR EQUIPPED' : 'QUEST: FIND AND EQUIP DAD\'S ARMOR') : 'A/D MOVE  SPACE JUMP  J ATTACK  E INTERACT', 5, 236);

    const noteDistance = Math.hypot(sidePlayer.x - 144, sidePlayer.y - 164);
    const armorDistance = Math.hypot(sidePlayer.x - 181, sidePlayer.y - 164);
    if (Math.abs(sidePlayer.y - 164) < 58 && Math.min(noteDistance, armorDistance) < 43 && noteDistance <= armorDistance) {
      ctx.fillStyle = 'rgba(15,12,24,.97)'; ctx.fillRect(82 - sideCameraX, 176, 124, 16);
      ctx.strokeStyle = '#f4d27b'; ctx.lineWidth = 1; ctx.strokeRect(82.5 - sideCameraX, 176.5, 123, 15);
      ctx.fillStyle = '#fff0bd'; ctx.font = 'bold 7px monospace'; ctx.textAlign = 'center';
      ctx.fillText('[ E / ✕ ] READ DAD\'S NOTE', 144 - sideCameraX, 187);
    } else if (Math.abs(sidePlayer.y - 164) < 58 && armorDistance < 43) {
      ctx.fillStyle = 'rgba(15,12,24,.97)'; ctx.fillRect(119 - sideCameraX, 176, 125, 16);
      ctx.strokeStyle = '#f4d27b'; ctx.lineWidth = 1; ctx.strokeRect(119.5 - sideCameraX, 176.5, 124, 15);
      ctx.fillStyle = '#fff0bd'; ctx.font = 'bold 7px monospace'; ctx.textAlign = 'center';
      ctx.fillText(equipment.armor ? 'ARMOR EQUIPPED' : '[ E / ✕ ] EQUIP ARMOR', 181 - sideCameraX, 187);
    } else if (Math.abs(sidePlayer.x - 930) < 55) {
      ctx.fillStyle = 'rgba(15,12,24,.94)'; ctx.fillRect(875 - sideCameraX, 180, 110, 13);
      ctx.strokeStyle = '#f4d27b'; ctx.strokeRect(875.5 - sideCameraX, 180.5, 109, 12);
      ctx.fillStyle = '#fff0bd'; ctx.font = 'bold 7px monospace'; ctx.textAlign = 'center';
      ctx.fillText('[ E ] ENTER FOREST', 930 - sideCameraX, 189);
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
    } else {
      ctx.fillStyle = '#536b80';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.restore();

    ctx.save();
    ctx.translate(-sideCameraX, 0);
    // The supplied background already contains the forest floor. Only draw
    // the separate raised platforms here; keep the continuous ground invisible.
    FOREST_SIDE_PLATFORMS.slice(1).forEach(drawSidePlatform);

    // Use the uploaded Goblin Scout sheet for every forest enemy. Its rows are
    // idle, attack, hit, walk, and death, with the original frame spacing intact.
    if (goblinScoutSheet.complete && goblinScoutSheet.naturalWidth >= GOBLIN_FRAME_WIDTH * 9) {
      sideGoblins.forEach(goblin => {
        let animation = GOBLIN_ANIMATIONS.idle;
        let frame = Math.floor(time * 2 + goblin.phase) % animation.frames;
        if (goblin.dead) {
          animation = GOBLIN_ANIMATIONS.death;
          frame = Math.min(animation.frames - 1, Math.floor(goblin.deadTime * 7));
        } else if (goblin.hurtTime > 0) {
          animation = GOBLIN_ANIMATIONS.hit;
          frame = Math.min(animation.frames - 1, Math.floor((0.28 - goblin.hurtTime) / 0.28 * animation.frames));
        } else if (goblin.attackTime > 0) {
          animation = GOBLIN_ANIMATIONS.attack;
          frame = Math.min(animation.frames - 1, Math.floor((0.56 - goblin.attackTime) / 0.56 * animation.frames));
        } else if (goblin.moving) {
          animation = GOBLIN_ANIMATIONS.walk;
          const chasing = Math.abs(sidePlayer.x - goblin.x) < 230;
          frame = Math.floor(time * (chasing ? 9 : 5) + goblin.phase) % animation.frames;
        }

        const sourceX = frame * GOBLIN_FRAME_WIDTH + 50;
        const sourceY = animation.row * GOBLIN_FRAME_HEIGHT;
        const drawSize = 72;
        ctx.save();
        ctx.translate(goblin.x, 0);
        ctx.scale(goblin.dir < 0 ? -1 : 1, 1);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(
          goblinScoutSheet,
          sourceX, sourceY, 500, GOBLIN_FRAME_HEIGHT,
          -drawSize / 2, SIDE_GROUND_Y - drawSize, drawSize, drawSize
        );
        ctx.restore();

        if (!goblin.dead) {
          ctx.fillStyle = 'rgba(10,10,18,.78)'; ctx.fillRect(goblin.x - 20, SIDE_GROUND_Y - 75, 40, 5);
          ctx.fillStyle = '#d65b57'; ctx.fillRect(goblin.x - 19, SIDE_GROUND_Y - 74, 38 * (goblin.hp / goblin.maxHp), 3);
        }
      });
    }

    // A quiet trail marker signals the far side without abruptly ending the level.
    ctx.fillStyle = '#4c443b'; ctx.fillRect(3852, 126, 7, 70);
    ctx.fillRect(3918, 126, 7, 70);
    ctx.fillStyle = '#957451'; ctx.fillRect(3858, 133, 61, 26);
    ctx.fillStyle = '#f0d7a5'; ctx.font = '7px monospace'; ctx.textAlign = 'center';
    ctx.fillText('FAR SIDE', 3888, 149);

    drawSidePlayer();
    ctx.restore();

    ctx.fillStyle = 'rgba(10,10,18,.72)';
    ctx.fillRect(218, 4, 98, 17);
    ctx.fillStyle = '#f5e6c8'; ctx.font = '7px monospace'; ctx.textAlign = 'right';
    ctx.fillText('WOODLAND', 311, 15);
    ctx.fillStyle = 'rgba(8,9,16,.72)';
    ctx.fillRect(0, 226, canvas.width, 14);
    ctx.fillStyle = '#f0e5ce'; ctx.font = '7px monospace'; ctx.textAlign = 'left';
    ctx.fillText(dadNoteRead ? (equipment.armor ? 'QUEST COMPLETE: DAD\'S ARMOR EQUIPPED' : 'QUEST: FIND AND EQUIP DAD\'S ARMOR') : 'A / D MOVE    SPACE OR ↑ JUMP    E INTERACT', 5, 236);

    if (sidePlayer.x < 100) {
      ctx.fillStyle = 'rgba(15,12,24,.94)'; ctx.fillRect(6, 180, 102, 13);
      ctx.strokeStyle = '#f4d27b'; ctx.strokeRect(6.5, 180.5, 101, 12);
      ctx.fillStyle = '#fff0bd'; ctx.font = 'bold 7px monospace'; ctx.textAlign = 'center';
      ctx.fillText('[ E ] RETURN HOME', 57, 189);
    } else if (sidePlayer.x > FOREST_SIDE_WIDTH - 170) {
      ctx.fillStyle = 'rgba(15,12,24,.94)'; ctx.fillRect(100, 180, 120, 13);
      ctx.strokeStyle = '#f4d27b'; ctx.strokeRect(100.5, 180.5, 119, 12);
      ctx.fillStyle = '#fff0bd'; ctx.font = 'bold 7px monospace'; ctx.textAlign = 'center';
      ctx.fillText('[ E ] FAR SIDE', 160, 189);
    }
  }

  function drawSideHUD() {
    ctx.fillStyle = 'rgba(9,10,20,.78)';
    ctx.fillRect(4, 4, 132, 27);
    ctx.fillStyle = '#f7e9c7'; ctx.font = '7px monospace'; ctx.textAlign = 'left';
    ctx.fillText('LV ' + stats.level + '   HP ' + stats.health + '/' + stats.maxHealth, 9, 14);
    ctx.fillText('SP', 9, 25);
    drawBar(25, 18, 105, 7, stats.stamina, stats.maxStamina, '#71b86c');
    if (notice && time < noticeUntil) {
      ctx.fillStyle = 'rgba(12,10,20,.9)';
      ctx.fillRect(48, 205, 224, 17);
      ctx.strokeStyle = '#d9b56b'; ctx.strokeRect(48.5, 205.5, 223, 16);
      ctx.fillStyle = '#fff0c8'; ctx.textAlign = 'center'; ctx.font = '7px monospace';
      ctx.fillText(notice, 160, 216);
    }
  }

  function drawPlatformer() {
    if (platformScene === 'house') drawSideInterior();
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
    ctx.fillText('I / BAG / SQUARE', 160, 150);
  }

  function startArmorQuestFromInventory() {
    armorTutorialPending = false;
    armorQuestActive = !equipment.armor;
    panel = 'inventory';
    sidePlayer.vx = 0; sidePlayer.moving = false;
    if (onSave) onSave(getSaveData());
  }

  function closeCurrentPanel() {
    const wasDadNote = panel === 'dad-note';
    panel = null;
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
        panel = 'dad-note';
        dadNoteRead = true;
        if (onSave) onSave(getSaveData());
        return;
      }
      if (nearDadObjects && armorDistance < 43) {
        if (!equipment.armor) {
          const completingArmorQuest = armorQuestActive || dadNoteRead;
          equipment.armor = true;
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

    if (sidePlayer.x < 112) {
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
    } else if (sidePlayer.x > FOREST_SIDE_WIDTH - 170) {
      notice = 'You have reached the far side of the forest.';
      noticeUntil = time + 3;
    } else {
      notice = 'The path continues through the trees.';
      noticeUntil = time + 2;
    }
  }

  function update(dt) {
    if (paused) return;
    if (introActive) {
      introTime += dt;
      if (introTime >= 17.2 && !introWolfHowlOne) { introWolfHowlOne = true; introWolfHowlAudioOne.pause(); introWolfHowlAudioOne.currentTime = 0; }
      // This recording is an environmental howl from beyond the visible wolves, not from the wolf on the right.
      if (introTime >= 21.4 && !introWolfHowlTwo) { introWolfHowlTwo = true; playIntroWolfAudio(introWolfHowlAudioTwo, 0.18, 0.92); }
      if (introTime >= INTRO_DURATION) finishIntro();
      return;
    }
    if (platformMode && platformScene === 'forest') { updatePlatformer(dt); return; }
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
      const speed = keys.has('shift') ? 66 : 46;
      const oldX = interiorPlayer.x, oldY = interiorPlayer.y;
      const nx = oldX + ix * speed * dt;
      const ny = oldY + iy * speed * dt;
      // Resolve each axis separately so hallways stay open and the player can slide along furniture.
      if (!interiorBlocked(nx, oldY)) interiorPlayer.x = nx;
      if (!interiorBlocked(interiorPlayer.x, ny)) interiorPlayer.y = ny;
      interiorPlayer.moving = Math.abs(interiorPlayer.x - oldX) > 0.01 || Math.abs(interiorPlayer.y - oldY) > 0.01;
      if (interiorPlayer.moving) interiorPlayer.walk += dt * (keys.has('shift') ? 15 : 10);
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
    ctx.fillText(panel === 'inventory' ? 'Press I, E, or ESC to close' : panel === 'stats' ? 'Press C, E, or ESC to close' : 'Press E, ENTER, or ESC to close', 160, 190);

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
    ctx.fillText('↑ / ↓ SELECT     ENTER CHOOSE', 160, 165);
    ctx.fillText('ESC OR P TO RESUME', 160, 175);
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
    if (platformMode && platformScene === 'forest') { drawPlatformer(); return; }
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
    if (platformMode && platformScene === 'forest') { interactPlatformer(); return; }
    if (insideHouse) {
      if (nearDadNote() && (!nearDadArmor() || dadNoteDistance() <= dadArmorDistance())) {
        panel = 'dad-note';
        dadNoteRead = true;
        if (onSave) onSave(getSaveData());
        return;
      }
      if (nearDadArmor()) {
        if (!equipment.armor) {
          const completingArmorQuest = armorQuestActive || dadNoteRead;
          equipment.armor = true;
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
        if (platformMode) {
          insideHouse = false;
          platformScene = 'forest';
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
      worldClock
    };
  }

  function applySave(saveData) {
    // Reset the slot to a clean starting state before applying saved values.
    player.x = SPAWN.x * TILE; player.y = SPAWN.y * TILE; player.facing = 'down';
    insideHouse = false;
    interiorPlayer.x = KID_SPAWN.x; interiorPlayer.y = KID_SPAWN.y; interiorPlayer.facing = KID_SPAWN.facing; interiorPlayer.moving = false; interiorPlayer.walk = 0;
    inventory.berries = 3; inventory.wood = 0; inventory.fish = 0;
    equipment.armor = false;
    armorTutorialPending = false; armorQuestActive = false; dadNoteRead = false;
    Object.assign(stats, { level: 1, health: 20, maxHealth: 20, stamina: 100, maxStamina: 100, strength: 5, defense: 2, steps: 0, playTime: 0 });
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
    }
    dadNoteRead = saveData.sideNoteRead === true;
    if (typeof saveData.armorQuestActive === 'boolean') armorQuestActive = saveData.armorQuestActive;
    else armorQuestActive = false;
    armorTutorialPending = saveData.armorTutorialPending === true && !equipment.armor;
    // Older save slots may already have recorded the note read; show the inventory tutorial once after upgrade.
    if (dadNoteRead && !equipment.armor && typeof saveData.armorTutorialPending !== 'boolean' && typeof saveData.armorQuestActive !== 'boolean') {
      armorTutorialPending = true;
    }
    if (saveData.inventory && typeof saveData.inventory === 'object') {
      ['berries', 'wood', 'fish'].forEach(k => {
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
    if (introActive) { finishIntro(); e.preventDefault(); e.stopPropagation(); return; }

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
    if ((k === 'j' || k === 'k' || k === 'f') && platformMode && platformScene === 'forest') {
      if (!e.repeat && !panel) sideAttackQueued = true;
      e.preventDefault(); e.stopPropagation(); return;
    }
    if (k === 'i' || k === 'c') {
      if (e.repeat) return;
      if (k === 'i' && panel === 'dad-note') { closeCurrentPanel(); e.preventDefault(); return; }
      panel = panel === (k === 'i' ? 'inventory' : 'stats') ? null : (k === 'i' ? 'inventory' : 'stats');
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
      if (platformMode && (k === 'arrowup' || k === 'w' || k === ' ') && !e.repeat) sideJumpQueued = true;
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
    platformScene = saveData && saveData.platformScene === 'forest' ? 'forest' : 'house';
    sidePlayer.x = saveData && Number.isFinite(saveData.sideX) ? clamp(saveData.sideX, 20, platformScene === 'house' ? HOUSE_SIDE_WIDTH - 20 : FOREST_SIDE_WIDTH - 20) : (platformScene === 'house' ? 410 : 72);
    sidePlayer.y = SIDE_GROUND_Y; sidePlayer.vx = 0; sidePlayer.vy = 0; sidePlayer.onGround = true;
    sidePlayer.facing = 1; sidePlayer.moving = false; sidePlayer.walk = 0;
    dadNoteRead = !!(saveData && saveData.sideNoteRead);
    sideJumpQueued = false; sideAttackQueued = false; sidePlayer.attackTime = 0; sidePlayer.attackCooldown = 0; sidePlayer.hurtTime = 0; sidePlayer.invulnTime = 0; sidePlayer.deadTime = 0;
    sideGoblins.forEach((goblin, i) => { goblin.x = goblin.home; goblin.hp = goblin.maxHp; goblin.dead = false; goblin.deadTime = 0; goblin.respawn = 0; goblin.attackTime = 0; goblin.attackCooldown = 0.7 + i * 0.4; goblin.hurtTime = 0; goblin.attackHit = false; goblin.patrolDir = i === 0 ? -1 : 1; goblin.dir = goblin.patrolDir; goblin.moving = false; });
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
    const maxCamX = Math.max(0, MAP_W * TILE - canvas.width);
    const maxCamY = Math.max(0, MAP_H * TILE - canvas.height);
    camX = Math.round(clamp(player.x + 8 - canvas.width / 2, 0, maxCamX));
    camY = Math.round(clamp(player.y + 8 - canvas.height / 2, 0, maxCamY));
  }

  function stop() {
    window.removeEventListener('keydown', onKeyDown, true);
    window.removeEventListener('keyup', onKeyUp);
    keys.clear();
  }

  function controllerAction(action) {
    if (introActive) { finishIntro(); return; }

    // Back closes an open panel before it can pause the game.
    if (armorTutorialPending) {
      if (action === 'inventory') startArmorQuestFromInventory();
      return;
    }

    if (panel && action === 'back') {
      closeCurrentPanel();
      return;
    }

    if (paused) {
      if (action === 'back' || action === 'pause') {
        paused = false;
        pauseSelection = 0;
      } else if (action === 'primary') {
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
      return;
    }
    if (action === 'jump') { if (platformMode && !panel && platformScene === 'forest') sideJumpQueued = true; return; }
    if (action === 'attack') { if (platformScene === 'forest' && !panel) sideAttackQueued = true; return; }
    if (action === 'back' || action === 'pause') {
      paused = true;
      pauseSelection = 0;
      panel = null;
      keys.clear();
      return;
    }
    if (battle) {
      if (action === 'primary') battleAction('fight');
      else if (action === 'back') battleAction('run');
      return;
    }
    if (action === 'primary') { if (panel) closeCurrentPanel(); else interact(); }
    else if (action === 'inventory') {
      if (panel === 'dad-note') closeCurrentPanel();
      else if (panel === 'inventory') closeCurrentPanel();
      else panel = 'inventory';
    }
    else if (action === 'stats') panel = panel === 'stats' ? null : 'stats';
    // No unsupported night-toggle action is assigned to a controller button.
  }
  return { init, update, draw, stop, controllerAction };
})();