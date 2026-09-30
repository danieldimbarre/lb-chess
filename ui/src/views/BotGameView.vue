<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import TopBar from '../components/TopBar.vue';
import Board from '../components/Board.vue';
import PlayerBar from '../components/PlayerBar.vue';
import MoveList from '../components/MoveList.vue';
import GameNav from '../components/GameNav.vue';
import BoardStage from '../components/BoardStage.vue';
import GameOverModal from '../components/GameOverModal.vue';
import Modal from '../components/Modal.vue';
import Sheet from '../components/Sheet.vue';
import Icon from '../components/Icon.vue';
import { createModel, type Outcome } from '../chess/model';
import { usePremoves } from '../chess/premoves';
import { materialInfo, START_FEN } from '../chess/util';
import { playSound } from '../chess/sounds';
import { botById } from '../engine/bots';
import { requestAnalysis, requestBotMove } from '../engine/client';
import { push, replace, back } from '../stores/router';
import { settings } from '../stores/settings';
import { session } from '../stores/session';
import { tcLabel } from '../lib/timeControls';
import type { Color, TimeControl } from '../types';

const props = defineProps<{ botId: string; color: Color; tc?: TimeControl | null; fen?: string }>();

const bot = botById(props.botId);
const me: Color = props.color;
const them: Color = me === 'w' ? 'b' : 'w';
const startFen = props.fen || START_FEN;
const model = createModel(startFen);
const premoves = usePremoves(model.headFen, model.dests);

const over = ref<Outcome | null>(null);
const showResult = ref(false);
const thinking = ref(false);
const hint = ref<string[]>([]);
const confirmResign = ref(false);
const menu = ref(false);
let disposed = false;

// Clocks ------------------------------------------------------------------------

const clocks = reactive({ w: (props.tc?.base ?? 0) * 1000, b: (props.tc?.base ?? 0) * 1000 });
const now = ref(Date.now());
let turnStart = Date.now();
let timer: number | undefined;
let lowWarned = false;

const running = computed(() => !!props.tc && !over.value && model.head.value > 0);
function remaining(c: Color) {
  if (!props.tc) return null;
  const base = clocks[c];
  return running.value && model.turn.value === c ? base - (now.value - turnStart) : base;
}

function chargeClock(mover: Color) {
  if (!props.tc) return;
  const t = Date.now();
  // The very first move of the game is free, like on chess.com.
  if (model.head.value > 1) clocks[mover] -= t - turnStart;
  clocks[mover] += props.tc.inc * 1000;
  turnStart = t;
}

function tick() {
  now.value = Date.now();
  if (!running.value) return;
  const side = model.turn.value;
  const left = remaining(side)!;
  if (side === me && left < 10000 && !lowWarned && (props.tc?.base ?? 0) >= 60) {
    lowWarned = true;
    playSound('lowtime');
  }
  if (left <= 0) {
    clocks[side] = 0;
    const winner: Color = side === 'w' ? 'b' : 'w';
    if (!model.hasMaterialToMate(winner)) finish({ result: '1/2-1/2', reason: 'timeout_insufficient' });
    else finish({ result: winner === 'w' ? '1-0' : '0-1', reason: 'timeout' });
  }
}

// Flow ----------------------------------------------------------------------------

const uciMoves = () => model.state.moves.map((m) => m.from + m.to + (m.promotion ?? ''));

function finish(o: Outcome) {
  if (over.value) return;
  over.value = o;
  thinking.value = false;
  premoves.clear();
  playSound('end');
  setTimeout(() => !disposed && (showResult.value = true), 450);
}

function afterMove(mover: Color) {
  chargeClock(mover);
  hint.value = [];
  const o = model.outcome();
  if (o) finish(o);
}

