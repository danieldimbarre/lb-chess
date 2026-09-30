/*
 * Compact chess engine for the bots and the analysis eval bar.
 * 0x88 board, pseudo-legal generation + legality check, iterative deepening
 * PVS alpha-beta with quiescence, transposition table, null move, LMR,
 * killer/history ordering and a tapered piece-square evaluation.
 *
 * Pure TypeScript with no imports so it runs in a Worker, on the main thread
 * and under `node --test` (type stripping) alike.
 */

export const PAWN = 1;
export const KNIGHT = 2;
export const BISHOP = 3;
export const ROOK = 4;
export const QUEEN = 5;
export const KING = 6;
export const WHITE = 0;
export const BLACK = 8;

const CAP = 1;
const EP = 2;
const CASTLE = 4;
const DOUBLE = 8;

const INF = 32000;
export const MATE = 30000;
const MAX_PLY = 96;

const KNIGHT_D = [33, 31, 18, 14, -33, -31, -18, -14];
const BISHOP_D = [17, 15, -17, -15];
const ROOK_D = [16, -16, 1, -1];
const KING_D = [17, 15, -17, -15, 16, -16, 1, -1];

const VALUE = [0, 100, 320, 330, 500, 900, 0];
const PHASE_W = [0, 0, 1, 1, 2, 4, 0];

// Piece-square tables, a8..h8 first (white's point of view).
// prettier-ignore
const PST: number[][] = [
  [],
  [0,0,0,0,0,0,0,0, 50,50,50,50,50,50,50,50, 10,10,20,30,30,20,10,10, 5,5,10,25,25,10,5,5, 0,0,0,20,20,0,0,0, 5,-5,-10,0,0,-10,-5,5, 5,10,10,-20,-20,10,10,5, 0,0,0,0,0,0,0,0],
  [-50,-40,-30,-30,-30,-30,-40,-50, -40,-20,0,0,0,0,-20,-40, -30,0,10,15,15,10,0,-30, -30,5,15,20,20,15,5,-30, -30,0,15,20,20,15,0,-30, -30,5,10,15,15,10,5,-30, -40,-20,0,5,5,0,-20,-40, -50,-40,-30,-30,-30,-30,-40,-50],
  [-20,-10,-10,-10,-10,-10,-10,-20, -10,0,0,0,0,0,0,-10, -10,0,5,10,10,5,0,-10, -10,5,5,10,10,5,5,-10, -10,0,10,10,10,10,0,-10, -10,10,10,10,10,10,10,-10, -10,5,0,0,0,0,5,-10, -20,-10,-10,-10,-10,-10,-10,-20],
  [0,0,0,0,0,0,0,0, 5,10,10,10,10,10,10,5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, 0,0,0,5,5,0,0,0],
  [-20,-10,-10,-5,-5,-10,-10,-20, -10,0,0,0,0,0,0,-10, -10,0,5,5,5,5,0,-10, -5,0,5,5,5,5,0,-5, 0,0,5,5,5,5,0,-5, -10,5,5,5,5,5,0,-10, -10,0,5,0,0,0,0,-10, -20,-10,-10,-5,-5,-10,-10,-20],
  [-30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -20,-30,-30,-40,-40,-30,-30,-20, -10,-20,-20,-20,-20,-20,-20,-10, 20,20,0,0,0,0,20,20, 20,30,10,0,0,10,30,20],
];
// prettier-ignore
const KING_EG = [-50,-40,-30,-20,-20,-30,-40,-50, -30,-20,-10,0,0,-10,-20,-30, -30,-10,20,30,30,20,-10,-30, -30,-10,30,40,40,30,-10,-30, -30,-10,30,40,40,30,-10,-30, -30,-10,20,30,30,20,-10,-30, -30,-30,0,0,0,0,-30,-30, -50,-30,-30,-30,-30,-30,-30,-50];
const PASSED = [0, 5, 10, 20, 35, 60, 100, 0];

// Castling rights masks: moving from/to these squares removes rights.
const CASTLE_MASK = new Int8Array(128).fill(15);
CASTLE_MASK[0x00] = 15 & ~2;
CASTLE_MASK[0x07] = 15 & ~1;
CASTLE_MASK[0x04] = 15 & ~3;
CASTLE_MASK[0x70] = 15 & ~8;
CASTLE_MASK[0x77] = 15 & ~4;
CASTLE_MASK[0x74] = 15 & ~12;

// Zobrist keys (two 32-bit halves) from a fixed xorshift seed.
let seed = 0x9e3779b9;
function rand32() {
  seed ^= seed << 13;
  seed ^= seed >>> 17;
  seed ^= seed << 5;
  return seed | 0;
}
const Z_PIECE_LO = new Int32Array(16 * 128).map(rand32);
const Z_PIECE_HI = new Int32Array(16 * 128).map(rand32);
const Z_CASTLE_LO = new Int32Array(16).map(rand32);
const Z_CASTLE_HI = new Int32Array(16).map(rand32);
const Z_EP_LO = new Int32Array(8).map(rand32);
const Z_EP_HI = new Int32Array(8).map(rand32);
const Z_SIDE_LO = rand32();
const Z_SIDE_HI = rand32();

