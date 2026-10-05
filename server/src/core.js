import { Chess } from 'chess.js';
import { msg, tcText, toLocale } from './i18n.js';

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const SQUARE = /^[a-h][1-8]$/;
const USERNAME = /^[A-Za-z0-9_]+$/;
const HOUR = 60 * 60 * 1000;
const SWEEP_INTERVAL = 60 * 1000;

const fail = (error) => ({ ok: false, error });
const other = (c) => (c === 'w' ? 'b' : 'w');
const tcKey = (tc) => `${tc.base}+${tc.inc}`;
const pairKey = (a, b) => (a < b ? `${a}:${b}` : `${b}:${a}`);

/**
 * Authoritative chess server logic. Framework-agnostic: all I/O goes through
 * the injected adapters so the exact same code runs on FiveM, in node tests
 * and as the UI's dev mock.
 *
 * deps:
 *  - db:        database adapter (see db.js / memorydb.js)
 *  - push:      (passport, action, data) => void   sends to the player's phone app
 *  - notify:    (passport, title, content) => void phone notification
 *  - isOnline:  (passport) => boolean
 *  - now:       () => number
 *  - config:    config.json contents
 */
export class ChessService {
  constructor({ db, push, notify, isOnline, now = Date.now, config, log = () => {} }) {
    this.db = db;
    this.push = push;
    this.notify = notify ?? (() => {});
    this.isOnline = isOnline ?? (() => true);
    this.now = now;
    this.cfg = config;
    /** config.saveGames: false (also "false" / 0) keeps only win/loss/draw stats and stores no game history. */
    this.keepHistory = ![false, 0, 'false'].includes(config.saveGames);
    this.log = log;

    /** @type {Map<number, any>} passport -> profile row (online players only, see sweep()) */
    this.profiles = new Map();
    /** passport -> 'en' | 'pt', reported by the phone app */
    this.locales = new Map();
    /** @type {Map<string, {passport:number, profile:any, tc:any, since:number}[]>} */
    this.queues = new Map();
    this.challenges = new Map();
    this.games = new Map();
    /** passport -> game id (only while playing) */
    this.playerGame = new Map();
    this.seq = 0;

    /** sort -> { at, rows } */
    this.lbCache = new Map();
    /** `${sort}:${passport}` -> { at, rank } */
    this.rankCache = new Map();
    /** pair key -> timestamps of rated games between those two players */
    this.pairGames = new Map();
    /** pair keys of players who agreed to chat: later games between them start with chat open (no messages kept) */
    this.chatPairs = new Set();
    /** in-flight persistence promises (see flush()) */
    this.pending = new Set();
    this.lastSweep = this.now();
    this.lastPrune = 0;
    this.pruning = false;
    /** set when the queues change; the next tick() sends the lobby to every app user */
    this.lobbyDirty = false;
    /** passport -> last time a "someone is looking for a game" notification was sent */
    this.seekNotified = new Map();
    /** passports that turned on "notify me when someone looks for a game" in the app (off by default) */
    this.seekAlerts = new Set();
  }

  // Helpers ------------------------------------------------------------------------

  id(prefix) {
    return `${prefix}${(this.now() % 1e9).toString(36)}${(this.seq++).toString(36)}`;
  }

  async profile(passport) {
    if (this.profiles.has(passport)) return this.profiles.get(passport);
    const row = await this.db.getPlayer(passport);
    if (row) this.profiles.set(passport, row);
    return row;
  }

  validName(value) {
    const username = String(value ?? '').trim();
    if (username.length < this.cfg.usernameMin || username.length > this.cfg.usernameMax || !USERNAME.test(username)) return null;
    return username;
  }

  publicProfile(p) {
    if (!p) return null;
    return { username: p.username, games: p.games, wins: p.wins, losses: p.losses, draws: p.draws, createdAt: p.createdAt };
  }

  validTc(tc) {
    if (!tc || typeof tc !== 'object') return null;
    const base = Math.floor(Number(tc.base));
    const inc = Math.floor(Number(tc.inc));
    if (!Number.isFinite(base) || !Number.isFinite(inc)) return null;
    // Sub-minute bullet (20s/30s) is allowed besides whole minutes.
    const minBase = Math.min(20, this.cfg.minBaseMinutes * 60);
    if (base < minBase || base > this.cfg.maxBaseMinutes * 60) return null;
    if (inc < 0 || inc > this.cfg.maxIncrementSeconds) return null;
    return { base, inc };
  }

  playerRef(p) {
    return { username: p.username };
  }

  challengeView(c) {
    return {
      id: c.id,
      from: this.playerRef(c.fromProfile),
      to: this.playerRef(c.toProfile),
      tc: c.tc,
      color: c.color,
      expiresAt: c.expiresAt,
      serverTime: this.now(),
      rematchOf: c.rematchOf ?? undefined,
    };
  }

  colorOf(game, passport) {
    return game.white === passport ? 'w' : game.black === passport ? 'b' : null;
  }

  /** Clock time `color` has left right now (its clock only runs on its own turn after ply 2). */
  remaining(game, color) {
    const running = game.moves.length >= 2 && game.chess.turn() === color;
    return game.clocks[color] - (running ? this.now() - game.turnStartedAt : 0);
  }

  snapshot(game, passport) {
    return {
      id: game.id,
      white: { ...game.players.w, connected: !game.disconnect.w },
      black: { ...game.players.b, connected: !game.disconnect.b },
      myColor: this.colorOf(game, passport) ?? 'w',
      tc: game.tc,
      moves: game.moves,
      initialFen: game.initialFen,
      clocks: { ...game.clocks },
      turnStartedAt: game.turnStartedAt,
      serverTime: this.now(),
      firstMoveDeadline: game.firstMoveDeadline,
      drawOffer: game.drawOffer,
      status: game.status,
      result: game.result,
      reason: game.reason,
      rematch: game.rematch,
      chat: this.chatView(game),
      disconnectDeadline: game.disconnect[other(this.colorOf(game, passport) ?? 'w')] ?? null,
    };
  }

