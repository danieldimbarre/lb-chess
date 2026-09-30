<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import TopBar from '../components/TopBar.vue';
import Avatar from '../components/Avatar.vue';
import Icon from '../components/Icon.vue';
import { request } from '../bridge/nui';
import { session, serverNow } from '../stores/session';
import { acceptChallenge, cancelChallenge, declineChallenge } from '../stores/online';
import { push } from '../stores/router';
import { challengeTc, tcLabel, tcCategory } from '../lib/timeControls';
import { showError, toast } from '../lib/toast';
import { pieceUrl } from '../chess/pieces';

const props = defineProps<{ username?: string }>();

const query = ref(props.username ?? '');
const results = ref<{ username: string; online: boolean; playing: boolean }[]>([]);
const selected = ref<{ username: string; online: boolean; playing: boolean } | null>(null);
const color = ref<'w' | 'random' | 'b'>('random');
const sending = ref(false);
let timer: number | undefined;
let seq = 0;

watch(
  query,
  (q) => {
    clearTimeout(timer);
    if (selected.value && selected.value.username !== q) selected.value = null;
    const trimmed = q.trim();
    if (!trimmed) return (results.value = []);
    const mine = ++seq;
    timer = window.setTimeout(async () => {
      const res = await request('search', { q: trimmed });
      if (mine !== seq || !res?.ok) return;
      results.value = res.players;
      const exact = res.players.find((p: { username: string }) => p.username.toLowerCase() === trimmed.toLowerCase());
      if (exact && props.username) selected.value = exact;
    }, 220);
  },
  { immediate: true },
);

function choose(p: (typeof results.value)[number]) {
  selected.value = p;
  query.value = p.username;
  results.value = [];
}

async function send() {
  const name = (selected.value?.username ?? query.value).trim();
  if (!name || sending.value) return;
  sending.value = true;
  const res = await request('challenge:send', { username: name, tc: challengeTc.value, color: color.value });
  sending.value = false;
  if (!res?.ok) return showError(res?.error);
  if (res.gameId) return; // crossed challenge auto-accepted, game:start push navigates
  toast(`Challenge sent to ${res.challenge.to.username}`, 'success');
  query.value = '';
  selected.value = null;
}

const now = ref(serverNow());
let tick: number | undefined;
onMounted(() => (tick = window.setInterval(() => (now.value = serverNow()), 500)));
onBeforeUnmount(() => {
  clearInterval(tick);
  clearTimeout(timer);
});
const left = (expiresAt: number) => Math.max(0, Math.ceil((expiresAt - now.value) / 1000));

const cat = computed(() => tcCategory(challengeTc.value));
const canSend = computed(() => !!(selected.value ?? query.value.trim()) && !sending.value && session.game?.status !== 'playing');
</script>

