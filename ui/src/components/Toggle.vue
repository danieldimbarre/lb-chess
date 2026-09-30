<script setup lang="ts">
const model = defineModel<boolean>({ required: true });
</script>

<template>
  <button
    role="switch"
    :aria-checked="model"
    class="relative h-[26px] w-[46px] shrink-0 rounded-full transition-colors duration-200"
    :class="model ? 'bg-green' : 'bg-surface-3'"
    @click="model = !model"
  >
    <span
      class="absolute left-[3px] top-[3px] size-5 rounded-full bg-white shadow transition-transform duration-200 ease-(--ease-out)"
      :class="model ? 'translate-x-5' : ''"
    />
  </button>
</template>
