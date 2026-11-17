// Rules checks for games/mill.js (Nine Men's Morris).
const assert = require('assert');
const G = require('../games/mill');

const ok = (s, p, m) => assert.equal(G.move(s, p, m), null, `move ${JSON.stringify(m)} by ${p} rejected`);
// Board from a 24-char string: '.' empty, '0'/'1' pieces.
const board = (str) => [...str.replace(/\s/g, '')].map((c) => (c === '.' ? null : +c));

try {
  // Geometry sanity: 24 points, 32 edges, 16 mills
  assert.equal(G.ADJ.reduce((a, l) => a + l.length, 0) / 2, 32);
  assert.equal(G.MILLS.length, 16);
  assert.deepEqual(G.ADJ[1].sort((a, b) => a - b), [0, 2, 9]);
  assert.deepEqual(G.ADJ[9].sort((a, b) => a - b), [1, 8, 10, 17]);
  console.log('PASS mill geometry');

  // Placing phase + validation
  let s = G.init();
  ok(s, 0, { t: 'place', i: 0 });
  assert.equal(s.hand[0], 8);
  assert.equal(s.turn, 1);
  assert.equal(G.move(s, 1, { t: 'place', i: 0 }), 'That point is taken');
  assert.equal(G.move(s, 1, { t: 'place', i: 24 }), 'That point is taken');
  assert.equal(G.move(s, 0, { t: 'place', i: 5 }), 'Not your turn');
  assert.match(G.move(s, 1, { t: 'move', from: 3, to: 4 }), /Place all/);
  console.log('PASS mill placing + validation');

  // Forming a mill requires a removal; mill pieces protected while others exist
  s = G.init();
  ok(s, 0, { t: 'place', i: 0 });
  ok(s, 1, { t: 'place', i: 8 });
  ok(s, 0, { t: 'place', i: 1 });
  ok(s, 1, { t: 'place', i: 9 });
  ok(s, 0, { t: 'place', i: 16 });
  ok(s, 1, { t: 'place', i: 10 }); // seat 1 mill 8-9-10
  assert.equal(s.pendingRemove, true);
  assert.equal(s.turn, 1);
  assert.match(G.move(s, 1, { t: 'place', i: 20 }), /remove/);
  assert.match(G.move(s, 1, { t: 'remove', i: 8 }), /opponent/);
  ok(s, 1, { t: 'remove', i: 16 });
  assert.equal(s.board[16], null);
  assert.equal(s.pendingRemove, false);
  assert.equal(s.turn, 0);
  ok(s, 0, { t: 'place', i: 2 }); // seat 0 mill 0-1-2
  assert.deepEqual(G.view(s).removable.sort((a, b) => a - b), [8, 9, 10], 'all seat-1 pieces in a mill -> any can go');
  ok(s, 0, { t: 'remove', i: 9 });
  ok(s, 1, { t: 'place', i: 20 });
  ok(s, 0, { t: 'place', i: 6 });
  ok(s, 1, { t: 'place', i: 9 });   // reforms mill 8-9-10
  assert.equal(s.pendingRemove, true);
  assert.match(G.move(s, 1, { t: 'remove', i: 0 }), /mill/, 'piece in mill protected while 6 is free');
  ok(s, 1, { t: 'remove', i: 6 });
  console.log('PASS mill removal rules');

  // Moving phase: adjacency enforced, draw counter
  s = G.init();
  s.hand = [0, 0];
  s.board = board('00.0.... 11.1.... 1.0.....'.replace(/ /g, ''));
  // seat 0: 0,1,3,18  seat 1: 8,9,11,16
  assert.match(G.move(s, 0, { t: 'move', from: 0, to: 5 }), /neighbouring/);
  assert.match(G.move(s, 0, { t: 'move', from: 8, to: 10 }), /your pieces/);
  ok(s, 0, { t: 'move', from: 3, to: 2 }); // forms 0-1-2
  assert.equal(s.pendingRemove, true);
  ok(s, 0, { t: 'remove', i: 16 });
  assert.equal(s.turn, 1);
  assert.equal(G.view(s).flying[1], true, 'seat 1 has 3 pieces -> flying');
  ok(s, 1, { t: 'move', from: 8, to: 23 }); // flying move across the board
  assert.equal(s.quiet, 1);
  console.log('PASS mill moving + flying');

  // Win when opponent is reduced to two pieces
  ok(s, 0, { t: 'move', from: 2, to: 3 });
  ok(s, 1, { t: 'move', from: 23, to: 22 });
  ok(s, 0, { t: 'move', from: 3, to: 2 }); // re-forms the mill
  ok(s, 0, { t: 'remove', i: 22 });
  assert.equal(s.over, true);
  assert.equal(s.winner, 0);
  assert.equal(s.reason, 'reduced to two pieces');
  console.log('PASS mill win by reduction');

  // Win when opponent is blocked
  s = G.init();
  s.hand = [0, 0];
  // seat 1 at 0,2 (corners) and 4; seat 0 surrounds: 1,7,3,5,9? keep seat 1 at 4 pieces so no flying
  s.board = Array(24).fill(null);
  for (const i of [0, 2, 4, 6]) s.board[i] = 1;      // outer corners
  for (const i of [1, 3, 5, 15, 9]) s.board[i] = 0;  // 1,3,5 block; 7 empty
  s.board[11] = 0;
  ok(s, 0, { t: 'move', from: 15, to: 7 }); // 7 was the last free neighbour of seat 1
  assert.equal(s.over, true);
  assert.equal(s.winner, 0);
  assert.equal(s.reason, 'no legal moves');
  console.log('PASS mill win by blockade');

  // Draw after 50 quiet moves
  s = G.init();
  s.hand = [0, 0];
  s.board = Array(24).fill(null);
  for (const i of [16, 18, 20, 22]) s.board[i] = 0;
  for (const i of [0, 2, 4, 6]) s.board[i] = 1;
  for (let n = 0; n < 50 && !s.over; n++) {
    const p = s.turn;
    const [a, b] = p === 0 ? [16, 17] : [0, 1];
    const from = s.board[a] === p ? a : b;
    ok(s, p, { t: 'move', from, to: from === a ? b : a });
  }
  assert.equal(s.over, true);
  assert.equal(s.winner, 'draw');
  console.log('PASS mill 50-move draw');
} catch (e) {
  console.error('FAIL', e.message);
  process.exit(1);
}
