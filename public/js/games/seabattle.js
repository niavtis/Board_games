import { h } from '../ui.js';

// Sea Battle: two tilted 3D boards floating over a painted sea. Everything is plain DOM + CSS 3D.
const LET = 'АБВГДЕЖЗИК';
const C = 48; // cell pitch in stage px
const KIND = ['carrier', 'battleship', 'cruiser', 'sub', 'destroyer', 'boat', 'boat', 'boat', 'boat'];
const BY_LEN = { 5: 'carrier', 4: 'battleship', 3: 'cruiser', 2: 'destroyer', 1: 'boat' };
const NAME = { carrier: 'Авианосец', battleship: 'Линкор', cruiser: 'Крейсер', sub: 'Подлодка', destroyer: 'Эсминец', boat: 'Катер' };
const TIMES = [['day', 'День'], ['dusk', 'Закат'], ['night', 'Ночь']];
const SCENES = [['lagoon', 'Лагуна'], ['fjord', 'Фьорд'], ['storm', 'Шторм'], ['archipelago', 'Архипелаг']];
const HZ = 150; // horizon line
const BOARD_TOP = 172;
const BLOCK = 610; // board + caption + fleet strip

const pref = (k, d) => { try { return localStorage.getItem(k) || d; } catch { return d; } };
const save = (k, v) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } };
const look = { time: pref('sb-time', 'day'), scene: pref('sb-scene', 'lagoon') };

const cellsOf = (s) => Array.from({ length: s.len }, (_, i) => (s.dir === 'h' ? [s.r, s.c + i] : [s.r + i, s.c]));
const kindOf = (len, i) => (KIND[i] && cellsOfLen(KIND[i]) === len ? KIND[i] : BY_LEN[len]);
const cellsOfLen = (k) => ({ carrier: 5, battleship: 4, cruiser: 3, sub: 3, destroyer: 2, boat: 1 }[k]);

/* ---------------- placement helpers ---------------- */
let P = null; // { key, ships: [{idx,r,c,len,dir}], dir, pick, hover }
let lastCtx = null;
let seenShot = ''; // last shot already animated, so chat/resize rerenders don't replay splashes

function blocked(ships, cand, size) {
  const cells = cellsOf(cand);
  if (cells.some(([r, c]) => r < 0 || c < 0 || r >= size || c >= size)) return true;
  return ships.some((s) => cellsOf(s).some(([y, x]) => cells.some(([r, c]) => Math.abs(r - y) <= 1 && Math.abs(c - x) <= 1)));
}

function randomFleet(fleet, size) {
  for (let attempt = 0; attempt < 500; attempt++) {
    const ships = [];
    for (const [idx, len] of fleet.entries()) {
      for (let t = 0; t < 300; t++) {
        const dir = Math.random() < 0.5 ? 'h' : 'v';
        const cand = { idx, len, dir, r: Math.floor(Math.random() * size), c: Math.floor(Math.random() * size) };
        if (!blocked(ships, cand, size)) { ships.push(cand); break; }
      }
      if (ships.length !== idx + 1) break;
    }
    if (ships.length === fleet.length) return ships;
  }
  return [];
}

document.addEventListener('keydown', (e) => {
  if ((e.key === 'r' || e.key === 'R' || e.key === 'к' || e.key === 'К') && P && document.querySelector('.sb-placing') && document.activeElement?.tagName !== 'INPUT') {
    P.dir = P.dir === 'h' ? 'v' : 'h';
    lastCtx?.rerender();
  }
});

let resizeQueued = false;
window.addEventListener('resize', () => {
  if (resizeQueued || !document.querySelector('.sb-wrap')) return;
  resizeQueued = true;
  requestAnimationFrame(() => { resizeQueued = false; lastCtx?.rerender(); });
});

