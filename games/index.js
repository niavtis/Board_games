const list = [
  // board games (turn based)
  'seabattle', 'chess', 'checkers', 'tictactoe', 'connect4', 'reversi', 'gomoku', 'dotsboxes',
  'mancala', 'mill', 'hex', 'walls',
  // speed duels (real time)
  'flags', 'capitals', 'wordrace', 'mathsprint', 'quickdraw',
];
module.exports = Object.fromEntries(list.map((id) => [id, require(`./${id}`)]));
