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
    games INT NOT NULL DEFAULT 0,
    wins INT NOT NULL DEFAULT 0,
    losses INT NOT NULL DEFAULT 0,
    draws INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_chess_username (username),
    KEY idx_chess_games (games),
    KEY idx_chess_wins (wins)
  ) DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS chess_games (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    white INT NOT NULL,
    black INT NOT NULL,
    white_name VARCHAR(16) NOT NULL,
    black_name VARCHAR(16) NOT NULL,
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

const LEGACY_COLUMNS = [
  ['chess_players', 'rating'],
  ['chess_players', 'peak'],
  ['chess_games', 'white_rating'],
  ['chess_games', 'black_rating'],
  ['chess_games', 'white_delta'],
  ['chess_games', 'black_delta'],
];

const PLAYER_COLS = 'passport, username, games, wins, losses, draws, UNIX_TIMESTAMP(created_at) * 1000 AS createdAt';

const mapGame = (r) => ({
  id: r.id,
  white: r.white,
  black: r.black,
  whiteName: r.white_name,
  blackName: r.black_name,
  result: r.result,
  reason: r.reason,
  tc: r.time_control,
  moves: r.moves,
  pgn: r.pgn,
  createdAt: Number(r.createdAt),
});

const ORDER = {
  games: 'games DESC, wins DESC',
  winrate: '(wins / games) DESC, games DESC',
  wins: 'wins DESC, games DESC',
};
const WHERE = {
  games: 'games > 0',
  winrate: 'games >= ?',
  wins: 'games > 0',
};

export function createMysqlDb() {
  return {
    async init() {
      for (const sql of SCHEMA) await query(sql);
      // Older versions had an Elo system; drop its columns so inserts don't need them.
      for (const [table, column] of LEGACY_COLUMNS) {
        const found = await single('SELECT COUNT(*) AS n FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?', [table, column]);
        if (Number(found?.n)) await query(`ALTER TABLE ${table} DROP COLUMN ${column}`);
      }
    },
    getPlayer: (passport) => single(`SELECT ${PLAYER_COLS} FROM chess_players WHERE passport = ?`, [passport]),
    getPlayerByName: (username) => single(`SELECT ${PLAYER_COLS} FROM chess_players WHERE username = ?`, [username]),
    async createPlayer(passport, username) {
      const res = await query('INSERT IGNORE INTO chess_players (passport, username) VALUES (?, ?)', [passport, username]);
      if (!res || !res.affectedRows) throw Object.assign(new Error('dup'), { code: 'ER_DUP_ENTRY' });
      return single(`SELECT ${PLAYER_COLS} FROM chess_players WHERE passport = ?`, [passport]);
    },
    async updatePlayer(passport, f) {
      await query('UPDATE chess_players SET games = ?, wins = ?, losses = ?, draws = ? WHERE passport = ?', [
        f.games,
        f.wins,
        f.losses,
        f.draws,
        passport,
      ]);
    },
    async insertGame(g) {
      const res = await query(
        `INSERT INTO chess_games (white, black, white_name, black_name, result, reason, time_control, moves, pgn)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [g.white, g.black, g.whiteName, g.blackName, g.result, g.reason, g.tc, g.moves, g.pgn],
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
        if (!me.games) return null;
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
      const r = await single('SELECT COUNT(*) AS n FROM chess_players WHERE games > 0 AND (wins > ? OR (wins = ? AND games > ?))', [me.wins, me.wins, me.games]);
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