const FILES = 'abcdefgh';
export const sqName = (sq: number) => FILES[sq & 7] + ((sq >> 4) + 1);
export const sqIndex = (name: string) => (name.charCodeAt(1) - 49) * 16 + (name.charCodeAt(0) - 97);

export const moveFrom = (m: number) => m & 127;
export const moveTo = (m: number) => (m >> 7) & 127;
export const movePromo = (m: number) => (m >> 14) & 7;
export const moveFlags = (m: number) => (m >> 17) & 15;
const mk = (from: number, to: number, promo: number, flags: number) => from | (to << 7) | (promo << 14) | (flags << 17);

export function moveToUci(m: number): string {
  const p = movePromo(m);
  return sqName(moveFrom(m)) + sqName(moveTo(m)) + (p ? ' pnbrqk'[p] : '');
}

export class Position {
  b = new Int8Array(128);
  side = WHITE;
  castle = 0;
  ep = -1;
  half = 0;
  full = 1;
  kings = [0x04, 0x74];
  lo = 0;
  hi = 0;

  // Undo stack
  private uCap = new Int8Array(1024);
  private uCastle = new Int8Array(1024);
  private uEp = new Int16Array(1024);
  private uHalf = new Int16Array(1024);
  private uLo = new Int32Array(1024);
  private uHi = new Int32Array(1024);
  /** Hash history for repetition detection (game + search). */
  histLo = new Int32Array(2048);
  histHi = new Int32Array(2048);
  sp = 0;
  hp = 0;

  constructor(fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1') {
    this.load(fen);
  }

  load(fen: string) {
    const [placement, side, castle, ep, half, full] = fen.trim().split(/\s+/);
    this.b.fill(0);
    let rank = 7;
    let file = 0;
    for (const ch of placement) {
      if (ch === '/') {
        rank--;
        file = 0;
      } else if (ch >= '1' && ch <= '8') file += Number(ch);
      else {
        const color = ch === ch.toUpperCase() ? WHITE : BLACK;
        const type = ' pnbrqk'.indexOf(ch.toLowerCase());
        const sq = rank * 16 + file;
        this.b[sq] = color | type;
        if (type === KING) this.kings[color ? 1 : 0] = sq;
        file++;
      }
    }
    this.side = side === 'b' ? BLACK : WHITE;
    this.castle = 0;
    if (castle && castle !== '-') {
      if (castle.includes('K')) this.castle |= 1;
      if (castle.includes('Q')) this.castle |= 2;
      if (castle.includes('k')) this.castle |= 4;
      if (castle.includes('q')) this.castle |= 8;
    }
    this.ep = ep && ep !== '-' ? sqIndex(ep) : -1;
    this.half = Number(half) || 0;
    this.full = Number(full) || 1;
    this.sp = 0;
    this.hp = 0;
    this.rehash();
    this.pushHist();
  }

  private rehash() {
    let lo = 0;
    let hi = 0;
    for (let sq = 0; sq < 128; sq++) {
      if (sq & 0x88) {
        sq += 7;
        continue;
      }
      const p = this.b[sq];
      if (p) {
        lo ^= Z_PIECE_LO[p * 128 + sq];
        hi ^= Z_PIECE_HI[p * 128 + sq];
      }
    }
    lo ^= Z_CASTLE_LO[this.castle];
    hi ^= Z_CASTLE_HI[this.castle];
    if (this.ep >= 0) {
      lo ^= Z_EP_LO[this.ep & 7];
      hi ^= Z_EP_HI[this.ep & 7];
    }
    if (this.side) {
      lo ^= Z_SIDE_LO;
      hi ^= Z_SIDE_HI;
    }
    this.lo = lo;
    this.hi = hi;
  }

  private pushHist() {
    this.histLo[this.hp] = this.lo;
    this.histHi[this.hp] = this.hi;
    this.hp++;
  }

  attacked(sq: number, by: number): boolean {
    const b = this.b;
    if (by === WHITE) {
      if (!((sq - 15) & 0x88) && b[sq - 15] === (WHITE | PAWN)) return true;
      if (!((sq - 17) & 0x88) && b[sq - 17] === (WHITE | PAWN)) return true;
    } else {
      if (!((sq + 15) & 0x88) && b[sq + 15] === (BLACK | PAWN)) return true;
      if (!((sq + 17) & 0x88) && b[sq + 17] === (BLACK | PAWN)) return true;
    }
    for (let i = 0; i < 8; i++) {
      const t = sq + KNIGHT_D[i];
      if (!(t & 0x88) && b[t] === (by | KNIGHT)) return true;
      const k = sq + KING_D[i];
      if (!(k & 0x88) && b[k] === (by | KING)) return true;
    }
    for (let i = 0; i < 4; i++) {
      let d = BISHOP_D[i];
      let t = sq + d;
      while (!(t & 0x88)) {
        const p = b[t];
        if (p) {
          if (p === (by | BISHOP) || p === (by | QUEEN)) return true;
          break;
        }
        t += d;
      }
      d = ROOK_D[i];
      t = sq + d;
      while (!(t & 0x88)) {
        const p = b[t];
        if (p) {
          if (p === (by | ROOK) || p === (by | QUEEN)) return true;
          break;
        }
        t += d;
      }
    }
    return false;
  }

