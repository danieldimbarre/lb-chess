import { reactive, ref, watch } from 'vue';
import type { TimeControl } from '../types';
import { t } from '../i18n';

export interface TcCategory {
  id: 'bullet' | 'blitz' | 'rapid';
  /** Localised name (getter, so it follows the language setting). */
  readonly label: string;
  icon: string;
  color: string;
  items: TimeControl[];
  more: TimeControl[];
}

export const TC_CATEGORIES: TcCategory[] = [
  {
    id: 'bullet',
    get label() {
      return t('tc.bullet');
    },
    icon: 'bullet',
    color: '#e3aa24',
    items: [{ base: 60, inc: 0 }, { base: 60, inc: 1 }, { base: 120, inc: 1 }],
    more: [{ base: 30, inc: 0 }, { base: 20, inc: 1 }, { base: 120, inc: 0 }],
  },
  {
    id: 'blitz',
    get label() {
      return t('tc.blitz');
    },
    icon: 'bolt',
    color: '#fad541',
    items: [{ base: 180, inc: 0 }, { base: 180, inc: 2 }, { base: 300, inc: 0 }],
    more: [{ base: 300, inc: 2 }, { base: 300, inc: 5 }, { base: 180, inc: 1 }],
  },
  {
    id: 'rapid',
    get label() {
      return t('tc.rapid');
    },
    icon: 'clock',
    color: '#81b64c',
    items: [{ base: 600, inc: 0 }, { base: 900, inc: 10 }, { base: 1800, inc: 0 }],
    more: [{ base: 600, inc: 5 }, { base: 1200, inc: 0 }, { base: 3600, inc: 0 }],
  },
];

export function tcLabel(tc: TimeControl): string {
  const base = tc.base < 60 ? t('tc.sec', { n: tc.base }) : t('tc.min', { n: tc.base / 60 });
  if (!tc.inc) return base;
  return `${tc.base < 60 ? `${tc.base}s` : tc.base / 60} | ${tc.inc}`;
}

export function tcCategory(tc: TimeControl): TcCategory {
  const estimate = tc.base + 40 * tc.inc;
  if (estimate < 180) return TC_CATEGORIES[0];
  if (estimate < 600) return TC_CATEGORIES[1];
  return TC_CATEGORIES[2];
}

export const tcKey = (tc: TimeControl) => `${tc.base}+${tc.inc}`;
export const sameTc = (a?: TimeControl | null, b?: TimeControl | null) => !!a && !!b && a.base === b.base && a.inc === b.inc;

const KEY = 'lb-chess:prefs';

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return null;
}

/** Per-player preferences remembered between sessions. */
export const prefs = reactive<{ tc: TimeControl; botId: string; botColor: 'w' | 'b' | 'random'; botTc: TimeControl | null }>({
  tc: { base: 600, inc: 0 },
  botId: 'leo',
  botColor: 'random',
  botTc: null,
  ...(load() ?? {}),
});

watch(
  prefs,
  (p) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(p));
    } catch {
      /* ignore */
    }
  },
  { deep: true },
);

/** Time control picked on the challenge screen (separate from the quick-pairing one). */
export const challengeTc = ref<TimeControl>({ ...prefs.tc });
