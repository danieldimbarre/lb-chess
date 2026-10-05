<script setup lang="ts">
import { t } from '../i18n';
import { computed, ref } from 'vue';
import Avatar from '../components/Avatar.vue';
import Icon from '../components/Icon.vue';
import SeekRow from '../components/SeekRow.vue';
import TabBar from '../components/TabBar.vue';
import { openSeeks, session, waitingIn } from '../stores/session';
import { push, reset } from '../stores/router';
import { joinQueue } from '../stores/online';
import { prefs, tcLabel, tcCategory } from '../lib/timeControls';
import type { TimeControl } from '../types';

const me = computed(() => session.me);
const winRate = computed(() => (me.value?.games ? Math.round((me.value.wins / me.value.games) * 100) : 0));
const cat = computed(() => tcCategory(prefs.tc));
const waitingHere = computed(() => waitingIn(prefs.tc));

// Taking a seek is joining its time control: the server pairs instantly with whoever waits there.
const taking = ref(false);
async function take(tc: TimeControl) {
  if (taking.value) return;
  taking.value = true;
  try {
    await joinQueue(tc);
  } finally {
    taking.value = false;
  }
}

const rows = [
  { route: 'challenge', icon: 'swords', title: 'home.friend', sub: 'home.friendHint', tint: '#5d9fd8' },
  { route: 'bots', icon: 'bot', title: 'home.bots', sub: 'home.botsHint', tint: '#c3632e' },
  { route: 'analysis', icon: 'board', title: 'home.analysis', sub: 'home.analysisHint', tint: '#8c5bb5' },
] as const;
</script>

