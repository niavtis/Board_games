const { int, grid, turnError } = require('./util');

const N = 9; // cells per side
const W = N - 1; // wall anchor points per side (grid intersections)
const WALLS = 10;
const GOAL = [0, N - 1]; // seat 0 races to the top row, seat 1 to the bottom row
const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];

// hw[r][c]: horizontal wall under row r, covering columns c and c+1.
// vw[r][c]: vertical wall right of column c, covering rows r and r+1.
const hAt = (s, r, c) => r >= 0 && r < W && c >= 0 && c < W && s.hw[r][c] !== null;
const vAt = (s, r, c) => r >= 0 && r < W && c >= 0 && c < W && s.vw[r][c] !== null;

// Can a pawn step from (r,c) one cell in direction (dr,dc)? Walls only; pawns are ignored.
function open(s, r, c, dr, dc) {
  const y = r + dr, x = c + dc;
  if (y < 0 || x < 0 || y >= N || x >= N) return false;
  if (dr === 1) return !hAt(s, r, c) && !hAt(s, r, c - 1);
  if (dr === -1) return !hAt(s, r - 1, c) && !hAt(s, r - 1, c - 1);
  if (dc === 1) return !vAt(s, r, c) && !vAt(s, r - 1, c);
  return !vAt(s, r, c - 1) && !vAt(s, r - 1, c - 1);
}

function hasPath(s, p) {
  const seen = grid(N, N, false);
  const [sr, sc] = s.pos[p];
  const queue = [[sr, sc]];
  seen[sr][sc] = true;
  for (let q = 0; q < queue.length; q++) {
    const [r, c] = queue[q];
    if (r === GOAL[p]) return true;
    for (const [dr, dc] of DIRS) {
      if (!open(s, r, c, dr, dc) || seen[r + dr][c + dc]) continue;
      seen[r + dr][c + dc] = true;
      queue.push([r + dr, c + dc]);
    }
  }
  return false;
}

// Legal pawn destinations for player p, including straight and diagonal jumps over the opponent.
function pawnMoves(s, p) {
  const [r, c] = s.pos[p], [or, oc] = s.pos[1 - p];
  const out = [];
  for (const [dr, dc] of DIRS) {
    if (!open(s, r, c, dr, dc)) continue;
    const y = r + dr, x = c + dc;
    if (y !== or || x !== oc) {
      out.push([y, x]);
      continue;
    }
    if (open(s, y, x, dr, dc)) {
      out.push([y + dr, x + dc]);
      continue;
    }
    for (const [sr, sc] of dr ? [[0, -1], [0, 1]] : [[-1, 0], [1, 0]]) {
      if (open(s, y, x, sr, sc)) out.push([y + sr, x + sc]);
    }
  }
  return out;
}

function wallError(s, r, c, o) {
  if (o === 'h') {
    if (s.hw[r][c] !== null || hAt(s, r, c - 1) || hAt(s, r, c + 1)) return 'That overlaps another wall';
    if (s.vw[r][c] !== null) return 'Walls cannot cross';
  } else {
    if (s.vw[r][c] !== null || vAt(s, r - 1, c) || vAt(s, r + 1, c)) return 'That overlaps another wall';
    if (s.hw[r][c] !== null) return 'Walls cannot cross';
  }
  return null;
}

module.exports = {
  id: 'walls',
  name: 'Wall Race',
  pawnMoves,
  init: () => ({
    size: N,
    pos: [[N - 1, (N - 1) / 2], [0, (N - 1) / 2]],
    wallsLeft: [WALLS, WALLS],
    hw: grid(W, W),
    vw: grid(W, W),
    walls: [], // { r, c, o, by } for rendering
    turn: 0, over: false, winner: null, reason: null, last: null,
  }),
  move(s, p, m) {
    const err = turnError(s, p);
    if (err) return err;
    if (m.t === 'pawn') {
      const r = int(m.r, 0, N - 1), c = int(m.c, 0, N - 1);
      if (r === null || c === null) return 'Invalid square';
      if (!pawnMoves(s, p).some(([y, x]) => y === r && x === c)) return 'Your pawn cannot move there';
      s.last = { t: 'pawn', by: p, from: s.pos[p], r, c };
      s.pos[p] = [r, c];
      if (r === GOAL[p]) Object.assign(s, { over: true, winner: p, reason: 'reached the far side' });
      else s.turn = 1 - p;
      return null;
    }
    if (m.t !== 'wall') return 'Unknown action';
    if (s.wallsLeft[p] <= 0) return 'You have no walls left';
    const r = int(m.r, 0, W - 1), c = int(m.c, 0, W - 1);
    const o = m.o === 'h' ? 'h' : m.o === 'v' ? 'v' : null;
    if (r === null || c === null || !o) return 'Invalid wall';
    const bad = wallError(s, r, c, o);
    if (bad) return bad;
    const g = o === 'h' ? s.hw : s.vw;
    g[r][c] = p;
    if (!hasPath(s, 0) || !hasPath(s, 1)) {
      g[r][c] = null;
      return 'A wall may not completely block a pawn';
    }
    s.walls.push({ r, c, o, by: p });
    s.wallsLeft[p]--;
    s.last = { t: 'wall', by: p, r, c, o };
    s.turn = 1 - p;
    return null;
  },
  view: (s) => ({ ...s, legal: s.over ? [] : pawnMoves(s, s.turn) }),
};
