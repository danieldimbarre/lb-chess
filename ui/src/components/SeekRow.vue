<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import Avatar from './Avatar.vue';
import Icon from './Icon.vue';
import { t } from '../i18n';
import { serverNow } from '../stores/session';
import { tcCategory, tcLabel } from '../lib/timeControls';
import type { Seek } from '../types';

const props = defineProps<{ seek: Seek; action: string; busy?: boolean }>();
defineEmits<{ take: [] }>();

const now = ref(serverNow());
let tick: number | undefined;
onMounted(() => (tick = window.setInterval(() => (now.value = serverNow()), 1000)));
onBeforeUnmount(() => clearInterval(tick));

const waited = computed(() => {
  const s = Math.max(0, Math.floor((now.value - props.seek.since) / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
});
const cat = computed(() => tcCategory(props.seek.tc));
</script>

<template>
  <div class="flex items-center gap-3 px-3 py-2.5">
    <span class="relative shrink-0">
      <Avatar :name="seek.username" :size="38" />
      <span class="live-dot absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-green ring-2 ring-surface" />
    </span>
    <span class="min-w-0 flex-1 leading-tight">
      <span class="block truncate font-bold">{{ seek.username }}</span>
      <span class="flex items-center gap-1 text-[0.76rem] font-semibold text-muted">
        <Icon :name="cat.icon" :size="13" :style="{ color: cat.color }" />
        <span class="text-ink-2">{{ tcLabel(seek.tc) }}</span>
        <span class="truncate tabular-nums">{{ t('lobby.waiting', { t: waited }) }}</span>
      </span>
    </span>
    <button class="btn btn-primary h-9 shrink-0 px-4 text-[0.9rem]" :disabled="busy" @click="$emit('take')">{{ action }}</button>
  </div>
</template>

<style scoped>
/* Live presence: the dot breathes so the row reads as "happening now", not as history. */
.live-dot::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: #81b64c;
  animation: breathe 1.6s var(--ease-out) infinite;
}
@keyframes breathe {
  from {
    transform: scale(1);
    opacity: 0.7;
  }
  to {
    transform: scale(2.4);
    opacity: 0;
  }
}
@media (prefers-reduced-motion: reduce) {
  .live-dot::after {
    animation: none;
    opacity: 0;
  }
}
</style>
