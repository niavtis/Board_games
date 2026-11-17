// End-to-end: boots the server and plays games with two socket clients.
const { spawn } = require('child_process');
const { io } = require('socket.io-client');
const assert = require('assert');

const PORT = 3999;
const srv = spawn(process.execPath, ['server.js'], { env: { ...process.env, PORT }, stdio: ['ignore', 'pipe', 'inherit'] });

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
function client(pid) {
  const s = io(`http://localhost:${PORT}`, { transports: ['websocket'], forceNew: true });
  s.view = null;
  s.on('room', (v) => (s.view = v));
  s.on('connect', () => s.emit('hello', { playerId: pid }));
  return s;
}
const call = (s, ev, data) => new Promise((res) => s.emit(ev, data, res));
const settle = () => wait(60);

async function table(gameId, a, b) {
  const { code } = await call(a, 'create', { gameId, name: 'Ann', isPublic: true });
  await settle();
  const r = await call(b, 'join', { code, name: 'Bob' });
  assert.ok(!r.error, r.error);
  await settle();
  assert.equal(a.view.players.length, 2);
  return code;
}
// seat 0 player is whoever has view.you === 0
const bySeat = (a, b) => (a.view.you === 0 ? [a, b] : [b, a]);
async function play(a, b, moves) {
  for (const [seat, m] of moves) {
    const [p0, p1] = bySeat(a, b);
    const res = await call(seat === 0 ? p0 : p1, 'move', m);
    assert.ok(!res.error, `move ${JSON.stringify(m)} failed: ${res.error}`);
  }
  await settle();
}

