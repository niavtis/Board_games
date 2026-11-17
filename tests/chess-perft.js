// Verifies the chess move generator against well-known perft node counts.
const chess = require('../games/chess');
const { legalMoves, doMove } = chess._internal;

function fromFen(fen) {
  const [placement, side, cast, ep] = fen.split(' ');
  const board = placement.split('/').map((row) => {
    const out = [];
    for (const ch of row) {
      if (/\d/.test(ch)) for (let i = 0; i < +ch; i++) out.push(null);
      else out.push((ch === ch.toUpperCase() ? 'w' : 'b') + ch.toUpperCase());
    }
    return out;
  });
  const castling = { wK: cast.includes('K'), wQ: cast.includes('Q'), bK: cast.includes('k'), bQ: cast.includes('q') };
  const epSq = ep === '-' ? null : [8 - +ep[1], 'abcdefgh'.indexOf(ep[0])];
  return { pos: { board, castling, ep: epSq, halfmove: 0 }, co: side };
}

function perft(pos, co, depth) {
  const moves = legalMoves(pos, co);
  if (depth === 1) return moves.length;
  let n = 0;
  for (const m of moves) n += perft(doMove(pos, m), co === 'w' ? 'b' : 'w', depth - 1);
  return n;
}

const cases = [
  ['rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -', 4, 197281],
  ['r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq -', 3, 97862], // "Kiwipete"
  ['8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - -', 4, 43238],
  ['r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq -', 3, 9467],
];
let ok = true;
for (const [fen, depth, expected] of cases) {
  const { pos, co } = fromFen(fen);
  const got = perft(pos, co, depth);
  const pass = got === expected;
  ok &&= pass;
  console.log(`${pass ? 'PASS' : 'FAIL'} perft(${depth}) = ${got} (expected ${expected})  ${fen}`);
}
process.exit(ok ? 0 : 1);
