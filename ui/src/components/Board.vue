<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, shallowRef, watch } from 'vue';
import type { Color } from '../types';
import { parsePlacement, premoveDests, fileOf, rankOf, squareAt, isLight, FILES, type BoardMap, type Role } from '../chess/util';
import { settings, boardThemes, animationMs } from '../stores/settings';
import { pieceUrl } from '../chess/pieces';

const props = withDefaults(
  defineProps<{
    fen: string;
    orientation?: Color;
    /** Which colour the user controls. 'both' = analysis, 'none' = spectate/replay. */
    movable?: Color | 'both' | 'none';
    /** Side to move in the real game (may differ from `fen` while premoves are shown). */
    turn?: Color;
    /** Legal destinations for the side to move, keyed by origin square. */
    dests?: Record<string, string[]>;
    lastMove?: [string, string] | null;
    check?: string | null;
    allowPremove?: boolean;
    premoveSquares?: string[];
    /** Board editor: any piece can go anywhere, dragging off-board removes it. */
    free?: boolean;
    /** Extra arrows drawn by the app (hints, engine best move), as `e2e4` keys. */
    shapes?: string[];
  }>(),
  {
    orientation: 'w',
    movable: 'both',
    turn: 'w',
    dests: () => ({}),
    lastMove: null,
    check: null,
    allowPremove: false,
    premoveSquares: () => [],
    free: false,
    shapes: () => [],
  },
);

const emit = defineEmits<{
  move: [from: string, to: string, promotion?: string];
  premove: [from: string, to: string, promotion?: string];
  cancelPremoves: [];
  freeMove: [from: string, to: string | null];
  squareTap: [square: string];
}>();

// Geometry -------------------------------------------------------------------

const root = ref<HTMLElement>();
const size = ref(360);
let ro: ResizeObserver | null = null;
onMounted(() => {
  ro = new ResizeObserver(([e]) => (size.value = e.contentRect.width));
  if (root.value) ro.observe(root.value);
});
onBeforeUnmount(() => ro?.disconnect());

const flipped = computed(() => props.orientation === 'b');
const toXY = (sq: string) => {
  const f = fileOf(sq);
  const r = rankOf(sq);
  return flipped.value ? { x: 7 - f, y: r } : { x: f, y: 7 - r };
};
const squareStyle = (sq: string) => {
  const { x, y } = toXY(sq);
  return { left: `${x * 12.5}%`, top: `${y * 12.5}%` };
};
function squareFromPoint(clientX: number, clientY: number): string | null {
  const rect = root.value!.getBoundingClientRect();
  const x = Math.floor(((clientX - rect.left) / rect.width) * 8);
  const y = Math.floor(((clientY - rect.top) / rect.height) * 8);
  if (x < 0 || x > 7 || y < 0 || y > 7) return null;
  return flipped.value ? squareAt(7 - x, y) : squareAt(x, 7 - y);
}

const theme = computed(() => boardThemes[settings.boardTheme] ?? boardThemes.green);
const boardBg = computed(
  () => `repeating-conic-gradient(${theme.value.dark} 0 25%, ${theme.value.light} 0 50%) 0 0 / 25% 25%`,
);

// Pieces with stable identities so moves animate -------------------------------

interface VPiece {
  id: number;
  color: Color;
  role: Role;
  square: string;
  captured?: boolean;
  instant?: boolean;
}

let pid = 0;
const pieces = ref<VPiece[]>([]);
const board = shallowRef<BoardMap>(new Map());
let instantSquare: string | null = null;

const dist = (a: string, b: string) => Math.abs(fileOf(a) - fileOf(b)) + Math.abs(rankOf(a) - rankOf(b));

