import { h, eq } from '../ui.js';

let sel = null, key = null;

export default {
  id: 'checkers',
  name: 'Checkers',
  blurb: 'Jump, chain captures and crown your kings. Captures are mandatory.',
  length: '15 min',
  sides: ['Green · moves first', 'White'],
  swatches: ['#2fbf6e', '#ece6f5'],
  artBg: '#24193a',
  art: `<svg viewBox="0 0 160 90"><g>${Array.from({ length: 40 }, (_, k) => { const r = Math.floor(k / 8), c = k % 8; return `<rect x="${c * 20}" y="${r * 20 - 5}" width="20" height="20" fill="${(r + c) % 2 ? '#3f2f5c' : '#ece6f5'}"/>`; }).join('')}</g>
    ${[[0,1,1],[0,5,1],[1,2,1],[1,6,1],[3,2,0],[3,4,0],[2,5,0],[3,0,0]].map(([r,c,p])=>`<circle cx="${c*20+10}" cy="${r*20+5}" r="7.5" fill="${p?'#ece6f5':'#2fbf6e'}" stroke="${p?'#9d8fbd':'#7cf0ae'}" stroke-width="1.5"/>`).join('')}</svg>`,
  rules: ['Pieces move diagonally forward on dark squares; kings move both ways.', 'Captures are mandatory, and a capturing piece must keep jumping if it can.', 'Reach the far row to crown a king. Win by leaving your opponent with no moves.'],
  score: (v) => ({ values: v.pieces, label: 'pieces' }),
  status(v, ctx) {
    if (v.chain && ctx.myTurn) return { text: 'Keep jumping!', tone: 'turn' };
    return null;
  },
  render(el, v, ctx) {
    const k = `${ctx.gameKey}:${JSON.stringify(v.last)}:${v.turn}`;
    if (k !== key) { key = k; sel = v.chain && ctx.myTurn ? v.chain : null; }
    const flip = ctx.you === 1;
    const legal = v.legal || [];
    const movable = new Set(legal.map((m) => `${m.from}`));
    if (!sel && movable.size === 1 && ctx.myTurn) sel = legal[0].from;
    const targets = sel ? legal.filter((m) => eq(m.from, sel)) : [];

    const click = (r, c) => {
      if (!ctx.myTurn) return;
      const hit = targets.find((m) => eq(m.to, [r, c]));
      if (hit) { ctx.send({ from: sel, to: [r, c] }); return; }
      if (movable.has(`${[r, c]}`) && !v.chain) sel = sel && eq(sel, [r, c]) ? null : [r, c];
      ctx.rerender();
    };

    const board = h('div', { class: 'sq-board checkers', style: '--n:8' });
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) {
      const r = flip ? 7 - i : i, c = flip ? 7 - j : j;
      const x = v.board[r][c];
      const isTarget = targets.some((m) => eq(m.to, [r, c]));
      const cls = ['sq', (r + c) % 2 ? 'dark' : 'light'];
      if (v.last && (eq(v.last.from, [r, c]) || eq(v.last.to, [r, c]))) cls.push('lastmove');
      if (sel && eq(sel, [r, c])) cls.push('sel');
      if (isTarget) cls.push('target', 'clickable');
      if (ctx.myTurn && movable.has(`${[r, c]}`)) cls.push('clickable', sel ? '' : 'movable');
      board.append(h('div', { class: cls.join(' '), onclick: () => click(r, c) },
        x ? h('div', { class: `checker p${x.p}` }, x.k ? h('span', { class: 'crown' }, '♛︎') : null) : null));
    }
    el.append(board);
  },
};
