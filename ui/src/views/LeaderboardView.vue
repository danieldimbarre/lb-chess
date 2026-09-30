<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import Avatar from '../components/Avatar.vue';
import Icon from '../components/Icon.vue';
import TabBar from '../components/TabBar.vue';
import { request } from '../bridge/nui';
import { push } from '../stores/router';
import type { LeaderboardRow } from '../types';

type Sort = 'games' | 'winrate' | 'wins';
type Row = LeaderboardRow & { online?: boolean };

const tabs: { id: Sort; label: string }[] = [
  { id: 'games', label: 'Most Games' },
  { id: 'winrate', label: 'Win Rate' },
  { id: 'wins', label: 'Most Wins' },
];

const sort = ref<Sort>('games');
const cache = ref<Partial<Record<Sort, { rows: Row[]; me: (Row & { rank: number | null }) | null; minGames: number }>>>({});
const loading = ref(false);

async function load(s: Sort, force = false) {
  sort.value = s;
  if (cache.value[s] && !force) return;
  loading.value = true;
  const res = await request('leaderboard', { sort: s });
  loading.value = false;
  if (res?.ok) cache.value = { ...cache.value, [s]: { rows: res.rows, me: res.me, minGames: res.minGames } };
}

onMounted(() => load('games'));

const data = computed(() => cache.value[sort.value]);
const tabIndex = computed(() => tabs.findIndex((t) => t.id === sort.value));

const metric = (r: Row) => (sort.value === 'games' ? `${r.games}` : sort.value === 'winrate' ? `${r.winRate.toFixed(1)}%` : `${r.wins}`);
const metricLabel = computed(() => (sort.value === 'games' ? 'games' : sort.value === 'winrate' ? 'win rate' : 'wins'));
const medal = (rank: number) => (['#ffc234', '#c9ccd1', '#d08a4f'] as const)[rank - 1];
</script>

<template>
  <div class="flex h-full flex-col bg-bg pt-(--safe-top)">
    <header class="flex h-12 items-center px-4">
      <h1 class="flex-1 font-display text-[1.25rem] font-extrabold">Leaderboard</h1>
      <button class="tap flex size-10 items-center justify-center rounded-full text-ink-2" aria-label="Refresh" @click="load(sort, true)">
        <Icon name="refresh" :class="loading ? '[animation:spin_800ms_linear_infinite]' : ''" />
      </button>
    </header>

    <div class="relative mx-4 mb-3 flex rounded-xl bg-surface p-1">
      <div
        class="absolute bottom-1 top-1 rounded-lg bg-surface-3 transition-transform duration-250 ease-(--ease-out)"
        :style="{ width: `calc((100% - 8px) / 3)`, transform: `translateX(${tabIndex * 100}%)` }"
      />
      <button
        v-for="t in tabs"
        :key="t.id"
        class="relative z-1 flex-1 rounded-lg py-2 text-[0.82rem] font-bold transition-colors duration-150"
        :class="sort === t.id ? 'text-ink' : 'text-muted'"
        @click="load(t.id)"
      >
        {{ t.label }}
      </button>
    </div>

    <div class="min-h-0 flex-1 overflow-y-auto px-4">
      <div v-if="sort === 'winrate' && data" class="pb-2 text-[0.76rem] font-semibold text-muted">Minimum {{ data.minGames }} games to qualify.</div>

      <!-- podium -->
      <div v-if="data && data.rows.length >= 3" :key="sort" class="podium mb-3 grid grid-cols-3 items-end gap-2">
        <button
          v-for="i in [1, 0, 2]"
          :key="data.rows[i].username"
          class="tap flex flex-col items-center gap-1.5 rounded-xl bg-surface px-1 pb-3"
          :class="i === 0 ? 'pt-4' : 'pt-3'"
          @click="push('profile', { username: data.rows[i].username })"
        >
          <div class="relative">
            <Avatar :name="data.rows[i].username" :size="i === 0 ? 58 : 46" />
            <span
              class="absolute -bottom-2 left-1/2 flex size-6 -translate-x-1/2 items-center justify-center rounded-full text-[0.75rem] font-extrabold text-[#312e2b] ring-2 ring-surface"
              :style="{ background: medal(i + 1) }"
              >{{ i + 1 }}</span
            >
          </div>
          <div class="mt-1.5 w-full truncate text-center text-[0.82rem] font-bold">{{ data.rows[i].username }}</div>
          <div class="font-display text-[1.05rem] font-extrabold leading-none">{{ metric(data.rows[i]) }}</div>
          <div class="text-[0.66rem] font-bold uppercase tracking-wide text-muted">{{ metricLabel }}</div>
        </button>
      </div>

      <div v-if="data" class="card mb-3 overflow-hidden">
        <button
          v-for="r in data.rows.slice(data.rows.length >= 3 ? 3 : 0)"
          :key="r.username"
          class="hover-row flex w-full items-center gap-3 border-b border-line px-3 py-2.5 text-left last:border-0"
          @click="push('profile', { username: r.username })"
        >
          <span class="w-6 text-center text-[0.85rem] font-bold text-muted">{{ r.rank }}</span>
          <span class="relative">
            <Avatar :name="r.username" :size="34" />
            <span v-if="r.online" class="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-green ring-2 ring-surface" />
          </span>
          <span class="min-w-0 flex-1">
            <span class="block truncate font-semibold">{{ r.username }}</span>
            <span class="block text-[0.74rem] text-muted">{{ r.wins }}W · {{ r.losses }}L · {{ r.draws }}D</span>
          </span>
          <span class="text-right">
            <span class="block font-display font-extrabold">{{ metric(r) }}</span>
            <span class="block text-[0.66rem] font-bold uppercase text-muted">{{ metricLabel }}</span>
          </span>
        </button>
        <div v-if="!data.rows.length" class="px-4 py-10 text-center text-[0.9rem] text-muted">No ranked players yet. Be the first!</div>
      </div>
      <div v-else class="flex justify-center py-16"><span class="size-7 rounded-full border-[3px] border-surface-3 border-t-green [animation:spin_700ms_linear_infinite]" /></div>
    </div>

    <!-- my position -->
    <div v-if="data?.me" class="mx-3 mb-2 flex items-center gap-3 rounded-xl bg-green/15 px-3 py-2.5 ring-1 ring-green/40">
      <span class="w-8 text-center font-display font-extrabold text-green">{{ data.me.rank ?? '—' }}</span>
      <Avatar :name="data.me.username" :size="34" />
      <span class="min-w-0 flex-1">
        <span class="block truncate font-bold">You</span>
        <span class="block text-[0.74rem] text-ink-2">{{ data.me.rank ? `Rank #${data.me.rank}` : sort === 'winrate' ? `Play ${data.minGames} games to rank` : 'Play a game to rank' }}</span>
      </span>
      <span class="font-display font-extrabold">{{ metric(data.me) }}</span>
    </div>

    <TabBar />
  </div>
</template>

<style scoped>
.podium > * {
  animation: rise 380ms var(--ease-out) both;
}
.podium > *:nth-child(1) {
  animation-delay: 60ms;
}
.podium > *:nth-child(3) {
  animation-delay: 120ms;
}
</style>
