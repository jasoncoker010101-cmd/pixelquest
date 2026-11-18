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

  // First-play cinematic: pixel planet, narrated countryside pan, then the bedroom.
  let introActive = false, introTime = 0, introAudio = null, introSoundChar = 0, introTextSegment = '', introLastReveal = 0, introWolfHowlOne = false, introWolfHowlTwo = false, introWolfHowlEcho = false;
  const INTRO_DURATION = 45.5;
  function finishIntro() {
    introActive = false;
    introTime = INTRO_DURATION;
    insideHouse = true;
    interiorPlayer.x = 94;
    interiorPlayer.y = 91;
    interiorPlayer.facing = 'up';
    interiorPlayer.moving = false;
    interiorPlayer.walk = 0;
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
    const y = 190;
    ctx.fillStyle = 'rgba(8,10,22,.88)';
    ctx.fillRect(13, y, 294, 39);
    ctx.strokeStyle = '#d7bd83'; ctx.lineWidth = 1; ctx.strokeRect(13.5, y + .5, 293, 38);
    ctx.font = '8px monospace'; ctx.textAlign = 'left'; ctx.fillStyle = '#fff0ce';
    for (let i = 0; i < visible; i++) ctx.fillText(output[i], 22, y + 12 + i * 10);
  }
  function drawPixelEarth(rotation) {
    // A larger, richly shaded pixel planet with moving cloud bands and a soft atmosphere.
    const size = 80, center = 39.5, radius = 36.5;
    ctx.save();
    ctx.translate(160, 108);
    ctx.fillStyle = 'rgba(0,0,0,.38)';
    ctx.beginPath(); ctx.ellipse(3, 43, 47, 9, 0, 0, Math.PI * 2); ctx.fill();

    // Atmospheric rim and subtle glow behind the planet.
    ctx.shadowColor = 'rgba(72,164,255,.55)';
    ctx.shadowBlur = 13;
    ctx.fillStyle = '#17243e';
    ctx.beginPath(); ctx.arc(0, 0, 42, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    const landShapes = [
      // North and South America
      [[-2.75,.78],[-2.35,1.05],[-1.95,1.05],[-1.55,.88],[-1.38,.58],[-1.65,.35],[-1.72,.1],[-1.5,-.22],[-1.7,-.55],[-1.95,-.9],[-2.15,-1.28],[-2.48,-1.05],[-2.72,-.52]],
      [[-1.9,-.1],[-1.55,-.24],[-1.35,-.55],[-1.25,-.9],[-1.45,-1.25],[-1.62,-1.62],[-1.9,-1.48],[-2.05,-1.02]],
      // Europe, Africa, Asia
      [[-.65,.85],[-.35,1.05],[.1,1.02],[.45,.92],[.62,.72],[.95,.7],[1.25,.9],[1.6,.78],[1.85,.55],[2.2,.58],[2.55,.35],[2.85,.12],[2.62,-.18],[2.25,-.28],[1.95,-.35],[1.72,-.65],[1.4,-.6],[1.2,-.25],[.95,-.12],[.72,-.38],[.45,-.5],[.28,-.88],[-.05,-1.15],[-.4,-.92],[-.62,-.45],[-.8,-.15],[-.72,.35]],
      // India and southeast Asia
      [[.7,.18],[.92,.1],[1.05,-.25],[.9,-.65],[.68,-.52],[.55,-.15]],
      [[1.8,-.35],[2.05,-.48],[2.28,-.72],[2.15,-.95],[1.92,-.85],[1.72,-.62]],
      // Australia and islands
      [[2.35,-1.05],[2.72,-1.12],[2.85,-1.38],[2.58,-1.52],[2.28,-1.38]],
      [[-2.9,-.08],[-2.72,-.2],[-2.62,-.38],[-2.8,-.52]],
      [[-2.2,.15],[-2.05,.25],[-1.9,.15],[-2.02,-.02]],
      [[-.25,-.12],[.02,-.2],[.12,-.35],[-.1,-.48],[-.32,-.32]]
    ];
    const inPoly = (x, y, poly) => {
      let inside = false;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
        if (((yi > y) !== (yj > y)) && x < (xj - xi) * (y - yi) / ((yj - yi) || .0001) + xi) inside = !inside;
      }
      return inside;
    };
    for (let py = 0; py < size; py++) {
      for (let px = 0; px < size; px++) {
        const dx = (px - center) / radius, dy = (py - center) / radius;
        const rr = dx * dx + dy * dy;
        if (rr > 1) continue;
        const z = Math.sqrt(1 - rr);
        const lat = Math.asin(-dy);
        const lon = Math.atan2(dx, z) + rotation;
        const noise = Math.sin(lon * 8 + Math.sin(lat * 10)) * .055 + Math.sin(lon * 15 + lat * 12) * .035;
        const land = landShapes.some(poly => inPoly(lon, lat, poly)) || (noise > .065 && lat > -.25 && lat < .7);
        const light = Math.max(0, Math.min(1, .27 + (-dx * .58 - dy * .45 + z * .72) * .7));
        const oceanDepth = Math.sin(lon * 3.4 + lat * 5) * .035;
        let color;
        if (land) {
          const terrain = Math.sin(lon * 11 + lat * 9) * .08 + Math.cos(lat * 15 - lon * 4) * .05;
          color = light + terrain > .68 ? '#a6cf79' : light + terrain > .43 ? '#579c60' : '#326452';
          if (lat > 1.15 || lat < -1.18) color = '#d9e8d9';
        } else {
          color = light + oceanDepth > .68 ? '#66c0df' : light + oceanDepth > .42 ? '#347da9' : '#19466f';
        }
        // Broad, fragmented cloud bands move slowly independently of the continents.
        const cloudNoise = Math.sin(px * .29 + py * .16 + rotation * 2.2) +
          Math.sin(px * .13 - py * .31 + rotation * 1.3) +
          Math.cos(py * .24 + rotation * 1.7);
        if (cloudNoise > 1.55 && light > .28) color = land ? '#c9e2c0' : '#d9edf0';
        ctx.fillStyle = color;
        ctx.fillRect(px - 40, py - 40, 1, 1);
      }
    }

    // Fine pixel highlights on the limb and an illuminated atmosphere.
    ctx.strokeStyle = 'rgba(176,225,255,.8)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0, 0, 36.5, -.9, 2.65); ctx.stroke();
    ctx.strokeStyle = 'rgba(63,135,226,.55)';
    ctx.beginPath(); ctx.arc(0, 0, 38.5, 0, Math.PI * 2); ctx.stroke();
    // Tiny satellite-like glint to make the planet feel alive.
    const glint = .35 + .3 * Math.sin(introTime * 2.2);
    ctx.fillStyle = 'rgba(220,245,255,' + glint + ')';
    ctx.fillRect(-28, -20, 2, 1); ctx.fillRect(25, 15, 1, 2);
    ctx.restore();
  }
  function drawIntroWorld(zoom, centerX, centerY) {
    const oldX = camX, oldY = camY;
    // The distant howl hits with a brief, uneven pixel-camera shake.
    const howlAge = introTime - 21.4;
    const shakeEnvelope = howlAge >= 0 && howlAge < 2.6 ? (1 - howlAge / 2.6) * (0.65 + 0.35 * Math.abs(Math.sin(howlAge * 8))) : 0;
    const shakeX = shakeEnvelope * (Math.sin(introTime * 39) * 2.8 + Math.sin(introTime * 17) * 1.3);
    const shakeY = shakeEnvelope * (Math.cos(introTime * 31) * 2.1 + Math.sin(introTime * 23) * 0.9);
    ctx.save();
    ctx.translate(160 + shakeX, 120 + shakeY);
    ctx.scale(zoom, zoom);
    ctx.translate(-centerX, -centerY);
    camX = 0; camY = 0;
    for (let ty = 0; ty < MAP_H; ty++) {
      for (let tx = 0; tx < MAP_W; tx++) drawTile(map[ty][tx], tx * TILE, ty * TILE, tx, ty);
    }
    drawHouse();
    drawMailbox();
    drawFish();
    bunnies.forEach(drawBunny);
    // Two wolves pace, freeze at the distant howl, then follow clear routes away.
    if (introTime >= 15 && introTime < 27.2) {
      const howlAt = 21.4;
      const fleeStart = 22.15;
      const routeTime = Math.min(introTime, howlAt);
      const wanderX = Math.sin(routeTime * 0.85) * 13 + Math.sin(routeTime * 1.7) * 4;
      const wanderY = Math.sin(routeTime * 1.15 + 1) * 7;
      const wanderVX = Math.cos(routeTime * 0.85) * 13 * 0.85 + Math.cos(routeTime * 1.7) * 4 * 1.7;
      const wanderVY = Math.cos(routeTime * 1.15 + 1) * 7 * 1.15;
      const walking = introTime < howlAt;
      const running = introTime >= fleeStart;

      let wolfOne = { x: 24 * TILE + wanderX, y: 18 * TILE + wanderY, vx: walking ? wanderVX : 0, vy: walking ? wanderVY : 0 };
      let wolfTwo = { x: 29 * TILE - wanderX * 0.72, y: 20 * TILE - wanderY * 0.65, vx: walking ? -wanderVX * 0.72 : 0, vy: walking ? -wanderVY * 0.65 : 0 };

      if (running) {
        if (!introWolfFleePaths) {
          const startOneX = 24 * TILE + Math.sin(howlAt * 0.85) * 13 + Math.sin(howlAt * 1.7) * 4;
          const startOneY = 18 * TILE + Math.sin(howlAt * 1.15 + 1) * 7;
          const startTwoX = 29 * TILE - (startOneX - 24 * TILE) * 0.72;
          const startTwoY = 20 * TILE - (startOneY - 18 * TILE) * 0.65;
          introWolfFleePaths = [
            introWolfFindPath(startOneX, startOneY, 280, 352),
            introWolfFindPath(startTwoX, startTwoY, 376, 376)
          ];
        }
        const rawProgress = Math.max(0, Math.min(1, (introTime - fleeStart) / 3.25));
        const travelProgress = rawProgress * rawProgress;
        const one = introWolfPathPoint(introWolfFleePaths[0], travelProgress);
        const two = introWolfPathPoint(introWolfFleePaths[1], travelProgress);
        if (one) wolfOne = one;
        if (two) wolfTwo = two;
      }

      // Keep the walk loop moving before the howl; start running at frame zero,
      // then hold the final run frame after reaching the clear destination.
      const runMoving = running && introTime < fleeStart + 3.25;
      drawIntroWolf(wolfOne.x, wolfOne.y, false, wolfOne.vx, running ? 'run' : 'walk', walking || runMoving, running ? introTime - fleeStart : routeTime - 15);
      drawIntroWolf(wolfTwo.x, wolfTwo.y, true, wolfTwo.vx, running ? 'run' : 'walk', walking || runMoving, running ? introTime - fleeStart : routeTime - 15);
      if (introTime >= 21.4 && introTime < 24.8) {
        drawDistantHowlGlitch(37 * TILE, 8 * TILE, (introTime - 21.4) / 3.4);
      }
    }
    camX = oldX; camY = oldY;
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
  function introWolfPointBlocked(px, py) {
    const worldW = MAP_W * TILE, worldH = MAP_H * TILE;
    if (px < TILE || py < TILE || px > worldW - TILE || py > worldH - TILE) return true;
    const tx = Math.floor(px / TILE), ty = Math.floor(py / TILE);
    const tile = tileAt(tx, ty);
    if (tile === 'B' || tile === 'W' || tile === 'H' || tile === 'R' || tile === 'D') return true;

    // Trees have a small trunk collision area, not a full-tile wall.
    for (let y = Math.max(0, ty - 1); y <= Math.min(MAP_H - 1, ty + 1); y++) {
      for (let x = Math.max(0, tx - 1); x <= Math.min(MAP_W - 1, tx + 1); x++) {
        if (tileAt(x, y) !== 'T') continue;
        const trunkX = x * TILE + 8;
        const trunkY = y * TILE + 13;
        if (Math.abs(px - trunkX) < 6 && py >= y * TILE + 9 && py <= y * TILE + 17) return true;
      }
    }
    return false;
  }

  function introWolfFindPath(startX, startY, endX, endY) {
    // Plan on an 8px grid so wolves can take a route around solid tiles and
    // tree trunks instead of being pushed sideways after they hit an obstacle.
    const STEP = 8;
    const COLS = MAP_W * TILE / STEP;
    const ROWS = MAP_H * TILE / STEP;
    const clampCell = (v, max) => Math.max(1, Math.min(max - 2, Math.round(v / STEP)));
    const sx = clampCell(startX, COLS), sy = clampCell(startY, ROWS);
    const ex = clampCell(endX, COLS), ey = clampCell(endY, ROWS);
    const start = sy * COLS + sx, goal = ey * COLS + ex;
    const toX = id => (id % COLS) * STEP;
    const toY = id => Math.floor(id / COLS) * STEP;
    const total = COLS * ROWS;
    const scores = new Float64Array(total);
    scores.fill(Infinity);
    const parents = new Int32Array(total);
    parents.fill(-1);
    const closed = new Uint8Array(total);
    const heap = [];

    const push = (id, priority) => {
      let i = heap.length;
      heap.push({ id, priority });
      while (i > 0) {
        const parent = (i - 1) >> 1;
        if (heap[parent].priority <= priority) break;
        heap[i] = heap[parent];
        i = parent;
      }
      heap[i] = { id, priority };
    };
    const pop = () => {
      const first = heap[0];
      const last = heap.pop();
      if (heap.length) {
        let i = 0;
        while (true) {
          const left = i * 2 + 1, right = left + 1;
          if (left >= heap.length) break;
          let child = left;
          if (right < heap.length && heap[right].priority < heap[left].priority) child = right;
          if (heap[child].priority >= last.priority) break;
          heap[i] = heap[child];
          i = child;
        }
        heap[i] = last;
      }
      return first;
    };
    const dirs = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
    const startXGrid = toX(start), startYGrid = toY(start);
    const goalXGrid = toX(goal), goalYGrid = toY(goal);
    if (introWolfPointBlocked(startXGrid, startYGrid) || introWolfPointBlocked(goalXGrid, goalYGrid)) return null;

    scores[start] = 0;
    push(start, Math.hypot(ex - sx, ey - sy) * STEP);
    while (heap.length) {
      const current = pop().id;
      if (closed[current]) continue;
      if (current === goal) break;
      closed[current] = 1;
      const x = current % COLS, y = Math.floor(current / COLS);
      for (const [dx, dy] of dirs) {
        const nx = x + dx, ny = y + dy;
        if (nx < 1 || ny < 1 || nx >= COLS - 1 || ny >= ROWS - 1) continue;
        const px = nx * STEP, py = ny * STEP;
        if (introWolfPointBlocked(px, py)) continue;
        // Do not cut diagonally through the corners of trees, rocks, or walls.
        if (dx && dy && (
          introWolfPointBlocked((x + dx) * STEP, y * STEP) ||
          introWolfPointBlocked(x * STEP, (y + dy) * STEP)
        )) continue;
        const next = ny * COLS + nx;
        if (closed[next]) continue;
        const nextScore = scores[current] + (dx && dy ? STEP * Math.SQRT2 : STEP);
        if (nextScore >= scores[next]) continue;
        scores[next] = nextScore;
        parents[next] = current;
        const heuristic = Math.hypot(ex - nx, ey - ny) * STEP;
        push(next, nextScore + heuristic);
      }
    }
    if (start !== goal && parents[goal] === -1) return null;

    const path = [];
    let node = goal;
    while (node !== -1) {
      path.push({ x: toX(node), y: toY(node) });
      if (node === start) break;
      node = parents[node];
    }
    if (!path.length || path[path.length - 1].x !== startXGrid || path[path.length - 1].y !== startYGrid) return null;
    path.reverse();
    // Preserve the exact scripted start and destination so the route has no snap.
    path[0] = { x: startX, y: startY };
    path[path.length - 1] = { x: endX, y: endY };
    return path;
  }

  function introWolfPathPoint(path, progress) {
    if (!path || !path.length) return null;
    if (path.length === 1) return { x: path[0].x, y: path[0].y, vx: 0, vy: 0 };
    let totalLength = 0;
    for (let i = 1; i < path.length; i++) {
      totalLength += Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y);
    }
    let remaining = totalLength * Math.max(0, Math.min(1, progress));
    let lastHorizontalDirection = 1;
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1], b = path[i];
      const dx = b.x - a.x, dy = b.y - a.y;
      const length = Math.hypot(dx, dy);
      if (dx !== 0) lastHorizontalDirection = dx;
      if (remaining <= length || i === path.length - 1) {
        const t = length > 0 ? Math.max(0, Math.min(1, remaining / length)) : 0;
        return { x: a.x + dx * t, y: a.y + dy * t, vx: dx || lastHorizontalDirection, vy: dy };
      }
      remaining -= length;
    }
    return { x: path[path.length - 1].x, y: path[path.length - 1].y, vx: lastHorizontalDirection, vy: 0 };
  }

  function drawIntroWolf(x, y, isRed, vx, animation, moving, animationTime) {
    const px = Math.round(x), groundY = Math.round(y);
    const running = animation === 'run';
    const sheet = running
      ? (isRed ? introRedRun : introBlackRun)
      : (isRed ? introRedWalk : introBlackWalk);
    ctx.save();
    // The shadow is attached to the ground point, not the animated body frame.
    ctx.fillStyle = 'rgba(0,0,0,.38)';
    ctx.beginPath();
    ctx.ellipse(px, groundY + 3, running ? 15 : 13, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Never substitute either legacy standing PNG. If a sheet is not ready, wait for it.
    if (sheet.complete && sheet.naturalWidth && sheet.naturalHeight) {
      ctx.imageSmoothingEnabled = false;
      ctx.translate(px, groundY);
      if (vx < 0) ctx.scale(-1, 1);
      const frameW = sheet.naturalHeight;
      const frameCount = Math.max(1, Math.floor(sheet.naturalWidth / frameW));
      const fps = running ? 14 : 9;
      const phaseOffset = isRed ? 2 : 0;
      // Start the run cycle on its first frame; freeze a walk frame during the howl.
      const frame = moving
        ? Math.floor(animationTime * fps + phaseOffset) % frameCount
        : Math.min(frameCount - 1, Math.floor(frameCount * 0.45));
      ctx.drawImage(sheet, frame * frameW, 0, frameW, sheet.naturalHeight, -24, -32, 48, 48);
    }
    ctx.restore();
  }

  function drawIntro() {
    const t = introTime;
    ctx.fillStyle = '#070b19'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (t < 8.5) {
      for (let i = 0; i < 52; i++) {
        const x = (i * 73 + 19) % 320, y = (i * 47 + 11) % 178;
        const twinkle = .45 + .45 * Math.sin(t * 2 + i);
        ctx.fillStyle = 'rgba(218,231,255,' + twinkle + ')';
        ctx.fillRect(x, y, i % 7 === 0 ? 2 : 1, i % 7 === 0 ? 2 : 1);
      }
      drawPixelEarth(t * .13);
      ctx.textAlign = 'center'; ctx.font = 'bold 14px monospace';
      ctx.fillStyle = '#f4e8c5'; ctx.fillText('EARTH', 160, 25);
      ctx.fillStyle = '#8294b7'; ctx.fillRect(123, 32, 74, 1);
      if (t > 1.6) introTextBox(['EARTH. A familiar world of oceans, forests, and endless skies.'], (t - 1.6) * 17, 'earth');
      if (t > 6.0) {
        const a = Math.min(1, (t - 6.0) / 2.5);
        ctx.fillStyle = 'rgba(0,0,0,' + a + ')'; ctx.fillRect(0, 0, 320, 240);
      }
    } else if (t < 38.5) {
      let zoom, cx, cy;
      if (t < 14.5) {
        // Slow establishing pan across the fields.
        const p = Math.max(0, (t - 8.5) / 6);
        const e = p * p * (3 - 2 * p);
        zoom = .48 + e * .12;
        cx = 490 - e * 150;
        cy = 252 - e * 12;
      } else if (t < 25.5) {
        // Hold a deliberate, closer shot on the wolves while their howls play.
        const p = (t - 14.5) / 11;
        const e = p * p * (3 - 2 * p);
        zoom = .60 + e * .62;
        cx = 340 + e * 84;
        cy = 240 + e * 60;
      } else if (t < 30.5) {
        // Leave the wolves slowly and travel toward the house.
        const p = (t - 25.5) / 5;
        const e = p * p * (3 - 2 * p);
        zoom = 1.22 + e * .20;
        cx = 424 - e * 240;
        cy = 300 - e * 132;
      } else {
        // Gentle final push toward the house before entering the bedroom.
        const p = Math.min(1, (t - 30.5) / 8);
        const e = p * p * (3 - 2 * p);
        zoom = 1.42 + e * .18;
        cx = 184;
        cy = 168;
      }
      drawIntroWorld(zoom, cx, cy);
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
      if (t > 36.8) {
        const a = Math.min(1, (t - 36.8) / 1.7);
        ctx.fillStyle = 'rgba(0,0,0,' + a + ')'; ctx.fillRect(0, 0, 320, 240);
      }
    } else {
      const p = Math.min(1, (t - 38.5) / 1.4);
      ctx.save();
      ctx.translate(160, 120); ctx.scale(1.22 - p * .22, 1.22 - p * .22); ctx.translate(-160, -120);
      drawHouseInterior();
      ctx.restore();
      if (t < 44.4) {
        introTextBox(['And here, at the edge of the wilderness, a new day begins...'], (t - 39.0) * 17, 'new-day');
      }
      const fade = Math.max(0, Math.min(1, (t - 44.5) / 1));
      if (fade > 0) { ctx.fillStyle = 'rgba(0,0,0,' + fade + ')'; ctx.fillRect(0, 0, 320, 240); }
    }
    if (t < INTRO_DURATION - 1) {
      ctx.fillStyle = 'rgba(235,229,211,.68)'; ctx.font = '6px monospace'; ctx.textAlign = 'right';
      ctx.fillText('PRESS ANY BUTTON TO SKIP', 306, 233);
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
  const INTERIOR_WALLS = [
    // Outer room shell and the single front entrance.
    [12, 12, 296, 14], [12, 24, 14, 194], [294, 24, 14, 194],
    [12, 218, 133, 12], [175, 218, 133, 12],
    // Upper bedroom entrances from the central hallway.
    [130, 25, 10, 25], [130, 78, 10, 34],
    [180, 25, 10, 25], [180, 78, 10, 34],
    // Lower rooms: wide open kitchen entrance, single living-room entrance.
    [130, 128, 10, 20], [130, 196, 10, 22],
    [180, 128, 10, 28], [180, 186, 10, 32],
    // Full cross-walls stop rooms connecting directly to one another.
    [25, 112, 115, 10], [180, 112, 115, 10],
    // Bathroom has one doorway, opening from the living room.
    [190, 175, 30, 10], [240, 175, 55, 10]
  ];
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
  // A handwritten message left in Dad's bedroom, on top of the dresser.
  const DAD_NOTE = { x: 104, y: 52 };

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

  function interiorBlocked(px, py) {
    // Interior player coordinates are the character CENTER. drawPlayer is
    // rendered at center - 8, so convert its lower-body hitbox back to world
    // coordinates here. This keeps collision aligned with the visible sprite.
    const left = px + 3, right = px + 12;
    const top = py + 9, bottom = py + 15;

    // Convert the shared [x,y,width,height] wall layout into collision edges.
    const walls = INTERIOR_WALLS.map(([x, y, w, h]) => [x, y, x + w, y + h]);

    // Collision footprints follow the furniture's outer shadow / base, not
    // arbitrary oversized boxes. The plant is separate from the coffee table.
    const furniture = [
      // Two single beds, dressers and bedside furniture.
      [41,42,74,81], [88,35,118,69], [91,74,118,97],
      [204,42,237,81], [248,34,280,68], [244,76,274,99],
      // Kitchen furniture and dining set.
      [32,141,56,172], [55,139,123,171], [64,181,113,210],
      // Living-room seating and shelf. Keep the bathroom doorway clear.
      [198,139,241,172], [264,137,294,171], [242,184,269,210], [271,184,295,210]
    ];

    return walls.concat(furniture).some(([x1, y1, x2, y2]) =>
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

    // Draw exactly the same wall rectangles used by collision detection.
    // This keeps the hallway entrances consistent and prevents stray gaps.
    for (const [wx, wy, ww, wh] of INTERIOR_WALLS) {
      if (ww >= wh) wallH(wx, wy, ww, wh);
      else wallV(wx, wy, wh, ww);
    }

    // Furniture is drawn from the pixel-art packs already included in the project.
    // Dad's bedroom (upper-left): bed, dresser, bedside table and wall window.
    drawInteriorArt(16, 48, 47, 49, 42, 43, 31, 37);
    drawInteriorArt(336, 38, 50, 57, 88, 35, 30, 34);
    drawInteriorArt(224, 282, 47, 40, 91, 74, 27, 23);
    ctx.fillStyle = '#4b2b35'; ctx.fillRect(82, 25, 37, 19);
    ctx.fillStyle = '#77aeb5'; ctx.fillRect(86, 29, 29, 12);

    // Player's bedroom (upper-right): a separate bed, bookcase and bedside table.
    drawInteriorArt(111, 48, 48, 49, 207, 43, 31, 37);
    drawInteriorArt(398, 61, 49, 36, 250, 34, 29, 27);
    drawInteriorArt(224, 282, 47, 40, 246, 76, 27, 23);

    // Kitchen (lower-left): use the matching pixel-art table, chairs and kitchen props.
    drawInteriorArt(16, 253, 88, 62, 65, 164, 48, 38);
    drawInteriorArt(16, 387, 39, 48, 34, 142, 22, 29);
    drawInteriorArt(240, 405, 31, 34, 95, 143, 20, 23);
    drawInteriorArt(51, 395, 32, 34, 37, 179, 18, 18);

    // Living room (lower-right): sofa seating, coffee table, shelves and decor.
    drawInteriorArt(140, 263, 66, 50, 198, 139, 43, 33);
    drawInteriorArt(224, 282, 47, 40, 225, 147, 28, 24);
    drawInteriorArt(336, 38, 50, 57, 267, 137, 24, 31);
    drawInteriorArt(337, 432, 48, 42, 274, 153, 17, 17);

    // Bathroom (small separate room at the far end of the lower-right side).
    // Fixtures use the bathroom pieces from the Kenney interior tile atlas.
    drawInteriorSprite(21, 7, 2, 2, 245, 188, 24, 24);
    drawInteriorSprite(23, 7, 2, 2, 271, 188, 24, 24);

    // Front entrance door at the end of the central hallway.
    ctx.fillStyle = '#503139'; ctx.fillRect(145, 207, 30, 17);
    ctx.fillStyle = '#a96e48'; ctx.fillRect(148, 207, 24, 14);
    ctx.fillStyle = '#d7a66b'; ctx.fillRect(150, 209, 20, 10);
    ctx.fillStyle = '#f0ca87'; ctx.fillRect(166, 214, 2, 2);

    // A small folded paper note sits on the dresser in Dad's bedroom.
    ctx.save();
    ctx.fillStyle = 'rgba(35,18,24,.35)'; ctx.fillRect(96, 48, 17, 13);
    ctx.fillStyle = '#77513c'; ctx.fillRect(95, 45, 17, 13);
    ctx.fillStyle = '#eadbb3'; ctx.fillRect(96, 45, 15, 11);
    ctx.fillStyle = '#fff0cc'; ctx.fillRect(97, 46, 12, 1);
    ctx.fillStyle = '#b59a70'; ctx.fillRect(98, 49, 9, 1); ctx.fillRect(98, 52, 7, 1);
    ctx.fillStyle = '#d1bd91'; ctx.fillRect(107, 45, 4, 4);
    ctx.fillStyle = '#f7ebca'; ctx.fillRect(107, 46, 2, 2);
    ctx.restore();

    // Player remains centered in the hall at spawn and can walk straight to the door.
    const oldFacing = player.facing, oldMoving = player.moving, oldWalk = player.walk;
    player.facing = interiorPlayer.facing;
    player.moving = interiorPlayer.moving;
    player.walk = interiorPlayer.walk;
    drawPlayer(Math.round(interiorPlayer.x), Math.round(interiorPlayer.y));
    player.facing = oldFacing; player.moving = oldMoving; player.walk = oldWalk;

    if (!panel && Math.hypot(interiorPlayer.x - DAD_NOTE.x, interiorPlayer.y - DAD_NOTE.y) < 35) {
      ctx.fillStyle = 'rgba(15,12,24,.94)'; ctx.fillRect(111, 188, 98, 14);
      ctx.strokeStyle = '#f4d27b'; ctx.strokeRect(111.5, 188.5, 97, 13);
      ctx.fillStyle = '#fff0bd'; ctx.font = 'bold 7px monospace'; ctx.textAlign = 'center';
      ctx.fillText('[ E ] READ NOTE', 160, 198);
    }
    if (!panel && Math.hypot(interiorPlayer.x - 160, interiorPlayer.y - 207) < 25) {
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
    const panelTitle = panel === 'inventory' ? 'INVENTORY' : panel === 'dad-note' ? 'A NOTE FROM DAD' : 'PLAYER STATS';
    ctx.fillText(panelTitle, 160, 57);
    ctx.font = '8px monospace';
    ctx.fillStyle = '#b9b1a5';
    ctx.fillText(panel === 'inventory' ? 'Press I or ESC to close' : panel === 'stats' ? 'Press C or ESC to close' : 'Press ESC to close', 160, 190);

    if (panel === 'dad-note') {
      ctx.fillStyle = '#eadbb3'; ctx.fillRect(69, 72, 182, 92);
      ctx.fillStyle = '#76553d'; ctx.strokeStyle = '#c79b5d'; ctx.lineWidth = 1;
      ctx.strokeRect(69.5, 72.5, 181, 91);
      ctx.fillStyle = '#45332e'; ctx.textAlign = 'center'; ctx.font = '10px monospace';
      ctx.fillText('Son, meet me at the', 160, 96);
      ctx.fillText('other side of the forest.', 160, 116);
      ctx.fillText('Take my armor and', 160, 136);
      ctx.fillText('weapon.', 160, 151);
    } else if (panel === 'inventory') {
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
    if (battle) { drawBattle(); if (paused) drawPauseMenu(); return; }
    if (insideHouse) { drawHouseInterior(); if (paused) drawPauseMenu(); return; }
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
    if (insideHouse) {
      if (Math.hypot(interiorPlayer.x - DAD_NOTE.x, interiorPlayer.y - DAD_NOTE.y) < 35) {
        panel = 'dad-note';
        return;
      }
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

    if (k === 'escape' && panel) {
      panel = null;
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
    if (introActive) { insideHouse = true; interiorPlayer.x = 94; interiorPlayer.y = 91; interiorPlayer.facing = 'up'; }
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

    if (paused) {
      if (action === 'back') {
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
    if (action === 'back') {
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
    if (action === 'primary') { if (panel) panel = null; else interact(); }
    else if (action === 'inventory') panel = panel === 'inventory' ? null : 'inventory';
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