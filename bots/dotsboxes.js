const GAME = require('../games/dotsboxes');
const { pickRandom, pickBest, chance } = require('./util');

// greedy: chance to grab a box that is there for the taking.
// careful: chance to avoid drawing a box's third side (which hands it to the opponent).
const CFG = {
  easy: { greedy: 0.6, careful: 0.4 },
  medium: { greedy: 1, careful: 0.85 },
  hard: { greedy: 1, careful: 1 },
};

function lines(s) {
  const out = [];
  for (let r = 0; r <= s.n; r++) for (let c = 0; c < s.n; c++) if (s.h[r][c] === null) out.push({ t: 'h', r, c });
  for (let r = 0; r < s.n; r++) for (let c = 0; c <= s.n; c++) if (s.v[r][c] === null) out.push({ t: 'v', r, c });
  return out;
}

const boxesOf = (s, l) =>
  (l.t === 'h' ? [[l.r - 1, l.c], [l.r, l.c]] : [[l.r, l.c - 1], [l.r, l.c]])
    .filter(([r, c]) => r >= 0 && c >= 0 && r < s.n && c < s.n);
const sides = (s, r, c) => (s.h[r][c] !== null) + (s.h[r + 1][c] !== null) + (s.v[r][c] !== null) + (s.v[r][c + 1] !== null);
const completes = (s, l) => boxesOf(s, l).some(([r, c]) => sides(s, r, c) === 3);
const risky = (s, l) => boxesOf(s, l).some(([r, c]) => sides(s, r, c) === 2);

// How many boxes the opponent can grab in a row after we draw line l.
function giveaway(s, l, p) {
  const t = structuredClone(s);
  GAME.move(t, p, l);
  while (!t.over && t.turn !== p) {
    const take = lines(t).find((x) => completes(t, x));
    if (!take) break;
    GAME.move(t, t.turn, take);
  }
  return t.score[1 - p] - s.score[1 - p];
}

module.exports = function dotsBoxesBot(s, p, level) {
  const cfg = CFG[level];
  const all = lines(s);
  const takes = all.filter((l) => completes(s, l));
  if (takes.length && chance(cfg.greedy)) return pickRandom(takes);
  if (!chance(cfg.careful)) return pickRandom(all);
  const safe = all.filter((l) => !completes(s, l) && !risky(s, l));
  if (safe.length) return pickRandom(safe);
  // Every line gives something away: open the shortest chain.
  const giving = all.filter((l) => !completes(s, l));
  if (!giving.length) return pickRandom(all);
  return pickBest(giving.map((l) => ({ move: l, score: -giveaway(s, l, p) })));
};
