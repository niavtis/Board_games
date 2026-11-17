// Shared engine for real-time "who is faster" duels.
// Both players see the same question at once; the first correct answer scores the round.
// Phases: countdown → question → reveal → question … → over. The server calls wake()
// at state.wakeAt to move between phases (see scheduleWake in server.js).
const { int } = require('./util');

const COUNTDOWN = 3000;
const REVEAL = 2800;

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Builds a 4-option multiple-choice question: correct answer + 3 distinct distractors.
function choices(correct, pool) {
  const wrong = shuffle(pool.filter((x) => x !== correct)).slice(0, 3);
  const options = shuffle([correct, ...wrong]);
  return { options, correct: options.indexOf(correct) };
}

/**
 * cfg:
 *   id, name, rounds, limit (ms per question)
 *   mode: 'choice' (4 options, a wrong pick locks you out of the round)
 *         'text'   (type the answer, wrong guesses just bounce)
 *         'tap'    (wait for the signal, then tap first; tapping early gives the point away)
 *   ask(s)               -> { q: public question, secret }
 *   check(secret, answer) -> true/false            (text mode)
 *   reveal(secret)       -> public answer shown after the round
 */
function makeDuel(cfg) {
  function finish(s) {
    const [a, b] = s.score;
    Object.assign(s, { over: true, winner: a === b ? 'draw' : a > b ? 0 : 1, reason: `${a}–${b}`, wakeAt: null, deadline: null });
  }

  function decided(s) {
    const left = s.rounds - s.round;
    return left === 0 || Math.abs(s.score[0] - s.score[1]) > left;
  }

  function nextQuestion(s, now) {
    s.round++;
    const { q, secret } = cfg.ask(s);
    Object.assign(s, { phase: 'question', q, secret, answer: null, locked: [false, false], picks: [null, null], roundWinner: null, note: null, ms: null, startedAt: now });
    if (cfg.mode === 'tap') {
      s.q.armed = false;
      s.wakeAt = now + 1500 + Math.floor(Math.random() * 3500); // random wait before "GO"
      s.deadline = null;
    } else {
      s.deadline = s.wakeAt = now + cfg.limit;
    }
  }

  function resolve(s, winner, now, note = null) {
    Object.assign(s, { phase: 'reveal', roundWinner: winner, note, answer: cfg.reveal ? cfg.reveal(s.secret, s) : null });
    if (winner !== null) {
      s.score[winner]++;
      s.ms = now - s.startedAt;
    }
    s.results.push(winner);
    s.last = { round: s.round, winner };
    if (decided(s)) return finish(s);
    s.deadline = s.wakeAt = now + REVEAL;
  }

  return {
    id: cfg.id,
    name: cfg.name,
    realtime: true,
    init: (now = Date.now()) => ({
      phase: 'countdown', round: 0, rounds: cfg.rounds, limit: cfg.limit, mode: cfg.mode,
      score: [0, 0], results: [], q: null, secret: null, answer: null,
      locked: [false, false], picks: [null, null], roundWinner: null, note: null, ms: null,
      used: [], startedAt: now, deadline: now + COUNTDOWN, wakeAt: now + COUNTDOWN,
      turn: -1, over: false, winner: null, reason: null, last: null,
    }),

    wake(s, now) {
      if (s.over || !s.wakeAt || now < s.wakeAt - 20) return;
      if (s.phase === 'countdown' || s.phase === 'reveal') return nextQuestion(s, now);
      if (cfg.mode === 'tap' && !s.q.armed) {
        s.q.armed = true;
        s.startedAt = now;
        s.deadline = s.wakeAt = now + cfg.limit;
        return;
      }
      resolve(s, null, now, 'time’s up');
    },

    move(s, p, m) {
      if (s.over) return 'The game is over';
      if (s.phase !== 'question') return 'Wait for the next question';
      const now = Date.now();

      if (cfg.mode === 'tap') {
        if (!s.q.armed) return resolve(s, 1 - p, now, 'false start'), null;
        return resolve(s, p, now), null;
      }

      if (cfg.mode === 'choice') {
        const a = int(m.a, 0, s.q.options.length - 1);
        if (a === null) return 'Pick one of the answers';
        if (s.locked[p]) return 'You already answered this one';
        s.picks[p] = a;
        if (a === s.secret.correct) return resolve(s, p, now), null;
        s.locked[p] = true;
        if (s.locked[0] && s.locked[1]) resolve(s, null, now, 'both missed');
        return null;
      }

      const guess = String(m.a ?? '').trim().slice(0, 40);
      if (!guess) return 'Type an answer';
      if (cfg.check(s.secret, guess, s)) return resolve(s, p, now), null;
      return 'wrong';
    },

    // Hide the answer while the question is live; hide the opponent's pick until the reveal.
    view(s, p) {
      const { secret, used, ...pub } = s;
      if (s.phase === 'question') pub.picks = s.picks.map((x, i) => (i === p ? x : null));
      return pub;
    },
  };
}

// Picks an item not used yet this game (resets when the pool runs out).
function fresh(s, pool) {
  let left = pool.filter((x) => !s.used.includes(x));
  if (!left.length) {
    s.used = [];
    left = pool;
  }
  const x = pick(left);
  s.used.push(x);
  return x;
}

module.exports = { makeDuel, choices, shuffle, pick, fresh };
