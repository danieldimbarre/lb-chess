<script setup lang="ts">
defineProps<{ open: boolean }>();
const emit = defineEmits<{ close: [] }>();
</script>

<template>
  <Transition name="modal">
    <div v-if="open" class="absolute inset-0 z-50 flex items-center justify-center px-6">
      <div class="absolute inset-0 bg-black/60" @click="emit('close')" />
      <div class="modal-panel relative w-full max-w-[340px] overflow-hidden rounded-2xl bg-surface shadow-[0_20px_60px_rgba(0,0,0,.5)]">
        <slot />
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 200ms ease;
}
.modal-enter-active .modal-panel {
  transition:
    transform 260ms var(--ease-out),
    opacity 200ms ease;
}
.modal-leave-active .modal-panel {
  transition:
    transform 150ms ease,
    opacity 150ms ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-from .modal-panel {
  transform: scale(0.94) translateY(8px);
}
.modal-leave-to .modal-panel {
  transform: scale(0.97);
}
</style>
