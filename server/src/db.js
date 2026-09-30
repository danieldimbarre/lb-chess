/* global globalThis */
/** oxmysql implementation of the database adapter. */

function call(method, sql, params = []) {
  return new Promise((resolve, reject) => {
    try {
      globalThis.exports.oxmysql[method](sql, params, (result) => resolve(result));
    } catch (err) {
      reject(err);
    }
  });
}

const query = (sql, params) => call('query', sql, params);
const single = async (sql, params) => (await query(sql, params))?.[0] ?? null;

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS chess_players (
    passport INT NOT NULL PRIMARY KEY,
    username VARCHAR(16) NOT NULL,
    rating INT NOT NULL DEFAULT 1200,
    peak INT NOT NULL DEFAULT 1200,
    games INT NOT NULL DEFAULT 0,
    wins INT NOT NULL DEFAULT 0,
    losses INT NOT NULL DEFAULT 0,
    draws INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_chess_username (username),
    KEY idx_chess_games (games),
    KEY idx_chess_rating (rating)
  ) DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS chess_games (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    white INT NOT NULL,
    black INT NOT NULL,
    white_name VARCHAR(16) NOT NULL,
    black_name VARCHAR(16) NOT NULL,
    white_rating INT NOT NULL,
    black_rating INT NOT NULL,
    white_delta INT NOT NULL DEFAULT 0,
    black_delta INT NOT NULL DEFAULT 0,
    result VARCHAR(7) NOT NULL,
    reason VARCHAR(24) NOT NULL,
    time_control VARCHAR(12) NOT NULL,
    moves INT NOT NULL DEFAULT 0,
    pgn TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_chess_white (white),
    KEY idx_chess_black (black)
  ) DEFAULT CHARSET=utf8mb4`,
];

const PLAYER_COLS = 'passport, username, rating, peak, games, wins, losses, draws, UNIX_TIMESTAMP(created_at) * 1000 AS createdAt';

const mapGame = (r) => ({
  id: r.id,
  white: r.white,
  black: r.black,
  whiteName: r.white_name,
  blackName: r.black_name,
  whiteRating: r.white_rating,
  blackRating: r.black_rating,
  whiteDelta: r.white_delta,
  blackDelta: r.black_delta,
  result: r.result,
  reason: r.reason,
  tc: r.time_control,
  moves: r.moves,
  pgn: r.pgn,
  createdAt: Number(r.createdAt),
});

const ORDER = {
  games: 'games DESC, wins DESC, rating DESC',
  winrate: '(wins / games) DESC, games DESC',
  rating: 'rating DESC, games DESC',
};
const WHERE = {
  games: '1 = 1',
  winrate: 'games >= ?',
  rating: 'games > 0',
};

export function createMysqlDb() {
  return {
    async init() {
      for (const sql of SCHEMA) await query(sql);
    },
    getPlayer: (passport) => single(`SELECT ${PLAYER_COLS} FROM chess_players WHERE passport = ?`, [passport]),
    getPlayerByName: (username) => single(`SELECT ${PLAYER_COLS} FROM chess_players WHERE username = ?`, [username]),
    async createPlayer(passport, username, rating) {
      const res = await query('INSERT IGNORE INTO chess_players (passport, username, rating, peak) VALUES (?, ?, ?, ?)', [passport, username, rating, rating]);
      if (!res || !res.affectedRows) throw Object.assign(new Error('dup'), { code: 'ER_DUP_ENTRY' });
      return single(`SELECT ${PLAYER_COLS} FROM chess_players WHERE passport = ?`, [passport]);
    },
    async updatePlayer(passport, f) {
      await query('UPDATE chess_players SET rating = ?, peak = ?, games = ?, wins = ?, losses = ?, draws = ? WHERE passport = ?', [
        f.rating,
        f.peak,
        f.games,
        f.wins,
        f.losses,
        f.draws,
        passport,
      ]);
    },
    async insertGame(g) {
      const res = await query(
        `INSERT INTO chess_games (white, black, white_name, black_name, white_rating, black_rating, white_delta, black_delta, result, reason, time_control, moves, pgn)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [g.white, g.black, g.whiteName, g.blackName, g.whiteRating, g.blackRating, g.whiteDelta, g.blackDelta, g.result, g.reason, g.tc, g.moves, g.pgn],
      );
      return res?.insertId ?? 0;
    },
    async leaderboard(sort, minGames, limit) {
      const params = sort === 'winrate' ? [minGames, limit] : [limit];
      return (await query(`SELECT ${PLAYER_COLS} FROM chess_players WHERE ${WHERE[sort]} ORDER BY ${ORDER[sort]} LIMIT ?`, params)) ?? [];
    },
    async rankOf(passport, sort, minGames) {
      const me = await single(`SELECT ${PLAYER_COLS} FROM chess_players WHERE passport = ?`, [passport]);
      if (!me) return null;
      if (sort === 'games') {
        const r = await single('SELECT COUNT(*) AS n FROM chess_players WHERE games > ? OR (games = ? AND wins > ?)', [me.games, me.games, me.wins]);
        return Number(r?.n ?? 0) + 1;
      }
      if (sort === 'winrate') {
        if (me.games < minGames) return null;
        const r = await single('SELECT COUNT(*) AS n FROM chess_players WHERE games >= ? AND ((wins / games) > ? OR ((wins / games) = ? AND games > ?))', [
          minGames,
          me.wins / me.games,
          me.wins / me.games,
          me.games,
        ]);
        return Number(r?.n ?? 0) + 1;
      }
      if (!me.games) return null;
      const r = await single('SELECT COUNT(*) AS n FROM chess_players WHERE games > 0 AND rating > ?', [me.rating]);
      return Number(r?.n ?? 0) + 1;
    },
    async recentGames(passport, limit) {
      const rows = await query(
        'SELECT *, UNIX_TIMESTAMP(created_at) * 1000 AS createdAt FROM chess_games WHERE white = ? OR black = ? ORDER BY id DESC LIMIT ?',
        [passport, passport, limit],
      );
      return (rows ?? []).map(mapGame);
    },
    async searchPlayers(prefix, limit) {
      const safe = String(prefix).replace(/[%_\\]/g, (c) => '\\' + c);
      return (await query(`SELECT ${PLAYER_COLS} FROM chess_players WHERE username LIKE ? ORDER BY CHAR_LENGTH(username) LIMIT ?`, [safe + '%', limit])) ?? [];
    },
  };
}
