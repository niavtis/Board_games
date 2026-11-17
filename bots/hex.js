const { pickRandom, pickBest, chance } = require('./util');

const NB = [[-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0]];
// top: how many of the best-looking cells a looser bot chooses between.
// reply: hard bot also checks the opponent's best answer to its top candidates.
const CFG = {
  easy: { top: 10, random: 0.5, reply: 0 },
  medium: { top: 3, random: 0.2, reply: 0 },
  hard: { top: 1, random: 0, reply: 8 },
};

// Fewest empty cells player p still needs to connect their two edges (0-1 BFS).
// Seat 0 joins top and bottom rows, seat 1 joins left and right columns.
function distance(b, p) {
  const n = b.length;
  const dist = Array.from({ length: n }, () => Array(n).fill(Infinity));
  const dq = [];
  const cost = (r, c) => (b[r][c] === p ? 0 : b[r][c] === null ? 1 : Infinity);
  for (let i = 0; i < n; i++) {
    const [r, c] = p === 0 ? [0, i] : [i, 0];
    const k = cost(r, c);
    if (k === Infinity) continue;
    dist[r][c] = k;
    k ? dq.push([r, c]) : dq.unshift([r, c]);
  }
  while (dq.length) {
    const [r, c] = dq.shift();
    if ((p === 0 && r === n - 1) || (p === 1 && c === n - 1)) return dist[r][c];
    for (const [dr, dc] of NB) {
      const y = r + dr, x = c + dc;
      if (y < 0 || x < 0 || y >= n || x >= n) continue;
      const k = cost(y, x);
      if (k === Infinity || dist[r][c] + k >= dist[y][x]) continue;
      dist[y][x] = dist[r][c] + k;
      k ? dq.push([y, x]) : dq.unshift([y, x]);
    }
  }
  return Infinity;
}

const score = (b, p) => {
  const mine = distance(b, p), theirs = distance(b, 1 - p);
  if (mine === 0) return 1000;
  if (theirs === 0) return -1000;
  return theirs - mine;
};

function rank(b, p) {
  const n = b.length, mid = (n - 1) / 2, out = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    if (b[r][c] !== null) continue;
    b[r][c] = p;
    out.push({ move: { r, c }, score: score(b, p) - (Math.abs(r - mid) + Math.abs(c - mid)) * 0.01 });
    b[r][c] = null;
  }
  return out.sort((a, z) => z.score - a.score);
}

module.exports = function hexBot(s, p, level) {
  const cfg = CFG[level];
  const n = s.size, mid = (n - 1) / 2;
  // Pie rule: steal a strong (central) opening stone.
  if (s.moves === 1 && p === 1 && level !== 'easy') {
    const [r, c] = s.last;
    if (Math.abs(r - mid) + Math.abs(c - mid) <= 4) return { swap: true };
  }
  if (!s.moves) return { r: mid - 1 + Math.floor(Math.random() * 3), c: mid - 1 + Math.floor(Math.random() * 3) };
  const b = s.board.map((row) => row.slice());
  const ranked = rank(b, p);
  if (ranked[0].score < 999 && chance(cfg.random)) return pickRandom(ranked.slice(0, cfg.top)).move;
  if (!cfg.reply || ranked[0].score >= 999) return pickBest(ranked);
  // Two-ply: assume the opponent answers with their own best cell.
  return pickBest(ranked.slice(0, cfg.reply).map(({ move }) => {
    b[move.r][move.c] = p;
    const reply = rank(b, 1 - p)[0];
    if (reply) b[reply.move.r][reply.move.c] = 1 - p;
    const sc = score(b, p);
    if (reply) b[reply.move.r][reply.move.c] = null;
    b[move.r][move.c] = null;
    return { move, score: sc };
  }));
};
