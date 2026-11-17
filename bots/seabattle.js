const GAME = require('../games/seabattle');
const { rand, pickRandom, chance } = require('./util');

const SIZE = 10;
const FLEET = [5, 4, 3, 3, 2, 1, 1, 1, 1]; // must match games/seabattle.js FLEET
const inB = (r, c) => r >= 0 && r < SIZE && c >= 0 && c < SIZE;
const cellsOf = (sh) => Array.from({ length: sh.len }, (_, i) => (sh.dir === 'h' ? [sh.r, sh.c + i] : [sh.r + i, sh.c]));
const ORTHO = [[0, 1], [0, -1], [1, 0], [-1, 0]];

// Random fleet that obeys the no-touching rule.
function randomFleet() {
  for (;;) {
    const occ = Array.from({ length: SIZE }, () => Array(SIZE).fill(false));
    const crowded = (y, x) => {
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (inB(y + dy, x + dx) && occ[y + dy][x + dx]) return true;
      return false;
    };
    const ships = [];
    for (const len of FLEET) {
      for (let tries = 0; tries < 200; tries++) {
        const dir = rand(2) ? 'h' : 'v';
        const ship = { r: rand(dir === 'v' ? SIZE - len + 1 : SIZE), c: rand(dir === 'h' ? SIZE - len + 1 : SIZE), len, dir };
        const cells = cellsOf(ship);
        if (cells.some(([y, x]) => crowded(y, x))) continue;
        cells.forEach(([y, x]) => (occ[y][x] = true));
        ships.push(ship);
        break;
      }
    }
    if (ships.length === FLEET.length) return ships;
  }
}

// Hard bot: the cell covered by the most possible placements of the ships still afloat.
function densiest(shots, remaining) {
  const heat = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
  for (const len of remaining) for (const dir of ['h', 'v']) {
    for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
      const cells = cellsOf({ r, c, len, dir });
      if (cells.every(([y, x]) => inB(y, x) && !shots[y][x])) cells.forEach(([y, x]) => heat[y][x]++);
    }
  }
  let top = 0, out = [];
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
    if (shots[r][c] || heat[r][c] < top) continue;
    if (heat[r][c] > top) { top = heat[r][c]; out = []; }
    out.push([r, c]);
  }
  return out;
}

// Uses only what the bot's own player view shows: shots fired and ships already sunk.
function fire(v, level) {
  const shots = v.atThem;
  const sunk = new Set(v.enemyShips.flatMap(cellsOf).map(([r, c]) => r * SIZE + c));
  const free = [], hits = [];
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
    if (!shots[r][c]) free.push([r, c]);
    else if (shots[r][c] === 'hit' && !sunk.has(r * SIZE + c)) hits.push([r, c]);
  }
  const shot = ([r, c]) => ({ t: 'fire', r, c });

  // Target mode: finish off a ship we already hit.
  if (hits.length && (level !== 'easy' || chance(0.6))) {
    const adj = (dr, dc) => hits.some(([r, c]) => hits.some(([y, x]) => y === r + dr && x === c + dc));
    const dirs = adj(0, 1) ? ORTHO.slice(0, 2) : adj(1, 0) ? ORTHO.slice(2) : ORTHO;
    const cands = hits.flatMap(([r, c]) => dirs.map(([dr, dc]) => [r + dr, c + dc])).filter(([r, c]) => inB(r, c) && !shots[r][c]);
    if (cands.length) return shot(pickRandom(cands));
  }

  // Hunt mode.
  if (level === 'easy') return shot(pickRandom(free));
  if (level === 'medium') {
    const checker = free.filter(([r, c]) => (r + c) % 2 === 0);
    return shot(pickRandom(checker.length ? checker : free));
  }
  const remaining = [...FLEET];
  for (const sh of v.enemyShips) remaining.splice(remaining.indexOf(sh.len), 1);
  const best = densiest(shots, remaining);
  return shot(pickRandom(best.length ? best : free));
}

module.exports = function seaBattleBot(s, p, level) {
  if (s.phase === 'place') return { t: 'place', ships: randomFleet() };
  return fire(GAME.view(s, p), level);
};
