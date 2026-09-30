/**
 * Dev-only stand-in for the FiveM server: runs the real server core
 * (server/src/core.js) against an in-memory database, with a few simulated
 * players that accept challenges, join the queue and play engine moves.
 */
// @ts-ignore - plain JS shared with the server
import { ChessService } from '../../../server/src/core.js';
// @ts-ignore - plain JS shared with the server
import { createMemoryDb } from '../../../server/src/memorydb.js';
import config from '../../../config.json';
import { botMove, botById } from '../engine/bots';

const ME = 1;

const FAKES = [
  { passport: 101, username: 'Hikaru_LS', rating: 1712, games: 184, wins: 112, losses: 58, draws: 14, bot: 'amara' },
  { passport: 102, username: 'VinewoodQueen', rating: 1488, games: 96, wins: 51, losses: 38, draws: 7, bot: 'viktor' },
  { passport: 103, username: 'PaletoPawn', rating: 1134, games: 41, wins: 17, losses: 21, draws: 3, bot: 'sofia' },
  { passport: 104, username: 'GroveStreetGM', rating: 1966, games: 312, wins: 201, losses: 88, draws: 23, bot: 'kaspar', declines: true },
  { passport: 105, username: 'SandyShoresNoob', rating: 802, games: 12, wins: 3, losses: 9, draws: 0, bot: 'maya' },
];

export function createMock(push: (action: string, data: unknown) => void) {
  const db = createMemoryDb();
  const params = new URLSearchParams(location.search);

  const service = new ChessService({
    db,
    config,
    isOnline: () => true,
    log: console.log,
    push(passport: number, action: string, data: any) {
      const copy = JSON.parse(JSON.stringify(data ?? null));
      if (passport === ME) setTimeout(() => push(action, copy), 40);
      else agent(passport, action, copy);
    },
    notify(passport: number, title: string, content: string) {
      if (passport === ME) console.info(`[phone notification] ${title}: ${content}`);
    },
  });
  const h = service.handlers();
  const as = (passport: number, name: string, data: Record<string, unknown> = {}) => h[name]({ passport, data });

  const seeded = (async () => {
    for (const f of FAKES) {
      await db.createPlayer(f.passport, f.username, f.rating);
      await db.updatePlayer(f.passport, { rating: f.rating, peak: f.rating + 40, games: f.games, wins: f.wins, losses: f.losses, draws: f.draws });
    }
    if (params.get('user')) await as(ME, 'register', { username: params.get('user') });
  })();

  setInterval(() => service.tick(), 250);

  // Simulated opponents ----------------------------------------------------------------

  const fakeBy = (p: number) => FAKES.find((f) => f.passport === p)!;
  const games = new Map<string, { color: 'w' | 'b'; moves: string[]; fen: string }>();

  function think(passport: number, gameId: string) {
    const g = games.get(gameId);
    if (!g) return;
    const ply = g.moves.length;
    const myTurn = (ply % 2 === 0) === (g.color === 'w');
    if (!myTurn) return;
    setTimeout(async () => {
      const cur = games.get(gameId);
      if (!cur || cur.moves.length !== ply) return;
      const uci = botMove(botById(fakeBy(passport).bot), cur.fen, cur.moves);
      if (!uci) return;
      await as(passport, 'game:move', { id: gameId, from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4], ply });
    }, 500 + Math.random() * 1500);
  }

  function agent(passport: number, action: string, data: any) {
    switch (action) {
      case 'game:start':
        games.set(data.id, { color: data.myColor, moves: [], fen: data.initialFen });
        think(passport, data.id);
        break;
      case 'game:move': {
        const g = games.get(data.id);
        if (!g) return;
        g.moves.push(data.move.from + data.move.to + (data.move.promotion ?? ''));
        think(passport, data.id);
        break;
      }
      case 'game:draw':
        // Simulated players accept draws only when behind on the clock... i.e. never; decline politely.
        if (data.offer && data.offer !== games.get(data.id)?.color) setTimeout(() => as(passport, 'game:draw', { id: data.id, action: 'decline' }), 1200);
        break;
      case 'game:end':
        games.delete(data.id);
        break;
      case 'challenge:incoming':
        setTimeout(() => as(passport, fakeBy(passport).declines ? 'challenge:decline' : 'challenge:accept', { id: data.id }), 1400);
        break;
    }
  }

  // Someone from the queue shows up after a short wait.
  async function fillQueue() {
    const boot = await as(ME, 'bootstrap');
    if (!boot.queue) return;
    const fake = FAKES[Math.floor(Math.random() * FAKES.length)];
    await as(fake.passport, 'queue:join', { tc: boot.queue.tc });
  }

  // Test hooks for the browser console.
  (window as any).__mock = {
    service,
    challengeMe: async (i = 0, tc = { base: 300, inc: 0 }) => as(FAKES[i].passport, 'challenge:send', { username: service.profiles.get(ME)?.username, tc, color: 'random' }),
    disconnectOpponent: () => {
      const id = service.playerGame.get(ME);
      const g = id && service.games.get(id);
      if (g) service.onDisconnect(g.white === ME ? g.black : g.white);
    },
  };

  return {
    async request(name: string, data: Record<string, unknown>): Promise<any> {
      await seeded;
      await new Promise((r) => setTimeout(r, 60 + Math.random() * 60));
      if (!h[name]) return { ok: false, error: 'unknown_request' };
      const res = JSON.parse(JSON.stringify(await as(ME, name, JSON.parse(JSON.stringify(data ?? {})))));
      if (name === 'queue:join' && res.ok && !res.matched) setTimeout(fillQueue, 1800 + Math.random() * 1500);
      return res;
    },
  };
}
