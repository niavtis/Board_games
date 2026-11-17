// Bot vs bot: every bot level must only make legal moves, finish games, and think quickly.
const assert = require('assert');
const GAMES = require('../games');
const BOTS = require('../bots');

const MAX_MS = { easy: 400, medium: 800, hard: 2500 };
const ids = process.argv[2] ? [process.argv[2]] : BOTS.GAMES;

function playOut(gameId, levels) {
  const game = GAMES[gameId];
  const s = game.init(Date.now());
  let plies = 0, slowest = 0;
  while (!s.over) {
    assert.ok(plies++ < 2000, `${gameId}: game did not finish`);
    const seat = [0, 1].find((p) => BOTS.needsToAct(gameId, s, p));
    assert.notEqual(seat, undefined, `${gameId}: nobody to move`);
    const t0 = Date.now();
    const move = BOTS.pick(gameId, s, seat, levels[seat]);
    const ms = Date.now() - t0;
    slowest = Math.max(slowest, ms);
    assert.ok(ms <= MAX_MS[levels[seat]], `${gameId} ${levels[seat]} took ${ms}ms`);
    const err = game.move(s, seat, move);
    assert.ok(!err, `${gameId} ${levels[seat]} made an illegal move ${JSON.stringify(move)}: ${err}`);
  }
  return { winner: s.winner, plies, slowest };
}

for (const id of ids) {
  const out = [];
  for (const pair of [['easy', 'easy'], ['medium', 'medium'], ['hard', 'hard'], ['hard', 'easy'], ['easy', 'hard']]) {
    const r = playOut(id, pair);
    out.push(`${pair.join('/')}: ${r.winner === 'draw' ? 'draw' : 'P' + r.winner} in ${r.plies} (max ${r.slowest}ms)`);
  }
  console.log(`PASS bots ${id} — ${out.join(' · ')}`);
}
