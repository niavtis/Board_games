// Bots for the real-time duels. A bot does not "see" the question; it simulates a player
// with a reaction time and an accuracy that depend on the level.
const { rand, pickRandom, chance } = require('./util');

const CFG = {
  //            accuracy  thinking time (ms)      reaction after GO (ms)
  easy: { acc: 0.55, think: [4500, 10000], react: [480, 800] },
  medium: { acc: 0.75, think: [2800, 7000], react: [330, 520] },
  hard: { acc: 0.9, think: [1600, 4500], react: [230, 360] },
};
const between = ([lo, hi]) => lo + rand(hi - lo + 1);

// Decides once per round (memoised in `memo`) when the bot answers and with what.
// Returns { at, move } (absolute time) or null when the bot sits this round out.
function plan(s, seat, level, memo) {
  if (s.over || s.phase !== 'question' || s.locked?.[seat]) return null;
  const cfg = CFG[level];
  const key = `${s.round}:${s.mode === 'tap' ? !!s.q.armed : ''}`;
  if (memo.key !== key) {
    memo.key = key;
    memo.plan = makePlan(s, cfg);
  }
  return memo.plan;
}

function makePlan(s, cfg) {
  if (s.mode === 'tap') return s.q.armed ? { at: s.startedAt + between(cfg.react), move: {} } : null;
  // Word puzzles take longer the longer the word; arithmetic is quicker for big numbers on harder levels.
  const slow = s.limit > 20000 ? 1.8 : 1;
  const at = s.startedAt + Math.min(between(cfg.think) * slow, s.limit - 300);
  const right = chance(cfg.acc);
  if (s.mode === 'choice') {
    const wrong = s.q.options.map((_, i) => i).filter((i) => i !== s.secret.correct);
    return { at, move: { a: right ? s.secret.correct : pickRandom(wrong) } };
  }
  // text mode: the bot either solves it in time or gives up silently
  return right ? { at, move: { a: String(s.secret) } } : null;
}

module.exports = { plan };
