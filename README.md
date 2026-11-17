# Game Night — online two-player board games

A start menu with 8 classic board games that two people play live in the browser.

| Game | Notes |
|---|---|
| Sea Battle | 10×10, fleet 5-4-3-3-2, ships can't touch, a hit gives you another shot. Enemy ships stay hidden on the server. |
| Chess | Full rules: castling, en passant, promotion picker, check/checkmate, stalemate, 50-move, threefold repetition, insufficient material. Move list in algebraic notation. |
| Checkers | Mandatory captures, multi-jumps, kings. |
| Tic Tac Toe | Classic 3×3. |
| Connect Four | 7×6 with drop animation. |
| Reversi | Legal-move hints, automatic passes, disc counts. |
| Gomoku | 15×15, five in a row. |
| Dots & Boxes | 5×5 boxes; closing a box gives you another turn. |

You also get: a public lobby ("Play online"), private invite links/room codes ("Invite friend"), table chat, resign, rematch with sides swapped, and automatic reconnect if someone refreshes or drops.

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
- `tests/sim.js` starts the server and plays every game with two socket clients (turn order, wins, forced captures, hidden fleets, rematch, chat, resign, reconnect, full-room rejection).

## Structure

```
server.js              Express + Socket.IO: rooms, lobby, chat, rematch, reconnect
games/*.js             Authoritative rules per game: init(), move(state, seat, move), view(state, seat)
public/index.html      Start menu + game room
public/style.css
public/js/app.js       Client: menu, lobby, room screen, socket handling
public/js/games/*.js   One renderer per game (board UI, rules text, menu art)
```

To add a game: add a rules module in `games/` and register it in `games/index.js`, then add a renderer in `public/js/games/` and register it in `public/js/games/index.js`.
# Board_games
