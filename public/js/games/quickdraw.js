import { duel } from './duel.js';

export default duel({
  id: 'quickdraw',
  name: 'Quick Draw',
  blurb: 'Pure reflexes. Wait for green, then tap — but jump early and you hand over the point.',
  length: '1 min',
  artBg: '#1c1426',
  art: `<svg viewBox="0 0 160 90"><circle cx="58" cy="45" r="26" fill="#3a1f3a"/><circle cx="58" cy="45" r="18" fill="#ff5c8a" opacity=".85"/>
    <circle cx="104" cy="45" r="26" fill="#123826"/><circle cx="104" cy="45" r="18" fill="#43e08a"/>
    <path d="M100 52l8-16M96 40l10 4" stroke="#04210f" stroke-width="3" stroke-linecap="round"/>
    <g stroke="#e06cdc" stroke-width="2.5" stroke-linecap="round"><path d="M136 30l8-6M138 45h10M136 60l8 6"/></g></svg>`,
  rules: [
    'Each round the pad turns red. Wait…',
    'When it turns green, tap it (or press Space) as fast as you can.',
    'Tap while it is still red and your opponent gets the point.',
    '7 rounds, most points wins.',
  ],
});
