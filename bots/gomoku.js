const { pickRandom, pickBest, chance } = require('./util');

const DIRS = [[0, 1], [1, 0], [1, 1], [1, -1]];
// defense: weight of blocking the opponent vs. building our own lines.
// top/random: sometimes play one of the `top` best cells instead of the best one.
const CFG = {
  easy: { defense: 0.45, top: 6, random: 0.5 },
  medium: { defense: 0.85, top: 3, random: 0.15 },
  hard: { defense: 1, top: 1, random: 0 },
};

// Every 5-cell window through (r, c) that the opponent has not touched is a possible five.
// Windows already holding many of p's stones count much more; broken lines like X X _ X are seen too.
const WINDOW = [0, 1, 12, 150, 5000, 1e6]; // by stones in the window, including the new one

// How good it would be for player p to have a stone at (r, c).
function cellValue(b, r, c, p) {
  let total = 0;
  for (const [dr, dc] of DIRS) {
    for (let start = -4; start <= 0; start++) {
      let mine = 1;
      for (let k = start; k < start + 5; k++) {
        if (k === 0) continue;
        const y = r + dr * k, x = c + dc * k;
        const v = b[y]?.[x];
        if (v === undefined || v === 1 - p) { mine = 0; break; }
        if (v === p) mine++;
      }
      total += WINDOW[mine];
    }
  }
  return total;
}

module.exports = function gomokuBot(s, p, level) {
  const cfg = CFG[level];
  const b = s.board, n = s.size;
  const center = Math.floor(n / 2);
  if (!s.moves) return { r: center, c: center };
  const cands = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    if (b[r][c] !== null) continue;
    let near = false;
    for (let dy = -2; dy <= 2 && !near; dy++) for (let dx = -2; dx <= 2; dx++) {
      if (b[r + dy] && b[r + dy][c + dx] != null) { near = true; break; }
    }
    if (!near) continue;
    const score = cellValue(b, r, c, p) + cfg.defense * cellValue(b, r, c, 1 - p) - (Math.abs(r - center) + Math.abs(c - center)) * 0.01;
    cands.push({ move: { r, c }, score });
  }
  cands.sort((a, b2) => b2.score - a.score);
  // Never miss a win or a forced block, even when playing loosely.
  if (cands[0].score < 4e5 && chance(cfg.random)) return pickRandom(cands.slice(0, cfg.top)).move;
  return pickBest(cands);
};