  inCheck(): boolean {
    return this.attacked(this.kings[this.side ? 1 : 0], this.side ^ 8);
  }

  /** Pseudo-legal moves into `out`, returns count. */
  generate(out: Int32Array, capturesOnly = false): number {
    const b = this.b;
    const us = this.side;
    const them = us ^ 8;
    let n = 0;
    const dir = us === WHITE ? 16 : -16;
    const startRank = us === WHITE ? 1 : 6;
    const promoRank = us === WHITE ? 7 : 0;

    for (let from = 0; from < 128; from++) {
      if (from & 0x88) {
        from += 7;
        continue;
      }
      const p = b[from];
      if (!p || (p & 8) !== us) continue;
      const type = p & 7;

      if (type === PAWN) {
        const one = from + dir;
        if (!(one & 0x88) && !b[one]) {
          if (one >> 4 === promoRank) {
            out[n++] = mk(from, one, QUEEN, 0);
            if (!capturesOnly) {
              out[n++] = mk(from, one, KNIGHT, 0);
              out[n++] = mk(from, one, ROOK, 0);
              out[n++] = mk(from, one, BISHOP, 0);
            }
          } else if (!capturesOnly) {
            out[n++] = mk(from, one, 0, 0);
            const two = one + dir;
            if (from >> 4 === startRank && !b[two]) out[n++] = mk(from, two, 0, DOUBLE);
          }
        }
        for (const c of [dir - 1, dir + 1]) {
          const t = from + c;
          if (t & 0x88) continue;
          const q = b[t];
          if (q && (q & 8) === them) {
            if (t >> 4 === promoRank) {
              out[n++] = mk(from, t, QUEEN, CAP);
              if (!capturesOnly) {
                out[n++] = mk(from, t, KNIGHT, CAP);
                out[n++] = mk(from, t, ROOK, CAP);
                out[n++] = mk(from, t, BISHOP, CAP);
              }
            } else out[n++] = mk(from, t, 0, CAP);
          } else if (t === this.ep) out[n++] = mk(from, t, 0, CAP | EP);
        }
        continue;
      }

      if (type === KNIGHT || type === KING) {
        const ds = type === KNIGHT ? KNIGHT_D : KING_D;
        for (let i = 0; i < 8; i++) {
          const t = from + ds[i];
          if (t & 0x88) continue;
          const q = b[t];
          if (!q) {
            if (!capturesOnly) out[n++] = mk(from, t, 0, 0);
          } else if ((q & 8) === them) out[n++] = mk(from, t, 0, CAP);
        }
        if (type === KING && !capturesOnly) n = this.genCastles(out, n);
        continue;
      }

      const dirs = type === BISHOP ? BISHOP_D : type === ROOK ? ROOK_D : KING_D;
      for (let i = 0; i < dirs.length; i++) {
        const d = dirs[i];
        let t = from + d;
        while (!(t & 0x88)) {
          const q = b[t];
          if (!q) {
            if (!capturesOnly) out[n++] = mk(from, t, 0, 0);
          } else {
            if ((q & 8) === them) out[n++] = mk(from, t, 0, CAP);
            break;
          }
          t += d;
        }
      }
    }
    return n;
  }

  private genCastles(out: Int32Array, n: number): number {
    const b = this.b;
    if (this.side === WHITE) {
      if (this.castle & 1 && !b[0x05] && !b[0x06] && b[0x07] === (WHITE | ROOK) && !this.attacked(0x04, BLACK) && !this.attacked(0x05, BLACK) && !this.attacked(0x06, BLACK))
        out[n++] = mk(0x04, 0x06, 0, CASTLE);
      if (this.castle & 2 && !b[0x03] && !b[0x02] && !b[0x01] && b[0x00] === (WHITE | ROOK) && !this.attacked(0x04, BLACK) && !this.attacked(0x03, BLACK) && !this.attacked(0x02, BLACK))
        out[n++] = mk(0x04, 0x02, 0, CASTLE);
    } else {
      if (this.castle & 4 && !b[0x75] && !b[0x76] && b[0x77] === (BLACK | ROOK) && !this.attacked(0x74, WHITE) && !this.attacked(0x75, WHITE) && !this.attacked(0x76, WHITE))
        out[n++] = mk(0x74, 0x76, 0, CASTLE);
      if (this.castle & 8 && !b[0x73] && !b[0x72] && !b[0x71] && b[0x70] === (BLACK | ROOK) && !this.attacked(0x74, WHITE) && !this.attacked(0x73, WHITE) && !this.attacked(0x72, WHITE))
        out[n++] = mk(0x74, 0x72, 0, CASTLE);
    }
    return n;
  }

