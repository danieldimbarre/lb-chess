<script setup lang="ts">
import { t } from '../i18n';
import { computed, ref, shallowRef } from 'vue';
import Board from './Board.vue';
import Icon from './Icon.vue';
import Toggle from './Toggle.vue';
import { pieceUrl } from '../chess/pieces';
import { parsePlacement, placementToFen, START_FEN, type BoardMap, type Role } from '../chess/util';
import { validateFen } from '../chess/model';
import { toast } from '../lib/toast';
import type { Color } from '../types';

const props = defineProps<{ fen: string; orientation: Color }>();
const emit = defineEmits<{ done: [fen: string]; cancel: [] }>();

const board = shallowRef<BoardMap>(parsePlacement(props.fen));
const turn = ref<Color>(props.fen.split(' ')[1] === 'b' ? 'b' : 'w');
const orientation = ref<Color>(props.orientation);
const castle = ref({ K: true, Q: true, k: true, q: true });
const tool = ref<{ color: Color; role: Role } | 'erase' | null>(null);
const fenInput = ref('');

{
  const rights = props.fen.split(' ')[2] ?? '-';
  castle.value = { K: rights.includes('K'), Q: rights.includes('Q'), k: rights.includes('k'), q: rights.includes('q') };
}

const placement = computed(() => placementToFen(board.value));
const has = (sq: string, color: Color, role: Role) => {
  const p = board.value.get(sq);
  return p?.color === color && p.role === role;
};
// A castling right only makes sense while king and rook stand on their home squares.
const castleAvail = computed(() => ({
  K: has('e1', 'w', 'k') && has('h1', 'w', 'r'),
  Q: has('e1', 'w', 'k') && has('a1', 'w', 'r'),
  k: has('e8', 'b', 'k') && has('h8', 'b', 'r'),
  q: has('e8', 'b', 'k') && has('a8', 'b', 'r'),
}));

const fullFen = computed(() => {
  const rights = (['K', 'Q', 'k', 'q'] as const).filter((k) => castle.value[k] && castleAvail.value[k]).join('') || '-';
  return `${placement.value} ${turn.value} ${rights} - 0 1`;
});

function setBoard(next: BoardMap) {
  board.value = next;
}

function onTap(sq: string) {
  const t = tool.value;
  if (!t) return;
  const next = new Map(board.value);
  if (t === 'erase') next.delete(sq);
  else {
    const cur = next.get(sq);
    if (cur && cur.color === t.color && cur.role === t.role) next.delete(sq);
    else next.set(sq, { ...t });
  }
  setBoard(next);
}

function onFreeMove(from: string, to: string | null) {
  const next = new Map(board.value);
  const p = next.get(from);
  if (!p) return;
  next.delete(from);
  if (to) next.set(to, p);
  setBoard(next);
}

function loadFen(fen: string) {
  const err = validateFen(fen);
  if (err) return toast(err, 'error');
  board.value = parsePlacement(fen);
  turn.value = fen.split(' ')[1] === 'b' ? 'b' : 'w';
  const rights = fen.split(' ')[2] ?? '-';
  castle.value = { K: rights.includes('K'), Q: rights.includes('Q'), k: rights.includes('k'), q: rights.includes('q') };
}

function done() {
  const err = validateFen(fullFen.value);
  if (err) return toast(err, 'error', 3600);
  emit('done', fullFen.value);
}

const palette: Role[] = ['k', 'q', 'r', 'b', 'n', 'p'];
const isTool = (color: Color, role: Role) => typeof tool.value === 'object' && tool.value?.color === color && tool.value.role === role;
</script>

