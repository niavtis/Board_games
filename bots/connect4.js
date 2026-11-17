const { lineThrough } = require('../games/util');
const { pickRandom, pickBest, chance } = require('./util');

const ROWS = 6, COLS = 7;
const ORDER = [3, 2, 4, 1, 5, 0, 6]; // center first: better alpha-beta cutoffs
const WIN = 100000;
const CFG = {
  easy: { depth: 1, random: 0.3 },
  medium: { depth: 3, random: 0.05 },
  hard: { depth: 6, random: 0 },
};

// Every line of four cells on the board.
const WINDOWS = [];
for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
  for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
    const w = [0, 1, 2, 3].map((k) => [r + dr * k, c + dc * k]);
    if (w.every(([y, x]) => y >= 0 && y < ROWS && x >= 0 && x < COLS)) WINDOWS.push(w);
  }
}

function dropRow(b, c) {
  for (let r = ROWS - 1; r >= 0; r--) if (b[r][c] === null) return r;
  return -1;
}

function evaluate(b, p) {
  let sc = 0;
  for (let r = 0; r < ROWS; r++) sc += b[r][3] === p ? 3 : b[r][3] === null ? 0 : -3;
  for (const w of WINDOWS) {
    let mine = 0, theirs = 0;
    for (const [r, c] of w) {
      const x = b[r][c];
      if (x === p) mine++;
      else if (x !== null) theirs++;
    }
    if (mine && theirs) continue;
    if (mine === 3) sc += 5;
    else if (mine === 2) sc += 2;
    else if (theirs === 3) sc -= 6;
    else if (theirs === 2) sc -= 2;
  }
  return sc;
}

function negamax(b, p, depth, alpha, beta) {
  if (depth === 0) return evaluate(b, p);
  let best = -Infinity;
  for (const c of ORDER) {
    const r = dropRow(b, c);
    if (r < 0) continue;
    b[r][c] = p;
    const sc = lineThrough(b, r, c, 4) ? WIN + depth : -negamax(b, 1 - p, depth - 1, -beta, -alpha);
    b[r][c] = null;
    if (sc > best) best = sc;
    if (sc > alpha) alpha = sc;
    if (alpha >= beta) break;
  }
  return best === -Infinity ? 0 : best; // board full: draw
}

module.exports = function connect4Bot(s, p, level) {
  const cfg = CFG[level];
  const b = s.board.map((row) => row.slice());
  const cols = ORDER.filter((c) => dropRow(b, c) >= 0);
  if (chance(cfg.random)) return { c: pickRandom(cols) };
  return pickBest(cols.map((c) => {
    const r = dropRow(b, c);
    b[r][c] = p;
    const score = lineThrough(b, r, c, 4) ? WIN + cfg.depth : -negamax(b, 1 - p, cfg.depth - 1, -Infinity, Infinity);
    b[r][c] = null;
    return { move: { c }, score };
  }));
};
