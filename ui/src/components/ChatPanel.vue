<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue';
import Icon from './Icon.vue';
import { locale, t } from '../i18n';
import { request } from '../bridge/nui';
import { chat, nextUid } from '../stores/chat';
import { serverNow } from '../stores/session';
import { showError } from '../lib/toast';
import type { Color } from '../types';

const props = defineProps<{ gameId: string; me: Color; opponent: string }>();

const MAX = 200;
const draft = ref('');
const list = ref<HTMLElement>();
const quick = ['chat.q1', 'chat.q2', 'chat.q3', 'chat.q4'];

function toBottom() {
  nextTick(() => list.value?.scrollTo({ top: list.value.scrollHeight }));
}
onMounted(toBottom);
watch(() => chat.messages.length, toBottom);

async function send(text: string) {
  const body = text.trim();
  if (!body) return;
  draft.value = '';
  // Shown at once; replaced by the server's cleaned copy, or dropped if it was refused.
  const msg = { uid: nextUid(), from: props.me, text: body, at: serverNow(), pending: true };
  chat.messages.push(msg);
  const res = await request('game:chat', { id: props.gameId, action: 'send', text: body });
  const i = chat.messages.indexOf(msg);
  if (res?.ok) {
    if (i >= 0) chat.messages[i] = { uid: msg.uid, from: props.me, text: res.text, at: res.at };
  } else {
    if (i >= 0) chat.messages.splice(i, 1);
    if (!draft.value) draft.value = body;
    showError(res?.error);
  }
}

// The app's language, not the phone browser's (which is usually en-US inside FiveM).
const time = (at: number) => new Date(at).toLocaleTimeString(locale.value === 'pt' ? 'pt-BR' : 'en-US', { hour: '2-digit', minute: '2-digit' });
</script>

<template>
  <div class="flex h-[min(30rem,62vh)] flex-col px-4 pb-3">
    <div class="flex items-center gap-2 pb-2.5 pt-2">
      <Icon name="chat" :size="20" class="text-green" />
      <span class="flex-1 truncate font-display text-lg font-extrabold">{{ opponent }}</span>
    </div>

    <div ref="list" class="min-h-0 flex-1 overflow-y-auto rounded-xl bg-bg p-2.5">
      <div v-if="!chat.messages.length" class="flex h-full items-center justify-center text-[0.88rem] font-semibold text-muted">
        {{ t('chat.empty', { name: opponent }) }}
      </div>
      <TransitionGroup v-else tag="div" name="bubble" class="flex flex-col gap-1.5">
        <template v-for="m in chat.messages" :key="m.uid">
        <div v-if="m.system" class="my-1 flex items-center gap-2 text-[0.7rem] font-bold uppercase tracking-wider text-muted">
          <span class="h-px flex-1 bg-line" />{{ t('chat.newGame') }}<span class="h-px flex-1 bg-line" />
        </div>
        <div
          v-else
          class="flex max-w-[82%] flex-col"
          :class="m.from === me ? 'items-end self-end' : 'items-start self-start'"
        >
          <span
            class="rounded-2xl px-3 py-1.5 text-[0.92rem] leading-snug break-words [overflow-wrap:anywhere]"
            :class="[m.from === me ? 'rounded-br-md bg-green text-white' : 'rounded-bl-md bg-surface-2 text-ink', m.pending ? 'opacity-60' : '']"
            >{{ m.text }}</span
          >
          <span class="px-1 pt-0.5 text-[0.62rem] font-semibold tabular-nums text-muted">{{ time(m.at) }}</span>
        </div>
        </template>
      </TransitionGroup>
    </div>

    <div class="flex gap-1.5 overflow-x-auto py-2">
      <button v-for="q in quick" :key="q" class="tap shrink-0 rounded-full bg-surface-2 px-3 py-1.5 text-[0.8rem] font-bold text-ink-2" @click="send(t(q))">
        {{ t(q) }}
      </button>
    </div>

    <form class="flex items-center gap-2" @submit.prevent="send(draft)">
      <input
        v-model="draft"
        :maxlength="MAX"
        :placeholder="t('chat.placeholder')"
        :aria-label="t('chat.placeholder')"
        enterkeyhint="send"
        class="h-11 min-w-0 flex-1 rounded-xl bg-surface-2 px-3.5 text-[0.95rem] text-ink placeholder:text-muted"
      />
      <button type="submit" class="btn btn-primary size-11 shrink-0 p-0" :disabled="!draft.trim()" :aria-label="t('chat.send')">
        <Icon name="send" :size="19" />
      </button>
    </form>
  </div>
</template>

<style scoped>
.bubble-enter-active {
  transition:
    transform 200ms var(--ease-out),
    opacity 160ms ease;
}
.bubble-enter-from {
  opacity: 0;
  transform: translateY(6px) scale(0.97);
}
@media (prefers-reduced-motion: reduce) {
  .bubble-enter-active {
    transition: none;
  }
}
</style>
