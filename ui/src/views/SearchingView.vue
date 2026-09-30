<script setup lang="ts">
import { t } from '../i18n';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import Board from '../components/Board.vue';
import PlayerBar from '../components/PlayerBar.vue';
import Icon from '../components/Icon.vue';
import BoardStage from '../components/BoardStage.vue';
import { session, serverNow } from '../stores/session';
import { leaveQueue } from '../stores/online';
import { reset } from '../stores/router';
import { tcLabel, tcCategory } from '../lib/timeControls';
import { START_FEN } from '../chess/util';

const now = ref(serverNow());
let tick: number | undefined;
onMounted(() => (tick = window.setInterval(() => (now.value = serverNow()), 500)));
onBeforeUnmount(() => clearInterval(tick));

const elapsed = computed(() => {
  const s = Math.max(0, Math.floor((now.value - (session.queue?.since ?? now.value)) / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
});

// Leaving the queue from elsewhere (or an error) sends the player home.
watch(
  () => session.queue,
  (q) => {
    if (!q && session.game?.status !== 'playing') reset('home', {}, 'back');
  },
);

async function cancel() {
  await leaveQueue();
  reset('home', {}, 'back');
}

const cat = computed(() => (session.queue ? tcCategory(session.queue.tc) : null));
</script>

<template>
  <div class="flex h-full flex-col bg-bg pt-(--safe-top) pb-(--safe-bottom)">
    <header class="flex h-12 items-center justify-center gap-2 font-display font-extrabold">
      <Icon v-if="cat" :name="cat.icon" :style="{ color: cat.color }" :size="18" />
      {{ session.queue ? tcLabel(session.queue.tc) : '' }}
    </header>

    <BoardStage>
      <template #top>
      <div class="flex h-[3.2rem] items-center gap-2.5 px-3">
        <div class="skeleton size-[38px] rounded-[6px]" />
        <div class="flex-1">
          <div class="skeleton h-3 w-28 rounded" />
          <div class="skeleton mt-1.5 h-2.5 w-14 rounded" />
        </div>
        <div class="flex h-9 min-w-[5.6rem] items-center justify-end rounded-[5px] bg-surface px-2.5 font-display text-[1.28rem] font-bold text-muted">
          {{ session.queue ? `${Math.floor(session.queue.tc.base / 60)}:${String(session.queue.tc.base % 60).padStart(2, '0')}` : '' }}
        </div>
      </div>
      </template>

      <div class="relative">
        <div class="opacity-45 saturate-50">
          <Board :fen="START_FEN" movable="none" />
        </div>
        <div class="absolute inset-0 flex flex-col items-center justify-center gap-4">
          <div class="radar relative flex size-24 items-center justify-center rounded-full bg-surface/90 shadow-[0_10px_30px_rgba(0,0,0,.4)]">
            <span class="ring" />
            <span class="ring [animation-delay:700ms]" />
            <svg viewBox="0 0 24 24" class="relative size-11 text-green" fill="currentColor">
              <path d="M12 3a3.5 3.5 0 00-2.3 6.1C8 9.8 7 11.2 7 13h3c-.2 2.2-1.2 3.9-3 5v2h10v-2c-1.8-1.1-2.8-2.8-3-5h3c0-1.8-1-3.2-2.7-3.9A3.5 3.5 0 0012 3z" />
            </svg>
          </div>
          <div class="rounded-xl bg-surface/90 px-4 py-2 text-center shadow-[0_10px_30px_rgba(0,0,0,.35)]">
            <div class="font-display text-[1.05rem] font-extrabold">{{ t('search.searching') }}</div>
            <div class="text-[0.82rem] font-semibold tabular-nums text-muted">{{ elapsed }}</div>
          </div>
        </div>
      </div>

      <template #bottom>
      <PlayerBar :name="session.me?.username ?? t('common.you')" color="w" :captured="[]" :diff="0" :clock="session.queue ? session.queue.tc.base * 1000 : null" />
      </template>
    </BoardStage>

    <div class="px-4 pb-3 pt-2">
      <button class="btn btn-secondary h-12 w-full text-lg" @click="cancel">{{ t('common.cancel') }}</button>
    </div>
  </div>
</template>

<style scoped>
.skeleton {
  background: linear-gradient(90deg, var(--c-surface) 0%, var(--c-surface-2) 50%, var(--c-surface) 100%);
  background-size: 200% 100%;
  animation: shimmer 1.3s linear infinite;
}
@keyframes shimmer {
  to {
    background-position: -200% 0;
  }
}
.ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 3px solid #81b64c;
  animation: pulse 1.4s var(--ease-out) infinite;
}
@keyframes pulse {
  from {
    transform: scale(0.85);
    opacity: 0.9;
  }
  to {
    transform: scale(1.55);
    opacity: 0;
  }
}
@media (prefers-reduced-motion: reduce) {
  .ring,
  .skeleton {
    animation: none;
  }
}
</style>