  private put(sq: number, p: number) {
    this.b[sq] = p;
    this.lo ^= Z_PIECE_LO[p * 128 + sq];
    this.hi ^= Z_PIECE_HI[p * 128 + sq];
  }

  private take(sq: number) {
    const p = this.b[sq];
    this.b[sq] = 0;
    this.lo ^= Z_PIECE_LO[p * 128 + sq];
    this.hi ^= Z_PIECE_HI[p * 128 + sq];
  }

  /** Makes a pseudo-legal move; returns false (and undoes it) if it leaves the king in check. */
  make(m: number): boolean {
    const from = moveFrom(m);
    const to = moveTo(m);
    const promo = movePromo(m);
    const flags = moveFlags(m);
    const us = this.side;
    const piece = this.b[from];
    const sp = this.sp++;

    this.uCastle[sp] = this.castle;
    this.uEp[sp] = this.ep;
    this.uHalf[sp] = this.half;
    this.uLo[sp] = this.lo;
    this.uHi[sp] = this.hi;

    let captured = 0;
    if (flags & EP) {
      const capSq = to + (us === WHITE ? -16 : 16);
      captured = this.b[capSq];
      this.take(capSq);
    } else if (this.b[to]) {
      captured = this.b[to];
      this.take(to);
    }
    this.uCap[sp] = captured;

    this.take(from);
    this.put(to, promo ? us | promo : piece);

    if (flags & CASTLE) {
      if (to > from) {
        const r = this.b[from + 3];
        this.take(from + 3);
        this.put(from + 1, r);
      } else {
        const r = this.b[from - 4];
        this.take(from - 4);
        this.put(from - 1, r);
      }
    }

    if ((piece & 7) === KING) this.kings[us ? 1 : 0] = to;

    this.lo ^= Z_CASTLE_LO[this.castle];
    this.hi ^= Z_CASTLE_HI[this.castle];
    this.castle &= CASTLE_MASK[from] & CASTLE_MASK[to];
    this.lo ^= Z_CASTLE_LO[this.castle];
    this.hi ^= Z_CASTLE_HI[this.castle];

    if (this.ep >= 0) {
      this.lo ^= Z_EP_LO[this.ep & 7];
      this.hi ^= Z_EP_HI[this.ep & 7];
    }
    this.ep = flags & DOUBLE ? (from + to) >> 1 : -1;
    if (this.ep >= 0) {
      this.lo ^= Z_EP_LO[this.ep & 7];
      this.hi ^= Z_EP_HI[this.ep & 7];
    }

    this.half = (piece & 7) === PAWN || captured ? 0 : this.half + 1;
    if (us === BLACK) this.full++;
    this.side ^= 8;
    this.lo ^= Z_SIDE_LO;
    this.hi ^= Z_SIDE_HI;
    this.pushHist();

    if (this.attacked(this.kings[us ? 1 : 0], this.side)) {
      this.unmake(m);
      return false;
    }
    return true;
  }

  unmake(m: number) {
    const sp = --this.sp;
    this.hp--;
    const from = moveFrom(m);
    const to = moveTo(m);
    const promo = movePromo(m);
    const flags = moveFlags(m);
    this.side ^= 8;
    const us = this.side;
    if (us === BLACK) this.full--;

    const moved = this.b[to];
    this.b[to] = 0;
    this.b[from] = promo ? us | PAWN : moved;
    if ((moved & 7) === KING) this.kings[us ? 1 : 0] = from;

    const captured = this.uCap[sp];
    if (flags & EP) this.b[to + (us === WHITE ? -16 : 16)] = captured;
    else if (captured) this.b[to] = captured;

    if (flags & CASTLE) {
      if (to > from) {
        this.b[from + 3] = this.b[from + 1];
        this.b[from + 1] = 0;
      } else {
        this.b[from - 4] = this.b[from - 1];
        this.b[from - 1] = 0;
      }
    }

    this.castle = this.uCastle[sp];
    this.ep = this.uEp[sp];
    this.half = this.uHalf[sp];
    this.lo = this.uLo[sp];
    this.hi = this.uHi[sp];
  }

  makeNull() {
    const sp = this.sp++;
    this.uCastle[sp] = this.castle;
    this.uEp[sp] = this.ep;
    this.uHalf[sp] = this.half;
    this.uLo[sp] = this.lo;
    this.uHi[sp] = this.hi;
    this.uCap[sp] = 0;
    if (this.ep >= 0) {
      this.lo ^= Z_EP_LO[this.ep & 7];
      this.hi ^= Z_EP_HI[this.ep & 7];
    }
    this.ep = -1;
    this.half++;
    this.side ^= 8;
    this.lo ^= Z_SIDE_LO;
    this.hi ^= Z_SIDE_HI;
    this.pushHist();
  }

