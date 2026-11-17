import seabattle from './seabattle.js';
import chess from './chess.js';
import checkers from './checkers.js';
import tictactoe from './tictactoe.js';
import connect4 from './connect4.js';
import reversi from './reversi.js';
import gomoku from './gomoku.js';
import dotsboxes from './dotsboxes.js';

const list = [seabattle, chess, checkers, tictactoe, connect4, reversi, gomoku, dotsboxes];
export const GAMES = Object.fromEntries(list.map((g) => [g.id, g]));
export const ORDER = list.map((g) => g.id);
