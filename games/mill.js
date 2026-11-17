const { int } = require('./util');

// 24 points: three concentric rings (r = 0 outer, 1 middle, 2 inner), point index = 8r + k.
// k runs clockwise from the top-left corner: 0 TL, 1 T, 2 TR, 3 R, 4 BR, 5 B, 6 BL, 7 L.
const PIECES = 9;
const DRAW_AFTER = 50; // moves in the moving phase without a mill

const ADJ = Array.from({ length: 24 }, () => []);
const MILLS = [];
for (let r = 0; r < 3; r++) {
  for (let k = 0; k < 8; k++) {
    const a = 8 * r + k, b = 8 * r + ((k + 1) % 8);
    ADJ[a].push(b);
    ADJ[b].push(a);
    if (k % 2 === 1 && r < 2) {
      ADJ[a].push(a + 8);
      ADJ[a + 8].push(a);
    }
  }
  for (const k of [0, 2, 4, 6]) MILLS.push([8 * r + k, 8 * r + k + 1, 8 * r + ((k + 2) % 8)]);
}
for (const k of [1, 3, 5, 7]) MILLS.push([k, 8 + k, 16 + k]);

const inMill = (board, i) => board[i] !== null && MILLS.some((m) => m.includes(i) && m.every((j) => board[j] === board[i]));
const count = (board, p) => board.filter((x) => x === p).length;

function removable(s, victim) {
  const own = s.board.map((x, i) => (x === victim ? i : -1)).filter((i) => i >= 0);
  const free = own.filter((i) => !inMill(s.board, i));
  return free.length ? free : own;
}

function legalMoves(s, p) {
  if (s.hand[p] > 0) return s.board.map((x, i) => (x === null ? { to: i } : null)).filter(Boolean);
  const flying = count(s.board, p) === 3;
  const out = [];
  s.board.forEach((x, from) => {
    if (x !== p) return;
    const targets = flying ? s.board.map((y, i) => (y === null ? i : -1)).filter((i) => i >= 0) : ADJ[from].filter((i) => s.board[i] === null);
    for (const to of targets) out.push({ from, to });
  });
  return out;
}

function endTurn(s, p) {
  const o = 1 - p;
  s.pendingRemove = false;
  s.turn = o;
  if (s.hand[o] + count(s.board, o) < 3) return Object.assign(s, { over: true, winner: p, reason: 'reduced to two pieces' });
  if (!legalMoves(s, o).length) return Object.assign(s, { over: true, winner: p, reason: 'no legal moves' });
  if (s.quiet >= DRAW_AFTER) Object.assign(s, { over: true, winner: 'draw', reason: `${DRAW_AFTER} moves without a mill` });
}

// After a piece lands on `to`: either ask for a removal or pass the turn.
function afterLanding(s, p, to, moving) {
  if (inMill(s.board, to)) {
    s.quiet = 0;
    s.last.mill = true;
    if (removable(s, 1 - p).length) {
      s.pendingRemove = true;
      return;
    }
  } else if (moving) s.quiet++;
  endTurn(s, p);
}

module.exports = {
  id: 'mill',
  name: "Nine Men's Morris",
  ADJ,
  MILLS,
  init: () => ({
    board: Array(24).fill(null),
    hand: [PIECES, PIECES],
    pendingRemove: false,
    quiet: 0,
    turn: 0, over: false, winner: null, reason: null, last: null,
  }),
  move(s, p, m) {
    if (s.over) return 'The game is over';
    if (s.turn !== p) return 'Not your turn';
    const o = 1 - p;
    if (s.pendingRemove) {
      if (m.t !== 'remove') return 'You formed a mill — remove an opponent piece first';
      const i = int(m.i, 0, 23);
      if (i === null || s.board[i] !== o) return "Pick one of your opponent's pieces";
      if (!removable(s, o).includes(i)) return 'Pieces in a mill can only be taken when no others are left';
      s.board[i] = null;
      s.last = { ...s.last, removed: i };
      endTurn(s, p);
      return null;
    }
    if (m.t === 'place') {
      if (s.hand[p] === 0) return 'All your pieces are placed — move one instead';
      const i = int(m.i, 0, 23);
      if (i === null || s.board[i] !== null) return 'That point is taken';
      s.board[i] = p;
      s.hand[p]--;
      s.last = { by: p, to: i };
      afterLanding(s, p, i, false);
      return null;
    }
    if (m.t === 'move') {
      if (s.hand[p] > 0) return 'Place all your pieces first';
      const from = int(m.from, 0, 23), to = int(m.to, 0, 23);
      if (from === null || to === null || s.board[from] !== p) return 'Pick one of your pieces';
      if (s.board[to] !== null) return 'That point is taken';
      const flying = count(s.board, p) === 3;
      if (!flying && !ADJ[from].includes(to)) return 'Pieces move along a line to a neighbouring point';
      s.board[from] = null;
      s.board[to] = p;
      s.last = { by: p, from, to };
      afterLanding(s, p, to, true);
      return null;
    }
    return 'Unknown action';
  },
  view(s) {
    const p = s.turn;
    return {
      ...s,
      onBoard: [count(s.board, 0), count(s.board, 1)],
      phase: s.hand[p] > 0 ? 'place' : 'move',
      flying: [0, 1].map((q) => s.hand[q] === 0 && count(s.board, q) === 3),
      legal: s.over || s.pendingRemove ? [] : legalMoves(s, p),
      removable: s.pendingRemove ? removable(s, 1 - p) : [],
      mills: MILLS.filter((m) => s.board[m[0]] !== null && m.every((j) => s.board[j] === s.board[m[0]])),
    };
  },
};
