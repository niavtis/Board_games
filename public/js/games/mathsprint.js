import { h } from '../ui.js';
import { duel } from './duel.js';

export default duel({
  id: 'mathsprint',
  name: 'Math Sprint',
  blurb: 'Mental maths, head to head. Sums get harder every few rounds.',
  length: '3 min',
  artBg: '#1a1528',
  art: `<svg viewBox="0 0 160 90" font-family="ui-sans-serif,system-ui" font-weight="800" text-anchor="middle">
    <text x="80" y="44" font-size="26" fill="#f3eefb">7 × 8 = ?</text>
    <rect x="52" y="56" width="56" height="22" rx="6" fill="none" stroke="#a07aff" stroke-width="2"/><text x="80" y="73" font-size="16" fill="#a07aff">56</text>
    <g fill="#4a3d61" font-size="14"><text x="24" y="24">+</text><text x="140" y="26">÷</text><text x="22" y="76">−</text><text x="138" y="74">%</text></g></svg>`,
  rules: [
    'Both players get the same sum at the same moment.',
    'Type the answer and press Enter. Wrong answers just bounce back.',
    'Rounds 1–3 are warm-up; after that come bigger numbers, times and division.',
    '10 rounds, most points wins.',
  ],
  placeholder: 'Answer…',
  prompt: () => 'Solve it!',
  question: (v) => h('div', { class: 'math-q' }, v.q.text, ' = ?'),
});
