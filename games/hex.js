const { int, grid, turnError } = require('./util');

const N = 11;
// Neighbours on a rhombus-shaped hex board (rows shifted right by half a cell).
const NB = [[-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0]];

// Seat 0 connects top row ↔ bottom row, seat 1 connects left column ↔ right column.
// Returns the shortest chain of the player's stones joining their two edges, or null.
function winningPath(board, p) {
  const n = board.length;
  const prev = grid(n, n);
  const seen = grid(n, n, false);
  const queue = [];
  for (let i = 0; i < n; i++) {
    const [r, c] = p === 0 ? [0, i] : [i, 0];
    if (board[r][c] === p) {
      seen[r][c] = true;
      queue.push([r, c]);
    }
  }
  for (let q = 0; q < queue.length; q++) {
    const [r, c] = queue[q];
    if ((p === 0 && r === n - 1) || (p === 1 && c === n - 1)) {
      const path = [];
      for (let cur = [r, c]; cur; cur = prev[cur[0]][cur[1]]) path.push(cur);
      return path.reverse();
    }
    for (const [dr, dc] of NB) {
      const y = r + dr, x = c + dc;
      if (y < 0 || x < 0 || y >= n || x >= n || seen[y][x] || board[y][x] !== p) continue;
      seen[y][x] = true;
      prev[y][x] = [r, c];
      queue.push([y, x]);
    }
  }
  return null;
}

module.exports = {
  id: 'hex',
  name: 'Hex',
  winningPath,
  init: () => ({
    size: N,
    board: grid(N, N),
    moves: 0,
    swapped: false,
    path: null,
    turn: 0, over: false, winner: null, reason: null, last: null,
  }),
  move(s, p, m) {
    const err = turnError(s, p);
    if (err) return err;
    if (m.swap) {
      // Pie rule: on Blue's first turn, take over Red's opening stone (mirrored across the diagonal).
      if (s.moves !== 1 || p !== 1) return 'You can only swap on your first move';
      const [r, c] = s.last;
      s.board[r][c] = null;
      s.board[c][r] = 1;
      Object.assign(s, { swapped: true, moves: 2, last: [c, r], turn: 0 });
      return null;
    }
    const r = int(m.r, 0, N - 1), c = int(m.c, 0, N - 1);
    if (r === null || c === null) return 'Invalid cell';
    if (s.board[r][c] !== null) return 'That cell is taken';
    s.board[r][c] = p;
    s.moves++;
    s.last = [r, c];
    const path = winningPath(s.board, p);
    if (path) Object.assign(s, { over: true, winner: p, path, reason: p === 0 ? 'top and bottom connected' : 'left and right connected' });
    else s.turn = 1 - p;
    return null;
  },
  view: (s) => ({ ...s, canSwap: !s.over && s.moves === 1 && s.turn === 1 }),
};
