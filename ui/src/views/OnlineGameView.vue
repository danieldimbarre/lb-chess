<script setup lang="ts">
import { t } from '../i18n';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import Board from '../components/Board.vue';
import PlayerBar from '../components/PlayerBar.vue';
import MoveList from '../components/MoveList.vue';
import GameNav from '../components/GameNav.vue';
import BoardStage from '../components/BoardStage.vue';
import GameOverModal from '../components/GameOverModal.vue';
import Modal from '../components/Modal.vue';
import Sheet from '../components/Sheet.vue';
import Icon from '../components/Icon.vue';
import ChatPanel from '../components/ChatPanel.vue';
import { chat, resetChat } from '../stores/chat';
import { createModel } from '../chess/model';
import { usePremoves } from '../chess/premoves';
import { materialInfo } from '../chess/util';
import { playSound } from '../chess/sounds';
import { request } from '../bridge/nui';
import { session, serverNow } from '../stores/session';
import { joinQueue } from '../stores/online';
import { push, reset } from '../stores/router';
import { settings } from '../stores/settings';
import { tcLabel, tcCategory } from '../lib/timeControls';
import { showError, toast } from '../lib/toast';
import type { Color, GameSnapshot } from '../types';

const initial = session.game;
// Only reachable with a game (boot, resume, game:start); fall back to a harmless empty shell.
if (!initial) queueMicrotask(() => reset('home'));

const snap: GameSnapshot = initial ?? {
  id: '',
  white: { username: '' },
  black: { username: '' },
  myColor: 'w',
  tc: { base: 0, inc: 0 },
  moves: [],
  initialFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  clocks: { w: 0, b: 0 },
  turnStartedAt: 0,
  serverTime: 0,
  firstMoveDeadline: null,
  drawOffer: null,
  status: 'ended',
};
const gid = snap.id;
const me: Color = snap.myColor;
const them: Color = me === 'w' ? 'b' : 'w';

const game = computed(() => (session.game?.id === gid ? session.game : null));
const model = createModel(snap.initialFen);
model.load(snap.initialFen, snap.moves);
const premoves = usePremoves(model.headFen, model.dests);

const playing = computed(() => game.value?.status === 'playing');
const showResult = ref(false);
const confirm = ref<null | 'resign' | 'abort'>(null);
const menu = ref(false);
const sending = ref(false);

// Server sync ----------------------------------------------------------------------------

function resyncFrom(g: GameSnapshot) {
  const ply = model.state.ply;
  const wasAtHead = model.atHead.value;
  model.load(g.initialFen, g.moves);
  if (!wasAtHead) model.goto(Math.min(ply, model.head.value));
}

function syncMoves() {
  const g = game.value;
  if (!g) return;
  const server = g.moves;
  const local = model.state.moves;
  // Diverged (e.g. an optimistic move was rejected): rebuild from the server.
  for (let i = 0; i < Math.min(server.length, local.length); i++) {
    if (server[i].san !== local[i].san) return resyncFrom(g);
  }
  if (server.length < local.length) {
    if (!sending.value) resyncFrom(g);
    return;
  }
  if (server.length === local.length) return;
  model.goto(model.head.value);
  for (let i = local.length; i < server.length; i++) {
    const m = server[i];
    model.play(m.from, m.to, m.promotion);
  }
  lowWarned = false;
  if (playing.value && model.turn.value === me) {
    const pm = premoves.take();
    if (pm) setTimeout(() => sendMove(pm.from, pm.to, pm.promotion), 30);
  }
}

watch(() => game.value?.moves.length, syncMoves);

async function sendMove(from: string, to: string, promotion?: string) {
  const g = game.value;
  if (!g || g.status !== 'playing' || model.turn.value !== me) return;
  if (!model.atHead.value) model.goto(model.head.value);
  const ply = model.head.value;
  const mv = model.play(from, to, promotion);
  if (!mv) return playSound('illegal');
  sending.value = true;
  const res = await request('game:move', { id: gid, from: mv.from, to: mv.to, promotion: mv.promotion, ply });
  sending.value = false;
  if (!res?.ok) {
    if (res?.error !== 'game_over') showError(res?.error);
    const st = await request('game:state', { id: gid });
    if (st?.ok) {
      session.game = st.game;
      resyncFrom(st.game);
    }
  } else syncMoves();
}

