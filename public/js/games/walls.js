import { h } from '../ui.js';

// Board is a 17×17 CSS grid: even/even = cells, even/odd = vertical gaps,
// odd/even = horizontal gaps, odd/odd = intersections (wall centres).
const N = 9, W = N - 1, G = 2 * N - 1;

let pending = null; // touch: first tap previews a wall, second tap confirms

const hw = (v, r, c) => (r >= 0 && r < W && c >= 0 && c < W ? v.hw[r][c] : null);
const vw = (v, r, c) => (r >= 0 && r < W && c >= 0 && c < W ? v.vw[r][c] : null);
const own = (...xs) => xs.find((x) => x !== null && x !== undefined) ?? null;

function wallOk(v, { r, c, o }) {
  if (o === 'h') return hw(v, r, c) === null && hw(v, r, c - 1) === null && hw(v, r, c + 1) === null && vw(v, r, c) === null;
  return vw(v, r, c) === null && vw(v, r - 1, c) === null && vw(v, r + 1, c) === null && hw(v, r, c) === null;
}
const parts = ({ r, c, o }) => (o === 'h' ? [`h:${r}:${c}`, `h:${r}:${c + 1}`, `x:${r}:${c}`] : [`v:${r}:${c}`, `v:${r + 1}:${c}`, `x:${r}:${c}`]);
const keyOf = (w) => `${w.o}${w.r},${w.c}`;

const wallsArt = `<svg viewBox="0 0 160 90"><g fill="#2a2140">${Array.from({ length: 7 }, (_, r) => Array.from({ length: 7 }, (_, c) => `<rect x="${45 + c * 10.4}" y="${8 + r * 10.4}" width="8.4" height="8.4" rx="1.6"/>`).join('')).join('')}</g>
  <rect x="54.4" y="16.6" width="19" height="2" rx="1" fill="#43e08a"/><rect x="85.6" y="47.8" width="19" height="2" rx="1" fill="#a07aff"/><rect x="73.6" y="27" width="2" height="19" rx="1" fill="#a07aff"/><rect x="94.4" y="16.6" width="2" height="19" rx="1" fill="#43e08a"/>
  <circle cx="80.4" cy="74.6" r="3.3" fill="#43e08a"/><circle cx="80.4" cy="12.2" r="3.3" fill="#a07aff"/></svg>`;

