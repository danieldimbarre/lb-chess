<script setup lang="ts">
import { t } from '../i18n';
import { computed, onMounted, ref } from 'vue';
import { Chess } from 'chess.js';
import Avatar from '../components/Avatar.vue';
import Icon from '../components/Icon.vue';
import TabBar from '../components/TabBar.vue';
import TopBar from '../components/TopBar.vue';
import { request } from '../bridge/nui';
import { push } from '../stores/router';
import { session } from '../stores/session';
import { tcCategory, tcLabel } from '../lib/timeControls';
import { showError } from '../lib/toast';
import type { Profile } from '../types';

const props = defineProps<{ username?: string }>();

interface GameRow {
  id: number;
  white: string;
  black: string;
  result: '1-0' | '0-1' | '1/2-1/2';
  reason: string;
  tc: string;
  moves: number;
  createdAt: number;
}

const data = ref<{ profile: Profile; isMe: boolean; online: boolean; playing: boolean; rank: number | null; games: GameRow[]; historyEnabled: boolean } | null>(null);
const asTab = computed(() => !props.username);

onMounted(async () => {
  const res = await request('profile', props.username ? { username: props.username } : {});
  if (!res?.ok) return showError(res?.error);
  data.value = res;
  if (res.isMe) session.me = res.profile;
});

const p = computed(() => data.value?.profile);
const pct = (n: number) => (p.value?.games ? (n / p.value.games) * 100 : 0);
const winRate = computed(() => Math.round(pct(p.value?.wins ?? 0)));

function side(g: GameRow) {
  const name = p.value?.username.toLowerCase();
  return g.white.toLowerCase() === name ? 'w' : 'b';
}
function outcome(g: GameRow) {
  if (g.result === '1/2-1/2') return 'draw';
  return (g.result === '1-0') === (side(g) === 'w') ? 'win' : 'loss';
}
function parseTc(tc: string) {
  const [base, inc] = tc.split('+').map(Number);
  return { base, inc };
}
function ago(ts: number) {
  const s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return t('profile.now');
  if (s < 3600) return t('profile.minutesAgo', { n: Math.floor(s / 60) });
  if (s < 86400) return t('profile.hoursAgo', { n: Math.floor(s / 3600) });
  return t('profile.daysAgo', { n: Math.floor(s / 86400) });
}

let opening = false;
async function open(g: GameRow) {
  // History rows don't carry the PGN; fetch it only for the game being opened.
  if (opening) return;
  opening = true;
  const res = await request('game:pgn', { id: g.id }).finally(() => (opening = false));
  if (!res?.ok) return showError(res?.error);
  const c = new Chess();
  try {
    c.loadPgn(res.pgn);
  } catch {
    return showError('server_error');
  }
  const moves = c.history({ verbose: true }).map((m) => ({ from: m.from, to: m.to, promotion: m.promotion, san: m.san }));
  push('analysis', { moves, orientation: side(g), white: g.white, black: g.black });
}
</script>

