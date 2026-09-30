<script setup lang="ts">
import { computed } from 'vue';
import TopBar from '../components/TopBar.vue';
import Avatar from '../components/Avatar.vue';
import { BOTS, botById } from '../engine/bots';
import { prefs, tcLabel, sameTc } from '../lib/timeControls';
import { push } from '../stores/router';
import { pieceUrl } from '../chess/pieces';
import type { TimeControl } from '../types';

const props = defineProps<{ fen?: string }>();

const bot = computed(() => botById(prefs.botId));

const groups = [
  { label: 'Beginner', ids: ['pip', 'maya', 'leo'] },
  { label: 'Intermediate', ids: ['sofia', 'viktor'] },
  { label: 'Advanced', ids: ['amara', 'kaspar', 'nova'] },
];

const timers: (TimeControl | null)[] = [null, { base: 180, inc: 2 }, { base: 300, inc: 0 }, { base: 600, inc: 0 }, { base: 900, inc: 10 }];

function play() {
  const color = prefs.botColor === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : prefs.botColor;
  push('botGame', { botId: bot.value.id, color, tc: prefs.botTc, fen: props.fen });
}
</script>

<template>
  <div class="flex h-full flex-col bg-bg pt-(--safe-top)">
    <TopBar title="Play Bots" />

    <div class="min-h-0 flex-1 overflow-y-auto">
      <!-- selected bot -->
      <div class="flex items-end gap-3 px-4 pb-4 pt-2">
        <Transition name="swap" mode="out-in">
          <div :key="bot.id" class="relative">
            <Avatar :name="bot.name" :size="92" :role="bot.role" :tint="bot.tint" />
          </div>
        </Transition>
        <Transition name="swap" mode="out-in">
          <div :key="bot.id" class="relative mb-2 flex-1 rounded-2xl rounded-bl-sm bg-surface-2 px-3.5 py-2.5 text-[0.88rem] font-medium leading-snug">
            {{ bot.greeting }}
          </div>
        </Transition>
      </div>
      <div class="px-4 pb-3">
        <div class="flex items-baseline gap-2">
          <span class="font-display text-2xl font-extrabold">{{ bot.name }}</span>
          <span class="text-lg font-semibold text-muted">Level {{ bot.level }}</span>
        </div>
        <div class="text-[0.88rem] text-ink-2">{{ bot.tagline }}</div>
      </div>

      <div v-for="g in groups" :key="g.label" class="px-4 pb-3">
        <div class="pb-2 text-[0.72rem] font-bold uppercase tracking-wider text-muted">{{ g.label }}</div>
        <div class="flex flex-wrap gap-2.5">
          <button
            v-for="b in g.ids.map(botById)"
            :key="b.id"
            class="tap relative rounded-lg p-[3px]"
            :class="prefs.botId === b.id ? 'bg-green' : 'bg-transparent'"
            :aria-label="`${b.name}, level ${b.level}`"
            @click="prefs.botId = b.id"
          >
            <Avatar :name="b.name" :size="56" :role="b.role" :tint="b.tint" />
            <span class="absolute inset-x-[3px] bottom-[3px] rounded-b-md bg-black/55 text-center text-[0.66rem] font-bold text-white">Lv {{ b.level }}</span>
          </button>
        </div>
      </div>
      <div class="h-2" />
    </div>

    <div class="shrink-0 bg-surface px-4 pb-[calc(var(--safe-bottom)+12px)] pt-3">
      <div class="mb-3 flex items-center gap-2">
        <span class="w-16 text-[0.8rem] font-bold text-muted">I play</span>
        <div class="flex flex-1 gap-2">
          <button
            v-for="c in (['w', 'random', 'b'] as const)"
            :key="c"
            class="tap flex h-11 flex-1 items-center justify-center rounded-lg"
            :class="prefs.botColor === c ? 'bg-surface-3 ring-2 ring-green' : 'bg-surface-2'"
            :aria-label="c === 'w' ? 'White' : c === 'b' ? 'Black' : 'Random'"
            @click="prefs.botColor = c"
          >
            <span v-if="c !== 'random'" class="size-8 bg-contain bg-no-repeat" :style="{ backgroundImage: `url(${pieceUrl(c, 'k')})` }" />
            <span v-else class="relative size-8">
              <span class="absolute inset-0 bg-contain bg-no-repeat [clip-path:inset(0_50%_0_0)]" :style="{ backgroundImage: `url(${pieceUrl('w', 'k')})` }" />
              <span class="absolute inset-0 bg-contain bg-no-repeat [clip-path:inset(0_0_0_50%)]" :style="{ backgroundImage: `url(${pieceUrl('b', 'k')})` }" />
            </span>
          </button>
        </div>
      </div>
      <div class="mb-3 flex items-center gap-2">
        <span class="w-16 text-[0.8rem] font-bold text-muted">Timer</span>
        <div class="flex flex-1 gap-1.5 overflow-x-auto">
          <button
            v-for="(t, i) in timers"
            :key="i"
            class="tap h-9 shrink-0 rounded-lg px-3 text-[0.8rem] font-bold"
            :class="(t === null ? prefs.botTc === null : sameTc(t, prefs.botTc)) ? 'bg-surface-3 text-ink ring-2 ring-green' : 'bg-surface-2 text-ink-2'"
            @click="prefs.botTc = t"
          >
            {{ t ? tcLabel(t) : 'None' }}
          </button>
        </div>
      </div>
      <button class="btn btn-primary h-14 w-full text-xl" @click="play">Play</button>
    </div>
  </div>
</template>

<style scoped>
.swap-enter-active,
.swap-leave-active {
  transition:
    opacity 160ms ease,
    transform 200ms var(--ease-out);
}
.swap-enter-from {
  opacity: 0;
  transform: translateY(6px) scale(0.97);
}
.swap-leave-to {
  opacity: 0;
}
</style>
