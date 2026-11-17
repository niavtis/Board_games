const GAME = require('../games/checkers');
const { pickRandom, pickBest, chance } = require('./util');

const CFG = {
  easy: { depth: 1, random: 0.3 },
  medium: { depth: 3, random: 0.05 },
  hard: { depth: 5, random: 0 },
};

const legalOf = (s) => GAME.view(s, s.turn).legal;
function play(s, m) {
  const t = structuredClone(s);
  GAME.move(t, t.turn, { from: m.from, to: m.to });
  return t;
}

function evaluate(s, me) {
  let sc = 0;
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    const x = s.board[r][c];
    if (!x) continue;
    let v = x.k ? 165 : 100 + (x.p === 0 ? 7 - r : r) * 4; // men gain value as they advance
    if (r >= 2 && r <= 5 && c >= 2 && c <= 5) v += 4;
    sc += x.p === me ? v : -v;
  }
  return sc;
}

// Plain minimax with alpha-beta; a multi-jump continuation does not use up depth.
function search(s, depth, alpha, beta, me) {
  if (s.over) return s.winner === 'draw' ? 0 : (s.winner === me ? 1 : -1) * (1e5 + depth);
  if (depth <= 0) return evaluate(s, me);
  const max = s.turn === me;
  let best = max ? -Infinity : Infinity;
  for (const m of legalOf(s)) {
    const t = play(s, m);
    const sc = search(t, t.chain ? depth : depth - 1, alpha, beta, me);
    if (max) { best = Math.max(best, sc); alpha = Math.max(alpha, sc); }
    else { best = Math.min(best, sc); beta = Math.min(beta, sc); }
    if (alpha >= beta) break;
  }
  return best;
}

module.exports = function checkersBot(s, p, level) {
  const cfg = CFG[level];
  const moves = legalOf(s).map(({ from, to }) => ({ from, to }));
  if (moves.length === 1) return moves[0];
  if (chance(cfg.random)) return pickRandom(moves);
  return pickBest(moves.map((m) => {
    const t = play(s, m);
    return { move: m, score: search(t, t.chain ? cfg.depth : cfg.depth - 1, -Infinity, Infinity, p) };
  }));
};
