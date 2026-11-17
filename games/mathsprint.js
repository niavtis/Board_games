const { makeDuel } = require('./duel');

const rnd = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));

// Difficulty climbs with the round number.
function problem(round) {
  const hard = round > 6, mid = round > 3;
  const kind = hard ? rnd(0, 3) : mid ? rnd(0, 2) : rnd(0, 1);
  if (kind === 0) {
    const a = rnd(mid ? 20 : 3, hard ? 199 : mid ? 99 : 30), b = rnd(mid ? 11 : 2, hard ? 199 : mid ? 99 : 30);
    return { text: `${a} + ${b}`, value: a + b };
  }
  if (kind === 1) {
    const a = rnd(mid ? 30 : 10, hard ? 250 : mid ? 120 : 40), b = rnd(2, a - 1);
    return { text: `${a} − ${b}`, value: a - b };
  }
  if (kind === 2) {
    const a = rnd(2, hard ? 19 : 12), b = rnd(2, 12);
    return { text: `${a} × ${b}`, value: a * b };
  }
  const b = rnd(2, 12), v = rnd(2, 15);
  return { text: `${b * v} ÷ ${b}`, value: v };
}

module.exports = makeDuel({
  id: 'mathsprint',
  name: 'Math Sprint',
  rounds: 10,
  limit: 20000,
  mode: 'text',
  ask(s) {
    const { text, value } = problem(s.round);
    return { q: { text }, secret: value };
  },
  check: (value, guess) => /^-?\d+$/.test(guess.replace(/\s/g, '')) && Number(guess.replace(/\s/g, '')) === value,
  reveal: (value, s) => ({ text: `${s.q.text} = ${value}` }),
});
