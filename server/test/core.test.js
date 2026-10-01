import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ChessService } from '../src/core.js';
import { createMemoryDb } from '../src/memorydb.js';

const baseConfig = JSON.parse(readFileSync(new URL('../../config.json', import.meta.url)));
// Anti win-trading rules are covered by their own tests; the rest use short games.
const config = { ...baseConfig, minRatedPlies: 0, maxRatedGamesPerPairPerHour: 0 };

let clock;
let pushes;
let notes;
let online;
let svc;

function setup(cfg = config) {
  clock = 1_000_000;
  pushes = [];
  notes = [];
  online = new Set([1, 2, 3]);
  svc = new ChessService({
    db: createMemoryDb(),
    config: cfg,
    now: () => clock,
    isOnline: (p) => online.has(p),
    push: (passport, action, data) => pushes.push({ passport, action, data }),
    notify: (passport, title, content) => notes.push({ passport, content }),
  });
}

const call = (name, passport, data = {}) => svc.handlers()[name]({ passport, data });
const last = (passport, action) => [...pushes].reverse().find((p) => p.passport === passport && p.action === action)?.data;

async function registered() {
  await call('register', 1, { username: 'Alice' });
  await call('register', 2, { username: 'Bob' });
  await call('register', 3, { username: 'Carol' });
}

async function startedGame(tc = { base: 300, inc: 2 }) {
  await registered();
  await call('queue:join', 1, { tc });
  const res = await call('queue:join', 2, { tc });
  assert.equal(res.matched, true);
  const start = last(1, 'game:start');
  const white = start.myColor === 'w' ? 1 : 2;
  const black = white === 1 ? 2 : 1;
  return { id: start.id, white, black };
}

async function play(g, moves) {
  let ply = svc.games.get(g.id).moves.length;
  for (const uci of moves) {
    const passport = ply % 2 === 0 ? g.white : g.black;
    const res = await call('game:move', passport, { id: g.id, from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4], ply });
    assert.equal(res.ok, true, `${uci}: ${res.error}`);
    ply++;
  }
  await svc.flush();
}

beforeEach(() => setup());

test('register validates and rejects duplicates case-insensitively', async () => {
  assert.equal((await call('register', 1, { username: 'a' })).error, 'username_invalid');
  assert.equal((await call('register', 1, { username: 'bad name!' })).error, 'username_invalid');
  assert.equal((await call('register', 1, { username: 'Magnus_99' })).ok, true);
  assert.equal((await call('register', 1, { username: 'Other' })).error, 'already_registered');
  assert.equal((await call('register', 2, { username: 'magnus_99' })).error, 'username_taken');
  const boot = await call('bootstrap', 1);
  assert.equal(boot.me.username, 'Magnus_99');
  assert.equal(boot.me.games, 0);
  assert.equal(boot.me.rating, undefined);
});

test('queue pairs two players with the same time control only', async () => {
  await registered();
  await call('queue:join', 1, { tc: { base: 180, inc: 0 } });
  const r = await call('queue:join', 2, { tc: { base: 600, inc: 0 } });
  assert.equal(r.matched, false);
  const r2 = await call('queue:join', 3, { tc: { base: 180, inc: 0 } });
  assert.equal(r2.matched, true);
  assert.ok(last(1, 'game:start'));
  assert.ok(last(3, 'game:start'));
  assert.equal((await call('bootstrap', 2)).queue.tc.base, 600);
  assert.equal((await call('queue:join', 1, { tc: { base: 180, inc: 0 } })).error, 'in_game');
});

