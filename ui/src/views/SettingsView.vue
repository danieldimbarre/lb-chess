<script setup lang="ts">
import TopBar from '../components/TopBar.vue';
import TabBar from '../components/TabBar.vue';

defineProps<{ tab?: boolean }>();
import Toggle from '../components/Toggle.vue';
import Board from '../components/Board.vue';
import { settings, boardThemes, type BoardThemeId, type Settings } from '../stores/settings';
import { playSound } from '../chess/sounds';

const toggles: { key: keyof Settings; label: string; hint?: string }[] = [
  { key: 'showLegal', label: 'Show legal moves' },
  { key: 'coordinates', label: 'Show coordinates' },
  { key: 'highlightLast', label: 'Highlight last move' },
  { key: 'premoves', label: 'Enable premoves', hint: 'Queue moves during your opponent’s turn' },
  { key: 'autoQueen', label: 'Always promote to queen' },
  { key: 'figurine', label: 'Piece icons in notation' },
  { key: 'confirmResign', label: 'Confirm resign & draw' },
  { key: 'sounds', label: 'Sounds' },
];

const preview = 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3';

function setAnim(v: Settings['animation']) {
  settings.animation = v;
}

function setFlag(key: keyof Settings, value: boolean) {
  (settings as unknown as Record<string, boolean>)[key] = value;
  if (key === 'sounds' && value) playSound('move');
}
</script>

<template>
  <div class="flex h-full flex-col bg-bg pt-(--safe-top)">
    <TopBar title="Settings" :no-back="tab" />
    <div class="min-h-0 flex-1 overflow-y-auto" :class="tab ? '' : 'pb-(--safe-bottom)'">
      <div class="px-4 pb-2">
        <div class="overflow-hidden rounded-lg shadow-[0_6px_18px_rgba(0,0,0,.3)]">
          <Board :fen="preview" movable="none" :last-move="['e5', 'c6']" />
        </div>
      </div>

      <div class="px-4 pb-1 pt-3 text-[0.72rem] font-bold uppercase tracking-wider text-muted">Board</div>
      <div class="flex gap-2 overflow-x-auto px-4 pb-2 pt-1">
        <button
          v-for="(t, id) in boardThemes"
          :key="id"
          class="tap flex shrink-0 flex-col items-center gap-1.5"
          @click="settings.boardTheme = id as BoardThemeId"
        >
          <span
            class="grid size-14 grid-cols-2 overflow-hidden rounded-lg ring-offset-2 ring-offset-bg"
            :class="settings.boardTheme === id ? 'ring-3 ring-green' : ''"
          >
            <span :style="{ background: t.light }" /><span :style="{ background: t.dark }" />
            <span :style="{ background: t.dark }" /><span :style="{ background: t.light }" />
          </span>
          <span class="text-[0.72rem] font-semibold" :class="settings.boardTheme === id ? 'text-ink' : 'text-muted'">{{ t.name }}</span>
        </button>
      </div>

      <div class="px-4 pb-1 pt-3 text-[0.72rem] font-bold uppercase tracking-wider text-muted">Piece animation</div>
      <div class="mx-4 flex overflow-hidden rounded-xl bg-surface p-1 text-sm font-bold">
        <button
          v-for="opt in (['none', 'fast', 'normal'] as const)"
          :key="opt"
          class="flex-1 rounded-lg py-2 capitalize transition-colors duration-150"
          :class="settings.animation === opt ? 'bg-surface-3 text-ink' : 'text-muted'"
          @click="setAnim(opt)"
        >
          {{ opt === 'none' ? 'Off' : opt }}
        </button>
      </div>

      <div class="px-4 pb-1 pt-4 text-[0.72rem] font-bold uppercase tracking-wider text-muted">Gameplay</div>
      <div class="mx-4 mb-6 overflow-hidden rounded-xl bg-surface">
        <label v-for="t in toggles" :key="t.key" class="flex items-center gap-3 border-b border-line px-4 py-3 last:border-0">
          <span class="flex-1">
            <span class="block font-semibold">{{ t.label }}</span>
            <span v-if="t.hint" class="block text-[0.76rem] text-muted">{{ t.hint }}</span>
          </span>
          <Toggle :model-value="!!settings[t.key]" @update:model-value="(v: boolean) => setFlag(t.key, v)" />
        </label>
      </div>
    </div>
    <TabBar v-if="tab" />
  </div>
</template>