(async () => {
  await new Promise((r) => srv.stdout.on('data', (d) => /running/.test(d) && r()));
  const a = client('pidA'), b = client('pidB');
  await wait(200);

  // Tic Tac Toe: X wins on the diagonal; wrong turn rejected
  await table('tictactoe', a, b);
  let [p0, p1] = bySeat(a, b);
  assert.equal((await call(p1, 'move', { i: 0 })).error, 'Not your turn');
  await play(a, b, [[0, { i: 0 }], [1, { i: 1 }], [0, { i: 4 }], [1, { i: 2 }], [0, { i: 8 }]]);
  assert.equal(a.view.state.winner, 0);
  console.log('PASS tictactoe');

  // Rematch swaps seats
  const before = a.view.you;
  a.emit('rematch'); b.emit('rematch');
  await settle();
  assert.equal(a.view.you, 1 - before);
  assert.equal(a.view.state.over, false);
  console.log('PASS rematch swaps sides');

  // Chat + resign
  a.emit('chat', 'gg');
  await settle();
  assert.equal(b.view.chat.at(-1).text, 'gg');
  b.emit('resign');
  await settle();
  assert.equal(a.view.state.winner, a.view.you);
  console.log('PASS chat + resign');

  // Connect Four: vertical win
  await table('connect4', a, b);
  await play(a, b, [[0, { c: 3 }], [1, { c: 4 }], [0, { c: 3 }], [1, { c: 4 }], [0, { c: 3 }], [1, { c: 4 }], [0, { c: 3 }]]);
  assert.equal(a.view.state.winner, 0);
  assert.equal(a.view.state.line.length, 4);
  console.log('PASS connect4');

  // Chess: fool's mate (white = seat 0)
  await table('chess', a, b);
  await play(a, b, [
    [0, { from: [6, 5], to: [5, 5] }], [1, { from: [1, 4], to: [3, 4] }],
    [0, { from: [6, 6], to: [4, 6] }], [1, { from: [0, 3], to: [4, 7] }],
  ]);
  assert.equal(a.view.state.reason, 'checkmate');
  assert.equal(a.view.state.winner, 1);
  assert.deepEqual(a.view.state.history, ['f3', 'e5', 'g4', 'Qh4#']);
  console.log('PASS chess (fool’s mate, SAN:', a.view.state.history.join(' ') + ')');

  // Checkers: mandatory capture enforced
  await table('checkers', a, b);
  await play(a, b, [[0, { from: [5, 2], to: [4, 3] }], [1, { from: [2, 5], to: [3, 4] }]]);
  [p0] = bySeat(a, b);
  assert.match((await call(p0, 'move', { from: [5, 0], to: [4, 1] })).error, /mandatory/);
  await play(a, b, [[0, { from: [4, 3], to: [2, 5] }]]);
  assert.equal(p0.view.state.pieces[1], 11);
  console.log('PASS checkers (forced capture)');

  // Reversi: opening move flips one disc
  await table('reversi', a, b);
  [p0] = bySeat(a, b);
  assert.equal(p0.view.state.legal.length, 4);
  await play(a, b, [[0, { r: 2, c: 3 }]]);
  assert.deepEqual(p0.view.state.counts, [4, 1]);
  console.log('PASS reversi');

  // Gomoku: five in a row
  await table('gomoku', a, b);
  await play(a, b, [0, 1, 2, 3].flatMap((i) => [[0, { r: 7, c: i }], [1, { r: 8, c: i }]]).concat([[0, { r: 7, c: 4 }]]));
  assert.equal(a.view.state.winner, 0);
  console.log('PASS gomoku');

  // Dots & Boxes: closing a box keeps the turn
  await table('dotsboxes', a, b);
  await play(a, b, [[0, { t: 'h', r: 0, c: 0 }], [1, { t: 'h', r: 1, c: 0 }], [0, { t: 'v', r: 0, c: 0 }], [1, { t: 'v', r: 0, c: 1 }]]);
  assert.deepEqual(a.view.state.score, [0, 1]);
  assert.equal(a.view.state.turn, 1);
  console.log('PASS dots & boxes');

  // Sea Battle: hidden fleets, touching ships rejected, hit = extra shot, win
  await table('seabattle', a, b);
  [p0, p1] = bySeat(a, b);
  const fleet = [{ r: 0, c: 0, len: 5, dir: 'h' }, { r: 2, c: 0, len: 4, dir: 'h' }, { r: 4, c: 0, len: 3, dir: 'h' }, { r: 6, c: 0, len: 3, dir: 'h' }, { r: 8, c: 0, len: 2, dir: 'h' },
    ...[0, 2, 4, 6].map((r) => ({ r, c: 8, len: 1, dir: 'h' }))];
  const touching = fleet.map((s, i) => (i === 1 ? { ...s, r: 1 } : s));
  assert.match((await call(p0, 'move', { t: 'place', ships: touching })).error, /касаться/);
  await play(a, b, [[0, { t: 'place', ships: fleet }]]);
  assert.deepEqual(p1.view.state.enemyShips, [], 'enemy ships must be hidden');
  await play(a, b, [[1, { t: 'place', ships: fleet }]]);
  assert.equal(p0.view.state.phase, 'play');
  await play(a, b, [[0, { t: 'fire', r: 9, c: 9 }]]); // miss -> turn passes
  assert.equal(p0.view.state.turn, 1);
  const targets = fleet.flatMap((s) => Array.from({ length: s.len }, (_, i) => ({ t: 'fire', r: s.r, c: s.c + i })));
  await play(a, b, targets.map((m) => [1, m])); // every hit keeps the turn
  assert.equal(p1.view.state.winner, 1);
  assert.equal(p1.view.state.reason, 'флот уничтожен');
  console.log('PASS sea battle');

  // ---- Speed duels (real time; the server advances rounds on timers) ----
  const until = async (cond, ms = 8000) => {
    const t0 = Date.now();
    while (!cond()) {
      if (Date.now() - t0 > ms) throw new Error('timed out waiting for duel state');
      await wait(40);
    }
  };
  const live = (s) => s.view?.state?.phase === 'question';

  // Flag Duel: answer hidden, wrong pick locks you out, reveal shows the answer
  await table('flags', a, b);
  [p0, p1] = bySeat(a, b);
  assert.equal(p0.view.state.phase, 'countdown');
  await until(() => live(p0) && live(p1));
  assert.equal(p0.view.state.secret, undefined, 'answer must stay on the server');
  assert.equal(p0.view.state.q.options.length, 4);
  assert.ok(p0.view.state.q.flag.startsWith('<svg'));
  const first = await call(p0, 'move', { a: 0 });
  assert.ok(!first.error, first.error);
  await settle();
  if (p0.view.state.phase === 'question') {
    // p0 was wrong: locked out, p1 can still answer
    assert.match((await call(p0, 'move', { a: 1 })).error, /already/);
    for (let i = 1; i < 4 && p1.view.state.phase === 'question'; i++) { await call(p1, 'move', { a: i }); await settle(); }
  }
  assert.equal(p0.view.state.phase, 'reveal');
  assert.ok(Number.isInteger(p0.view.state.answer.correct));
  assert.equal(p0.view.state.results.length, 1);
  assert.equal(p0.view.state.score[0] + p0.view.state.score[1], p0.view.state.roundWinner === null ? 0 : 1);
  await until(() => p0.view.state.round === 2 && live(p0), 6000);
  console.log('PASS flag duel (hidden answer, lockout, next round on timer)');

  // Word Race: wrong guess bounces, a correct anagram scores
  await table('wordrace', a, b);
  [p0, p1] = bySeat(a, b);
  await until(() => live(p0));
  assert.equal((await call(p1, 'move', { a: 'qqqqq' })).error, 'wrong');
  const WORDS = require('../games/data/words');
  const key = (w) => [...w.toLowerCase()].sort().join('');
  const sol = WORDS.find((w) => key(w) === key(p1.view.state.q.letters));
  assert.ok(!(await call(p1, 'move', { a: sol })).error);
  await settle();
  assert.equal(p0.view.state.roundWinner, 1);
  assert.deepEqual(p0.view.state.score, [0, 1]);
  console.log('PASS word race');

  // Quick Draw: tapping before the signal hands the point to the opponent
  await table('quickdraw', a, b);
  [p0, p1] = bySeat(a, b);
  await until(() => live(p0));
  assert.equal(p0.view.state.q.armed, false);
  await call(p0, 'move', {});
  await settle();
  assert.equal(p1.view.state.note, 'false start');
  assert.deepEqual(p1.view.state.score, [0, 1]);
  console.log('PASS quick draw (false start)');

  // Resigning a duel stops it
  p1.emit('resign');
  await settle();
  assert.equal(p0.view.state.winner, 0);
  console.log('PASS duel resign');

  await table('seabattle', a, b); // the reconnect checks below expect a fresh board game table

  // Reconnect with the same player id keeps the seat
  const code = a.view.code;
  a.disconnect();
  await settle();
  assert.equal(b.view.players.find((p) => p.name === 'Ann').connected, false);
  const a2 = client('pidA');
  await wait(150);
  await call(a2, 'join', { code, name: 'Ann' });
  await settle();
  assert.equal(a2.view.players.length, 2);
  assert.ok(b.view.players.every((p) => p.connected));
  console.log('PASS reconnect keeps seat');

  // Full room rejects a third player
  const c = client('pidC');
  await wait(150);
  assert.match((await call(c, 'join', { code, name: 'Cy' })).error, /full/);
  console.log('PASS full room rejected');

  console.log('\nAll end-to-end checks passed.');
  [a2, b, c].forEach((s) => s.disconnect());
  srv.kill();
  process.exit(0);
})().catch((e) => {
  console.error('FAIL', e.message);
  srv.kill();
  process.exit(1);
});
