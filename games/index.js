const list = ['seabattle', 'chess', 'checkers', 'tictactoe', 'connect4', 'reversi', 'gomoku', 'dotsboxes'];
module.exports = Object.fromEntries(list.map((id) => [id, require(`./${id}`)]));
