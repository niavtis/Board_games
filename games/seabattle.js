const { int, grid, turnError } = require('./util');

const SIZE = 10;
const FLEET = [5, 4, 3, 3, 2, 1, 1, 1, 1]; // index = ship model on the client: carrier, battleship, cruiser, sub, destroyer, 4 boats
const inB = (r, c) => r >= 0 && r < SIZE && c >= 0 && c < SIZE;

function cellsOf(s) {
  return Array.from({ length: s.len }, (_, i) => (s.dir === 'h' ? [s.r, s.c + i] : [s.r + i, s.c]));
}

// Validates a submitted fleet: right ship sizes, inside the grid, no overlaps, ships may not touch (even diagonally).
function validateFleet(ships) {
  if (!Array.isArray(ships) || ships.length !== FLEET.length) return null;
  const lens = ships.map((s) => s && s.len).sort((a, b) => b - a);
  if (lens.join() !== FLEET.join()) return null;
  const occ = grid(SIZE, SIZE, -1);
  const out = [];
  for (let i = 0; i < ships.length; i++) {
    const r = int(ships[i].r, 0, SIZE - 1), c = int(ships[i].c, 0, SIZE - 1);
    if (r === null || c === null) return null;
    const ship = { r, c, len: ships[i].len, dir: ships[i].dir === 'v' ? 'v' : 'h' };
    const cells = cellsOf(ship);
    for (const [y, x] of cells) {
      if (!inB(y, x)) return null;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (inB(y + dy, x + dx) && occ[y + dy][x + dx] !== -1) return null;
      }
    }
    cells.forEach(([y, x]) => (occ[y][x] = i));
    out.push({ ...ship, hits: 0, sunk: false });
  }
  return out;
}

module.exports = {
  id: 'seabattle',
  name: 'Морской бой',
  init: () => ({
    phase: 'place',
    ready: [false, false],
    fleets: [null, null],
    shots: [grid(SIZE, SIZE), grid(SIZE, SIZE)], // shots[p] = shots fired AT player p's waters
    turn: 0, over: false, winner: null, reason: null, last: null,
  }),
  move(s, p, m) {
    if (m.t === 'place') {
      if (s.phase !== 'place') return 'Флот уже расставлен';
      if (s.ready[p]) return 'Вы уже готовы';
      const fleet = validateFleet(m.ships);
      if (!fleet) return 'Неверная расстановка: корабли должны быть на поле и не касаться друг друга';
      s.fleets[p] = fleet;
      s.ready[p] = true;
      if (s.ready[0] && s.ready[1]) s.phase = 'play';
      return null;
    }
    if (m.t !== 'fire') return 'Неизвестное действие';
    if (s.phase !== 'play') return 'Сначала оба игрока расставляют флот';
    const err = turnError(s, p);
    if (err) return err;
    const r = int(m.r, 0, SIZE - 1), c = int(m.c, 0, SIZE - 1);
    if (r === null || c === null) return 'Неверная клетка';
    const t = 1 - p, shots = s.shots[t];
    if (shots[r][c]) return 'Сюда уже стреляли';
    const ship = s.fleets[t].find((sh) => cellsOf(sh).some(([y, x]) => y === r && x === c));
    if (!ship) {
      shots[r][c] = 'miss';
      s.turn = t;
      s.last = { by: p, r, c, res: 'miss' };
      return null;
    }
    shots[r][c] = 'hit';
    ship.hits++;
    let res = 'hit';
    if (ship.hits === ship.len) {
      ship.sunk = true;
      res = 'sunk';
      for (const [y, x] of cellsOf(ship)) {
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          if (inB(y + dy, x + dx) && !shots[y + dy][x + dx]) shots[y + dy][x + dx] = 'near'; // auto-marked, not a real shot
        }
      }
      if (s.fleets[t].every((sh) => sh.sunk)) Object.assign(s, { over: true, winner: p, reason: 'флот уничтожен' });
    }
    s.last = { by: p, r, c, res }; // a hit earns another shot
    return null;
  },
  view(s, p) {
    const o = 1 - p;
    const left = (f) => (f ? f.filter((sh) => !sh.sunk).length : FLEET.length);
    const idx = (f) => f && f.map((sh, i) => ({ ...sh, i })); // i picks the ship model
    return {
      phase: s.phase, ready: s.ready, turn: s.turn, over: s.over, winner: s.winner, reason: s.reason, last: s.last,
      size: SIZE, fleet: FLEET,
      myShips: idx(s.fleets[p]),
      enemyShips: s.fleets[o] ? idx(s.fleets[o]).filter((sh) => sh.sunk || s.over) : [],
      left: [left(s.fleets[0]), left(s.fleets[1])],
      atMe: s.shots[p],
      atThem: s.shots[o],
    };
  },
};
