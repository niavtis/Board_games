const { int, turnError } = require('./util');
const LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

module.exports = {
  id: 'tictactoe',
  name: 'Tic Tac Toe',
  init: () => ({ board: Array(9).fill(null), turn: 0, over: false, winner: null, reason: null, line: null, last: null }),
  move(s, p, m) {
    const err = turnError(s, p);
    if (err) return err;
    const i = int(m.i, 0, 8);
    if (i === null || s.board[i] !== null) return 'That square is taken';
    s.board[i] = p;
    s.last = i;
    const line = LINES.find((L) => L.every((k) => s.board[k] === p));
    if (line) Object.assign(s, { over: true, winner: p, line, reason: 'three in a row' });
    else if (s.board.every((x) => x !== null)) Object.assign(s, { over: true, winner: 'draw', reason: 'board full' });
    else s.turn = 1 - p;
    return null;
  },
};
