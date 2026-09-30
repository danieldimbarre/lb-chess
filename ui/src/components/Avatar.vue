<script setup lang="ts">
import { computed } from 'vue';
import { pieceUrl } from '../chess/pieces';
import type { Role } from '../chess/util';

const props = withDefaults(defineProps<{ name: string; size?: number; role?: Role; tint?: string }>(), { size: 36 });

const palette = ['#5d9948', '#c3632e', '#3f7fbf', '#8c5bb5', '#b8443c', '#2f8f8a', '#b8902d', '#6b6f78'];
const bg = computed(() => {
  if (props.tint) return props.tint;
  let h = 0;
  for (const ch of props.name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return palette[h % palette.length];
});
</script>

<template>
  <div class="relative shrink-0 overflow-hidden rounded-[6px]" :style="{ width: `${size}px`, height: `${size}px`, background: bg }">
    <div
      class="absolute inset-[10%] bg-contain bg-center bg-no-repeat opacity-95"
      :style="{ backgroundImage: `url(${pieceUrl('w', role ?? 'p')})` }"
    />
  </div>
</template>
