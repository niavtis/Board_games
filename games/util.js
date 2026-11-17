// Returns an integer in [lo, hi] or null.
function int(x, lo, hi) {
  return Number.isInteger(x) && x >= lo && x <= hi ? x : null;
}

const grid = (rows, cols, v = null) => Array.from({ length: rows }, () => Array(cols).fill(v));

// Cells of the longest run of `val` through (r,c) if it is at least n long, else null.
function lineThrough(board, r, c, n) {
  const val = board[r][c];
  for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
    const cells = [[r, c]];
    for (const s of [1, -1]) {
      let y = r + dr * s, x = c + dc * s;
      while (board[y] && board[y][x] === val) {
        cells.push([y, x]);
        y += dr * s;
        x += dc * s;
      }
    }
    if (cells.length >= n) return cells;
  }
  return null;
}

function turnError(s, p) {
  if (s.over) return 'The game is over';
  if (s.turn !== p) return 'Not your turn';
  return null;
}

module.exports = { int, grid, lineThrough, turnError };
