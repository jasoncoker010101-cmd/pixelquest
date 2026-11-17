// world.js - Pixelquest overworld
const Overworld = (() => {
  const TILE = 16;
  const MAP_W = 40;
  const MAP_H = 30;
  const SPEED = 60; // pixels per second
  const SOLID = new Set(['T', 'W', 'H', 'R']);
  const SPAWN = { x: 20, y: 15 };
  const GAME_KEYS = ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'];

  let canvas, ctx, onExit, map = [];
  let time = 0;
  let camX = 0, camY = 0;
  const keys = new Set();
  const player = {
    x: SPAWN.x * TILE,
    y: SPAWN.y * TILE,
    facing: 'down',
    moving: false,
    walk: 0,
  };

  // Seeded random so the world looks identical every time
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

    const put = (x, y, t) => {
      if (x > 0 && y > 0 && x < MAP_W - 1 && y < MAP_H - 1) grid[y][x] = t;
    };
    const fill = (x0, y0, x1, y1, t) => {
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) put(x, y, t);
    };

    // Lake
    fill(26, 6, 34, 12, 'W');
    [[25, 7], [25, 11], [35, 9], [28, 13], [30, 13]].forEach(([x, y]) => put(x, y, 'R'));

    // Village house with a door
    fill(8, 8, 14, 12, 'H');
    put(11, 12, 'D');

    // Roads
    fill(2, 15, 37, 15, 'P');   // east-west road
    fill(11, 13, 11, 14, 'P');  // path from house to road
    fill(20, 16, 20, 27, 'P');  // south road

    // Scatter trees, keeping the spawn area clear
    for (let y = 1; y < MAP_H - 1; y++) {
      for (let x = 1; x < MAP_W - 1; x++) {
        const t = grid[y][x];
        if (t !== 'G' && t !== 'F') continue;
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

  // Collision uses a small box at the player's feet
  function blocked(px, py) {
    const left = px + 3, right = px + 12, top = py + 9, bottom = py + 15;
    return [[left, top], [right, top], [left, bottom], [right, bottom]].some(
      ([x, y]) => SOLID.has(tileAt(Math.floor(x / TILE), Math.floor(y / TILE)))
    );
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function update(dt) {
    time += dt;

    let dx = 0, dy = 0;
    if (keys.has('arrowleft') || keys.has('a')) dx -= 1;
    if (keys.has('arrowright') || keys.has('d')) dx += 1;
    if (keys.has('arrowup') || keys.has('w')) dy -= 1;
    if (keys.has('arrowdown') || keys.has('s')) dy += 1;

    player.moving = dx !== 0 || dy !== 0;
    if (dx && dy) { dx *= Math.SQRT1_2; dy *= Math.SQRT1_2; }

    if (dy < 0) player.facing = 'up';
    else if (dy > 0) player.facing = 'down';
    else if (dx < 0) player.facing = 'left';
    else if (dx > 0) player.facing = 'right';

    const step = SPEED * dt;
    if (dx) {
      const nx = player.x + dx * step;
      if (!blocked(nx, player.y)) player.x = nx;
    }
    if (dy) {
      const ny = player.y + dy * step;
      if (!blocked(player.x, ny)) player.y = ny;
    }
    if (player.moving) player.walk += dt * 10;

    // Camera follows the player and stops at the map edges
    const maxCamX = Math.max(0, MAP_W * TILE - canvas.width);
    const maxCamY = Math.max(0, MAP_H * TILE - canvas.height);
    camX = Math.round(clamp(player.x + 8 - canvas.width / 2, 0, maxCamX));
    camY = Math.round(clamp(player.y + 8 - canvas.height / 2, 0, maxCamY));
  }

  function grass(px, py, h) {
    ctx.fillStyle = '#5b8f3e';
    ctx.fillRect(px, py, TILE, TILE);
    if (h % 3 === 0) {
      ctx.fillStyle = '#4b7a33';
      ctx.fillRect(px + ((h >> 3) % 12), py + ((h >> 5) % 12), 2, 1);
    }
  }

  function drawTile(t, px, py, tx, ty) {
    const h = Math.abs((tx * 73856093) ^ (ty * 19349663));

    switch (t) {
      case 'W': {
        ctx.fillStyle = '#2d6ea6';
        ctx.fillRect(px, py, TILE, TILE);
        const wave = Math.floor(Math.sin(time * 2 + tx * 0.8 + ty) * 2);
        ctx.fillStyle = '#5b9bd5';
        ctx.fillRect(px + 2 + (h % 6) + wave, py + 5 + ((h >> 3) % 7), 4, 1);
        break;
      }
      case 'F': {
        grass(px, py, h);
        const colors = ['#f2d74e', '#e8788a', '#ffffff'];
        const fx = px + 4 + ((h >> 2) % 8);
        const fy = py + 4 + ((h >> 4) % 8);
        ctx.fillStyle = colors[h % 3];
        ctx.fillRect(fx, fy, 2, 2);
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
        grass(px, py, h);
        ctx.fillStyle = '#6b4423';
        ctx.fillRect(px + 6, py + 10, 4, 6);
        ctx.fillStyle = '#2f6b2a';
        ctx.beginPath();
        ctx.arc(px + 8, py + 7, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#3f8a36';
        ctx.beginPath();
        ctx.arc(px + 6, py + 5, 2.5, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'R': {
        grass(px, py, h);
        ctx.fillStyle = '#7d7d86';
        ctx.beginPath();
        ctx.ellipse(px + 8, py + 10, 5, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#b5b5be';
        ctx.fillRect(px + 6, py + 8, 2, 1);
        break;
      }
      case 'H': {
        ctx.fillStyle = '#8a4b3a';
        ctx.fillRect(px, py, TILE, TILE);
        ctx.fillStyle = '#5e3026';
        ctx.fillRect(px, py + 5, TILE, 1);
        ctx.fillRect(px, py + 11, TILE, 1);
        const offset = ty % 2 ? 4 : 12;
        ctx.fillRect(px + offset, py, 1, 5);
        ctx.fillRect(px + (offset === 4 ? 12 : 4), py + 6, 1, 5);
        if (tileAt(tx, ty - 1) !== 'H') {
          ctx.fillStyle = '#4a2c5e'; // roof edge
          ctx.fillRect(px, py, TILE, 4);
        }
        break;
      }
      case 'D': {
        ctx.fillStyle = '#c9a66b';
        ctx.fillRect(px, py, TILE, TILE);
        ctx.fillStyle = '#5c3a1e';
        ctx.fillRect(px + 3, py + 2, 10, 14);
        ctx.fillStyle = '#e0b84a';
        ctx.fillRect(px + 10, py + 9, 2, 2);
        break;
      }
      default:
        grass(px, py, h);
    }
  }

  function drawPlayer(sx, sy) {
    const stride = player.moving ? Math.sign(Math.sin(player.walk)) : 0;

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.fillRect(sx + 4, sy + 14, 8, 2);

    // Legs alternate while walking
    ctx.fillStyle = '#2d2d4a';
    ctx.fillRect(sx + 5, sy + 12 + (stride > 0 ? 0 : 1), 2, 2);
    ctx.fillRect(sx + 9, sy + 12 + (stride < 0 ? 0 : 1), 2, 2);

    // Tunic, head, hair
    ctx.fillStyle = '#d9572b';
    ctx.fillRect(sx + 4, sy + 7, 8, 6);
    ctx.fillStyle = '#f2c89b';
    ctx.fillRect(sx + 4, sy + 2, 8, 6);
    ctx.fillStyle = '#4a2c1a';
    ctx.fillRect(sx + 4, sy + 1, 8, 3);
    if (player.facing === 'up') {
      ctx.fillRect(sx + 4, sy + 2, 8, 5); // back of head
    } else {
      ctx.fillStyle = '#222';
      if (player.facing === 'down') {
        ctx.fillRect(sx + 6, sy + 5, 1, 1);
        ctx.fillRect(sx + 9, sy + 5, 1, 1);
      } else if (player.facing === 'left') {
        ctx.fillRect(sx + 5, sy + 5, 1, 1);
      } else {
        ctx.fillRect(sx + 10, sy + 5, 1, 1);
      }
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

    drawPlayer(Math.round(player.x - camX), Math.round(player.y - camY));

    // HUD hint
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, canvas.height - 12, canvas.width, 12);
    ctx.fillStyle = '#ffffff';
    ctx.font = '8px monospace';
    ctx.fillText('ARROWS/WASD: WALK   ESC: TITLE', 4, canvas.height - 3);
  }

  function onKeyDown(e) {
    const k = e.key.toLowerCase();
    if (k === 'escape') {
      stop();
      if (onExit) onExit(getSaveData());
      return;
    }
    if (GAME_KEYS.includes(k)) {
      keys.add(k);
      e.preventDefault();
    }
  }

  function onKeyUp(e) {
    keys.delete(e.key.toLowerCase());
  }

  function init(c, exitCallback) {
    canvas = c;
    ctx = canvas.getContext('2d');
    onExit = exitCallback;
    map = buildMap();
    keys.clear();
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
  }

  function stop() {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    keys.clear();
  }

  return { init, update, draw, stop };
})();
