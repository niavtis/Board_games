const rand = (n) => Math.floor(Math.random() * n);
const pickRandom = (arr) => arr[rand(arr.length)];
const chance = (p) => Math.random() < p;

// scored: [{ move, score }]. Picks randomly among the best moves; `slack` also admits
// moves scoring within that margin of the best, which keeps weaker bots varied.
function pickBest(scored, slack = 0) {
  const top = Math.max(...scored.map((x) => x.score));
  return pickRandom(scored.filter((x) => x.score >= top - slack)).move;
}

module.exports = { rand, pickRandom, chance, pickBest };
