<script setup lang="ts">
import { computed, ref } from 'vue';
import { Chess } from 'chess.js';
import TopBar from '../components/TopBar.vue';
import Board from '../components/Board.vue';
import PlayerBar from '../components/PlayerBar.vue';
import MoveList from '../components/MoveList.vue';
import Sheet from '../components/Sheet.vue';
import Icon from '../components/Icon.vue';
import BoardEditor from '../components/BoardEditor.vue';
import GameNav from '../components/GameNav.vue';
import { createModel } from '../chess/model';
import { materialInfo, START_FEN } from '../chess/util';
import { copyText, toast } from '../lib/toast';
import { push } from '../stores/router';
import type { Color, MoveRecord } from '../types';

const props = defineProps<{ fen?: string; moves?: MoveRecord[]; orientation?: Color; white?: string; black?: string }>();

const model = createModel(props.fen || START_FEN);
if (props.moves?.length) model.load(props.fen || START_FEN, props.moves);

const orientation = ref<Color>(props.orientation ?? 'w');
const editing = ref(false);
const menu = ref(false);
const pgnInput = ref('');
const board = ref<InstanceType<typeof Board>>();

const material = computed(() => materialInfo(model.viewFen.value));
const top = computed<Color>(() => (orientation.value === 'w' ? 'b' : 'w'));
const bottom = computed<Color>(() => orientation.value);
const nameOf = (c: Color) => (c === 'w' ? props.white || 'White' : props.black || 'Black');

const status = computed(() => {
  if (!model.atHead.value) return null;
  const o = model.outcome();
  if (!o) return null;
  const labels: Record<string, string> = {
    checkmate: 'Checkmate',
    stalemate: 'Stalemate',
    insufficient: 'Insufficient material',
    threefold: 'Threefold repetition',
    fifty: '50-move rule',
  };
  const winner = o.result === '1-0' ? 'White wins' : o.result === '0-1' ? 'Black wins' : 'Draw';
  return `${labels[o.reason] ?? o.reason} · ${winner}`;
});

function onMove(from: string, to: string, promotion?: string) {
  if (!model.play(from, to, promotion, { branch: true })) toast('Illegal move', 'error');
}

function flip() {
  orientation.value = orientation.value === 'w' ? 'b' : 'w';
}

function onEdited(fen: string) {
  model.load(fen);
  editing.value = false;
}

async function copy(kind: 'fen' | 'pgn') {
  menu.value = false;
  const text = kind === 'fen' ? model.viewFen.value : model.pgn({ Event: 'Analysis' });
  const ok = await copyText(text);
  toast(ok ? `${kind.toUpperCase()} copied` : 'Copy blocked by the game client', ok ? 'success' : 'error');
}

function loadPgn() {
  const text = pgnInput.value.trim();
  if (!text) return;
  const c = new Chess();
  try {
    c.loadPgn(text);
  } catch {
    // Maybe it is a FEN instead.
    try {
      c.load(text);
      model.load(c.fen());
      menu.value = false;
      pgnInput.value = '';
      return;
    } catch {
      return toast('Could not read that PGN / FEN', 'error');
    }
  }
  const fen = c.getHeaders().FEN || START_FEN;
  const moves = c.history({ verbose: true }).map((m) => ({ from: m.from, to: m.to, promotion: m.promotion, san: m.san }));
  model.load(fen, moves);
  model.goto(0);
  menu.value = false;
  pgnInput.value = '';
}

function reset() {
  menu.value = false;
  model.load(START_FEN);
  board.value?.clearAnnotations();
}
</script>

<template>
  <div class="flex h-full flex-col bg-bg pt-(--safe-top) pb-(--safe-bottom)">
    <TopBar :title="editing ? 'Setup position' : 'Analysis'">
      <template v-if="!editing">
        <button class="tap flex size-10 items-center justify-center rounded-full text-ink-2" aria-label="Flip board" @click="flip">
          <Icon name="flip" />
        </button>
        <button class="tap flex size-10 items-center justify-center rounded-full text-ink-2" aria-label="Edit position" @click="editing = true">
          <Icon name="edit" />
        </button>
        <button class="tap flex size-10 items-center justify-center rounded-full text-ink-2" aria-label="More" @click="menu = true">
          <Icon name="dots" :size="26" :stroke="3.4" />
        </button>
      </template>
    </TopBar>

    <BoardEditor v-if="editing" :fen="model.viewFen.value" :orientation="orientation" class="min-h-0 flex-1" @done="onEdited" @cancel="editing = false" />

    <template v-else>
      <MoveList :moves="model.state.moves" :ply="model.state.ply" :start-black="model.state.initialFen.split(' ')[1] === 'b'" :start-number="Number(model.state.initialFen.split(' ')[5]) || 1" @goto="model.goto" />
      <div class="flex min-h-0 flex-1 flex-col justify-center">
        <PlayerBar :name="nameOf(top)" :color="top" :captured="material.captured[top]" :diff="top === 'w' ? material.diff : -material.diff" :avatar-role="'k'" :avatar-tint="top === 'w' ? '#d9d6d0' : '#1f1e1c'" />
        <Board
          ref="board"
          :fen="model.viewFen.value"
          :orientation="orientation"
          movable="both"
          :turn="model.viewTurn.value"
          :dests="model.atHead.value ? model.dests.value : {}"
          :last-move="model.lastMove.value"
          :check="model.check.value"
          @move="onMove"
        />
        <PlayerBar :name="nameOf(bottom)" :color="bottom" :captured="material.captured[bottom]" :diff="bottom === 'w' ? material.diff : -material.diff" :avatar-role="'k'" :avatar-tint="bottom === 'w' ? '#d9d6d0' : '#1f1e1c'" />
        <div class="h-6 text-center text-[0.84rem] font-semibold" :class="status ? 'text-gold' : 'text-muted'">
          {{ status ?? (model.viewTurn.value === 'w' ? 'White to move' : 'Black to move') }}
        </div>
      </div>
      <GameNav :ply="model.state.ply" :head="model.head.value" @goto="model.goto">
        <button class="tap flex h-12 flex-1 flex-col items-center justify-center text-[0.68rem] font-semibold text-ink-2" :disabled="!model.head.value" @click="model.undo()">
          <Icon name="undo" :size="20" />
          Undo
        </button>
      </GameNav>
    </template>

    <Sheet :open="menu" title="Analysis" @close="menu = false">
      <div class="flex flex-col px-2 pb-3">
        <button class="hover-row flex items-center gap-3 rounded-lg px-3 py-3 text-left font-semibold" @click="copy('fen')"><Icon name="copy" />Copy FEN</button>
        <button class="hover-row flex items-center gap-3 rounded-lg px-3 py-3 text-left font-semibold" @click="copy('pgn')"><Icon name="share" />Copy PGN</button>
        <button class="hover-row flex items-center gap-3 rounded-lg px-3 py-3 text-left font-semibold" @click="reset"><Icon name="refresh" />Reset to start</button>
        <button class="hover-row flex items-center gap-3 rounded-lg px-3 py-3 text-left font-semibold" @click="menu = false; push('settings')"><Icon name="settings" />Board settings</button>
        <div class="px-3 pt-3">
          <textarea v-model="pgnInput" rows="3" class="field resize-none text-[0.8rem]!" placeholder="Paste a PGN or FEN to load" spellcheck="false" />
          <button class="btn btn-primary mt-3 h-11 w-full" :disabled="!pgnInput.trim()" @click="loadPgn">Load</button>
        </div>
      </div>
    </Sheet>
  </div>
</template>
