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
  /** Opt-in chat between the two players (state only; messages are never stored). */
  /** null when the server has chat turned off. */
  chat?: ChatState | null;
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
  createdAt: number;
}

export interface ChatState {
  status: 'none' | 'requested' | 'open';
  by: Color | null;
}

export interface ChatMessage {
  /** Local id: stays the same when the server confirms a sent message. */
  uid: number;
  from: Color;
  text: string;
  at: number;
  /** Shown right away, before the server confirms it. */
  pending?: boolean;
  /** Local divider, not a message (e.g. where a rematch started). */
  system?: 'newGame';
}

/** Someone waiting in the matchmaking queue, as everyone else sees it. */
export interface Seek {
  username: string;
  tc: TimeControl;
  since: number;
}

export interface Lobby {
  seeks: Seek[];
  /** Online players who opened the app this session (including you). */
  players: number;
}

export interface Bootstrap {
  ok: boolean;
  me: Profile | null;
  game: GameSnapshot | null;
  queue: { tc: TimeControl; since: number } | null;
  challenges: { incoming: Challenge[]; outgoing: Challenge[] };
  lobby: Lobby;
  serverTime: number;
}

export type ApiResult<T = Record<string, unknown>> = ({ ok: true } & T) | { ok: false; error: string };