  unmakeNull() {
    const sp = --this.sp;
    this.hp--;
    this.side ^= 8;
    this.castle = this.uCastle[sp];
    this.ep = this.uEp[sp];
    this.half = this.uHalf[sp];
    this.lo = this.uLo[sp];
    this.hi = this.uHi[sp];
  }

  isRepetition(): boolean {
    const end = Math.max(0, this.hp - 1 - this.half);
    for (let i = this.hp - 3; i >= end; i -= 2) {
      if (this.histLo[i] === this.lo && this.histHi[i] === this.hi) return true;
    }
    return false;
  }

  /** Legal moves as encoded ints. */
  legalMoves(): number[] {
    const buf = new Int32Array(256);
    const n = this.generate(buf);
    const out: number[] = [];
    for (let i = 0; i < n; i++) {
      if (this.make(buf[i])) {
        this.unmake(buf[i]);
        out.push(buf[i]);
      }
    }
    return out;
  }

  /** Finds the legal move matching a UCI string (e.g. e7e8q). */
  parseUci(uci: string): number {
    const from = sqIndex(uci.slice(0, 2));
    const to = sqIndex(uci.slice(2, 4));
    const promo = uci[4] ? ' pnbrqk'.indexOf(uci[4]) : 0;
    for (const m of this.legalMoves()) if (moveFrom(m) === from && moveTo(m) === to && movePromo(m) === promo) return m;
    return 0;
  }

  insufficient(): boolean {
    let minors = 0;
    for (let sq = 0; sq < 128; sq++) {
      if (sq & 0x88) {
        sq += 7;
        continue;
      }
      const t = this.b[sq] & 7;
      if (t === PAWN || t === ROOK || t === QUEEN) return false;
      if (t === KNIGHT || t === BISHOP) minors++;
    }
    return minors <= 1;
  }
}

// Evaluation ------------------------------------------------------------------

const pawnFiles = [new Int8Array(8), new Int8Array(8)];
const pawnMost = [new Int8Array(8), new Int8Array(8)]; // most advanced rank per file

export function evaluate(pos: Position): number {
  const b = pos.b;
  let mg = 0;
  let eg = 0;
  let phase = 0;
  const bishops = [0, 0];
  const material = [0, 0];
  pawnFiles[0].fill(0);
  pawnFiles[1].fill(0);
  pawnMost[0].fill(-1);
  pawnMost[1].fill(8);

  for (let sq = 0; sq < 128; sq++) {
    if (sq & 0x88) {
      sq += 7;
      continue;
    }
    const p = b[sq];
    if (!p) continue;
    const type = p & 7;
    const white = !(p & 8);
    const c = white ? 0 : 1;
    const rank = sq >> 4;
    const file = sq & 7;
    const idx = white ? (7 - rank) * 8 + file : rank * 8 + file;
    const sign = white ? 1 : -1;
    phase += PHASE_W[type];
    material[c] += VALUE[type];
    if (type === KING) {
      mg += sign * PST[KING][idx];
      eg += sign * KING_EG[idx];
      continue;
    }
    const v = VALUE[type] + PST[type][idx];
    mg += sign * v;
    eg += sign * v;
    if (type === BISHOP) bishops[c]++;
    if (type === PAWN) {
      pawnFiles[c][file]++;
      if (white) pawnMost[0][file] = Math.max(pawnMost[0][file], rank);
      else pawnMost[1][file] = Math.min(pawnMost[1][file], rank);
    }
  }

  // Pawn structure: doubled, isolated and passed pawns.
  for (let f = 0; f < 8; f++) {
    for (let c = 0; c < 2; c++) {
      const cnt = pawnFiles[c][f];
      if (!cnt) continue;
      const sign = c === 0 ? 1 : -1;
      if (cnt > 1) {
        mg -= sign * 12 * (cnt - 1);
        eg -= sign * 18 * (cnt - 1);
      }
      const left = f > 0 ? pawnFiles[c][f - 1] : 0;
      const right = f < 7 ? pawnFiles[c][f + 1] : 0;
      if (!left && !right) {
        mg -= sign * 10;
        eg -= sign * 14;
      }
    }
  }
  for (let sq = 0; sq < 128; sq++) {
    if (sq & 0x88) {
      sq += 7;
      continue;
    }
    const p = b[sq];
    if ((p & 7) !== PAWN) continue;
    const white = !(p & 8);
    const rank = sq >> 4;
    const file = sq & 7;
    let passed = true;
    for (let df = -1; df <= 1 && passed; df++) {
      const f = file + df;
      if (f < 0 || f > 7) continue;
      if (white && pawnMost[1][f] < 8 && pawnFiles[1][f] && hasPawnAhead(b, f, rank, true)) passed = false;
      if (!white && pawnFiles[0][f] && hasPawnAhead(b, f, rank, false)) passed = false;
    }
    if (passed) {
      const adv = white ? rank : 7 - rank;
      mg += (white ? 1 : -1) * (PASSED[adv] >> 1);
      eg += (white ? 1 : -1) * PASSED[adv];
    }
  }

  // Rooks on open / semi-open files.
  for (let sq = 0; sq < 128; sq++) {
    if (sq & 0x88) {
      sq += 7;
      continue;
    }
    const p = b[sq];
    if ((p & 7) !== ROOK) continue;
    const c = p & 8 ? 1 : 0;
    const f = sq & 7;
    const own = pawnFiles[c][f];
    const opp = pawnFiles[c ^ 1][f];
    const bonus = !own ? (!opp ? 22 : 11) : 0;
    mg += c === 0 ? bonus : -bonus;
  }

  if (bishops[0] >= 2) {
    mg += 30;
    eg += 45;
  }
  if (bishops[1] >= 2) {
    mg -= 30;
    eg -= 45;
  }

  if (phase > 24) phase = 24;
  let score = ((mg * phase + eg * (24 - phase)) / 24) | 0;

  // Mop-up: with a clear material edge and no pawns left for the loser, drive its king to the edge.
  const wk = pos.kings[0];
  const bk = pos.kings[1];
  const diff = material[0] - material[1];
  if (Math.abs(diff) >= 300 && phase <= 8) {
    const loserK = diff > 0 ? bk : wk;
    const winnerK = diff > 0 ? wk : bk;
    const lf = loserK & 7;
    const lr = loserK >> 4;
    const center = Math.max(3 - lf, lf - 4) + Math.max(3 - lr, lr - 4);
    const kd = Math.abs(lf - (winnerK & 7)) + Math.abs(lr - (winnerK >> 4));
    const mop = center * 10 + (14 - kd) * 4;
    score += diff > 0 ? mop : -mop;
  }

  score += pos.side === WHITE ? 10 : -10; // tempo
  return pos.side === WHITE ? score : -score;
}

