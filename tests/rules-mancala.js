// Rules checks for games/mancala.js (Kalah).
const assert = require('assert');
const G = require('../games/mancala');

const fresh = () => G.init();
const ok = (s, p, m) => assert.equal(G.move(s, p, m), null, `move ${JSON.stringify(m)} by ${p} rejected`);

try {
  // Normal sow: pit 0 (4 seeds) -> pits 1..4, turn passes
  let s = fresh();
  ok(s, 0, { pit: 0 });
  assert.deepEqual(s.pits.slice(0, 7), [0, 5, 5, 5, 5, 4, 0]);
  assert.equal(s.turn, 1);
  assert.equal(G.move(s, 0, { pit: 1 }), 'Not your turn');
  assert.equal(G.move(s, 1, { pit: 6 }), 'Invalid pit');
  assert.equal(G.move(s, 1, { pit: '1' }), 'Invalid pit');
  console.log('PASS mancala sowing + turn order + validation');

  // Extra turn: pit 2 (4 seeds) ends in own store (index 6)
  s = fresh();
  ok(s, 0, { pit: 2 });
  assert.equal(s.pits[6], 1);
  assert.equal(s.turn, 0);
  assert.equal(s.last.extra, true);
  console.log('PASS mancala extra turn');

  // Empty pit rejected
  assert.equal(G.move(s, 0, { pit: 2 }), 'That pit is empty');
  console.log('PASS mancala empty pit rejected');

  // Seat 1 sowing skips seat 0's store and wraps to own side
  s = fresh();
  s.turn = 1;
  s.pits[12] = 10; // pits 13(store),0..5,(skip 6),7,8,9
  ok(s, 1, { pit: 5 });
  assert.equal(s.pits[6], 0, "opponent's store skipped");
  assert.equal(s.pits[13], 1);
  assert.deepEqual(s.pits.slice(0, 6), [5, 5, 5, 5, 5, 5]);
  console.log('PASS mancala skips opponent store');

  // Capture: landing in own empty pit takes it + opposite
  s = fresh();
  s.pits = [1, 0, 4, 4, 4, 4, 0, 4, 4, 4, 4, 7, 4, 0];
  ok(s, 0, { pit: 0 }); // lands in pit 1 (empty), opposite = 11 (7 seeds)
  assert.equal(s.pits[6], 8);
  assert.equal(s.pits[1], 0);
  assert.equal(s.pits[11], 0);
  assert.equal(s.last.captured, 8);
  assert.equal(s.turn, 1);
  console.log('PASS mancala capture');

  // No capture when opposite pit is empty
  s = fresh();
  s.pits = [1, 0, 4, 4, 4, 4, 0, 4, 4, 4, 4, 0, 4, 0];
  ok(s, 0, { pit: 0 });
  assert.equal(s.pits[1], 1);
  assert.equal(s.pits[6], 0);
  console.log('PASS mancala no capture vs empty opposite');

  // Game end: side empties, remaining seeds swept to owner's store
  s = fresh();
  s.pits = [0, 0, 0, 0, 0, 1, 20, 3, 0, 0, 0, 2, 0, 22];
  ok(s, 0, { pit: 5 }); // last seed in store, side 0 now empty
  assert.equal(s.over, true);
  assert.equal(s.pits[6], 21);
  assert.equal(s.pits[13], 27);
  assert.equal(s.winner, 1);
  assert.equal(s.reason, '21–27 seeds');
  assert.equal(s.pits.slice(7, 13).reduce((a, b) => a + b), 0);
  assert.equal(G.move(s, 0, { pit: 0 }), 'The game is over');
  assert.deepEqual(G.view(s, 0).score, [21, 27]);
  console.log('PASS mancala game end + sweep');

  // Seed conservation over a random playout
  s = fresh();
  for (let n = 0; n < 500 && !s.over; n++) {
    const p = s.turn, b = p === 0 ? 0 : 7;
    const options = [0, 1, 2, 3, 4, 5].filter((k) => s.pits[b + k] > 0);
    ok(s, p, { pit: options[Math.floor(Math.random() * options.length)] });
    assert.equal(s.pits.reduce((a, b) => a + b), 48);
  }
  assert.equal(s.over, true);
  console.log('PASS mancala random playout conserves 48 seeds and ends');
} catch (e) {
  console.error('FAIL', e.message);
  process.exit(1);
}
