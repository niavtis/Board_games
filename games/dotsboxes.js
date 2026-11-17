const { int, grid, turnError } = require('./util');
const N = 5; // boxes per side

module.exports = {
  id: 'dotsboxes',
  name: 'Dots & Boxes',
  init: () => ({
    n: N,
    h: grid(N + 1, N), // horizontal lines: h[r][c] = player who drew it
    v: grid(N, N + 1), // vertical lines
    boxes: grid(N, N),
    score: [0, 0],
    turn: 0, over: false, winner: null, reason: null, last: null,
  }),
  move(s, p, m) {
    const err = turnError(s, p);
    if (err) return err;
    const t = m.t === 'h' ? 'h' : m.t === 'v' ? 'v' : null;
    if (!t) return 'Invalid line';
    const r = int(m.r, 0, t === 'h' ? N : N - 1), c = int(m.c, 0, t === 'h' ? N - 1 : N);
    if (r === null || c === null) return 'Invalid line';
    if (s[t][r][c] !== null) return 'That line is already drawn';
    s[t][r][c] = p;
    s.last = { t, r, c };
    const candidates = t === 'h' ? [[r - 1, c], [r, c]] : [[r, c - 1], [r, c]];
    let claimed = 0;
    for (const [br, bc] of candidates) {
      if (br < 0 || bc < 0 || br >= N || bc >= N || s.boxes[br][bc] !== null) continue;
      if (s.h[br][bc] !== null && s.h[br + 1][bc] !== null && s.v[br][bc] !== null && s.v[br][bc + 1] !== null) {
        s.boxes[br][bc] = p;
        s.score[p]++;
        claimed++;
      }
    }
    if (s.score[0] + s.score[1] === N * N) {
      const [a, b] = s.score;
      Object.assign(s, { over: true, winner: a === b ? 'draw' : a > b ? 0 : 1, reason: `${a}–${b} boxes` });
    } else if (!claimed) s.turn = 1 - p;
    return null;
  },
};