/* ---------------- palette ---------------- */
function mix(a, b, t) {
  const hx = (x) => [1, 3, 5].map((i) => parseInt(x.slice(i, i + 2), 16));
  const A = hx(a), B = hx(b);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`;
}

function palette(time, scene) {
  const T = {
    day: { skyTop: '#78a9cc', skyBot: '#e1ecf0', seaTop: '#3a7f96', seaBot: '#134557', haze: 'rgba(255,255,255,.45)', stars: 0, cloud: 'rgba(255,255,255,.88)', cloudShade: 'rgba(110,145,172,.40)', sun: '#fff3d2', glow: 'rgba(255,244,210,.55)', glint: 'rgba(255,246,214,.5)', crest: '#e8f6fa', vig: 'rgba(8,30,45,.28)', sy: 66,
      plate: '#cfdde2', slabA: '#b2c4cb', slabB: '#98aeb7', fog: 'rgba(31,61,46,.14)', line: 'rgba(22,20,15,.20)', miss: 'rgba(255,255,255,.55)', dot: '#16140f', label: '#16140f' },
    dusk: { skyTop: '#3b3a6c', skyBot: '#f2a77b', seaTop: '#8f5667', seaBot: '#2a2236', haze: 'rgba(255,196,140,.45)', stars: 0.25, cloud: 'rgba(255,208,176,.75)', cloudShade: 'rgba(150,80,110,.40)', sun: '#ffc58a', glow: 'rgba(255,170,110,.55)', glint: 'rgba(255,190,120,.6)', crest: '#ffd6b0', vig: 'rgba(30,10,30,.38)', sy: 128,
      plate: '#f1e6dc', slabA: '#d8c6b8', slabB: '#bfa896', fog: 'rgba(180,71,43,.12)', line: 'rgba(22,20,15,.20)', miss: 'rgba(255,255,255,.65)', dot: '#16140f', label: '#16140f' },
    night: { skyTop: '#050912', skyBot: '#1b2a47', seaTop: '#12304b', seaBot: '#03070e', haze: 'rgba(120,150,210,.22)', stars: 1, cloud: 'rgba(110,130,175,.28)', cloudShade: 'rgba(8,14,30,.45)', sun: '#e9edf5', glow: 'rgba(170,195,255,.28)', glint: 'rgba(200,220,255,.35)', crest: '#8fb4e8', vig: 'rgba(0,0,6,.5)', sy: 60,
      plate: '#2b3a40', slabA: '#1c262b', slabB: '#141b1f', fog: 'rgba(244,240,230,.08)', line: 'rgba(244,240,230,.20)', miss: 'rgba(244,240,230,.22)', dot: '#f4f0e6', label: '#f4f0e6' },
  };
  const FAR = {
    lagoon: { day: '#3d7861', dusk: '#2d2a45', night: '#0a1322' },
    fjord: { day: '#eef5f8', dusk: '#efcdc6', night: '#556b8c' },
    storm: { day: '#29333f', dusk: '#231e2e', night: '#070b12' },
    archipelago: { day: '#46564f', dusk: '#2b2338', night: '#08101a' },
  };
  const TINT = { lagoon: 'rgba(64,200,170,.10)', fjord: 'rgba(215,236,252,.22)', storm: 'rgba(32,42,52,.46)', archipelago: 'rgba(232,150,92,.10)' };
  const p = { ...T[time], far: FAR[scene][time], tint: TINT[scene] };
  if (scene === 'storm') { p.cloud = time === 'night' ? 'rgba(8,12,20,.75)' : 'rgba(44,52,64,.88)'; p.stars *= 0.2; p.glint = 'rgba(0,0,0,0)'; }
  p.back = mix(p.far, p.skyBot, 0.55);
  return p;
}

/* ---------------- background ---------------- */
const rnd = (i, k) => { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };

function horizon(scene, p, night) {
  const svg = (inner, op = 1) => `<svg aria-hidden="true" viewBox="0 0 1440 120" preserveAspectRatio="xMidYMax slice" style="position:absolute;left:0;top:${HZ - 118}px;width:100%;height:120px;opacity:${op}">${inner}</svg>`;
  const back = svg(`<path fill="${p.back}" d="M0 120 L0 92 L90 74 L170 90 L290 58 L400 88 L520 70 L640 96 L760 84 L860 100 L980 72 L1100 50 L1210 82 L1330 64 L1440 88 L1440 120Z"/>`, 0.85);
  if (scene === 'lagoon') return back + svg(`<g fill="${p.far}"><path d="M0 120 L0 100 C60 82 120 78 190 96 C230 86 270 86 310 100 L350 120Z"/><path d="M590 120 C610 108 660 106 700 120Z"/><path d="M1030 120 C1090 84 1160 74 1230 92 C1280 80 1340 84 1400 106 L1440 120Z"/></g>
    <g stroke="${p.far}" stroke-width="4" fill="none" stroke-linecap="round"><path d="M110 92 C114 72 122 58 138 46"/><path d="M160 96 C164 80 170 66 182 56"/><path d="M1150 80 C1154 60 1162 46 1178 34"/><path d="M1260 92 C1264 76 1272 64 1284 54"/></g>
    <g fill="${p.far}">${[[138, 44, 26], [182, 54, 22], [1178, 32, 26], [1284, 52, 22]].map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r / 4.4}" transform="rotate(-20 ${x} ${y})"/><ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r / 4.4}" transform="rotate(25 ${x} ${y})"/>`).join('')}</g>`);
  if (scene === 'fjord') return back + svg(`<g fill="${p.far}"><polygon points="0,120 40,84 70,98 120,48 170,90 200,70 270,120"/><polygon points="500,120 540,92 590,56 640,96 700,120"/><polygon points="980,120 1040,82 1100,36 1160,86 1215,58 1300,120"/><polygon points="1290,120 1360,76 1440,120"/></g>
    <g fill="rgba(20,50,80,.22)"><polygon points="120,48 170,90 140,120 110,120 100,70"/><polygon points="1100,36 1160,86 1130,120 1090,120 1085,70"/><polygon points="590,56 640,96 620,120 580,120"/></g>`);
  if (scene === 'storm') return svg(`<path fill="${p.far}" d="M0 120 L0 56 Q60 22 120 52 T240 46 T360 56 T480 40 T600 54 T720 36 T840 52 T960 38 T1080 54 T1200 42 T1320 56 T1440 44 L1440 120Z"/>
    <g style="animation:sb-flash 6s linear infinite"><polyline points="840,52 812,84 834,84 800,120" fill="none" stroke="#fff" stroke-width="3" stroke-linejoin="round"/></g>`);
  return back + svg(`<g fill="${p.far}"><path d="M0 120 L0 98 L40 74 L90 90 L130 62 L190 102 L230 120Z"/><path d="M420 120 L450 94 L500 80 L560 98 L590 120Z"/><path d="M1110 120 L1150 96 L1230 84 L1320 98 L1380 120Z"/><polygon points="1212,28 1221,18 1230,28"/></g>
    <rect x="1214" y="38" width="14" height="48" fill="#e9e6dc"/><rect x="1214" y="54" width="14" height="8" fill="#b4472b"/><rect x="1216" y="28" width="10" height="10" fill="#c99a2e"/>
    ${night ? '<polygon points="1216,33 700,10 700,56" fill="rgba(255,232,170,.5)" style="animation:sb-beam 4s ease-in-out infinite"/>' : ''}`);
}

