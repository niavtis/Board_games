import { h } from '../ui.js';

// Shared UI for real-time duels (Flag Duel, Word Race, …).
// A spec supplies the card info and `question(v, ctx)`; this module draws the round header,
// the timer, the answer controls for the duel's mode (choice / text / tap) and the reveal.

let current = null; // { v, ctx } of the latest render, for keyboard shortcuts
let clock = () => Date.now();
let textInput = null; // kept across re-renders so typing isn't lost when chat updates arrive
let textKey = null;

// One ticker drives every countdown on screen.
setInterval(() => {
  const now = clock();
  for (const el of document.querySelectorAll('[data-until]')) {
    const left = Math.max(0, +el.dataset.until - now);
    if (el.dataset.total) el.style.setProperty('--left', String(left / +el.dataset.total));
    else el.textContent = Math.ceil(left / 1000) || '';
  }
  for (const el of document.querySelectorAll('[data-show-at]')) el.hidden = now < +el.dataset.showAt;
}, 100);

function typing() {
  const a = document.activeElement;
  return a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA') && a !== textInput;
}

document.addEventListener('keydown', (e) => {
  if (!current || !document.querySelector('.duel') || typing() || e.metaKey || e.ctrlKey || e.altKey) return;
  const { v, ctx } = current;
  if (v.over || v.phase !== 'question') return;
  if (v.mode === 'tap' && (e.code === 'Space' || e.code === 'Enter')) {
    e.preventDefault();
    if (!e.repeat) ctx.send({});
  } else if (v.mode === 'choice' && /^[1-4]$/.test(e.key) && !v.locked[ctx.you]) {
    ctx.send({ a: +e.key - 1 });
  }
});

function header(v, ctx) {
  const dots = Array.from({ length: v.rounds }, (_, i) => {
    const r = v.results[i];
    return h('span', { class: `rd ${r === undefined ? '' : r === null ? 'none' : `p${r}`} ${i === v.round - 1 && !v.over ? 'now' : ''}` });
  });
  return h('div', { class: 'duel-head' },
    h('span', { class: 'duel-round' }, v.phase === 'countdown' ? 'Get ready' : `Round ${v.round} / ${v.rounds}`),
    h('span', { class: 'duel-dots', 'aria-hidden': 'true' }, dots),
  );
}

function timerBar(v) {
  if (v.over || !v.deadline || v.phase === 'countdown') return h('div', { class: 'duel-timer idle' });
  const total = v.phase === 'reveal' ? 2800 : v.limit;
  return h('div', { class: `duel-timer ${v.phase}` }, h('i', { 'data-until': v.deadline, 'data-total': total, style: `--left:${Math.max(0, (v.deadline - clock()) / total)}` }));
}

function revealBanner(v, ctx) {
  if (v.phase !== 'reveal') return null;
  const you = ctx.you, w = v.roundWinner, opp = ctx.names[1 - you];
  const secs = v.ms != null ? (v.mode === 'tap' ? `${v.ms} ms` : `${(v.ms / 1000).toFixed(1)} s`) : null;
  let text;
  if (v.note === 'false start') text = w === you ? `${opp} jumped the gun — point to you` : 'False start! Point to your opponent';
  else if (w === null) text = v.note === 'both missed' ? 'Both missed this one' : 'Time’s up — nobody scored';
  else text = w === you ? `You got it${secs ? ` in ${secs}` : ''}!` : `${opp} was faster${secs ? ` (${secs})` : ''}`;
  return h('div', { class: `duel-reveal ${w === null ? '' : w === you ? 'win' : 'lose'}` },
    h('b', {}, text),
    v.answer?.text ? h('span', {}, 'Answer: ', h('strong', {}, v.answer.text)) : null,
  );
}