  pushGame(game, action, dataFor) {
    for (const passport of [game.white, game.black]) this.push(passport, action, dataFor(passport));
  }

  removeFromQueues(passport) {
    let removed = false;
    for (const [key, list] of this.queues) {
      const i = list.findIndex((q) => q.passport === passport);
      if (i >= 0) {
        list.splice(i, 1);
        removed = true;
      }
      if (!list.length) this.queues.delete(key);
    }
    if (removed) this.lobbyDirty = true;
    return removed;
  }

  queueOf(passport) {
    for (const list of this.queues.values()) {
      const q = list.find((e) => e.passport === passport);
      if (q) return { tc: q.tc, since: q.since };
    }
    return null;
  }

  // Lobby: with few players online, two people waiting in different time controls never meet.
  // Everyone using the app sees every open seek and can take one with a single tap.

  /** Open seeks, oldest first: the player who has waited longest is the one to show. */
  lobby() {
    const seeks = [];
    for (const list of this.queues.values()) {
      for (const q of list) {
        if (!this.isOnline(q.passport) || this.playerGame.has(q.passport)) continue;
        seeks.push({ username: (this.profiles.get(q.passport) ?? q.profile).username, tc: q.tc, since: q.since });
      }
    }
    seeks.sort((a, b) => a.since - b.since);
    let players = 0;
    for (const p of this.profiles.keys()) if (this.isOnline(p)) players++;
    return { seeks: seeks.slice(0, 20), players };
  }

  broadcastLobby() {
    const data = this.lobby();
    for (const p of this.profiles.keys()) if (this.isOnline(p)) this.push(p, 'lobby', data);
  }

  /** The player's app setting, reported on bootstrap and whenever it changes. */
  setSeekAlerts(passport, on) {
    if (on === true) this.seekAlerts.add(passport);
    else if (on === false) this.seekAlerts.delete(passport);
  }

  /** Phone notification to idle app users who opted in, when someone starts looking. Returns how many were told. */
  notifySeek(passport, me, tc) {
    if ([false, 0, 'false'].includes(this.cfg.seekNotifications)) return 0;
    const cooldown = Math.max(0, this.cfg.seekNotifyCooldownSeconds ?? 300) * 1000;
    const now = this.now();
    let told = 0;
    for (const p of this.profiles.keys()) {
      if (p === passport || !this.seekAlerts.has(p) || !this.isOnline(p) || this.playerGame.has(p) || this.queueOf(p)) continue;
      const last = this.seekNotified.get(p);
      if (last !== undefined && now - last < cooldown) continue;
      this.seekNotified.set(p, now);
      const l = this.localeOf(p);
      this.notify(p, msg(l, 'title'), msg(l, 'seek', { name: me.username, tc: tcText(l, tc) }));
      told++;
    }
    return told;
  }

  /** Called on every request: keeps presence fresh and restores a dropped player. */
  touch(passport) {
    const gameId = this.playerGame.get(passport);
    const game = gameId && this.games.get(gameId);
    if (!game) return;
    const color = this.colorOf(game, passport);
    if (color && game.disconnect[color]) {
      game.disconnect[color] = null;
      this.push(game[color === 'w' ? 'black' : 'white'], 'game:opponent', { id: game.id, connected: true, deadline: null });
    }
  }

  /** Tracks a background write so tests / shutdown can wait for it. */
  track(promise) {
    const p = Promise.resolve(promise).catch((err) => this.log('background task failed', err));
    this.pending.add(p);
    p.finally(() => this.pending.delete(p));
    return p;
  }

  async flush() {
    while (this.pending.size) await Promise.allSettled([...this.pending]);
  }

  // Requests -------------------------------------------------------------------------

  localeOf(passport) {
    return this.locales.get(passport) ?? toLocale(this.cfg.defaultLocale) ?? 'en';
  }

  setLocale(passport, value) {
    const l = toLocale(value);
    if (l) this.locales.set(passport, l);
  }

  async bootstrap({ passport, data = {} }) {
    this.setLocale(passport, data.locale);
    this.setSeekAlerts(passport, data.notifySeeks);
    this.touch(passport);
    const known = this.profiles.has(passport);
    const me = await this.profile(passport);
    // A new app user changes the player count everyone sees.
    if (me && !known) this.lobbyDirty = true;
    const gameId = this.playerGame.get(passport);
    const game = gameId ? this.games.get(gameId) : null;
    const incoming = [];
    const outgoing = [];
    for (const c of this.challenges.values()) {
      if (c.to === passport) incoming.push(this.challengeView(c));
      if (c.from === passport) outgoing.push(this.challengeView(c));
    }
    return {
      ok: true,
      me: this.publicProfile(me),
      game: game ? this.snapshot(game, passport) : null,
      queue: this.queueOf(passport),
      challenges: { incoming, outgoing },
      lobby: this.lobby(),
      serverTime: this.now(),
    };
  }

  async register({ passport, data }) {
    if (await this.profile(passport)) return fail('already_registered');
    const username = this.validName(data.username);
    if (!username) return fail('username_invalid');
    try {
      const row = await this.db.createPlayer(passport, username);
      this.profiles.set(passport, row);
      this.lobbyDirty = true;
      return { ok: true, me: this.publicProfile(row) };
    } catch (err) {
      if (err?.code === 'ER_DUP_PASSPORT') return fail('already_registered');
      if (err?.code === 'ER_DUP_ENTRY') return fail('username_taken');
      throw err;
    }
  }