function hasPawnAhead(b: Int8Array, file: number, rank: number, white: boolean): boolean {
  const enemy = white ? BLACK | PAWN : WHITE | PAWN;
  if (white) {
    for (let r = rank + 1; r < 8; r++) if (b[r * 16 + file] === enemy) return true;
  } else {
    for (let r = rank - 1; r >= 0; r--) if (b[r * 16 + file] === enemy) return true;
  }
  return false;
}

// Search -----------------------------------------------------------------------

const TT_BITS = 18;
const TT_SIZE = 1 << TT_BITS;
const TT_MASK = TT_SIZE - 1;
const EXACT = 1;
const LOWER = 2;
const UPPER = 3;

export interface SearchInfo {
  depth: number;
  score: number;
  /** Mate in N (positive = side to move mates), or null. */
  mate: number | null;
  pv: string[];
  nodes: number;
  timeMs: number;
}

export interface SearchOptions {
  maxDepth?: number;
  timeMs?: number;
  onInfo?: (info: SearchInfo) => void;
}

export class Searcher {
  private ttLo = new Int32Array(TT_SIZE);
  private ttHi = new Int32Array(TT_SIZE);
  private ttMove = new Int32Array(TT_SIZE);
  private ttScore = new Int16Array(TT_SIZE);
  private ttDepth = new Int8Array(TT_SIZE);
  private ttFlag = new Int8Array(TT_SIZE);
  private killers = new Int32Array(MAX_PLY * 2);
  private history = new Int32Array(16 * 128);
  private moveBufs: Int32Array[] = Array.from({ length: MAX_PLY + 1 }, () => new Int32Array(256));
  private scoreBufs: Int32Array[] = Array.from({ length: MAX_PLY + 1 }, () => new Int32Array(256));
  private nodes = 0;
  private deadline = 0;
  private stopped = false;
  private pos!: Position;

  clear() {
    this.ttLo.fill(0);
    this.ttHi.fill(0);
    this.ttMove.fill(0);
    this.ttDepth.fill(0);
    this.ttFlag.fill(0);
    this.history.fill(0);
  }

  private timeUp() {
    if ((this.nodes & 1023) === 0 && Date.now() > this.deadline) this.stopped = true;
    return this.stopped;
  }

  private probe(pos: Position) {
    const i = pos.lo & TT_MASK;
    return this.ttLo[i] === pos.lo && this.ttHi[i] === pos.hi && this.ttFlag[i] ? i : -1;
  }

  private store(pos: Position, depth: number, flag: number, score: number, move: number, ply: number) {
    const i = pos.lo & TT_MASK;
    if (this.ttFlag[i] && this.ttLo[i] !== pos.lo && this.ttDepth[i] > depth + 2) return;
    // Mate scores are stored relative to this node.
    if (score > MATE - 200) score += ply;
    else if (score < -MATE + 200) score -= ply;
    this.ttLo[i] = pos.lo;
    this.ttHi[i] = pos.hi;
    this.ttMove[i] = move;
    this.ttScore[i] = score;
    this.ttDepth[i] = depth;
    this.ttFlag[i] = flag;
  }

