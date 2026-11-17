import { h } from '../ui.js';
import { duel } from './duel.js';

export default duel({
  id: 'flags',
  name: 'Flag Duel',
  blurb: 'A flag flashes up — name the country before your opponent does.',
  length: '3 min',
  artBg: '#141a2a',
  art: `<svg viewBox="0 0 160 90"><g transform="rotate(-6 52 45)"><rect x="22" y="22" width="60" height="40" rx="3" fill="#9E3039"/><rect x="22" y="38" width="60" height="8" fill="#fff"/></g>
    <g transform="rotate(5 108 46)"><rect x="78" y="26" width="60" height="40" rx="3" fill="#006AA7"/><rect x="95" y="26" width="8" height="40" fill="#FECC00"/><rect x="78" y="42" width="60" height="8" fill="#FECC00"/></g>
    <circle cx="128" cy="22" r="11" fill="#43e08a"/><path d="M123 22l4 4 7-8" fill="none" stroke="#04210f" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  rules: [
    'Both players see the same flag at the same moment.',
    'Click the country (or press 1–4). First correct answer takes the point.',
    'A wrong pick locks you out of that round — so don’t guess blindly.',
    '10 rounds, most points wins.',
  ],
  prompt: () => 'Which country is this?',
  question: (v) => h('div', { class: 'flag-frame', html: v.q.flag }),
});
