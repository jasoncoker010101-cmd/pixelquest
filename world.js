// world.js - Pixelquest overworld
const Overworld = (() => {
  const TILE = 16;
  const MAP_W = 40;
  const MAP_H = 30;
  const SPEED = 60;
  const SOLID = new Set(['T', 'W', 'H', 'R', 'D']);
  const SPAWN = { x: 20, y: 15 };
  const GAME_KEYS = ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'];

  let canvas, ctx, onExit, onSave, saveTimer = 0, map = [];
  let time = 0;
  let worldClock = 0.28, wolfSpawned = false, wolfNoticeCooldown = 0;
  const wolves = [];
  const DAY_LENGTH = 180;
  let battle = null;
  const BATTLE_FADE = 0.7;
  // CC0 forest-enemy sprite sheet by Vomdrache (OpenGameArt).
  // The middle cell of row two is the detailed grey wolf used in battles.
  const battleWolfSprite = new Image();
  battleWolfSprite.src = 'https://opengameart.org/sites/default/files/enemies_081719_zp.png';

  let camX = 0, camY = 0;
  let panel = null;
  let notice = '';
  let noticeUntil = 0;
  let stepDistance = 0;
  const keys = new Set();
  const player = { x: SPAWN.x * TILE, y: SPAWN.y * TILE, facing: 'down', moving: false, walk: 0 };
  const inventory = { berries: 3, wood: 0, fish: 0 };
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
  const interiorPlayer = { x: 160, y: 174, facing: 'up', moving: false, walk: 0 };
  const interiorSheet = new Image();
  let interiorSheetReady = false;
  interiorSheet.onload = () => { interiorSheetReady = true; };
  interiorSheet.onerror = () => { interiorSheetReady = false; };
  interiorSheet.src = './assets/kenney-interior-tilemap.png';

  function drawInteriorSprite(col, row, cols, rows, x, y) {
    if (!interiorSheetReady) return;
    const sx = col * 17, sy = row * 17;
    const sw = cols * 17 - 1, sh = rows * 17 - 1;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(interiorSheet, sx, sy, sw, sh, x, y, cols * 16, rows * 16);
    ctx.restore();
  }

  const MAILBOX = { x: 15.4 * TILE, y: 12.4 * TILE };

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
        row.push(border ? 'T' : rand() < 0.05 ? 'F' : 'G');
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
        if (rand() < 0.07) grid[y][x] = 'T';
      }
    }
    return grid;
  }

  function tileAt(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return 'T';
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
    return mailboxBlocked(px, py);
  }

  function interiorBlocked(px, py) {
    const left = px + 3, right = px + 12, top = py + 9, bottom = py + 15;
    // Solid outer shell, central hallway partitions, and furniture footprints.
    const walls = [
      [12,12,308,25], [12,25,25,218], [295,25,308,218],
      [12,218,145,230], [175,218,308,230],
      // Central hallway runs vertically from the front door to the back wall.
      [130,25,140,49], [130,78,140,112],
      [180,25,190,49], [180,78,190,112],
      [130,128,140,151], [130,180,140,218],
      [180,128,190,151], [180,180,190,218],
      // Cross walls separate the four rooms, with generous door openings.
      [25,112,68,122], [100,112,130,122],
      [190,112,220,122], [252,112,295,122]
    ];
    const furniture = [
      [36,39,80,88], [92,35,126,67], [94,70,122,88],
      [191,40,240,80], [253,28,274,69], [276,28,297,69], [238,70,273,91],
      [32,141,56,181], [55,139,123,171], [64,181,113,210],
      [66,176,79,186], [104,176,117,186], [66,204,79,214], [104,204,117,214],
      [196,142,282,179], [209,181,239,209], [250,180,285,213]
    ];
    return walls.concat(furniture).some(([x1,y1,x2,y2]) =>
      left < x2 && right > x1 && top < y2 && bottom > y1
    );
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

  function drawGrass(px, py, h) {
    ctx.fillStyle = '#5b8f3e';
    ctx.fillRect(px, py, TILE, TILE);
    if (h % 3 === 0) {
      ctx.fillStyle = '#4b7a33';
      ctx.fillRect(px + ((h >> 3) % 12), py + ((h >> 5) % 12), 2, 1);
    }
  }

  function drawTile(tile, px, py, tx, ty) {
    const h = Math.abs((tx * 73856093) ^ (ty * 19349663));
    switch (tile) {
      case 'W': {
        ctx.fillStyle = '#2d6ea6';
        ctx.fillRect(px, py, TILE, TILE);
        const wave = Math.floor(Math.sin(time * 2 + tx * 0.8 + ty) * 2);
        ctx.fillStyle = '#5b9bd5';
        ctx.fillRect(px + 2 + (h % 6) + wave, py + 5 + ((h >> 3) % 7), 4, 1);
        break;
      }
      case 'F': {
        drawGrass(px, py, h);
        const colors = ['#f2d74e', '#e8788a', '#ffffff'];
        ctx.fillStyle = colors[h % 3];
        ctx.fillRect(px + 4 + ((h >> 2) % 8), py + 4 + ((h >> 4) % 8), 2, 2);
        break;
      }
      case 'P': {
        ctx.fillStyle = '#c9a66b';
        ctx.fillRect(px, py, TILE, TILE);
        if (h % 2 === 0) {
          ctx.fillStyle = '#b08f57';
          ctx.fillRect(px + ((h >> 2) % 12), py + ((h >> 4) % 12), 2, 2);
        }
        break;
      }
      case 'T': {
        drawGrass(px, py, h);
        ctx.fillStyle = '#6b4423';
        ctx.fillRect(px + 6, py + 10, 4, 6);
        ctx.fillStyle = '#2f6b2a';
        ctx.beginPath(); ctx.arc(px + 8, py + 7, 7, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#3f8a36';
        ctx.beginPath(); ctx.arc(px + 6, py + 5, 2.5, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case 'R': {
        drawGrass(px, py, h);
        ctx.fillStyle = '#7d7d86';
        ctx.beginPath(); ctx.ellipse(px + 8, py + 10, 5, 4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#b5b5be';
        ctx.fillRect(px + 6, py + 8, 2, 1);
        break;
      }
      case 'H':
      case 'D':
        // The building is drawn as one complete house above the ground tiles.
        break;
      default:
        drawGrass(px, py, h);
    }
  }

  function drawHouse() {
    const x = Math.round(HOUSE.x - camX);
    const y = Math.round(HOUSE.y - camY);
    // Ground shadow and foundation
    ctx.fillStyle = 'rgba(20, 14, 12, 0.28)';
    ctx.fillRect(x - 5, y + 67, HOUSE.w + 10, 15);
    ctx.fillStyle = '#6b4933';
    ctx.fillRect(x + 3, y + 23, HOUSE.w - 6, 56);

    // Warm timber walls
    ctx.fillStyle = '#d6a35f';
    ctx.fillRect(x + 8, y + 28, HOUSE.w - 16, 48);
    ctx.fillStyle = '#f0c77f';
    ctx.fillRect(x + 12, y + 31, HOUSE.w - 24, 3);
    ctx.fillStyle = '#9b633b';
    ctx.fillRect(x + 8, y + 44, HOUSE.w - 16, 3);
    ctx.fillRect(x + 8, y + 65, HOUSE.w - 16, 3);
    ctx.fillStyle = '#70432e';
    ctx.fillRect(x + 12, y + 29, 4, 47);
    ctx.fillRect(x + HOUSE.w - 20, y + 29, 4, 47);

    // Gabled roof with layered shingles
    ctx.fillStyle = '#38233f';
    ctx.beginPath();
    ctx.moveTo(x - 8, y + 31);
    ctx.lineTo(x + HOUSE.w / 2, y - 15);
    ctx.lineTo(x + HOUSE.w + 8, y + 31);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#65405e';
    ctx.beginPath();
    ctx.moveTo(x - 2, y + 27);
    ctx.lineTo(x + HOUSE.w / 2, y - 9);
    ctx.lineTo(x + HOUSE.w + 2, y + 27);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#8b5574';
    for (let row = 0; row < 4; row++) {
      const inset = 14 - row * 3;
      const yy = y + row * 8;
      ctx.fillRect(x + inset, yy + 2, HOUSE.w - inset * 2, 2);
    }
    ctx.fillStyle = '#302039';
    ctx.fillRect(x - 7, y + 27, HOUSE.w + 14, 5);

    // Chimney
    ctx.fillStyle = '#78453b';
    ctx.fillRect(x + HOUSE.w - 29, y - 14, 10, 23);
    ctx.fillStyle = '#a96552';
    ctx.fillRect(x + HOUSE.w - 31, y - 16, 14, 4);

    // Windows with bright trim
    [[x + 19, y + 43], [x + HOUSE.w - 36, y + 43]].forEach(([wx, wy]) => {
      ctx.fillStyle = '#70432e'; ctx.fillRect(wx - 2, wy - 2, 18, 17);
      ctx.fillStyle = '#f4d99a'; ctx.fillRect(wx, wy, 14, 13);
      ctx.fillStyle = '#76b8c5'; ctx.fillRect(wx + 2, wy + 2, 10, 9);
      ctx.fillStyle = '#d9f0dc'; ctx.fillRect(wx + 3, wy + 3, 3, 2);
      ctx.fillStyle = '#70432e'; ctx.fillRect(wx + 6, wy, 2, 13); ctx.fillRect(wx, wy + 5, 14, 2);
    });

    // Front door, step, and brass handle
    const doorX = x + HOUSE.w / 2 - 8;
    ctx.fillStyle = '#70432e'; ctx.fillRect(doorX - 2, y + 52, 20, 28);
    ctx.fillStyle = '#8b4f32'; ctx.fillRect(doorX, y + 54, 16, 26);
    ctx.fillStyle = '#bd8050'; ctx.fillRect(doorX + 2, y + 56, 12, 2);
    ctx.fillStyle = '#f4d06a'; ctx.fillRect(doorX + 12, y + 67, 2, 2);
    ctx.fillStyle = '#b18a61'; ctx.fillRect(doorX - 5, y + 79, 26, 4);
    // Small porch canopy
    ctx.fillStyle = '#4b304f'; ctx.fillRect(doorX - 7, y + 49, 30, 4);
    ctx.fillStyle = '#9c6b45'; ctx.fillRect(doorX - 5, y + 52, 2, 27);
    ctx.fillRect(doorX + 19, y + 52, 2, 27);
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

  function drawPlayer(sx, sy) {
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

  function drawHouseInterior() {
    // Four roomy spaces connected by one clear, full-length central hallway.
    ctx.fillStyle = '#160d20';
    ctx.fillRect(0, 0, 320, 240);

    // Continuous timber floor.
    ctx.fillStyle = '#704333'; ctx.fillRect(18, 18, 284, 208);
    ctx.fillStyle = '#c58a57'; ctx.fillRect(25, 25, 270, 193);
    for (let y = 27; y < 218; y += 10) {
      ctx.fillStyle = '#e7b777'; ctx.fillRect(25, y, 270, 2);
      ctx.fillStyle = '#b9794c'; ctx.fillRect(25, y + 2, 270, 6);
      ctx.fillStyle = '#8c533b'; ctx.fillRect(25, y + 8, 270, 2);
      const offset = (Math.floor(y / 10) % 2) * 18;
      for (let x = 30 + offset; x < 294; x += 36) {
        ctx.fillStyle = 'rgba(76,39,31,.25)'; ctx.fillRect(x, y + 3, 1, 5);
        ctx.fillStyle = 'rgba(255,224,170,.2)'; ctx.fillRect(x + 1, y + 3, 1, 4);
      }
    }

    // Room rugs and flooring accents make each room distinct without shrinking it.
    ctx.fillStyle = '#a96d56'; ctx.fillRect(31, 31, 94, 72);
    ctx.fillStyle = '#c58a57'; ctx.fillRect(35, 35, 86, 64);
    ctx.fillStyle = '#49617b'; ctx.fillRect(194, 31, 94, 72);
    ctx.fillStyle = '#b7a28a'; ctx.fillRect(198, 35, 86, 64);
    ctx.fillStyle = '#9b6749'; ctx.fillRect(31, 132, 94, 78);
    ctx.fillStyle = '#bd8056'; ctx.fillRect(35, 136, 86, 70);
    ctx.fillStyle = '#80988d'; ctx.fillRect(194, 132, 94, 78);
    ctx.fillStyle = '#a9b7a5'; ctx.fillRect(198, 136, 86, 70);

    // Open central hallway with the same overhead timber flooring as the rooms.
    ctx.fillStyle = '#c58a57'; ctx.fillRect(141, 27, 38, 190);
    for (let y = 30; y < 216; y += 10) {
      ctx.fillStyle = '#e7b777'; ctx.fillRect(142, y, 36, 2);
      ctx.fillStyle = '#a96845'; ctx.fillRect(142, y + 7, 36, 2);
      const seam = (Math.floor(y / 10) % 2) * 9;
      ctx.fillStyle = 'rgba(76,39,31,.28)';
      ctx.fillRect(150 + seam, y + 2, 1, 5);
      ctx.fillRect(168 - seam, y + 2, 1, 5);
    }
    ctx.fillStyle = '#8b553e'; ctx.fillRect(143, 28, 2, 186); ctx.fillRect(175, 28, 2, 186);

    // Consistent raised timber wall pieces with dark lower trim.
    const wallH = (x, y, w, h = 10) => {
      ctx.fillStyle = '#3a222b'; ctx.fillRect(x, y + 2, w, h);
      ctx.fillStyle = '#704333'; ctx.fillRect(x, y, w, h - 2);
      ctx.fillStyle = '#a96749'; ctx.fillRect(x + 1, y + 1, w - 2, 2);
      ctx.fillStyle = '#d39a61'; ctx.fillRect(x + 2, y + 1, Math.max(0, w - 4), 1);
      ctx.fillStyle = 'rgba(35,18,25,.35)'; ctx.fillRect(x, y + h - 1, w, 2);
    };
    const wallV = (x, y, h, w = 10) => {
      ctx.fillStyle = '#3a222b'; ctx.fillRect(x + 2, y, w, h);
      ctx.fillStyle = '#704333'; ctx.fillRect(x, y, w - 2, h);
      ctx.fillStyle = '#a96749'; ctx.fillRect(x + 1, y + 1, 2, h - 2);
      ctx.fillStyle = '#d39a61'; ctx.fillRect(x + 1, y + 2, 1, h - 4);
      ctx.fillStyle = 'rgba(35,18,25,.35)'; ctx.fillRect(x + w - 1, y, 2, h);
    };

    // Strong, continuous outside walls. The front door is centered at the bottom.
    wallH(12, 12, 296, 14);
    wallV(12, 24, 194, 14); wallV(294, 24, 194, 14);
    wallH(12, 218, 133, 12); wallH(175, 218, 133, 12);

    // Central corridor walls with wide openings into each room.
    wallV(130, 25, 24, 10); wallV(130, 78, 34, 10);
    wallV(180, 25, 24, 10); wallV(180, 78, 34, 10);
    wallV(130, 128, 28, 10); wallV(130, 186, 32, 10);
    wallV(180, 128, 28, 10); wallV(180, 186, 32, 10);

    // Short cross-walls separate front and back rooms, leaving open doorways.
    wallH(25, 112, 43, 10); wallH(100, 112, 30, 10);
    wallH(190, 112, 30, 10); wallH(252, 112, 43, 10);

    // Bedroom: large bed, dresser, bedside chest and window.
    const bed = (x, y, w, h, blanket, pillow) => {
      ctx.fillStyle = '#39242d'; ctx.fillRect(x - 3, y + 3, w + 6, h + 5);
      ctx.fillStyle = '#8b553e'; ctx.fillRect(x - 1, y, w + 2, h + 2);
      ctx.fillStyle = '#e3bd83'; ctx.fillRect(x + 2, y + 2, w - 4, h - 2);
      ctx.fillStyle = blanket; ctx.fillRect(x + 3, y + 13, w - 6, h - 17);
      ctx.fillStyle = '#f7e7c6'; ctx.fillRect(x + 4, y + 4, w - 8, 8);
      ctx.fillStyle = pillow; ctx.fillRect(x + 9, y + 5, w - 18, 5);
      ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.fillRect(x + 5, y + 14, 2, h - 20);
      ctx.fillStyle = '#5b3935'; ctx.fillRect(x, y + h - 1, 4, 4); ctx.fillRect(x + w - 4, y + h - 1, 4, 4);
    };
    bed(39, 42, 38, 43, '#557d62', '#f4d8b4');
    ctx.fillStyle = '#493039'; ctx.fillRect(94, 37, 30, 28);
    ctx.fillStyle = '#b77b57'; ctx.fillRect(96, 39, 26, 24);
    ctx.fillStyle = '#e2b77c'; ctx.fillRect(99, 42, 20, 7);
    ctx.fillStyle = '#70443a'; ctx.fillRect(99, 52, 20, 8);
    ctx.fillStyle = '#f0d092'; ctx.fillRect(108, 55, 3, 3);
    ctx.fillStyle = '#51343a'; ctx.fillRect(96, 73, 23, 12);
    ctx.fillStyle = '#c58a5d'; ctx.fillRect(98, 74, 19, 9);
    // Bedroom window.
    ctx.fillStyle = '#4b2b35'; ctx.fillRect(82, 25, 37, 19);
    ctx.fillStyle = '#f0cf91'; ctx.fillRect(85, 28, 31, 13);
    ctx.fillStyle = '#77aeb5'; ctx.fillRect(88, 30, 25, 9);
    ctx.fillStyle = '#d9e9d7'; ctx.fillRect(90, 31, 8, 3);
    ctx.fillStyle = '#704333'; ctx.fillRect(100, 28, 2, 13);
    ctx.fillStyle = '#9b5b54'; ctx.fillRect(82, 25, 4, 19); ctx.fillRect(115, 25, 4, 19);

    // Living room: sofa, table, shelves and plant arranged around open floor.
    ctx.fillStyle = '#39242d'; ctx.fillRect(194, 43, 44, 34);
    ctx.fillStyle = '#74434a'; ctx.fillRect(196, 45, 40, 30);
    ctx.fillStyle = '#b96e68'; ctx.fillRect(198, 47, 36, 8);
    ctx.fillStyle = '#d99a83'; ctx.fillRect(200, 48, 14, 6); ctx.fillRect(218, 48, 14, 6);
    ctx.fillStyle = '#92545a'; ctx.fillRect(199, 57, 34, 15);
    ctx.fillStyle = '#c98276'; ctx.fillRect(201, 59, 14, 11); ctx.fillRect(217, 59, 14, 11);
    ctx.fillStyle = 'rgba(255,225,205,.2)'; ctx.fillRect(202, 60, 11, 2); ctx.fillRect(218, 60, 11, 2);
    ctx.fillStyle = '#513039'; ctx.fillRect(242, 75, 29, 16);
    ctx.fillStyle = '#9a6143'; ctx.fillRect(240, 72, 29, 15);
    ctx.fillStyle = '#e0b577'; ctx.fillRect(243, 75, 23, 9);
    ctx.fillStyle = '#f2d59b'; ctx.fillRect(251, 78, 7, 3);
    const bookshelf = (x, y) => {
      ctx.fillStyle = '#39242d'; ctx.fillRect(x - 2, y + 2, 20, 35);
      ctx.fillStyle = '#8a5a3b'; ctx.fillRect(x, y, 16, 32);
      ctx.fillStyle = '#d09a60'; ctx.fillRect(x + 1, y + 1, 14, 2);
      const colors = ['#bd6253','#5d7f9e','#d3a34f','#66875d','#a77aab'];
      for (let row = 0; row < 3; row++) {
        ctx.fillStyle = '#4b302b'; ctx.fillRect(x + 2, y + 4 + row * 9, 12, 7);
        for (let k = 0; k < 4; k++) {
          ctx.fillStyle = colors[(k + row * 2) % colors.length];
          ctx.fillRect(x + 3 + k * 3, y + 5 + row * 9, 2, 5);
        }
        ctx.fillStyle = '#d5a36a'; ctx.fillRect(x + 1, y + 11 + row * 9, 14, 1);
      }
    };
    bookshelf(255, 30); bookshelf(278, 30);
    ctx.fillStyle = '#56383a'; ctx.fillRect(264, 76, 13, 10);
    ctx.fillStyle = '#b97858'; ctx.fillRect(266, 74, 9, 10);
    ctx.fillStyle = '#5d884c'; ctx.fillRect(269, 66, 3, 10);
    ctx.fillStyle = '#83ae5e'; ctx.fillRect(263, 67, 7, 4); ctx.fillRect(271, 63, 7, 5);

    // Kitchen: refrigerator, counter, sink, stove and a compact dining set.
    ctx.fillStyle = '#493039'; ctx.fillRect(33, 143, 22, 36);
    ctx.fillStyle = '#879b94'; ctx.fillRect(35, 145, 18, 32);
    ctx.fillStyle = '#cbd5c9'; ctx.fillRect(37, 147, 14, 27);
    ctx.fillStyle = '#e4e7d8'; ctx.fillRect(39, 149, 10, 23);
    ctx.fillStyle = '#78978c'; ctx.fillRect(43, 150, 3, 2);
    ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.fillRect(38, 149, 2, 20);
    ctx.fillStyle = '#5b4038'; ctx.fillRect(35, 176, 18, 3);
    ctx.fillStyle = '#503139'; ctx.fillRect(57, 142, 64, 27);
    ctx.fillStyle = '#a36a49'; ctx.fillRect(59, 144, 60, 23);
    ctx.fillStyle = '#e0ad70'; ctx.fillRect(60, 144, 58, 3);
    ctx.fillStyle = '#704638'; ctx.fillRect(62, 149, 24, 14);
    ctx.fillStyle = '#b5c7bc'; ctx.fillRect(64, 151, 20, 10);
    ctx.fillStyle = '#79a3a5'; ctx.fillRect(66, 153, 16, 6);
    ctx.fillStyle = '#f2d28c'; ctx.fillRect(72, 150, 4, 2);
    ctx.fillStyle = '#44333a'; ctx.fillRect(91, 150, 10, 10); ctx.fillRect(105, 150, 10, 10);
    ctx.fillStyle = '#9a7d65'; ctx.fillRect(93, 152, 6, 6); ctx.fillRect(107, 152, 6, 6);
    ctx.fillStyle = '#d7b47e'; ctx.fillRect(90, 147, 26, 2);
    // Dining table with chairs, kept away from the hallway doorway.
    for (const [cx,cy] of [[69,178],[69,205],[108,178],[108,205]]) {
      ctx.fillStyle = '#493039'; ctx.fillRect(cx, cy, 9, 9);
      ctx.fillStyle = '#b77a50'; ctx.fillRect(cx + 1, cy + 1, 7, 7);
      ctx.fillStyle = '#d7a66b'; ctx.fillRect(cx + 2, cy + 2, 5, 2);
    }
    ctx.fillStyle = '#503139'; ctx.fillRect(67, 184, 43, 23);
    ctx.fillStyle = '#b77a50'; ctx.fillRect(69, 186, 39, 19);
    ctx.fillStyle = '#e0b879'; ctx.fillRect(71, 188, 35, 2);
    ctx.fillStyle = '#a36a49'; ctx.fillRect(72, 192, 33, 10);
    ctx.fillStyle = 'rgba(255,235,190,.18)'; ctx.fillRect(73, 193, 30, 2);

    // Bathroom: tiled floor, full tub, sink, toilet and towel rail.
    for (let y = 137; y < 216; y += 12) for (let x = 194; x < 292; x += 13) {
      ctx.fillStyle = ((x + y) / 13) % 2 < 1 ? '#82968b' : '#91a398';
      ctx.fillRect(x, y, 12, 11);
      ctx.fillStyle = 'rgba(54,70,64,.28)'; ctx.fillRect(x, y + 10, 12, 1);
    }
    ctx.fillStyle = '#493039'; ctx.fillRect(198, 145, 82, 31);
    ctx.fillStyle = '#d8d9ca'; ctx.fillRect(201, 148, 76, 25);
    ctx.fillStyle = '#9fc3bd'; ctx.fillRect(205, 151, 68, 19);
    ctx.fillStyle = '#e7eee1'; ctx.fillRect(209, 153, 60, 13);
    ctx.fillStyle = '#78a7a4'; ctx.fillRect(213, 156, 52, 7);
    ctx.fillStyle = '#f0d28a'; ctx.fillRect(210, 149, 4, 3); ctx.fillRect(269, 149, 4, 3);
    ctx.fillStyle = '#493039'; ctx.fillRect(211, 184, 25, 22);
    ctx.fillStyle = '#e0e3d5'; ctx.fillRect(213, 185, 21, 17);
    ctx.fillStyle = '#9fc4bf'; ctx.fillRect(216, 188, 15, 10);
    ctx.fillStyle = '#493039'; ctx.fillRect(253, 183, 29, 27);
    ctx.fillStyle = '#dedfd0'; ctx.fillRect(256, 186, 23, 21);
    ctx.fillStyle = '#f0eee0'; ctx.fillRect(259, 189, 17, 14);
    ctx.fillStyle = '#8eb5b3'; ctx.fillRect(262, 192, 11, 8);
    ctx.fillStyle = '#b3c9be'; ctx.fillRect(259, 183, 17, 4);

    // Hallway details mounted on the wall edges, not in the walking lane.
    ctx.fillStyle = '#493039'; ctx.fillRect(132, 91, 7, 16);
    ctx.fillStyle = '#d7ad78'; ctx.fillRect(134, 93, 3, 12);
    ctx.fillStyle = '#493039'; ctx.fillRect(181, 91, 7, 16);
    ctx.fillStyle = '#d7ad78'; ctx.fillRect(183, 93, 3, 12);

    // Front entrance door at the end of the central hallway.
    ctx.fillStyle = '#503139'; ctx.fillRect(145, 207, 30, 17);
    ctx.fillStyle = '#a96e48'; ctx.fillRect(148, 207, 24, 14);
    ctx.fillStyle = '#d7a66b'; ctx.fillRect(150, 209, 20, 10);
    ctx.fillStyle = '#f0ca87'; ctx.fillRect(166, 214, 2, 2);

    // Player remains centered in the hall at spawn and can walk straight to the door.
    const oldFacing = player.facing, oldMoving = player.moving, oldWalk = player.walk;
    player.facing = interiorPlayer.facing;
    player.moving = interiorPlayer.moving;
    player.walk = interiorPlayer.walk;
    drawPlayer(Math.round(interiorPlayer.x - 8), Math.round(interiorPlayer.y - 8));
    player.facing = oldFacing; player.moving = oldMoving; player.walk = oldWalk;

    if (Math.hypot(interiorPlayer.x - 160, interiorPlayer.y - 207) < 25) {
      ctx.fillStyle = 'rgba(15,12,24,.94)'; ctx.fillRect(121, 188, 78, 14);
      ctx.strokeStyle = '#f4d27b'; ctx.strokeRect(121.5, 188.5, 77, 13);
      ctx.fillStyle = '#fff0bd'; ctx.font = 'bold 7px monospace'; ctx.textAlign = 'center';
      ctx.fillText('[ E ] OUTSIDE', 160, 198);
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
    ctx.save();ctx.translate(76,108);ctx.scale(4.8,4.8);const oldFacing=player.facing;player.facing='up';drawPlayer(0,0);player.facing=oldFacing;ctx.restore();
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

  function update(dt) {
    time += dt;
    saveTimer += dt;
    if (saveTimer >= 5) {
      saveTimer = 0;
      if (onSave) onSave(getSaveData());
    }
    if (battle) { updateBattle(dt); return; }
    if (insideHouse) {
      stats.playTime += dt;
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
      if (nx > 31 && nx < 289 && !interiorBlocked(nx, oldY)) interiorPlayer.x = nx;
      if (ny > 28 && ny < 213 && !interiorBlocked(interiorPlayer.x, ny)) interiorPlayer.y = ny;
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
    ctx.fillText(panel === 'inventory' ? 'INVENTORY' : 'PLAYER STATS', 160, 57);
    ctx.font = '8px monospace';
    ctx.fillStyle = '#b9b1a5';
    ctx.fillText('Press ' + (panel === 'inventory' ? 'I' : 'C') + ' or ESC to close', 160, 190);

    if (panel === 'inventory') {
      const items = [
        { name: 'Berries', count: inventory.berries, color: '#c94e73', icon: '●' },
        { name: 'Wood', count: inventory.wood, color: '#a66a3d', icon: '▰' },
        { name: 'Fish', count: inventory.fish, color: '#e5c75d', icon: '◆' }
      ];
      items.forEach((item, i) => {
        const col = i % 2, row = Math.floor(i / 2);
        const x = 61 + col * 112, y = 72 + row * 46;
        ctx.fillStyle = '#282638'; ctx.fillRect(x, y, 98, 36);
        ctx.strokeStyle = '#62516d'; ctx.strokeRect(x + 0.5, y + 0.5, 97, 35);
        ctx.fillStyle = item.color; ctx.font = 'bold 16px monospace'; ctx.textAlign = 'center';
        ctx.fillText(item.icon, x + 17, y + 23);
        ctx.fillStyle = '#f3e7c9'; ctx.font = '9px monospace'; ctx.textAlign = 'left';
        ctx.fillText(item.name, x + 31, y + 15);
        ctx.fillStyle = '#f5dca6'; ctx.font = 'bold 10px monospace';
        ctx.fillText('x ' + item.count, x + 31, y + 28);
      });
      ctx.fillStyle = '#a9c8a0'; ctx.font = '8px monospace'; ctx.textAlign = 'center';
      ctx.fillText('More item slots will unlock as you explore.', 160, 169);
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
    if (battle) { drawBattle(); return; }
    if (insideHouse) { drawHouseInterior(); return; }
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

    drawHouse();
    drawHouseDoorPrompt();
    drawMailbox();
    drawInteractionPrompt();
    drawFish();
    bunnies.forEach(drawBunny);
    wolves.forEach(drawWolf);
    drawPlayer(Math.round(player.x-camX),Math.round(player.y-camY));
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
  }

  function interact() {
    if (insideHouse) {
      if (Math.hypot(interiorPlayer.x - 160, interiorPlayer.y - 207) < 28) {
        insideHouse = false;
        player.x = HOUSE_DOOR.x;
        player.y = HOUSE.y + 85;
        player.facing = 'up';
        notice = 'You step outside.';
        noticeUntil = time + 2;
      } else {
        notice = 'The front door is downstairs.';
        noticeUntil = time + 1.8;
      }
      return;
    }
    if (Math.hypot(player.x - HOUSE_DOOR.x, player.y - HOUSE_DOOR.y) < 39) {
      insideHouse = true;
      interiorPlayer.x = 160;
      interiorPlayer.y = 194;
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
      version: 3,
      houseSpawnMigrated: true,
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
    interiorPlayer.x = 160; interiorPlayer.y = 194; interiorPlayer.facing = 'up'; interiorPlayer.moving = false; interiorPlayer.walk = 0;
    inventory.berries = 3; inventory.wood = 0; inventory.fish = 0;
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
      interiorPlayer.x = 160;
      interiorPlayer.y = 194;
      interiorPlayer.facing = 'down';
      return;
    }
    insideHouse = saveData.insideHouse === true;
    if (insideHouse) {
      if (Number.isFinite(saveData.interiorX)) interiorPlayer.x = clamp(saveData.interiorX, 31, 289);
      if (Number.isFinite(saveData.interiorY)) interiorPlayer.y = clamp(saveData.interiorY, 28, 213);
      if (['up', 'down', 'left', 'right'].includes(saveData.interiorFacing)) interiorPlayer.facing = saveData.interiorFacing;
      if (Number.isFinite(saveData.interiorWalk)) interiorPlayer.walk = saveData.interiorWalk;
      if (interiorBlocked(interiorPlayer.x, interiorPlayer.y)) {
        interiorPlayer.x = 160; interiorPlayer.y = 194; interiorPlayer.facing = 'up';
      }
    }
  }

  function onKeyDown(e) {
    const k = e.key.toLowerCase();
    if (battle) {
      if (k === '1' || k === 'enter' || k === ' ') { battleAction('fight'); e.preventDefault(); }
      else if (k === '2' || k === 'escape') { battleAction('run'); e.preventDefault(); }
      return;
    }
    if (k === 'z' || e.code === 'KeyZ') {
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
    if (k === 'escape') {
      e.preventDefault();
      if (panel) { panel = null; return; }
      stop();
      if (onExit) onExit(getSaveData());
      return;
    }
    if (k === 'i' || k === 'c') {
      if (e.repeat) return;
      panel = panel === (k === 'i' ? 'inventory' : 'stats') ? null : (k === 'i' ? 'inventory' : 'stats');
      e.preventDefault();
      return;
    }
    if (k === 'e') {
      if (!panel && !e.repeat) interact();
      e.preventDefault();
      return;
    }
    if (panel) {
      if (k === 'i' || k === 'c') panel = null;
      return;
    }
    if (GAME_KEYS.includes(k) || k === 'shift') {
      keys.add(k);
      if (GAME_KEYS.includes(k)) e.preventDefault();
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
    if (battle) {
      if (action === 'primary') battleAction('fight');
      else if (action === 'back') battleAction('run');
      return;
    }
    if (action === 'primary') { if (panel) panel = null; else interact(); }
    else if (action === 'back') {
      if (panel) panel = null;
      else { stop(); if (onExit) onExit(getSaveData()); }
    } else if (action === 'inventory') panel = panel === 'inventory' ? null : 'inventory';
    else if (action === 'stats') panel = panel === 'stats' ? null : 'stats';
    else if (action === 'night') {
      const alreadyNight = isNight();
      worldClock = 0.80;
      if (!alreadyNight) { wolves.length = 0; wolfSpawned = false; }
      notice = 'Night has fallen...'; noticeUntil = time + 2.5;
    }
  }
  return { init, update, draw, stop, controllerAction };
})();