const { makeDuel } = require('./duel');

module.exports = makeDuel({
  id: 'quickdraw',
  name: 'Quick Draw',
  rounds: 7,
  limit: 4000,
  mode: 'tap',
  ask: () => ({ q: {}, secret: null }),
});