<template>
  <div class="flex h-full flex-col bg-bg pt-(--safe-top)">
    <TopBar title="Play a Friend" />

    <div class="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
      <!-- incoming -->
      <section v-if="session.incoming.length" class="mb-4">
        <div class="pb-2 text-[0.72rem] font-bold uppercase tracking-wider text-muted">Incoming</div>
        <TransitionGroup name="list" tag="div" class="flex flex-col gap-2">
          <div v-for="c in session.incoming" :key="c.id" class="card flex items-center gap-3 p-3">
            <Avatar :name="c.from.username" :size="40" />
            <div class="min-w-0 flex-1 leading-tight">
              <div class="truncate font-bold">{{ c.from.username }}</div>
              <div class="text-[0.8rem] font-semibold text-ink-2">{{ tcLabel(c.tc) }} · {{ left(c.expiresAt) }}s</div>
            </div>
            <button class="btn btn-secondary size-10 p-0!" aria-label="Decline" @click="declineChallenge(c)"><Icon name="x" :size="20" :stroke="2.8" /></button>
            <button class="btn btn-primary h-10 px-4" @click="acceptChallenge(c)">Accept</button>
          </div>
        </TransitionGroup>
      </section>

      <!-- new challenge -->
      <section class="card p-4">
        <div class="font-display text-[1.05rem] font-extrabold">New challenge</div>
        <div class="relative mt-3">
          <Icon name="search" :size="18" class="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input v-model="query" class="field pl-10!" placeholder="Search username" spellcheck="false" autocomplete="off" maxlength="16" />
          <div v-if="results.length && !selected" class="absolute inset-x-0 top-[calc(100%+6px)] z-10 overflow-hidden rounded-xl bg-surface-2 shadow-[0_12px_32px_rgba(0,0,0,.4)]">
            <button v-for="p in results" :key="p.username" class="hover-row flex w-full items-center gap-3 px-3 py-2.5 text-left" @click="choose(p)">
              <Avatar :name="p.username" :size="30" />
              <span class="flex-1 truncate font-semibold">{{ p.username }}</span>
              <span class="size-2 rounded-full" :class="p.playing ? 'bg-gold' : p.online ? 'bg-green' : 'bg-surface-3'" />
            </button>
          </div>
        </div>

        <Transition name="list">
          <div v-if="selected" class="mt-3 flex items-center gap-3 rounded-xl bg-surface-2 p-3">
            <Avatar :name="selected.username" :size="44" />
            <div class="min-w-0 flex-1 leading-tight">
              <div class="truncate font-bold">{{ selected.username }}</div>
              <div class="text-[0.8rem] font-semibold" :class="selected.playing ? 'text-gold' : selected.online ? 'text-green' : 'text-muted'">
                {{ selected.playing ? 'Playing a game' : selected.online ? 'Online' : 'Offline' }}
              </div>
            </div>
            <button class="tap text-[0.8rem] font-bold text-ink-2" @click="push('profile', { username: selected.username })">Profile</button>
          </div>
        </Transition>

        <button class="tap mt-3 flex w-full items-center gap-3 rounded-xl bg-surface-2 px-3 py-3 text-left" @click="push('timeControl', { target: 'challenge' })">
          <Icon :name="cat.icon" :style="{ color: cat.color }" />
          <span class="flex-1 font-display font-extrabold">{{ tcLabel(challengeTc) }}</span>
          <Icon name="next" :size="18" class="text-muted" />
        </button>

        <div class="mt-3 flex gap-2">
          <button
            v-for="c in (['w', 'random', 'b'] as const)"
            :key="c"
            class="tap flex h-12 flex-1 items-center justify-center rounded-lg"
            :class="color === c ? 'bg-surface-3 ring-2 ring-green' : 'bg-surface-2'"
            :aria-label="c === 'w' ? 'Play as white' : c === 'b' ? 'Play as black' : 'Random color'"
            @click="color = c"
          >
            <span v-if="c !== 'random'" class="size-8 bg-contain bg-no-repeat" :style="{ backgroundImage: `url(${pieceUrl(c, 'k')})` }" />
            <span v-else class="relative size-8">
              <span class="absolute inset-0 bg-contain bg-no-repeat [clip-path:inset(0_50%_0_0)]" :style="{ backgroundImage: `url(${pieceUrl('w', 'k')})` }" />
              <span class="absolute inset-0 bg-contain bg-no-repeat [clip-path:inset(0_0_0_50%)]" :style="{ backgroundImage: `url(${pieceUrl('b', 'k')})` }" />
            </span>
          </button>
        </div>

        <button class="btn btn-primary mt-4 h-13 w-full text-lg" :disabled="!canSend" @click="send">{{ sending ? 'Sending…' : 'Send Challenge' }}</button>
      </section>

      <!-- outgoing -->
      <section v-if="session.outgoing.length" class="mt-4">
        <div class="pb-2 text-[0.72rem] font-bold uppercase tracking-wider text-muted">Waiting for reply</div>
        <TransitionGroup name="list" tag="div" class="flex flex-col gap-2">
          <div v-for="c in session.outgoing" :key="c.id" class="card flex items-center gap-3 p-3">
            <Avatar :name="c.to.username" :size="40" />
            <div class="min-w-0 flex-1 leading-tight">
              <div class="truncate font-bold">{{ c.to.username }}</div>
              <div class="flex items-center gap-1.5 text-[0.8rem] font-semibold text-ink-2">
                <span class="size-3 rounded-full border-2 border-surface-3 border-t-green [animation:spin_800ms_linear_infinite]" />
                {{ tcLabel(c.tc) }} · {{ left(c.expiresAt) }}s
              </div>
            </div>
            <button class="btn btn-secondary h-10 px-3 text-sm" @click="cancelChallenge(c)">Cancel</button>
          </div>
        </TransitionGroup>
      </section>
    </div>
  </div>
</template>

<style scoped>
.list-enter-active {
  transition:
    opacity 220ms ease,
    transform 260ms var(--ease-out);
}
.list-leave-active {
  transition:
    opacity 150ms ease,
    transform 150ms ease;
}
.list-enter-from {
  opacity: 0;
  transform: translateY(6px);
}
.list-leave-to {
  opacity: 0;
  transform: scale(0.97);
}
</style>
