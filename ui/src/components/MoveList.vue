<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import type { MoveRecord } from '../types';
import { figurine } from '../chess/util';
import { settings } from '../stores/settings';

const props = defineProps<{ moves: MoveRecord[]; ply: number; startBlack?: boolean; startNumber?: number }>();
const emit = defineEmits<{ goto: [ply: number] }>();

const rows = computed(() => {
  const out: { num: number; items: { san: string; ply: number }[] }[] = [];
  let num = props.startNumber ?? 1;
  let i = 0;
  if (props.startBlack && props.moves.length) {
    out.push({ num, items: [{ san: '…', ply: -1 }, { san: props.moves[0].san, ply: 1 }] });
    i = 1;
    num++;
  }
  for (; i < props.moves.length; i += 2) {
    const items = [{ san: props.moves[i].san, ply: i + 1 }];
    if (props.moves[i + 1]) items.push({ san: props.moves[i + 1].san, ply: i + 2 });
    out.push({ num: num++, items });
  }
  return out;
});

const scroller = ref<HTMLElement>();
watch(
  () => [props.ply, props.moves.length],
  async () => {
    await nextTick();
    const s = scroller.value;
    if (!s) return;
    const el = s.querySelector<HTMLElement>('[data-active="true"]');
    if (el) s.scrollTo({ left: el.offsetLeft - s.clientWidth / 2 + el.clientWidth / 2, behavior: 'smooth' });
    else s.scrollTo({ left: 0 });
  },
  { immediate: true },
);

const fmt = (san: string) => (settings.figurine ? figurine(san) : san);
</script>

<template>
  <div ref="scroller" class="flex h-9 shrink-0 items-center gap-0.5 overflow-x-auto whitespace-nowrap bg-surface px-2 text-[0.86rem]">
    <span v-if="!moves.length" class="px-1 text-muted">Moves will appear here</span>
    <template v-for="row in rows" :key="row.num">
      <span class="pl-1.5 pr-0.5 font-semibold text-muted">{{ row.num }}.</span>
      <button
        v-for="it in row.items"
        :key="it.ply"
        :data-active="it.ply === ply"
        class="rounded-[4px] px-1.5 py-0.5 font-semibold"
        :class="it.ply === ply ? 'bg-surface-3 text-ink' : 'text-ink-2'"
        :disabled="it.ply < 0"
        @click="emit('goto', it.ply)"
      >
        {{ fmt(it.san) }}
      </button>
    </template>
  </div>
</template>