export default {
  id: 'walls',
  name: 'Wall Race',
  blurb: 'Race your pawn across the board — and drop walls to make your rival take the long way round.',
  length: '10 min',
  sides: ['Green · starts at the bottom · moves first', 'Violet · starts at the top'],
  swatches: ['var(--p0)', 'var(--p1)'],
  artBg: '#141022',
  art: wallsArt,
  rules: [
    'On your turn, either move your pawn one square or place one of your 10 walls.',
    'First pawn to reach the opposite side of the board wins.',
    'Walls are two squares long and may not overlap, cross, or completely cut anyone off.',
    'You can jump over an adjacent pawn — diagonally if a wall or the edge is behind it.',
  ],
  score: (v) => ({ values: v.wallsLeft, label: 'walls' }),
  status(v, ctx) {
    if (!ctx.myTurn) return null;
    return { text: v.wallsLeft[ctx.you] ? 'Your turn — move your pawn or place a wall' : 'Your turn — move your pawn (no walls left)', tone: 'turn' };
  },
  render(el, v, ctx) {
    const flip = ctx.you === 1; // each player sees their own pawn at the bottom
    const legal = new Set(ctx.myTurn ? (v.legal || []).map(([r, c]) => `${r},${c}`) : []);
    const canWall = ctx.myTurn && v.wallsLeft[ctx.you] > 0;
    const last = v.last;
    const lastParts = new Set(last && last.t === 'wall' ? parts(last) : []);
    if (pending && (pending.gameKey !== ctx.gameKey || !canWall || !wallOk(v, pending))) pending = null;

    const els = new Map();
    const board = h('div', { class: `walls${flip ? ' flip' : ''}`, style: `--g:${G}` });
    const show = (w, on, cls = 'preview') => parts(w).forEach((k) => els.get(k)?.classList.toggle(cls, on));

    const wallHandlers = (w) => {
      if (!canWall || !wallOk(v, w)) return {};
      let touch = false;
      return {
        onpointerdown: (e) => (touch = e.pointerType !== 'mouse'),
        onmouseenter: () => show(w, true),
        onmouseleave: () => pending && keyOf(pending) === keyOf(w) ? null : show(w, false),
        onclick: () => {
          if (touch && (!pending || keyOf(pending) !== keyOf(w))) {
            if (pending) show(pending, false);
            pending = { ...w, gameKey: ctx.gameKey };
            show(w, true);
            return;
          }
          pending = null;
          ctx.send({ t: 'wall', r: w.r, c: w.c, o: w.o });
        },
      };
    };

    for (let di = 0; di < G; di++) for (let dj = 0; dj < G; dj++) {
      const i = flip ? G - 1 - di : di, j = flip ? G - 1 - dj : dj;
      let node;
      if (i % 2 === 0 && j % 2 === 0) {
        const r = i / 2, c = j / 2, k = `${r},${c}`;
        const pawn = v.pos[0][0] === r && v.pos[0][1] === c ? 0 : v.pos[1][0] === r && v.pos[1][1] === c ? 1 : null;
        const can = legal.has(k);
        const goal = r === 0 ? 'goal0' : r === N - 1 ? 'goal1' : '';
        const moved = last && last.t === 'pawn' && last.r === r && last.c === c;
        const from = last && last.t === 'pawn' && last.from && last.from[0] === r && last.from[1] === c;
        node = h('button', {
          class: `sq ${goal} ${can ? `legal me${ctx.you}` : ''} ${from ? 'from' : ''}`,
          tabindex: can ? 0 : -1,
          'aria-label': `Square ${String.fromCharCode(97 + c)}${N - r}${can ? ' (move here)' : ''}`,
          onclick: can ? () => ctx.send({ t: 'pawn', r, c }) : null,
        }, pawn !== null ? h('span', { class: `pawn p${pawn} ${moved ? 'pop' : ''}` }) : null);
      } else if (i % 2 === 0) {
        const r = i / 2, c = (j - 1) / 2;
        const o = own(vw(v, r, c), vw(v, r - 1, c));
        const w = { r: Math.min(r, W - 1), c, o: 'v' };
        const key = `v:${r}:${c}`;
        const hs = o === null ? wallHandlers(w) : {};
        node = h('div', { class: `gap v ${o !== null ? `wall p${o}` : ''} ${hs.onclick ? 'placeable' : ''} ${lastParts.has(key) ? 'last' : ''}`, ...hs });
        els.set(key, node);
      } else if (j % 2 === 0) {
        const r = (i - 1) / 2, c = j / 2;
        const o = own(hw(v, r, c), hw(v, r, c - 1));
        const w = { r, c: Math.min(c, W - 1), o: 'h' };
        const key = `h:${r}:${c}`;
        const hs = o === null ? wallHandlers(w) : {};
        node = h('div', { class: `gap h ${o !== null ? `wall p${o}` : ''} ${hs.onclick ? 'placeable' : ''} ${lastParts.has(key) ? 'last' : ''}`, ...hs });
        els.set(key, node);
      } else {
        const r = (i - 1) / 2, c = (j - 1) / 2;
        const o = own(hw(v, r, c), vw(v, r, c));
        const key = `x:${r}:${c}`;
        node = h('div', { class: `gap x ${o !== null ? `wall p${o}` : ''} ${lastParts.has(key) ? 'last' : ''}` });
        els.set(key, node);
      }
      board.append(node);
    }
    el.append(board);
    if (pending) show(pending, true);
    if (canWall) el.append(h('p', { class: 'walls-hint' }, 'Hover a gap between squares to preview a wall, click to place it. On touch screens tap twice.'));
  },
};
