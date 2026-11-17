const { int, grid, lineThrough, turnError } = require('./util');
const ROWS = 6, COLS = 7;

module.exports = {
  id: 'connect4',
  name: 'Connect Four',
  init: () => ({ board: grid(ROWS, COLS), turn: 0, over: false, winner: null, reason: null, line: null, last: null }),
  move(s, p, m) {
    const err = turnError(s, p);
    if (err) return err;
    const c = int(m.c, 0, COLS - 1);
    if (c === null) return 'Invalid column';
    let r = ROWS - 1;
    while (r >= 0 && s.board[r][c] !== null) r--;
    if (r < 0) return 'That column is full';
    s.board[r][c] = p;
    s.last = [r, c];
    const line = lineThrough(s.board, r, c, 4);
    if (line) Object.assign(s, { over: true, winner: p, line, reason: 'four in a row' });
    else if (s.board[0].every((x) => x !== null)) Object.assign(s, { over: true, winner: 'draw', reason: 'board full' });
    else s.turn = 1 - p;
    return null;
  },
};
