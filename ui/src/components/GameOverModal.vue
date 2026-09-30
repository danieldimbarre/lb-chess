<script setup lang="ts">
import { computed } from 'vue';
import Modal from './Modal.vue';
import Avatar from './Avatar.vue';
import type { Role } from '../chess/util';
import type { EndReason } from '../types';

interface Side {
  name: string;
  rating?: number | null;
  delta?: number | null;
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
  () => ({ win: 'You Won!', loss: `${props.opponent.name} Won`, draw: 'Draw', aborted: 'Game Aborted' })[props.outcome],
);

const reasons: Record<string, string> = {
  checkmate: 'by checkmate',
  resignation: 'by resignation',
  timeout: 'on time',
  stalemate: 'by stalemate',
  insufficient: 'by insufficient material',
  threefold: 'by repetition',
  fifty: 'by 50-move rule',
  agreement: 'by agreement',
  abandoned: 'by abandonment',
  aborted: 'nobody moved in time',
  timeout_insufficient: 'timeout vs insufficient material',
};
const subtitle = computed(() => reasons[props.reason] ?? props.reason);

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
      <button class="absolute right-2 top-2 flex size-8 items-center justify-center rounded-full text-white/80" aria-label="Close" @click="emit('close')">✕</button>
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
        <div v-if="p.rating" class="flex items-center gap-1 text-[0.8rem] font-semibold">
          <span class="text-ink-2">{{ p.rating }}</span>
          <span v-if="p.delta != null" :class="p.delta > 0 ? 'text-green' : p.delta < 0 ? 'text-red' : 'text-muted'">
            {{ p.delta > 0 ? `+${p.delta}` : p.delta }}
          </span>
        </div>
      </div>
      <div class="absolute left-1/2 mt-6 -translate-x-1/2 font-display text-sm font-extrabold text-muted">vs</div>
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
