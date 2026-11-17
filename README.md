# Tablo — online two-player games

A start menu with 12 board games and 5 real-time speed duels that two people play live in the browser.

## Board games

| Game | Notes |
|---|---|
| Sea Battle (Морской бой) | 10×10, fleet 5-4-3-3-2 + four 1-cell boats, ships can't touch, a hit gives you another shot. Enemy ships stay hidden on the server. Russian UI, CSS-3D boards over a sea scene (time of day and landscape switch, fullscreen button). |
| Chess | Full rules: castling, en passant, promotion picker, check/checkmate, stalemate, 50-move, threefold repetition, insufficient material. Move list in algebraic notation. |
| Checkers | Mandatory captures, multi-jumps, kings. |
| Tic Tac Toe | Classic 3×3. |
| Connect Four | 7×6 with drop animation. |
| Reversi | Legal-move hints, automatic passes, disc counts. |
| Gomoku | 15×15, five in a row. |
| Dots & Boxes | 5×5 boxes; closing a box gives you another turn. |
| Mancala | Kalah rules: 6 pits × 4 seeds, extra turn in your store, captures across, remaining seeds swept at the end. |
| Nine Men's Morris | Place 9, then slide; a mill removes an enemy piece; fly with 3 left. 50 moves without a mill is a draw. |
| Hex | 11×11, connect your two edges; swap (pie) rule on the second move. Never a draw. |
| Wall Race | 9×9 pawn race with 10 walls each; walls may never seal a player off completely. |

## Speed duels

Both players get the same question at the same moment; the first correct answer takes the point. The server keeps the answer hidden and runs the round timers.

| Duel | Notes |
|---|---|
| Flag Duel | 86 flags drawn as inline SVG, 4 options, a wrong pick locks you out of the round. 10 rounds. |
| Capital Clash | ~110 countries; name the capital from 4 options. 10 rounds. |
| Word Race | Unscramble an English word and type it; any listed word using the same letters counts; hint after 15 s. 8 rounds. |
| Math Sprint | Typed answers; sums, differences, times tables and division get harder each few rounds. 10 rounds. |
| Quick Draw | Wait for green, then tap; tapping early gives the point away. Reaction time shown in ms. 7 rounds. |

You also get: a public lobby ("Play online"), private invite links/room codes ("Invite friend"), table chat, resign, rematch with sides swapped, and automatic reconnect if someone refreshes or drops.

**Play vs computer.** Every game can also be played against a bot (Easy / Medium / Hard, picked in the top bar). The bot sits in the second seat on the server and its moves go through the same rule checks as a person's. Board games use search (minimax / alpha-beta) or game-specific heuristics; in Sea Battle the bot only sees what a player would see. In the speed duels the bot answers after a human-like delay, with accuracy and reaction time set by the level.

## Run it

```bash
npm install
npm start            # http://localhost:3100   (PORT=4000 npm start to change)
```

The terminal prints a `Network:` address too. Anyone on the same Wi-Fi can open it, and invite links use that address automatically.

## Playing over the internet

The server has to be reachable from outside your network. Either:

- **Quick tunnel (no deploy):** `npx cloudflared tunnel --url http://localhost:3100` (or `ngrok http 3100`), then share the public URL it prints.
- **Deploy:** push this folder to any Node host that supports WebSockets (Render, Railway, Fly.io, a VPS). Start command: `npm start`. The `PORT` environment variable is respected.

## Tests

```bash
npm test
```

- `tests/chess-perft.js` checks the chess move generator against standard perft counts.
- `tests/rules-*.js` unit-test the Mancala, Nine Men's Morris, Hex and Wall Race rules.
- `tests/sim.js` starts the server and plays games with two socket clients (turn order, wins, forced captures, hidden fleets, duel timers and hidden answers, rematch, chat, resign, reconnect, full-room rejection).
- `tests/bots.js` plays every bot level against each other in all board games: only legal moves, every game finishes, and each move stays within a time limit.
- `tests/bot-room.js` plays against the computer through the real server (instant start, bot replies, rematch, private table, Sea Battle fleet, duel answers).

## Structure

```
server.js              Express + Socket.IO: rooms, lobby, chat, rematch, reconnect
games/*.js             Authoritative rules per game: init(), move(state, seat, move), view(state, seat)
bots/*.js              Computer opponents: (state, seat, level) => move; bots/duel.js times duel answers
games/duel.js          Shared engine for speed duels (rounds, timers via wake(), hidden answers)
games/data/            Flags (SVG), capitals and the word list
public/css/            Per-game styles (board games + duels.css)
public/index.html      Start menu + game room
public/style.css
public/js/app.js       Client: menu, lobby, room screen, socket handling
public/js/games/*.js   One renderer per game (board UI, rules text, menu art); duel.js is the shared duel UI
```

To add a game: add a rules module in `games/` and register it in `games/index.js`, then add a renderer in `public/js/games/` and register it in `public/js/games/index.js` (with a theme). For a new speed duel, use `makeDuel()` from `games/duel.js` and `duel()` from `public/js/games/duel.js`.
# Board_games
