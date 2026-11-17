const { int, grid, lineThrough, turnError } = require('./util');
const N = 15;

module.exports = {
  id: 'gomoku',
  name: 'Gomoku',
  init: () => ({ size: N, board: grid(N, N), turn: 0, over: false, winner: null, reason: null, line: null, last: null, moves: 0 }),
  move(s, p, m) {
    const err = turnError(s, p);
    if (err) return err;
    const r = int(m.r, 0, N - 1), c = int(m.c, 0, N - 1);
    if (r === null || c === null || s.board[r][c] !== null) return 'That point is taken';
    s.board[r][c] = p;
    s.last = [r, c];
    s.moves++;
    const line = lineThrough(s.board, r, c, 5);
    if (line) Object.assign(s, { over: true, winner: p, line, reason: 'five in a row' });
    else if (s.moves === N * N) Object.assign(s, { over: true, winner: 'draw', reason: 'board full' });
    else s.turn = 1 - p;
    return null;
  },
};
