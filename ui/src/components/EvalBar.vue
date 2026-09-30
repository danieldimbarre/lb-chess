<script setup lang="ts">
import { computed } from 'vue';
import type { Color } from '../types';

const props = defineProps<{ cp: number; mate: number | null; orientation: Color }>();

// Map centipawns to white's share of the bar (sigmoid like chess.com, clamped).
const whiteShare = computed(() => {
  if (props.mate !== null) return props.mate > 0 ? 100 : props.mate < 0 ? 0 : 50;
  if (Math.abs(props.cp) >= 10000) return props.cp > 0 ? 100 : 0;
  const x = props.cp / 100;
  const s = 50 + 50 * (2 / (1 + Math.exp(-0.45 * x)) - 1);
  return Math.max(4, Math.min(96, s));
});

const label = computed(() => {
  if (props.mate !== null) return props.mate === 0 ? '#' : `M${Math.abs(props.mate)}`;
  // ±10000 marks a finished game (checkmate on the board).
  if (Math.abs(props.cp) >= 10000) return '#';
  const v = Math.abs(props.cp / 100);
  return v >= 10 ? v.toFixed(0) : v.toFixed(1);
});
const whiteAhead = computed(() => (props.mate !== null ? props.mate > 0 : props.cp >= 0));
</script>

<template>
  <div class="relative w-[14px] shrink-0 overflow-hidden rounded-[3px] bg-[#403d39]" :class="orientation === 'b' ? 'rotate-180' : ''">
    <div class="absolute inset-x-0 bottom-0 bg-white transition-[height] duration-500 ease-(--ease-out)" :style="{ height: `${whiteShare}%` }" />
    <span
      class="absolute inset-x-0 text-center text-[8px] font-extrabold leading-none"
      :class="[whiteAhead ? 'bottom-1 text-[#403d39]' : 'top-1 text-white', orientation === 'b' ? 'rotate-180' : '']"
    >
      {{ label }}
    </span>
  </div>
</template>
