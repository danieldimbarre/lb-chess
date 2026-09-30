<script setup lang="ts">
import { t } from '../i18n';
import { computed } from 'vue';
import Modal from './Modal.vue';
import Avatar from './Avatar.vue';
import Icon from './Icon.vue';
import type { Role } from '../chess/util';
import type { EndReason } from '../types';

interface Side {
  name: string;
  /** Small caption under the name, e.g. a bot level. */
  caption?: string | null;
  role?: Role;
  tint?: string;
  winner?: boolean;
}

const props = defineProps<{
  open: boolean;
  outcome: 'win' | 'loss' | 'draw' | 'aborted';
  reason: EndReason | string;
  me: Side;
  opponent: Side;
}>();
const emit = defineEmits<{ close: [] }>();

const title = computed(
  () => ({ win: t('result.win'), loss: t('result.loss', { name: props.opponent.name }), draw: t('result.draw'), aborted: t('result.aborted') })[props.outcome],
);

const subtitle = computed(() => t(`reason.${props.reason}`));

const headerClass = computed(() => ({
  win: 'bg-[linear-gradient(180deg,#81b64c,#5d9948)]',
  loss: 'bg-[linear-gradient(180deg,#5a5855,#403e3b)]',
  draw: 'bg-[linear-gradient(180deg,#7d7b78,#5a5855)]',
  aborted: 'bg-[linear-gradient(180deg,#5a5855,#403e3b)]',
})[props.outcome]);
</script>

<template>
  <Modal :open="open" @close="emit('close')">
    <div class="relative px-5 pb-4 pt-5 text-center text-white" :class="headerClass">
      <button class="absolute right-2 top-2 flex size-8 items-center justify-center rounded-full text-white/80" :aria-label="t('common.close')" @click="emit('close')"><Icon name="x" :size="18" :stroke="2.8" /></button>
      <div class="flex items-center justify-center gap-2 font-display text-[1.6rem] font-extrabold leading-tight">
        <svg v-if="outcome === 'win'" class="trophy size-7" viewBox="0 0 24 24" fill="#ffc234" stroke="#b8860b" stroke-width="1.2">
          <path d="M7 4h10v5a5 5 0 01-10 0V4zM12 14v4M8 21h8M17 5h3v2a3 3 0 01-3 3M7 5H4v2a3 3 0 003 3" />
        </svg>
        {{ title }}
      </div>
      <div class="mt-0.5 text-[0.9rem] font-semibold text-white/85">{{ subtitle }}</div>
    </div>

    <div class="flex items-start justify-center gap-6 px-5 py-5">
      <div v-for="(p, i) in [me, opponent]" :key="i" class="flex w-24 flex-col items-center gap-1.5">
        <div class="rounded-lg p-0.5" :class="p.winner ? 'bg-green' : 'bg-transparent'">
          <Avatar :name="p.name" :size="60" :role="p.role" :tint="p.tint" />
        </div>
        <div class="w-full truncate text-center text-[0.86rem] font-bold">{{ p.name }}</div>
        <div v-if="p.caption" class="text-[0.8rem] font-semibold text-muted">{{ p.caption }}</div>
      </div>
      <div class="absolute left-1/2 mt-6 -translate-x-1/2 font-display text-sm font-extrabold text-muted">{{ t('result.vs') }}</div>
    </div>

    <div class="flex flex-col gap-3 px-5 pb-5">
      <slot />
    </div>
  </Modal>
</template>

<style scoped>
.trophy {
  animation: pop 520ms var(--ease-out) both;
}
@keyframes pop {
  from {
    transform: scale(0.6) rotate(-12deg);
    opacity: 0;
  }
}
</style>
