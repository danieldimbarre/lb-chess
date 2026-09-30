<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { reset } from '../stores/router';
import { session } from '../stores/session';
import { bootstrap, installPushHandlers } from '../stores/online';
import { componentsReady } from '../bridge/nui';
import { asset } from '../lib/asset';

const failed = ref(false);

async function start() {
  failed.value = false;
  await componentsReady();
  installPushHandlers();
  const started = Date.now();
  const ok = await bootstrap();
  // Keep the splash up briefly so it doesn't flash.
  await new Promise((r) => setTimeout(r, Math.max(0, 450 - (Date.now() - started))));
  if (!ok) {
    failed.value = true;
    return;
  }
  if (!session.me) reset('onboarding');
  else if (session.game?.status === 'playing') reset('online');
  else if (session.queue) reset('searching');
  else reset('home');
}

onMounted(start);
</script>

<template>
  <div class="flex h-full flex-col items-center justify-center gap-5 bg-bg">
    <img :src="asset('icon.svg')" alt="" class="boot-logo size-20 rounded-[22px] shadow-[0_10px_30px_rgba(0,0,0,.35)]" />
    <div class="font-display text-2xl font-extrabold tracking-tight">Chess</div>
    <div v-if="!failed" class="mt-2 size-6 rounded-full border-[3px] border-surface-3 border-t-green [animation:spin_700ms_linear_infinite]" />
    <template v-else>
      <div class="text-sm text-muted">Could not reach the server.</div>
      <button class="btn btn-primary h-11 px-8" @click="start">Retry</button>
    </template>
  </div>
</template>

<style scoped>
.boot-logo {
  animation: rise 420ms var(--ease-out) both;
}
</style>
