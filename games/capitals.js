const { makeDuel, choices, fresh } = require('./duel');
const CAPITALS = require('./data/capitals');
const { flagSvg } = require('./data/flags');

const COUNTRIES = Object.keys(CAPITALS);
const CITIES = [...new Set(Object.values(CAPITALS))];

module.exports = makeDuel({
  id: 'capitals',
  name: 'Capital Clash',
  rounds: 10,
  limit: 15000,
  mode: 'choice',
  ask(s) {
    const country = fresh(s, COUNTRIES);
    const { options, correct } = choices(CAPITALS[country], CITIES);
    return { q: { country, flag: flagSvg(country), options }, secret: { correct, text: CAPITALS[country] } };
  },
  reveal: (secret) => secret,
});
