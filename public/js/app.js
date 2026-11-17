import { GAMES, ORDER, themeVars, themeStyle } from './games/index.js';
import { h, toast, copyText } from './ui.js';

const $ = (s) => document.querySelector(s);
const socket = io();

// Per-tab identity so two tabs on one computer count as two players; survives reloads.
const pid = (() => {
  let id = sessionStorage.getItem('pid');
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem('pid', id);
  }
  return id;
})();

let room = null; // latest room view from the server
let lanBase = null; // shareable LAN address when hosting on localhost
let chatSeen = 0;
let clockOffset = 0; // server time minus local time, for duel countdowns

/* ---------------- Name ---------------- */
const nameInput = $('#name');
nameInput.value = localStorage.getItem('name') || '';
nameInput.addEventListener('input', () => localStorage.setItem('name', nameInput.value.trim()));
const myName = () => nameInput.value.trim();

function requireName() {
  if (myName()) return true;
  const field = nameInput.closest('.name-field');
  field.classList.remove('attention');
  void field.offsetWidth;
  field.classList.add('attention');
  nameInput.focus();
  toast('Enter your name first');
  return false;
}

/* ---------------- Computer opponent ---------------- */
const BOT_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="8" width="16" height="12" rx="3"/><path d="M12 8V4.5"/><circle cx="12" cy="3.5" r="1.2"/><circle cx="9" cy="14" r="1.3" class="eye"/><circle cx="15" cy="14" r="1.3" class="eye"/></svg>';
const botLevel = $('#bot-level');
botLevel.value = localStorage.getItem('botLevel') || 'medium';
botLevel.addEventListener('change', () => localStorage.setItem('botLevel', botLevel.value));
let botGames = new Set(); // games with a computer opponent (from /api/info)
const vsBot = (v) => v.players.some((p) => p.bot);

/* ---------------- Menu ---------------- */
function buildMenu() {
  $('#games').innerHTML = '';
  $('#duels').innerHTML = '';
  for (const id of ORDER) {
    const G = GAMES[id];
    const grid = G.category === 'duel' ? $('#duels') : $('#games');
    grid.append(
      h('article', { class: 'card', style: themeStyle(G) },
        h('div', { class: 'card-art', style: `--art-bg:${G.artBg || '#222838'}`, html: G.art }),
        h('h3', {}, G.name),
        h('p', {}, G.blurb),
        h('div', { class: 'card-meta' }, h('span', {}, '2 players'), h('span', {}, G.length), G.category === 'duel' ? h('span', { class: 'live' }, 'real-time') : null),
        h('div', { class: 'card-actions' },
          h('button', { class: 'btn primary', onclick: () => create(id, true) }, 'Play online'),
          h('button', { class: 'btn', onclick: () => create(id, false) }, 'Invite friend'),
        ),
        botGames.has(id) ? h('button', { class: 'btn bot', onclick: () => createBot(id) }, h('span', { class: 'bot-icon', html: BOT_ICON }), 'Play vs computer') : null,
      ),
    );
  }
}

function renderLobby(list) {
  const ul = $('#lobby');
  ul.innerHTML = '';
  $('#lobby-count').textContent = list.length;
  if (!list.length) {
    ul.append(h('li', { class: 'empty' }, 'No open tables right now — start one with “Play online”.'));
    return;
  }
  for (const t of list) {
    const G = GAMES[t.gameId];
    ul.append(
      h('li', { style: themeStyle(G) },
        h('span', { class: 'dot-live' }),
        h('span', { class: 'lobby-game' }, G?.name || t.gameId),
        h('span', { class: 'lobby-host' }, `hosted by ${t.host}`),
        h('button', { class: 'btn small primary', onclick: () => join(t.code) }, 'Join'),
      ),
    );
  }
}

function create(gameId, isPublic) {
  if (!requireName()) return;
  socket.emit('create', { gameId, name: myName(), isPublic }, (res) => res?.error && toast(res.error, 'error'));
}

// Practice table against the computer: starts at once, no name needed.
function createBot(gameId) {
  socket.emit('create', { gameId, name: myName() || 'You', bot: botLevel.value }, (res) => res?.error && toast(res.error, 'error'));
}

function join(code) {
  if (!requireName()) return;
  socket.emit('join', { code, name: myName() }, (res) => {
    if (res?.error) {
      toast(res.error, 'error');
      if (!room) setUrl(null);
    }
  });
}