  async checkName({ data }) {
    const username = this.validName(data.username);
    if (!username) return { ok: true, available: false, reason: 'username_invalid' };
    return { ok: true, available: !(await this.db.getPlayerByName(username)) };
  }

  async queueJoin({ passport, data }) {
    const me = await this.profile(passport);
    if (!me) return fail('no_profile');
    // Everything below is synchronous: no other request can interleave between the
    // checks and the game reservation, so a player can never be paired twice.
    if (this.playerGame.has(passport)) return fail('in_game');
    const tc = this.validTc(data.tc);
    if (!tc) return fail('invalid_tc');

    this.removeFromQueues(passport);
    const key = tcKey(tc);
    const list = this.queues.get(key) ?? [];
    const opponent = list.find((q) => q.passport !== passport && this.isOnline(q.passport) && !this.playerGame.has(q.passport));
    if (opponent) {
      list.splice(list.indexOf(opponent), 1);
      if (!list.length) this.queues.delete(key);
      this.removeFromQueues(opponent.passport);
      this.lobbyDirty = true;
      const oppProfile = this.profiles.get(opponent.passport) ?? opponent.profile;
      const mine = Math.random() < 0.5;
      this.startGame(mine ? passport : opponent.passport, mine ? opponent.passport : passport, tc, mine ? me : oppProfile, mine ? oppProfile : me);
      return { ok: true, matched: true };
    }
    const entry = { passport, profile: me, tc, since: this.now() };
    list.push(entry);
    this.queues.set(key, list);
    this.lobbyDirty = true;
    const notified = this.notifySeek(passport, me, tc);
    this.push(passport, 'queue:status', { queue: { tc, since: entry.since } });
    return { ok: true, matched: false, queue: { tc, since: entry.since }, notified };
  }

  async queueLeave({ passport }) {
    this.removeFromQueues(passport);
    this.push(passport, 'queue:status', { queue: null });
    return { ok: true };
  }

  async challengeSend({ passport, data }) {
    const tc = this.validTc(data.tc);
    if (!tc) return fail('invalid_tc');
    const username = this.validName(data.username);
    if (!username) return fail('not_found');
    const color = ['w', 'b', 'random'].includes(data.color) ? data.color : 'random';

    // All I/O first; the checks and the challenge creation below run without yielding.
    const me = await this.profile(passport);
    if (!me) return fail('no_profile');
    const target = await this.db.getPlayerByName(username);
    if (!target) return fail('not_found');
    const targetProfile = (await this.profile(target.passport)) ?? target;

    if (this.playerGame.has(passport)) return fail('in_game');
    if (target.passport === passport) return fail('self');
    if (!this.isOnline(target.passport)) return fail('offline');
    if (this.playerGame.has(target.passport)) return fail('busy');
    let outgoing = 0;
    for (const c of this.challenges.values()) {
      if (c.from === passport && c.to === target.passport) return fail('already_challenged');
      // Crossed challenges: accept the one already waiting for us.
      if (c.from === target.passport && c.to === passport) return this.challengeAccept({ passport, data: { id: c.id } });
      if (c.from === passport) outgoing++;
    }
    if (outgoing >= 5) return fail('too_many_challenges');

    // rematchOf is never taken from the client; only rematch() creates rematch challenges.
    return { ok: true, challenge: this.createChallenge(passport, me, target.passport, targetProfile, tc, color, null) };
  }

  createChallenge(from, fromProfile, to, toProfile, tc, color, rematchOf) {
    const c = {
      id: this.id('c'),
      from,
      to,
      fromProfile,
      toProfile,
      tc,
      color,
      rematchOf: rematchOf ?? null,
      expiresAt: this.now() + this.cfg.challengeExpireSeconds * 1000,
    };
    this.challenges.set(c.id, c);
    const view = this.challengeView(c);
    this.push(to, 'challenge:incoming', view);
    this.push(from, 'challenge:outgoing', view);
    const lang = this.localeOf(to);
    const body = rematchOf ? msg(lang, 'rematch', { name: fromProfile.username }) : msg(lang, 'challenge', { name: fromProfile.username, tc: tcText(lang, tc) });
    this.notify(to, msg(lang, 'title'), body);
    return view;
  }

  async challengeAccept({ passport, data }) {
    const c = this.challenges.get(String(data.id));
    if (!c || c.to !== passport) return fail('expired');
    if (c.expiresAt < this.now()) {
      this.expireChallenge(c, 'expired');
      return fail('expired');
    }
    if (this.playerGame.has(passport) || this.playerGame.has(c.from)) return fail('busy');
    if (!this.isOnline(c.from)) {
      this.expireChallenge(c, 'cancelled');
      return fail('offline');
    }
    this.challenges.delete(c.id);
    this.push(c.from, 'challenge:update', { id: c.id, status: 'accepted' });
    this.removeFromQueues(passport);
    this.removeFromQueues(c.from);
    const fromProfile = this.profiles.get(c.from) ?? c.fromProfile;
    const toProfile = this.profiles.get(c.to) ?? c.toProfile;
    const challengerWhite = c.color === 'w' || (c.color === 'random' && Math.random() < 0.5);
    const game = challengerWhite ? this.startGame(c.from, c.to, c.tc, fromProfile, toProfile) : this.startGame(c.to, c.from, c.tc, toProfile, fromProfile);
    // Other challenges involving either player are now moot.
    for (const o of this.challenges.values()) {
      if ([c.from, c.to].includes(o.from) || [c.from, c.to].includes(o.to)) this.expireChallenge(o, 'cancelled');
    }
    return { ok: true, gameId: game.id };
  }

