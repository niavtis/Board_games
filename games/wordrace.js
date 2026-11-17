const { makeDuel, shuffle, fresh } = require('./duel');

const WORDS = [...new Set(require('./data/words').map((w) => w.toLowerCase()))];
const DICT = new Set(WORDS);
const sorted = (w) => [...w].sort().join('');

function scramble(word) {
  for (let i = 0; i < 20; i++) {
    const s = shuffle([...word]).join('');
    if (s !== word) return s;
  }
  return [...word].reverse().join('');
}

module.exports = makeDuel({
  id: 'wordrace',
  name: 'Word Race',
  rounds: 8,
  limit: 30000,
  mode: 'text',
  ask(s) {
    const word = fresh(s, WORDS);
    return { q: { letters: scramble(word).toUpperCase(), len: word.length, hint: word[0].toUpperCase() }, secret: word };
  },
  // The intended word, or any other listed word made from exactly the same letters.
  check(word, guess) {
    const g = guess.toLowerCase().replace(/[^a-z]/g, '');
    return g === word || (sorted(g) === sorted(word) && DICT.has(g));
  },
  reveal: (word) => ({ text: word.toUpperCase() }),
});