test('rejects invalid time controls and moves out of turn / illegal / stale', async () => {
  await registered();
  assert.equal((await call('queue:join', 1, { tc: { base: 5, inc: 0 } })).error, 'invalid_tc');
  setup();
  const g = await startedGame();
  assert.equal((await call('game:move', g.black, { id: g.id, from: 'e7', to: 'e5', ply: 0 })).error, 'not_your_turn');
  assert.equal((await call('game:move', g.white, { id: g.id, from: 'e2', to: 'e5', ply: 0 })).error, 'illegal');
  assert.equal((await call('game:move', g.white, { id: g.id, from: 'z9', to: 'e4', ply: 0 })).error, 'illegal');
  assert.equal((await call('game:move', g.white, { id: g.id, from: 'e2', to: 'e4', ply: 3 })).error, 'stale');
  assert.equal((await call('game:move', 3, { id: g.id, from: 'e2', to: 'e4', ply: 0 })).error, 'not_found');
});

test('fool’s mate ends the game, updates stats and stores the PGN', async () => {
  const g = await startedGame();
  await play(g, ['f2f3', 'e7e5', 'g2g4', 'd8h4']);
  const end = last(g.white, 'game:end');
  assert.equal(end.result, '0-1');
  assert.equal(end.reason, 'checkmate');
  assert.equal(end.ratingDelta, undefined);
  const lb = await call('leaderboard', 1, { sort: 'games' });
  assert.equal(lb.rows[0].games, 1);
  const prof = await call('profile', g.black);
  assert.equal(prof.profile.wins, 1);
  assert.equal(prof.games[0].pgn, undefined); // lists never carry PGNs
  const pgn = await call('game:pgn', g.black, { id: prof.games[0].id });
  assert.match(pgn.pgn, /Qh4#/);
  assert.equal((await call('game:pgn', g.black, { id: 'x' })).error, 'not_found');
  assert.equal(svc.playerGame.size, 0);
});

test('clocks start after both first moves, add increment and flag on timeout', async () => {
  const g = await startedGame({ base: 60, inc: 2 });
  clock += 10_000; // first moves are free
  await play(g, ['e2e4']);
  clock += 10_000;
  await play(g, ['e7e5']);
  let game = svc.games.get(g.id);
  assert.deepEqual(game.clocks, { w: 60_000, b: 60_000 });
  clock += 5_000;
  await play(g, ['g1f3']);
  assert.equal(game.clocks.w, 57_000); // 60 - 5 + 2
  clock += 61_000; // black runs out
  await svc.tick();
  const end = last(g.black, 'game:end');
  assert.equal(end.reason, 'timeout');
  assert.equal(end.result, '1-0');
  assert.equal(end.clocks.b, 0);
});

test('timeout: win with mating material, draw against a lone king', async () => {
  const g = await startedGame({ base: 60, inc: 0 });
  const game = svc.games.get(g.id);
  await play(g, ['e2e4', 'e7e5']);
  // White (to move) only has a king left, black has a queen: white flags -> black wins.
  game.chess.load('4k3/8/8/8/8/8/8/q3K3 w - - 0 1');
  game.turnStartedAt = clock;
  clock += 61_000;
  await svc.tick();
  assert.equal(last(g.white, 'game:end').reason, 'timeout');
  assert.equal(last(g.white, 'game:end').result, '0-1');

  setup();
  const g2 = await startedGame({ base: 60, inc: 0 });
  const game2 = svc.games.get(g2.id);
  await play(g2, ['e2e4', 'e7e5']);
  // White to move flags but black only has a king: draw.
  game2.chess.load('4k3/8/8/8/8/8/8/Q3K3 w - - 0 1');
  game2.turnStartedAt = clock;
  clock += 61_000;
  await svc.tick();
  assert.equal(last(g2.white, 'game:end').reason, 'timeout_insufficient');
  assert.equal(last(g2.white, 'game:end').result, '1/2-1/2');
});

test('first move deadline aborts without counting a game', async () => {
  const g = await startedGame();
  clock += config.firstMoveSeconds * 1000 + 1;
  await svc.tick();
  const end = last(g.white, 'game:end');
  assert.equal(end.reason, 'aborted');
  assert.equal(end.result, undefined);
  assert.equal((await call('profile', g.white)).profile.games, 0);
});

test('abort only before both sides moved; resign after', async () => {
  const g = await startedGame();
  await play(g, ['e2e4', 'e7e5']);
  assert.equal((await call('game:abort', g.white, { id: g.id })).error, 'cannot_abort');
  await call('game:resign', g.white, { id: g.id });
  const end = last(g.black, 'game:end');
  assert.equal(end.reason, 'resignation');
  assert.equal(end.result, g.white === 1 ? '0-1' : '0-1');
});

test('draw offer and accept', async () => {
  const g = await startedGame();
  await play(g, ['e2e4', 'e7e5']);
  await call('game:draw', g.white, { id: g.id, action: 'offer' });
  assert.equal(last(g.black, 'game:draw').offer, 'w');
  await call('game:draw', g.black, { id: g.id, action: 'accept' });
  assert.equal(last(g.white, 'game:end').reason, 'agreement');
});

test('a move declines a pending draw offer', async () => {
  const g = await startedGame();
  await play(g, ['e2e4', 'e7e5']);
  await call('game:draw', g.black, { id: g.id, action: 'offer' });
  await play(g, ['g1f3']);
  assert.equal(svc.games.get(g.id).drawOffer, null);
  assert.equal((await call('game:draw', g.white, { id: g.id, action: 'accept' })).error, 'no_offer');
});

test('challenge lifecycle: send, notify, accept, colours, expiry', async () => {
  await registered();
  assert.equal((await call('challenge:send', 1, { username: 'nobody', tc: { base: 300, inc: 0 } })).error, 'not_found');
  assert.equal((await call('challenge:send', 1, { username: 'alice', tc: { base: 300, inc: 0 } })).error, 'self');
  online.delete(3);
  assert.equal((await call('challenge:send', 1, { username: 'carol', tc: { base: 300, inc: 0 } })).error, 'offline');

  const sent = await call('challenge:send', 1, { username: 'bob', tc: { base: 300, inc: 0 }, color: 'w' });
  assert.equal(sent.ok, true);
  assert.equal(last(2, 'challenge:incoming').from.username, 'Alice');
  assert.ok(notes.some((n) => n.passport === 2));
  assert.equal((await call('challenge:send', 1, { username: 'bob', tc: { base: 300, inc: 0 } })).error, 'already_challenged');

  const acc = await call('challenge:accept', 2, { id: sent.challenge.id });
  assert.equal(acc.ok, true);
  assert.equal(last(1, 'game:start').myColor, 'w');
  assert.equal(last(1, 'challenge:update').status, 'accepted');

  // expiry
  setup();
  await registered();
  const c = await call('challenge:send', 1, { username: 'Carol', tc: { base: 600, inc: 0 } });
  clock += config.challengeExpireSeconds * 1000 + 1;
  await svc.tick();
  assert.equal(last(3, 'challenge:update').status, 'expired');
  assert.equal((await call('challenge:accept', 3, { id: c.challenge.id })).error, 'expired');
});

test('decline notifies the challenger', async () => {
  await registered();
  const c = await call('challenge:send', 1, { username: 'Bob', tc: { base: 600, inc: 0 } });
  await call('challenge:decline', 2, { id: c.challenge.id });
  assert.equal(last(1, 'challenge:update').status, 'declined');
  assert.equal(svc.challenges.size, 0);
});

test('rematch swaps colours and double request accepts', async () => {
  const g = await startedGame();
  await play(g, ['f2f3', 'e7e5', 'g2g4', 'd8h4']);
  await call('game:rematch', g.white, { id: g.id });
  assert.ok(last(g.black, 'challenge:incoming').rematchOf);
  const res = await call('game:rematch', g.black, { id: g.id });
  assert.equal(res.ok, true);
  const start = last(g.white, 'game:start');
  assert.equal(start.myColor, 'b'); // old white now plays black
});

test('disconnect grace: reconnect keeps the game, timeout forfeits', async () => {
  const g = await startedGame();
  await play(g, ['e2e4', 'e7e5']);
  svc.onDisconnect(g.white);
  assert.equal(last(g.black, 'game:opponent').connected, false);
  clock += 5_000;
  await call('bootstrap', g.white); // came back
  assert.equal(last(g.black, 'game:opponent').connected, true);
  const snap = (await call('bootstrap', g.white)).game;
  assert.equal(snap.moves.length, 2);

  svc.onDisconnect(g.black);
  clock += config.disconnectGraceSeconds * 1000 + 1;
  // keep white's clock alive for the check
  svc.games.get(g.id).clocks.w = 10 ** 9;
  await svc.tick();
  const end = last(g.white, 'game:end');
  assert.equal(end.reason, 'abandoned');
  assert.equal(end.result, g.white === 1 ? '1-0' : '1-0');
});

test('leaderboard win rate needs minimum games', async () => {
  const g = await startedGame();
  await play(g, ['f2f3', 'e7e5', 'g2g4', 'd8h4']);
  const lb = await call('leaderboard', 1, { sort: 'winrate' });
  assert.equal(lb.rows.length, 0);
  assert.equal(lb.me.rank, null);
  const byGames = await call('leaderboard', 1, { sort: 'games' });
  assert.equal(byGames.rows.length, 2); // Carol has not played yet
  assert.equal(byGames.me.rank <= 2, true);
});

test('leaderboard sorts by most wins', async () => {
  const g = await startedGame();
  await play(g, ['f2f3', 'e7e5', 'g2g4', 'd8h4']);
  const lb = await call('leaderboard', 1, { sort: 'wins' });
  assert.equal(lb.sort, 'wins');
  assert.equal(lb.rows[0].wins, 1);
  assert.equal(lb.rows.length, 2); // only players with games
  assert.equal(lb.rows[0].rating, undefined);
});

test('phone notifications follow each player locale', async () => {
  await registered();
  await call('bootstrap', 2, { locale: 'pt-br' });
  await call('challenge:send', 1, { username: 'Bob', tc: { base: 300, inc: 0 } });
  assert.match(notes.at(-1).content, /Alice te desafiou \(5 min\)/);
  await call('locale', 2, { locale: 'en' });
  await call('challenge:send', 3, { username: 'Bob', tc: { base: 180, inc: 2 } });
  assert.match(notes.at(-1).content, /Carol challenged you \(3 \| 2\)/);
  // Unknown players fall back to config.defaultLocale.
  await call('challenge:send', 3, { username: 'Alice', tc: { base: 600, inc: 0 } });
  assert.match(notes.at(-1).content, /Carol challenged you \(10 min\)/);
});

test('search excludes self and returns presence', async () => {
  await registered();
  const r = await call('search', 1, { q: 'b' });
  assert.deepEqual(r.players.map((p) => p.username), ['Bob']);
  assert.equal((await call('search', 1, { q: "'; drop" })).players.length, 0);
});

test('short games and repeated pairings are unrated (anti win-trading)', async () => {
  setup({ ...config, minRatedPlies: 10, maxRatedGamesPerPairPerHour: 1 });
  const g = await startedGame();
  await play(g, ['f2f3', 'e7e5', 'g2g4', 'd8h4']); // 4 plies < 10
  assert.equal(last(g.white, 'game:end').rated, false);
  assert.equal((await call('profile', g.black)).profile.games, 0);
  assert.equal((await call('profile', g.black)).games.length, 1); // still in history

  // A long enough game counts, the next one between the same pair within the hour does not.
  const long = ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4', 'f8c5', 'b1c3', 'g8f6', 'd2d3', 'd7d6'];
  const g2 = await (async () => {
    await call('queue:join', 1, { tc: { base: 300, inc: 2 } });
    await call('queue:join', 2, { tc: { base: 300, inc: 2 } });
    const s = last(1, 'game:start');
    const white = s.myColor === 'w' ? 1 : 2;
    return { id: s.id, white, black: white === 1 ? 2 : 1 };
  })();
  await play(g2, long);
  await call('game:resign', g2.white, { id: g2.id });
  await svc.flush();
  assert.equal(last(1, 'game:end').rated, true);
  assert.equal(last(1, 'game:end').me.games, 1);

  await call('queue:join', 1, { tc: { base: 300, inc: 2 } });
  await call('queue:join', 2, { tc: { base: 300, inc: 2 } });
  const s3 = last(1, 'game:start');
  const w3 = s3.myColor === 'w' ? 1 : 2;
  await play({ id: s3.id, white: w3, black: w3 === 1 ? 2 : 1 }, long);
  await call('game:resign', w3, { id: s3.id });
  await svc.flush();
  assert.equal(last(1, 'game:end').rated, false);
  assert.equal((await call('profile', 1)).profile.games, 1);
});

test('concurrent accepts cannot put a player in two games', async () => {
  await registered();
  const a = await call('challenge:send', 1, { username: 'Carol', tc: { base: 300, inc: 0 } });
  const b = await call('challenge:send', 2, { username: 'Carol', tc: { base: 300, inc: 0 } });
  const [r1, r2] = await Promise.all([call('challenge:accept', 3, { id: a.challenge.id }), call('challenge:accept', 3, { id: b.challenge.id })]);
  assert.equal([r1, r2].filter((r) => r.ok).length, 1);
  assert.equal(svc.games.size, 1);
});

test('concurrent queue joins pair each player once', async () => {
  await registered();
  const tc = { base: 180, inc: 0 };
  await Promise.all([call('queue:join', 1, { tc }), call('queue:join', 2, { tc }), call('queue:join', 3, { tc })]);
  assert.equal(svc.games.size, 1);
  assert.equal(svc.playerGame.size, 2);
});

test('disconnect grace never exceeds the leaver clock', async () => {
  const g = await startedGame({ base: 20, inc: 0 });
  await play(g, ['e2e4', 'e7e5']);
  svc.onDisconnect(g.white); // white to move with 20s left
  const deadline = last(g.black, 'game:opponent').deadline;
  assert.equal(deadline - clock, (config.minDisconnectGraceSeconds + 20) * 1000);
  assert.ok(deadline - clock < config.disconnectGraceSeconds * 1000);
});

test('client cannot forge rematch challenges or oversized lookups', async () => {
  await registered();
  const c = await call('challenge:send', 1, { username: 'Bob', tc: { base: 300, inc: 0 }, rematchOf: 'g123' });
  assert.equal(c.challenge.rematchOf, undefined);
  assert.equal((await call('profile', 1, { username: 'x'.repeat(10_000) })).error, 'not_found');
  assert.equal((await call('challenge:send', 1, { username: 'x'.repeat(10_000), tc: { base: 300, inc: 0 } })).error, 'not_found');
});

test('a slow database does not delay game end', async () => {
  const g = await startedGame();
  let release;
  svc.db.recordGame = () => new Promise((r) => (release = r));
  await call('game:move', g.white, { id: g.id, from: 'f2', to: 'f3', ply: 0 });
  await call('game:move', g.black, { id: g.id, from: 'e7', to: 'e5', ply: 1 });
  await call('game:move', g.white, { id: g.id, from: 'g2', to: 'g4', ply: 2 });
  await call('game:move', g.black, { id: g.id, from: 'd8', to: 'h4', ply: 3 });
  assert.equal(last(g.white, 'game:end').reason, 'checkmate'); // pushed before the write finished
  assert.equal(svc.pending.size, 1);
  release();
  await svc.flush();
  assert.equal(svc.pending.size, 0);
});

test('disconnect outside a game drops cached profile and locale', async () => {
  await registered();
  await call('bootstrap', 1, { locale: 'pt' });
  assert.ok(svc.profiles.has(1));
  svc.onDisconnect(1);
  assert.equal(svc.profiles.has(1), false);
  assert.equal(svc.locales.has(1), false);
});
