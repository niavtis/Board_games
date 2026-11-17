import { h } from '../ui.js';

const STARS = new Set(['3,3', '3,11', '11,3', '11,11', '7,7']);

export default {
  id: 'gomoku',
  name: 'Gomoku',
  blurb: 'Five in a row on a 15×15 board. Easy to learn, endlessly tactical.',
  length: '10 min',
  sides: ['Black · moves first', 'White'],
  swatches: ['#111', '#f2f2f2'],
  artBg: '#c99e5c',
  art: `<svg viewBox="0 0 160 90"><rect x="35" y="5" width="90" height="80" fill="#dcb67a"/>
    <g stroke="#6b4a22" stroke-width="1">${[0,1,2,3,4,5,6,7].map(i=>`<path d="M${42+i*11} 10v70M40 ${12+i*10}h80"/>`).join('')}</g>
    ${[[1,1,0],[2,2,0],[3,3,0],[4,4,0],[2,4,1],[3,2,1],[4,3,1],[5,5,1]].map(([r,c,p])=>`<circle cx="${42+c*11}" cy="${12+r*10}" r="4.5" fill="${p?'#f5f5f5':'#111'}"/>`).join('')}</svg>`,
  rules: ['Take turns placing a stone on any empty intersection.', 'The first to get five (or more) in an unbroken line wins.', 'Lines count horizontally, vertically and diagonally.'],
  render(el, v, ctx) {
    const n = v.size;
    const win = new Set((v.line || []).map(([r, c]) => `${r},${c}`));
    const grid = h('div', { class: 'grid', style: `--n:${n}` });
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      const x = v.board[r][c];
      const can = ctx.myTurn && x === null;
      const edges = [c === 0 && 'l', c === n - 1 && 'r', r === 0 && 't', r === n - 1 && 'b'].filter(Boolean).join(' ');
      const isLast = v.last && v.last[0] === r && v.last[1] === c;
      grid.append(h('button', { class: `pt ${edges} ${can ? 'clickable' : ''}`, onclick: can ? () => ctx.send({ r, c }) : null, tabindex: -1 },
        STARS.has(`${r},${c}`) && x === null ? h('span', { class: 'star' }) : null,
        x !== null ? h('div', { class: `stone p${x} ${isLast ? 'last pop' : ''} ${win.has(`${r},${c}`) ? 'win' : ''}` }) : can ? h('div', { class: 'ghost', style: ctx.you === 1 ? 'background:#fff' : '' }) : null));
    }
    el.append(h('div', { class: 'gomoku' }, grid));
  },
};
