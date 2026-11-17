import { h } from '../ui.js';

const COLS = 'ABCDEFGHIJ';
let P = null; // local placement state: { key, ships: [{idx,r,c,len,dir}], dir, pick, hover }
let lastCtx = null;

const cellsOf = (s) => Array.from({ length: s.len }, (_, i) => (s.dir === 'h' ? [s.r, s.c + i] : [s.r + i, s.c]));

// True if a ship can't go there: off the grid, or touching another ship (diagonals included).
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
  if ((e.key === 'r' || e.key === 'R') && P && document.querySelector('.placement') && document.activeElement?.tagName !== 'INPUT') {
    P.dir = P.dir === 'h' ? 'v' : 'h';
    lastCtx?.rerender();
  }
});

function ocean(size, cellFn, extraClass = '') {
  const grid = h('div', { class: `ocean ${extraClass}` }, h('div', {}));
  for (let c = 0; c < size; c++) grid.append(h('div', { class: 'lbl' }, COLS[c]));
  for (let r = 0; r < size; r++) {
    grid.append(h('div', { class: 'lbl' }, r + 1));
    for (let c = 0; c < size; c++) grid.append(cellFn(r, c));
  }
  return grid;
}

function fleetBar(lens, sunkFlags) {
  return h('div', { class: 'fleet-bar' },
    lens.map((len, i) => h('div', { class: `fleet-ship static ${sunkFlags[i] ? 'sunk' : ''}`, title: `${len}-cell ship${sunkFlags[i] ? ' (sunk)' : ''}` },
      Array.from({ length: len }, () => h('i')))));
}

function renderPlacement(el, v, ctx) {
  const size = v.size, fleet = v.fleet;
  if (!P || P.key !== ctx.gameKey) P = { key: ctx.gameKey, ships: [], dir: 'h', pick: 0, hover: null };
  const placed = new Set(P.ships.map((s) => s.idx));
  if (P.pick < 0 || placed.has(P.pick)) P.pick = fleet.findIndex((_, i) => !placed.has(i));
  const occ = {};
  P.ships.forEach((s) => cellsOf(s).forEach(([r, c]) => (occ[`${r},${c}`] = s.idx)));

  const cellEls = {};
  const preview = (pos) => {
    Object.values(cellEls).forEach((b) => b.classList.remove('prev-ok', 'prev-bad'));
    if (!pos || P.pick < 0) return;
    const cand = { r: pos[0], c: pos[1], len: fleet[P.pick], dir: P.dir };
    const bad = blocked(P.ships, cand, size);
    cellsOf(cand).forEach(([r, c]) => cellEls[`${r},${c}`]?.classList.add(bad ? 'prev-bad' : 'prev-ok'));
  };

  const grid = ocean(size, (r, c) => {
    const k = `${r},${c}`;
    const b = h('button', {
      class: `cell clickable ${occ[k] !== undefined ? 'ship' : ''}`,
      onmouseenter: () => { P.hover = [r, c]; preview(P.hover); },
      onclick: () => {
        if (occ[k] !== undefined) {
          const ship = P.ships.find((s) => s.idx === occ[k]);
          P.ships = P.ships.filter((s) => s !== ship);
          P.pick = ship.idx;
          P.dir = ship.dir;
        } else if (P.pick >= 0) {
          const cand = { idx: P.pick, r, c, len: fleet[P.pick], dir: P.dir };
          if (blocked(P.ships, cand, size)) return;
          P.ships.push(cand);
        }
        ctx.rerender();
      },
    });
    cellEls[k] = b;
    return b;
  }, 'placement');
  grid.addEventListener('mouseleave', () => { P.hover = null; preview(null); });

  const allPlaced = P.ships.length === fleet.length;
  el.append(
    h('div', { class: 'sea-side' },
      h('div', { class: 'fleet-bar' }, fleet.map((len, i) =>
        h('button', {
          class: `fleet-ship ${placed.has(i) ? 'placed' : ''} ${P.pick === i ? 'sel' : ''}`,
          title: `${len}-cell ship`,
          onclick: () => { if (!placed.has(i)) { P.pick = i; ctx.rerender(); } },
        }, Array.from({ length: len }, () => h('i'))))),
      grid,
      h('div', { class: 'place-tools' },
        h('button', { class: 'btn small', onclick: () => { P.dir = P.dir === 'h' ? 'v' : 'h'; ctx.rerender(); } }, `Rotate (R) · ${P.dir === 'h' ? 'horizontal' : 'vertical'}`),
        h('button', { class: 'btn small', onclick: () => { P.ships = randomFleet(fleet, size); ctx.rerender(); } }, 'Random'),
        h('button', { class: 'btn small ghost', onclick: () => { P.ships = []; P.pick = 0; ctx.rerender(); } }, 'Clear'),
        h('button', {
          class: 'btn small primary', disabled: !allPlaced,
          onclick: () => ctx.send({ t: 'place', ships: P.ships.map(({ r, c, len, dir }) => ({ r, c, len, dir })) }),
        }, 'Ready — start battle'),
      ),
      h('p', { class: 'place-help' }, 'Pick a ship, then click the grid. Click a placed ship to move it. Ships may not touch, even at corners.'),
    ),
  );
  preview(P.hover);
}

