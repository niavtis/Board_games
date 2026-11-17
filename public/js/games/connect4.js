import { h } from '../ui.js';

export default {
  id: 'connect4',
  name: 'Connect Four',
  blurb: 'Drop discs into the columns and connect four before your rival does.',
  length: '5 min',
  sides: ['Green · moves first', 'Violet'],
  swatches: ['#3ddc84', '#a07aff'],
  artBg: '#0f3b4d',
  art: `<svg viewBox="0 0 160 90"><rect x="30" y="10" width="100" height="74" rx="8" fill="#1c6f8c"/>
    ${Array.from({ length: 30 }, (_, k) => { const c = k % 6, r = Math.floor(k / 6); const fill = [[4,1],[4,2],[3,2],[4,3],[3,3],[2,3],[4,4],[3,4],[1,4],[0,4],[2,4]].some(([a,b])=>a===r&&b===c) ? ((r+c)%2? '#a07aff':'#3ddc84') : '#0d0f15'; return `<circle cx="${44 + c * 14.4}" cy="${21 + r * 14}" r="5.4" fill="${fill}"/>`; }).join('')}</svg>`,
  rules: ['Click a column to drop a disc; it falls to the lowest empty slot.', 'Connect four in a row — horizontally, vertically or diagonally.', 'A full board without a line is a draw.'],
  render(el, v, ctx) {
    const win = new Set((v.line || []).map(([r, c]) => `${r},${c}`));
    const board = h('div', { class: 'c4' });
    for (let c = 0; c < 7; c++) {
      const playable = ctx.myTurn && v.board[0][c] === null;
      const col = h('div', { class: `c4-col ${playable ? 'playable' : ''}`, onclick: playable ? () => ctx.send({ c }) : null });
      for (let r = 0; r < 6; r++) {
        const x = v.board[r][c];
        const last = v.last && v.last[0] === r && v.last[1] === c;
        col.append(h('div', { class: 'c4-cell' },
          x === null ? null : h('div', { class: `disc p${x} ${last ? 'drop' : ''} ${win.has(`${r},${c}`) ? 'win' : ''}`, style: `--r:${r + 1}` })));
      }
      board.append(col);
    }
    el.append(board);
  },
};
