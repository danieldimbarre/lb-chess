import { Chess } from 'chess.js';
import { msg, tcText, toLocale } from './i18n.js';

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const SQUARE = /^[a-h][1-8]$/;
const USERNAME = /^[A-Za-z0-9_]+$/;

const fail = (error) => ({ ok: false, error });
const other = (c) => (c === 'w' ? 'b' : 'w');
const tcKey = (tc) => `${tc.base}+${tc.inc}`;

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
    this.log = log;

    /** @type {Map<number, any>} passport -> profile row */
    this.profiles = new Map();
    /** passport -> 'en' | 'pt', reported by the phone app */
    this.locales = new Map();
    /** @type {Map<string, {passport:number, tc:any, since:number}[]>} */
    this.queues = new Map();
    this.challenges = new Map();
    this.games = new Map();
    /** passport -> game id (only while playing) */
    this.playerGame = new Map();
    this.seq = 0;
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
    return removed;
  }

  queueOf(passport) {
    for (const list of this.queues.values()) {
      const q = list.find((e) => e.passport === passport);
      if (q) return { tc: q.tc, since: q.since };
    }
    return null;
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
    this.touch(passport);
    const me = await this.profile(passport);
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
      serverTime: this.now(),
    };
  }

  async register({ passport, data }) {
    if (await this.profile(passport)) return fail('already_registered');
    const username = String(data.username ?? '').trim();
    if (username.length < this.cfg.usernameMin || username.length > this.cfg.usernameMax || !USERNAME.test(username)) return fail('username_invalid');
    try {
      const row = await this.db.createPlayer(passport, username);
      this.profiles.set(passport, row);
      return { ok: true, me: this.publicProfile(row) };
    } catch (err) {
      if (err?.code === 'ER_DUP_ENTRY') return fail('username_taken');
      throw err;
    }
  }

  async checkName({ data }) {
    const username = String(data.username ?? '').trim();
    if (username.length < this.cfg.usernameMin || username.length > this.cfg.usernameMax || !USERNAME.test(username)) return { ok: true, available: false, reason: 'username_invalid' };
    return { ok: true, available: !(await this.db.getPlayerByName(username)) };
  }

  async queueJoin({ passport, data }) {
    const me = await this.profile(passport);
    if (!me) return fail('no_profile');
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
      const [white, black] = Math.random() < 0.5 ? [passport, opponent.passport] : [opponent.passport, passport];
      await this.startGame(white, black, tc);
      return { ok: true, matched: true };
    }
    const entry = { passport, tc, since: this.now() };
    list.push(entry);
    this.queues.set(key, list);
    this.push(passport, 'queue:status', { queue: { tc, since: entry.since } });
    return { ok: true, matched: false, queue: { tc, since: entry.since } };
  }

  async queueLeave({ passport }) {
    this.removeFromQueues(passport);
    this.push(passport, 'queue:status', { queue: null });
    return { ok: true };
  }

  async challengeSend({ passport, data }) {
    const me = await this.profile(passport);
    if (!me) return fail('no_profile');
    if (this.playerGame.has(passport)) return fail('in_game');
    const tc = this.validTc(data.tc);
    if (!tc) return fail('invalid_tc');
    const color = ['w', 'b', 'random'].includes(data.color) ? data.color : 'random';

    const target = await this.db.getPlayerByName(String(data.username ?? '').trim());
    if (!target) return fail('not_found');
    if (target.passport === passport) return fail('self');
    if (!this.isOnline(target.passport)) return fail('offline');
    if (this.playerGame.has(target.passport)) return fail('busy');
    for (const c of this.challenges.values()) {
      if (c.from === passport && c.to === target.passport) return fail('already_challenged');
      // Crossed challenges: accept the one already waiting for us.
      if (c.from === target.passport && c.to === passport && !data.rematchOf) return this.challengeAccept({ passport, data: { id: c.id } });
    }
    const outgoing = [...this.challenges.values()].filter((c) => c.from === passport).length;
    if (outgoing >= 5) return fail('too_many_challenges');

    const targetProfile = (await this.profile(target.passport)) ?? target;
    return { ok: true, challenge: this.createChallenge(passport, me, target.passport, targetProfile, tc, color, data.rematchOf) };
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
    const challengerWhite = c.color === 'w' || (c.color === 'random' && Math.random() < 0.5);
    const game = await this.startGame(challengerWhite ? c.from : c.to, challengerWhite ? c.to : c.from, c.tc);
    // Other challenges involving either player are now moot.
    for (const o of [...this.challenges.values()]) {
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

  async startGame(white, black, tc) {
    const wp = await this.profile(white);
    const bp = await this.profile(black);
    const now = this.now();
    const game = {
      id: this.id('g'),
      white,
      black,
      players: { w: this.playerRef(wp), b: this.playerRef(bp) },
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
    if (!SQUARE.test(from) || !SQUARE.test(to) || (promotion && !'qrbn'.includes(promotion) || (promotion && promotion.length !== 1))) return fail('illegal');
    if (game.chess.turn() !== color) return fail('not_your_turn');
    if (Number(data.ply) !== game.moves.length) return fail('stale');

    const now = this.now();
    const ply = game.moves.length;
    // Clocks run from each side's second move; the first moves only have a deadline.
    if (ply >= 2) {
      const left = game.clocks[color] - (now - game.turnStartedAt);
      if (left <= 0) {
        game.clocks[color] = 0;
        await this.flag(game, color);
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

    const c = game.chess;
    if (c.isCheckmate()) await this.finish(game, color === 'w' ? '1-0' : '0-1', 'checkmate');
    else if (c.isStalemate()) await this.finish(game, '1/2-1/2', 'stalemate');
    else if (c.isInsufficientMaterial()) await this.finish(game, '1/2-1/2', 'insufficient');
    else if (c.isThreefoldRepetition()) await this.finish(game, '1/2-1/2', 'threefold');
    else if (c.isDraw()) await this.finish(game, '1/2-1/2', 'fifty');
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

  async flag(game, color) {
    const winner = other(color);
    if (!this.hasMatingMaterial(game, winner)) return this.finish(game, '1/2-1/2', 'timeout_insufficient');
    return this.finish(game, winner === 'w' ? '1-0' : '0-1', 'timeout');
  }

  async resign({ passport, data }) {
    const { game, color, error } = this.playingGame(passport, data.id);
    if (error) return fail(error);
    if (game.moves.length < 2) await this.finish(game, null, 'aborted');
    else await this.finish(game, color === 'w' ? '0-1' : '1-0', 'resignation');
    return { ok: true };
  }

  async abort({ passport, data }) {
    const { game, error } = this.playingGame(passport, data.id);
    if (error) return fail(error);
    if (game.moves.length >= 2) return fail('cannot_abort');
    await this.finish(game, null, 'aborted');
    return { ok: true };
  }

  async draw({ passport, data }) {
    const { game, color, error } = this.playingGame(passport, data.id);
    if (error) return fail(error);
    const action = data.action;
    if (action === 'offer' || action === 'accept') {
      if (game.drawOffer === other(color)) {
        await this.finish(game, '1/2-1/2', 'agreement');
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
    const me = await this.profile(passport);
    const oppProfile = await this.profile(opp);
    if (!this.isOnline(opp)) return fail('offline');
    if (this.playerGame.has(opp)) return fail('busy');
    // Colours swap: the requester takes the other side.
    const c = this.createChallenge(passport, me, opp, oppProfile, game.tc, other(color), game.id);
    game.rematch = { by: color, challengeId: c.id };
    this.pushGame(game, 'game:rematch', () => ({ id: game.id, rematch: game.rematch }));
    return { ok: true };
  }

  async finish(game, result, reason) {
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

    if (reason === 'aborted') {
      game.result = undefined;
    } else {
      game.result = result;
      await this.applyResult(game, result, reason);
    }

    this.pushGame(game, 'game:end', (p) => ({
      id: game.id,
      result: game.result,
      reason,
      clocks: { ...game.clocks },
      me: this.publicProfile(this.profiles.get(p)),
    }));
    // Keep ended games around briefly so rematches and late snapshots work.
    game.expiresAt = this.now() + 5 * 60 * 1000;
  }

  async applyResult(game, result, reason) {
    const wp = await this.profile(game.white);
    const bp = await this.profile(game.black);
    const update = (p, score) => {
      p.games += 1;
      if (score === 1) p.wins += 1;
      else if (score === 0) p.losses += 1;
      else p.draws += 1;
    };
    const sw = result === '1-0' ? 1 : result === '0-1' ? 0 : 0.5;
    update(wp, sw);
    update(bp, 1 - sw);

    // The live chess.js instance already holds the full history.
    const pgnGame = game.chess;
    pgnGame.setHeader('Event', 'LB Chess');
    pgnGame.setHeader('Site', 'Los Santos');
    pgnGame.setHeader('Date', new Date(game.startedAt).toISOString().slice(0, 10).replace(/-/g, '.'));
    pgnGame.setHeader('White', game.players.w.username);
    pgnGame.setHeader('Black', game.players.b.username);
    pgnGame.setHeader('Result', result);
    pgnGame.setHeader('TimeControl', `${game.tc.base}+${game.tc.inc}`);
    pgnGame.setHeader('Termination', reason);

    try {
      await this.db.updatePlayer(game.white, wp);
      await this.db.updatePlayer(game.black, bp);
      await this.db.insertGame({
        white: game.white,
        black: game.black,
        whiteName: game.players.w.username,
        blackName: game.players.b.username,
        result,
        reason,
        tc: `${game.tc.base}+${game.tc.inc}`,
        moves: game.moves.length,
        pgn: pgnGame.pgn(),
      });
    } catch (err) {
      this.log('failed to persist game', err);
    }
  }

  async state({ passport, data }) {
    const game = this.games.get(String(data.id));
    if (!game || !this.colorOf(game, passport)) return fail('not_found');
    this.touch(passport);
    return { ok: true, game: this.snapshot(game, passport) };
  }

  // Social ---------------------------------------------------------------------------------

  async leaderboard({ passport, data }) {
    const sort = ['games', 'winrate', 'wins'].includes(data.sort) ? data.sort : 'games';
    const min = this.cfg.leaderboardMinGames;
    const rows = await this.db.leaderboard(sort, min, this.cfg.leaderboardSize);
    const me = await this.profile(passport);
    return {
      ok: true,
      sort,
      minGames: min,
      rows: rows.map((p, i) => ({ rank: i + 1, ...this.row(p) })),
      me: me ? { rank: await this.db.rankOf(passport, sort, min), ...this.row(me) } : null,
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
    const target = data.username ? await this.db.getPlayerByName(String(data.username)) : await this.profile(passport);
    if (!target) return fail('not_found');
    const fresh = this.profiles.get(target.passport) ?? target;
    const games = await this.db.recentGames(target.passport, 15);
    return {
      ok: true,
      profile: this.publicProfile(fresh),
      isMe: target.passport === passport,
      online: this.isOnline(target.passport),
      playing: this.playerGame.has(target.passport),
      rank: await this.db.rankOf(target.passport, 'games', this.cfg.leaderboardMinGames),
      games: games.map((g) => ({
        id: g.id,
        white: g.whiteName,
        black: g.blackName,
        result: g.result,
        reason: g.reason,
        tc: g.tc,
        moves: g.moves,
        pgn: g.pgn,
        createdAt: g.createdAt,
      })),
    };
  }

  async search({ passport, data }) {
    const q = String(data.q ?? '').trim();
    if (!q || !USERNAME.test(q)) return { ok: true, players: [] };
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
    for (const c of [...this.challenges.values()]) if (c.from === passport || c.to === passport) this.expireChallenge(c, 'cancelled');
    const gameId = this.playerGame.get(passport);
    const game = gameId && this.games.get(gameId);
    if (!game) return;
    const color = this.colorOf(game, passport);
    const deadline = this.now() + this.cfg.disconnectGraceSeconds * 1000;
    game.disconnect[color] = deadline;
    this.push(color === 'w' ? game.black : game.white, 'game:opponent', { id: game.id, connected: false, deadline });
  }

  async tick() {
    const now = this.now();
    for (const c of [...this.challenges.values()]) if (c.expiresAt <= now) this.expireChallenge(c, 'expired');

    for (const game of [...this.games.values()]) {
      if (game.status !== 'playing') {
        if (game.expiresAt && game.expiresAt <= now) this.games.delete(game.id);
        continue;
      }
      if (game.firstMoveDeadline && game.firstMoveDeadline <= now) {
        await this.finish(game, null, 'aborted');
        continue;
      }
      if (game.moves.length >= 2) {
        const side = game.chess.turn();
        if (game.clocks[side] - (now - game.turnStartedAt) <= 0) {
          game.clocks[side] = 0;
          await this.flag(game, side);
          continue;
        }
      }
      for (const color of ['w', 'b']) {
        const d = game.disconnect[color];
        if (d && d <= now) {
          if (game.moves.length < 2) await this.finish(game, null, 'aborted');
          else await this.finish(game, color === 'w' ? '0-1' : '1-0', 'abandoned');
          break;
        }
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
      'game:state': (ctx) => this.state(ctx),
      leaderboard: (ctx) => this.leaderboard(ctx),
      profile: (ctx) => this.profileInfo(ctx),
      search: (ctx) => this.search(ctx),
    };
  }
}
