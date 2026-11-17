import seabattle from './seabattle.js';
import chess from './chess.js';
import checkers from './checkers.js';
import tictactoe from './tictactoe.js';
import connect4 from './connect4.js';
import reversi from './reversi.js';
import gomoku from './gomoku.js';
import dotsboxes from './dotsboxes.js';
import mancala from './mancala.js';
import mill from './mill.js';
import hex from './hex.js';
import walls from './walls.js';
import flags from './flags.js';
import capitals from './capitals.js';
import wordrace from './wordrace.js';
import mathsprint from './mathsprint.js';
import quickdraw from './quickdraw.js';

// Each game owns one hue on the green -> violet spectrum. `accent` drives buttons, highlights,
// the turn indicator and the page glow; `p0`/`p1` are readable player colors
// for chat names, marks and lines (piece swatches stay in each game module).
const THEMES = {
  gomoku:    { accent: '#a6e34b', ink: '#162403', p0: '#d9e6c4', p1: '#a6e34b' },
  reversi:   { accent: '#3ddc84', ink: '#03230f', p0: '#c9c2d9', p1: '#3ddc84' },
  seabattle: { accent: '#2dd4bf', ink: '#022621', p0: '#2dd4bf', p1: '#a07aff' },
  connect4:  { accent: '#38bdf8', ink: '#031f2e', p0: '#3ddc84', p1: '#b28cff' },
  dotsboxes: { accent: '#7b86ff', ink: '#0b0e3a', p0: '#3ddc84', p1: '#9b7bff' },
  chess:     { accent: '#a07aff', ink: '#170838', p0: '#efe8fa', p1: '#b99bff' },
  tictactoe: { accent: '#c86bfa', ink: '#2a0838', p0: '#3ddc84', p1: '#c86bfa' },
  checkers:  { accent: '#e06cdc', ink: '#330a31', p0: '#3ddc84', p1: '#c9c2d9' },
  mancala:   { accent: '#7fe36a', ink: '#122603', p0: '#3ddc84', p1: '#b28cff' },
  mill:      { accent: '#2bc4d8', ink: '#02222a', p0: '#3ddc84', p1: '#b28cff' },
  hex:       { accent: '#5a9cff', ink: '#06183a', p0: '#3ddc84', p1: '#a07aff' },
  walls:     { accent: '#9a8cff', ink: '#120b3a', p0: '#3ddc84', p1: '#c86bfa' },
  // speed duels
  flags:      { accent: '#43e08a', ink: '#04210f', p0: '#3ddc84', p1: '#b28cff' },
  capitals:   { accent: '#38bdf8', ink: '#031f2e', p0: '#3ddc84', p1: '#b28cff' },
  wordrace:   { accent: '#7b86ff', ink: '#0b0e3a', p0: '#3ddc84', p1: '#b28cff' },
  mathsprint: { accent: '#a07aff', ink: '#170838', p0: '#3ddc84', p1: '#c86bfa' },
  quickdraw:  { accent: '#e06cdc', ink: '#330a31', p0: '#3ddc84', p1: '#b28cff' },
};

const list = [
  seabattle, chess, checkers, tictactoe, connect4, reversi, gomoku, dotsboxes, mancala, mill, hex, walls,
  flags, capitals, wordrace, mathsprint, quickdraw,
];
for (const g of list) g.theme = THEMES[g.id];
export const GAMES = Object.fromEntries(list.map((g) => [g.id, g]));
export const ORDER = list.map((g) => g.id);

// CSS custom properties for a game's theme, e.g. for a style attribute.
export const themeVars = (G) => {
  const t = G?.theme;
  return t ? { '--accent': t.accent, '--accent-ink': t.ink, '--p0': t.p0, '--p1': t.p1 } : {};
};
export const themeStyle = (G) => Object.entries(themeVars(G)).map(([k, v]) => `${k}:${v}`).join(';');
