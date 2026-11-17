const { int, turnError } = require('./util');

const KN = [[1,2],[2,1],[-1,2],[-2,1],[1,-2],[2,-1],[-1,-2],[-2,-1]];
const KG = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
const RD = [[1,0],[-1,0],[0,1],[0,-1]];
const BD = [[1,1],[1,-1],[-1,1],[-1,-1]];
const FILES = 'abcdefgh';
const inB = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;
const opp = (co) => (co === 'w' ? 'b' : 'w');
const colorOf = (p) => (p === 0 ? 'w' : 'b');
const sq = (r, c) => FILES[c] + (8 - r);
const eq = (a, b) => a[0] === b[0] && a[1] === b[1];

// Board: row 0 = rank 8 (black's back rank). Pieces are strings like "wK", "bP".
function initialBoard() {
  const back = ['R','N','B','Q','K','B','N','R'];
  const b = Array.from({ length: 8 }, () => Array(8).fill(null));
  for (let c = 0; c < 8; c++) {
    b[0][c] = 'b' + back[c];
    b[1][c] = 'bP';
    b[6][c] = 'wP';
    b[7][c] = 'w' + back[c];
  }
  return b;
}

function attacked(b, r, c, by) {
  const pr = by === 'w' ? r + 1 : r - 1; // where an attacking pawn would stand
  for (const dc of [-1, 1]) if (inB(pr, c + dc) && b[pr][c + dc] === by + 'P') return true;
  for (const [dr, dc] of KN) if (inB(r + dr, c + dc) && b[r + dr][c + dc] === by + 'N') return true;
  for (const [dr, dc] of KG) if (inB(r + dr, c + dc) && b[r + dr][c + dc] === by + 'K') return true;
  const slide = (dirs, types) => {
    for (const [dr, dc] of dirs) {
      let y = r + dr, x = c + dc;
      while (inB(y, x)) {
        const p = b[y][x];
        if (p) { if (p[0] === by && types.includes(p[1])) return true; break; }
        y += dr; x += dc;
      }
    }
    return false;
  };
  return slide(RD, 'RQ') || slide(BD, 'BQ');
}

function kingSquare(b, co) {
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if (b[r][c] === co + 'K') return [r, c];
  return null;
}

function inCheck(b, co) {
  const k = kingSquare(b, co);
  return !!k && attacked(b, k[0], k[1], opp(co));
}

function pseudoMoves(pos, co) {
  const b = pos.board, out = [];
  const add = (fr, fc, tr, tc, extra) => out.push({ from: [fr, fc], to: [tr, tc], ...extra });
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    const x = b[r][c];
    if (!x || x[0] !== co) continue;
    const t = x[1];
    if (t === 'P') {
      const d = co === 'w' ? -1 : 1, start = co === 'w' ? 6 : 1, last = co === 'w' ? 0 : 7;
      const pawnTo = (tr, tc, extra = {}) => {
        if (tr === last) for (const promo of 'QRBN') add(r, c, tr, tc, { ...extra, promo });
        else add(r, c, tr, tc, extra);
      };
      if (inB(r + d, c) && !b[r + d][c]) {
        pawnTo(r + d, c);
        if (r === start && !b[r + 2 * d][c]) add(r, c, r + 2 * d, c, { double: true });
      }
      for (const dc of [-1, 1]) {
        const tr = r + d, tc = c + dc;
        if (!inB(tr, tc)) continue;
        const y = b[tr][tc];
        if (y && y[0] !== co) pawnTo(tr, tc);
        else if (!y && pos.ep && pos.ep[0] === tr && pos.ep[1] === tc) add(r, c, tr, tc, { ep: true });
      }
    } else if (t === 'N' || t === 'K') {
      for (const [dr, dc] of t === 'N' ? KN : KG) {
        const tr = r + dr, tc = c + dc;
        if (inB(tr, tc) && (!b[tr][tc] || b[tr][tc][0] !== co)) add(r, c, tr, tc);
      }
      const row = co === 'w' ? 7 : 0, them = opp(co), cr = pos.castling;
      if (t === 'K' && r === row && c === 4) {
        if (cr[co + 'K'] && b[row][7] === co + 'R' && !b[row][5] && !b[row][6] &&
            ![4, 5, 6].some((x) => attacked(b, row, x, them))) add(r, c, row, 6, { castle: 'K' });
        if (cr[co + 'Q'] && b[row][0] === co + 'R' && !b[row][1] && !b[row][2] && !b[row][3] &&
            ![4, 3, 2].some((x) => attacked(b, row, x, them))) add(r, c, row, 2, { castle: 'Q' });
      }
    } else {
      const dirs = t === 'R' ? RD : t === 'B' ? BD : RD.concat(BD);
      for (const [dr, dc] of dirs) {
        let tr = r + dr, tc = c + dc;
        while (inB(tr, tc)) {
          const y = b[tr][tc];
          if (!y) add(r, c, tr, tc);
          else { if (y[0] !== co) add(r, c, tr, tc); break; }
          tr += dr; tc += dc;
        }
      }
    }
  }
  return out;
}