async function botTurn() {
  if (over.value || model.turn.value !== them) return;
  thinking.value = true;
  const started = Date.now();
  const uci = await requestBotMove(bot.id, startFen, uciMoves());
  // Humanise: weak bots answer quickly, strong ones take a moment.
  const minDelay = 350 + bot.level * 140 * Math.random();
  const wait = Math.max(0, minDelay - (Date.now() - started));
  if (wait) await new Promise((r) => setTimeout(r, wait));
  if (disposed || over.value || model.turn.value !== them) return;
  thinking.value = false;
  if (!uci) return;
  model.goto(model.head.value);
  model.play(uci.slice(0, 2), uci.slice(2, 4), uci[4]);
  afterMove(them);
  if (over.value) return;
  const pm = premoves.take();
  if (pm) setTimeout(() => !disposed && userMove(pm.from, pm.to, pm.promotion), 60);
}

function userMove(from: string, to: string, promotion?: string) {
  if (over.value || model.turn.value !== me) return;
  if (!model.atHead.value) model.goto(model.head.value);
  if (!model.play(from, to, promotion)) return playSound('illegal');
  afterMove(me);
  botTurn();
}

function resign() {
  confirmResign.value = false;
  menu.value = false;
  finish({ result: me === 'w' ? '0-1' : '1-0', reason: 'resignation' });
}

function askResign() {
  menu.value = false;
  if (settings.confirmResign) confirmResign.value = true;
  else resign();
}

function takeback() {
  if (over.value || thinking.value || !model.head.value) return;
  premoves.clear();
  hint.value = [];
  const n = model.turn.value === me ? 2 : 1;
  model.undo(Math.min(n, model.head.value));
  playSound('move');
  if (model.turn.value === them) botTurn();
}

async function showHint() {
  if (over.value || model.turn.value !== me) return;
  let best: string | null = null;
  await requestAnalysis(startFen, uciMoves(), 700, (e) => (best = e.pv[0] ?? best));
  if (best && model.turn.value === me) hint.value = [String(best).slice(0, 4)];
}

function rematch() {
  replace('botGame', { botId: bot.id, color: them, tc: props.tc, fen: props.fen });
}

function review() {
  showResult.value = false;
  push('analysis', {
    fen: startFen,
    moves: model.state.moves.map((m) => ({ ...m })),
    orientation: me,
    white: me === 'w' ? myName.value : bot.name,
    black: me === 'b' ? myName.value : bot.name,
  });
}

onMounted(() => {
  playSound('start');
  timer = window.setInterval(tick, 100);
  if (model.turn.value === them) setTimeout(botTurn, 500);
});
onBeforeUnmount(() => {
  disposed = true;
  clearInterval(timer);
});

watch(
  () => model.head.value,
  () => {
    lowWarned = remaining(me) !== null && remaining(me)! < 10000;
  },
);

// View ------------------------------------------------------------------------------

const myName = computed(() => session.me?.username ?? 'You');
const material = computed(() => materialInfo(model.atHead.value ? premoves.displayFen.value : model.viewFen.value, startFen));
const boardFen = computed(() => (model.atHead.value ? premoves.displayFen.value : model.viewFen.value));
const outcomeFor = computed(() => {
  const o = over.value;
  if (!o) return 'draw' as const;
  if (o.result === '1/2-1/2') return 'draw' as const;
  return (o.result === '1-0') === (me === 'w') ? ('win' as const) : ('loss' as const);
});
</script>

