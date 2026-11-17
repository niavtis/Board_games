const { makeDuel, choices, fresh } = require('./duel');
const { FLAG_NAMES, flagSvg } = require('./data/flags');

module.exports = makeDuel({
  id: 'flags',
  name: 'Flag Duel',
  rounds: 10,
  limit: 15000,
  mode: 'choice',
  ask(s) {
    const name = fresh(s, FLAG_NAMES);
    const { options, correct } = choices(name, FLAG_NAMES);
    return { q: { flag: flagSvg(name), options }, secret: { correct, text: name } };
  },
  reveal: (secret) => secret,
});
