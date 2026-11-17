const { pickRandom, pickBest, chance } = require('./util');

const LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
const RANDOM = { easy: 0.45, medium: 0.15, hard: 0 }; // chance of an unconsidered move
const won = (b, p) => LINES.some((L) => L.every((k) => b[k] === p));

// Full-depth negamax; faster wins / slower losses score higher.
function negamax(b, p, ply) {
  let best = null;
  for (let i = 0; i < 9; i++) {
    if (b[i] !== null) continue;
    b[i] = p;
    const sc = won(b, p) ? 10 - ply : -negamax(b, 1 - p, ply + 1);
    b[i] = null;
    if (best === null || sc > best) best = sc;
  }
  return best ?? 0;
}

module.exports = function tictactoeBot(s, p, level) {
  const b = s.board.slice();
  const free = b.flatMap((x, i) => (x === null ? [i] : []));
  if (chance(RANDOM[level])) return { i: pickRandom(free) };
  return pickBest(free.map((i) => {
    b[i] = p;
    const score = won(b, p) ? 10 : -negamax(b, 1 - p, 1);
    b[i] = null;
    return { move: { i }, score };
  }));
};
