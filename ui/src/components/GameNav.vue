<script setup lang="ts">
import { t } from '../i18n';
import Icon from './Icon.vue';

const props = defineProps<{ ply: number; head: number }>();
const emit = defineEmits<{ goto: [ply: number] }>();

const go = (ply: number) => emit('goto', Math.max(0, Math.min(props.head, ply)));
</script>

<template>
  <nav class="flex h-14 shrink-0 items-stretch bg-surface px-1">
    <slot />
    <button class="tap flex flex-1 items-center justify-center text-ink-2 disabled:opacity-30" :disabled="ply === 0" :aria-label="t('game.first')" @click="go(0)">
      <Icon name="first" :size="22" />
    </button>
    <button class="tap flex flex-1 items-center justify-center text-ink disabled:opacity-30" :disabled="ply === 0" :aria-label="t('game.previous')" @click="go(ply - 1)">
      <Icon name="prev" :size="30" :stroke="2.6" />
    </button>
    <button class="tap flex flex-1 items-center justify-center text-ink disabled:opacity-30" :disabled="ply >= head" :aria-label="t('game.next')" @click="go(ply + 1)">
      <Icon name="next" :size="30" :stroke="2.6" />
    </button>
    <button class="tap flex flex-1 items-center justify-center text-ink-2 disabled:opacity-30" :disabled="ply >= head" :aria-label="t('game.last')" @click="go(head)">
      <Icon name="last" :size="22" />
    </button>
  </nav>
</template>
