/** In-memory implementation of the database adapter (tests and the UI dev mock). */
export function createMemoryDb() {
  const players = new Map();
  const games = [];
  let gameId = 0;
  const lower = (s) => String(s).toLowerCase();

  const winRate = (p) => (p.games ? p.wins / p.games : 0);
  const sorters = {
    games: (a, b) => b.games - a.games || b.wins - a.wins || b.rating - a.rating,
    winrate: (a, b) => winRate(b) - winRate(a) || b.games - a.games,
    rating: (a, b) => b.rating - a.rating || b.games - a.games,
  };
  const eligible = (sort, minGames) => (p) => (sort === 'winrate' ? p.games >= minGames : sort === 'rating' ? p.games > 0 : true);

  return {
    async init() {},
    async getPlayer(passport) {
      const p = players.get(passport);
      return p ? { ...p } : null;
    },
    async getPlayerByName(username) {
      for (const p of players.values()) if (lower(p.username) === lower(username)) return { ...p };
      return null;
    },
    async createPlayer(passport, username, rating) {
      for (const p of players.values()) if (lower(p.username) === lower(username)) throw Object.assign(new Error('dup'), { code: 'ER_DUP_ENTRY' });
      const row = { passport, username, rating, peak: rating, games: 0, wins: 0, losses: 0, draws: 0, createdAt: Date.now() };
      players.set(passport, row);
      return { ...row };
    },
    async updatePlayer(passport, fields) {
      const p = players.get(passport);
      if (p) Object.assign(p, fields);
    },
    async insertGame(game) {
      const row = { ...game, id: ++gameId, createdAt: Date.now() };
      games.push(row);
      return row.id;
    },
    async leaderboard(sort, minGames, limit) {
      return [...players.values()].filter(eligible(sort, minGames)).sort(sorters[sort]).slice(0, limit).map((p) => ({ ...p }));
    },
    async rankOf(passport, sort, minGames) {
      const list = [...players.values()].filter(eligible(sort, minGames)).sort(sorters[sort]);
      const i = list.findIndex((p) => p.passport === passport);
      return i >= 0 ? i + 1 : null;
    },
    async recentGames(passport, limit) {
      return games
        .filter((g) => g.white === passport || g.black === passport)
        .slice(-limit)
        .reverse()
        .map((g) => ({ ...g }));
    },
    async searchPlayers(prefix, limit) {
      const q = lower(prefix);
      return [...players.values()]
        .filter((p) => lower(p.username).startsWith(q))
        .sort((a, b) => a.username.length - b.username.length)
        .slice(0, limit)
        .map((p) => ({ ...p }));
    },
  };
}
