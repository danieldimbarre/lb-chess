<script setup lang="ts">
import { toasts } from '../lib/toast';
</script>

<template>
  <div class="pointer-events-none absolute inset-x-0 top-[calc(var(--safe-top)+4px)] z-[80] flex flex-col items-center gap-2 px-4">
    <TransitionGroup name="toast">
      <div
        v-for="t in toasts"
        :key="t.id"
        class="toast rounded-xl px-4 py-2.5 text-center text-[0.86rem] font-semibold shadow-[0_8px_24px_rgba(0,0,0,.35)]"
        :class="{
          'bg-[#e2412f] text-white': t.kind === 'error',
          'bg-green text-white': t.kind === 'success',
          'bg-surface-3 text-ink': t.kind === 'info',
        }"
      >
        {{ t.text }}
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-enter-active {
  transition:
    transform 260ms var(--ease-out),
    opacity 200ms ease;
}
.toast-leave-active {
  transition:
    transform 160ms ease,
    opacity 160ms ease;
}
.toast-enter-from {
  transform: translateY(-12px) scale(0.97);
  opacity: 0;
}
.toast-leave-to {
  opacity: 0;
  transform: scale(0.97);
}
</style>
