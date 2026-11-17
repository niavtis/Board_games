import { h } from '../ui.js';

let seenKey = null;

export default {
  id: 'reversi',
  name: 'Reversi',
  blurb: 'Outflank and flip your opponent’s discs. The board can turn in a single move.',
  length: '15 min',
  sides: ['Black · moves first', 'White'],
  swatches: ['#111', '#f2f2f2'],
  artBg: '#1e6b45',
  art: `<svg viewBox="0 0 160 90"><rect x="44" y="9" width="72" height="72" rx="4" fill="#2a8a5a"/>
    <g stroke="#1e6b45" stroke-width="1.5">${[1,2,3,4,5].map(i=>`<path d="M${44+i*12} 9v72M44 ${9+i*12}h72"/>`).join('')}</g>
    ${[[2,2,0],[2,3,1],[3,2,1],[3,3,0],[1,3,0],[3,1,1],[4,3,0]].map(([r,c,p])=>`<circle cx="${50+c*12}" cy="${15+r*12}" r="4.6" fill="${p?'#f2f2f2':'#111'}"/>`).join('')}</svg>`,
  rules: ['Place a disc so that it traps a straight line of your opponent’s discs between two of yours.', 'All trapped discs flip to your color.', 'No legal move? Your turn is skipped. The most discs at the end wins.'],
  score: (v) => ({ values: v.counts, label: 'discs' }),
  status(v, ctx) {
    if (v.passed !== null && v.passed !== undefined) {
      const who = v.passed === ctx.you ? 'You have' : `${ctx.names[v.passed]} has`;
      return { text: `${who} no legal move — ${ctx.myTurn ? 'your turn again' : `${ctx.names[v.turn]} plays again`}`, tone: ctx.myTurn ? 'turn' : '' };
    }
    return null;
  },
  render(el, v, ctx) {
    const legal = new Set((v.legal || []).map(([r, c]) => `${r},${c}`));
    const flipped = new Set((v.flipped || []).map(([r, c]) => `${r},${c}`));
    const key = `${ctx.gameKey}:${v.last}`;
    const animate = key !== seenKey;
    seenKey = key;
    const board = h('div', { class: 'sq-board reversi', style: '--n:8' });
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
      const x = v.board[r][c], k = `${r},${c}`;
      const can = ctx.myTurn && legal.has(k);
      const isLast = v.last && v.last[0] === r && v.last[1] === c;
      board.append(h('button', { class: `sq ${can ? 'clickable' : ''} ${isLast ? 'lastmove' : ''}`, onclick: can ? () => ctx.send({ r, c }) : null, tabindex: can ? 0 : -1 },
        x !== null ? h('div', { class: `disc p${x} ${animate && (flipped.has(k) || isLast) ? (isLast ? 'pop' : 'flip') : ''}` }) : can ? h('div', { class: 'hintdot' }) : null));
    }
    el.append(board);
  },
};
