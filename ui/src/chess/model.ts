import { reactive, computed } from 'vue';
import { Chess, type Move } from 'chess.js';
import type { Color, EndReason, GameResult, MoveRecord } from '../types';
import { START_FEN, fenTurn, parsePlacement, kingSquare } from './util';
import { moveSound, playSound } from './sounds';

export interface Outcome {
  result: GameResult;
  reason: EndReason;
}

/**
 * Reactive move list + navigation on top of chess.js.
 * `fens[i]` is the position after `i` plies, `ply` is the position being viewed.
 */
export function createModel(initialFen = START_FEN) {
  const chess = new Chess(initialFen);

  const state = reactive({
    initialFen,
    moves: [] as MoveRecord[],
    fens: [initialFen] as string[],
    ply: 0,
    /** Bumped on every change so computeds depending on the chess.js instance refresh. */
    rev: 0,
  });

  const head = computed(() => state.moves.length);
  const atHead = computed(() => state.ply === head.value);
  const viewFen = computed(() => state.fens[state.ply]);
  const headFen = computed(() => state.fens[head.value]);
  const turn = computed<Color>(() => fenTurn(headFen.value));
  const viewTurn = computed<Color>(() => fenTurn(viewFen.value));
  const lastMove = computed<[string, string] | null>(() => {
    const m = state.moves[state.ply - 1];
    return m ? [m.from, m.to] : null;
  });

  const dests = computed<Record<string, string[]>>(() => {
    void state.rev;
    const out: Record<string, string[]> = {};
    for (const m of chess.moves({ verbose: true }) as Move[]) (out[m.from] ??= []).push(m.to);
    return out;
  });

  const check = computed(() => {
    void state.rev;
    const fen = viewFen.value;
    const c = new Chess(fen);
    if (!c.inCheck()) return null;
    return kingSquare(parsePlacement(fen), fenTurn(fen));
  });

  function rebuildFrom(fen: string, moves: MoveRecord[]) {
    chess.load(fen);
    state.initialFen = fen;
    state.moves = [];
    state.fens = [fen];
    for (const m of moves) {
      const r = chess.move({ from: m.from, to: m.to, promotion: m.promotion });
      state.moves.push({ from: r.from, to: r.to, promotion: r.promotion, san: r.san });
      state.fens.push(chess.fen());
    }
    state.ply = state.moves.length;
    state.rev++;
  }

  /** Plays a move at the head (or truncates the line when viewing an earlier ply and `branch` is set). */
  function play(from: string, to: string, promotion?: string, opts: { branch?: boolean; sound?: boolean } = {}): Move | null {
    if (!atHead.value) {
      if (!opts.branch) return null;
      const keep = state.moves.slice(0, state.ply);
      rebuildFrom(state.initialFen, keep);
    }
    let move: Move;
    try {
      move = chess.move({ from, to, promotion: promotion || 'q' });
    } catch {
      return null;
    }
    state.moves.push({ from: move.from, to: move.to, promotion: move.promotion, san: move.san });
    state.fens.push(chess.fen());
    state.ply = state.moves.length;
    state.rev++;
    if (opts.sound !== false) playSound(moveSound(move.san, !!move.captured));
    return move;
  }

  function undo(count = 1) {
    const keep = state.moves.slice(0, Math.max(0, state.moves.length - count));
    rebuildFrom(state.initialFen, keep);
  }

  function goto(ply: number) {
    const target = Math.max(0, Math.min(head.value, ply));
    if (target === state.ply) return;
    const forward = target === state.ply + 1;
    state.ply = target;
    if (forward) {
      const m = state.moves[target - 1];
      playSound(moveSound(m.san, m.san.includes('x')));
    }
  }

  function outcome(): Outcome | null {
    if (!chess.isGameOver()) return null;
    const loserWhite = chess.turn() === 'w';
    if (chess.isCheckmate()) return { result: loserWhite ? '0-1' : '1-0', reason: 'checkmate' };
    if (chess.isStalemate()) return { result: '1/2-1/2', reason: 'stalemate' };
    if (chess.isInsufficientMaterial()) return { result: '1/2-1/2', reason: 'insufficient' };
    if (chess.isThreefoldRepetition()) return { result: '1/2-1/2', reason: 'threefold' };
    return { result: '1/2-1/2', reason: 'fifty' };
  }

  function pgn(headers: Record<string, string> = {}) {
    const c = new Chess(state.initialFen);
    for (const [k, v] of Object.entries(headers)) c.setHeader(k, v);
    if (state.initialFen !== START_FEN) {
      c.setHeader('SetUp', '1');
      c.setHeader('FEN', state.initialFen);
    }
    for (const m of state.moves) c.move({ from: m.from, to: m.to, promotion: m.promotion });
    return c.pgn();
  }

  function hasMaterialToMate(color: Color) {
    const board = parsePlacement(headFen.value);
    let minors = 0;
    for (const p of board.values()) {
      if (p.color !== color || p.role === 'k') continue;
      if (p.role === 'p' || p.role === 'r' || p.role === 'q') return true;
      minors++;
    }
    return minors >= 2;
  }

  return {
    state,
    chess,
    head,
    atHead,
    viewFen,
    headFen,
    turn,
    viewTurn,
    lastMove,
    dests,
    check,
    play,
    undo,
    goto,
    outcome,
    pgn,
    load: (fen: string, moves: MoveRecord[] = []) => rebuildFrom(fen, moves),
    hasMaterialToMate,
  };
}

export type ChessModel = ReturnType<typeof createModel>;

export function validateFen(fen: string): string | null {
  try {
    new Chess(fen);
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : 'Invalid FEN';
  }
}