  async challengeDecline({ passport, data }) {
    const c = this.challenges.get(String(data.id));
    if (!c || c.to !== passport) return { ok: true };
    this.challenges.delete(c.id);
    this.push(c.from, 'challenge:update', { id: c.id, status: 'declined', by: c.toProfile.username });
    this.push(c.to, 'challenge:update', { id: c.id, status: 'declined' });
    this.clearRematch(c);
    return { ok: true };
  }

  async challengeCancel({ passport, data }) {
    const c = this.challenges.get(String(data.id));
    if (!c || c.from !== passport) return { ok: true };
    this.expireChallenge(c, 'cancelled');
    return { ok: true };
  }

  expireChallenge(c, status) {
    if (!this.challenges.delete(c.id)) return;
    this.push(c.from, 'challenge:update', { id: c.id, status });
    this.push(c.to, 'challenge:update', { id: c.id, status });
    this.clearRematch(c);
  }

  clearRematch(c) {
    if (!c.rematchOf) return;
    const g = this.games.get(c.rematchOf);
    if (g?.rematch?.challengeId === c.id) {
      g.rematch = null;
      this.pushGame(g, 'game:rematch', () => ({ id: g.id, rematch: null }));
    }
  }

  // Games -------------------------------------------------------------------------------

  /** Synchronous on purpose: both players are reserved in the same tick as the caller's checks. */
  startGame(white, black, tc, wp, bp) {
    const now = this.now();
    const game = {
      id: this.id('g'),
      white,
      black,
      players: { w: this.playerRef(wp), b: this.playerRef(bp) },
      profileRefs: { w: wp, b: bp },
      tc,
      chess: new Chess(),
      initialFen: START_FEN,
      moves: [],
      clocks: { w: tc.base * 1000, b: tc.base * 1000 },
      turnStartedAt: now,
      firstMoveDeadline: now + this.cfg.firstMoveSeconds * 1000,
      drawOffer: null,
      status: 'playing',
      result: undefined,
      reason: undefined,
      rematch: null,
      // Chat state only: messages are relayed to the opponent and never kept here.
      // Players who already agreed to chat keep talking in their next games without asking again.
      chat: { status: this.chatPairs.has(pairKey(white, black)) ? 'open' : 'none', by: null, requestedAt: { w: 0, b: 0 }, sentAt: { w: 0, b: 0 } },
      disconnect: { w: null, b: null },
      startedAt: now,
    };
    this.games.set(game.id, game);
    this.playerGame.set(white, game.id);
    this.playerGame.set(black, game.id);
    this.pushGame(game, 'game:start', (p) => this.snapshot(game, p));
    this.pushGame(game, 'queue:status', () => ({ queue: null }));
    this.notify(white, msg(this.localeOf(white), 'title'), msg(this.localeOf(white), 'gameWhite', { name: bp.username }));
    this.notify(black, msg(this.localeOf(black), 'title'), msg(this.localeOf(black), 'gameBlack', { name: wp.username }));
    return game;
  }

  playingGame(passport, id) {
    const game = this.games.get(String(id));
    if (!game || this.colorOf(game, passport) === null) return { error: 'not_found' };
    if (game.status !== 'playing') return { error: 'game_over' };
    return { game, color: this.colorOf(game, passport) };
  }

  async move({ passport, data }) {
    this.touch(passport);
    const { game, color, error } = this.playingGame(passport, data.id);
    if (error) return fail(error);
    const from = String(data.from ?? '');
    const to = String(data.to ?? '');
    const promotion = data.promotion ? String(data.promotion) : undefined;
    if (!SQUARE.test(from) || !SQUARE.test(to) || (promotion && !/^[qrbn]$/.test(promotion))) return fail('illegal');
    if (game.chess.turn() !== color) return fail('not_your_turn');
    if (Number(data.ply) !== game.moves.length) return fail('stale');

    const now = this.now();
    const ply = game.moves.length;
    // Clocks run from each side's second move; the first moves only have a deadline.
    if (ply >= 2) {
      const left = game.clocks[color] - (now - game.turnStartedAt);
      if (left <= 0) {
        game.clocks[color] = 0;
        this.flag(game, color);
        return fail('game_over');
      }
      game.clocks[color] = left + game.tc.inc * 1000;
    }

    let mv;
    try {
      mv = game.chess.move(promotion ? { from, to, promotion } : { from, to });
    } catch {
      mv = null;
    }
    if (!mv) return fail('illegal');

    const record = { from: mv.from, to: mv.to, san: mv.san, ...(mv.promotion ? { promotion: mv.promotion } : {}) };
    game.moves.push(record);
    game.turnStartedAt = now;
    game.drawOffer = null;
    game.firstMoveDeadline = game.moves.length < 2 ? now + this.cfg.firstMoveSeconds * 1000 : null;

    this.pushGame(game, 'game:move', () => ({
      id: game.id,
      move: record,
      ply: game.moves.length,
      clocks: { ...game.clocks },
      turnStartedAt: game.turnStartedAt,
      serverTime: now,
      firstMoveDeadline: game.firstMoveDeadline,
      drawOffer: null,
    }));

    // isCheckmate/isStalemate each short-circuit on inCheck(), so exactly one move generation
    // runs; the draw checks are O(1)/board scans. isDraw() would redo all of them.
    const c = game.chess;
    if (c.isCheckmate()) this.finish(game, color === 'w' ? '1-0' : '0-1', 'checkmate');
    else if (c.isStalemate()) this.finish(game, '1/2-1/2', 'stalemate');
    else if (c.isInsufficientMaterial()) this.finish(game, '1/2-1/2', 'insufficient');
    else if (c.isThreefoldRepetition()) this.finish(game, '1/2-1/2', 'threefold');
    else if (c.isDrawByFiftyMoves()) this.finish(game, '1/2-1/2', 'fifty');
    return { ok: true };
  }

