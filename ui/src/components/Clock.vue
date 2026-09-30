<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{ ms: number; active: boolean }>();

const text = computed(() => {
  const ms = Math.max(0, props.ms);
  const total = ms / 1000;
  if (total >= 3600) {
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = Math.floor(total % 60);
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  if (total < 20) {
    const s = Math.floor(total);
    const t = Math.floor((ms % 1000) / 100);
    return `0:${String(s).padStart(2, '0')}.${t}`;
  }
  const m = Math.floor(total / 60);
  const s = Math.floor(total % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
});

const low = computed(() => props.ms < 20000);
</script>

<template>
  <div
    class="clock flex h-9 min-w-[5.6rem] items-center justify-end gap-1.5 rounded-[5px] px-2.5 font-display text-[1.28rem] font-bold tabular-nums"
    :class="[active ? (low ? 'clock-low' : 'clock-active') : 'clock-idle']"
  >
    <svg v-if="active" class="clock-spin size-3.5 opacity-80" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="8" cy="8" r="6.5" />
      <path d="M8 8V4" stroke-linecap="round" />
    </svg>
    <span>{{ text }}</span>
  </div>
</template>

<style scoped>
.clock {
  transition:
    background-color 150ms ease,
    color 150ms ease;
}
.clock-idle {
  background: var(--c-surface);
  color: var(--c-muted);
}
.clock-active {
  background: var(--c-clock-active);
  color: var(--c-clock-ink);
}
[data-theme='light'] .clock-active {
  color: #fff;
}
.clock-low {
  background: #d63a2f;
  color: #fff;
}
.clock-spin path {
  transform-origin: 8px 8px;
  animation: spin 1s steps(8) infinite;
}
</style>