function background(p, scene, time, W, H) {
  // Every render rebuilds the DOM; a negative delay tied to the clock keeps loops seamless across rebuilds.
  const now = performance.now() / 1000;
  const dl = (d, dur) => `${(d - (now % dur)).toFixed(2)}s`;
  const sunX = W * 0.62;
  let out = `<div class="sb-sky" style="height:${HZ}px;background:linear-gradient(180deg,${p.skyTop},${p.skyBot})"></div>`;
  if (p.stars) {
    out += `<div style="position:absolute;inset:0 0 auto;height:${HZ}px;opacity:${p.stars}">`;
    for (let i = 0; i < 40; i++) out += `<i class="sb-dot" style="left:${(i * 379) % W}px;top:${(i * 211) % (HZ - 30)}px;width:${1 + (i % 3)}px;height:${1 + (i % 3)}px;opacity:${0.45 + (i % 4) * 0.14}"></i>`;
    out += '</div>';
  }
  if (scene !== 'storm') {
    const R = time === 'night' ? 30 : 36;
    out += `<i class="sb-dot" style="left:${sunX - 160}px;top:${p.sy - 160}px;width:320px;height:320px;background:radial-gradient(circle,${p.glow} 0%,rgba(255,255,255,0) 66%)"></i>
      <i class="sb-dot" style="left:${sunX - R}px;top:${p.sy - R}px;width:${R * 2}px;height:${R * 2}px;background:${p.sun}"></i>`;
  }
  [[0.06, 30, 0.8, 60], [0.36, 8, 0.6, 75], [0.5, 70, 0.7, 90], [0.8, 40, 0.65, 70], [0.24, 92, 0.45, 80], [0.68, 12, 0.45, 95]].forEach(([x, y, s, dur]) => {
    out += `<div class="sb-cloud" style="left:${Math.round(x * W)}px;top:${y}px;transform:scale(${s})"><div style="animation:sb-drift ${dur}s ease-in-out infinite alternate;animation-delay:${dl(0, dur * 2)}">
      <i style="left:0;top:30px;width:300px;height:36px;background:${p.cloud}"></i><i style="left:50px;top:8px;width:120px;height:44px;background:${p.cloud}"></i>
      <i style="left:150px;top:16px;width:110px;height:36px;background:${p.cloud}"></i><i style="left:96px;top:0;width:70px;height:34px;background:${p.cloud}"></i>
      <i style="left:14px;top:52px;width:272px;height:14px;background:${p.cloudShade}"></i></div></div>`;
  });
  out += horizon(scene, p, time === 'night');
  const SH = H - HZ;
  out += `<div class="sb-sea" style="top:${HZ}px;height:${SH}px;background:linear-gradient(180deg,${p.seaTop},${p.seaBot})">
    <i style="left:${sunX - 50}px;top:0;width:100px;height:${SH}px;background:linear-gradient(180deg,${p.glint},rgba(255,255,255,0) 60%)"></i>`;
  for (let i = 0; i < 60; i++) {
    const y = SH * Math.pow(rnd(i, 1), 1.5), d = y / SH, sc = 0.25 + d * 1.4, du = 3 + rnd(i, 6) * 3, o = (0.1 + d * 0.2 + rnd(i, 4) * 0.08).toFixed(2);
    out += `<i class="sb-crest" style="left:${Math.round(rnd(i, 2) * (W + 60) - 30)}px;top:${Math.round(y + 4)}px;width:${Math.round((24 + rnd(i, 3) * 110) * sc)}px;height:${(1.2 + d * 3.2).toFixed(1)}px;background:${p.crest};--o:${o};opacity:${o};animation-duration:${du.toFixed(1)}s;animation-delay:${dl(rnd(i, 5) * 4, du)}"></i>`;
  }
  out += `<i style="left:0;top:0;width:100%;height:80px;background:linear-gradient(180deg,${p.haze},rgba(255,255,255,0))"></i></div>
    <i style="inset:0;background:${p.tint}"></i><i style="inset:0;background:radial-gradient(ellipse at 50% 45%,rgba(0,0,0,0) 55%,${p.vig} 100%)"></i>`;
  return `<div class="sb-bg" aria-hidden="true">${out}</div>`;
}

/* ---------------- ship models (CSS boxes) ---------------- */
function cutsOf(s) {
  const L = s.len * C;
  if (s.len >= 4) return [L * 0.36, L * 0.68];
  if (s.len === 3) return [L * 0.4, L * 0.7];
  if (s.len === 2) return [L * 0.5];
  return [];
}

function place(list, s, a0, aLen, c0, cLen, z, hgt, top, side, dark, seg) {
  const ox = s.c * C, oy = s.r * C;
  const w = s.horiz ? aLen : cLen, d = s.horiz ? cLen : aLen;
  list.push({ x: s.horiz ? ox + a0 : ox + c0, y: s.horiz ? oy + c0 : oy + a0, w, d, z, h: hgt, top, side, dark, r: 0, seg: seg || 0 });
}

