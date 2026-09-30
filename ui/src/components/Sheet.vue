<script setup lang="ts">
defineProps<{ open: boolean; title?: string }>();
const emit = defineEmits<{ close: [] }>();
</script>

<template>
  <Transition name="sheet">
    <div v-if="open" class="absolute inset-0 z-50 flex flex-col justify-end">
      <div class="absolute inset-0 bg-black/55" @click="emit('close')" />
      <div class="sheet-panel relative max-h-[86%] overflow-y-auto rounded-t-2xl bg-surface pb-(--safe-bottom)">
        <div class="mx-auto mt-2 h-1.5 w-10 rounded-full bg-surface-3" />
        <h2 v-if="title" class="px-5 pb-1 pt-3 font-display text-lg font-extrabold">{{ title }}</h2>
        <slot />
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.sheet-enter-active,
.sheet-leave-active {
  transition: opacity 260ms ease;
}
.sheet-enter-active .sheet-panel {
  transition: transform 320ms var(--ease-drawer);
}
.sheet-leave-active .sheet-panel {
  transition: transform 200ms var(--ease-out);
}
.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;
}
.sheet-enter-from .sheet-panel,
.sheet-leave-to .sheet-panel {
  transform: translateY(100%);
}
</style>
