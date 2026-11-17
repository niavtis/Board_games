const express = require('express');
const http = require('http');
const path = require('path');
const os = require('os');
const { Server } = require('socket.io');
const GAMES = require('./games');
const BOTS = require('./bots');

const PORT = process.env.PORT || 3100;
const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

function lanAddresses() {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter((i) => i && i.family === 'IPv4' && !i.internal)
    .map((i) => i.address);
}

app.get('/api/info', (req, res) => {
  res.json({ port: PORT, lan: lanAddresses(), bots: Object.keys(GAMES).filter(BOTS.has), botLevels: BOTS.LEVELS });
});

/* ---------------- Rooms ---------------- */

const rooms = new Map();
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const EMPTY_ROOM_TTL = 10 * 60 * 1000;

const clean = (s, n) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);

function newCode() {
  let code;
  do {
    code = Array.from({ length: 5 }, () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]).join('');
  } while (rooms.has(code));
  return code;
}

function lobbyList() {
  return [...rooms.values()]
    .filter((r) => r.isPublic && r.players.length === 1 && r.players[0].socketId)
    .map((r) => ({ code: r.code, gameId: r.gameId, host: r.players[0].name, createdAt: r.createdAt }))
    .sort((a, b) => b.createdAt - a.createdAt);
}

function broadcastLobby() {
  io.emit('lobby', lobbyList());
}

function sendRoom(room) {
  const game = GAMES[room.gameId];
  room.players.forEach((pl, idx) => {
    if (!pl.socketId) return;
    io.to(pl.socketId).emit('room', {
      code: room.code,
      gameId: room.gameId,
      isPublic: room.isPublic,
      you: idx,
      gameNo: room.gameNo,
      players: room.players.map((p) => ({ name: p.name, connected: !!(p.socketId || p.bot), bot: p.bot || null })),
      state: room.state ? (game.view ? game.view(room.state, idx) : room.state) : null,
      rematch: room.rematch,
      chat: room.chat,
      now: Date.now(), // lets clients sync countdowns to the server clock
    });
  });
}

function systemMessage(room, text) {
  room.chat.push({ system: true, text, t: Date.now() });
  if (room.chat.length > 60) room.chat.shift();
}

// Real-time games (duels) set state.wakeAt; the server calls game.wake() at that moment
// to advance rounds, then pushes the new state to both players.
function scheduleWake(room) {
  clearTimeout(room.wakeTimer);
  const st = room.state, game = GAMES[room.gameId];
  if (!st || st.over || !st.wakeAt || !game.wake) return;
  room.wakeTimer = setTimeout(() => {
    if (room.state !== st || st.over) return;
    try {
      game.wake(st, Date.now());
    } catch (e) {
      console.error('wake error', e);
      return;
    }
    scheduleWake(room);
    sendRoom(room);
    scheduleBot(room);
  }, Math.max(0, st.wakeAt - Date.now()));
}

/* ---------------- Bots ---------------- */

const LEVEL_NAMES = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
const makeBot = (level) => ({ pid: `bot:${level}`, name: `Bot · ${LEVEL_NAMES[level]}`, socketId: null, bot: level });

// A bot seat acts on its own timer. It is re-planned after every change to the game,
// and its moves go through the same game.move() validation as a human's.
function scheduleBot(room) {
  clearTimeout(room.botTimer);
  const seatNo = room.players.findIndex((p) => p.bot);
  const st = room.state;
  if (seatNo < 0 || !st || st.over) return;
  const memo = (room.botMemo ||= {});
  const plan = BOTS.plan(room.gameId, st, seatNo, room.players[seatNo].bot, memo);
  if (!plan) return;
  room.botTimer = setTimeout(() => {
    if (room.state !== st || st.over) return;
    let err;
    try {
      err = GAMES[room.gameId].move(st, seatNo, plan.move());
    } catch (e) {
      console.error('bot error', e);
      err = 'crashed';
    }
    if (err && plan.soft) {
      memo.plan = null; // a duel answer that no longer applies: sit the round out
      return;
    }
    if (err) {
      console.error(`bot could not move in ${room.gameId}: ${err}`);
      Object.assign(st, { over: true, winner: 1 - seatNo, reason: 'the bot gave up' });
    }
    scheduleWake(room);
    sendRoom(room);
    scheduleBot(room);
  }, plan.delay);
}

function startGame(room) {
  room.state = GAMES[room.gameId].init(Date.now());
  room.rematch = [false, false];
  room.gameNo += 1;
  room.botMemo = {};
  scheduleWake(room);
  scheduleBot(room);
}

function seat(socket, room, name) {
  const pid = socket.data.pid;
  let player = room.players.find((p) => p.pid === pid);
  if (player) {
    player.socketId = socket.id;
    const n = clean(name, 20);
    if (n) player.name = n;
  } else {
    player = { pid, name: clean(name, 20) || 'Player', socketId: socket.id };
    room.players.push(player);
    systemMessage(room, `${player.name} joined`);
    if (room.bot && room.players.length === 1) {
      room.players.push(makeBot(room.bot));
      systemMessage(room, `Playing against the computer (${LEVEL_NAMES[room.bot]})`);
    }
    if (room.players.length === 2) startGame(room);
  }
  clearTimeout(room.timer);
  socket.data.code = room.code;
  sendRoom(room);
  broadcastLobby();
}