function shipBoxes(list, s) {
  const L = s.len * C, W = C, sunk = s.sunk;
  const AL = s.horiz ? '90deg' : '0deg', AC = s.horiz ? '0deg' : '90deg';
  const HULL = ['#d8d4c8', '#2c2b26', '#1c1c1a'], LIGHT = ['#f5f3ee', '#c9c5b8', '#a8a496'];
  const BRICK = ['#d98a5f', '#b4472b', '#8f3720'], DARK = ['#4a4943', '#2a2924', '#1a1916'];
  const WHITE = ['#ffffff', '#e0ddd2', '#bdb9ad'], GREY = ['#9aa0a3', '#7b8184', '#5f6568'], ORANGE = ['#e7a24a', '#c9801f', '#a3661a'];
  const RED = ['#8f3720', '#8f3720', '#6e2a18'], FOAM = ['rgba(255,255,255,.38)', 'rgba(255,255,255,.2)', 'rgba(255,255,255,.2)'];
  const CHAR = ['#6b675e', '#3b3a35', '#26251f'], EMBER = ['#ffb347', '#e8641a', '#a83a0c'];
  const PLANK = [`repeating-linear-gradient(${AC},#dcd8cc 0 3px,#cbc7ba 3px 4px)`, '#2c2b26', '#1c1c1a'];
  const SDECK = [`repeating-linear-gradient(${AC},#2b2b27 0 3px,#222220 3px 4px)`, '#2c2b26', '#1c1c1a'];
  const ASPH = [`repeating-linear-gradient(${AC},#8d9295 0 5px,#858a8d 5px 6px)`, '#6b7174', '#52585b'];
  const PORT = ['#d8d4c8', `repeating-linear-gradient(${AL},#1f2a33 0 3px,#8a9296 3px 8px)`, `repeating-linear-gradient(${AL},#161e25 0 3px,#5b6368 3px 8px)`];
  const BAND = ['#2d3a44', `repeating-linear-gradient(${AL},#1f2a33 0 5px,#4d5a64 5px 7px)`, `repeating-linear-gradient(${AL},#161e25 0 5px,#38424a 5px 7px)`];
  const RAIL = ['rgba(0,0,0,0)', `repeating-linear-gradient(${AL},#9aa0a3 0 2px,rgba(0,0,0,0) 2px 6px)`, `repeating-linear-gradient(${AL},#767c7f 0 2px,rgba(0,0,0,0) 2px 6px)`];
  const VLS = ['repeating-linear-gradient(0deg,#15140f 0 1px,rgba(0,0,0,0) 1px 4px),repeating-linear-gradient(90deg,#15140f 0 1px,#6a6e71 1px 4px)', '#4a4943', '#2a2924'];
  const PAD = ['radial-gradient(circle,#f5f3ee 0 22%,#3d3c37 24% 100%)', '#2a2924', '#1a1916'];
  const cuts = sunk ? cutsOf(s) : [];
  const B = (a0, aLen, c0, cLen, z, hgt, col, r) => {
    const q = sunk ? CHAR : col, end = a0 + aLen;
    const bounds = [a0, ...cuts.filter((c) => c > a0 + 0.5 && c < end - 0.5), end];
    for (let i = 0; i < bounds.length - 1; i++) {
      const len = bounds[i + 1] - bounds[i];
      if (len < 0.4) continue;
      place(list, s, bounds[i], len, c0, cLen, z, hgt, q[0], q[1], q[2], cuts.filter((c) => c <= bounds[i] + 0.01).length);
      if (r) list[list.length - 1].r = r;
    }
  };
  const hull = (H, m) => {
    B(3, L - 27, m, W - 2 * m, 0, H, PLANK);
    B(L - 24, 6, m + 2, W - 2 * m - 4, 0, H, PLANK);
    B(L - 18, 6, m + 5, W - 2 * m - 10, 0, H, PLANK);
    B(L - 12, 6, m + 8, W - 2 * m - 16, 0, H, PLANK);
    B(L - 6, 4, m + 12, W - 2 * m - 24, 0, H, PLANK);
    B(3, L - 27, m - 2, W - 2 * m + 4, 0, 4, RED);
    B(8, L - 40, m - 1, W - 2 * m + 2, 8, 3, PORT);
    B(5, L - 33, m, 1.5, H, 3, RAIL);
    B(5, L - 33, W - m - 1.5, 1.5, H, 3, RAIL);
  };
  const mast = (a, c, z, hh) => { B(a, 3, c, 3, z, hh, GREY); B(a - 5, 13, c - 2, 7, z + hh, 2, GREY); B(a + 1, 1.5, c + 0.7, 1.5, z + hh + 2, 6, GREY); };
  const funnel = (a, aLen, hh, H) => { B(a, aLen, 17, W - 34, H, hh, BRICK); B(a, aLen, 17, W - 34, H + hh, 3, DARK); B(a + 2, aLen - 4, 19, W - 38, H + hh + 3, 1.5, GREY); };
  const turret = (a, back, n) => {
    B(a, 22, 13, W - 26, 16, 5, DARK);
    B(a + 2, 18, 15, W - 30, 21, 4, GREY);
    const b0 = back ? a - 12 : a + 20;
    for (let i = 0; i < n; i++) {
      const cc = 16 + i * ((W - 36) / Math.max(1, n - 1));
      B(b0, 14, n === 1 ? W / 2 - 1.5 : cc, 3, 21, 3, DARK);
      B(back ? b0 : b0 + 12, 2, n === 1 ? W / 2 - 2 : cc - 0.5, 4, 21, 3.5, GREY);
    }
  };
  const boat = (a, c) => B(a, 9, c, 5, 16, 3, ORANGE);
  const plane = (a, c) => { B(a, 18, c + 3, 4, 19, 3, GREY); B(a + 5, 6, c - 3, 16, 19, 2, GREY); B(a, 3, c + 3.5, 3, 22, 5, GREY); B(a + 16, 3, c + 3.5, 3, 22, 1.5, DARK); };
  if (!sunk) B(-4, L + 8, -2, W + 4, 0, 1, FOAM, 14);
  if (s.kind === 'carrier') {
    hull(16, 7);
    B(2, L - 4, 2, W - 4, 16, 3, ASPH);
    for (let i = 0; i < 7; i++) B(12 + i * 30, 16, W / 2 - 1.5, 3, 19, 1, WHITE);
    B(8, L - 30, 5, 1.5, 19, 1, WHITE); B(8, L - 30, W - 6.5, 1.5, 19, 1, WHITE);
    B(L * 0.6, 32, W - 17, 13, 19, 10, LIGHT); B(L * 0.6 - 1, 34, W - 18, 15, 24, 3, BAND);
    B(L * 0.6 + 4, 22, W - 16, 11, 29, 7, LIGHT); B(L * 0.6 + 3, 24, W - 17, 13, 31, 3, BAND);
    mast(L * 0.6 + 14, W - 11, 37.5, 12);
    plane(22, 8); plane(60, 8); plane(104, 8); plane(150, 8);
  } else if (s.kind === 'battleship') {
    hull(16, 7);
    turret(L - 50, false, 3); turret(L - 82, false, 3); turret(12, true, 3);
    B(L * 0.42, 26, 14, W - 28, 16, 10, LIGHT); B(L * 0.42 - 1, 28, 13, W - 26, 21, 3, BAND);
    B(L * 0.42 + 3, 20, 16, W - 32, 26, 8, LIGHT); B(L * 0.42 + 2, 22, 15, W - 30, 28, 3, BAND);
    mast(L * 0.42 + 12, W / 2 - 1.5, 34, 14);
    funnel(L * 0.42 + 34, 14, 18, 16);
    boat(L * 0.42 - 20, 8); boat(L * 0.42 - 20, W - 13);
  } else if (s.kind === 'cruiser') {
    hull(16, 8);
    turret(L - 44, false, 2);
    B(L - 66, 16, 16, W - 32, 16, 2, VLS);
    B(24, 26, 11, 26, 16, 1.5, PAD, 13);
    B(L * 0.4, 22, 15, W - 30, 16, 10, LIGHT); B(L * 0.4 - 1, 24, 14, W - 28, 21, 3, BAND);
    mast(L * 0.4 + 9, W / 2 - 1.5, 26, 12);
    funnel(L * 0.62, 12, 14, 16);
  } else if (s.kind === 'sub') {
    B(10, L - 28, 11, W - 22, 0, 12, SDECK); B(L - 18, 8, 14, W - 28, 0, 12, SDECK);
    B(L - 10, 8, 18, W - 36, 0, 12, SDECK); B(L - 4, 3, 22, W - 44, 0, 12, SDECK);
    B(3, 7, 15, W - 30, 0, 12, SDECK); B(10, L - 28, 9, W - 18, 0, 3, RED);
    B(L * 0.45, 22, 17, W - 34, 12, 11, SDECK); B(L * 0.45 + 4, 14, 18, W - 36, 23, 3, GREY);
    B(L * 0.45 + 14, 2, W / 2 - 1, 2, 26, 9, GREY); B(L * 0.45 + 8, 2, W / 2 - 1, 2, 26, 6, GREY);
  } else if (s.kind === 'destroyer') {
    hull(16, 9);
    B(L - 28, 12, 17, W - 34, 16, 5, DARK); B(L - 18, 12, W / 2 - 1.5, 3, 19, 3, GREY);
    B(8, 12, 17, W - 34, 16, 5, DARK); B(0, 10, W / 2 - 1.5, 3, 19, 3, GREY);
    B(L * 0.38, 18, 16, W - 32, 16, 10, LIGHT); B(L * 0.38 - 1, 20, 15, W - 30, 21, 3, BAND);
    mast(L * 0.38 + 8, W / 2 - 1.5, 26, 12);
    funnel(L * 0.62, 10, 10, 16);
  } else {
    B(7, 26, 13, W - 26, 0, 10, [PLANK[0], HULL[1], HULL[2]]);
    B(33, 6, 16, W - 32, 0, 10, HULL); B(39, 4, 20, W - 40, 0, 10, HULL);
    B(7, 26, 11, W - 22, 0, 3, RED);
    B(11, 14, 16, W - 32, 10, 8, LIGHT); B(10, 16, 15, W - 30, 13, 3, BAND);
    B(15, 2, W / 2 - 1, 2, 19.5, 9, GREY);
  }
  cuts.forEach((c, k) => {
    place(list, s, c - 2, 2, 6, W - 12, 0, 16, EMBER[0], EMBER[1], EMBER[2], k);
    place(list, s, c, 2, 6, W - 12, 0, 16, EMBER[0], EMBER[1], EMBER[2], k + 1);
  });
}

