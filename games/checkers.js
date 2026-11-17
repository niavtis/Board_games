const { int, grid, turnError } = require('./util');
const N = 8;
const inB = (r, c) => r >= 0 && r < N && c >= 0 && c < N;
const ALL = [[-1,-1],[-1,1],[1,-1],[1,1]];

// Player 0 starts at the bottom (rows 5-7) and moves up.
function dirs(piece) {
  return piece.k ? ALL : piece.p === 0 ? ALL.slice(0, 2) : ALL.slice(2);
}

function jumpsFrom(b, r, c) {
  const pc = b[r][c], out = [];
  for (const [dr, dc] of dirs(pc)) {
    const mr = r + dr, mc = c + dc, tr = r + 2 * dr, tc = c + 2 * dc;
    if (inB(tr, tc) && b[mr][mc] && b[mr][mc].p !== pc.p && !b[tr][tc]) out.push({ from: [r, c], to: [tr, tc], cap: [mr, mc] });
  }
  return out;
}

function stepsFrom(b, r, c) {
  const out = [];
  for (const [dr, dc] of dirs(b[r][c])) {
    const tr = r + dr, tc = c + dc;
    if (inB(tr, tc) && !b[tr][tc]) out.push({ from: [r, c], to: [tr, tc] });
  }
  return out;
}

function legal(s, p) {
  if (s.chain) return jumpsFrom(s.board, ...s.chain);
  const jumps = [], steps = [];
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    if (s.board[r][c]?.p !== p) continue;
    jumps.push(...jumpsFrom(s.board, r, c));
    steps.push(...stepsFrom(s.board, r, c));
  }
  return jumps.length ? jumps : steps; // captures are mandatory
}

module.exports = {
  id: 'checkers',
  name: 'Checkers',
  init() {
    const board = grid(N, N);
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      if ((r + c) % 2 !== 1) continue;
      if (r < 3) board[r][c] = { p: 1, k: false };
      if (r > 4) board[r][c] = { p: 0, k: false };
    }
    return { board, turn: 0, over: false, winner: null, reason: null, chain: null, last: null, quiet: 0 };
  },
  move(s, p, m) {
    const err = turnError(s, p);
    if (err) return err;
    const f = m.from, t = m.to;
    if (!Array.isArray(f) || !Array.isArray(t)) return 'Invalid move';
    const fr = int(f[0], 0, 7), fc = int(f[1], 0, 7), tr = int(t[0], 0, 7), tc = int(t[1], 0, 7);
    const mv = legal(s, p).find((x) => x.from[0] === fr && x.from[1] === fc && x.to[0] === tr && x.to[1] === tc);
    if (!mv) return s.chain ? 'You must continue jumping' : 'Illegal move (captures are mandatory)';
    const pc = s.board[fr][fc];
    s.board[tr][tc] = pc;
    s.board[fr][fc] = null;
    if (mv.cap) s.board[mv.cap[0]][mv.cap[1]] = null;
    let crowned = false;
    if (!pc.k && ((pc.p === 0 && tr === 0) || (pc.p === 1 && tr === N - 1))) { pc.k = true; crowned = true; }
    s.last = { from: [fr, fc], to: [tr, tc], cap: mv.cap || null };
    s.quiet = mv.cap || !pc.k || crowned ? 0 : s.quiet + 1;
    if (mv.cap && !crowned && jumpsFrom(s.board, tr, tc).length) {
      s.chain = [tr, tc]; // multi-jump: same player continues
      return null;
    }
    s.chain = null;
    s.turn = 1 - p;
    if (!legal(s, s.turn).length) Object.assign(s, { over: true, winner: p, reason: 'no moves left' });
    else if (s.quiet >= 50) Object.assign(s, { over: true, winner: 'draw', reason: '25 king moves without progress' });
    return null;
  },
  view(s, p) {
    const pieces = [0, 0];
    s.board.flat().forEach((x) => x && pieces[x.p]++);
    return { ...s, pieces, legal: !s.over && s.turn === p ? legal(s, p) : [] };
  },
};