function scheduleCleanup(room) {
  clearTimeout(room.timer);
  if (room.players.some((p) => p.socketId)) return;
  room.timer = setTimeout(() => {
    if (room.players.some((p) => p.socketId)) return;
    clearTimeout(room.wakeTimer);
    clearTimeout(room.botTimer);
    rooms.delete(room.code);
  }, EMPTY_ROOM_TTL);
}

function leaveCurrent(socket) {
  const room = rooms.get(socket.data.code);
  socket.data.code = null;
  if (!room) return;
  const idx = room.players.findIndex((p) => p.pid === socket.data.pid);
  if (idx < 0) return;
  const [gone] = room.players.splice(idx, 1);
  systemMessage(room, `${gone.name} left the table`);
  room.state = null; // remaining player waits for a new opponent
  room.rematch = [false, false];
  clearTimeout(room.wakeTimer);
  clearTimeout(room.botTimer);
  if (room.players.every((p) => p.bot)) {
    // empty, or nobody left but the computer
    clearTimeout(room.timer);
    rooms.delete(room.code);
  } else {
    sendRoom(room);
    scheduleCleanup(room);
  }
  broadcastLobby();
}

function current(socket) {
  const room = rooms.get(socket.data.code);
  if (!room) return {};
  const idx = room.players.findIndex((p) => p.pid === socket.data.pid);
  return idx < 0 ? {} : { room, idx };
}

const reply = (cb, payload) => typeof cb === 'function' && cb(payload);

io.on('connection', (socket) => {
  socket.data.pid = socket.id;

  socket.on('hello', (data) => {
    socket.data.pid = clean(data?.playerId, 64) || socket.id;
    socket.emit('lobby', lobbyList());
  });

  socket.on('create', (data, cb) => {
    const gameId = data?.gameId;
    if (!GAMES[gameId]) return reply(cb, { error: 'Unknown game' });
    const bot = data.bot ? (BOTS.LEVELS.includes(data.bot) ? data.bot : 'medium') : null;
    if (bot && !BOTS.has(gameId)) return reply(cb, { error: 'No computer opponent for this game yet' });
    leaveCurrent(socket);
    const room = {
      code: newCode(),
      gameId,
      bot, // level of the computer opponent, or null for a table between people
      isPublic: !bot && !!data.isPublic,
      players: [],
      state: null,
      rematch: [false, false],
      chat: [],
      gameNo: 0,
      createdAt: Date.now(),
    };
    rooms.set(room.code, room);
    seat(socket, room, data.name);
    reply(cb, { code: room.code });
  });

  socket.on('join', (data, cb) => {
    const code = clean(data?.code, 8).toUpperCase();
    const room = rooms.get(code);
    if (!room) return reply(cb, { error: 'Room not found — check the code' });
    const known = room.players.some((p) => p.pid === socket.data.pid);
    if (!known && room.players.length >= 2) return reply(cb, { error: 'That table is already full' });
    if (socket.data.code && socket.data.code !== code) leaveCurrent(socket);
    seat(socket, room, data.name);
    reply(cb, { code });
  });

  socket.on('move', (move, cb) => {
    const { room, idx } = current(socket);
    if (!room || !room.state) return reply(cb, { error: 'No active game' });
    if (room.players.length < 2) return reply(cb, { error: 'Waiting for an opponent' });
    let err;
    try {
      err = GAMES[room.gameId].move(room.state, idx, move || {});
    } catch (e) {
      console.error('move error', e);
      err = 'Invalid move';
    }
    if (err) return reply(cb, { error: err });
    reply(cb, { ok: true });
    scheduleWake(room);
    sendRoom(room);
    scheduleBot(room);
  });

  socket.on('resign', () => {
    const { room, idx } = current(socket);
    if (!room || !room.state || room.state.over || room.players.length < 2) return;
    Object.assign(room.state, { over: true, winner: 1 - idx, reason: 'resignation' });
    systemMessage(room, `${room.players[idx].name} resigned`);
    clearTimeout(room.wakeTimer);
    clearTimeout(room.botTimer);
    sendRoom(room);
  });

  socket.on('rematch', () => {
    const { room, idx } = current(socket);
    if (!room || !room.state || !room.state.over || room.players.length < 2) return;
    room.rematch[idx] = true;
    room.players.forEach((p, i) => p.bot && (room.rematch[i] = true)); // the computer is always up for another
    if (room.rematch[0] && room.rematch[1]) {
      room.players.reverse(); // swap who goes first
      startGame(room);
      systemMessage(room, 'Rematch started — sides swapped');
    }
    sendRoom(room);
  });

  socket.on('chat', (text) => {
    const { room, idx } = current(socket);
    const msg = clean(text, 240);
    if (!room || !msg) return;
    room.chat.push({ name: room.players[idx].name, seat: idx, text: msg, t: Date.now() });
    if (room.chat.length > 60) room.chat.shift();
    sendRoom(room);
  });

  socket.on('leave', () => leaveCurrent(socket));

  socket.on('disconnect', () => {
    const { room, idx } = current(socket);
    if (!room) return;
    if (room.players[idx].socketId === socket.id) room.players[idx].socketId = null;
    sendRoom(room);
    scheduleCleanup(room);
    broadcastLobby();
  });
});

server.listen(PORT, () => {
  console.log(`\n  Tablo is running`);
  console.log(`  Local:   http://localhost:${PORT}`);
  for (const ip of lanAddresses()) console.log(`  Network: http://${ip}:${PORT}`);
  console.log('');
});