const boxHtml = (b) => `<div class="bx" style="left:${b.x}px;top:${b.y}px;width:${b.w}px;height:${b.d}px;transform:translateZ(${b.z}px)">`
  + `<i style="width:${b.w}px;height:${b.d}px;border-radius:${b.r}px;background:${b.top};transform:translateZ(${b.h}px)"></i>`
  + `<i style="top:${b.d - b.h}px;width:${b.w}px;height:${b.h}px;background:${b.side};transform-origin:50% 100%;transform:rotateX(-90deg)"></i>`
  + '</div>'; // ponytail: back/left/right faces dropped, invisible under the fixed straight-on camera

const fireHtml = (x, y, z, w, hh) => `<div class="sb-at" style="left:${x}px;top:${y}px;transform:translateZ(${z}px)"><div class="sb-up" style="left:${-w / 2}px;top:${-hh}px;width:${w}px;height:${hh}px">
  <i style="left:-30%;bottom:-10%;width:160%;height:60%;border-radius:50%;background:radial-gradient(ellipse,rgba(255,150,40,.55) 0%,rgba(255,150,40,0) 70%)"></i>
  <i class="fl" style="left:14%;width:72%;height:86%;background:radial-gradient(ellipse at 50% 85%,#ffe08a 0%,#ff9a2e 36%,#e0431c 66%,rgba(176,40,10,0) 100%)"></i>
  <i class="fl fl2" style="left:3%;width:40%;height:64%;background:radial-gradient(ellipse at 50% 85%,#ffd070 0%,#ff7a22 40%,rgba(200,50,12,0) 100%)"></i>
  <i class="smk" style="left:28%;bottom:70%;width:44%;height:30%;background:radial-gradient(circle,rgba(40,40,38,.55) 0%,rgba(40,40,38,0) 70%);animation-delay:${(-(x + y) % 30) / 10}s"></i></div></div>`;

const DROPS = [[-18, -34, 0], [-10, -46, 0.03], [-3, -54, 0.06], [6, -48, 0.02], [13, -40, 0.05], [21, -30, 0.01], [0, -62, 0.08]];
const splashHtml = (x, y) => `<div class="sb-at" style="left:${x}px;top:${y}px"><i class="sb-ring" style="left:-30px;top:-30px;width:60px;height:60px;border-width:3px"></i>
  <div class="sb-up" style="left:-20px;top:-66px;width:40px;height:66px"><i class="sb-col" style="left:12px;width:16px;height:58px"></i><i class="sb-col" style="left:5px;width:30px;height:12px;border-radius:50%"></i>
  ${DROPS.map(([dx, dy, d]) => `<i class="sb-drop" style="--dx:${dx}px;--dy:${dy}px;animation-delay:${d}s"></i>`).join('')}</div></div>`;

const boomHtml = (x, y, z) => `<div class="sb-at" style="left:${x}px;top:${y}px;transform:translateZ(${z}px)"><i class="sb-ring" style="left:-70px;top:-70px;width:140px;height:140px;border-width:4px;animation-duration:1.3s"></i>
  <div class="sb-up" style="left:-55px;top:-110px;width:110px;height:110px"><i class="sb-ball"></i></div></div>`;

// One ship: intact, or broken into tilted pieces with fires when sunk.
function shipHtml(s, idx, fresh) {
  const list = [];
  shipBoxes(list, s);
  if (!s.sunk) return list.map(boxHtml).join('');
  const L = s.len * C, W = C, ox = s.c * C, oy = s.r * C;
  const cuts = cutsOf(s), n = cuts.length + 1;
  const PIT = [-9, 6, 13, -15], ROL = [11, -14, 8, -7];
  const along = s.horiz ? '1,0,0' : '0,1,0', cross = s.horiz ? '0,1,0' : '1,0,0';
  let out = '';
  for (let k = 0; k < n; k++) {
    const a0 = k ? cuts[k - 1] : 0, a1 = k < n - 1 ? cuts[k] : L, am = (a0 + a1) / 2;
    const pitch = n === 1 ? 10 : PIT[(k + idx) % 4], roll = n === 1 ? 22 : ROL[(k + idx * 2) % 4];
    const shiftA = (k - (n - 1) / 2) * 8, lat = k % 2 ? 6 : -5;
    const lift = Math.ceil(((a1 - a0) / 2) * Math.sin((Math.abs(pitch) * Math.PI) / 180) + (W / 2) * Math.sin((Math.abs(roll) * Math.PI) / 180)) + 2;
    const cx = s.horiz ? ox + am : ox + W / 2, cy = s.horiz ? oy + W / 2 : oy + am;
    const dx = s.horiz ? shiftA : lat, dy = s.horiz ? lat : shiftA;
    out += `<div class="sb-at ${fresh ? 'brk' : ''}" style="transform-origin:${cx}px ${cy}px 0;transform:translate3d(${dx}px,${dy}px,${lift}px) rotate3d(${along},${roll}deg) rotate3d(${cross},${pitch}deg)">${list.filter((b) => b.seg === k).map(boxHtml).join('')}</div>`;
    out += fireHtml(cx + dx, cy + dy, lift + 18, 46, 68);
  }
  if (fresh) out += boomHtml(ox + (s.horiz ? L / 2 : W / 2), oy + (s.horiz ? W / 2 : L / 2), 14);
  return out;
}

