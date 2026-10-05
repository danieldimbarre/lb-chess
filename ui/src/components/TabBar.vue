<script setup lang="ts">
import Icon from './Icon.vue';
import { t as tr } from '../i18n';
import { current, reset, type RouteName } from '../stores/router';
import { computed } from 'vue';
import { openSeeks } from '../stores/session';

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
      class="tap flex h-14 flex-1 flex-col items-center justify-center gap-1 text-[0.68rem] font-semibold"
      :class="active === t.name ? 'text-ink' : 'text-muted'"
      @click="go(t.name)"
    >
      <span class="relative">
        <Icon :name="t.icon" :size="26" :stroke="active === t.name ? 2.4 : 1.9" />
        <!-- Someone is waiting for a game: pull the player back to the Play tab. -->
        <span v-if="t.name === 'home' && active !== 'home' && openSeeks.length" class="absolute -right-0.5 top-0 size-2.5 rounded-full bg-green ring-2 ring-surface" />
      </span>
      {{ tr(t.label) }}
    </button>
  </nav>
</template>
