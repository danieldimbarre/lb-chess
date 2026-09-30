import { reactive } from 'vue';
import type { Challenge, GameSnapshot, Profile, TimeControl } from '../types';

export const session = reactive({
  ready: false,
  me: null as Profile | null,
  /** serverTime - Date.now(), used to project server clocks locally. */
  offset: 0,
  game: null as GameSnapshot | null,
  queue: null as { tc: TimeControl; since: number } | null,
  incoming: [] as Challenge[],
  outgoing: [] as Challenge[],
});

export const serverNow = () => Date.now() + session.offset;
