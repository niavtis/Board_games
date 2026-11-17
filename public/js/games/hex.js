import { h } from '../ui.js';

const SVG = 'http://www.w3.org/2000/svg';
const S = 10; // hex radius in SVG units
const W = Math.sqrt(3) * S; // hex width
const PAD = S * 1.1;

function s(tag, attrs, ...kids) {
  const el = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs || {})) if (v != null && v !== false) el.setAttribute(k, v);
  kids.forEach((k) => k && el.append(k));
  return el;
}

const center = (r, c) => [PAD + W / 2 + c * W + r * (W / 2), PAD + S + r * 1.5 * S];
// Pointy-top hexagon vertex k (0 = top, clockwise).
const vert = (r, c, k, rad = S) => {
  const [x, y] = center(r, c);
  const a = (Math.PI / 180) * (60 * k - 90);
  return [x + rad * Math.cos(a), y + rad * Math.sin(a)];
};
const pts = (list) => list.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');

function edges(n) {
  const top = [], bottom = [], left = [], right = [];
  for (let i = 0; i < n; i++) {
    top.push(vert(0, i, 5), vert(0, i, 0));
    bottom.push(vert(n - 1, i, 4), vert(n - 1, i, 3));
    left.push(vert(i, 0, 5), vert(i, 0, 4));
    right.push(vert(i, n - 1, 0), vert(i, n - 1, 1));
  }
  top.push(vert(0, n - 1, 1));
  bottom.push(vert(n - 1, n - 1, 2));
  left.push(vert(n - 1, 0, 3));
  right.push(vert(n - 1, n - 1, 2));
  return { top, bottom, left, right };
}

const hexArt = (() => {
  const cells = [];
  const red = new Set(['0,2', '1,2', '2,1', '3,1']), blue = new Set(['1,3', '2,2', '2,3', '3,4']);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) {
    const x = 38 + c * 14 + r * 7, y = 18 + r * 12.2;
    const k = `${r},${c}`;
    const fill = red.has(k) ? '#ff6b57' : blue.has(k) ? '#45b0ff' : '#2a3040';
    const p = [0, 1, 2, 3, 4, 5].map((i) => { const a = (Math.PI / 180) * (60 * i - 90); return `${(x + 7.4 * Math.cos(a)).toFixed(1)},${(y + 7.4 * Math.sin(a)).toFixed(1)}`; }).join(' ');
    cells.push(`<polygon points="${p}" fill="${fill}"/>`);
  }
  return `<svg viewBox="0 0 160 90"><path d="M30 8h86" stroke="#ff6b57" stroke-width="3" stroke-linecap="round"/><path d="M52 84h86" stroke="#ff6b57" stroke-width="3" stroke-linecap="round"/>
    <path d="M30 10L52 82" stroke="#45b0ff" stroke-width="3" stroke-linecap="round"/><path d="M116 10L138 82" stroke="#45b0ff" stroke-width="3" stroke-linecap="round"/>${cells.join('')}</svg>`;
})();

export default {
  id: 'hex',
  name: 'Hex',
  blurb: 'Build an unbroken chain between your two sides. Someone always wins — no draws.',
  length: '10 min',
  sides: ['Red · top ↔ bottom · moves first', 'Blue · left ↔ right'],
  swatches: ['var(--p0)', 'var(--p1)'],
  artBg: '#1b2030',
  art: hexArt,
  rules: [
    'Take turns placing a stone on any empty hexagon.',
    'Red links the top and bottom edges, Blue links the left and right edges.',
    'Pie rule: on Blue’s first turn, Blue may swap and take over Red’s opening stone.',
    'The board can never end in a draw — someone always connects.',
  ],
  status(v, ctx) {
    if (v.canSwap && ctx.myTurn) return { text: 'Your turn — place a stone or swap', tone: 'turn' };
    return null;
  },
  render(el, v, ctx) {
    const n = v.size;
    const path = new Set((v.path || []).map(([r, c]) => `${r},${c}`));
    const [maxX] = vert(n - 1, n - 1, 1);
    const [, maxY] = vert(n - 1, n - 1, 3);
    const svg = s('svg', { class: 'hex-board', viewBox: `0 0 ${(maxX + PAD).toFixed(1)} ${(maxY + PAD).toFixed(1)}`, role: 'grid' });
    const e = edges(n);
    for (const [side, list] of Object.entries(e)) {
      svg.append(s('polyline', { class: `hex-edge ${side === 'top' || side === 'bottom' ? 'p0' : 'p1'}`, points: pts(list) }));
    }
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      const x = v.board[r][c];
      const can = ctx.myTurn && x === null;
      const isLast = v.last && v.last[0] === r && v.last[1] === c;
      const g = s('g', {
        class: `hex-cell ${x !== null ? `p${x}` : ''} ${can ? `clickable me${ctx.you}` : ''} ${isLast ? 'last' : ''} ${path.has(`${r},${c}`) ? 'win' : ''}`,
        tabindex: can ? 0 : null,
        'aria-label': `Cell ${String.fromCharCode(65 + c)}${r + 1}`,
      },
      s('polygon', { points: pts([0, 1, 2, 3, 4, 5].map((k) => vert(r, c, k, S * 0.93))) }),
      isLast ? s('circle', { class: 'hex-dot', cx: center(r, c)[0], cy: center(r, c)[1], r: S * 0.22 }) : null);
      if (can) {
        g.addEventListener('click', () => ctx.send({ r, c }));
        g.addEventListener('keydown', (ev) => (ev.key === 'Enter' || ev.key === ' ') && (ev.preventDefault(), ctx.send({ r, c })));
      }
      svg.append(g);
    }
    el.append(h('div', { class: 'hex' }, svg));
    if (v.canSwap && ctx.myTurn) {
      el.append(h('button', { class: 'btn', onclick: () => ctx.send({ swap: true }) }, 'Swap — take Red’s opening stone'));
    } else if (v.swapped && v.moves === 2) {
      el.append(h('p', { class: 'hex-note' }, `${ctx.names[1] || 'Blue'} used the swap rule`));
    }
  },
};
