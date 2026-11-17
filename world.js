// world.js - Pixelquest overworld
const Overworld = (() => {
  const TILE = 16;
  const MAP_W = 40;
  const MAP_H = 30;
  const SPEED = 60;
  const SOLID = new Set(['T', 'W', 'H', 'R', 'D']);
  const SPAWN = { x: 20, y: 15 };
  const GAME_KEYS = ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'];

  let canvas, ctx, onExit, map = [];
  let time = 0;
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

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

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
    const stride = player.moving ? Math.sign(Math.sin(player.walk)) : 0;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.fillRect(sx + 4, sy + 14, 8, 2);
    ctx.fillStyle = '#2d2d4a';
    ctx.fillRect(sx + 5, sy + 12 + (stride > 0 ? 0 : 1), 2, 2);
    ctx.fillRect(sx + 9, sy + 12 + (stride < 0 ? 0 : 1), 2, 2);
    ctx.fillStyle = '#d9572b';
    ctx.fillRect(sx + 4, sy + 7, 8, 6);
    ctx.fillStyle = '#f2c89b';
    ctx.fillRect(sx + 4, sy + 2, 8, 6);
    ctx.fillStyle = '#4a2c1a';
    ctx.fillRect(sx + 4, sy + 1, 8, 3);
    if (player.facing === 'up') {
      ctx.fillRect(sx + 4, sy + 2, 8, 5);
    } else {
      ctx.fillStyle = '#222';
      if (player.facing === 'down') {
        ctx.fillRect(sx + 6, sy + 5, 1, 1);
        ctx.fillRect(sx + 9, sy + 5, 1, 1);
      } else if (player.facing === 'left') ctx.fillRect(sx + 5, sy + 5, 1, 1);
      else ctx.fillRect(sx + 10, sy + 5, 1, 1);
    }
  }

  function update(dt) {
    time += dt;
    stats.playTime += dt;

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
    ctx.fillText('WASD: WALK  SHIFT: RUN  I: BAG  C: STATS', 4, canvas.height - 3);

    if (notice && time < noticeUntil) {
      ctx.fillStyle = 'rgba(12, 10, 20, 0.88)';
      ctx.fillRect(47, 207, 226, 20);
      ctx.strokeStyle = '#d9b56b'; ctx.strokeRect(47.5, 207.5, 225, 19);
      ctx.fillStyle = '#fff0c8'; ctx.textAlign = 'center'; ctx.font = '8px monospace';
      ctx.fillText(notice, 160, 220);
    }
  }

  function draw() {
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
    drawMailbox();
    drawInteractionPrompt();
    drawFish();
    bunnies.forEach(drawBunny);
    drawPlayer(Math.round(player.x - camX), Math.round(player.y - camY));
    drawHUD();
    drawPanel();
  }

  function interact() {
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
      version: 1,
      x: player.x,
      y: player.y,
      facing: player.facing,
      inventory: { ...inventory },
      stats: { ...stats },
      stepDistance
    };
  }

  function applySave(saveData) {
    // Reset the slot to a clean starting state before applying saved values.
    player.x = SPAWN.x * TILE; player.y = SPAWN.y * TILE; player.facing = 'down';
    inventory.berries = 3; inventory.wood = 0; inventory.fish = 0;
    Object.assign(stats, { level: 1, health: 20, maxHealth: 20, stamina: 100, maxStamina: 100, strength: 5, defense: 2, steps: 0, playTime: 0 });
    stepDistance = 0;
    if (!saveData || typeof saveData !== 'object') return;

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
  }

  function onKeyDown(e) {
    const k = e.key.toLowerCase();
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

  function init(c, exitCallback, saveData = null) {
    canvas = c;
    ctx = canvas.getContext('2d');
    onExit = exitCallback;
    map = buildMap();
    keys.clear();
    panel = null;
    notice = '';
    time = 0;
    bunnies.forEach((b, i) => {
      const starts = [
        [17 * TILE, 10 * TILE], [22 * TILE, 20 * TILE],
        [6 * TILE, 18 * TILE], [36 * TILE, 21 * TILE]
      ];
      b.x = starts[i][0]; b.y = starts[i][1];
      b.vx = 0; b.vy = 0; b.flee = 0;
    });
    applySave(saveData);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    const maxCamX = Math.max(0, MAP_W * TILE - canvas.width);
    const maxCamY = Math.max(0, MAP_H * TILE - canvas.height);
    camX = Math.round(clamp(player.x + 8 - canvas.width / 2, 0, maxCamX));
    camY = Math.round(clamp(player.y + 8 - canvas.height / 2, 0, maxCamY));
  }

  function stop() {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    keys.clear();
  }

  return { init, update, draw, stop };
})();