<template>
  <div class="flex h-full flex-col">
    <div class="flex items-center gap-2 px-3 pb-2">
      <button class="btn btn-secondary h-9 px-3 text-sm" @click="loadFen(START_FEN)">{{ t('editor.start') }}</button>
      <button class="btn btn-secondary h-9 px-3 text-sm" @click="setBoard(new Map())">{{ t('editor.clear') }}</button>
      <button class="btn btn-secondary h-9 px-3" :aria-label="t('editor.flip')" @click="orientation = orientation === 'w' ? 'b' : 'w'">
        <Icon name="flip" :size="18" />
      </button>
      <div class="flex-1" />
      <button class="btn btn-ghost h-9 px-2 text-sm" @click="emit('cancel')">{{ t('common.cancel') }}</button>
    </div>

    <div class="flex gap-1 px-2 pb-1.5">
      <button
        v-for="r in palette"
        :key="'b' + r"
        class="tap aspect-square flex-1 rounded-md bg-contain bg-center bg-no-repeat"
        :class="isTool('b', r) ? 'bg-green/70' : 'bg-surface'"
        :style="{ backgroundImage: `url(${pieceUrl('b', r)})` }"
        @click="tool = isTool('b', r) ? null : { color: 'b', role: r }"
      />
      <button
        class="tap flex aspect-square flex-1 items-center justify-center rounded-md"
        :class="tool === 'erase' ? 'bg-[#e2412f] text-white' : 'bg-surface text-ink-2'"
        :aria-label="t('editor.eraser')"
        @click="tool = tool === 'erase' ? null : 'erase'"
      >
        <Icon name="trash" :size="20" />
      </button>
    </div>

    <Board :fen="placement" :orientation="orientation" free @square-tap="onTap" @free-move="onFreeMove" />

    <div class="flex gap-1 px-2 pt-1.5">
      <button
        v-for="r in palette"
        :key="'w' + r"
        class="tap aspect-square flex-1 rounded-md bg-contain bg-center bg-no-repeat"
        :class="isTool('w', r) ? 'bg-green/70' : 'bg-surface'"
        :style="{ backgroundImage: `url(${pieceUrl('w', r)})` }"
        @click="tool = isTool('w', r) ? null : { color: 'w', role: r }"
      />
      <button
        class="tap flex aspect-square flex-1 items-center justify-center rounded-md text-ink-2"
        :class="tool === null ? 'bg-green/70 text-white' : 'bg-surface'"
        :aria-label="t('editor.movePieces')"
        @click="tool = null"
      >
        <Icon name="check" :size="20" />
      </button>
    </div>

    <div class="min-h-0 flex-1 overflow-y-auto px-4 pt-3">
      <div class="flex items-center justify-between py-1.5">
        <span class="font-semibold">{{ t('editor.sideToMove') }}</span>
        <div class="flex overflow-hidden rounded-lg bg-surface text-sm font-bold">
          <button class="px-3 py-1.5" :class="turn === 'w' ? 'bg-surface-3 text-ink' : 'text-muted'" @click="turn = 'w'">{{ t('common.white') }}</button>
          <button class="px-3 py-1.5" :class="turn === 'b' ? 'bg-surface-3 text-ink' : 'text-muted'" @click="turn = 'b'">{{ t('common.black') }}</button>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-x-4 gap-y-2 py-2 text-[0.88rem]">
        <label v-for="(label, k) in { K: t('editor.whiteShort'), Q: t('editor.whiteLong'), k: t('editor.blackShort'), q: t('editor.blackLong') }" :key="k" class="flex items-center justify-between gap-2" :class="castleAvail[k] ? '' : 'opacity-40'">
          <span class="font-semibold text-ink-2">{{ label }}</span>
          <Toggle v-model="castle[k]" />
        </label>
      </div>
      <div class="flex gap-2 py-2">
        <input v-model="fenInput" class="field py-2! text-[0.8rem]!" :placeholder="t('editor.pasteFen')" spellcheck="false" />
        <button class="btn btn-secondary h-10 shrink-0 px-3 text-sm" :disabled="!fenInput.trim()" @click="loadFen(fenInput.trim())">{{ t('common.load') }}</button>
      </div>
      <button class="btn btn-primary mb-3 mt-1 h-12 w-full text-lg" @click="done">{{ t('editor.analyze') }}</button>
    </div>
  </div>
</template>
