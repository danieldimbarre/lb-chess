import { computed, reactive } from 'vue';
import type { Challenge, GameSnapshot, Lobby, Profile, TimeControl } from '../types';

export const session = reactive({
  ready: false,
  me: null as Profile | null,
  /** serverTime - Date.now(), used to project server clocks locally. */
  offset: 0,
  game: null as GameSnapshot | null,
  queue: null as { tc: TimeControl; since: number } | null,
  /** How many players the server pinged on their phone when this search started. */
  notified: 0,
  incoming: [] as Challenge[],
  outgoing: [] as Challenge[],
  lobby: { seeks: [], players: 0 } as Lobby,
});

export const serverNow = () => Date.now() + session.offset;

/** Other players waiting for a game right now, longest wait first. */
export const openSeeks = computed(() => session.lobby.seeks.filter((s) => s.username !== session.me?.username));

/** How many players are waiting in exactly this time control. */
export const waitingIn = (tc: TimeControl) => openSeeks.value.filter((s) => s.tc.base === tc.base && s.tc.inc === tc.inc).length;
