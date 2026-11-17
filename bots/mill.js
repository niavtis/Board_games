const GAME = require('../games/mill');
const { pickRandom, pickBest, chance } = require('./util');

const CFG = {
  easy: { depth: 1, random: 0.3 },
  medium: { depth: 2, random: 0.05 },
  hard: { depth: 4, random: 0 },
};

// Placements, moves, and (right after closing a mill) removals, in the format the server expects.
function options(s) {
  const v = GAME.view(s);
  if (s.pendingRemove) return v.removable.map((i) => ({ t: 'remove', i }));
  return v.legal.map((m) => (m.from === undefined ? { t: 'place', i: m.to } : { t: 'move', from: m.from, to: m.to }));
}

function play(s, m) {
  const t = structuredClone(s);
  GAME.move(t, t.turn, m);
  return t;
}

function evaluate(s, me) {
  const pieces = (q) => s.hand[q] + s.board.filter((x) => x === q).length;
  // Two of a kind with the third point open: a mill waiting to happen.
  let threats = 0;
  for (const m of GAME.MILLS) {
    const own = m.filter((i) => s.board[i] === me).length, their = m.filter((i) => s.board[i] === 1 - me).length;
    if (own === 2 && !their) threats++;
    if (their === 2 && !own) threats--;
  }
  return (pieces(me) - pieces(1 - me)) * 100 + threats * 15;
}

// The side to move only changes once a turn (including any removal) is complete.
function search(s, depth, alpha, beta, me) {
  if (s.over) return s.winner === 'draw' ? 0 : (s.winner === me ? 1 : -1) * (1e5 + depth);
  if (depth <= 0 && !s.pendingRemove) return evaluate(s, me);
  const max = s.turn === me;
  let best = max ? -Infinity : Infinity;
  for (const m of options(s)) {
    const t = play(s, m);
    const sc = search(t, t.pendingRemove ? depth : depth - 1, alpha, beta, me);
    if (max) { best = Math.max(best, sc); alpha = Math.max(alpha, sc); }
    else { best = Math.min(best, sc); beta = Math.min(beta, sc); }
    if (alpha >= beta) break;
  }
  return best;
}

module.exports = function millBot(s, p, level) {
  const cfg = CFG[level];
  const moves = options(s);
  if (chance(cfg.random)) return pickRandom(moves);
  return pickBest(moves.map((m) => {
    const t = play(s, m);
    return { move: m, score: search(t, t.pendingRemove ? cfg.depth : cfg.depth - 1, -Infinity, Infinity, p) };
  }));
};
