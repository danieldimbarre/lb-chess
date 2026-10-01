/* global globalThis */
/** oxmysql implementation of the database adapter. */

const QUERY_TIMEOUT_MS = 10_000;

/**
 * Wraps an oxmysql export in a promise with a hard timeout, so a stalled
 * connection can never hang a caller (and with it the game loop) forever.
 */
function call(method, ...args) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`oxmysql.${method} timed out`)), QUERY_TIMEOUT_MS);
    try {
      globalThis.exports.oxmysql[method](...args, (result) => {
        clearTimeout(timer);
        resolve(result);
      });
    } catch (err) {
      clearTimeout(timer);
      reject(err);
    }
  });
}

const query = (sql, params = []) => call('query', sql, params);
const single = async (sql, params) => (await query(sql, params))?.[0] ?? null;

// Latest schema, used as-is on fresh installs. Existing installs are brought up to date by MIGRATIONS.
const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS chess_meta (
    k VARCHAR(32) NOT NULL PRIMARY KEY,
    v INT NOT NULL
  ) DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS chess_players (
    passport INT NOT NULL PRIMARY KEY,
    username VARCHAR(16) NOT NULL,
    games INT NOT NULL DEFAULT 0,
    wins INT NOT NULL DEFAULT 0,
    losses INT NOT NULL DEFAULT 0,
    draws INT NOT NULL DEFAULT 0,
    winrate DECIMAL(7,6) AS (IF(games > 0, wins / games, 0)) STORED,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_chess_username (username),
    KEY idx_chess_games_wins (games, wins),
    KEY idx_chess_wins_games (wins, games),
    KEY idx_chess_winrate_games (winrate, games)
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
    KEY idx_chess_white_id (white, id),
    KEY idx_chess_black_id (black, id),
    KEY idx_chess_created (created_at)
  ) DEFAULT CHARSET=utf8mb4`,
];

const hasColumn = async (table, column) =>
  Number(
    (await single('SELECT COUNT(*) AS n FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?', [table, column]))?.n,
  ) > 0;
const hasIndex = async (table, index) =>
  Number(
    (await single('SELECT COUNT(*) AS n FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?', [table, index]))?.n,
  ) > 0;

/**
 * One-time, versioned migrations. Each step is idempotent (checks before altering) so a
 * fresh install created from SCHEMA passes through them as no-ops. They only run when
 * chess_meta.schema is behind, so normal restarts do a single SELECT and no DDL.
 */
const MIGRATIONS = [
  // 1: drop the old Elo columns.
  async () => {
    const legacy = [
      ['chess_players', 'rating'],
      ['chess_players', 'peak'],
      ['chess_games', 'white_rating'],
      ['chess_games', 'black_rating'],
      ['chess_games', 'white_delta'],
      ['chess_games', 'black_delta'],
    ];
    for (const [table, column] of legacy) if (await hasColumn(table, column)) await query(`ALTER TABLE ${table} DROP COLUMN ${column}`);
  },
  // 2: indexes that match the leaderboard / history queries, plus an indexable win rate.
  async () => {
    if (!(await hasColumn('chess_players', 'winrate'))) {
      await query('ALTER TABLE chess_players ADD COLUMN winrate DECIMAL(7,6) AS (IF(games > 0, wins / games, 0)) STORED');
    }
    const players = [
      ['idx_chess_games_wins', '(games, wins)'],
      ['idx_chess_wins_games', '(wins, games)'],
      ['idx_chess_winrate_games', '(winrate, games)'],
    ];
    for (const [name, cols] of players) if (!(await hasIndex('chess_players', name))) await query(`ALTER TABLE chess_players ADD KEY ${name} ${cols}`);
    for (const name of ['idx_chess_games', 'idx_chess_wins']) if (await hasIndex('chess_players', name)) await query(`ALTER TABLE chess_players DROP KEY ${name}`);

    const games = [
      ['idx_chess_white_id', '(white, id)'],
      ['idx_chess_black_id', '(black, id)'],
      ['idx_chess_created', '(created_at)'],
    ];
    for (const [name, cols] of games) if (!(await hasIndex('chess_games', name))) await query(`ALTER TABLE chess_games ADD KEY ${name} ${cols}`);
    for (const name of ['idx_chess_white', 'idx_chess_black']) if (await hasIndex('chess_games', name)) await query(`ALTER TABLE chess_games DROP KEY ${name}`);
  },
];

const PLAYER_COLS = 'passport, username, games, wins, losses, draws, winrate, UNIX_TIMESTAMP(created_at) * 1000 AS createdAt';
// History lists never carry the PGN; it is fetched per game on demand (getGamePgn).
const GAME_LIST_COLS = 'id, white, black, white_name, black_name, result, reason, time_control, moves, created_at';

const mapPlayer = (r) => (r ? { ...r, winrate: Number(r.winrate), createdAt: Number(r.createdAt) } : null);

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
  createdAt: Number(r.createdAt),
});

const ORDER = {
  games: 'games DESC, wins DESC',
  winrate: 'winrate DESC, games DESC',
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
      const version = Number((await single("SELECT v FROM chess_meta WHERE k = 'schema'"))?.v ?? 0);
      for (let i = version; i < MIGRATIONS.length; i++) {
        await MIGRATIONS[i]();
        await query("INSERT INTO chess_meta (k, v) VALUES ('schema', ?) ON DUPLICATE KEY UPDATE v = VALUES(v)", [i + 1]);
      }
    },
    getPlayer: async (passport) => mapPlayer(await single(`SELECT ${PLAYER_COLS} FROM chess_players WHERE passport = ?`, [passport])),
    getPlayerByName: async (username) => mapPlayer(await single(`SELECT ${PLAYER_COLS} FROM chess_players WHERE username = ?`, [username])),
    async createPlayer(passport, username) {
      // Username is already validated (ASCII, <= 16 chars), so IGNORE can only swallow a duplicate key.
      // Tell the two keys apart instead of reporting every collision as "username taken".
      const res = await query('INSERT IGNORE INTO chess_players (passport, username) VALUES (?, ?)', [passport, username]);
      if (!res || !res.affectedRows) {
        const byPassport = await single('SELECT 1 AS x FROM chess_players WHERE passport = ?', [passport]);
        throw Object.assign(new Error('dup'), { code: byPassport ? 'ER_DUP_PASSPORT' : 'ER_DUP_ENTRY' });
      }
      return mapPlayer(await single(`SELECT ${PLAYER_COLS} FROM chess_players WHERE passport = ?`, [passport]));
    },
    /**
     * Stores a finished game and, when rated, applies both players' stats atomically.
     * Increments (not absolute values) so concurrent writes can never lose an update.
     * `scores` = { white: 1 | 0.5 | 0, black: ... } or null for unrated games.
     */
    async recordGame(g, scores) {
      const queries = [];
      if (scores) {
        for (const [passport, s] of [
          [g.white, scores.white],
          [g.black, scores.black],
        ]) {
          queries.push({
            query: 'UPDATE chess_players SET games = games + 1, wins = wins + ?, losses = losses + ?, draws = draws + ? WHERE passport = ?',
            values: [s === 1 ? 1 : 0, s === 0 ? 1 : 0, s === 0.5 ? 1 : 0, passport],
          });
        }
      }
      queries.push({
        query: `INSERT INTO chess_games (white, black, white_name, black_name, result, reason, time_control, moves, pgn)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        values: [g.white, g.black, g.whiteName, g.blackName, g.result, g.reason, g.tc, g.moves, g.pgn],
      });
      const ok = await call('transaction', queries);
      if (!ok) throw new Error('recordGame transaction failed');
    },
    async leaderboard(sort, minGames, limit) {
      const params = sort === 'winrate' ? [minGames, limit] : [limit];
      return ((await query(`SELECT ${PLAYER_COLS} FROM chess_players WHERE ${WHERE[sort]} ORDER BY ${ORDER[sort]} LIMIT ?`, params)) ?? []).map(mapPlayer);
    },
    /** `me` is the player's row (from cache); ranks are range scans on the composite indexes. */
    async rankOf(me, sort, minGames) {
      if (!me) return null;
      let r;
      if (sort === 'games') {
        if (!me.games) return null;
        r = await single('SELECT COUNT(*) AS n FROM chess_players WHERE games > ? OR (games = ? AND wins > ?)', [me.games, me.games, me.wins]);
      } else if (sort === 'winrate') {
        if (me.games < minGames) return null;
        // Compare against the row's own stored value so rounding matches exactly.
        const row = await single('SELECT winrate FROM chess_players WHERE passport = ?', [me.passport]);
        if (!row) return null;
        r = await single('SELECT COUNT(*) AS n FROM chess_players WHERE games >= ? AND (winrate > ? OR (winrate = ? AND games > ?))', [
          minGames,
          row.winrate,
          row.winrate,
          me.games,
        ]);
      } else {
        if (!me.games) return null;
        r = await single('SELECT COUNT(*) AS n FROM chess_players WHERE wins > ? OR (wins = ? AND games > ?)', [me.wins, me.wins, me.games]);
      }
      return Number(r?.n ?? 0) + 1;
    },
    async recentGames(passport, limit) {
      // Two index range scans instead of an OR (index merge + filesort). A player is never both sides.
      const rows = await query(
        `SELECT *, UNIX_TIMESTAMP(created_at) * 1000 AS createdAt FROM (
           (SELECT ${GAME_LIST_COLS} FROM chess_games WHERE white = ? ORDER BY id DESC LIMIT ?)
           UNION ALL
           (SELECT ${GAME_LIST_COLS} FROM chess_games WHERE black = ? ORDER BY id DESC LIMIT ?)
         ) t ORDER BY id DESC LIMIT ?`,
        [passport, limit, passport, limit, limit],
      );
      return (rows ?? []).map(mapGame);
    },
    async getGamePgn(id) {
      return (await single('SELECT pgn FROM chess_games WHERE id = ?', [id]))?.pgn ?? null;
    },
    async searchPlayers(prefix, limit) {
      // Explicit ESCAPE so this also holds under NO_BACKSLASH_ESCAPES.
      const safe = String(prefix).replace(/[!%_]/g, (c) => '!' + c);
      return ((await query(`SELECT ${PLAYER_COLS} FROM chess_players WHERE username LIKE ? ESCAPE '!' ORDER BY CHAR_LENGTH(username) LIMIT ?`, [safe + '%', limit])) ?? []).map(
        mapPlayer,
      );
    },
    /** Deletes history older than `days`, in small batches to keep locks short. Returns rows removed. */
    async pruneGames(days, batch = 1000) {
      const res = await query('DELETE FROM chess_games WHERE created_at < (NOW() - INTERVAL ? DAY) LIMIT ?', [days, batch]);
      return res?.affectedRows ?? 0;
    },
  };
}