/* ---------------- board ---------------- */
// cell(r,c) -> { cls, bg, fire?, z? }. Ships: [{r,c,len,dir,sunk,i}]. Returns the board block HTML.
function boardHtml({ x, y, p, title, note, active, cell, ships, splash, freshSunk, fleet, id }) {
  let cells = '', fx = '';
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      const q = cell(r, c);
      cells += `<button class="sb-cell ${q.cls || ''}" data-r="${r}" data-c="${c}" aria-label="${LET[c]}${r + 1}" ${q.can ? '' : 'tabindex="-1"'} style="left:${c * C}px;top:${r * C}px;background:${q.bg}"></button>`;
      if (q.fire) fx += fireHtml(c * C + 24, r * C + 24, q.z, 30, 46);
    }
  }
  ships.forEach((sh, n) => {
    const s = { r: sh.r, c: sh.c, len: sh.len, horiz: sh.dir === 'h', sunk: sh.sunk, kind: kindOf(sh.len, sh.i ?? sh.idx) };
    fx = shipHtml(s, n, freshSunk === sh) + fx;
  });
  if (splash) fx += splashHtml(splash[1] * C + 24, splash[0] * C + 24);
  let slabs = '';
  for (let i = 1; i <= 5; i++) slabs += `<i style="inset:0;border-radius:22px;background:${i % 2 ? p.slabA : p.slabB};transform:translateZ(${-i * 3}px)"></i>`;
  const labels = [...LET].map((t, i) => `<b style="left:${24 + i * C}px;top:4px;width:${C}px">${t}</b><b style="left:0;top:${24 + i * C + 16}px;width:24px">${i + 1}</b>`).join('');
  return `<section class="sb-board ${active ? 'on' : ''}" id="${id}" style="left:${x}px;top:${y}px">
    <div class="sb-cam"><div class="sb-plate" style="--line:${p.line};--dot:${p.dot};background:linear-gradient(180deg,rgba(255,255,255,.10),rgba(255,255,255,0)),${p.plate};color:${p.label}">
      ${slabs}<i class="sb-rim"></i>${labels}
      <div class="sb-grid">${cells}</div>
      <div class="sb-fx">${fx}</div>
    </div></div>
    <header class="sb-cap"><h4>${title}</h4><span>${note || ''}</span></header>
    <div class="sb-fleet">${fleet}</div>
  </section>`;
}

const segs = (n, hitAt = () => false) => Array.from({ length: n }, (_, k) => `<i class="${hitAt(k) ? 'hit' : ''}"></i>`).join('');

// The scene stays mounted between renders: the sea is rebuilt only when look/size change and the
// boards only when their HTML changes, so chat messages and repeated room updates cost nothing.
let M = null; // { wrap, stage, bg, host, bgKey, html }
let handlers = {};
function stage(el, boards, extraClass, on = {}) {
  const fs = document.fullscreenElement === el;
  const avail = (el.clientWidth || 1000) - (fs ? 32 : 0);
  const wide = avail >= 720 && boards.length === 2;
  const W = wide ? 1200 : 600;
  const stacked = !wide && boards.length === 2;
  const H = BOARD_TOP + (stacked ? 2 * BLOCK : BLOCK);
  const k = fs ? Math.min(avail / W, (innerHeight - 110) / H) : Math.min(1, avail / W);
  const p = palette(look.time, look.scene);
  const pos = boards.map((_, i) => (stacked ? [36, BOARD_TOP + i * BLOCK] : wide ? [W / 2 - 24 - 528 + i * 576, BOARD_TOP] : [36, BOARD_TOP]));

  if (!M || M.wrap.parentNode !== el) {
    el.innerHTML = '';
    const bg = h('div'), host = h('div');
    host.addEventListener('click', (e) => handlers.click?.(e));
    host.addEventListener('mouseover', (e) => handlers.over?.(e));
    host.addEventListener('mouseleave', (e) => handlers.leave?.(e));
    const stg = h('div', { class: 'sb-stage' }, bg, host);
    M = { wrap: h('div', {}, stg), stage: stg, bg, host };
    el.append(M.wrap);
  } else {
    [...el.children].forEach((c) => c !== M.wrap && c.remove());
  }
  handlers = on;
  M.wrap.className = `sb-wrap ${extraClass || ''}`;
  M.wrap.style.cssText = `width:${W * k}px;height:${H * k}px`;
  M.stage.style.cssText = `width:${W}px;height:${H}px;transform:scale(${k})`;
  const bgKey = `${look.time}|${look.scene}|${W}|${H}`;
  if (M.bgKey !== bgKey) { M.bgKey = bgKey; M.bg.innerHTML = background(p, look.scene, look.time, W, H); }
  const html = boards.map((b, i) => boardHtml({ ...b, x: pos[i][0], y: pos[i][1], p })).join('');
  if (M.html !== html) { M.html = html; M.host.innerHTML = html; }
  return M.wrap;
}

document.addEventListener('fullscreenchange', () => lastCtx?.rerender());

// The board area (not the stage) goes fullscreen: it survives rerenders, the stage is rebuilt each time.
function lookControls(ctx) {
  const area = document.getElementById('board');
  const fs = document.fullscreenElement === area;
  const seg = (list, key) => h('div', { class: 'sb-seg', role: 'group' }, list.map(([id, label]) =>
    h('button', { 'aria-pressed': String(look[key] === id), onclick: () => { look[key] = id; save(`sb-${key}`, id); ctx.rerender(); } }, label)));
  return h('div', { class: 'sb-look' },
    // Outside fullscreen the room's status line is visible; inside, repeat it here.
    fs ? h('div', { class: 'sb-fs-status' }, document.getElementById('status')?.textContent || '') : null,
    seg(TIMES, 'time'), seg(SCENES, 'scene'),
    area?.requestFullscreen ? h('button', { class: 'btn small ghost', onclick: () => (fs ? document.exitFullscreen() : area.requestFullscreen()).catch(() => {}) }, fs ? 'Выйти из полноэкранного' : 'Во весь экран') : null);
}

