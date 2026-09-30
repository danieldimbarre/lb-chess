export type Color = 'w' | 'b';

export interface TimeControl {
  /** Base time in seconds. */
  base: number;
  /** Increment in seconds. */
  inc: number;
}

export interface Profile {
  username: string;
  games: number;
  wins: number;
  losses: number;
  draws: number;
  createdAt?: number;
}

export interface GamePlayer {
  username: string;
  connected?: boolean;
}

export interface MoveRecord {
  from: string;
  to: string;
  promotion?: string;
  san: string;
}

export type GameResult = '1-0' | '0-1' | '1/2-1/2';

export type EndReason =
  | 'checkmate'
  | 'resignation'
  | 'timeout'
  | 'stalemate'
  | 'insufficient'
  | 'threefold'
  | 'fifty'
  | 'agreement'
  | 'abandoned'
  | 'aborted'
  | 'timeout_insufficient';

export interface GameSnapshot {
  id: string;
  white: GamePlayer;
  black: GamePlayer;
  myColor: Color;
  tc: TimeControl;
  moves: MoveRecord[];
  initialFen: string;
  clocks: { w: number; b: number };
  turnStartedAt: number;
  serverTime: number;
  firstMoveDeadline: number | null;
  drawOffer: Color | null;
  status: 'playing' | 'ended';
  result?: GameResult;
  reason?: EndReason;
  rematch?: { by: Color; challengeId: string } | null;
  disconnectDeadline?: number | null;
}

export interface Challenge {
  id: string;
  from: GamePlayer;
  to: GamePlayer;
  tc: TimeControl;
  color: 'w' | 'b' | 'random';
  expiresAt: number;
  serverTime: number;
  rematchOf?: string;
}

export interface LeaderboardRow {
  rank: number;
  username: string;
  games: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
}

export interface HistoryGame {
  id: number;
  white: string;
  black: string;
  result: GameResult;
  reason: EndReason;
  tc: string;
  moves: number;
  pgn: string;
  createdAt: number;
}

export interface Bootstrap {
  ok: boolean;
  me: Profile | null;
  game: GameSnapshot | null;
  queue: { tc: TimeControl; since: number } | null;
  challenges: { incoming: Challenge[]; outgoing: Challenge[] };
  serverTime: number;
}

export type ApiResult<T = Record<string, unknown>> = ({ ok: true } & T) | { ok: false; error: string };