function choiceButtons(v, ctx) {
  const reveal = v.phase === 'reveal' || v.over;
  const correct = v.answer?.correct;
  const mine = v.picks[ctx.you], locked = v.locked[ctx.you];
  return h('div', { class: 'duel-choices' },
    v.q.options.map((opt, i) => {
      const cls = ['choice'];
      if (reveal && i === correct) cls.push('right');
      else if (i === mine) cls.push('wrong');
      const who = [0, 1].filter((p) => v.picks[p] === i);
      return h('button', {
        class: cls.join(' '),
        disabled: reveal || locked || v.phase !== 'question',
        onclick: () => ctx.send({ a: i }),
      },
      h('kbd', {}, i + 1), h('span', { class: 'opt' }, opt),
      who.map((p) => h('span', { class: `picker p${p}`, title: ctx.names[p] }, (ctx.names[p] || '?')[0].toUpperCase())));
    }),
    locked && !reveal ? h('p', { class: 'duel-note' }, 'Wrong — you are out for this round. Waiting…') : null,
  );
}

function textBox(v, ctx, placeholder) {
  const key = `${ctx.gameKey}:${v.round}`;
  if (textKey !== key || !textInput) {
    textKey = key;
    textInput = h('input', { class: 'duel-input', placeholder, autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', inputmode: v.id === 'mathsprint' ? 'numeric' : 'text' });
  }
  const input = textInput;
  input.disabled = v.phase !== 'question' || v.over;
  const form = h('form', {
    class: 'duel-form',
    onsubmit: (e) => {
      e.preventDefault();
      const a = input.value.trim();
      if (!a) return;
      ctx.send({ a }, (res) => {
        if (!res?.error) return;
        input.classList.remove('shake');
        void input.offsetWidth;
        input.classList.add('shake');
        input.select();
      });
    },
  }, input, h('button', { class: 'btn primary', type: 'submit', disabled: input.disabled }, 'Enter'));
  if (!input.disabled && !typing()) queueMicrotask(() => input.focus({ preventScroll: true }));
  return form;
}

function tapPad(v, ctx) {
  const armed = v.phase === 'question' && v.q.armed;
  const waiting = v.phase === 'question' && !v.q.armed;
  const label = armed ? 'TAP!' : waiting ? 'Wait for green…' : v.phase === 'countdown' ? 'Get ready' : '—';
  return h('button', {
    class: `tap-pad ${armed ? 'go' : waiting ? 'wait' : 'idle'}`,
    disabled: v.phase !== 'question' || v.over,
    onpointerdown: (e) => {
      e.preventDefault();
      ctx.send({});
    },
  }, h('span', {}, label), h('small', {}, armed ? 'or press Space' : waiting ? 'Tapping early gives your opponent the point' : ''));
}

export function duel(spec) {
  return {
    category: 'duel',
    sides: ['Green', 'Violet'],
    swatches: ['var(--p0)', 'var(--p1)'],
    simultaneous: () => true,
    score: (v) => ({ values: v.score, label: 'pts' }),
    status(v, ctx) {
      if (v.phase === 'countdown') return { text: 'Get ready…', tone: 'turn' };
      if (v.phase === 'reveal') {
        const w = v.roundWinner;
        if (w === null) return { text: 'Nobody scored this round', tone: '' };
        return w === ctx.you ? { text: 'Point to you!', tone: 'win' } : { text: `Point to ${ctx.names[w]}`, tone: 'lose' };
      }
      if (v.mode === 'tap') return v.q.armed ? { text: 'GO!', tone: 'win' } : { text: 'Wait for it…', tone: 'turn' };
      if (v.locked?.[ctx.you]) return { text: `Missed — waiting for ${ctx.names[1 - ctx.you]}…`, tone: 'lose' };
      return { text: spec.prompt?.(v) || 'Be the first to answer!', tone: 'turn' };
    },
    ...spec,
    render(el, v, ctx) {
      clock = ctx.clock || clock;
      current = { v, ctx };
      const box = h('div', { class: `duel duel-${spec.id}` }, header(v, ctx), timerBar(v));
      if (v.phase === 'countdown') {
        box.append(h('div', { class: 'duel-count' }, h('span', { 'data-until': v.deadline }, Math.ceil((v.deadline - clock()) / 1000))));
      } else if (v.q) {
        if (spec.question) box.append(h('div', { class: 'duel-q' }, spec.question(v, ctx)));
        if (v.mode === 'choice') box.append(choiceButtons(v, ctx));
        else if (v.mode === 'text') box.append(textBox(v, ctx, spec.placeholder || 'Type your answer'));
        else box.append(tapPad(v, ctx));
      }
      const rv = revealBanner(v, ctx);
      if (rv) box.append(rv);
      el.append(box);
    },
  };
}
