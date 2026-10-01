/** In-memory implementation of the database adapter (tests and the UI dev mock). */
export function createMemoryDb() {
  const players = new Map();
  const games = [];
  let gameId = 0;
  const lower = (s) => String(s).toLowerCase();

  const winRate = (p) => (p.games ? p.wins / p.games : 0);
  const sorters = {
    games: (a, b) => b.games - a.games || b.wins - a.wins,
    winrate: (a, b) => winRate(b) - winRate(a) || b.games - a.games,
    wins: (a, b) => b.wins - a.wins || b.games - a.games,
  };
  // Nobody is ranked before their first game.
  const eligible = (sort, minGames) => (p) => (sort === 'winrate' ? p.games >= minGames : p.games > 0);

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
    async createPlayer(passport, username) {
      if (players.has(passport)) throw Object.assign(new Error('dup'), { code: 'ER_DUP_PASSPORT' });
      for (const p of players.values()) if (lower(p.username) === lower(username)) throw Object.assign(new Error('dup'), { code: 'ER_DUP_ENTRY' });
      const row = { passport, username, games: 0, wins: 0, losses: 0, draws: 0, createdAt: Date.now() };
      players.set(passport, row);
      return { ...row };
    },
    /** Seeding helper for the UI dev mock (not part of the service's adapter contract). */
    async updatePlayer(passport, fields) {
      const p = players.get(passport);
      if (p) Object.assign(p, fields);
    },
    async recordGame(game, scores) {
      if (scores) {
        for (const [passport, s] of [
          [game.white, scores.white],
          [game.black, scores.black],
        ]) {
          const p = players.get(passport);
          if (!p) continue;
          p.games += 1;
          if (s === 1) p.wins += 1;
          else if (s === 0) p.losses += 1;
          else p.draws += 1;
        }
      }
      games.push({ ...game, id: ++gameId, createdAt: Date.now() });
    },
    async leaderboard(sort, minGames, limit) {
      return [...players.values()].filter(eligible(sort, minGames)).sort(sorters[sort]).slice(0, limit).map((p) => ({ ...p }));
    },
    async rankOf(me, sort, minGames) {
      if (!me) return null;
      const list = [...players.values()].filter(eligible(sort, minGames)).sort(sorters[sort]);
      const i = list.findIndex((p) => p.passport === me.passport);
      return i >= 0 ? i + 1 : null;
    },
    async recentGames(passport, limit) {
      return games
        .filter((g) => g.white === passport || g.black === passport)
        .slice(-limit)
        .reverse()
        .map(({ pgn, ...g }) => ({ ...g }));
    },
    async getGamePgn(id) {
      return games.find((g) => g.id === id)?.pgn ?? null;
    },
    async searchPlayers(prefix, limit) {
      const q = lower(prefix);
      return [...players.values()]
        .filter((p) => lower(p.username).startsWith(q))
        .sort((a, b) => a.username.length - b.username.length)
        .slice(0, limit)
        .map((p) => ({ ...p }));
    },
    async pruneGames(days) {
      const cutoff = Date.now() - days * 86_400_000;
      const before = games.length;
      for (let i = games.length - 1; i >= 0; i--) if (games[i].createdAt < cutoff) games.splice(i, 1);
      return before - games.length;
    },
  };
}
