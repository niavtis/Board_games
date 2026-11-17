// Computer opponents. Turn-based bots are (state, seat, level) => move, producing the same
// move objects a browser client would send; the server validates them with the game rules.
// Real-time duels share one bot that answers after a level-dependent delay.
const duel = require('./duel');

const LEVELS = ['easy', 'medium', 'hard'];
const TURN_BASED = ['seabattle', 'chess', 'checkers', 'tictactoe', 'connect4', 'reversi', 'gomoku', 'dotsboxes', 'mancala', 'mill', 'hex', 'walls'];
const DUELS = ['flags', 'capitals', 'wordrace', 'mathsprint', 'quickdraw'];
const BOTS = Object.fromEntries(TURN_BASED.map((id) => [id, require(`./${id}`)]));
const THINK = [450, 950]; // ms a turn-based bot "thinks" before moving, so its moves are easy to follow

// Whether the bot sitting at `seat` has something to do in this state.
function needsToAct(gameId, s, seat) {
  if (!s || s.over) return false;
  if (gameId === 'seabattle' && s.phase === 'place') return !s.ready[seat];
  return s.turn === seat;
}

const pick = (gameId, s, seat, level) => BOTS[gameId](s, seat, level);
const has = (gameId) => Object.hasOwn(BOTS, gameId) || DUELS.includes(gameId);

// What the bot at `seat` will do next: { delay, move() } or null. `memo` is per-room scratch
// space so a duel bot keeps one answer time per round however often it is asked.
function plan(gameId, s, seat, level, memo, now = Date.now()) {
  if (!s || s.over) return null;
  if (DUELS.includes(gameId)) {
    const p = duel.plan(s, seat, level, memo);
    return p && { delay: Math.max(0, p.at - now), move: () => p.move, soft: true };
  }
  if (!needsToAct(gameId, s, seat)) return null;
  return { delay: THINK[0] + Math.random() * (THINK[1] - THINK[0]), move: () => pick(gameId, s, seat, level) };
}

module.exports = { LEVELS, GAMES: Object.keys(BOTS), DUELS, has, needsToAct, pick, plan };
