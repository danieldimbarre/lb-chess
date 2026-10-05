<script setup lang="ts">
import { t } from '../i18n';
import TopBar from '../components/TopBar.vue';
import TabBar from '../components/TabBar.vue';
import Toggle from '../components/Toggle.vue';
import Board from '../components/Board.vue';
import Icon from '../components/Icon.vue';
import { settings, boardThemes, type BoardThemeId, type Settings } from '../stores/settings';
import { playSound } from '../chess/sounds';

defineProps<{ tab?: boolean }>();

const toggles: { key: keyof Settings; label: string; hint?: string }[] = [
  { key: 'showLegal', label: 'settings.showLegal' },
  { key: 'coordinates', label: 'settings.coordinates' },
  { key: 'highlightLast', label: 'settings.highlightLast' },
  { key: 'premoves', label: 'settings.premoves', hint: 'settings.premovesHint' },
  { key: 'autoQueen', label: 'settings.autoQueen' },
  { key: 'figurine', label: 'settings.figurine' },
  { key: 'confirmResign', label: 'settings.confirmResign' },
  { key: 'sounds', label: 'settings.sounds' },
];

const themeModes: { id: Settings['themeMode']; label: string; icon: string }[] = [
  { id: 'phone', label: 'settings.followPhone', icon: 'phone' },
  { id: 'dark', label: 'settings.dark', icon: 'moon' },
  { id: 'light', label: 'settings.light', icon: 'sun' },
];

// Language names are always shown in their own language.
const languages: { id: Settings['language']; label: string }[] = [
  { id: 'phone', label: '' },
  { id: 'en', label: 'English' },
  { id: 'pt', label: 'Português' },
];

const animations: { id: Settings['animation']; label: string }[] = [
  { id: 'none', label: 'settings.animOff' },
  { id: 'fast', label: 'settings.animFast' },
  { id: 'normal', label: 'settings.animNormal' },
];

const preview = 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3';

function setFlag(key: keyof Settings, value: boolean) {
  (settings as unknown as Record<string, boolean>)[key] = value;
  if (key === 'sounds' && value) playSound('move');
}
</script>

<template>
  <div class="flex h-full flex-col bg-bg pt-(--safe-top)">
    <TopBar :title="t('settings.title')" :no-back="tab" />
    <div class="min-h-0 flex-1 overflow-y-auto" :class="tab ? '' : 'pb-(--safe-bottom)'">
      <div class="px-4 pb-2">
        <div class="mx-auto max-w-[240px] overflow-hidden rounded-lg shadow-[0_6px_18px_rgba(0,0,0,.3)]">
          <Board :fen="preview" movable="none" :last-move="['e5', 'c6']" />
        </div>
      </div>

      <div class="section-title">{{ t('settings.appearance') }}</div>
      <div class="mx-4 overflow-hidden rounded-xl bg-surface">
        <div class="border-b border-line px-4 py-3">
          <div class="mb-2 font-semibold">{{ t('settings.theme') }}</div>
          <div class="segmented">
            <button v-for="m in themeModes" :key="m.id" :class="{ on: settings.themeMode === m.id }" @click="settings.themeMode = m.id">
              <Icon :name="m.icon" :size="16" />
              {{ t(m.label) }}
            </button>
          </div>
        </div>
        <div class="px-4 py-3">
          <div class="mb-2 font-semibold">{{ t('settings.language') }}</div>
          <div class="segmented">
            <button v-for="l in languages" :key="l.id" :class="{ on: settings.language === l.id }" @click="settings.language = l.id">
              <Icon v-if="l.id === 'phone'" name="phone" :size="16" />
              {{ l.id === 'phone' ? t('settings.followPhone') : l.label }}
            </button>
          </div>
        </div>
      </div>

      <div class="section-title">{{ t('settings.board') }}</div>
      <div class="flex gap-2 overflow-x-auto px-4 pb-2 pt-1">
        <button
          v-for="(theme, id) in boardThemes"
          :key="id"
          class="tap flex shrink-0 flex-col items-center gap-1.5"
          @click="settings.boardTheme = id as BoardThemeId"
        >
          <span
            class="grid size-14 grid-cols-2 overflow-hidden rounded-lg ring-offset-2 ring-offset-bg"
            :class="settings.boardTheme === id ? 'ring-3 ring-green' : ''"
          >
            <span :style="{ background: theme.light }" /><span :style="{ background: theme.dark }" />
            <span :style="{ background: theme.dark }" /><span :style="{ background: theme.light }" />
          </span>
          <span class="text-[0.72rem] font-semibold" :class="settings.boardTheme === id ? 'text-ink' : 'text-muted'">{{ t(`themes.${id}`) }}</span>
        </button>
      </div>

      <div class="section-title">{{ t('settings.animation') }}</div>
      <div class="segmented mx-4">
        <button v-for="a in animations" :key="a.id" :class="{ on: settings.animation === a.id }" @click="settings.animation = a.id">
          {{ t(a.label) }}
        </button>
      </div>

      <div class="section-title">{{ t('settings.gameplay') }}</div>
      <div class="mx-4 mb-6 overflow-hidden rounded-xl bg-surface">
        <label v-for="item in toggles" :key="item.key" class="flex items-center gap-3 border-b border-line px-4 py-3 last:border-0">
          <span class="flex-1">
            <span class="block font-semibold">{{ t(item.label) }}</span>
            <span v-if="item.hint" class="block text-[0.76rem] text-muted">{{ t(item.hint) }}</span>
          </span>
          <Toggle :model-value="!!settings[item.key]" @update:model-value="(v: boolean) => setFlag(item.key, v)" />
        </label>
      </div>

      <div class="section-title">{{ t('settings.notifications') }}</div>
      <div class="mx-4 mb-6 overflow-hidden rounded-xl bg-surface">
        <label class="flex items-center gap-3 px-4 py-3">
          <span class="flex-1">
            <span class="block font-semibold">{{ t('settings.notifySeeks') }}</span>
            <span class="block text-[0.76rem] text-muted">{{ t('settings.notifySeeksHint') }}</span>
          </span>
          <Toggle v-model="settings.notifySeeks" />
        </label>
      </div>
    </div>
    <TabBar v-if="tab" />
  </div>
</template>

<style scoped>
.section-title {
  padding: 1rem 1rem 0.35rem;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--c-muted);
}
.segmented {
  display: flex;
  gap: 0.25rem;
  padding: 0.25rem;
  border-radius: 0.75rem;
  background: var(--c-surface-2);
}
.mx-4.segmented {
  background: var(--c-surface);
}
.segmented button {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  min-width: 0;
  padding: 0.5rem 0.25rem;
  border-radius: 0.55rem;
  font-size: 0.84rem;
  font-weight: 700;
  color: var(--c-muted);
  white-space: nowrap;
  transition:
    background-color 150ms ease,
    color 150ms ease;
}
.segmented button.on {
  background: var(--c-surface-3);
  color: var(--c-ink);
}
</style>
