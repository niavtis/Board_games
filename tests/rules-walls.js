// Unit checks for the Wall Race rules module.
const assert = require('assert');
const walls = require('../games/walls');

function run(name, fn) {
  try {
    fn();
    console.log('PASS', name);
  } catch (e) {
    console.error('FAIL', name, '-', e.message);
    process.exitCode = 1;
  }
}

const sorted = (list) => list.map((p) => p.join(',')).sort();

run('walls: opening pawn moves and turn order', () => {
  const s = walls.init();
  assert.deepEqual(sorted(walls.view(s).legal), sorted([[7, 4], [8, 3], [8, 5]]));
  assert.equal(walls.move(s, 1, { t: 'pawn', r: 1, c: 4 }), 'Not your turn');
  assert.match(walls.move(s, 0, { t: 'pawn', r: 6, c: 4 }), /cannot move/);
  assert.equal(walls.move(s, 0, { t: 'pawn', r: 7, c: 4 }), null);
  assert.equal(s.turn, 1);
  assert.deepEqual(s.last.from, [8, 4]);
});

run('walls: horizontal wall blocks a step', () => {
  const s = walls.init();
  // Wall under row 7 at columns 4-5 sits between seat 0's pawn (8,4) and (7,4).
  assert.equal(walls.move(s, 0, { t: 'wall', r: 7, c: 4, o: 'h' }), null);
  assert.equal(s.wallsLeft[0], 9);
  walls.move(s, 1, { t: 'pawn', r: 1, c: 4 });
  assert.match(walls.move(s, 0, { t: 'pawn', r: 7, c: 4 }), /cannot move/);
  assert.deepEqual(sorted(walls.view(s).legal), sorted([[8, 3], [8, 5]]));
});

run('walls: overlap and crossing rejected', () => {
  const s = walls.init();
  walls.move(s, 0, { t: 'wall', r: 3, c: 3, o: 'h' });
  assert.match(walls.move(s, 1, { t: 'wall', r: 3, c: 4, o: 'h' }), /overlap/);
  assert.match(walls.move(s, 1, { t: 'wall', r: 3, c: 2, o: 'h' }), /overlap/);
  assert.match(walls.move(s, 1, { t: 'wall', r: 3, c: 3, o: 'v' }), /cross/);
  assert.equal(walls.move(s, 1, { t: 'wall', r: 3, c: 5, o: 'h' }), null); // adjacent, not overlapping
  walls.move(s, 0, { t: 'wall', r: 0, c: 0, o: 'v' });
  assert.match(walls.move(s, 1, { t: 'wall', r: 1, c: 0, o: 'v' }), /overlap/);
  assert.match(walls.move(s, 1, { t: 'wall', r: 8, c: 0, o: 'v' }), /Invalid/);
  assert.match(walls.move(s, 1, { t: 'wall', r: 0, c: 0, o: 'x' }), /Invalid/);
});

run('walls: cannot fully block a pawn', () => {
  const s = walls.init();
  // Seal row 0/1 boundary except the last column pair, then try to close it.
  const seq = [[0, 0], [0, 2], [0, 4], [0, 6]];
  seq.forEach(([r, c], i) => assert.equal(walls.move(s, i % 2, { t: 'wall', r, c, o: 'h' }), null));
  // Columns 0-7 are sealed below row 0; seat 1 (at 0,4) can only escape via column 8.
  // A vertical wall right of column 7 (rows 0-1) would trap it.
  assert.match(walls.move(s, 0, { t: 'wall', r: 0, c: 7, o: 'v' }), /block/);
  assert.equal(s.wallsLeft[0], 8, 'rejected wall must not be spent');
  assert.equal(s.vw[0][7], null);
  assert.equal(walls.move(s, 0, { t: 'wall', r: 1, c: 7, o: 'v' }), null); // lower down is fine
});

run('walls: straight and diagonal jumps', () => {
  const s = walls.init();
  s.pos = [[5, 4], [4, 4]];
  assert.ok(walls.pawnMoves(s, 0).some(([r, c]) => r === 3 && c === 4), 'straight jump');
  // Wall behind the opponent -> diagonal jumps instead.
  s.hw[3][4] = 1;
  const m = sorted(walls.pawnMoves(s, 0));
  assert.ok(!m.includes('3,4'));
  assert.ok(m.includes('4,3') && m.includes('4,5'), 'diagonal jumps');
  // Board edge behind the opponent -> diagonal too.
  s.hw[3][4] = null;
  s.pos = [[1, 4], [0, 4]];
  const e = sorted(walls.pawnMoves(s, 0));
  assert.ok(e.includes('0,3') && e.includes('0,5'));
});

run('walls: reaching the far row wins', () => {
  const s = walls.init();
  s.pos = [[1, 0], [7, 8]];
  assert.equal(walls.move(s, 0, { t: 'pawn', r: 0, c: 0 }), null);
  assert.equal(s.over, true);
  assert.equal(s.winner, 0);
  assert.deepEqual(walls.view(s).legal, []);
});

run('walls: running out of walls', () => {
  const s = walls.init();
  s.wallsLeft[0] = 0;
  assert.match(walls.move(s, 0, { t: 'wall', r: 4, c: 4, o: 'h' }), /no walls/);
});
