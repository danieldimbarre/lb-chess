<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { router, views, current } from './stores/router';
import { initTheme } from './stores/theme';
import { componentsReady } from './bridge/nui';
import { preloadPieces } from './chess/pieces';
import Toasts from './components/Toasts.vue';

preloadPieces();

const route = computed(current);
const view = computed(() => views.get(route.value.name) ?? views.get('home'));

onMounted(async () => {
  await componentsReady();
  initTheme();
});
</script>

<template>
  <div class="relative h-full w-full overflow-hidden bg-bg">
    <Transition :name="`route-${router.direction}`">
      <component :is="view" :key="route.key" v-bind="route.props" class="absolute inset-0" />
    </Transition>
    <Toasts />
  </div>
</template>