<template>
  <div class="flex h-full flex-col bg-bg pt-(--safe-top) pb-(--safe-bottom)">
    <TopBar :title="`vs ${bot.name}`">
      <span v-if="tc" class="mr-1 rounded-md bg-surface px-2 py-1 text-[0.72rem] font-bold text-muted">{{ tcLabel(tc) }}</span>
      <button class="tap flex size-10 items-center justify-center rounded-full text-ink-2" aria-label="Game menu" @click="menu = true">
        <Icon name="dots" :size="26" :stroke="3.4" />
      </button>
    </TopBar>
    <MoveList :moves="model.state.moves" :ply="model.state.ply" :start-black="startFen.split(' ')[1] === 'b'" @goto="model.goto" />

    <BoardStage>
      <template #top>
      <PlayerBar
        :name="bot.name"
        :tag="`Level ${bot.level}`"
        :color="them"
        :captured="material.captured[them]"
        :diff="them === 'w' ? material.diff : -material.diff"
        :clock="remaining(them)"
        :clock-active="running && model.turn.value === them"
        :avatar-role="bot.role"
        :avatar-tint="bot.tint"
        :thinking="thinking"
      />
      </template>
      <Board
        :fen="boardFen"
        :orientation="me"
        :movable="over || !model.atHead.value ? 'none' : me"
        :turn="model.turn.value"
        :dests="model.turn.value === me ? model.dests.value : {}"
        :last-move="model.lastMove.value"
        :check="model.check.value"
        :allow-premove="settings.premoves"
        :premove-squares="model.atHead.value ? premoves.squares.value : []"
        :shapes="hint"
        @move="userMove"
        @premove="(f, t, p) => premoves.add({ from: f, to: t, promotion: p })"
        @cancel-premoves="premoves.clear"
      />
      <template #bottom>
      <PlayerBar
        :name="myName"
        :color="me"
        :captured="material.captured[me]"
        :diff="me === 'w' ? material.diff : -material.diff"
        :clock="remaining(me)"
        :clock-active="running && model.turn.value === me"
      />
      </template>
    </BoardStage>

    <GameNav :ply="model.state.ply" :head="model.head.value" @goto="model.goto">
      <template v-if="!over">
        <button class="tap flex flex-1 flex-col items-center justify-center text-[0.66rem] font-semibold text-ink-2 disabled:opacity-35" :disabled="model.turn.value !== me" @click="showHint">
          <Icon name="eye" :size="20" />Hint
        </button>
        <button class="tap flex flex-1 flex-col items-center justify-center text-[0.66rem] font-semibold text-ink-2 disabled:opacity-35" :disabled="thinking || !model.head.value" @click="takeback">
          <Icon name="undo" :size="20" />Takeback
        </button>
      </template>
      <button v-else class="tap flex flex-[2] flex-col items-center justify-center text-[0.66rem] font-semibold text-green" @click="showResult = true">
        <Icon name="trophy" :size="20" />Result
      </button>
    </GameNav>

    <Sheet :open="menu" @close="menu = false">
      <div class="flex flex-col px-2 pb-3 pt-2">
        <button v-if="!over" class="hover-row flex items-center gap-3 rounded-lg px-3 py-3 text-left font-semibold text-red" @click="askResign"><Icon name="flag" />Resign</button>
        <button class="hover-row flex items-center gap-3 rounded-lg px-3 py-3 text-left font-semibold" @click="menu = false; push('settings')"><Icon name="settings" />Board settings</button>
        <button class="hover-row flex items-center gap-3 rounded-lg px-3 py-3 text-left font-semibold" @click="menu = false; back()"><Icon name="back" />Leave game</button>
      </div>
    </Sheet>

    <Modal :open="confirmResign" @close="confirmResign = false">
      <div class="p-5 text-center">
        <div class="font-display text-lg font-extrabold">Resign this game?</div>
        <div class="mt-4 flex gap-3">
          <button class="btn btn-secondary h-11 flex-1" @click="confirmResign = false">Cancel</button>
          <button class="btn btn-danger h-11 flex-1" @click="resign">Resign</button>
        </div>
      </div>
    </Modal>

    <GameOverModal
      v-if="over"
      :open="showResult"
      :outcome="outcomeFor"
      :reason="over.reason"
      :me="{ name: myName, winner: outcomeFor === 'win' }"
      :opponent="{ name: bot.name, caption: `Level ${bot.level}`, role: bot.role, tint: bot.tint, winner: outcomeFor === 'loss' }"
      @close="showResult = false"
    >
      <button class="btn btn-primary h-12 w-full text-lg" @click="rematch">Rematch</button>
      <div class="flex gap-3">
        <button class="btn btn-secondary h-11 flex-1" @click="replace('bots')">New Bot</button>
        <button class="btn btn-secondary h-11 flex-1" @click="review">Game Review</button>
      </div>
    </GameOverModal>
  </div>
</template>