  hasMatingMaterial(game, color) {
    let minors = 0;
    for (const row of game.chess.board())
      for (const sq of row) {
        if (!sq || sq.color !== color || sq.type === 'k') continue;
        if (sq.type === 'p' || sq.type === 'r' || sq.type === 'q') return true;
        minors++;
      }
    return minors >= 2;
  }

  flag(game, color) {
    const winner = other(color);
    if (!this.hasMatingMaterial(game, winner)) return this.finish(game, '1/2-1/2', 'timeout_insufficient');
    return this.finish(game, winner === 'w' ? '1-0' : '0-1', 'timeout');
  }

  async resign({ passport, data }) {
    const { game, color, error } = this.playingGame(passport, data.id);
    if (error) return fail(error);
    if (game.moves.length < 2) this.finish(game, null, 'aborted');
    else this.finish(game, color === 'w' ? '0-1' : '1-0', 'resignation');
    return { ok: true };
  }

  async abort({ passport, data }) {
    const { game, error } = this.playingGame(passport, data.id);
    if (error) return fail(error);
    if (game.moves.length >= 2) return fail('cannot_abort');
    this.finish(game, null, 'aborted');
    return { ok: true };
  }

  async draw({ passport, data }) {
    const { game, color, error } = this.playingGame(passport, data.id);
    if (error) return fail(error);
    const action = data.action;
    if (action === 'offer' || action === 'accept') {
      if (game.drawOffer === other(color)) {
        this.finish(game, '1/2-1/2', 'agreement');
        return { ok: true };
      }
      if (action === 'accept') return fail('no_offer');
      if (game.moves.length < 2) return fail('too_early');
      if (game.drawOffer === color) return { ok: true };
      game.drawOffer = color;
      this.pushGame(game, 'game:draw', () => ({ id: game.id, offer: color }));
      return { ok: true };
    }
    if (action === 'decline' && game.drawOffer === other(color)) {
      game.drawOffer = null;
      this.pushGame(game, 'game:draw', () => ({ id: game.id, offer: null, declined: true }));
    }
    return { ok: true };
  }

  // Chat --------------------------------------------------------------------------------
  // Opt-in: one player asks, the other accepts. Messages go straight to the opponent's phone
  // and are never stored or logged; reopening the app shows an empty conversation.

  chatEnabled() {
    return ![false, 0, 'false'].includes(this.cfg.chat);
  }

  /** null when chat is turned off, so the app hides the chat button. */
  chatView(game) {
    return this.chatEnabled() ? { status: game.chat.status, by: game.chat.by } : null;
  }

  pushChat(game, extra = {}) {
    this.pushGame(game, 'game:chat', () => ({ id: game.id, chat: this.chatView(game), ...extra }));
  }

  openChat(game) {
    game.chat.status = 'open';
    game.chat.by = null;
    this.chatPairs.add(pairKey(game.white, game.black));
    this.pushChat(game);
    return { ok: true };
  }

  async chat({ passport, data }) {
    if (!this.chatEnabled()) return fail('chat_disabled');
    // Open during the game and while the finished game lingers (rematch window), so players can say "gg".
    const game = this.games.get(String(data.id));
    const color = game && this.colorOf(game, passport);
    if (!game || !color) return fail('not_found');
    const chat = game.chat;
    const theirs = other(color);
    const now = this.now();

    switch (data.action) {
      case 'request': {
        if (chat.status === 'open' || (chat.status === 'requested' && chat.by === color)) return { ok: true };
        if (chat.status === 'requested') return this.openChat(game);
        // A declined player can ask again, but not every few seconds.
        const wait = (this.cfg.chatRequestCooldownSeconds ?? 30) * 1000;
        if (chat.requestedAt[color] && now - chat.requestedAt[color] < wait) return fail('rate_limited');
        chat.requestedAt[color] = now;
        chat.status = 'requested';
        chat.by = color;
        this.pushChat(game);
        return { ok: true };
      }
      case 'accept':
        if (chat.status === 'open') return { ok: true };
        if (chat.status !== 'requested' || chat.by !== theirs) return fail('no_offer');
        return this.openChat(game);
      case 'decline':
        if (chat.status !== 'requested' || chat.by !== theirs) return { ok: true };
        chat.status = 'none';
        chat.by = null;
        this.pushChat(game, { declined: color });
        return { ok: true };
      case 'close':
        if (chat.status === 'none') return { ok: true };
        // Closing also withdraws a pending request.
        if (chat.status === 'requested' && chat.by !== color) return fail('no_offer');
        chat.status = 'none';
        chat.by = null;
        // Ending the chat is final for this pair: the next game needs a new request.
        this.chatPairs.delete(pairKey(game.white, game.black));
        this.pushChat(game, { closed: color });
        return { ok: true };
      case 'send': {
        if (chat.status !== 'open') return fail('chat_closed');
        const text = this.chatText(data.text);
        if (!text) return fail('invalid_message');
        if (now - chat.sentAt[color] < 400) return fail('rate_limited');
        chat.sentAt[color] = now;
        this.push(color === 'w' ? game.black : game.white, 'chat:message', { id: game.id, from: color, text, at: now });
        return { ok: true, text, at: now };
      }
      default:
        return fail('bad_request');
    }
  }

