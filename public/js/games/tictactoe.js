import { h } from '../ui.js';

const X = '<svg viewBox="0 0 100 100"><path d="M24 24L76 76M76 24L24 76"/></svg>';
const O = '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="28"/></svg>';

export default {
  id: 'tictactoe',
  name: 'Tic Tac Toe',
  blurb: 'Three in a row wins. Fast, classic, and trickier than it looks.',
  length: '1 min',
  sides: ['X · moves first', 'O'],
  swatches: ['var(--p0)', 'var(--p1)'],
  artBg: '#1b2030',
  art: `<svg viewBox="0 0 160 90"><g stroke="#3a4256" stroke-width="3" stroke-linecap="round"><path d="M68 20v50M92 20v50M50 38h60M50 54h60"/></g>
    <g fill="none" stroke-width="5" stroke-linecap="round"><path stroke="#ff6b57" d="M54 22l9 9M63 22l-9 9M78 40l8 8M86 40l-8 8M98 58l8 8M106 58l-8 8"/><circle stroke="#45b0ff" cx="102" cy="28" r="6"/><circle stroke="#45b0ff" cx="58" cy="62" r="6"/></g>
    <path d="M52 20L108 70" stroke="#f5b84b" stroke-width="2" opacity=".0"/></svg>`,
  rules: ['Take turns placing your mark in an empty square.', 'First to line up three — row, column or diagonal — wins.', 'Full board with no line is a draw.'],
  render(el, v, ctx) {
    const win = new Set(v.line || []);
    el.append(
      h('div', { class: 'ttt' },
        v.board.map((x, i) =>
          h('button', {
            class: `ttt-cell ${win.has(i) ? 'win' : ''} ${v.last === i ? 'last' : ''}`,
            disabled: !(ctx.myTurn && x === null),
            'aria-label': `Square ${i + 1}`,
            onclick: () => ctx.send({ i }),
          }, x === null ? null : h('span', { class: `mark p${x}`, html: x === 0 ? X : O })),
        ),
      ),
    );
  },
};
