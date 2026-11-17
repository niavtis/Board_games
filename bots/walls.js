const GAME = require('../games/walls');
const { pickRandom, pickBest, chance } = require('./util');

const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const GOAL = [0, 8];
// wallCost: a wall must gain at least this much over walking to be worth spending.
// reply: also consider the opponent's best answer (two-ply).
const CFG = {
  easy: { random: 0.35, walls: 0.3, wallCost: 1.5, reply: false },
  medium: { random: 0.05, walls: 1, wallCost: 1.2, reply: false },
  hard: { random: 0, walls: 1, wallCost: 0.9, reply: true },
};

const hAt = (s, r, c) => r >= 0 && r < 8 && c >= 0 && c < 8 && s.hw[r][c] !== null;
const vAt = (s, r, c) => r >= 0 && r < 8 && c >= 0 && c < 8 && s.vw[r][c] !== null;
function open(s, r, c, dr, dc) {
  const y = r + dr, x = c + dc;
  if (y < 0 || x < 0 || y >= 9 || x >= 9) return false;
  if (dr === 1) return !hAt(s, r, c) && !hAt(s, r, c - 1);
  if (dr === -1) return !hAt(s, r - 1, c) && !hAt(s, r - 1, c - 1);
  if (dc === 1) return !vAt(s, r, c) && !vAt(s, r - 1, c);
  return !vAt(s, r, c - 1) && !vAt(s, r - 1, c - 1);
}

// Shortest walk to the goal row (pawns ignored), plus the cells along one such path.
function route(s, p) {
  const [sr, sc] = s.pos[p];
  const prev = new Map([[sr * 9 + sc, -1]]);
  const queue = [[sr, sc]];
  for (let q = 0; q < queue.length; q++) {
    const [r, c] = queue[q];
    if (r === GOAL[p]) {
      const path = [];
      for (let k = r * 9 + c; k !== -1; k = prev.get(k)) path.push([Math.floor(k / 9), k % 9]);
      return { dist: path.length - 1, path: path.reverse() };
    }
    for (const [dr, dc] of DIRS) {
      const k = (r + dr) * 9 + c + dc;
      if (!open(s, r, c, dr, dc) || prev.has(k)) continue;
      prev.set(k, r * 9 + c);
      queue.push([r + dr, c + dc]);
    }
  }
  return { dist: Infinity, path: [] };
}

function wallOk(s, r, c, o) {
  if (r < 0 || c < 0 || r > 7 || c > 7) return false;
  if (o === 'h') return s.hw[r][c] === null && !hAt(s, r, c - 1) && !hAt(s, r, c + 1) && s.vw[r][c] === null;
  return s.vw[r][c] === null && !vAt(s, r - 1, c) && !vAt(s, r + 1, c) && s.hw[r][c] === null;
}

// Walls that cut one of the steps on the opponent's shortest path.
function wallCandidates(s, p) {
  const out = new Map();
  const { path } = route(s, 1 - p);
  for (let i = 0; i + 1 < path.length; i++) {
    const [r, c] = path[i], [y, x] = path[i + 1];
    const add = (wr, wc, o) => wallOk(s, wr, wc, o) && out.set(`${o}${wr},${wc}`, { t: 'wall', r: wr, c: wc, o });
    if (y !== r) { const wr = Math.min(r, y); add(wr, c, 'h'); add(wr, c - 1, 'h'); }
    else { const wc = Math.min(c, x); add(r, wc, 'v'); add(r - 1, wc, 'v'); }
  }
  return [...out.values()];
}

// Applies m to a light copy; returns null if it is illegal (e.g. a wall that seals someone in).
function apply(s, p, m) {
  const t = { ...s, pos: s.pos.map((x) => x.slice()), wallsLeft: s.wallsLeft.slice() };
  if (m.t === 'pawn') {
    t.pos[p] = [m.r, m.c];
    return t;
  }
  t.hw = s.hw.map((row) => row.slice());
  t.vw = s.vw.map((row) => row.slice());
  (m.o === 'h' ? t.hw : t.vw)[m.r][m.c] = p;
  t.wallsLeft[p]--;
  if (route(t, 0).dist === Infinity || route(t, 1).dist === Infinity) return null;
  return t;
}

function evaluate(t, p, cfg) {
  if (t.pos[p][0] === GOAL[p]) return 1000;
  const mine = route(t, p).dist, theirs = route(t, 1 - p).dist;
  return theirs - mine + (t.wallsLeft[p] - t.wallsLeft[1 - p]) * (cfg.wallCost - 0.5);
}

function candidates(s, p, cfg) {
  const out = GAME.pawnMoves(s, p).map(([r, c]) => ({ t: 'pawn', r, c }));
  if (s.wallsLeft[p] > 0 && chance(cfg.walls)) out.push(...wallCandidates(s, p));
  return out
    .map((m) => ({ m, t: apply(s, p, m) }))
    .filter((x) => x.t)
    .map(({ m, t }) => ({ move: m, t, score: evaluate(t, p, cfg) }));
}

module.exports = function wallsBot(s, p, level) {
  const cfg = CFG[level];
  const opts = candidates(s, p, cfg);
  const win = opts.find((o) => o.score >= 1000);
  if (win) return win.move;
  if (chance(cfg.random)) return pickRandom(opts).move;
  if (!cfg.reply) return pickBest(opts);
  // Two-ply: score each option by the position after the opponent's best reply.
  return pickBest(opts.map((o) => {
    const t = { ...o.t, turn: 1 - p };
    const replies = candidates(t, 1 - p, cfg);
    const worst = replies.length ? Math.max(...replies.map((r) => r.score)) : -Infinity;
    return { move: o.move, score: worst >= 1000 ? -1000 : -worst };
  }));
};
