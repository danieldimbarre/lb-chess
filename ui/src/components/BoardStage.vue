<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';

/**
 * Lays out "player bar / board / player bar" so the board is as large as possible
 * while everything fits: board side = min(free width, free height - bars).
 */
const props = withDefaults(
  defineProps<{
    /** Height taken by the top + bottom slots besides the board (px, layout units). */
    reserveHeight?: number;
    /** Width next to the board inside the default slot (e.g. an eval bar). */
    reserveWidth?: number;
  }>(),
  { reserveHeight: 104, reserveWidth: 0 },
);

const root = ref<HTMLElement>();
const size = ref(0);
let ro: ResizeObserver | null = null;

function measure(w: number, h: number) {
  size.value = Math.max(120, Math.floor(Math.min(w - props.reserveWidth, h - props.reserveHeight)));
}

onMounted(() => {
  ro = new ResizeObserver(([e]) => measure(e.contentRect.width, e.contentRect.height));
  if (root.value) {
    ro.observe(root.value);
    measure(root.value.clientWidth, root.value.clientHeight);
  }
});
onBeforeUnmount(() => ro?.disconnect());
</script>

<template>
  <div ref="root" class="flex min-h-0 flex-1 flex-col items-center justify-center">
    <div v-if="size" class="flex flex-col" :style="{ width: `${size + reserveWidth}px` }">
      <slot name="top" />
      <slot :size="size" />
      <slot name="bottom" />
    </div>
  </div>
</template>