  private order(pos: Position, moves: Int32Array, scores: Int32Array, n: number, ttMove: number, ply: number) {
    const b = pos.b;
    for (let i = 0; i < n; i++) {
      const m = moves[i];
      if (m === ttMove) scores[i] = 1_000_000;
      else if (moveFlags(m) & CAP) {
        const victim = moveFlags(m) & EP ? PAWN : b[moveTo(m)] & 7;
        scores[i] = 100_000 + VALUE[victim] * 10 - (b[moveFrom(m)] & 7);
      } else if (movePromo(m)) scores[i] = 90_000 + VALUE[movePromo(m)];
      else if (m === this.killers[ply * 2]) scores[i] = 80_000;
      else if (m === this.killers[ply * 2 + 1]) scores[i] = 79_000;
      else scores[i] = this.history[(b[moveFrom(m)] & 15) * 128 + moveTo(m)];
    }
  }

  private pick(moves: Int32Array, scores: Int32Array, n: number, i: number) {
    let best = i;
    for (let j = i + 1; j < n; j++) if (scores[j] > scores[best]) best = j;
    if (best !== i) {
      const m = moves[i];
      moves[i] = moves[best];
      moves[best] = m;
      const s = scores[i];
      scores[i] = scores[best];
      scores[best] = s;
    }
    return moves[i];
  }

  private quiesce(alpha: number, beta: number, ply: number): number {
    this.nodes++;
    if (this.timeUp()) return 0;
    const pos = this.pos;
    const stand = evaluate(pos);
    if (ply >= MAX_PLY) return stand;
    if (stand >= beta) return stand;
    if (stand > alpha) alpha = stand;

    const moves = this.moveBufs[ply];
    const scores = this.scoreBufs[ply];
    const n = pos.generate(moves, true);
    this.order(pos, moves, scores, n, 0, ply);
    for (let i = 0; i < n; i++) {
      const m = this.pick(moves, scores, n, i);
      // Delta pruning: skip captures that cannot raise alpha.
      if (!movePromo(m) && !(moveFlags(m) & EP)) {
        const gain = VALUE[pos.b[moveTo(m)] & 7];
        if (stand + gain + 200 < alpha) continue;
      }
      if (!pos.make(m)) continue;
      const score = -this.quiesce(-beta, -alpha, ply + 1);
      pos.unmake(m);
      if (this.stopped) return 0;
      if (score > alpha) {
        alpha = score;
        if (score >= beta) return score;
      }
    }
    return alpha;
  }

  private search(depth: number, alpha: number, beta: number, ply: number, allowNull: boolean): number {
    const pos = this.pos;
    if (ply > 0) {
      if (pos.half >= 100 || pos.isRepetition() || pos.insufficient()) return 0;
      // Mate distance pruning.
      alpha = Math.max(alpha, -MATE + ply);
      beta = Math.min(beta, MATE - ply - 1);
      if (alpha >= beta) return alpha;
    }
    const inCheck = pos.inCheck();
    if (inCheck) depth++;
    if (depth <= 0 || ply >= MAX_PLY) return this.quiesce(alpha, beta, ply);

    this.nodes++;
    if (this.timeUp()) return 0;

    const pv = beta - alpha > 1;
    let ttMove = 0;
    const ti = this.probe(pos);
    if (ti >= 0) {
      ttMove = this.ttMove[ti];
      if (!pv && ply > 0 && this.ttDepth[ti] >= depth) {
        let s = this.ttScore[ti];
        if (s > MATE - 200) s -= ply;
        else if (s < -MATE + 200) s += ply;
        const f = this.ttFlag[ti];
        if (f === EXACT || (f === LOWER && s >= beta) || (f === UPPER && s <= alpha)) return s;
      }
    }

    if (allowNull && !pv && !inCheck && depth >= 3 && this.hasPieces(pos) && evaluate(pos) >= beta) {
      pos.makeNull();
      const s = -this.search(depth - 3, -beta, -beta + 1, ply + 1, false);
      pos.unmakeNull();
      if (this.stopped) return 0;
      if (s >= beta) return beta;
    }

    const moves = this.moveBufs[ply];
    const scores = this.scoreBufs[ply];
    const n = pos.generate(moves);
    this.order(pos, moves, scores, n, ttMove, ply);

    let legal = 0;
    let best = -INF;
    let bestMove = 0;
    const origAlpha = alpha;

    for (let i = 0; i < n; i++) {
      const m = this.pick(moves, scores, n, i);
      if (!pos.make(m)) continue;
      legal++;
      const quiet = !(moveFlags(m) & CAP) && !movePromo(m);
      let score: number;
      if (legal === 1) score = -this.search(depth - 1, -beta, -alpha, ply + 1, true);
      else {
        const reduce = depth >= 3 && legal > 3 && quiet && !inCheck && !pos.inCheck() ? (legal > 8 ? 2 : 1) : 0;
        score = -this.search(depth - 1 - reduce, -alpha - 1, -alpha, ply + 1, true);
        if (score > alpha && (reduce || score < beta)) score = -this.search(depth - 1, -beta, -alpha, ply + 1, true);
      }
      pos.unmake(m);
      if (this.stopped) return 0;

      if (score > best) {
        best = score;
        bestMove = m;
        if (score > alpha) {
          alpha = score;
          if (score >= beta) {
            if (quiet) {
              if (this.killers[ply * 2] !== m) {
                this.killers[ply * 2 + 1] = this.killers[ply * 2];
                this.killers[ply * 2] = m;
              }
              this.history[(pos.b[moveFrom(m)] & 15) * 128 + moveTo(m)] += depth * depth;
            }
            break;
          }
        }
      }
    }

    if (!legal) return inCheck ? -MATE + ply : 0;

    this.store(pos, depth, best >= beta ? LOWER : best > origAlpha ? EXACT : UPPER, best, bestMove, ply);
    return best;
  }

