<script setup lang="ts">
import Icon from './Icon.vue';
import { t as tr } from '../i18n';
import { current, reset, type RouteName } from '../stores/router';
import { computed } from 'vue';

const tabs: { name: RouteName; label: string; icon: string }[] = [
  { name: 'home', label: 'tabs.play', icon: 'home' },
  { name: 'leaderboard', label: 'tabs.leaders', icon: 'trophy' },
  { name: 'profile', label: 'tabs.profile', icon: 'user' },
  { name: 'settings', label: 'tabs.settings', icon: 'settings' },
];

const active = computed(() => current().name);

function go(name: RouteName) {
  if (active.value === name) return;
  reset(name, name === 'settings' ? { tab: true } : {});
}
</script>

<template>
  <nav class="flex shrink-0 border-t border-line bg-surface pb-(--safe-bottom)">
    <button
      v-for="t in tabs"
      :key="t.name"
      class="tap flex h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[0.66rem] font-bold transition-colors duration-150"
      :class="active === t.name ? 'text-ink' : 'text-muted'"
      @click="go(t.name)"
    >
      <Icon :name="t.icon" :size="22" :stroke="active === t.name ? 2.6 : 2" />
      {{ tr(t.label) }}
    </button>
  </nav>
</template>