  /**
   * Single line, trimmed to the configured length. Empty -> null.
   * Control characters become spaces; invisible formatting characters (zero-width, bidi
   * overrides/isolates, BOM) are dropped so a message can't render reversed or hide text.
   */
  chatText(value) {
    if (typeof value !== 'string') return null;
    const max = this.cfg.chatMaxLength ?? 200;
    const text = Array.from(
      value
        // ZWJ/ZWNJ (\u200c\u200d) stay: emoji sequences and some scripts need them.
        .replace(/[\u00ad\u061c\u180e\u200b\u200e\u200f\u202a-\u202e\u2060-\u206f\ufeff\ufff9-\ufffb]/g, '')
        .replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim(),
    )
      .slice(0, max)
      .join('');
    return text || null;
  }

  async rematch({ passport, data }) {
    const game = this.games.get(String(data.id));
    const color = game && this.colorOf(game, passport);
    if (!game || !color || game.status !== 'ended') return fail('not_found');
    if (this.playerGame.has(passport)) return fail('in_game');
    const opp = color === 'w' ? game.black : game.white;
    if (game.rematch) {
      // The opponent already asked: this is an accept.
      if (game.rematch.by !== color) return this.challengeAccept({ passport, data: { id: game.rematch.challengeId } });
      return { ok: true };
    }
    const me = (await this.profile(passport)) ?? game.profileRefs[color];
    const oppProfile = (await this.profile(opp)) ?? game.profileRefs[other(color)];
    // Re-check after the awaits: another request may have changed state meanwhile.
    if (game.rematch) return { ok: true };
    if (this.playerGame.has(passport)) return fail('in_game');
    if (!this.isOnline(opp)) return fail('offline');
    if (this.playerGame.has(opp)) return fail('busy');
    // Colours swap: the requester takes the other side.
    const c = this.createChallenge(passport, me, opp, oppProfile, game.tc, other(color), game.id);
    game.rematch = { by: color, challengeId: c.id };
    this.pushGame(game, 'game:rematch', () => ({ id: game.id, rematch: game.rematch }));
    return { ok: true };
  }

  /**
   * Ends a game. Synchronous: the in-memory state and the game:end push happen immediately,
   * persistence runs in the background so a slow database never stalls moves or the tick loop.
   */
  finish(game, result, reason) {
    if (game.status !== 'playing') return;
    game.status = 'ended';
    game.reason = reason;
    game.drawOffer = null;
    game.firstMoveDeadline = null;
    // Freeze the side to move's clock at the moment the game ended.
    if (game.moves.length >= 2) {
      const side = game.chess.turn();
      game.clocks[side] = Math.max(0, game.clocks[side] - (this.now() - game.turnStartedAt));
    }
    this.playerGame.delete(game.white);
    this.playerGame.delete(game.black);
    // Keep ended games around briefly so rematches and late snapshots work.
    game.expiresAt = this.now() + 5 * 60 * 1000;

    let rated = false;
    if (reason === 'aborted') {
      game.result = undefined;
    } else {
      game.result = result;
      try {
        rated = this.applyResult(game, result, reason);
      } catch (err) {
        this.log('failed to apply result', err);
      }
    }

    this.pushGame(game, 'game:end', (p) => ({
      id: game.id,
      result: game.result,
      reason,
      rated,
      clocks: { ...game.clocks },
      me: this.publicProfile(this.profiles.get(p) ?? game.profileRefs[this.colorOf(game, p)]),
    }));
  }

  /** Anti win-trading: short games and repeated games between the same pair don't count. */
  isRated(game) {
    if (game.moves.length < (this.cfg.minRatedPlies ?? 0)) return false;
    const cap = this.cfg.maxRatedGamesPerPairPerHour ?? 0;
    if (!cap) return true;
    const key = pairKey(game.white, game.black);
    const now = this.now();
    const recent = (this.pairGames.get(key) ?? []).filter((t) => now - t < HOUR);
    if (recent.length >= cap) {
      this.pairGames.set(key, recent);
      return false;
    }
    recent.push(now);
    this.pairGames.set(key, recent);
    return true;
  }

  /** Updates cached stats right away and persists in the background. Returns whether the game was rated. */
  applyResult(game, result, reason) {
    const rated = this.isRated(game);
    const sw = result === '1-0' ? 1 : result === '0-1' ? 0 : 0.5;

    if (rated) {
      const update = (p, score) => {
        if (!p) return;
        p.games += 1;
        if (score === 1) p.wins += 1;
        else if (score === 0) p.losses += 1;
        else p.draws += 1;
      };
      update(this.profiles.get(game.white) ?? game.profileRefs.w, sw);
      update(this.profiles.get(game.black) ?? game.profileRefs.b, 1 - sw);
      for (const key of this.rankCache.keys()) if (key.endsWith(`:${game.white}`) || key.endsWith(`:${game.black}`)) this.rankCache.delete(key);
    }

    // Only built when game history is kept; without it the database just gets the stats.
    let record = null;
    if (this.keepHistory) {
      // The live chess.js instance already holds the full history.
      const pgnGame = game.chess;
      pgnGame.setHeader('Event', 'LB Chess');
      pgnGame.setHeader('Site', 'Los Santos');
      pgnGame.setHeader('Date', new Date(game.startedAt).toISOString().slice(0, 10).replace(/-/g, '.'));
      pgnGame.setHeader('White', game.players.w.username);
      pgnGame.setHeader('Black', game.players.b.username);
      pgnGame.setHeader('Result', result);
      pgnGame.setHeader('TimeControl', tcKey(game.tc));
      pgnGame.setHeader('Termination', reason);

      record = {
        white: game.white,
        black: game.black,
        whiteName: game.players.w.username,
        blackName: game.players.b.username,
        result,
        reason,
        tc: tcKey(game.tc),
        moves: game.moves.length,
        pgn: pgnGame.pgn(),
      };
    }
    const scores = rated
      ? [
          [game.white, sw],
          [game.black, 1 - sw],
        ]
      : null;
    // Unrated and no history kept: nothing to persist.
    if (!record && !scores) return rated;
    this.track(
      this.db.recordGame(record, scores).catch((err) => {
        this.log('failed to persist game', err);
        // Cached stats may now be ahead of the database: reload them on next access.
        if (!this.playerGame.has(game.white)) this.profiles.delete(game.white);
        if (!this.playerGame.has(game.black)) this.profiles.delete(game.black);
      }),
    );
    return rated;
  }

