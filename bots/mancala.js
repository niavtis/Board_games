const GAME = require('../games/mancala');
const { pickRandom, pickBest, chance } = require('./util');

const CFG = {
  easy: { depth: 1, random: 0.35 },
  medium: { depth: 4, random: 0.05 },
  hard: { depth: 10, random: 0 },
};
const STORE = [6, 13];
const base = (p) => (p === 0 ? 0 : 7);
const pitsOf = (s, p) => [0, 1, 2, 3, 4, 5].filter((k) => s.pits[base(p) + k] > 0);

function play(s, p, pit) {
  const t = { pits: s.pits.slice(), turn: s.turn, over: false, winner: null, reason: null, last: null };
  GAME.move(t, p, { pit });
  return t;
}

const evaluate = (s, me) => s.pits[STORE[me]] - s.pits[STORE[1 - me]];

// Minimax that follows the real turn order, so extra turns (last seed in your store) are searched properly.
function search(s, depth, alpha, beta, me) {
  if (s.over) return s.winner === 'draw' ? 0 : (s.winner === me ? 1000 : -1000) + evaluate(s, me);
  if (depth === 0) return evaluate(s, me);
  const p = s.turn, max = p === me;
  let best = max ? -Infinity : Infinity;
  for (const pit of pitsOf(s, p)) {
    const sc = search(play(s, p, pit), depth - 1, alpha, beta, me);
    if (max) { best = Math.max(best, sc); alpha = Math.max(alpha, sc); }
    else { best = Math.min(best, sc); beta = Math.min(beta, sc); }
    if (alpha >= beta) break;
  }
  return best;
}

module.exports = function mancalaBot(s, p, level) {
  const cfg = CFG[level];
  const pits = pitsOf(s, p);
  if (chance(cfg.random)) return { pit: pickRandom(pits) };
  return pickBest(pits.map((pit) => ({ move: { pit }, score: search(play(s, p, pit), cfg.depth - 1, -Infinity, Infinity, p) })));
};
