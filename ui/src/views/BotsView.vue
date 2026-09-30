<script setup lang="ts">
import { t as tr } from '../i18n';
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
  { label: 'bots.beginner', ids: ['pip', 'maya', 'leo'] },
  { label: 'bots.intermediate', ids: ['sofia', 'viktor'] },
  { label: 'bots.advanced', ids: ['amara', 'kaspar', 'nova'] },
];

const timers: (TimeControl | null)[] = [null, { base: 180, inc: 2 }, { base: 300, inc: 0 }, { base: 600, inc: 0 }, { base: 900, inc: 10 }];

function play() {
  const color = prefs.botColor === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : prefs.botColor;
  push('botGame', { botId: bot.value.id, color, tc: prefs.botTc, fen: props.fen });
}
</script>

<template>
  <div class="flex h-full flex-col bg-bg pt-(--safe-top)">
    <TopBar :title="tr('bots.title')" />

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
            {{ tr(`bots.${bot.id}.greeting`) }}
          </div>
        </Transition>
      </div>
      <div class="px-4 pb-3">
        <div class="flex items-baseline gap-2">
          <span class="font-display text-2xl font-extrabold">{{ bot.name }}</span>
          <span class="text-lg font-semibold text-muted">{{ tr('common.level', { n: bot.level }) }}</span>
        </div>
        <div class="text-[0.88rem] text-ink-2">{{ tr(`bots.${bot.id}.tagline`) }}</div>
      </div>

      <div v-for="g in groups" :key="g.label" class="px-4 pb-3">
        <div class="pb-2 text-[0.72rem] font-bold uppercase tracking-wider text-muted">{{ tr(g.label) }}</div>
        <div class="flex flex-wrap gap-2.5">
          <button
            v-for="b in g.ids.map(botById)"
            :key="b.id"
            class="tap relative rounded-lg p-[3px]"
            :class="prefs.botId === b.id ? 'bg-green' : 'bg-transparent'"
            :aria-label="`${b.name}, ${tr('common.level', { n: b.level })}`"
            @click="prefs.botId = b.id"
          >
            <Avatar :name="b.name" :size="56" :role="b.role" :tint="b.tint" />
            <span class="absolute inset-x-[3px] bottom-[3px] rounded-b-md bg-black/55 text-center text-[0.66rem] font-bold text-white">{{ tr('common.levelShort', { n: b.level }) }}</span>
          </button>
        </div>
      </div>
      <div class="h-2" />
    </div>

    <div class="shrink-0 bg-surface px-4 pb-[calc(var(--safe-bottom)+12px)] pt-3">
      <div class="mb-3">
        <span class="mb-1.5 block text-[0.72rem] font-bold uppercase tracking-wider text-muted">{{ tr('bots.iPlay') }}</span>
        <div class="flex gap-2">
          <button
            v-for="c in (['w', 'random', 'b'] as const)"
            :key="c"
            class="tap flex h-11 flex-1 items-center justify-center rounded-lg"
            :class="prefs.botColor === c ? 'bg-surface-3 ring-2 ring-green' : 'bg-surface-2'"
            :aria-label="c === 'w' ? tr('common.white') : c === 'b' ? tr('common.black') : tr('common.random')"
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
      <div class="mb-3">
        <span class="mb-1.5 block text-[0.72rem] font-bold uppercase tracking-wider text-muted">{{ tr('bots.timer') }}</span>
        <div class="grid grid-cols-5 gap-1.5">
          <button
            v-for="(t, i) in timers"
            :key="i"
            class="tap h-9 min-w-0 truncate rounded-lg px-1 text-[0.76rem] font-bold"
            :class="(t === null ? prefs.botTc === null : sameTc(t, prefs.botTc)) ? 'bg-surface-3 text-ink ring-2 ring-green' : 'bg-surface-2 text-ink-2'"
            @click="prefs.botTc = t"
          >
            {{ t ? tcLabel(t) : tr('bots.none') }}
          </button>
        </div>
      </div>
      <button class="btn btn-primary h-14 w-full text-xl" @click="play">{{ tr('common.play') }}</button>
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
