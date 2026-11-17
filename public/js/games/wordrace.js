import { h } from '../ui.js';
import { duel } from './duel.js';

export default duel({
  id: 'wordrace',
  name: 'Word Race',
  blurb: 'Unscramble the letters into an English word. Fastest typist wins the round.',
  length: '4 min',
  artBg: '#18162a',
  art: `<svg viewBox="0 0 160 90"><g font-family="ui-sans-serif,system-ui" font-weight="800" font-size="20" text-anchor="middle">
    ${['T', 'R', 'A', 'I', 'N'].map((ch, i) => `<g transform="translate(${28 + i * 26} ${30 + (i % 2 ? 6 : -4)}) rotate(${[-8, 6, -4, 9, -6][i]})"><rect x="-11" y="-11" width="22" height="24" rx="5" fill="#231b30" stroke="#7b86ff" stroke-width="1.5"/><text y="7" fill="#f3eefb">${ch}</text></g>`).join('')}
    ${['T', 'R', 'A', 'I', 'N'].map((ch, i) => `<g transform="translate(${28 + i * 26} 70)"><rect x="-11" y="-11" width="22" height="24" rx="5" fill="#7b86ff"/><text y="7" fill="#0b0e3a">${'RAINT'[i]}</text></g>`).join('')}</g></svg>`,
  rules: [
    'Both players get the same scrambled word.',
    'Type the word and press Enter — any real word using all the letters counts.',
    'Wrong guesses cost nothing but time. After 15 s the first letter is revealed.',
    '8 rounds, most points wins.',
  ],
  placeholder: 'Type the word…',
  prompt: (v) => `Unscramble — ${v.q.len} letters`,
  question: (v) => h('div', { class: 'word-q' },
    h('div', { class: 'tiles' }, [...v.q.letters].map((ch) => h('span', { class: 'tile' }, ch))),
    v.phase === 'question' ? h('p', { class: 'duel-hint', 'data-show-at': v.startedAt + 15000, hidden: true }, `Hint: starts with ${v.q.hint}`) : null,
  ),
});
