import { h } from '../ui.js';

// Point i = 8r + k on ring r (0 outer, 2 inner); k clockwise from top-left. Coordinates on a 0..6 grid.
const POS = Array.from({ length: 24 }, (_, i) => {
  const r = Math.floor(i / 8), k = i % 8, lo = r, hi = 6 - r, mid = 3;
  return [[lo, lo], [mid, lo], [hi, lo], [hi, mid], [hi, hi], [mid, hi], [lo, hi], [lo, mid]][k];
});
const ADJ = Array.from({ length: 24 }, () => []);
for (let r = 0; r < 3; r++) for (let k = 0; k < 8; k++) {
  const a = 8 * r + k, b = 8 * r + ((k + 1) % 8);
  ADJ[a].push(b); ADJ[b].push(a);
  if (k % 2 && r < 2) { ADJ[a].push(a + 8); ADJ[a + 8].push(a); }
}

const pct = (n) => `${(n / 6) * 100}%`;
let sel = null, key = null;

function boardSvg(mills) {
  const P = (n) => 10 + n * 10; // grid 0..6 -> 10..70 in an 80-unit viewBox (12.5% margin)
  const sq = [0, 1, 2].map((r) => `<rect x="${P(r)}" y="${P(r)}" width="${P(6 - r) - P(r)}" height="${P(6 - r) - P(r)}"/>`).join('');
  const cross = `<path d="M${P(3)} ${P(0)}V${P(2)}M${P(3)} ${P(4)}V${P(6)}M${P(0)} ${P(3)}H${P(2)}M${P(4)} ${P(3)}H${P(6)}"/>`;
  const hl = mills.map((m) => {
    const [a, , c] = m.map((i) => POS[i]);
    return `<line class="mill-hl" x1="${P(a[0])}" y1="${P(a[1])}" x2="${P(c[0])}" y2="${P(c[1])}"/>`;
  }).join('');
  return `<svg viewBox="0 0 80 80" aria-hidden="true"><g class="mill-lines">${sq}${cross}</g>${hl}</svg>`;
}

const tray = (n, p, label) => h('div', { class: 'mill-tray' },
  h('span', { class: 'mill-tray-label' }, label),
  h('div', { class: 'mill-tray-pieces' }, Array.from({ length: n }, () => h('i', { class: `mill-piece p${p}` }))),
  h('b', {}, n));

export default {
  id: 'mill',
  name: "Nine Men's Morris",
  blurb: 'Place, slide and fly your nine pieces. Every mill of three takes a piece.',
  length: '15 min',
  sides: ['Green · moves first', 'Violet'],
  swatches: ['var(--p0)', 'var(--p1)'],
  artBg: '#1b2030',
  art: `<svg viewBox="0 0 160 90"><g fill="none" stroke="#3a4256" stroke-width="2.5"><rect x="45" y="5" width="70" height="80"/><rect x="58" y="18" width="44" height="54"/><rect x="70" y="31" width="20" height="28"/><path d="M80 5v26M80 59v26M45 45h25M90 45h25"/></g>
    <path d="M45 5h70" stroke="#f5b84b" stroke-width="3"/>
    ${[[45,5,0],[80,5,0],[115,5,0],[58,45,1],[102,18,1],[90,45,0],[70,59,1],[80,85,1]].map(([x,y,p])=>`<circle cx="${x}" cy="${y}" r="5.5" fill="${p?'#45b0ff':'#ff6b57'}" stroke="#0d0f15" stroke-width="1.5"/>`).join('')}</svg>`,
  rules: [
    'First place your 9 pieces one at a time on any free point.',
    'Then slide a piece along a line to a free neighbouring point. With only 3 left you may fly anywhere.',
    'Line up three (a mill) to remove an opponent piece — pieces in a mill are safe unless nothing else is left.',
    'Win by cutting your opponent to 2 pieces or leaving them no move. 50 moves without a mill is a draw.',
  ],
  score: (v) => ({ values: [0, 1].map((p) => v.hand[p] + v.onBoard[p]), label: 'pieces' }),
  status(v, ctx) {
    const other = ctx.names[1 - ctx.you];
    if (v.pendingRemove) return ctx.myTurn ? { text: 'Mill! Remove one of your opponent’s pieces', tone: 'turn' } : { text: `${other} formed a mill and is taking a piece…`, tone: '' };
    if (!ctx.myTurn) return null;
    if (v.phase === 'place') return { text: `Your turn — place a piece (${v.hand[ctx.you]} in hand)`, tone: 'turn' };
    if (v.flying[ctx.you]) return { text: 'Your turn — you can fly to any free point', tone: 'turn' };
    return { text: 'Your turn — slide a piece', tone: 'turn' };
  },
  render(el, v, ctx) {
    const k = `${ctx.gameKey}:${JSON.stringify(v.last)}:${v.turn}:${v.pendingRemove}`;
    if (k !== key) { key = k; sel = null; }
    const me = ctx.you, op = 1 - me;
    const active = ctx.myTurn;
    const removing = active && v.pendingRemove;
    const placing = active && !v.pendingRemove && v.phase === 'place';
    const moving = active && !v.pendingRemove && v.phase === 'move';
    const movable = new Set(moving ? v.legal.map((m) => m.from) : []);
    if (moving && !sel && movable.size === 1) sel = [...movable][0];
    const targets = new Set(moving && sel !== null ? v.legal.filter((m) => m.from === sel).map((m) => m.to) : []);
    const removable = new Set(removing ? v.removable : []);
    const last = v.last;

    const click = (i) => {
      if (removing && removable.has(i)) return ctx.send({ t: 'remove', i });
      if (placing && v.board[i] === null) return ctx.send({ t: 'place', i });
      if (moving) {
        if (sel !== null && targets.has(i)) return ctx.send({ t: 'move', from: sel, to: i });
        if (movable.has(i)) sel = sel === i ? null : i;
        else sel = null;
        ctx.rerender();
      }
    };

    const points = v.board.map((x, i) => {
      const [cx, cy] = POS[i];
      const cls = ['mill-pt'];
      let can = false;
      if (removing && removable.has(i)) { cls.push('removable'); can = true; }
      if (placing && x === null) { cls.push('target'); can = true; }
      if (moving && movable.has(i)) { cls.push('movable'); can = true; }
      if (moving && targets.has(i)) { cls.push('target'); can = true; }
      if (sel === i) cls.push('sel');
      if (last && last.to === i) cls.push('last');
      if (last && last.from === i) cls.push('from');
      if (last && last.removed === i) cls.push('removed');
      if (can) cls.push('clickable');
      return h('button', {
        class: cls.join(' '),
        style: `left:${pct(cx)};top:${pct(cy)}`,
        disabled: !can,
        onclick: can ? () => click(i) : null,
        'aria-label': `Point ${i + 1}${x === null ? '' : x === me ? ', your piece' : ', opponent piece'}`,
      }, x === null ? null : h('i', { class: `mill-piece p${x}` }));
    });

    if (v.hand[op]) el.append(tray(v.hand[op], op, `${ctx.names[op] || 'Opponent'} · in hand`));
    el.append(h('div', { class: 'mill-board', html: boardSvg(v.mills) }, h('div', { class: 'mill-pts' }, points)));
    if (v.hand[me]) el.append(tray(v.hand[me], me, 'You · in hand'));
  },
};
