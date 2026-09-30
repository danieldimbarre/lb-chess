<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { Chess } from 'chess.js';
import TopBar from '../components/TopBar.vue';
import Board from '../components/Board.vue';
import PlayerBar from '../components/PlayerBar.vue';
import MoveList from '../components/MoveList.vue';
import Sheet from '../components/Sheet.vue';
import Icon from '../components/Icon.vue';
import BoardEditor from '../components/BoardEditor.vue';
import GameNav from '../components/GameNav.vue';
import EvalBar from '../components/EvalBar.vue';
import BoardStage from '../components/BoardStage.vue';
import San from '../components/San.vue';
import { requestAnalysis, type EvalInfo } from '../engine/client';
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

const material = computed(() => materialInfo(model.viewFen.value, model.state.initialFen));

// Moving from an earlier ply starts a new line, so the board needs that ply's legal moves.
const viewDests = computed(() => {
  const out: Record<string, string[]> = {};
  for (const m of new Chess(model.viewFen.value).moves({ verbose: true })) (out[m.from] ??= []).push(m.to);
  return out;
});
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

// Engine -----------------------------------------------------------------------------

const engineOn = ref(true);
const evalInfo = ref<EvalInfo | null>(null);
let evalTimer: number | undefined;

function runEngine() {
  clearTimeout(evalTimer);
  if (!engineOn.value || editing.value) return;
  const fen = model.state.initialFen;
  const moves = model.state.moves.slice(0, model.state.ply).map((m) => m.from + m.to + (m.promotion ?? ''));
  const viewFen = model.viewFen.value;
  evalTimer = window.setTimeout(() => {
    const c = new Chess(viewFen);
    if (c.isGameOver()) {
      // Terminal position: ±10000 marks a finished game, 0 a draw.
      evalInfo.value = { cp: c.isCheckmate() ? (c.turn() === 'w' ? -10000 : 10000) : 0, mate: null, depth: 0, pv: [] };
      return;
    }
    requestAnalysis(fen, moves, 1500, (e) => {
      if (model.viewFen.value === viewFen) evalInfo.value = e;
    });
  }, 180);
}

watch(() => [model.viewFen.value, engineOn.value, editing.value], runEngine, { immediate: true });
onBeforeUnmount(() => clearTimeout(evalTimer));

const bestLine = computed(() => {
  const e = evalInfo.value;
  if (!e || !e.pv.length) return [] as string[];
  const c = new Chess(model.viewFen.value);
  const sans: string[] = [];
  for (const uci of e.pv.slice(0, 8)) {
    try {
      const m = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
      sans.push(m.san);
    } catch {
      break;
    }
  }
  return sans;
});

const evalText = computed(() => {
  const e = evalInfo.value;
  if (!e) return '…';
  if (e.mate !== null) return `${e.mate > 0 ? '+' : '-'}M${Math.abs(e.mate)}`;
  if (Math.abs(e.cp) >= 10000) return e.cp > 0 ? '1-0' : '0-1';
  if (!e.depth && !e.cp) return '½-½';
  const v = e.cp / 100;
  return `${v > 0 ? '+' : ''}${v.toFixed(2)}`;
});

const engineArrow = computed(() => (engineOn.value && evalInfo.value?.pv[0] ? [evalInfo.value.pv[0].slice(0, 4)] : []));

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
        <button class="tap flex size-10 items-center justify-center rounded-full" :class="engineOn ? 'text-green' : 'text-muted'" aria-label="Toggle engine" @click="engineOn = !engineOn">
          <Icon name="analysis" />
        </button>
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
      <BoardStage :reserve-height="engineOn ? 164 : 128" :reserve-width="engineOn ? 18 : 0">
        <template #top>
          <PlayerBar :name="nameOf(top)" :color="top" :captured="material.captured[top]" :diff="top === 'w' ? material.diff : -material.diff" :avatar-role="'k'" :avatar-tint="top === 'w' ? '#d9d6d0' : '#1f1e1c'" />
        </template>
        <div class="flex gap-1">
          <EvalBar v-if="engineOn" :cp="evalInfo?.cp ?? 0" :mate="evalInfo?.mate ?? null" :orientation="orientation" />
          <div class="min-w-0 flex-1">
            <Board
              ref="board"
              :fen="model.viewFen.value"
              :orientation="orientation"
              movable="both"
              :turn="model.viewTurn.value"
              :dests="model.viewFen.value === model.headFen.value ? model.dests.value : viewDests"
              :last-move="model.lastMove.value"
              :check="model.check.value"
              :shapes="engineArrow"
              @move="onMove"
            />
          </div>
        </div>
        <template #bottom>
          <PlayerBar :name="nameOf(bottom)" :color="bottom" :captured="material.captured[bottom]" :diff="bottom === 'w' ? material.diff : -material.diff" :avatar-role="'k'" :avatar-tint="bottom === 'w' ? '#d9d6d0' : '#1f1e1c'" />
          <div v-if="engineOn" class="mx-3 flex h-8 items-center gap-2 overflow-hidden rounded-md bg-surface px-2 text-[0.8rem]">
            <span class="shrink-0 rounded bg-surface-3 px-1.5 py-0.5 font-display font-extrabold tabular-nums">{{ evalText }}</span>
            <span class="flex min-w-0 flex-1 gap-1.5 overflow-hidden font-semibold text-ink-2">
              <San v-for="(san, i) in bestLine" :key="i" :san="san" />
            </span>
            <span v-if="evalInfo?.depth" class="shrink-0 text-[0.68rem] text-muted">d{{ evalInfo.depth }}</span>
          </div>
          <div class="h-6 truncate pt-1 text-center text-[0.84rem] font-semibold" :class="status ? 'text-gold' : 'text-muted'">
            {{ status ?? (model.viewTurn.value === 'w' ? 'White to move' : 'Black to move') }}
          </div>
        </template>
      </BoardStage>
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
        <button class="hover-row flex items-center gap-3 rounded-lg px-3 py-3 text-left font-semibold" @click="menu = false; push('bots', { fen: model.viewFen.value })"><Icon name="bot" />Play vs bot from here</button>
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