/* ---------------- placement ---------------- */
function renderPlacement(el, v, ctx) {
  const size = v.size, fleet = v.fleet;
  if (!P || P.key !== ctx.gameKey) P = { key: ctx.gameKey, ships: [], dir: 'h', pick: 0, hover: null };
  const placed = new Set(P.ships.map((s) => s.idx));
  if (P.pick < 0 || placed.has(P.pick)) P.pick = fleet.findIndex((_, i) => !placed.has(i));
  const occ = {};
  P.ships.forEach((s) => cellsOf(s).forEach(([r, c]) => (occ[`${r},${c}`] = s.idx)));
  const p = palette(look.time, look.scene);
  const at = (e) => { const b = e.target.closest('.sb-cell'); return b && [+b.dataset.r, +b.dataset.c]; };
  let cellEls = {};
  const preview = (pos) => {
    Object.values(cellEls).forEach((b) => b.classList.remove('ok', 'bad'));
    if (!pos || P.pick < 0) return;
    const cand = { r: pos[0], c: pos[1], len: fleet[P.pick], dir: P.dir };
    const bad = blocked(P.ships, cand, size);
    cellsOf(cand).forEach(([r, c]) => cellEls[`${r},${c}`]?.classList.add(bad ? 'bad' : 'ok'));
  };

  const wrap = stage(el, [{
    id: 'sb-mine', title: 'Свои воды', note: `${P.ships.length} из ${fleet.length} на воде`, active: true,
    cell: (r, c) => ({ bg: p.fog, cls: 'can', can: true }),
    ships: P.ships.map((s) => ({ ...s, sunk: false })),
    fleet: fleet.map((len, i) => `<span class="${placed.has(i) ? 'done' : ''}" title="${NAME[KIND[i]]}">${segs(len)}</span>`).join(''),
  }], 'sb-placing', {
    over: (e) => { P.hover = at(e); preview(P.hover); },
    leave: () => { P.hover = null; preview(null); },
    click: (e) => {
      const pos = at(e);
      if (!pos) return;
      const k = `${pos[0]},${pos[1]}`;
      if (occ[k] !== undefined) {
        const ship = P.ships.find((s) => s.idx === occ[k]);
        P.ships = P.ships.filter((s) => s !== ship);
        P.pick = ship.idx;
        P.dir = ship.dir;
      } else if (P.pick >= 0) {
        const cand = { idx: P.pick, r: pos[0], c: pos[1], len: fleet[P.pick], dir: P.dir };
        if (blocked(P.ships, cand, size)) return;
        P.ships.push(cand);
      }
      ctx.rerender();
    },
  });

  wrap.querySelectorAll('.sb-cell').forEach((b) => (cellEls[`${b.dataset.r},${b.dataset.c}`] = b));
  preview(P.hover);

  const allPlaced = P.ships.length === fleet.length;
  el.append(
    h('div', { class: 'sb-dock' },
      h('div', { class: 'sb-pick' }, fleet.map((len, i) =>
        h('button', {
          class: `${placed.has(i) ? 'done' : ''} ${P.pick === i ? 'sel' : ''}`, disabled: placed.has(i),
          onclick: () => { P.pick = i; ctx.rerender(); },
        }, h('span', { html: segs(len) }), NAME[KIND[i]]))),
      h('div', { class: 'sb-tools' },
        h('button', { class: 'btn small', onclick: () => { P.dir = P.dir === 'h' ? 'v' : 'h'; ctx.rerender(); } }, `Повернуть (R): ${P.dir === 'h' ? 'по горизонтали' : 'по вертикали'}`),
        h('button', { class: 'btn small', onclick: () => { P.ships = randomFleet(fleet, size); ctx.rerender(); } }, 'Случайно'),
        h('button', { class: 'btn small ghost', onclick: () => { P.ships = []; P.pick = 0; ctx.rerender(); } }, 'Очистить'),
        h('button', {
          class: 'btn small primary', disabled: !allPlaced,
          onclick: () => ctx.send({ t: 'place', ships: [...P.ships].sort((a, b) => a.idx - b.idx).map(({ r, c, len, dir }) => ({ r, c, len, dir })) }),
        }, 'Готов к бою'),
      ),
      h('p', { class: 'sb-help' }, 'Выберите корабль и кликните по полю. Клик по кораблю снимает его. Корабли не касаются друг друга, даже углами.'),
      lookControls(ctx),
    ),
  );
}

