import { h } from '../ui.js';
import { duel } from './duel.js';

export default duel({
  id: 'capitals',
  name: 'Capital Clash',
  blurb: 'Name the capital city faster than your rival. Riga? Easy. Naypyidaw?',
  length: '3 min',
  artBg: '#161a2a',
  art: `<svg viewBox="0 0 160 90"><g fill="#2a2240"><rect x="30" y="50" width="14" height="26"/><rect x="48" y="34" width="16" height="42"/><rect x="68" y="44" width="12" height="32"/><rect x="96" y="40" width="14" height="36"/><rect x="114" y="54" width="18" height="22"/></g>
    <path d="M84 76V28l4-12 4 12v48z" fill="#3a2f56"/><path d="M88 6c-6 0-10 4.5-10 10 0 7.5 10 18 10 18s10-10.5 10-18c0-5.5-4-10-10-10z" fill="#38bdf8"/><circle cx="88" cy="16" r="3.6" fill="#0f0b16"/>
    <path d="M20 76h120" stroke="#4a3d61" stroke-width="2"/></svg>`,
  rules: [
    'A country appears — pick its capital from four options (keys 1–4 work too).',
    'First correct answer takes the point; a wrong pick locks you out of the round.',
    '10 rounds, most points wins.',
  ],
  prompt: () => 'What is the capital?',
  question: (v) => h('div', { class: 'cap-q' },
    v.q.flag ? h('div', { class: 'flag-frame small', html: v.q.flag }) : null,
    h('div', {}, h('small', {}, 'Capital of'), h('b', {}, v.q.country)),
  ),
});
