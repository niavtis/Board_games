import { h } from '../ui.js';

const STORE = [6, 13];
const base = (p) => (p === 0 ? 0 : 7);

function seeds(n) {
  const shown = Math.min(n, 14);
  return h('div', { class: 'seeds' }, Array.from({ length: shown }, (_, i) => h('i', { style: `--h:${(i * 47) % 360}` })));
}

export default {
  id: 'mancala',
  name: 'Mancala',
  blurb: 'Sow seeds around the board, capture across, and fill your store.',
  length: '10 min',
  sides: ['Red · moves first', 'Blue'],
  swatches: ['var(--p0)', 'var(--p1)'],
  artBg: '#2a2018',
  art: `<svg viewBox="0 0 160 90"><rect x="10" y="16" width="140" height="58" rx="29" fill="#5a3e28" stroke="#7a5638" stroke-width="2"/>
    <rect x="16" y="24" width="18" height="42" rx="9" fill="#3b2818"/><rect x="126" y="24" width="18" height="42" rx="9" fill="#3b2818"/>
    ${[0,1,2,3,4,5].flatMap((c)=>[0,1].map((r)=>`<circle cx="${45+c*14.2}" cy="${34+r*22}" r="6.2" fill="#3b2818"/>`)).join('')}
    ${[[45,34],[59,34],[87,56],[101,56],[115,34],[73,56],[135,40],[135,50],[25,45]].map(([x,y],i)=>`<circle cx="${x+(i%2?1.5:-1.5)}" cy="${y}" r="2.4" fill="${['#ff6b57','#45b0ff','#f5b84b','#3ecf8e'][i%4]}"/>`).join('')}</svg>`,
  rules: [
    'Pick one of your pits and sow its seeds one by one counter-clockwise, into your store too (but never the opponent’s).',
    'Last seed in your store? Take another turn.',
    'Last seed in an empty pit on your side captures it plus the seeds directly opposite.',
    'When a side runs empty, the rest go to their owner’s store. Most seeds wins.',
  ],
  score: (v) => ({ values: v.score, label: 'seeds' }),
  status(v, ctx) {
    if (ctx.myTurn && v.last?.extra && v.last.by === ctx.you) return { text: 'Last seed hit your store — go again!', tone: 'turn' };
    if (!ctx.myTurn && v.last?.extra && v.last.by !== ctx.you) return { text: `${ctx.names[1 - ctx.you]} goes again`, tone: '' };
    return null;
  },
  render(el, v, ctx) {
    const me = ctx.you, op = 1 - me;
    const last = v.last;
    const sown = new Set(last?.sown || []);

    const pit = (i, mine) => {
      const n = v.pits[i];
      const can = mine && ctx.myTurn && n > 0;
      const cls = ['mc-pit', mine ? 'mine' : 'theirs', can ? 'clickable' : ''];
      if (last && last.from === i) cls.push('from');
      if (sown.has(i)) cls.push('sown');
      if (last && last.end === i) cls.push('end');
      return h('button', {
        class: cls.join(' '),
        disabled: !can,
        onclick: can ? () => ctx.send({ pit: i - base(me) }) : null,
        'aria-label': `${mine ? 'Your' : 'Opponent'} pit with ${n} seeds`,
      }, seeds(n), h('b', {}, n));
    };
    const store = (p) => h('div', { class: `mc-store p${p} ${last && last.end === STORE[p] ? 'end' : ''}` },
      seeds(v.pits[STORE[p]]), h('b', {}, v.pits[STORE[p]]), h('small', {}, p === me ? 'you' : (ctx.names[p] || 'them')));

    const top = [5, 4, 3, 2, 1, 0].map((k) => pit(base(op) + k, false));
    const bottom = [0, 1, 2, 3, 4, 5].map((k) => pit(base(me) + k, true));
    el.append(
      h('div', { class: 'mancala' },
        store(op),
        h('div', { class: 'mc-row top' }, top),
        h('div', { class: 'mc-row bottom' }, bottom),
        store(me),
      ),
      last && last.captured ? h('div', { class: 'mc-note' }, `${last.by === me ? 'You' : ctx.names[last.by]} captured ${last.captured} seeds`) : null,
    );
  },
};