<template>
  <div class="flex h-full flex-col bg-bg pt-(--safe-top)">
    <header class="flex items-center gap-3 px-4 pb-3 pt-1">
      <button class="tap flex min-w-0 flex-1 items-center gap-3 text-left" @click="reset('profile')">
        <Avatar :name="me?.username ?? '?'" :size="40" />
        <div class="min-w-0 leading-tight">
          <div class="truncate font-display text-[1.1rem] font-extrabold">{{ me?.username }}</div>
          <div class="text-[0.8rem] font-semibold text-muted">{{ t('home.gamesPlayed', { n: me?.games ?? 0 }) }}</div>
        </div>
      </button>
      <div class="flex items-center gap-1 rounded-full bg-surface px-3 py-1.5 text-[0.78rem] font-bold">
        <span class="size-2 rounded-full bg-green shadow-[0_0_0_3px_rgba(129,182,76,.25)]" />
        {{ session.lobby.players > 1 ? t('lobby.players', { n: session.lobby.players }) : t('common.online') }}
      </div>
    </header>

    <div class="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
      <div class="stagger flex flex-col gap-3">
        <button
          v-if="session.game?.status === 'playing'"
          class="tap flex items-center gap-3 rounded-xl bg-gold/15 p-3 text-left ring-1 ring-gold/40"
          @click="reset('online', {}, 'forward')"
        >
          <span class="flex size-10 items-center justify-center rounded-lg bg-gold text-[#312e2b]"><Icon name="clock" /></span>
          <span class="flex-1">
            <span class="block font-bold">{{ t('home.inProgress') }}</span>
            <span class="block text-[0.8rem] text-ink-2">{{ t('home.vs', { name: session.game.myColor === 'w' ? session.game.black.username : session.game.white.username }) }}</span>
          </span>
          <Icon name="next" class="text-gold" />
        </button>

        <!-- Players waiting right now: one tap starts the game -->
        <section v-if="openSeeks.length" class="card overflow-hidden ring-1 ring-green/45">
          <div class="flex items-center gap-2 px-3 pb-0.5 pt-3">
            <span class="rounded-md bg-green px-1.5 py-0.5 text-[0.64rem] font-extrabold uppercase tracking-wider text-white">{{ t('lobby.live') }}</span>
            <span class="truncate font-display text-[0.95rem] font-extrabold">{{ t('lobby.title') }}</span>
          </div>
          <TransitionGroup tag="div" name="seek" class="relative divide-y divide-line">
            <SeekRow
              v-for="s in openSeeks.slice(0, 3)"
              :key="s.username + s.tc.base + '+' + s.tc.inc"
              :seek="s"
              :action="t('lobby.play')"
              :busy="taking"
              @take="take(s.tc)"
            />
          </TransitionGroup>
          <div v-if="openSeeks.length > 3" class="px-3 pb-2.5 text-[0.78rem] font-semibold text-muted">{{ t('lobby.more', { n: openSeeks.length - 3 }) }}</div>
        </section>

        <!-- Play online hero -->
        <section class="card relative overflow-hidden p-4">
          <div class="pointer-events-none absolute -right-8 -top-10 size-40 rounded-full bg-green/10" />
          <div class="relative flex items-center gap-2 text-[0.78rem] font-bold uppercase tracking-wider text-muted">
            <Icon name="wifi" :size="16" /> {{ t('home.playOnline') }}
          </div>
          <div class="relative mt-1 text-[0.9rem] text-ink-2">{{ t('home.playOnlineHint') }}</div>
          <button class="tap relative mt-3 flex w-full items-center gap-3 rounded-xl bg-surface-2 px-3 py-3 text-left" @click="push('timeControl')">
            <Icon :name="cat.icon" :style="{ color: cat.color }" :size="22" />
            <span class="flex-1 font-display text-[1.05rem] font-extrabold">{{ tcLabel(prefs.tc) }}</span>
            <span v-if="waitingHere" class="rounded-full bg-green/20 px-2 py-0.5 text-[0.75rem] font-bold text-green">{{ t('lobby.waitingHere', { n: waitingHere }) }}</span>
            <span v-else class="text-[0.8rem] font-semibold text-muted">{{ cat.label }}</span>
            <Icon name="next" :size="18" class="text-muted" />
          </button>
          <button class="btn btn-primary relative mt-4 h-[3.6rem] w-full text-[1.35rem]" @click="joinQueue(prefs.tc)">
            <svg viewBox="0 0 24 24" class="size-7" fill="currentColor"><path d="M12 3a3.5 3.5 0 00-2.3 6.1C8 9.8 7 11.2 7 13h3c-.2 2.2-1.2 3.9-3 5v2h10v-2c-1.8-1.1-2.8-2.8-3-5h3c0-1.8-1-3.2-2.7-3.9A3.5 3.5 0 0012 3z" /></svg>
            {{ t('common.play') }}
          </button>
        </section>

        <button v-for="r in rows" :key="r.route" class="tap card flex items-center gap-3.5 p-3.5 text-left" @click="push(r.route)">
          <span class="flex size-12 shrink-0 items-center justify-center rounded-xl text-white" :style="{ background: r.tint }">
            <Icon :name="r.icon" :size="24" />
          </span>
          <span class="min-w-0 flex-1">
            <span class="block font-display text-[1rem] font-extrabold">{{ t(r.title) }}</span>
            <span class="line-clamp-2 block text-[0.82rem] leading-snug text-pretty text-muted">{{ t(r.sub) }}</span>
          </span>
          <span
            v-if="r.route === 'challenge' && session.incoming.length"
            class="flex h-6 min-w-6 items-center justify-center rounded-full bg-red px-1.5 text-[0.75rem] font-extrabold text-white"
          >
            {{ session.incoming.length }}
          </span>
          <Icon v-else name="next" :size="18" class="text-muted" />
        </button>

        <section class="card grid grid-cols-3 divide-x divide-line py-3 text-center">
          <div>
            <div class="font-display text-xl font-extrabold">{{ me?.games ?? 0 }}</div>
            <div class="stat-label">{{ t('home.games') }}</div>
          </div>
          <div>
            <div class="font-display text-xl font-extrabold">{{ me?.wins ?? 0 }}</div>
            <div class="stat-label">{{ t('home.wins') }}</div>
          </div>
          <div>
            <div class="font-display text-xl font-extrabold">{{ winRate }}%</div>
            <div class="stat-label">{{ t('home.winRate') }}</div>
          </div>
        </section>
      </div>
    </div>

    <TabBar />
  </div>
</template>

<style scoped>
.seek-enter-active,
.seek-leave-active {
  transition:
    opacity 220ms var(--ease-out),
    transform 220ms var(--ease-out);
}
.seek-enter-from {
  opacity: 0;
  transform: translateY(-6px);
}
.seek-leave-to {
  opacity: 0;
}
.seek-leave-active {
  position: absolute;
  inset-inline: 0;
}
@media (prefers-reduced-motion: reduce) {
  .seek-enter-active,
  .seek-leave-active {
    transition: none;
  }
}
</style>
