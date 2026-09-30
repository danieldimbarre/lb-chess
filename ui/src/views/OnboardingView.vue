<script setup lang="ts">
import { t } from '../i18n';
import { computed, ref, watch } from 'vue';
import Board from '../components/Board.vue';
import Icon from '../components/Icon.vue';
import { request } from '../bridge/nui';
import { session } from '../stores/session';
import { reset } from '../stores/router';
import { showError } from '../lib/toast';
import { playSound } from '../chess/sounds';

const name = ref('');
const status = ref<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
const busy = ref(false);
let timer: number | undefined;
let seq = 0;

const VALID = /^[A-Za-z0-9_]{3,16}$/;

watch(name, (v) => {
  clearTimeout(timer);
  const trimmed = v.trim();
  if (!trimmed) return (status.value = 'idle');
  if (!VALID.test(trimmed)) return (status.value = 'invalid');
  status.value = 'checking';
  const mine = ++seq;
  timer = window.setTimeout(async () => {
    const res = await request('checkName', { username: trimmed });
    if (mine !== seq) return;
    status.value = res?.ok && res.available ? 'available' : res?.reason === 'username_invalid' ? 'invalid' : 'taken';
  }, 350);
});

const hint = computed(
  () =>
    ({
      idle: t('onboarding.rules'),
      checking: t('onboarding.checking'),
      available: t('onboarding.available'),
      taken: t('onboarding.taken'),
      invalid: t('onboarding.rules'),
    })[status.value],
);

async function submit() {
  if (status.value !== 'available' || busy.value) return;
  busy.value = true;
  const res = await request('register', { username: name.value.trim() });
  busy.value = false;
  if (!res?.ok) {
    if (res?.error === 'username_taken') status.value = 'taken';
    return showError(res?.error);
  }
  session.me = res.me;
  playSound('start');
  reset('home', {}, 'forward');
}

// Decorative position (Opera game, move 16) behind the title.
const heroFen = '1n1Rkb1r/p4ppp/4q3/4p1B1/4P3/8/PPP2PPP/2K5 b k - 1 17';
</script>

<template>
  <div class="relative flex h-full flex-col overflow-hidden bg-bg pt-(--safe-top) pb-(--safe-bottom)">
    <div class="hero pointer-events-none absolute inset-x-0 top-0 h-[58%] overflow-hidden">
      <div class="hero-board absolute left-1/2 top-[8%] w-[118%]">
        <Board :fen="heroFen" movable="none" :last-move="['d1', 'd8']" />
      </div>
      <div class="absolute inset-0 bg-[linear-gradient(180deg,rgba(48,46,43,.15)_0%,var(--c-bg)_92%)]" />
    </div>

    <div class="relative mt-auto px-6 pb-4">
      <div class="stagger">
        <div class="font-display text-[2.1rem] font-extrabold leading-[1.05] tracking-tight">
          {{ t('onboarding.title1') }}<br /><span class="text-green">{{ t('onboarding.title2') }}</span>
        </div>
        <p class="mt-3 text-[0.95rem] text-ink-2">{{ t('onboarding.intro') }}</p>

        <label class="mt-6 block">
          <span class="mb-2 block text-[0.78rem] font-bold uppercase tracking-wider text-muted">{{ t('onboarding.username') }}</span>
          <div class="relative">
            <input
              v-model="name"
              class="field pr-11 text-lg!"
              maxlength="16"
              :placeholder="t('onboarding.placeholder')"
              spellcheck="false"
              autocomplete="off"
              @keydown.enter="submit"
            />
            <span class="absolute right-3 top-1/2 -translate-y-1/2">
              <span v-if="status === 'checking'" class="block size-5 rounded-full border-[2.5px] border-surface-3 border-t-green [animation:spin_700ms_linear_infinite]" />
              <Icon v-else-if="status === 'available'" name="check" class="text-green" :size="22" :stroke="3" />
              <Icon v-else-if="status === 'taken' || status === 'invalid'" name="x" class="text-red" :size="22" :stroke="3" />
            </span>
          </div>
          <span
            class="mt-2 block text-[0.8rem] font-semibold"
            :class="status === 'available' ? 'text-green' : status === 'taken' || status === 'invalid' ? 'text-red' : 'text-muted'"
          >
            {{ hint }}
          </span>
        </label>

        <button class="btn btn-primary mt-6 h-14 w-full text-xl" :disabled="status !== 'available' || busy" @click="submit">
          {{ busy ? t('onboarding.creating') : t('onboarding.continue') }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hero-board {
  transform-origin: top center;
  transform: translateX(-50%) perspective(900px) rotateX(38deg) scale(0.95);
  opacity: 0.55;
  animation: drift 900ms var(--ease-out) both;
}
@keyframes drift {
  from {
    opacity: 0;
    transform: translateX(-50%) perspective(900px) rotateX(48deg) scale(0.9) translateY(-20px);
  }
}
@media (prefers-reduced-motion: reduce) {
  .hero-board {
    animation: none;
  }
}
</style>