$('#join-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const code = $('#join-code').value.trim().toUpperCase();
  if (code.length < 5) return toast('Room codes have 5 characters');
  join(code);
});

/* ---------------- Screens ---------------- */
function setUrl(code) {
  const url = code ? `?room=${code}` : location.pathname;
  history.replaceState(null, '', url);
}

function showMenu() {
  room = null;
  setUrl(null);
  $('#room').hidden = true;
  $('#menu').hidden = false;
  applyTheme(null);
  document.title = 'Tablo — Online Board Games';
}

// Re-color the whole page (logo, glow, buttons) with the current game's palette.
let themed = [];
function applyTheme(G) {
  const root = document.documentElement.style;
  for (const k of themed) root.removeProperty(k);
  const vars = themeVars(G);
  for (const [k, v] of Object.entries(vars)) root.setProperty(k, v);
  themed = Object.keys(vars);
}

function showRoom() {
  $('#menu').hidden = true;
  $('#room').hidden = false;
  setUrl(room.code);
}

$('#brand').addEventListener('click', (e) => {
  if (!room) return;
  e.preventDefault();
  leave();
});
$('#leave').addEventListener('click', leave);
function leave() {
  socket.emit('leave');
  showMenu();
}

function inviteLink() {
  const base = lanBase && ['localhost', '127.0.0.1'].includes(location.hostname) ? lanBase : location.origin;
  return `${base}/?room=${room.code}`;
}

$('#copy-code').addEventListener('click', async () => {
  if (room && (await copyText(inviteLink()))) toast('Invite link copied');
});

/* ---------------- Room rendering ---------------- */
function statusOf(v, G, ctx) {
  const st = v.state, you = v.you, other = v.players[1 - you];
  if (v.players.length < 2 || !st) return { text: 'Waiting for an opponent to join…', tone: '' };
  const why = st.reason ? ` — ${st.reason}` : '';
  if (st.over) {
    if (st.winner === 'draw') return { text: `Draw${why}`, tone: '' };
    return st.winner === you ? { text: `You win!${why}`, tone: 'win' } : { text: `${other.name} wins${why}`, tone: 'lose' };
  }
  const custom = G.status?.(st, ctx);
  if (custom) return custom;
  if (ctx.myTurn) return { text: 'Your turn', tone: 'turn' };
  return { text: other.bot ? 'The computer is thinking…' : `${other.name}’s turn`, tone: other.bot ? 'thinking' : '' };
}

function renderPlayers(v, G) {
  const box = $('#players');
  box.innerHTML = '';
  const st = v.state;
  const score = st && G.score ? G.score(st, v.you) : null;
  for (let i = 0; i < 2; i++) {
    const p = v.players[i];
    if (!p) {
      box.append(h('div', { class: 'player empty' }, h('span', { class: 'swatch', style: `background:${G.swatches[i]}` }), 'Waiting for player…'));
      continue;
    }
    const isTurn = st && !st.over && st.turn === i && v.players.length === 2 && !(G.simultaneous?.(st));
    box.append(
      h('div', { class: `player ${isTurn ? 'turn' : ''} ${p.connected ? '' : 'offline'}` },
        h('span', { class: 'swatch', style: `background:${G.swatches[i]}` }),
        h('div', { class: 'meta' },
          h('div', { class: 'player-name' }, p.name, i === v.you ? h('span', { class: 'badge' }, 'you') : null, p.bot ? h('span', { class: 'badge bot-badge' }, 'computer') : null, p.connected ? null : h('span', { class: 'badge' }, 'offline')),
          h('div', { class: 'player-side' }, G.sides[i]),
        ),
        score ? h('div', { class: 'score' }, score.values[i], h('small', {}, score.label)) : null,
      ),
    );
  }
}

function renderInvite(el) {
  const link = inviteLink();
  el.append(
    h('div', { class: 'invite' },
      h('div', { class: 'spinner' }),
      h('h3', {}, 'Waiting for an opponent'),
      h('p', {}, room.isPublic ? 'Your table is listed in the lobby. You can also share the code or link:' : 'Send this code or link to a friend:'),
      h('div', { class: 'big-code' }, room.code),
      h('div', { class: 'link' }, link),
      h('button', { class: 'btn primary', onclick: async () => (await copyText(link)) && toast('Invite link copied') }, 'Copy invite link'),
    ),
  );
}