// Clocks ------------------------------------------------------------------------------------

const now = ref(serverNow());
let timer: number | undefined;
let lowWarned = false;

const serverTurn = computed<Color>(() => ((game.value?.moves.length ?? 0) % 2 === 0 ? 'w' : 'b'));
function clock(c: Color): number | null {
  const g = game.value;
  if (!g) return null;
  const running = g.status === 'playing' && g.moves.length >= 2 && serverTurn.value === c;
  return running ? g.clocks[c] - (now.value - g.turnStartedAt) : g.clocks[c];
}
const clockRunning = (c: Color) => !!game.value && game.value.status === 'playing' && game.value.moves.length >= 2 && serverTurn.value === c;

function tick() {
  now.value = serverNow();
  const mine = clock(me);
  if (mine !== null && clockRunning(me) && mine < 10000 && !lowWarned && (game.value?.tc.base ?? 0) >= 60) {
    lowWarned = true;
    playSound('lowtime');
  }
}

onMounted(() => (timer = window.setInterval(tick, 100)));
onBeforeUnmount(() => clearInterval(timer));

const firstMoveLeft = computed(() => {
  const d = game.value?.firstMoveDeadline;
  return d && playing.value ? Math.max(0, Math.ceil((d - now.value) / 1000)) : null;
});

const disconnectLeft = computed(() => {
  const g = game.value;
  const opp = g ? (me === 'w' ? g.black : g.white) : null;
  if (!g || !opp || opp.connected !== false || !g.disconnectDeadline || !playing.value) return null;
  return Math.max(0, Math.ceil((g.disconnectDeadline - now.value) / 1000));
});

// Actions ---------------------------------------------------------------------------------

async function act(name: string, data: Record<string, unknown> = {}) {
  const res = await request(name, { id: gid, ...data });
  if (!res?.ok) showError(res?.error);
  return res;
}

function resignOrAbort(kind: 'resign' | 'abort') {
  menu.value = false;
  if (settings.confirmResign) confirm.value = kind;
  else doConfirm(kind);
}

function doConfirm(kind: 'resign' | 'abort') {
  confirm.value = null;
  act(kind === 'resign' ? 'game:resign' : 'game:abort');
}

const drawOfferedByThem = computed(() => game.value?.drawOffer === them);
const drawOfferedByMe = computed(() => game.value?.drawOffer === me);
function offerDraw() {
  menu.value = false;
  act('game:draw', { action: 'offer' });
}

watch(playing, (p, was) => {
  if (was && !p) {
    premoves.clear();
    setTimeout(() => (showResult.value = true), 500);
  }
});
if (!playing.value) showResult.value = true;

function leave() {
  if (!playing.value) {
    session.game = null;
    // An open chat survives leaving: the next game against this player picks the conversation up.
    if (chatState.value.status !== 'open') resetChat();
  }
  reset('home', {}, 'back');
}

async function newGame() {
  const tc = snap.tc;
  session.game = null;
  await joinQueue(tc);
}

function rematch() {
  act('game:rematch');
}

function review() {
  showResult.value = false;
  push('analysis', {
    fen: snap.initialFen,
    moves: model.state.moves.map((m) => ({ ...m })),
    orientation: me,
    white: snap.white.username,
    black: snap.black.username,
  });
}

// Chat ---------------------------------------------------------------------------------------

const chatState = computed(() => game.value?.chat ?? { status: 'none' as const, by: null });
const chatAskedByThem = computed(() => chatState.value.status === 'requested' && chatState.value.by === them);
const chatAskedByMe = computed(() => chatState.value.status === 'requested' && chatState.value.by === me);

watch(
  () => chat.visible,
  (v) => {
    if (v) chat.unread = 0;
  },
);

async function chatButton() {
  if (chatState.value.status === 'open') return (chat.visible = true);
  if (chatAskedByThem.value) return acceptChat();
  if (chatAskedByMe.value) return toast(t('chat.waiting', { name: oppInfo.value.username }));
  const res = await act('game:chat', { action: 'request' });
  if (res?.ok) toast(t('chat.inviteSent'));
}