function sync(fen: string) {
  const next = parsePlacement(fen);
  board.value = next;
  const prev = pieces.value.filter((p) => !p.captured);
  const remaining = new Set(prev);
  const result: VPiece[] = [];
  const unmatched: [string, { color: Color; role: Role }][] = [];

  for (const [sq, p] of next) {
    const same = prev.find((v) => remaining.has(v) && v.square === sq && v.color === p.color && v.role === p.role);
    if (same) {
      remaining.delete(same);
      result.push({ ...same, instant: false });
    } else unmatched.push([sq, p]);
  }

  for (const [sq, p] of unmatched) {
    let best: VPiece | null = null;
    for (const v of remaining) {
      if (v.color !== p.color) continue;
      // A pawn that just promoted turns into the new piece.
      const ok = v.role === p.role || (v.role === 'p' && (rankOf(sq) === 0 || rankOf(sq) === 7));
      if (ok && (!best || dist(v.square, sq) < dist(best.square, sq))) best = v;
    }
    if (best) {
      remaining.delete(best);
      result.push({ id: best.id, color: p.color, role: p.role, square: sq, instant: sq === instantSquare || !animationMs() });
    } else result.push({ id: pid++, color: p.color, role: p.role, square: sq, instant: true });
  }

  // Captured pieces linger under the attacker until its slide finishes.
  const ms = animationMs();
  const ghosts = ms && !instantSquare ? [...remaining].map((v) => ({ ...v, captured: true })) : [];
  pieces.value = [...result, ...ghosts];
  instantSquare = null;
  if (ghosts.length) {
    const ids = new Set(ghosts.map((g) => g.id));
    setTimeout(() => (pieces.value = pieces.value.filter((p) => !(p.captured && ids.has(p.id)))), ms);
  }
}

watch(() => props.fen, sync, { immediate: true });

const pieceStyle = (p: VPiece) => {
  if (drag.active && drag.id === p.id) {
    return {
      transform: `translate(${drag.x - size.value / 16}px, ${drag.y - size.value / 16}px)`,
      transition: 'none',
      zIndex: 30,
      backgroundImage: `url(${pieceUrl(p.color, p.role)})`,
    };
  }
  const { x, y } = toXY(p.square);
  const ms = animationMs();
  return {
    transform: `translate(${x * 100}%, ${y * 100}%)`,
    transition: p.instant || !ms ? 'none' : `transform ${ms}ms cubic-bezier(0.22, 0.61, 0.36, 1)`,
    zIndex: p.captured ? 1 : 2,
    backgroundImage: `url(${pieceUrl(p.color, p.role)})`,
  };
};

// Interaction -------------------------------------------------------------------

const selected = ref<string | null>(null);
const hover = ref<string | null>(null);
const drag = reactive({ id: -1, from: '', startX: 0, startY: 0, x: 0, y: 0, active: false, pending: false, deselectOnUp: false });

watch(
  () => [props.fen, props.turn, props.movable],
  () => {
    // Drop a stale selection when the position changes under it (opponent move, navigation).
    if (selected.value && !canPick(selected.value)) selected.value = null;
  },
);

function canPick(sq: string): boolean {
  const p = board.value.get(sq);
  if (!p) return false;
  if (props.free) return true;
  if (props.movable === 'none') return false;
  if (props.movable === 'both') return p.color === props.turn;
  if (p.color !== props.movable) return false;
  return p.color === props.turn || props.allowPremove;
}

function isPremoveFor(sq: string) {
  const p = board.value.get(sq);
  return !!p && !props.free && props.movable !== 'both' && p.color !== props.turn;
}

function destsFor(sq: string): string[] {
  if (props.free) return [];
  if (isPremoveFor(sq)) return premoveDests(board.value, sq);
  return props.dests[sq] ?? [];
}

const selectedDests = computed(() => (selected.value ? destsFor(selected.value) : []));

const promotion = ref<{ from: string; to: string; color: Color; premove: boolean } | null>(null);

function commit(from: string, to: string, viaDrag: boolean) {
  const piece = board.value.get(from)!;
  const premove = isPremoveFor(from);
  const lastRank = piece.color === 'w' ? 7 : 0;
  selected.value = null;
  if (piece.role === 'p' && rankOf(to) === lastRank) {
    if (settings.autoQueen) return finish(from, to, premove, viaDrag, 'q');
    if (viaDrag) instantSquare = to;
    promotion.value = { from, to, color: piece.color, premove };
    return;
  }
  finish(from, to, premove, viaDrag);
}

function finish(from: string, to: string, premove: boolean, viaDrag: boolean, promo?: string) {
  if (viaDrag) instantSquare = to;
  if (premove) emit('premove', from, to, promo);
  else emit('move', from, to, promo);
  // If the parent rejects the move the fen does not change; make sure no instant flag leaks.
  nextTick(() => (instantSquare = null));
}

