import { computed, ref, type ComputedRef } from 'vue';
import { applyLoose, parsePlacement, placementToFen } from './util';
import { playSound } from './sounds';
import { settings } from '../stores/settings';

export interface Premove {
  from: string;
  to: string;
  promotion?: string;
}

/**
 * chess.com style premove queue: moves made during the opponent's turn are shown on
 * a virtual board (red squares) and fire one by one as soon as they become legal.
 */
export function usePremoves(headFen: ComputedRef<string>, dests: ComputedRef<Record<string, string[]>>) {
  const queue = ref<Premove[]>([]);

  const displayFen = computed(() => {
    if (!queue.value.length) return headFen.value;
    let board = parsePlacement(headFen.value);
    for (const p of queue.value) board = applyLoose(board, p.from, p.to, p.promotion);
    const rest = headFen.value.split(' ').slice(1).join(' ');
    return `${placementToFen(board)} ${rest}`;
  });

  const squares = computed(() => queue.value.flatMap((p) => [p.from, p.to]));

  function add(p: Premove) {
    if (!settings.premoves || queue.value.length >= 12) return;
    queue.value.push(p);
    playSound('premove');
  }

  function clear() {
    queue.value = [];
  }

  /** Call when it becomes the player's turn: returns the next premove if it is legal now, else clears the queue. */
  function take(): Premove | null {
    const next = queue.value[0];
    if (!next) return null;
    if (!dests.value[next.from]?.includes(next.to)) {
      clear();
      return null;
    }
    queue.value = queue.value.slice(1);
    return next;
  }

  return { queue, displayFen, squares, add, clear, take };
}
