import type { Color } from '../types';

export type Role = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
export interface BoardPiece {
  color: Color;
  role: Role;
}
export type BoardMap = Map<string, BoardPiece>;

export const FILES = 'abcdefgh';
export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export const fileOf = (sq: string) => sq.charCodeAt(0) - 97;
export const rankOf = (sq: string) => sq.charCodeAt(1) - 49;
export const squareAt = (file: number, rank: number) => (file >= 0 && file < 8 && rank >= 0 && rank < 8 ? FILES[file] + (rank + 1) : null);
export const isLight = (sq: string) => (fileOf(sq) + rankOf(sq)) % 2 === 1;

export function parsePlacement(fen: string): BoardMap {
  const map: BoardMap = new Map();
  const rows = fen.split(' ')[0].split('/');
  for (let r = 0; r < 8; r++) {
    let f = 0;
    for (const ch of rows[r] ?? '') {
      if (ch >= '1' && ch <= '8') {
        f += Number(ch);
        continue;
      }
      const color: Color = ch === ch.toUpperCase() ? 'w' : 'b';
      map.set(FILES[f] + (8 - r), { color, role: ch.toLowerCase() as Role });
      f++;
    }
  }
  return map;
}

export function placementToFen(map: BoardMap): string {
  const rows: string[] = [];
  for (let r = 7; r >= 0; r--) {
    let row = '';
    let empty = 0;
    for (let f = 0; f < 8; f++) {
      const p = map.get(FILES[f] + (r + 1));
      if (!p) {
        empty++;
        continue;
      }
      if (empty) row += empty;
      empty = 0;
      row += p.color === 'w' ? p.role.toUpperCase() : p.role;
    }
    if (empty) row += empty;
    rows.push(row);
  }
  return rows.join('/');
}

export const fenTurn = (fen: string): Color => (fen.split(' ')[1] === 'b' ? 'b' : 'w');

/**
 * Premove destinations: geometric moves on an empty-ish board (lichess/chess.com style).
 * Sliders ignore blockers, pawns may always capture diagonally, king may castle.
 */
export function premoveDests(board: BoardMap, from: string): string[] {
  const piece = board.get(from);
  if (!piece) return [];
  const f = fileOf(from);
  const r = rankOf(from);
  const out: string[] = [];
  const add = (df: number, dr: number) => {
    const sq = squareAt(f + df, r + dr);
    if (sq) out.push(sq);
  };
  const ray = (df: number, dr: number) => {
    for (let i = 1; i < 8; i++) add(df * i, dr * i);
  };

  switch (piece.role) {
    case 'p': {
      const dir = piece.color === 'w' ? 1 : -1;
      add(0, dir);
      if ((piece.color === 'w' && r === 1) || (piece.color === 'b' && r === 6)) add(0, 2 * dir);
      add(-1, dir);
      add(1, dir);
      break;
    }
    case 'n':
      for (const [df, dr] of [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]]) add(df, dr);
      break;
    case 'b':
      ray(1, 1), ray(1, -1), ray(-1, 1), ray(-1, -1);
      break;
    case 'r':
      ray(1, 0), ray(-1, 0), ray(0, 1), ray(0, -1);
      break;
    case 'q':
      ray(1, 1), ray(1, -1), ray(-1, 1), ray(-1, -1), ray(1, 0), ray(-1, 0), ray(0, 1), ray(0, -1);
      break;
    case 'k': {
      for (let df = -1; df <= 1; df++) for (let dr = -1; dr <= 1; dr++) if (df || dr) add(df, dr);
      const home = piece.color === 'w' ? 0 : 7;
      if (r === home && f === 4) {
        const rookG = board.get(squareAt(7, home)!);
        const rookC = board.get(squareAt(0, home)!);
        if (rookG?.role === 'r' && rookG.color === piece.color) out.push(squareAt(6, home)!);
        if (rookC?.role === 'r' && rookC.color === piece.color) out.push(squareAt(2, home)!);
      }
      break;
    }
  }
  // A premove can never land on a piece of the same colour that is still there.
  return out.filter((sq) => board.get(sq)?.color !== piece.color);
}

/** Applies a premove to a board map without legality checks (for the virtual premove position). */
export function applyLoose(board: BoardMap, from: string, to: string, promotion?: string): BoardMap {
  const next = new Map(board);
  const piece = next.get(from);
  if (!piece) return next;
  next.delete(from);
  // Castling: move the rook along with the king.
  if (piece.role === 'k' && Math.abs(fileOf(to) - fileOf(from)) === 2) {
    const rank = rankOf(from);
    const kingSide = fileOf(to) > fileOf(from);
    const rookFrom = squareAt(kingSide ? 7 : 0, rank)!;
    const rookTo = squareAt(kingSide ? 5 : 3, rank)!;
    const rook = next.get(rookFrom);
    if (rook) {
      next.delete(rookFrom);
      next.set(rookTo, rook);
    }
  }
  const lastRank = piece.color === 'w' ? 7 : 0;
  if (piece.role === 'p' && rankOf(to) === lastRank) next.set(to, { color: piece.color, role: (promotion as Role) || 'q' });
  else next.set(to, piece);
  return next;
}

export const PIECE_VALUE: Record<Role, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
type Counts = Record<Color, Record<Role, number>>;

function countPieces(fen: string): Counts {
  const count: Counts = { w: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 }, b: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 } };
  for (const p of parsePlacement(fen).values()) count[p.color][p.role]++;
  return count;
}

/**
 * Pieces each side has captured (as roles of the opponent's colour) relative to the
 * game's starting position, plus the material balance (positive = White ahead).
 */
export function materialInfo(fen: string, startFen: string = START_FEN) {
  const start = countPieces(startFen);
  const now = countPieces(fen);
  const captured: Record<Color, Role[]> = { w: [], b: [] };
  let score = 0;
  // A pawn that promoted is not a captured pawn: offset missing pawns by promoted extras.
  const promoted = (c: Color) => (['n', 'b', 'r', 'q'] as Role[]).reduce((n, r) => n + Math.max(0, now[c][r] - start[c][r]), 0);
  const promotedW = promoted('w');
  const promotedB = promoted('b');
  for (const role of ['p', 'n', 'b', 'r', 'q'] as Role[]) {
    // Promotions can push a count above the start value; clamp so nothing goes negative.
    let missingB = Math.max(0, start.b[role] - now.b[role]);
    let missingW = Math.max(0, start.w[role] - now.w[role]);
    if (role === 'p') {
      missingB = Math.max(0, missingB - promotedB);
      missingW = Math.max(0, missingW - promotedW);
    }
    for (let i = 0; i < missingB; i++) captured.w.push(role);
    for (let i = 0; i < missingW; i++) captured.b.push(role);
    score += (now.w[role] - now.b[role]) * PIECE_VALUE[role];
  }
  return { captured, diff: score };
}

export function kingSquare(board: BoardMap, color: Color): string | null {
  for (const [sq, p] of board) if (p.role === 'k' && p.color === color) return sq;
  return null;
}
