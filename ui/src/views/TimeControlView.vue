<script setup lang="ts">
import { t } from '../i18n';
import { computed, ref } from 'vue';
import TopBar from '../components/TopBar.vue';
import Icon from '../components/Icon.vue';
import { TC_CATEGORIES, prefs, tcLabel, sameTc, tcCategory, challengeTc } from '../lib/timeControls';
import { back } from '../stores/router';
import type { TimeControl } from '../types';

const props = defineProps<{ /** Where to store the pick: online prefs (default) or a callback key. */ target?: 'online' | 'challenge' }>();
const emitTarget = props.target ?? 'online';

const showMore = ref(false);
const custom = ref<TimeControl>({ base: prefs.tc.base >= 60 ? prefs.tc.base : 60, inc: prefs.tc.inc });

const MINUTES = [1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 15, 20, 25, 30, 45, 60];
const INCS = [0, 1, 2, 3, 5, 10, 15, 20, 30, 45, 60];

const minuteIdx = computed({
  get: () => Math.max(0, MINUTES.findIndex((m) => m * 60 >= custom.value.base)),
  set: (i: number) => (custom.value = { ...custom.value, base: MINUTES[i] * 60 }),
});
const incIdx = computed({
  get: () => Math.max(0, INCS.findIndex((s) => s >= custom.value.inc)),
  set: (i: number) => (custom.value = { ...custom.value, inc: INCS[i] }),
});

function pick(tc: TimeControl) {
  if (emitTarget === 'challenge') challengeTc.value = tc;
  else prefs.tc = tc;
  back();
}
</script>

<template>
  <div class="flex h-full flex-col bg-bg pt-(--safe-top)">
    <TopBar :title="t('tc.title')" />
    <div class="min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(var(--safe-bottom)+16px)]">
      <section v-for="c in TC_CATEGORIES" :key="c.id" class="pb-4">
        <div class="flex items-center gap-2 pb-2 pt-1">
          <Icon :name="c.icon" :size="20" :style="{ color: c.color }" />
          <span class="font-display text-[1rem] font-extrabold">{{ c.label }}</span>
        </div>
        <div class="grid grid-cols-3 gap-2">
          <button
            v-for="tc in showMore ? [...c.items, ...c.more] : c.items"
            :key="tc.base + '+' + tc.inc"
            class="tap h-12 rounded-lg text-[0.95rem] font-bold transition-colors duration-150"
            :class="sameTc(tc, emitTarget === 'challenge' ? challengeTc : prefs.tc) ? 'bg-surface-3 text-ink ring-2 ring-green' : 'bg-surface text-ink-2'"
            @click="pick(tc)"
          >
            {{ tcLabel(tc) }}
          </button>
        </div>
      </section>

      <button class="tap flex w-full items-center justify-center gap-1.5 py-2 text-[0.9rem] font-bold text-ink-2" @click="showMore = !showMore">
        {{ showMore ? t('tc.fewer') : t('tc.more') }}
        <Icon name="next" :size="16" class="transition-transform duration-200" :class="showMore ? '-rotate-90' : 'rotate-90'" />
      </button>

      <section class="card mt-3 p-4">
        <div class="flex items-center gap-2">
          <Icon name="settings" :size="18" class="text-muted" />
          <span class="font-display font-extrabold">{{ t('tc.custom') }}</span>
          <span class="ml-auto rounded-md bg-surface-2 px-2 py-0.5 text-[0.8rem] font-bold" :style="{ color: tcCategory(custom).color }">
            {{ tcCategory(custom).label }}
          </span>
        </div>
        <label class="mt-4 block">
          <span class="flex justify-between text-[0.85rem] font-semibold"><span class="text-ink-2">{{ t('tc.minutes') }}</span><span>{{ custom.base / 60 }}</span></span>
          <input v-model.number="minuteIdx" type="range" min="0" :max="MINUTES.length - 1" class="range mt-2 w-full" />
        </label>
        <label class="mt-3 block">
          <span class="flex justify-between text-[0.85rem] font-semibold"><span class="text-ink-2">{{ t('tc.increment') }}</span><span>{{ custom.inc }}</span></span>
          <input v-model.number="incIdx" type="range" min="0" :max="INCS.length - 1" class="range mt-2 w-full" />
        </label>
        <button class="btn btn-primary mt-5 h-12 w-full text-lg" @click="pick({ ...custom })">{{ t('tc.use', { tc: tcLabel(custom) }) }}</button>
      </section>
    </div>
  </div>
</template>

<style scoped>
.range {
  appearance: none;
  height: 6px;
  border-radius: 999px;
  background: var(--c-surface-3);
  outline: none;
}
.range::-webkit-slider-thumb {
  appearance: none;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #81b64c;
  box-shadow: 0 2px 0 #45753c;
  cursor: pointer;
}
</style>