async function acceptChat() {
  const res = await act('game:chat', { action: 'accept' });
  if (res?.ok) chat.visible = true;
}

// View --------------------------------------------------------------------------------------

const oppInfo = computed(() => (me === 'w' ? game.value?.black ?? snap.black : game.value?.white ?? snap.white));
const myInfo = computed(() => (me === 'w' ? game.value?.white ?? snap.white : game.value?.black ?? snap.black));
const boardFen = computed(() => (model.atHead.value ? premoves.displayFen.value : model.viewFen.value));
const material = computed(() => materialInfo(boardFen.value, snap.initialFen));
const cat = tcCategory(snap.tc);

const outcome = computed(() => {
  const g = game.value;
  if (!g || g.reason === 'aborted' || !g.result) return 'aborted' as const;
  if (g.result === '1/2-1/2') return 'draw' as const;
  return (g.result === '1-0') === (me === 'w') ? ('win' as const) : ('loss' as const);
});

const oppStatus = computed(() => {
  if (disconnectLeft.value !== null) return t('game.disconnected', { n: disconnectLeft.value });
  if (firstMoveLeft.value !== null && serverTurn.value === them) return t('game.firstMove', { n: firstMoveLeft.value });
  if (drawOfferedByMe.value) return t('game.drawSent');
  return null;
});
const myStatus = computed(() => (firstMoveLeft.value !== null && serverTurn.value === me ? t('game.yourFirstMove', { n: firstMoveLeft.value }) : null));

const rematchState = computed(() => {
  const r = game.value?.rematch;
  if (!r) return 'none';
  return r.by === me ? 'sent' : 'received';
});
</script>