function choosePromotion(role: Role | null) {
  const p = promotion.value;
  promotion.value = null;
  if (p && role) finish(p.from, p.to, p.premove, false, role);
}

// Arrows & marks (right mouse) -----------------------------------------------------

const arrows = ref<string[]>([]);
const marks = ref<string[]>([]);
let rightFrom: string | null = null;

function toggle(list: typeof arrows, key: string) {
  const i = list.value.indexOf(key);
  if (i >= 0) list.value.splice(i, 1);
  else list.value.push(key);
}

function clearAnnotations() {
  arrows.value = [];
  marks.value = [];
}

defineExpose({ clearAnnotations });

function localPoint(e: PointerEvent) {
  const rect = root.value!.getBoundingClientRect();
  return { x: ((e.clientX - rect.left) / rect.width) * size.value, y: ((e.clientY - rect.top) / rect.height) * size.value };
}

function onPointerDown(e: PointerEvent) {
  if (promotion.value) return;
  const sq = squareFromPoint(e.clientX, e.clientY);

  if (e.button === 2) {
    rightFrom = sq;
    selected.value = null;
    if (props.premoveSquares.length) emit('cancelPremoves');
    return;
  }
  if (e.button !== 0 || !sq) return;

  if (arrows.value.length || marks.value.length) clearAnnotations();

  if (props.free) {
    emit('squareTap', sq);
    if (board.value.get(sq)) startDrag(e, sq, false);
    return;
  }

  if (selected.value && selected.value !== sq && selectedDests.value.includes(sq)) {
    commit(selected.value, sq, false);
    return;
  }

  if (canPick(sq)) {
    const wasSelected = selected.value === sq;
    selected.value = sq;
    startDrag(e, sq, wasSelected);
    return;
  }

  selected.value = null;
  if (props.premoveSquares.length) emit('cancelPremoves');
}

function startDrag(e: PointerEvent, sq: string, deselectOnUp: boolean) {
  const piece = pieces.value.find((p) => p.square === sq && !p.captured);
  if (!piece) return;
  const pt = localPoint(e);
  Object.assign(drag, { id: piece.id, from: sq, startX: pt.x, startY: pt.y, x: pt.x, y: pt.y, active: false, pending: true, deselectOnUp });
  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
}

function onPointerMove(e: PointerEvent) {
  if (!drag.pending) return;
  const pt = localPoint(e);
  drag.x = pt.x;
  drag.y = pt.y;
  if (!drag.active && Math.hypot(pt.x - drag.startX, pt.y - drag.startY) > 4) drag.active = true;
  if (drag.active) hover.value = squareFromPoint(e.clientX, e.clientY);
}

function onPointerUp(e: PointerEvent) {
  if (e.button === 2) {
    const sq = squareFromPoint(e.clientX, e.clientY);
    if (rightFrom && sq) {
      if (sq === rightFrom) toggle(marks, sq);
      else toggle(arrows, rightFrom + sq);
    }
    rightFrom = null;
    return;
  }
  if (!drag.pending) return;
  const wasActive = drag.active;
  const from = drag.from;
  drag.pending = false;
  drag.active = false;
  hover.value = null;

  if (!wasActive) {
    if (drag.deselectOnUp) selected.value = null;
    return;
  }

  const to = squareFromPoint(e.clientX, e.clientY);
  if (props.free) {
    instantSquare = to;
    emit('freeMove', from, to);
    return;
  }
  if (to && to !== from && destsFor(from).includes(to)) commit(from, to, true);
  else if (to !== from) selected.value = null;
}

function onPointerCancel() {
  drag.pending = false;
  drag.active = false;
  hover.value = null;
}

// Rendering helpers ------------------------------------------------------------------

const highlightSquares = computed(() => {
  const out: { sq: string; kind: 'last' | 'selected' | 'premove' | 'mark' }[] = [];
  if (props.lastMove && settings.highlightLast) for (const sq of props.lastMove) out.push({ sq, kind: 'last' });
  for (const sq of props.premoveSquares) out.push({ sq, kind: 'premove' });
  if (selected.value) out.push({ sq: selected.value, kind: 'selected' });
  for (const sq of marks.value) out.push({ sq, kind: 'mark' });
  return out;
});

