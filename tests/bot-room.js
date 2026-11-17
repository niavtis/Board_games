// End-to-end: a person plays against the computer through the real server.
const { spawn } = require('child_process');
const { io } = require('socket.io-client');
const assert = require('assert');

const PORT = 3998;
const srv = spawn(process.execPath, ['server.js'], { env: { ...process.env, PORT }, stdio: ['ignore', 'pipe', 'inherit'] });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const call = (s, ev, data) => new Promise((res) => s.emit(ev, data, res));
async function until(fn, ms, what) {
  for (const end = Date.now() + ms; Date.now() < end; await wait(50)) if (fn()) return;
  assert.fail(`timed out waiting for ${what}`);
}

(async () => {
  try {
    await new Promise((r) => srv.stdout.on('data', (d) => /running/.test(d) && r()));
    const info = await (await fetch(`http://localhost:${PORT}/api/info`)).json();
    assert.ok(info.bots.includes('chess') && info.bots.includes('flags'), 'bot games listed');

    const a = io(`http://localhost:${PORT}`, { transports: ['websocket'], forceNew: true });
    a.on('room', (v) => (a.view = v));
    await new Promise((r) => a.on('connect', r));
    a.emit('hello', { playerId: 'human' });

    // Tic Tac Toe vs hard bot: the game starts at once and the bot answers each move.
    const { code } = await call(a, 'create', { gameId: 'tictactoe', name: 'Ann', bot: 'hard' });
    await until(() => a.view?.state, 1000, 'game start');
    assert.equal(a.view.players.length, 2);
    assert.equal(a.view.players[1].bot, 'hard');
    assert.equal(a.view.isPublic, false);
    while (!a.view.state.over) {
      const filled = () => a.view.state.board.filter((x) => x !== null).length;
      const before = filled();
      const res = await call(a, 'move', { i: a.view.state.board.indexOf(null) });
      assert.ok(!res.error, res.error);
      await until(() => a.view.state.over || filled() === before + 2, 2000, 'bot reply');
    }
    assert.notEqual(a.view.state.winner, a.view.you, 'a perfect bot never loses at tic tac toe');
    console.log('PASS bot plays tic tac toe');

    // Rematch is accepted by the bot immediately; sides swap so the bot opens.
    a.emit('rematch');
    await until(() => !a.view.state.over && a.view.you === 1, 1000, 'rematch');
    await until(() => a.view.state.board.some((x) => x !== null), 2000, 'bot opening move');
    console.log('PASS bot accepts rematch and moves first');

    // Nobody else can sit at a computer table.
    const b = io(`http://localhost:${PORT}`, { transports: ['websocket'], forceNew: true });
    await new Promise((r) => b.on('connect', r));
    b.emit('hello', { playerId: 'other' });
    assert.equal((await call(b, 'join', { code, name: 'Bob' })).error, 'That table is already full');

    // Leaving closes the table.
    a.emit('leave');
    await wait(100);
    assert.match((await call(b, 'join', { code, name: 'Bob' })).error, /not found/);
    console.log('PASS bot table is private and closes when you leave');

    // Sea Battle: the bot places its fleet on its own.
    await call(a, 'create', { gameId: 'seabattle', name: 'Ann', bot: 'easy' });
    await until(() => a.view?.gameId === 'seabattle' && a.view.state?.ready[1], 2000, 'bot fleet');
    console.log('PASS bot places its fleet');

    // Duel: the bot answers the first flag within its thinking time.
    await call(a, 'create', { gameId: 'flags', name: 'Ann', bot: 'hard' });
    await until(() => a.view?.gameId === 'flags' && a.view.state?.phase === 'question', 4000, 'first question');
    await until(() => a.view.state.results.length > 0 || a.view.state.locked[1], 6000, 'bot answer');
    console.log('PASS bot answers in a duel');

    a.close();
    b.close();
  } finally {
    srv.kill();
  }
})().catch((e) => {
  console.error(e);
  srv.kill();
  process.exit(1);
});
