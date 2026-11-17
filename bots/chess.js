const { _internal: { legalMoves, doMove, inCheck } } = require('../games/chess');
const { pickRandom, pickBest, chance } = require('./util');

// slack: moves within this many centipawns of the best are equally likely to be played.
const CFG = {
  easy: { depth: 1, random: 0.2, slack: 60 },
  medium: { depth: 2, random: 0, slack: 15 },
  hard: { depth: 3, random: 0, slack: 0 },
};
const VAL = { P: 100, N: 320, B: 330, R: 500, Q: 900, K: 0 };
const MATE = 1e6;
const opp = (co) => (co === 'w' ? 'b' : 'w');
const centrality = (r, c) => 3.5 - Math.max(Math.abs(r - 3.5), Math.abs(c - 3.5)); // 0 edge .. 3 center

// Material plus simple positional terms, from co's point of view.
function evaluate(b, co) {
  let sc = 0;
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    const x = b[r][c];
    if (!x) continue;
    const t = x[1];
    let v = VAL[t];
    if (t === 'N' || t === 'B') v += centrality(r, c) * 8;
    else if (t === 'Q') v += centrality(r, c) * 2;
    else if (t === 'P') v += (x[0] === 'w' ? 6 - r : r - 1) * 6 + (c >= 2 && c <= 5 ? centrality(r, c) * 4 : 0);
    sc += x[0] === co ? v : -v;
  }
  return sc;
}

const victim = (pos, m) => pos.board[m.to[0]][m.to[1]] || (m.ep ? 'xP' : null);
// Skip rook/bishop underpromotions while searching; queen and knight cover practical play.
const searchable = (moves) => moves.filter((m) => !m.promo || m.promo === 'Q' || m.promo === 'N');

// Captures first (most valuable victim, least valuable attacker), then promotions.
function order(pos, moves) {
  const key = (m) => {
    const v = victim(pos, m);
    return (v ? VAL[v[1]] * 10 - VAL[pos.board[m.from[0]][m.from[1]][1]] / 10 + 1 : 0) + (m.promo ? VAL[m.promo] : 0);
  };
  return moves.map((m) => ({ m, k: key(m) })).sort((a, b) => b.k - a.k).map((x) => x.m);
}

// Keep resolving captures so the bot does not stop counting in the middle of an exchange.
function quiesce(pos, co, alpha, beta, left) {
  const stand = evaluate(pos.board, co);
  if (stand >= beta || left === 0) return stand;
  if (stand > alpha) alpha = stand;
  const caps = legalMoves(pos, co).filter((m) => victim(pos, m) || m.promo === 'Q');
  for (const m of order(pos, caps)) {
    const sc = -quiesce(doMove(pos, m), opp(co), -beta, -alpha, left - 1);
    if (sc >= beta) return sc;
    if (sc > alpha) alpha = sc;
  }
  return alpha;
}

function negamax(pos, co, depth, alpha, beta, ply) {
  const moves = legalMoves(pos, co);
  if (!moves.length) return inCheck(pos.board, co) ? -MATE + ply : 0;
  if (pos.halfmove >= 100) return 0;
  if (depth === 0) return quiesce(pos, co, alpha, beta, 4);
  let best = -Infinity;
  for (const m of order(pos, searchable(moves))) {
    const sc = -negamax(doMove(pos, m), opp(co), depth - 1, -beta, -alpha, ply + 1);
    if (sc > best) best = sc;
    if (sc > alpha) alpha = sc;
    if (alpha >= beta) break;
  }
  return best;
}

module.exports = function chessBot(s, p, level) {
  const cfg = CFG[level];
  const co = p === 0 ? 'w' : 'b';
  const pos = { board: s.board, castling: s.castling, ep: s.ep, halfmove: s.halfmove };
  const moves = order(pos, searchable(legalMoves(pos, co)));
  const fmt = ({ from, to, promo }) => ({ from, to, promo });
  if (chance(cfg.random)) return fmt(pickRandom(moves));
  // Root moves are searched with a window that only needs to prove "within slack of the best".
  let best = -Infinity;
  const scored = moves.map((m) => {
    const sc = -negamax(doMove(pos, m), opp(co), cfg.depth - 1, -Infinity, -(best - cfg.slack), 1);
    if (sc > best) best = sc;
    return { move: fmt(m), score: sc };
  });
  return pickBest(scored, cfg.slack);
};