/* ---------------- battle ---------------- */
function renderBattle(el, v, ctx) {
  const you = ctx.you;
  const canFire = ctx.myTurn && v.phase === 'play';
  const p = palette(look.time, look.scene);
  const l = v.last;
  const shotKey = `${ctx.gameKey}:${l ? `${l.by},${l.r},${l.c},${l.res}` : ''}`;
  const fresh = l && shotKey !== seenShot;
  seenShot = shotKey;
  const isLast = (by, r, c) => l && l.by === by && l.r === r && l.c === c;
  const owner = (ships) => {
    const m = {};
    ships.forEach((s) => cellsOf(s).forEach(([r, c]) => (m[`${r},${c}`] = s)));
    return m;
  };
  const freshSunkIn = (ships, by) => (fresh && l.res === 'sunk' && l.by === by ? ships.find((s) => cellsOf(s).some(([r, c]) => r === l.r && c === l.c)) : null);

  const shotAt = (grid, ship, r, c, z) => {
    const shot = grid[r][c];
    if (shot === 'hit') return ship?.sunk ? { bg: 'rgba(28,28,26,.85)' } : { bg: 'rgba(180,71,43,.8)', fire: true, z };
    if (shot) return { bg: p.miss, cls: 'miss' }; // 'miss' or 'near' (auto-marked around a wreck)
    return null;
  };

  const myShips = v.myShips || [];
  const mine = owner(myShips);
  const myHits = (s) => (k) => { const [r, c] = cellsOf(s)[k]; return v.atMe[r][c] === 'hit'; };
  const myBoard = {
    id: 'sb-mine', title: 'Свои воды',
    note: v.phase === 'place' ? 'флот на позиции' : !canFire && !v.over ? 'под огнём' : '',
    active: !canFire && v.phase === 'play' && !v.over,
    cell: (r, c) => {
      const q = shotAt(v.atMe, mine[`${r},${c}`], r, c, 24) || { bg: p.fog };
      if (isLast(1 - you, r, c)) q.cls = `${q.cls || ''} last`;
      return q;
    },
    ships: myShips,
    freshSunk: freshSunkIn(myShips, 1 - you),
    splash: fresh && l.by !== you && l.res === 'miss' ? [l.r, l.c] : null,
    fleet: myShips.map((s) => `<span class="${s.sunk ? 'sunk' : ''}" title="${NAME[kindOf(s.len, s.i)]}">${segs(s.len, myHits(s))}</span>`).join(''),
  };
  if (v.phase === 'place') {
    stage(el, [myBoard]);
    el.append(h('div', { class: 'sb-dock' }, lookControls(ctx)));
    return;
  }

  const theirs = owner(v.enemyShips);
  let shots = 0, hits = 0;
  v.atThem.forEach((row) => row.forEach((x) => { if (x === 'hit' || x === 'miss') shots++; if (x === 'hit') hits++; }));
  const sunkIdx = new Set(v.enemyShips.filter((s) => s.sunk).map((s) => s.i));
  const enemyBoard = {
    id: 'sb-theirs', title: 'Чужие воды',
    note: `${hits} попад. / ${shots} выстр.${shots ? ` · ${Math.round((hits / shots) * 100)}%` : ''}`,
    active: canFire,
    cell: (r, c) => {
      const q = shotAt(v.atThem, theirs[`${r},${c}`], r, c, 2) || { bg: p.fog, cls: canFire ? 'can' : '', can: canFire };
      if (isLast(you, r, c)) q.cls = `${q.cls || ''} last`;
      return q;
    },
    ships: v.enemyShips,
    freshSunk: freshSunkIn(v.enemyShips, you),
    splash: fresh && l.by === you && l.res === 'miss' ? [l.r, l.c] : null,
    fleet: v.fleet.map((len, i) => `<span class="${sunkIdx.has(i) ? 'sunk' : ''}" title="${NAME[KIND[i]]}">${segs(len)}</span>`).join(''),
  };

  stage(el, [enemyBoard, myBoard], '', {
    click: (e) => {
      const b = canFire && e.target.closest('#sb-theirs .sb-cell.can');
      if (b) ctx.send({ t: 'fire', r: +b.dataset.r, c: +b.dataset.c });
    },
  });
  el.append(h('div', { class: 'sb-dock' }, lookControls(ctx)));
}

export default {
  id: 'seabattle',
  ownsBoard: true,
  name: 'Морской бой',
  blurb: 'Спрячьте флот и топите корабли соперника клетка за клеткой.',
  length: '10 min',
  sides: ['Адмирал · стреляет первым', 'Адмирал'],
  swatches: ['var(--p0)', 'var(--p1)'],
  artBg: '#134557',
  art: `<svg viewBox="0 0 160 90"><defs><linearGradient id="sbsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#78a9cc"/><stop offset="1" stop-color="#e1ecf0"/></linearGradient><linearGradient id="sbsea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a7f96"/><stop offset="1" stop-color="#134557"/></linearGradient></defs>
    <rect width="160" height="34" fill="url(#sbsky)"/><circle cx="104" cy="16" r="7" fill="#fff3d2"/><path d="M0 34 L0 28 C14 24 26 24 40 29 L52 34Z M120 34 C132 26 146 25 160 30 L160 34Z" fill="#3d7861"/>
    <rect y="34" width="160" height="56" fill="url(#sbsea)"/>
    <g transform="translate(36 40) skewX(-8)"><rect width="88" height="44" rx="4" fill="#cfdde2"/><g stroke="rgba(22,20,15,.18)">${Array.from({ length: 9 }, (_, i) => `<path d="M${(i + 1) * 8.8} 0v44M0 ${(i + 1) * 4.4}h88"/>`).join('')}</g>
    <rect x="9" y="9" width="35" height="7" rx="2" fill="#d8d4c8"/><rect x="62" y="22" width="7" height="18" rx="2" fill="#2c2b26"/><rect x="18" y="31" width="10" height="5" fill="rgba(180,71,43,.85)"/><circle cx="56" cy="11" r="1.6" fill="#16140f"/><circle cx="76" cy="9" r="1.6" fill="#16140f"/></g></svg>`,
  rules: [
    'Флот: авианосец (5), линкор (4), крейсер и подлодка (по 3), эсминец (2) и четыре катера (1). Корабли не касаются друг друга, даже углами.',
    'Стреляйте по чужим водам по очереди. Попадание даёт ещё один выстрел.',
    'Потопите весь флот соперника, чтобы победить.',
  ],
  score: (v) => ({ values: v.left, label: 'кораблей' }),
  simultaneous: (v) => v.phase === 'place',
  status(v, ctx) {
    const other = ctx.names[1 - ctx.you];
    if (v.phase === 'place') {
      if (!v.ready[ctx.you]) return { text: 'Расставьте флот', tone: 'turn' };
      return { text: `Флот готов. Ждём, пока ${other} расставит свой…`, tone: '' };
    }
    const l = v.last;
    const at = l ? `${LET[l.c]}${l.r + 1}` : '';
    if (l && l.res !== 'miss') {
      if (l.by === ctx.you) return { text: l.res === 'sunk' ? `${at}: корабль потоплен! Стреляйте ещё` : `${at}: попадание! Стреляйте ещё`, tone: 'turn' };
      return { text: `${other} ${l.res === 'sunk' ? 'потопил ваш корабль' : 'попал'} (${at}) и стреляет снова`, tone: '' };
    }
    if (ctx.myTurn) return { text: l ? `${other}: ${at} мимо. Ваш выстрел` : 'Ваш выстрел', tone: 'turn' };
    return { text: l ? `${at} мимо. Стреляет ${other}` : `Стреляет ${other}`, tone: '' };
  },
  render(el, v, ctx) {
    lastCtx = ctx;
    if (v.phase === 'place' && !v.ready[ctx.you]) renderPlacement(el, v, ctx);
    else renderBattle(el, v, ctx);
  },
};