function renderChat(v) {
  const log = $('#chat-log');
  const atBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 30;
  log.innerHTML = '';
  for (const m of v.chat) {
    log.append(m.system ? h('li', { class: 'sys' }, m.text) : h('li', {}, h('b', { class: `s${m.seat}` }, m.name), ': ', m.text));
  }
  if (atBottom || v.chat.length !== chatSeen) log.scrollTop = log.scrollHeight;
  chatSeen = v.chat.length;
}

function renderRoom() {
  const v = room;
  const G = GAMES[v.gameId];
  const st = v.state;
  const playing = v.players.length === 2 && !!st;
  const ctx = {
    you: v.you,
    myTurn: playing && !st.over && st.turn === v.you,
    playing,
    names: v.players.map((p) => p.name),
    gameKey: `${v.code}:${v.gameNo}`,
    // Pass `onResult` to handle the server's reply yourself instead of the default error toast.
    send: (move, onResult) => socket.emit('move', move, (res) => (onResult ? onResult(res) : res?.error && toast(res.error, 'error'))),
    rerender: renderRoom,
    clock: () => Date.now() + clockOffset,
  };

  applyTheme(G);
  $('#room-title').textContent = G.name;
  $('#room-code').textContent = v.code;
  $('#rules').innerHTML = '';
  $('#rules').append(h('h3', {}, 'How to play'), h('ul', {}, G.rules.map((r) => h('li', {}, r))));

  renderPlayers(v, G);

  const status = statusOf(v, G, ctx);
  const statusEl = $('#status');
  statusEl.textContent = status.text;
  statusEl.className = `status ${status.tone}`;
  document.title = (status.tone === 'turn' ? '● ' : '') + `${G.name} · Tablo`;

  const board = $('#board');
  // ownsBoard games update their DOM in place (keeps running animations); everyone else gets a clean slate.
  if (!(playing && G.ownsBoard)) board.innerHTML = '';
  board.className = `board-area game-${G.id}`;
  if (playing) G.render(board, st, ctx);
  else renderInvite(board);

  const resign = $('#resign'), rematch = $('#rematch');
  resign.hidden = !(playing && !st.over);
  rematch.hidden = !(playing && st.over);
  if (playing && st.over) {
    const mine = v.rematch[v.you], theirs = v.rematch[1 - v.you];
    rematch.disabled = mine;
    rematch.textContent = vsBot(v) ? 'Play again' : mine ? 'Waiting for opponent…' : theirs ? 'Accept rematch' : 'Rematch';
  }
  // A computer table has no one to invite or chat with.
  $('#copy-code').hidden = vsBot(v);
  $('#chat-form').hidden = vsBot(v);
  renderChat(v);
}

$('#resign').addEventListener('click', () => {
  if (window.confirm('Resign this game?')) socket.emit('resign');
});
$('#rematch').addEventListener('click', () => socket.emit('rematch'));
$('#chat-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = $('#chat-input');
  if (input.value.trim()) socket.emit('chat', input.value);
  input.value = '';
});

/* ---------------- Socket events ---------------- */
socket.on('connect', () => {
  $('#conn').hidden = true;
  socket.emit('hello', { playerId: pid });
  const code = room?.code || new URLSearchParams(location.search).get('room');
  if (!code) return;
  if (room || myName()) join(code);
  else {
    $('#join-code').value = code.toUpperCase();
    requireName();
    toast(`Enter your name, then press Join to enter room ${code.toUpperCase()}`);
  }
});
socket.on('disconnect', () => ($('#conn').hidden = false));
socket.on('lobby', renderLobby);
socket.on('room', (v) => {
  const wasWaiting = room && room.players.length < 2;
  room = v;
  if (typeof v.now === 'number') clockOffset = v.now - Date.now();
  if ($('#room').hidden) showRoom();
  if (wasWaiting && v.players.length === 2) toast(`${v.players[1 - v.you].name} joined — game on!`);
  renderRoom();
});

fetch('/api/info')
  .then((r) => r.json())
  .then((info) => {
    if (info.lan?.length) lanBase = `http://${info.lan[0]}:${info.port}`;
    if (info.bots?.length) {
      botGames = new Set(info.bots);
      buildMenu(); // add the "Play vs computer" buttons
    }
  })
  .catch(() => {});

buildMenu();