function renderBattle(el, v, ctx) {
  const size = v.size, you = ctx.you;
  const canFire = ctx.myTurn && v.phase === 'play';
  const myCells = {};
  (v.myShips || []).forEach((s) => cellsOf(s).forEach(([r, c]) => (myCells[`${r},${c}`] = s)));
  const enemyCells = {};
  v.enemyShips.forEach((s) => cellsOf(s).forEach(([r, c]) => (enemyCells[`${r},${c}`] = s)));
  const lastOn = (by, r, c) => v.last && v.last.by === by && v.last.r === r && v.last.c === c;

  const mine = ocean(size, (r, c) => {
    const ship = myCells[`${r},${c}`], shot = v.atMe[r][c];
    return h('div', { class: `cell ${ship ? 'ship' : ''} ${ship?.sunk ? 'sunk' : ''} ${shot || ''} ${lastOn(1 - you, r, c) ? 'lastshot' : ''}` });
  });

  const myFleet = fleetBar((v.myShips || []).map((s) => s.len), (v.myShips || []).map((s) => s.sunk));
  const mySide = h('div', { class: `sea-side ${!canFire && v.phase === 'play' && !v.over ? 'active' : ''}` }, h('h4', {}, 'Your waters'), mine, myFleet);

  if (v.phase === 'place') {
    el.append(h('div', { class: 'sea' }, mySide));
    return;
  }

  const theirs = ocean(size, (r, c) => {
    const shot = v.atThem[r][c], ship = enemyCells[`${r},${c}`];
    const can = canFire && !shot;
    return h('button', {
      class: `cell ${ship ? (ship.sunk ? 'enemy-sunk' : 'ship') : ''} ${shot || ''} ${can ? 'clickable' : ''} ${lastOn(you, r, c) ? 'lastshot' : ''}`,
      onclick: can ? () => ctx.send({ t: 'fire', r, c }) : null,
      'aria-label': `${COLS[c]}${r + 1}`,
      tabindex: can ? 0 : -1,
    });
  });
  // Enemy fleet status: we only learn which ships are sunk
  const sunkLens = v.enemyShips.filter((s) => s.sunk).map((s) => s.len);
  const flags = v.fleet.map((len) => {
    const i = sunkLens.indexOf(len);
    if (i >= 0) { sunkLens.splice(i, 1); return true; }
    return false;
  });
  const theirSide = h('div', { class: `sea-side ${canFire ? 'active' : ''}` }, h('h4', {}, canFire ? 'Enemy waters — fire!' : 'Enemy waters'), theirs, fleetBar(v.fleet, flags));

  el.append(h('div', { class: 'sea two' }, theirSide, mySide));
}

export default {
  id: 'seabattle',
  name: 'Sea Battle',
  blurb: 'Hide your fleet, then hunt the enemy’s ships square by square.',
  length: '10 min',
  sides: ['Admiral · fires first', 'Admiral'],
  swatches: ['var(--p0)', 'var(--p1)'],
  artBg: '#0c2f36',
  art: `<svg viewBox="0 0 160 90"><rect width="160" height="90" fill="#133556"/>
    <g stroke="rgba(120,170,220,.18)">${Array.from({ length: 16 }, (_, i) => `<path d="M${i * 10} 0v90"/>`).join('')}${Array.from({ length: 9 }, (_, i) => `<path d="M0 ${i * 10}h160"/>`).join('')}</g>
    <rect x="30" y="40" width="50" height="10" rx="5" fill="#8a97aa"/><rect x="100" y="20" width="10" height="40" rx="5" fill="#8a97aa"/>
    <text x="55" y="49" font-size="13" font-weight="900" fill="#ff5d4a" text-anchor="middle">✕</text>
    <text x="105" y="39" font-size="13" font-weight="900" fill="#ff5d4a" text-anchor="middle">✕</text>
    ${[[125, 75], [15, 15], [70, 25], [135, 45], [45, 75]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.5" fill="#8fb2d6"/>`).join('')}</svg>`,
  rules: ['Place 5 ships (sizes 5, 4, 3, 3, 2) on your grid — they may not touch.', 'Take turns firing at the enemy grid. A hit lets you fire again.', 'Sink every enemy ship to win.'],
  score: (v) => ({ values: v.left, label: 'ships' }),
  simultaneous: (v) => v.phase === 'place',
  status(v, ctx) {
    const other = ctx.names[1 - ctx.you];
    if (v.phase === 'place') {
      if (!v.ready[ctx.you]) return { text: 'Place your fleet', tone: 'turn' };
      return { text: `Fleet ready — waiting for ${other} to place theirs…`, tone: '' };
    }
    const l = v.last;
    if (l && l.res !== 'miss') {
      if (l.by === ctx.you) return { text: l.res === 'sunk' ? 'You sunk a ship! Fire again' : 'Hit! Fire again', tone: 'turn' };
      return { text: `${other} ${l.res === 'sunk' ? 'sunk your ship' : 'hit your ship'} and fires again`, tone: '' };
    }
    return null;
  },
  render(el, v, ctx) {
    lastCtx = ctx;
    if (v.phase === 'place' && !v.ready[ctx.you]) renderPlacement(el, v, ctx);
    else renderBattle(el, v, ctx);
  },
};
