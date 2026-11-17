const { pickRandom, pickBest, chance } = require('./util');

const N = 8;
const DIRS = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
const W = [
  [100, -20, 10, 5, 5, 10, -20, 100],
  [-20, -50, -2, -2, -2, -2, -50, -20],
  [10, -2, 1, 1, 1, 1, -2, 10],
  [5, -2, 1, 0, 0, 1, -2, 5],
  [5, -2, 1, 0, 0, 1, -2, 5],
  [10, -2, 1, 1, 1, 1, -2, 10],
  [-20, -50, -2, -2, -2, -2, -50, -20],
  [100, -20, 10, 5, 5, 10, -20, 100],
];
const CFG = {
  easy: { depth: 1, random: 0.35 },
  medium: { depth: 3, random: 0.05 },
  hard: { depth: 4, random: 0 },
};

function flipsFor(b, r, c, p) {
  if (b[r][c] !== null) return [];
  const out = [];
  for (const [dr, dc] of DIRS) {
    const run = [];
    let y = r + dr, x = c + dc;
    while (b[y] && b[y][x] === 1 - p) { run.push([y, x]); y += dr; x += dc; }
    if (run.length && b[y] && b[y][x] === p) out.push(...run);
  }
  return out;
}

function legal(b, p) {
  const out = [];
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (flipsFor(b, r, c, p).length) out.push([r, c]);
  return out.sort((a, z) => W[z[0]][z[1]] - W[a[0]][a[1]]); // corners first for pruning
}

function play(b, r, c, p) {
  const nb = b.map((row) => row.slice());
  nb[r][c] = p;
  for (const [y, x] of flipsFor(b, r, c, p)) nb[y][x] = p;
  return nb;
}

function evaluate(b, p) {
  let sc = 0;
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    if (b[r][c] === p) sc += W[r][c];
    else if (b[r][c] !== null) sc -= W[r][c];
  }
  return sc + 5 * (legal(b, p).length - legal(b, 1 - p).length);
}

function negamax(b, p, depth, alpha, beta) {
  const moves = legal(b, p);
  if (!moves.length) {
    if (!legal(b, 1 - p).length) {
      let diff = 0;
      b.flat().forEach((x) => { if (x === p) diff++; else if (x !== null) diff--; });
      return diff * 1000;
    }
    return -negamax(b, 1 - p, depth, -beta, -alpha); // forced pass
  }
  if (depth === 0) return evaluate(b, p);
  let best = -Infinity;
  for (const [r, c] of moves) {
    const sc = -negamax(play(b, r, c, p), 1 - p, depth - 1, -beta, -alpha);
    if (sc > best) best = sc;
    if (sc > alpha) alpha = sc;
    if (alpha >= beta) break;
  }
  return best;
}

module.exports = function reversiBot(s, p, level) {
  const cfg = CFG[level];
  const moves = legal(s.board, p);
  if (chance(cfg.random)) {
    const [r, c] = pickRandom(moves);
    return { r, c };
  }
  return pickBest(moves.map(([r, c]) => ({
    move: { r, c },
    score: -negamax(play(s.board, r, c, p), 1 - p, cfg.depth - 1, -Infinity, Infinity),
  })));
};
