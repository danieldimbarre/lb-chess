# lb-chess

Chess app for **LB Phone**: online matchmaking, username challenges, leaderboards, eight bots, and an analysis board with an engine and a position editor. There is no rating system: players are ranked by games played, win rate and wins.

## Features

- **Username onboarding**: 3-16 characters, letters, numbers and `_`, unique regardless of case, with a live availability check.
- **Play online**: a matchmaking queue for each time control, with random colours.
- **Play a Friend**: search by username (shows who is online or in a game), pick the time control and your colour. The other player gets a phone notification and an in-app banner to accept or decline. Challenges expire after 60 s. Rematches swap colours.
- **Time controls**: bullet, blitz and rapid presets in the chess.com layout, "More time controls", and a custom minutes + increment picker.
- **Online games, enforced by the server**: the server validates every move with chess.js and keeps the clocks. Each side's first move is free and has a 30 s deadline, after which the game is aborted. Increment is added after each move. Flagging when the opponent has no mating material is a draw. The server handles draw offers (a move declines a pending offer), abort (allowed until both sides have moved), resign, and a 60 s grace period on disconnect before the game counts as abandoned. It also detects checkmate, stalemate, insufficient material, threefold repetition and the 50-move rule.
- **Board**: close to chess.com's. It has green and five other themes, coordinates, highlights for the last move, selected square and check, legal-move dots and capture rings, click or drag moves, animated pieces, a promotion picker with under-promotion, **premoves** (several can be queued, shown in red, and cancelled with a right click), and right-click drag **arrows** (L-shaped for knights) and square marks.
- **Game UI**: player bars with captured pieces and material advantage, clocks that show tenths under 20 s, a low-time warning, a figurine move list with navigation, a result modal, rematch, new game, and game review.
- **Bots**: eight bots, from level 1 to level 8 (full engine strength), with a small opening book from level 3 up. They run on the app's own alpha-beta engine in a Web Worker. Bot games have an optional timer, hints, takebacks and premoves, and can start from any position.
- **Analysis**: an eval bar, the best line in SAN and an engine arrow. You can branch from any move. It has a board editor (piece palette, eraser, side to move, castling rights), FEN/PGN import and export, and "play vs bot from here".
- **Leaderboards**: most games, win rate (needs `leaderboardMinGames` games) and most wins, with a podium and your own rank.
- **Profiles**: games, wins, win rate, a W/L/D bar, online status and recent games. Tap a game to replay it in analysis.
- Follows the phone's light or dark theme. Sounds are synthesised with WebAudio.
- **Theme and language follow the phone**: the app reads LB Phone's settings (`GetSettings` / `OnSettingsChange`), switching live between dark and light and between Portuguese (any `pt-*` phone language, written as pt-BR) and English (every other language). Players can override both in Settings → Appearance. Phone notifications are sent in each player's language, and the App Store name/description use `config.json → appStore.pt` on Portuguese phones.
- **Responsive**: the UI is designed on a 390 px canvas and scaled to whatever size the phone iframe has, and the board shrinks to fit short screens. Figurines are drawn from the piece images, because Unicode chess glyphs show up as emoji in the game's browser.

## Configuration (`config.json`)

| Key | Default | Meaning |
| --- | --- | --- |
| `identifier` / `name` / `description` / `developer` | | App store listing |
| `defaultApp` | `true` | Installed on every phone |
| `defaultLocale` | `"en"` | Language for notifications to players who have not opened the app yet |
| `appStore.pt` | Xadrez... | App Store name/description for Portuguese phones |
| `usernameMin` / `usernameMax` | `3` / `16` | Username length limits |
| `challengeExpireSeconds` | `60` | How long a challenge stays open |
| `firstMoveSeconds` | `30` | First-move deadline before the game is aborted |
| `disconnectGraceSeconds` | `60` | Reconnect window before the game counts as abandoned |
| `leaderboardMinGames` | `5` | Games needed to appear in the win-rate ranking |
| `leaderboardSize` | `50` | Number of rows per leaderboard |
| `maxRequestsPerSecond` | `15` | Per-player request rate limit |
| `saveGames` | `true` | Store each finished game (moves/PGN) in `chess_games` for profile history and replays. `false` only updates wins/losses/draws in `chess_players`, saving storage |
| `gameHistoryDays` | `90` | Saved games older than this are deleted (`0` keeps them forever) |
| `minBaseMinutes` / `maxBaseMinutes` / `maxIncrementSeconds` | `1` / `60` / `60` | Allowed time controls. 20 s and 30 s bullet are also allowed |

## Architecture

```
client/client.lua        registers the app with lb-phone, relays UI requests to the server and server pushes to the UI
server/src/core.js       ChessService: queue, challenges, games, clocks, stats, leaderboards (framework-agnostic)
server/src/db.js         oxmysql adapter + schema      server/src/memorydb.js  in-memory adapter (tests, dev)
server/src/index.js      FiveM entry: vRP identity, lb-phone notifications, rate limit, tick, disconnect hooks
ui/src                   Vue 3 + TypeScript + Tailwind v4 app loaded by lb-phone as an iframe
ui/src/engine            chess engine (0x88, PVS, quiescence, TT) + bot profiles, run in a Web Worker
```

Request flow: UI `fetch("https://lb-chess/req", {name, data})` → Lua `RegisterNUICallback("req")` → `TriggerServerEvent("lb-chess:req", id, name, data)` → `ChessService` handler → `lb-chess:res`. Server pushes go through `lb-chess:push` → `exports["lb-phone"]:SendCustomAppMessage`.

## Development

```bash
cd ui && npm install && npm run dev       # http://localhost:5190, runs the real server core with simulated players
cd ui && npm run build                    # type-check + build to ui/dist
cd ui && npm test                         # engine perft + search tests
cd server && npm install && npm run build # bundle to server/dist/server.js
cd server && npm test                     # matchmaking / rules / clocks / stats tests
```

`/dev/phone.html?user=Name&size=0.7&pos=left` reproduces how LB Phone sizes the app at the current window size.

In dev, `?user=Name` skips onboarding. `window.__mock.challengeMe()` sends you a challenge, and `window.__mock.disconnectOpponent()` simulates a dropped opponent.

## Credits

- Pieces: "cburnett" set by Colin M.L. Burnett, CC BY-SA 3.0.
- Rules: [chess.js](https://github.com/jhlywa/chess.js) (BSD-2-Clause).
- Not affiliated with chess.com. The app only borrows its look and feel.