const hints = computed(() => {
  if (!selected.value || !settings.showLegal) return [];
  return selectedDests.value.map((sq) => ({ sq, capture: board.value.has(sq) }));
});

const rankLabels = computed(() => Array.from({ length: 8 }, (_, i) => (flipped.value ? i + 1 : 8 - i)));
const fileLabels = computed(() => (flipped.value ? [...FILES].reverse() : [...FILES]));
// The top-left square is light in both orientations; labels take the opposite square colour.
const rankLabelColor = (row: number) => (row % 2 === 0 ? theme.value.dark : theme.value.light);
const fileLabelColor = (col: number) => (col % 2 === 1 ? theme.value.dark : theme.value.light);
const coordSize = computed(() => `${Math.max(9, size.value * 0.03)}px`);

function arrowGeometry(key: string) {
  const from = key.slice(0, 2);
  const to = key.slice(2, 4);
  const a = toXY(from);
  const b = toXY(to);
  const sx = a.x * 100 + 50;
  const sy = a.y * 100 + 50;
  const ex = b.x * 100 + 50;
  const ey = b.y * 100 + 50;
  const dx = Math.abs(b.x - a.x);
  const dy = Math.abs(b.y - a.y);
  const knight = (dx === 1 && dy === 2) || (dx === 2 && dy === 1);
  const pts: [number, number][] = [[sx, sy]];
  if (knight) pts.push(dy > dx ? [sx, ey] : [ex, sy]);
  const [px, py] = pts[pts.length - 1];
  const len = Math.hypot(ex - px, ey - py);
  const ux = (ex - px) / len;
  const uy = (ey - py) / len;
  const head = 38;
  const half = 24;
  const bx = ex - ux * head;
  const by = ey - uy * head;
  pts.push([bx, by]);
  const shaft = pts.map((p) => p.join(',')).join(' ');
  const tip = `${ex},${ey} ${bx - uy * half},${by + ux * half} ${bx + uy * half},${by - ux * half}`;
  return { shaft, tip, start: knight ? null : { sx, sy } };
}

const promotionColumn = computed(() => {
  const p = promotion.value;
  if (!p) return null;
  const { x, y } = toXY(p.to);
  const fromTop = y === 0;
  const roles: Role[] = ['q', 'n', 'r', 'b'];
  return { x, fromTop, roles, color: p.color };
});
</script>

