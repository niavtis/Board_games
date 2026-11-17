const { int, grid, turnError } = require('./util');
const N = 8;
const DIRS = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];

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
  return out;
}

function counts(b) {
  const n = [0, 0];
  b.flat().forEach((x) => x !== null && n[x]++);
  return n;
}

module.exports = {
  id: 'reversi',
  name: 'Reversi',
  init() {
    const board = grid(N, N);
    board[3][3] = 1; board[4][4] = 1; board[3][4] = 0; board[4][3] = 0;
    return { board, turn: 0, over: false, winner: null, reason: null, last: null, flipped: [], passed: null };
  },
  move(s, p, m) {
    const err = turnError(s, p);
    if (err) return err;
    const r = int(m.r, 0, N - 1), c = int(m.c, 0, N - 1);
    if (r === null || c === null) return 'Invalid square';
    const flips = flipsFor(s.board, r, c, p);
    if (!flips.length) return 'That move must flip at least one disc';
    s.board[r][c] = p;
    flips.forEach(([y, x]) => (s.board[y][x] = p));
    s.last = [r, c];
    s.flipped = flips;
    s.passed = null;
    if (legal(s.board, 1 - p).length) s.turn = 1 - p;
    else if (legal(s.board, p).length) s.passed = 1 - p; // opponent must pass
    else {
      const [a, b] = counts(s.board);
      Object.assign(s, { over: true, winner: a === b ? 'draw' : a > b ? 0 : 1, reason: `${a}–${b}` });
    }
    return null;
  },
  view(s, p) {
    return { ...s, counts: counts(s.board), legal: !s.over && s.turn === p ? legal(s.board, p) : [] };
  },
};