// Returns a new position (does not mutate pos).
function doMove(pos, m) {
  const b = pos.board.map((row) => row.slice());
  const [fr, fc] = m.from, [tr, tc] = m.to;
  const x = b[fr][fc], co = x[0];
  const captured = b[tr][tc] || (m.ep ? b[fr][tc] : null);
  if (m.ep) b[fr][tc] = null;
  b[tr][tc] = m.promo ? co + m.promo : x;
  b[fr][fc] = null;
  if (m.castle === 'K') { b[fr][5] = b[fr][7]; b[fr][7] = null; }
  if (m.castle === 'Q') { b[fr][3] = b[fr][0]; b[fr][0] = null; }
  const castling = { ...pos.castling };
  if (x[1] === 'K') { castling[co + 'K'] = false; castling[co + 'Q'] = false; }
  const touch = (r, c) => {
    if (r === 7 && c === 0) castling.wQ = false;
    if (r === 7 && c === 7) castling.wK = false;
    if (r === 0 && c === 0) castling.bQ = false;
    if (r === 0 && c === 7) castling.bK = false;
  };
  touch(fr, fc);
  touch(tr, tc);
  return {
    board: b,
    castling,
    ep: m.double ? [(fr + tr) / 2, fc] : null,
    halfmove: x[1] === 'P' || captured ? 0 : pos.halfmove + 1,
    captured,
  };
}

function legalMoves(pos, co) {
  return pseudoMoves(pos, co).filter((m) => !inCheck(doMove(pos, m).board, co));
}

function toSan(pos, mv, moves) {
  if (mv.castle) return mv.castle === 'K' ? 'O-O' : 'O-O-O';
  const x = pos.board[mv.from[0]][mv.from[1]];
  const cap = !!pos.board[mv.to[0]][mv.to[1]] || !!mv.ep;
  if (x[1] === 'P') return (cap ? FILES[mv.from[1]] + 'x' : '') + sq(...mv.to) + (mv.promo ? '=' + mv.promo : '');
  let s = x[1];
  const rivals = moves.filter((o) => !eq(o.from, mv.from) && eq(o.to, mv.to) && pos.board[o.from[0]][o.from[1]] === x);
  if (rivals.length) {
    if (!rivals.some((o) => o.from[1] === mv.from[1])) s += FILES[mv.from[1]];
    else if (!rivals.some((o) => o.from[0] === mv.from[0])) s += 8 - mv.from[0];
    else s += sq(...mv.from);
  }
  return s + (cap ? 'x' : '') + sq(...mv.to);
}

function insufficient(b) {
  const rest = [];
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    const x = b[r][c];
    if (x && x[1] !== 'K') rest.push({ t: x[1], shade: (r + c) % 2 });
  }
  if (rest.length === 0) return true;
  if (rest.length === 1 && 'BN'.includes(rest[0].t)) return true;
  return rest.every((p) => p.t === 'B') && new Set(rest.map((p) => p.shade)).size === 1;
}

const posKey = (s) =>
  s.board.map((row) => row.map((x) => x || '--').join('')).join('/') + s.turn + JSON.stringify(s.castling) + (s.ep || '');

module.exports = {
  id: 'chess',
  name: 'Chess',
  init() {
    const s = {
      board: initialBoard(),
      castling: { wK: true, wQ: true, bK: true, bQ: true },
      ep: null, halfmove: 0, turn: 0,
      over: false, winner: null, reason: null,
      history: [], last: null, captured: { w: [], b: [] }, reps: {},
    };
    s.reps[posKey(s)] = 1;
    return s;
  },
  move(s, p, m) {
    const err = turnError(s, p);
    if (err) return err;
    if (!Array.isArray(m.from) || !Array.isArray(m.to)) return 'Invalid move';
    const from = [int(m.from[0], 0, 7), int(m.from[1], 0, 7)], to = [int(m.to[0], 0, 7), int(m.to[1], 0, 7)];
    const co = colorOf(p);
    const moves = legalMoves(s, co);
    const cands = moves.filter((mv) => eq(mv.from, from) && eq(mv.to, to));
    const mv = cands.length > 1 ? cands.find((c) => c.promo === (m.promo || 'Q')) : cands[0];
    if (!mv) return 'Illegal move';
    const san = toSan(s, mv, moves);
    const np = doMove(s, mv);
    if (np.captured) s.captured[co].push(np.captured);
    Object.assign(s, { board: np.board, castling: np.castling, ep: np.ep, halfmove: np.halfmove, turn: 1 - p });
    s.last = { from: mv.from, to: mv.to };
    const them = opp(co);
    const replies = legalMoves(s, them);
    const check = inCheck(s.board, them);
    s.history.push(san + (check ? (replies.length ? '+' : '#') : ''));
    const key = posKey(s);
    s.reps[key] = (s.reps[key] || 0) + 1;
    if (!replies.length) {
      Object.assign(s, check ? { over: true, winner: p, reason: 'checkmate' } : { over: true, winner: 'draw', reason: 'stalemate' });
    } else if (insufficient(s.board)) Object.assign(s, { over: true, winner: 'draw', reason: 'insufficient material' });
    else if (s.halfmove >= 100) Object.assign(s, { over: true, winner: 'draw', reason: '50-move rule' });
    else if (s.reps[key] >= 3) Object.assign(s, { over: true, winner: 'draw', reason: 'threefold repetition' });
    return null;
  },
  view(s, p) {
    const { reps, ...rest } = s;
    const toMove = colorOf(s.turn);
    return {
      ...rest,
      check: !s.over || s.reason === 'checkmate' ? (inCheck(s.board, toMove) ? kingSquare(s.board, toMove) : null) : null,
      legal: !s.over && s.turn === p ? legalMoves(s, colorOf(p)).map(({ from, to, promo }) => ({ from, to, promo })) : [],
    };
  },
  // exported for tests
  _internal: { legalMoves, doMove, inCheck },
};