<template>
  <div
    ref="root"
    class="board relative aspect-square w-full touch-none select-none"
    :style="{ background: boardBg, '--coord': coordSize }"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerCancel"
    @contextmenu.prevent
  >
    <!-- square highlights -->
    <div
      v-for="h in highlightSquares"
      :key="h.kind + h.sq"
      class="hl absolute"
      :class="`hl-${h.kind}`"
      :style="squareStyle(h.sq)"
    />
    <div v-if="check" class="hl hl-check absolute" :style="squareStyle(check)" />
    <div v-if="hover && drag.active" class="hl hl-hover absolute" :style="squareStyle(hover)" />

    <!-- coordinates -->
    <template v-if="settings.coordinates">
      <span
        v-for="(n, row) in rankLabels"
        :key="'r' + n"
        class="coord absolute left-[1.6%] font-semibold"
        :style="{ top: `calc(${row * 12.5}% + 0.6%)`, color: rankLabelColor(row) }"
        >{{ n }}</span
      >
      <span
        v-for="(f, col) in fileLabels"
        :key="'f' + f"
        class="coord absolute bottom-[0.4%] font-semibold"
        :style="{ left: `calc(${(col + 1) * 12.5}% - 2.6%)`, color: fileLabelColor(col) }"
        >{{ f }}</span
      >
    </template>

    <!-- pieces -->
    <div
      v-for="p in pieces"
      :key="p.id"
      class="piece absolute left-0 top-0"
      :class="{ 'is-ghost': p.captured, 'is-drag': drag.active && drag.id === p.id, 'is-lift': drag.pending && !drag.active && drag.id === p.id }"
      :style="pieceStyle(p)"
    />

    <!-- move hints -->
    <div v-for="h in hints" :key="'h' + h.sq" class="absolute size-[12.5%] pointer-events-none z-3" :style="squareStyle(h.sq)">
      <div :class="h.capture ? 'hint-capture' : 'hint-dot'" />
    </div>

    <!-- arrows -->
    <svg class="pointer-events-none absolute inset-0 z-20 size-full" viewBox="0 0 800 800">
      <g v-for="key in arrows" :key="key" opacity="0.8">
        <polyline
          :points="arrowGeometry(key).shaft"
          fill="none"
          stroke="#ffaa00"
          stroke-width="19"
          stroke-linejoin="miter"
          stroke-linecap="butt"
        />
        <polygon :points="arrowGeometry(key).tip" fill="#ffaa00" />
      </g>
      <g v-for="key in shapes" :key="'s' + key" opacity="0.75">
        <polyline :points="arrowGeometry(key).shaft" fill="none" stroke="#6fa345" stroke-width="19" stroke-linejoin="miter" />
        <polygon :points="arrowGeometry(key).tip" fill="#6fa345" />
      </g>
    </svg>

    <!-- promotion picker -->
    <Transition name="promo">
      <div v-if="promotionColumn" class="absolute inset-0 z-40" @pointerdown.stop @click.self="choosePromotion(null)">
        <div class="absolute inset-0 bg-black/35" @click="choosePromotion(null)" />
        <div
          class="promo-col absolute flex w-[12.5%] overflow-hidden rounded-md bg-white shadow-[0_6px_20px_rgba(0,0,0,.45)]"
          :class="promotionColumn.fromTop ? 'top-0 flex-col' : 'bottom-0 flex-col-reverse'"
          :style="{ left: `${promotionColumn.x * 12.5}%` }"
        >
          <button
            v-for="role in promotionColumn.roles"
            :key="role"
            class="promo-btn aspect-square w-full"
            :style="{ backgroundImage: `url(${pieceUrl(promotionColumn.color, role)})` }"
            @click="choosePromotion(role)"
          />
          <button
            class="flex h-7 items-center justify-center bg-[#f1f1f1] text-lg font-bold text-[#8b8987]"
            @click="choosePromotion(null)"
          >
            ✕
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.board {
  border-radius: 3px;
  overflow: visible;
  cursor: pointer;
}
.hl {
  width: 12.5%;
  height: 12.5%;
  pointer-events: none;
}
.hl-last,
.hl-selected {
  background: rgba(255, 255, 51, 0.5);
}
.hl-premove {
  background: rgba(244, 42, 50, 0.55);
}
.hl-mark {
  background: rgba(235, 97, 80, 0.8);
}
.hl-check {
  background: radial-gradient(ellipse at center, rgba(255, 0, 0, 0.9) 0%, rgba(231, 0, 0, 0.6) 30%, rgba(169, 0, 0, 0) 75%);
}
.hl-hover {
  box-shadow: inset 0 0 0 calc(var(--coord) * 0.38) rgba(255, 255, 255, 0.65);
  z-index: 5;
}
.coord {
  font-size: var(--coord);
  line-height: 1;
  pointer-events: none;
  z-index: 1;
  font-family: var(--font-sans);
}
.piece {
  width: 12.5%;
  height: 12.5%;
  background-size: 100% 100%;
  background-repeat: no-repeat;
  will-change: transform;
  pointer-events: none;
}
.piece.is-ghost {
  opacity: 1;
}
.piece.is-drag {
  cursor: grabbing;
  filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.35));
}
.hint-dot {
  position: absolute;
  inset: 0;
  background: radial-gradient(rgba(0, 0, 0, 0.14) 19%, transparent 20%);
}
.hint-capture {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  box-shadow: inset 0 0 0 calc(var(--coord) * 0.55) rgba(0, 0, 0, 0.14);
}
.promo-btn {
  background-size: 88%;
  background-position: center;
  background-repeat: no-repeat;
  transition: background-color 120ms ease;
}
.promo-btn:hover {
  background-color: #e6e6e6;
}
.promo-enter-active {
  transition: opacity 160ms ease;
}
.promo-enter-active .promo-col {
  transition: transform 180ms var(--ease-out);
}
.promo-enter-from {
  opacity: 0;
}
.promo-enter-from .promo-col {
  transform: scaleY(0.9);
}
</style>