<template>
  <div class="flex h-full flex-col bg-bg pt-(--safe-top)">
    <TopBar v-if="!asTab" :title="username ?? ''" />
    <header v-else class="flex h-12 items-center px-4">
      <h1 class="font-display text-[1.25rem] font-extrabold">{{ t('profile.title') }}</h1>
    </header>

    <div class="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
      <template v-if="p">
        <div class="stagger">
          <section class="flex items-center gap-4 pb-4 pt-1">
            <div class="relative">
              <Avatar :name="p.username" :size="76" />
              <span v-if="data!.online" class="absolute -bottom-1 -right-1 size-4 rounded-full ring-3 ring-bg" :class="data!.playing ? 'bg-gold' : 'bg-green'" />
            </div>
            <div class="min-w-0">
              <div class="truncate font-display text-[1.45rem] font-extrabold leading-tight">{{ p.username }}</div>
              <div class="text-[0.84rem] font-semibold text-muted">
                {{ data!.playing ? t('profile.playingNow') : data!.online ? t('common.online') : t('common.offline') }}<template v-if="data!.rank"> · {{ t('profile.rankByGames', { n: data!.rank }) }}</template>
              </div>
            </div>
          </section>

          <section class="grid grid-cols-3 gap-2">
            <div class="card px-2 py-3 text-center">
              <div class="font-display text-[1.35rem] font-extrabold">{{ p.games }}</div>
              <div class="stat-label">{{ t('profile.games') }}</div>
            </div>
            <div class="card px-2 py-3 text-center">
              <div class="font-display text-[1.35rem] font-extrabold">{{ p.wins }}</div>
              <div class="stat-label">{{ t('profile.wins') }}</div>
            </div>
            <div class="card px-2 py-3 text-center">
              <div class="font-display text-[1.35rem] font-extrabold">{{ winRate }}%</div>
              <div class="stat-label">{{ t('profile.winRate') }}</div>
            </div>
          </section>

          <section class="card mt-3 p-4">
            <div class="flex items-baseline justify-between">
              <span class="font-display font-extrabold">{{ t('profile.gamesCount', { n: p.games }) }}</span>
              <span class="text-[0.8rem] font-semibold text-muted">{{ t('leaderboard.wld', { w: p.wins, l: p.losses, d: p.draws }) }}</span>
            </div>
            <div class="mt-3 flex h-2.5 overflow-hidden rounded-full bg-surface-3">
              <div class="bar bg-green" :style="{ width: `${pct(p.wins)}%` }" />
              <div class="bar bg-[#989795]" :style="{ width: `${pct(p.draws)}%` }" />
              <div class="bar bg-red" :style="{ width: `${pct(p.losses)}%` }" />
            </div>
            <div class="mt-2 flex justify-between text-[0.74rem] font-bold">
              <span class="text-green">{{ t('profile.won', { n: Math.round(pct(p.wins)) }) }}</span>
              <span class="text-muted">{{ t('profile.drawn', { n: Math.round(pct(p.draws)) }) }}</span>
              <span class="text-red">{{ t('profile.lost', { n: Math.round(pct(p.losses)) }) }}</span>
            </div>
          </section>

          <button v-if="!data!.isMe" class="btn btn-primary mt-3 h-12 w-full text-lg" @click="push('challenge', { username: p.username })">
            <Icon name="swords" /> {{ t('profile.challenge') }}
          </button>

          <section v-if="data!.historyEnabled" class="mt-4">
            <div class="pb-2 text-[0.72rem] font-bold uppercase tracking-wider text-muted">{{ t('profile.recent') }}</div>
            <div class="card overflow-hidden">
              <button
                v-for="g in data!.games"
                :key="g.id"
                class="hover-row flex w-full items-center gap-3 border-b border-line px-3 py-2.5 text-left last:border-0"
                @click="open(g)"
              >
                <Icon :name="tcCategory(parseTc(g.tc)).icon" :size="18" :style="{ color: tcCategory(parseTc(g.tc)).color }" />
                <span class="min-w-0 flex-1 leading-tight">
                  <span class="flex items-center gap-1.5 truncate text-[0.88rem] font-semibold">
                    <span class="size-2.5 shrink-0 rounded-sm border border-black/30" :class="side(g) === 'w' ? 'bg-white' : 'bg-[#312e2b]'" />
                    vs {{ side(g) === 'w' ? g.black : g.white }}
                  </span>
                  <span class="block text-[0.74rem] text-muted">{{ tcLabel(parseTc(g.tc)) }} · {{ t('profile.moves', { n: Math.ceil(g.moves / 2) }) }} · {{ t(`reasonShort.${g.reason}`) }} · {{ ago(g.createdAt) }}</span>
                </span>
                <span
                  class="shrink-0 rounded-md px-2 py-1 text-[0.7rem] font-extrabold uppercase text-white"
                  :class="{ 'bg-green': outcome(g) === 'win', 'bg-red': outcome(g) === 'loss', 'bg-[#8b8987]': outcome(g) === 'draw' }"
                >
                  {{ outcome(g) === 'win' ? t('profile.resultWon') : outcome(g) === 'loss' ? t('profile.resultLost') : t('profile.resultDraw') }}
                </span>
              </button>
              <div v-if="!data!.games.length" class="px-4 py-8 text-center text-[0.88rem] text-muted">{{ t('profile.empty') }}</div>
            </div>
          </section>
        </div>
      </template>
      <div v-else class="flex justify-center py-20"><span class="size-7 rounded-full border-[3px] border-surface-3 border-t-green [animation:spin_700ms_linear_infinite]" /></div>
    </div>

    <TabBar v-if="asTab" />
  </div>
</template>

<style scoped>
.bar {
  transition: width 600ms var(--ease-out);
}
</style>