  async state({ passport, data }) {
    const game = this.games.get(String(data.id));
    if (!game || !this.colorOf(game, passport)) return fail('not_found');
    this.touch(passport);
    return { ok: true, game: this.snapshot(game, passport) };
  }

  // Social ---------------------------------------------------------------------------------

  cacheTtl() {
    return (this.cfg.leaderboardCacheSeconds ?? 30) * 1000;
  }

  async leaderboardRows(sort, min) {
    const hit = this.lbCache.get(sort);
    if (hit && this.now() - hit.at < this.cacheTtl()) return hit.rows;
    const rows = await this.db.leaderboard(sort, min, this.cfg.leaderboardSize);
    this.lbCache.set(sort, { at: this.now(), rows });
    return rows;
  }

  async rankOf(p, sort, min) {
    if (!p) return null;
    const key = `${sort}:${p.passport}`;
    const hit = this.rankCache.get(key);
    if (hit && this.now() - hit.at < this.cacheTtl()) return hit.rank;
    const rank = await this.db.rankOf(p, sort, min);
    this.rankCache.set(key, { at: this.now(), rank });
    return rank;
  }

  async leaderboard({ passport, data }) {
    const sort = ['games', 'winrate', 'wins'].includes(data.sort) ? data.sort : 'games';
    const min = this.cfg.leaderboardMinGames;
    const rows = await this.leaderboardRows(sort, min);
    const me = await this.profile(passport);
    return {
      ok: true,
      sort,
      minGames: min,
      rows: rows.map((p, i) => ({ rank: i + 1, ...this.row(p) })),
      me: me ? { rank: await this.rankOf(me, sort, min), ...this.row(me) } : null,
    };
  }

  row(p) {
    return {
      username: p.username,
      games: p.games,
      wins: p.wins,
      losses: p.losses,
      draws: p.draws,
      winRate: p.games ? Math.round((p.wins / p.games) * 1000) / 10 : 0,
      online: this.isOnline(p.passport),
    };
  }

  async profileInfo({ passport, data }) {
    let target;
    if (data.username !== undefined && data.username !== null && data.username !== '') {
      const username = this.validName(data.username);
      if (!username) return fail('not_found');
      target = await this.db.getPlayerByName(username);
    } else {
      target = await this.profile(passport);
    }
    if (!target) return fail('not_found');
    const fresh = this.profiles.get(target.passport) ?? target;
    const games = this.keepHistory ? await this.db.recentGames(target.passport, 15) : [];
    return {
      ok: true,
      historyEnabled: this.keepHistory,
      profile: this.publicProfile(fresh),
      isMe: target.passport === passport,
      online: this.isOnline(target.passport),
      playing: this.playerGame.has(target.passport),
      rank: await this.rankOf(fresh, 'games', this.cfg.leaderboardMinGames),
      // PGNs are not included; the app fetches one with game:pgn when a game is opened.
      games: games.map((g) => ({
        id: g.id,
        white: g.whiteName,
        black: g.blackName,
        result: g.result,
        reason: g.reason,
        tc: g.tc,
        moves: g.moves,
        createdAt: g.createdAt,
      })),
    };
  }

  async gamePgn({ data }) {
    // Rows saved before saveGames was turned off stay in the database but are no longer served.
    if (!this.keepHistory) return fail('not_found');
    const id = Number(data.id);
    if (!Number.isSafeInteger(id) || id <= 0) return fail('not_found');
    const pgn = await this.db.getGamePgn(id);
    return pgn ? { ok: true, pgn } : fail('not_found');
  }

  async search({ passport, data }) {
    const q = String(data.q ?? '').trim();
    if (!q || q.length > this.cfg.usernameMax || !USERNAME.test(q)) return { ok: true, players: [] };
    const rows = await this.db.searchPlayers(q, 8);
    return {
      ok: true,
      players: rows
        .filter((p) => p.passport !== passport)
        .map((p) => ({ username: p.username, online: this.isOnline(p.passport), playing: this.playerGame.has(p.passport) })),
    };
  }

  // Lifecycle --------------------------------------------------------------------------------

  onDisconnect(passport) {
    this.removeFromQueues(passport);
    // Chat consent lasts only while both players stay on the server.
    for (const key of this.chatPairs) if (key.split(':').map(Number).includes(passport)) this.chatPairs.delete(key);
    for (const c of this.challenges.values()) if (c.from === passport || c.to === passport) this.expireChallenge(c, 'cancelled');
    const gameId = this.playerGame.get(passport);
    const game = gameId && this.games.get(gameId);
    if (!game) {
      if (this.profiles.delete(passport)) this.lobbyDirty = true;
      this.locales.delete(passport);
      this.seekNotified.delete(passport);
      this.seekAlerts.delete(passport);
      return;
    }
    const color = this.colorOf(game, passport);
    // Never give a leaver more grace than their own clock (bullet players can't stall for a minute).
    let grace = this.cfg.disconnectGraceSeconds * 1000;
    if (game.moves.length >= 2) grace = Math.min(grace, Math.max(this.cfg.minDisconnectGraceSeconds ?? 10, 0) * 1000 + Math.max(0, this.remaining(game, color)));
    const deadline = this.now() + grace;
    game.disconnect[color] = deadline;
    this.push(color === 'w' ? game.black : game.white, 'game:opponent', { id: game.id, connected: false, deadline });
  }

