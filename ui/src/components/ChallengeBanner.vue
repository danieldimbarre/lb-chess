<script setup lang="ts">
import { t } from '../i18n';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import Avatar from './Avatar.vue';
import { session, serverNow } from '../stores/session';
import { acceptChallenge, declineChallenge } from '../stores/online';
import { current } from '../stores/router';
import { tcLabel, tcCategory } from '../lib/timeControls';
import Icon from './Icon.vue';

const now = ref(serverNow());
let tick: number | undefined;
onMounted(() => (tick = window.setInterval(() => (now.value = serverNow()), 250)));
onBeforeUnmount(() => clearInterval(tick));

// Rematch offers are handled inside the game screen; don't interrupt onboarding.
const challenge = computed(() => {
  const route = current().name;
  if (route === 'onboarding' || route === 'boot') return null;
  if (session.game?.status === 'playing') return null;
  return session.incoming.find((c) => !(c.rematchOf && route === 'online' && session.game?.id === c.rematchOf) && c.expiresAt > now.value) ?? null;
});

const secondsLeft = computed(() => (challenge.value ? Math.max(0, Math.ceil((challenge.value.expiresAt - now.value) / 1000)) : 0));
const progress = computed(() => (challenge.value ? Math.max(0, (challenge.value.expiresAt - now.value) / 60000) : 0));
</script>

<template>
  <Transition name="banner">
    <div v-if="challenge" :key="challenge.id" class="absolute inset-x-3 top-[calc(var(--safe-top)+6px)] z-[70] overflow-hidden rounded-2xl bg-surface-2 shadow-[0_14px_40px_rgba(0,0,0,.45)] ring-1 ring-line">
      <div class="flex items-center gap-3 p-3">
        <Avatar :name="challenge.from.username" :size="42" />
        <div class="min-w-0 flex-1 leading-tight">
          <div class="truncate text-[0.95rem] font-bold">
            {{ challenge.from.username }}
          </div>
          <div class="mt-0.5 flex items-center gap-1 whitespace-nowrap text-[0.78rem] font-semibold text-ink-2">
            <Icon :name="tcCategory(challenge.tc).icon" :size="14" :style="{ color: tcCategory(challenge.tc).color }" />
            {{ challenge.rematchOf ? t('challenge.bannerRematch') : t('challenge.banner') }} · {{ tcLabel(challenge.tc) }} · {{ secondsLeft }}s
          </div>
        </div>
        <button class="btn btn-secondary h-10 w-10 shrink-0 p-0!" :aria-label="t('common.decline')" @click="declineChallenge(challenge)">
          <Icon name="x" :size="20" :stroke="2.8" />
        </button>
        <button class="btn btn-primary h-10 shrink-0 px-4 text-[0.95rem]" @click="acceptChallenge(challenge)">{{ t('common.accept') }}</button>
      </div>
      <div class="h-[3px] bg-green transition-[width] duration-300 ease-linear" :style="{ width: `${Math.min(1, progress) * 100}%` }" />
    </div>
  </Transition>
</template>

<style scoped>
.banner-enter-active {
  transition:
    transform 340ms var(--ease-drawer),
    opacity 200ms ease;
}
.banner-leave-active {
  transition:
    transform 200ms var(--ease-out),
    opacity 160ms ease;
}
.banner-enter-from,
.banner-leave-to {
  transform: translateY(-120%);
  opacity: 0;
}
</style>
