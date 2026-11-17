import { h, eq } from '../ui.js';

const GLYPH = { K: '♚', Q: '♛', R: '♜', B: '♝', N: '♞', P: '♟' };
const VALUE = { P: 1, N: 3, B: 3, R: 5, Q: 9, K: 0 };
const FILES = 'abcdefgh';
const piece = (code) => h('span', { class: `piece ${code[0]}` }, GLYPH[code[1]] + '︎');

let sel = null, promo = null, key = null;

export default {
  id: 'chess',
  name: 'Chess',
  blurb: 'The timeless strategy duel. Full rules: castling, en passant, promotion.',
  length: '20+ min',
  sides: ['White · moves first', 'Black'],
  swatches: ['#f4f1ea', '#1b1b1f'],
  artBg: '#1e1433',
  art: `<svg viewBox="0 0 160 90"><g>${Array.from({ length: 40 }, (_, k) => { const r = Math.floor(k / 8), c = k % 8; return `<rect x="${c * 20}" y="${r * 20 - 5}" width="20" height="20" fill="${(r + c) % 2 ? '#8a6fc4' : '#ece5f8'}"/>`; }).join('')}</g>
    <text x="80" y="66" font-size="64" text-anchor="middle" fill="#1b1b1f" stroke="#ece5f8" stroke-width="1.5" font-family="Apple Symbols, Segoe UI Symbol, DejaVu Sans, serif">♞︎</text></svg>`,
  rules: ['Click one of your pieces to see its legal moves, then click a highlighted square.', 'Checkmate the enemy king to win. Stalemate, repetition, and insufficient material are draws.', 'Pawns reaching the last rank promote — you choose the piece.'],
  render(el, v, ctx) {
    const k = `${ctx.gameKey}:${v.history.length}`;
    if (k !== key) { key = k; sel = null; promo = null; }
    const flip = ctx.you === 1;
    const myColor = ctx.you === 0 ? 'w' : 'b';
    const legal = v.legal || [];
    const targets = sel ? legal.filter((m) => eq(m.from, sel)) : [];
    const movable = new Set(legal.map((m) => `${m.from}`));

    const click = (r, c) => {
      if (!ctx.myTurn) return;
      const hits = targets.filter((m) => eq(m.to, [r, c]));
      if (hits.length) {
        if (hits.some((m) => m.promo)) promo = { from: sel, to: [r, c] };
        else ctx.send({ from: sel, to: [r, c] });
        if (!promo) sel = null;
      } else if (v.board[r][c]?.[0] === myColor && !(sel && eq(sel, [r, c]))) sel = [r, c];
      else sel = null;
      ctx.rerender();
    };

    const board = h('div', { class: 'sq-board chess', style: '--n:8' });
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) {
      const r = flip ? 7 - i : i, c = flip ? 7 - j : j;
      const x = v.board[r][c];
      const t = targets.find((m) => eq(m.to, [r, c]));
      const cls = ['sq', (r + c) % 2 ? 'dark' : 'light'];
      if (v.last && (eq(v.last.from, [r, c]) || eq(v.last.to, [r, c]))) cls.push('lastmove');
      if (sel && eq(sel, [r, c])) cls.push('sel');
      if (v.check && eq(v.check, [r, c])) cls.push('check');
      if (t) cls.push('target', x ? 'capture' : '');
      if (ctx.myTurn && (t || movable.has(`${[r, c]}`))) cls.push('clickable');
      board.append(h('div', { class: cls.join(' '), onclick: () => click(r, c) },
        j === 0 ? h('span', { class: 'coord rank' }, 8 - r) : null,
        i === 7 ? h('span', { class: 'coord file' }, FILES[c]) : null,
        x ? piece(x) : null));
    }

    const wrap = h('div', { class: 'board-wrap' }, board);
    if (promo) {
      wrap.append(h('div', { class: 'overlay', onclick: (e) => { if (e.target === e.currentTarget) { promo = null; ctx.rerender(); } } },
        h('div', { class: 'promo' }, ['Q', 'R', 'B', 'N'].map((p) =>
          h('button', { title: p, onclick: () => { ctx.send({ ...promo, promo: p }); promo = null; sel = null; } }, piece(myColor + p))))));
    }

    // Material captured by each side
    const strip = (co) => {
      const caps = [...v.captured[co]].sort((a, b) => VALUE[b[1]] - VALUE[a[1]]);
      const mine = v.captured[co].reduce((s, p) => s + VALUE[p[1]], 0);
      const theirs = v.captured[co === 'w' ? 'b' : 'w'].reduce((s, p) => s + VALUE[p[1]], 0);
      return h('div', { class: 'captured' }, caps.map(piece), mine > theirs ? h('span', { class: 'adv' }, `+${mine - theirs}`) : null);
    };
    const oppColor = myColor === 'w' ? 'b' : 'w';

    const moves = h('ol', { class: 'movelist' });
    for (let i = 0; i < v.history.length; i += 2) moves.append(h('li', {}, `${v.history[i]}  ${v.history[i + 1] || ''}`));

    el.append(strip(oppColor), wrap, strip(myColor), moves);
    moves.scrollTop = moves.scrollHeight;
  },
};