  /** Drops cached data of players that left without a disconnect event reaching us. */
  sweep(now) {
    for (const passport of this.profiles.keys()) {
      if (this.playerGame.has(passport) || this.isOnline(passport)) continue;
      this.profiles.delete(passport);
      this.locales.delete(passport);
      this.lobbyDirty = true;
    }
    for (const passport of this.seekNotified.keys()) if (!this.profiles.has(passport)) this.seekNotified.delete(passport);
    for (const passport of this.seekAlerts) if (!this.profiles.has(passport) && !this.isOnline(passport)) this.seekAlerts.delete(passport);
    for (const key of this.chatPairs) if (key.split(':').some((p) => !this.isOnline(Number(p)))) this.chatPairs.delete(key);
    // Seeks of players that vanished without a disconnect event.
    for (const list of this.queues.values()) for (const q of [...list]) if (!this.isOnline(q.passport)) this.removeFromQueues(q.passport);
    for (const passport of this.locales.keys()) if (!this.profiles.has(passport) && !this.isOnline(passport)) this.locales.delete(passport);
    for (const [key, list] of this.pairGames) {
      const recent = list.filter((t) => now - t < HOUR);
      if (recent.length) this.pairGames.set(key, recent);
      else this.pairGames.delete(key);
    }
    for (const [key, v] of this.rankCache) if (now - v.at >= this.cacheTtl()) this.rankCache.delete(key);
  }

  prune() {
    const days = this.cfg.gameHistoryDays ?? 0;
    if (!days || this.pruning || !this.db.pruneGames) return;
    this.pruning = true;
    this.track(
      (async () => {
        let removed = 0;
        let n;
        do {
          n = await this.db.pruneGames(days, 1000);
          removed += n;
        } while (n >= 1000);
        if (removed) this.log(`pruned ${removed} old games`);
      })().finally(() => {
        this.pruning = false;
      }),
    );
  }

  async tick() {
    const now = this.now();
    // Maps tolerate deleting the current entry while iterating, so no copies are needed.
    for (const c of this.challenges.values()) if (c.expiresAt <= now) this.expireChallenge(c, 'expired');

    for (const game of this.games.values()) {
      try {
        this.tickGame(game, now);
      } catch (err) {
        this.log(`tick failed for game ${game.id}`, err);
      }
    }

    if (now - this.lastSweep >= SWEEP_INTERVAL) {
      this.lastSweep = now;
      this.sweep(now);
    }
    if (this.lobbyDirty) {
      this.lobbyDirty = false;
      this.broadcastLobby();
    }
    if (now - this.lastPrune >= HOUR) {
      this.lastPrune = now;
      this.prune();
    }
  }

  tickGame(game, now) {
    if (game.status !== 'playing') {
      if (game.expiresAt && game.expiresAt <= now) this.games.delete(game.id);
      return;
    }
    if (game.firstMoveDeadline && game.firstMoveDeadline <= now) {
      this.finish(game, null, 'aborted');
      return;
    }
    if (game.moves.length >= 2) {
      const side = game.chess.turn();
      if (game.clocks[side] - (now - game.turnStartedAt) <= 0) {
        game.clocks[side] = 0;
        this.flag(game, side);
        return;
      }
    }
    for (const color of ['w', 'b']) {
      const d = game.disconnect[color];
      if (d && d <= now) {
        if (game.moves.length < 2) this.finish(game, null, 'aborted');
        else this.finish(game, color === 'w' ? '0-1' : '1-0', 'abandoned');
        return;
      }
    }
  }

  /** Request name -> handler map used by the transport layer. */
  handlers() {
    return {
      ping: async () => ({ ok: true, serverTime: this.now() }),
      locale: async ({ passport, data }) => {
        this.setLocale(passport, data.locale);
        return { ok: true };
      },
      prefs: async ({ passport, data }) => {
        this.setSeekAlerts(passport, data.notifySeeks);
        return { ok: true };
      },
      bootstrap: (ctx) => this.bootstrap(ctx),
      register: (ctx) => this.register(ctx),
      checkName: (ctx) => this.checkName(ctx),
      'queue:join': (ctx) => this.queueJoin(ctx),
      'queue:leave': (ctx) => this.queueLeave(ctx),
      'challenge:send': (ctx) => this.challengeSend(ctx),
      'challenge:accept': (ctx) => this.challengeAccept(ctx),
      'challenge:decline': (ctx) => this.challengeDecline(ctx),
      'challenge:cancel': (ctx) => this.challengeCancel(ctx),
      'game:move': (ctx) => this.move(ctx),
      'game:resign': (ctx) => this.resign(ctx),
      'game:abort': (ctx) => this.abort(ctx),
      'game:draw': (ctx) => this.draw(ctx),
      'game:rematch': (ctx) => this.rematch(ctx),
      'game:chat': (ctx) => this.chat(ctx),
      'game:state': (ctx) => this.state(ctx),
      'game:pgn': (ctx) => this.gamePgn(ctx),
      leaderboard: (ctx) => this.leaderboard(ctx),
      profile: (ctx) => this.profileInfo(ctx),
      search: (ctx) => this.search(ctx),
    };
  }
}