  private hasPieces(pos: Position) {
    const us = pos.side;
    for (let sq = 0; sq < 128; sq++) {
      if (sq & 0x88) {
        sq += 7;
        continue;
      }
      const p = pos.b[sq];
      if (p && (p & 8) === us && (p & 7) !== PAWN && (p & 7) !== KING) return true;
    }
    return false;
  }

  private pvLine(pos: Position, first: number, maxLen = 12): string[] {
    const line: string[] = [];
    const made: number[] = [];
    let m = first;
    while (m && line.length < maxLen) {
      if (!pos.make(m)) break;
      made.push(m);
      line.push(moveToUci(m));
      const ti = this.probe(pos);
      m = ti >= 0 ? this.ttMove[ti] : 0;
      if (m && !pos.legalMoves().includes(m)) break;
    }
    for (let i = made.length - 1; i >= 0; i--) pos.unmake(made[i]);
    return line;
  }

  /** Iterative deepening search. Returns the best move (0 if none) and the last completed info. */
  think(pos: Position, opts: SearchOptions = {}): { move: number; info: SearchInfo | null } {
    const maxDepth = Math.min(opts.maxDepth ?? 64, MAX_PLY - 8);
    const timeMs = opts.timeMs ?? 1000;
    const start = Date.now();
    this.pos = pos;
    this.deadline = start + timeMs;
    this.stopped = false;
    this.nodes = 0;
    this.killers.fill(0);
    for (let i = 0; i < this.history.length; i++) this.history[i] >>= 2;

    const legal = pos.legalMoves();
    if (!legal.length) return { move: 0, info: null };

    let bestMove = legal[0];
    let lastInfo: SearchInfo | null = null;
    let prevScore = 0;

    for (let depth = 1; depth <= maxDepth; depth++) {
      // Aspiration window around the previous score after the first iterations.
      let lo = -INF;
      let hi = INF;
      if (depth >= 4) {
        lo = prevScore - 40;
        hi = prevScore + 40;
      }
      let score = this.search(depth, lo, hi, 0, false);
      if (!this.stopped && (score <= lo || score >= hi)) score = this.search(depth, -INF, INF, 0, false);
      if (this.stopped) break;

      const ti = this.probe(pos);
      if (ti >= 0 && this.ttMove[ti] && legal.includes(this.ttMove[ti])) bestMove = this.ttMove[ti];
      prevScore = score;
      const mate = Math.abs(score) > MATE - 200 ? (score > 0 ? Math.ceil((MATE - score) / 2) : -Math.ceil((MATE + score) / 2)) : null;
      lastInfo = { depth, score, mate, pv: this.pvLine(pos, bestMove), nodes: this.nodes, timeMs: Date.now() - start };
      opts.onInfo?.(lastInfo);
      if (mate !== null && Math.abs(mate) * 2 < depth) break;
      // Don't start an iteration that would very likely not finish.
      if (Date.now() - start > timeMs * 0.55) break;
    }
    return { move: bestMove, info: lastInfo };
  }

  /** Scores every legal root move with a fixed-depth search (used for weaker, human-like bots). */
  rootScores(pos: Position, depth: number, timeMs = 1500): { move: number; score: number }[] {
    this.pos = pos;
    this.deadline = Date.now() + timeMs;
    this.stopped = false;
    this.nodes = 0;
    const out: { move: number; score: number }[] = [];
    for (const m of pos.legalMoves()) {
      pos.make(m);
      const s = depth <= 1 ? -this.quiesce(-INF, INF, 1) : -this.search(depth - 1, -INF, INF, 1, true);
      pos.unmake(m);
      out.push({ move: m, score: this.stopped ? -INF : s });
    }
    return out.filter((r) => r.score > -INF).sort((a, b) => b.score - a.score);
  }
}

export function perft(pos: Position, depth: number): number {
  if (depth === 0) return 1;
  const buf = new Int32Array(256);
  const n = pos.generate(buf);
  let total = 0;
  for (let i = 0; i < n; i++) {
    if (!pos.make(buf[i])) continue;
    total += perft(pos, depth - 1);
    pos.unmake(buf[i]);
  }
  return total;
}
