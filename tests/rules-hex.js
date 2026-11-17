// Unit checks for the Hex rules module.
const assert = require('assert');
const hex = require('../games/hex');

function run(name, fn) {
  try {
    fn();
    console.log('PASS', name);
  } catch (e) {
    console.error('FAIL', name, '-', e.message);
    process.exitCode = 1;
  }
}

run('hex: turn order and occupied cells', () => {
  const s = hex.init();
  assert.equal(hex.move(s, 1, { r: 0, c: 0 }), 'Not your turn');
  assert.equal(hex.move(s, 0, { r: 5, c: 5 }), null);
  assert.equal(hex.move(s, 1, { r: 5, c: 5 }), 'That cell is taken');
  assert.equal(hex.move(s, 1, { r: 11, c: 0 }), 'Invalid cell');
  assert.equal(hex.move(s, 1, { r: '1', c: 0 }), 'Invalid cell');
});

run('hex: swap rule mirrors the opening stone', () => {
  const s = hex.init();
  hex.move(s, 0, { r: 2, c: 7 });
  assert.equal(hex.view(s, 1).canSwap, true);
  assert.equal(hex.move(s, 1, { swap: true }), null);
  assert.equal(s.board[2][7], null);
  assert.equal(s.board[7][2], 1);
  assert.equal(s.turn, 0);
  assert.equal(hex.view(s, 0).canSwap, false);
  hex.move(s, 0, { r: 0, c: 0 });
  assert.match(hex.move(s, 1, { swap: true }), /first move/);
});

run('hex: red wins top to bottom along a zigzag', () => {
  const s = hex.init();
  // Red column at c=3, but row 5 steps to (5,2) via the (+1,-1) neighbour.
  const red = [[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2]];
  red.forEach(([r, c], i) => {
    assert.equal(s.over, false);
    assert.equal(hex.move(s, 0, { r, c }), null);
    if (i < red.length - 1) assert.equal(hex.move(s, 1, { r: i, c: 9 }), null);
  });
  assert.equal(s.winner, 0);
  assert.equal(s.path.length, 11);
  assert.deepEqual(s.path[0], [0, 3]);
  assert.deepEqual(s.path.at(-1), [10, 2]);
  assert.match(hex.move(s, 1, { r: 10, c: 10 }), /over/);
});

run('hex: diagonal (+1,+1) is NOT adjacent', () => {
  const b = Array.from({ length: 11 }, () => Array(11).fill(null));
  for (let r = 0; r < 11; r++) b[r][r] = 0;
  assert.equal(hex.winningPath(b, 0), null);
  for (let r = 0; r < 11; r++) b[r][r] = 1;
  assert.equal(hex.winningPath(b, 1), null);
});

run('hex: blue wins left to right', () => {
  const s = hex.init();
  for (let c = 0; c < 11; c++) {
    assert.equal(hex.move(s, 0, { r: c === 10 ? 9 : 10, c: c === 10 ? 0 : c }), null);
    assert.equal(hex.move(s, 1, { r: 4, c }), null);
  }
  assert.equal(s.winner, 1);
  assert.equal(s.path.length, 11);
});
