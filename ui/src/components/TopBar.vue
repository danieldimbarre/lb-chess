<script setup lang="ts">
import { t } from '../i18n';
import Icon from './Icon.vue';
import { back } from '../stores/router';

defineProps<{ title: string; noBack?: boolean }>();
const emit = defineEmits<{ back: [] }>();

function onBack() {
  emit('back');
  back();
}
</script>

<template>
  <header class="flex h-12 shrink-0 items-center gap-1 px-2">
    <button v-if="!noBack" class="tap flex size-10 items-center justify-center rounded-full text-ink-2" :aria-label="t('common.back')" @click="onBack">
      <Icon name="back" :size="24" />
    </button>
    <h1 class="flex-1 truncate font-display text-[1.15rem] font-extrabold" :class="noBack ? 'pl-2' : ''">{{ title }}</h1>
    <slot />
  </header>
</template>
