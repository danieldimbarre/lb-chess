import { Position, Searcher, moveToUci, runSync, type SearchInfo } from './engine.ts';

export interface BotProfile {
  id: string;
  name: string;
  /** Difficulty 1 (weakest) to 8 (full engine). */
  level: number;
  role: 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
  tint: string;
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
  { id: 'pip', name: 'Pip', level: 1, role: 'p', tint: '#b8902d', rootDepth: 1, noise: 260, blunder: 0.35 },
  { id: 'maya', name: 'Maya', level: 2, role: 'n', tint: '#c3632e', rootDepth: 1, noise: 140, blunder: 0.16 },
  { id: 'leo', name: 'Leo', level: 3, role: 'b', tint: '#3f7fbf', rootDepth: 2, noise: 75, blunder: 0.08 },
  { id: 'sofia', name: 'Sofia', level: 4, role: 'r', tint: '#8c5bb5', rootDepth: 2, noise: 35, blunder: 0.035 },
  { id: 'viktor', name: 'Viktor', level: 5, role: 'q', tint: '#b8443c', rootDepth: 3, noise: 18, blunder: 0.015 },
  { id: 'amara', name: 'Amara', level: 6, role: 'k', tint: '#2f8f8a', maxDepth: 5, timeMs: 700 },
  { id: 'kaspar', name: 'Kaspar', level: 7, role: 'n', tint: '#5d9948', maxDepth: 8, timeMs: 1300 },
  { id: 'nova', name: 'Nova', level: 8, role: 'q', tint: '#1f1e1c', maxDepth: 64, timeMs: 2500 },
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

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

/** Small opening book (UCI lines -> replies) so bots open like people and vary between games. */
const BOOK: Record<string, string[]> = {
  '': ['e2e4', 'e2e4', 'd2d4', 'd2d4', 'c2c4', 'g1f3'],
  e2e4: ['e7e5', 'e7e5', 'c7c5', 'c7c5', 'e7e6', 'c7c6'],
  d2d4: ['d7d5', 'g8f6', 'g8f6', 'e7e6'],
  c2c4: ['e7e5', 'g8f6', 'c7c5'],
  g1f3: ['d7d5', 'g8f6', 'c7c5'],
  'e2e4 e7e5': ['g1f3', 'g1f3', 'f1c4', 'b1c3'],
  'e2e4 c7c5': ['g1f3', 'g1f3', 'b1c3', 'c2c3'],
  'e2e4 e7e6': ['d2d4'],
  'e2e4 c7c6': ['d2d4'],
  'd2d4 d7d5': ['c2c4', 'c2c4', 'g1f3', 'c1f4'],
  'd2d4 g8f6': ['c2c4', 'g1f3'],
  'd2d4 e7e6': ['c2c4', 'e2e4'],
  'c2c4 e7e5': ['b1c3', 'g2g3'],
  'c2c4 g8f6': ['b1c3', 'g1f3'],
  'c2c4 c7c5': ['g1f3', 'b1c3'],
  'g1f3 d7d5': ['d2d4', 'g2g3'],
  'g1f3 g8f6': ['c2c4', 'd2d4'],
  'g1f3 c7c5': ['c2c4', 'e2e4'],
  'e2e4 e7e5 g1f3': ['b8c6', 'b8c6', 'g8f6', 'd7d6'],
  'e2e4 e7e5 f1c4': ['g8f6', 'b8c6'],
  'e2e4 e7e5 b1c3': ['g8f6', 'b8c6'],
  'e2e4 c7c5 g1f3': ['d7d6', 'b8c6', 'e7e6'],
  'e2e4 c7c5 b1c3': ['b8c6', 'd7d6'],
  'e2e4 c7c5 c2c3': ['g8f6', 'd7d5'],
  'e2e4 e7e6 d2d4': ['d7d5'],
  'e2e4 c7c6 d2d4': ['d7d5'],
  'd2d4 d7d5 c2c4': ['e7e6', 'c7c6', 'd5c4'],
  'd2d4 d7d5 g1f3': ['g8f6', 'e7e6'],
  'd2d4 d7d5 c1f4': ['g8f6', 'c7c5'],
  'd2d4 g8f6 c2c4': ['e7e6', 'g7g6', 'c7c5'],
  'd2d4 g8f6 g1f3': ['d7d5', 'g7g6', 'e7e6'],
  'e2e4 e7e5 g1f3 b8c6': ['f1b5', 'f1c4', 'd2d4'],
  'e2e4 e7e5 g1f3 g8f6': ['f3e5', 'b1c3'],
  'e2e4 e7e5 g1f3 d7d6': ['d2d4'],
  'e2e4 c7c5 g1f3 d7d6': ['d2d4'],
  'e2e4 c7c5 g1f3 b8c6': ['d2d4', 'f1b5'],
  'e2e4 c7c5 g1f3 e7e6': ['d2d4'],
  'd2d4 d7d5 c2c4 e7e6': ['b1c3', 'g1f3'],
  'd2d4 d7d5 c2c4 c7c6': ['g1f3', 'b1c3'],
  'd2d4 g8f6 c2c4 e7e6': ['b1c3', 'g1f3'],
  'd2d4 g8f6 c2c4 g7g6': ['b1c3'],
};

function bookMove(pos: Position, startFen: string, moves: string[]): string | null {
  if (startFen !== START || moves.length > 4) return null;
  const replies = BOOK[moves.join(' ')];
  if (!replies) return null;
  const uci = replies[Math.floor(Math.random() * replies.length)];
  return pos.parseUci(uci) ? uci : null;
}

export function botMove(bot: BotProfile, startFen: string, moves: string[]): string | null {
  return runSync(botMoveSteps(bot, startFen, moves));
}

/**
 * Step-wise botMove (yields between search iterations / root moves).
 * `maxTimeMs` caps the thinking time, used when the engine has to share the UI thread.
 */
export function* botMoveSteps(bot: BotProfile, startFen: string, moves: string[], maxTimeMs = Infinity): Generator<void, string | null> {
  const pos = positionFrom(startFen, moves);
  const legal = pos.legalMoves();
  if (!legal.length) return null;
  if (legal.length === 1) return moveToUci(legal[0]);

  // Everyone above the absolute beginners knows a few sound opening moves.
  if (bot.level >= 3) {
    const book = bookMove(pos, startFen, moves);
    if (book) return book;
  }

  if (bot.rootDepth) {
    const scored = yield* searcher.rootScoresSteps(pos, bot.rootDepth, Math.min(1500, maxTimeMs));
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

  const { move } = yield* searcher.thinkSteps(pos, { maxDepth: bot.maxDepth, timeMs: Math.min(bot.timeMs ?? 1000, maxTimeMs) });
  return move ? moveToUci(move) : moveToUci(legal[0]);
}

export function analyze(startFen: string, moves: string[], timeMs: number, onInfo: (info: SearchInfo, whiteToMove: boolean) => void) {
  return runSync(analyzeSteps(startFen, moves, timeMs, onInfo));
}

export function* analyzeSteps(
  startFen: string,
  moves: string[],
  timeMs: number,
  onInfo: (info: SearchInfo, whiteToMove: boolean) => void,
): Generator<void, SearchInfo | null> {
  const pos = positionFrom(startFen, moves);
  const white = pos.side === 0;
  if (!pos.legalMoves().length) return null;
  const { info } = yield* searcher.thinkSteps(pos, { timeMs, onInfo: (i) => onInfo(i, white) });
  return info;
}
