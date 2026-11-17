import { h } from '../ui.js';

export default {
  id: 'dotsboxes',
  name: 'Dots & Boxes',
  blurb: 'Draw lines between dots. Close a box to claim it — and go again.',
  length: '8 min',
  sides: ['Red · moves first', 'Blue'],
  swatches: ['var(--p0)', 'var(--p1)'],
  artBg: '#1b2030',
  art: `<svg viewBox="0 0 160 90"><rect x="58" y="22" width="22" height="22" fill="rgba(255,107,87,.25)"/><rect x="80" y="44" width="22" height="22" fill="rgba(69,176,255,.25)"/>
    <g stroke-width="3.5" stroke-linecap="round"><path stroke="#ff6b57" d="M58 22h22M58 22v22M80 22v22M58 44h22M36 66h22"/><path stroke="#45b0ff" d="M80 44h22M80 66h22M102 44v22M80 44v22M124 22v22"/></g>
    <g fill="#ecEFf5">${[0,1,2,3,4].flatMap(r=>[0,1,2,3,4].map(c=>`<circle cx="${36+c*22}" cy="${0+r*22}" r="2.6"/>`)).join('')}</g></svg>`,
  rules: ['On your turn, draw one line between two neighbouring dots.', 'Complete the 4th side of a box to claim it — then you must move again.', 'When all boxes are claimed, the player with the most wins.'],
  score: (v) => ({ values: v.score, label: 'boxes' }),
  render(el, v, ctx) {
    const n = v.n, dot = '12px';
    const tmpl = Array.from({ length: 2 * n + 1 }, (_, i) => (i % 2 ? '1fr' : dot)).join(' ');
    const board = h('div', { class: 'dots', style: `grid-template-columns:${tmpl};grid-template-rows:${tmpl}` });
    const isLast = (t, r, c) => v.last && v.last.t === t && v.last.r === r && v.last.c === c;
    for (let i = 0; i <= 2 * n; i++) for (let j = 0; j <= 2 * n; j++) {
      if (i % 2 === 0 && j % 2 === 0) board.append(h('div', { class: 'dot' }));
      else if (i % 2 === 0 || j % 2 === 0) {
        const t = i % 2 === 0 ? 'h' : 'v';
        const r = t === 'h' ? i / 2 : (i - 1) / 2;
        const c = t === 'h' ? (j - 1) / 2 : j / 2;
        const owner = v[t][r][c];
        const can = ctx.myTurn && owner === null;
        board.append(h('button', {
          class: `ln ${t} ${owner !== null ? `p${owner}` : ''} ${can ? 'clickable' : ''} ${isLast(t, r, c) ? 'last' : ''}`,
          onclick: can ? () => ctx.send({ t, r, c }) : null,
          'aria-label': `${t === 'h' ? 'Horizontal' : 'Vertical'} line ${r + 1},${c + 1}`,
          tabindex: can ? 0 : -1,
        }));
      } else {
        const owner = v.boxes[(i - 1) / 2][(j - 1) / 2];
        board.append(h('div', { class: `box ${owner !== null ? `p${owner}` : ''}` }, owner !== null ? (ctx.names[owner] || '?')[0].toUpperCase() : ''));
      }
    }
    el.append(board);
  },
};