<template>
  <div class="flex h-full flex-col bg-bg pt-(--safe-top) pb-(--safe-bottom)">
    <header class="flex h-12 shrink-0 items-center gap-1 px-2">
      <button class="tap flex size-10 items-center justify-center rounded-full text-ink-2" :aria-label="t('common.back')" @click="leave">
        <Icon name="back" :size="24" />
      </button>
      <div class="flex flex-1 items-center gap-1.5 font-display font-extrabold">
        <Icon :name="cat.icon" :size="18" :style="{ color: cat.color }" />
        {{ tcLabel(snap.tc) }} <span class="text-[0.8rem] font-bold text-muted">· {{ t('game.online') }}</span>
      </div>
      <button
        v-if="game?.chat"
        class="tap relative flex size-10 items-center justify-center rounded-full"
        :class="chatState.status === 'open' ? 'text-green' : chatAskedByMe ? 'text-gold' : 'text-ink-2'"
        :aria-label="chatState.status === 'open' ? t('chat.title') : t('chat.invite')"
        @click="chatButton"
      >
        <Icon name="chat" :size="22" />
        <span
          v-if="chat.unread || chatAskedByThem"
          class="absolute right-0.5 top-0.5 flex h-[1.1rem] min-w-[1.1rem] items-center justify-center rounded-full bg-red px-1 text-[0.62rem] font-extrabold text-white ring-2 ring-bg"
          >{{ chat.unread || '!' }}</span
        >
      </button>
      <button class="tap flex size-10 items-center justify-center rounded-full text-ink-2" :aria-label="t('common.gameMenu')" @click="menu = true">
        <Icon name="dots" :size="26" :stroke="3.4" />
      </button>
    </header>
    <MoveList :moves="model.state.moves" :ply="model.state.ply" @goto="model.goto" />

    <BoardStage>
      <template #top>
      <PlayerBar
        :name="oppInfo.username"
        :color="them"
        :captured="material.captured[them]"
        :diff="them === 'w' ? material.diff : -material.diff"
        :clock="clock(them)"
        :clock-active="clockRunning(them)"
        :status="oppStatus"
      />
      </template>
      <div class="relative">
        <Board
          :fen="boardFen"
          :orientation="me"
          :movable="playing && model.atHead.value ? me : 'none'"
          :turn="model.turn.value"
          :dests="model.turn.value === me ? model.dests.value : {}"
          :last-move="model.lastMove.value"
          :check="model.check.value"
          :allow-premove="settings.premoves"
          :premove-squares="model.atHead.value ? premoves.squares.value : []"
          @move="sendMove"
          @premove="(f, t, p) => premoves.add({ from: f, to: t, promotion: p })"
          @cancel-premoves="premoves.clear"
        />
        <Transition name="drop">
          <div v-if="drawOfferedByThem && playing" class="absolute inset-x-3 top-3 z-50 flex items-center gap-2 rounded-xl bg-surface-2 p-2.5 pl-3.5 shadow-[0_10px_30px_rgba(0,0,0,.45)]">
            <span class="text-lg">½</span>
            <span class="flex-1 text-[0.9rem] font-bold">{{ t('game.offersDraw', { name: oppInfo.username }) }}</span>
            <button class="btn btn-secondary h-9 px-3 text-sm" @click="act('game:draw', { action: 'decline' })">{{ t('common.decline') }}</button>
            <button class="btn btn-primary h-9 px-3 text-sm" @click="act('game:draw', { action: 'accept' })">{{ t('common.accept') }}</button>
          </div>
        </Transition>
        <Transition name="drop">
          <!-- Over the opponent's side of the board (like the draw offer), never over the player's own pieces. -->
          <div
            v-if="chatAskedByThem"
            class="absolute inset-x-3 z-50 flex items-center gap-2 rounded-xl bg-surface-2 p-2.5 pl-3.5 shadow-[0_10px_30px_rgba(0,0,0,.45)]"
            :class="drawOfferedByThem && playing ? 'top-[4.25rem]' : 'top-3'"
          >
            <Icon name="chat" :size="20" class="shrink-0 text-green" />
            <span class="line-clamp-2 min-w-0 flex-1 text-[0.88rem] font-bold leading-tight">{{ t('chat.wants', { name: oppInfo.username }) }}</span>
            <button class="btn btn-secondary h-9 px-3 text-sm" @click="act('game:chat', { action: 'decline' })">{{ t('common.decline') }}</button>
            <button class="btn btn-primary h-9 px-3 text-sm" @click="acceptChat">{{ t('common.accept') }}</button>
          </div>
        </Transition>
      </div>
      <template #bottom>
      <PlayerBar
        :name="myInfo.username"
        :color="me"
        :captured="material.captured[me]"
        :diff="me === 'w' ? material.diff : -material.diff"
        :clock="clock(me)"
        :clock-active="clockRunning(me)"
        :status="myStatus"
      />
      </template>
    </BoardStage>

    <GameNav :ply="model.state.ply" :head="model.head.value" @goto="model.goto">
      <template v-if="playing">
        <button
          v-if="(game?.moves.length ?? 0) < 2"
          class="tap flex flex-1 flex-col items-center justify-center text-[0.66rem] font-semibold text-ink-2"
          @click="resignOrAbort('abort')"
        >
          <Icon name="x" :size="20" />{{ t('game.abort') }}
        </button>
        <button
          v-else
          class="tap flex flex-1 flex-col items-center justify-center text-[0.66rem] font-semibold disabled:opacity-40"
          :class="drawOfferedByMe ? 'text-gold' : 'text-ink-2'"
          :disabled="drawOfferedByMe"
          @click="drawOfferedByThem ? act('game:draw', { action: 'accept' }) : offerDraw()"
        >
          <span class="text-[1.15rem] font-extrabold leading-5">½</span>{{ drawOfferedByThem ? t('common.accept') : t('game.draw') }}
        </button>
        <button class="tap flex flex-1 flex-col items-center justify-center text-[0.66rem] font-semibold text-ink-2" :disabled="(game?.moves.length ?? 0) < 2" :class="(game?.moves.length ?? 0) < 2 ? 'opacity-40' : ''" @click="resignOrAbort('resign')">
          <Icon name="flag" :size="20" />{{ t('game.resign') }}
        </button>
      </template>
      <button v-else class="tap flex flex-[2] flex-col items-center justify-center text-[0.66rem] font-semibold text-green" @click="showResult = true">
        <Icon name="trophy" :size="20" />{{ t('game.result') }}
      </button>
    </GameNav>

    <Sheet :open="menu" @close="menu = false">
      <div class="flex flex-col px-2 pb-3 pt-2">
        <template v-if="playing">
          <button v-if="(game?.moves.length ?? 0) >= 2 && !drawOfferedByMe" class="hover-row flex items-center gap-3 rounded-lg px-3 py-3 text-left font-semibold" @click="offerDraw">
            <span class="w-[22px] text-center text-lg font-extrabold">½</span>{{ t('game.offerDraw') }}
          </button>
          <button v-if="(game?.moves.length ?? 0) < 2" class="hover-row flex items-center gap-3 rounded-lg px-3 py-3 text-left font-semibold" @click="resignOrAbort('abort')"><Icon name="x" />{{ t('game.abortGame') }}</button>
          <button v-else class="hover-row flex items-center gap-3 rounded-lg px-3 py-3 text-left font-semibold text-red" @click="resignOrAbort('resign')"><Icon name="flag" />{{ t('game.resign') }}</button>
        </template>
        <button class="hover-row flex items-center gap-3 rounded-lg px-3 py-3 text-left font-semibold" @click="menu = false; push('settings')"><Icon name="settings" />{{ t('common.boardSettings') }}</button>
        <button class="hover-row flex items-center gap-3 rounded-lg px-3 py-3 text-left font-semibold" @click="menu = false; leave()"><Icon name="home" />{{ playing ? t('game.homeContinues') : t('game.home') }}</button>
      </div>
    </Sheet>

    <Sheet :open="chat.visible && chatState.status === 'open'" @close="chat.visible = false">
      <ChatPanel :game-id="gid" :me="me" :opponent="oppInfo.username" />
    </Sheet>

    <Modal :open="!!confirm" @close="confirm = null">
      <div class="p-5 text-center">
        <div class="font-display text-lg font-extrabold">{{ confirm === 'abort' ? t('game.confirmAbort') : t('game.confirmResign') }}</div>
        <div v-if="confirm === 'resign'" class="mt-1 text-[0.85rem] text-muted">{{ t('game.countsAsLoss') }}</div>
        <div class="mt-4 flex gap-3">
          <button class="btn btn-secondary h-11 flex-1" @click="confirm = null">{{ t('common.cancel') }}</button>
          <button class="btn btn-danger h-11 flex-1" @click="doConfirm(confirm!)">{{ confirm === 'abort' ? t('game.abort') : t('game.resign') }}</button>
        </div>
      </div>
    </Modal>

    <GameOverModal
      v-if="game && !playing"
      :open="showResult"
      :outcome="outcome"
      :reason="game.reason ?? 'aborted'"
      :me="{ name: myInfo.username, winner: outcome === 'win' }"
      :opponent="{ name: oppInfo.username, winner: outcome === 'loss' }"
      @close="showResult = false"
    >
      <button v-if="rematchState === 'received'" class="btn btn-primary pulse h-12 w-full text-lg" @click="rematch">{{ t('game.acceptRematch') }}</button>
      <button v-else-if="rematchState === 'sent'" class="btn btn-secondary h-12 w-full text-lg" disabled>
        <span class="size-4 rounded-full border-2 border-surface-3 border-t-green [animation:spin_800ms_linear_infinite]" />
        {{ t('game.rematchSent') }}
      </button>
      <button v-else class="btn btn-primary h-12 w-full text-lg" @click="rematch">{{ t('game.rematch') }}</button>
      <div class="flex gap-3">
        <button class="btn btn-secondary h-11 flex-1" @click="newGame">{{ t('game.newGame', { tc: tcLabel(snap.tc) }) }}</button>
        <button class="btn btn-secondary h-11 flex-1" :disabled="!model.head.value" @click="review">{{ t('game.review') }}</button>
      </div>
    </GameOverModal>
  </div>
</template>

<style scoped>
.drop-enter-active {
  transition:
    transform 280ms var(--ease-out),
    opacity 200ms ease;
}
.drop-leave-active {
  transition:
    transform 160ms ease,
    opacity 160ms ease;
}
.drop-enter-from,
.drop-leave-to {
  transform: translateY(-10px);
  opacity: 0;
}
.pulse {
  animation: glow 1.4s ease-in-out infinite;
}
@keyframes glow {
  50% {
    filter: brightness(1.12);
  }
}
</style>
