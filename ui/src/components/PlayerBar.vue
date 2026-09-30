<script setup lang="ts">
import { computed } from 'vue';
import Avatar from './Avatar.vue';
import Clock from './Clock.vue';
import { pieceUrl } from '../chess/pieces';
import type { Role } from '../chess/util';
import type { Color } from '../types';

const props = defineProps<{
  name: string;
  rating?: number | null;
  /** Colour this player plays; captured icons show the opponent's colour. */
  color: Color;
  captured: Role[];
  diff: number;
  clock?: number | null;
  clockActive?: boolean;
  avatarRole?: Role;
  avatarTint?: string;
  status?: string | null;
  thinking?: boolean;
}>();

const groups = computed(() => {
  const order: Role[] = ['p', 'n', 'b', 'r', 'q'];
  return order.map((r) => props.captured.filter((c) => c === r)).filter((g) => g.length);
});
const opp = computed<Color>(() => (props.color === 'w' ? 'b' : 'w'));
</script>

<template>
  <div class="flex h-[3.2rem] items-center gap-2.5 px-3">
    <Avatar :name="name" :size="38" :role="avatarRole" :tint="avatarTint" />
    <div class="min-w-0 flex-1 leading-tight">
      <div class="flex items-center gap-1.5 truncate text-[0.92rem] font-semibold">
        <span class="truncate">{{ name }}</span>
        <span v-if="rating" class="font-normal text-muted">({{ rating }})</span>
        <span v-if="thinking" class="thinking ml-0.5 inline-flex gap-0.5"><i /><i /><i /></span>
      </div>
      <div class="flex h-[18px] items-center">
        <span v-if="status" class="text-[0.72rem] font-semibold text-gold">{{ status }}</span>
        <template v-else>
          <span v-for="(g, i) in groups" :key="i" class="mr-1 flex">
            <span
              v-for="(r, j) in g"
              :key="j"
              class="-mr-[9px] size-[18px] bg-contain bg-no-repeat last:mr-0"
              :style="{ backgroundImage: `url(${pieceUrl(opp, r)})` }"
            />
          </span>
          <span v-if="diff > 0" class="ml-1 text-[0.72rem] font-semibold text-muted">+{{ diff }}</span>
        </template>
      </div>
    </div>
    <Clock v-if="clock != null" :ms="clock" :active="!!clockActive" />
  </div>
</template>

<style scoped>
.thinking i {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--c-muted);
  animation: blink 1s infinite ease-in-out;
}
.thinking i:nth-child(2) {
  animation-delay: 0.15s;
}
.thinking i:nth-child(3) {
  animation-delay: 0.3s;
}
@keyframes blink {
  0%,
  80%,
  100% {
    opacity: 0.25;
  }
  40% {
    opacity: 1;
  }
}
</style>
