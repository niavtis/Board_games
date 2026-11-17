const { int, turnError } = require('./util');

// Kalah layout: pits[0..5] = seat 0 pits, pits[6] = seat 0 store,
// pits[7..12] = seat 1 pits, pits[13] = seat 1 store. Sowing goes up the indexes (counter-clockwise).
const PITS = 6, SEEDS = 4;
const STORE = [6, 13];
const base = (p) => (p === 0 ? 0 : 7);
const sideOf = (i) => (i >= 0 && i <= 5 ? 0 : i >= 7 && i <= 12 ? 1 : null);

module.exports = {
  id: 'mancala',
  name: 'Mancala',
  init: () => ({
    pits: [...Array(PITS).fill(SEEDS), 0, ...Array(PITS).fill(SEEDS), 0],
    turn: 0, over: false, winner: null, reason: null, last: null,
  }),
  move(s, p, m) {
    const err = turnError(s, p);
    if (err) return err;
    const k = int(m.pit, 0, PITS - 1);
    if (k === null) return 'Invalid pit';
    const from = base(p) + k;
    let seeds = s.pits[from];
    if (!seeds) return 'That pit is empty';
    s.pits[from] = 0;
    let i = from;
    const sown = [];
    while (seeds > 0) {
      i = (i + 1) % 14;
      if (i === STORE[1 - p]) continue; // skip opponent's store
      s.pits[i]++;
      sown.push(i);
      seeds--;
    }
    let captured = 0;
    if (sideOf(i) === p && s.pits[i] === 1) {
      const opp = 12 - i;
      if (s.pits[opp] > 0) {
        captured = s.pits[opp] + 1;
        s.pits[STORE[p]] += captured;
        s.pits[opp] = 0;
        s.pits[i] = 0;
      }
    }
    const extra = i === STORE[p];
    s.last = { by: p, from, end: i, sown, captured, extra };

    const empty = (q) => s.pits.slice(base(q), base(q) + PITS).every((x) => x === 0);
    if (empty(0) || empty(1)) {
      for (const q of [0, 1]) {
        for (let j = base(q); j < base(q) + PITS; j++) {
          s.pits[STORE[q]] += s.pits[j];
          s.pits[j] = 0;
        }
      }
      const a = s.pits[STORE[0]], b = s.pits[STORE[1]];
      Object.assign(s, { over: true, winner: a === b ? 'draw' : a > b ? 0 : 1, reason: `${a}–${b} seeds` });
    } else if (!extra) s.turn = 1 - p;
    return null;
  },
  view: (s) => ({ ...s, score: [s.pits[STORE[0]], s.pits[STORE[1]]] }),
};
