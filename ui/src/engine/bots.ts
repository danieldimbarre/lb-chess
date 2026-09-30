import { Position, Searcher, moveToUci, type SearchInfo } from './engine.ts';

export interface BotProfile {
  id: string;
  name: string;
  rating: number;
  role: 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
  tint: string;
  tagline: string;
  greeting: string;
  /** Weak bots: score every root move at this depth then pick with noise. */
  rootDepth?: number;
  /** Centipawn standard deviation of noise added to root scores. */
  noise?: number;
  /** Chance to pick a random, not-totally-losing move instead. */
  blunder?: number;
  /** Strong bots: iterative deepening limits. */
  maxDepth?: number;
  timeMs?: number;
}

export const BOTS: BotProfile[] = [
  { id: 'pip', name: 'Pip', rating: 250, role: 'p', tint: '#b8902d', tagline: 'Just learned how the horsey moves.', greeting: 'Hi! Is the castle the one that goes sideways?', rootDepth: 1, noise: 260, blunder: 0.35 },
  { id: 'maya', name: 'Maya', rating: 550, role: 'n', tint: '#c3632e', tagline: 'Plays fast, thinks later.', greeting: 'Let’s go! I love trading pieces.', rootDepth: 1, noise: 140, blunder: 0.16 },
  { id: 'leo', name: 'Leo', rating: 850, role: 'b', tint: '#3f7fbf', tagline: 'Club newcomer with a bishop crush.', greeting: 'Good luck, have fun!', rootDepth: 2, noise: 75, blunder: 0.08 },
  { id: 'sofia', name: 'Sofia', rating: 1150, role: 'r', tint: '#8c5bb5', tagline: 'Solid, patient, punishes hanging pieces.', greeting: 'Don’t leave anything undefended.', rootDepth: 2, noise: 35, blunder: 0.035 },
  { id: 'viktor', name: 'Viktor', rating: 1450, role: 'q', tint: '#b8443c', tagline: 'Tactical brawler from the park.', greeting: 'I play for the attack. Always.', rootDepth: 3, noise: 18, blunder: 0.015 },
  { id: 'amara', name: 'Amara', rating: 1750, role: 'k', tint: '#2f8f8a', tagline: 'Tournament regular. Few mistakes.', greeting: 'Best of luck. Play your best moves.', maxDepth: 5, timeMs: 700 },
  { id: 'kaspar', name: 'Kaspar', rating: 2050, role: 'n', tint: '#5d9948', tagline: 'Calculates deep, converts cleanly.', greeting: 'Show me what you’ve prepared.', maxDepth: 8, timeMs: 1300 },
  { id: 'nova', name: 'Nova', rating: 2400, role: 'q', tint: '#1f1e1c', tagline: 'Full engine strength. No mercy.', greeting: 'Engine mode engaged.', maxDepth: 64, timeMs: 2500 },
];

export const botById = (id: string) => BOTS.find((b) => b.id === id) ?? BOTS[2];

function gaussian() {
  let u = 0;
  let v = 0;
  while (!u) u = Math.random();
  while (!v) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const searcher = new Searcher();

/** Builds the engine position for `startFen` + UCI moves (keeps repetition history). */
export function positionFrom(startFen: string, moves: string[]): Position {
  const pos = new Position(startFen);
  for (const uci of moves) {
    const m = pos.parseUci(uci);
    if (!m) break;
    pos.make(m);
  }
  return pos;
}

export function botMove(bot: BotProfile, startFen: string, moves: string[]): string | null {
  const pos = positionFrom(startFen, moves);
  const legal = pos.legalMoves();
  if (!legal.length) return null;
  if (legal.length === 1) return moveToUci(legal[0]);

  if (bot.rootDepth) {
    const scored = searcher.rootScores(pos, bot.rootDepth);
    if (!scored.length) return moveToUci(legal[0]);
    const best = scored[0].score;
    // Weak bots never miss a mate in one, it feels broken otherwise.
    if (best > 29000) return moveToUci(scored[0].move);
    if (Math.random() < (bot.blunder ?? 0)) {
      const sane = scored.filter((s) => s.score > best - 600);
      return moveToUci(sane[Math.floor(Math.random() * sane.length)].move);
    }
    let pick = scored[0];
    let pickScore = -Infinity;
    for (const s of scored) {
      const noisy = s.score + gaussian() * (bot.noise ?? 0);
      if (noisy > pickScore) {
        pickScore = noisy;
        pick = s;
      }
    }
    return moveToUci(pick.move);
  }

  // Strong bots: vary the opening a little so games are not identical.
  if (moves.length < 8) {
    const scored = searcher.rootScores(pos, 3, 800);
    const top = scored.filter((s) => s.score >= scored[0].score - 25);
    if (top.length) return moveToUci(top[Math.floor(Math.random() * top.length)].move);
  }
  const { move } = searcher.think(pos, { maxDepth: bot.maxDepth, timeMs: bot.timeMs });
  return move ? moveToUci(move) : moveToUci(legal[0]);
}

export function analyze(startFen: string, moves: string[], timeMs: number, onInfo: (info: SearchInfo, whiteToMove: boolean) => void) {
  const pos = positionFrom(startFen, moves);
  const white = pos.side === 0;
  if (!pos.legalMoves().length) return null;
  const { info } = searcher.think(pos, { timeMs, onInfo: (i) => onInfo(i, white) });
  return info;
}
