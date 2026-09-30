import { reactive, watch } from 'vue';

export type BoardThemeId = 'green' | 'brown' | 'blue' | 'purple' | 'grey' | 'walnut';

export interface Settings {
  /** 'phone' follows the LB Phone setting. */
  themeMode: 'phone' | 'dark' | 'light';
  language: 'phone' | 'en' | 'pt';
  boardTheme: BoardThemeId;
  showLegal: boolean;
  coordinates: boolean;
  sounds: boolean;
  premoves: boolean;
  autoQueen: boolean;
  animation: 'none' | 'fast' | 'normal';
  highlightLast: boolean;
  figurine: boolean;
  confirmResign: boolean;
}

export const boardThemes: Record<BoardThemeId, { name: string; light: string; dark: string }> = {
  green: { name: 'Green', light: '#ebecd0', dark: '#739552' },
  brown: { name: 'Brown', light: '#f0d9b5', dark: '#b58863' },
  blue: { name: 'Icy Sea', light: '#dee3e6', dark: '#8ca2ad' },
  purple: { name: 'Purple', light: '#efefef', dark: '#8877b7' },
  grey: { name: 'Tournament', light: '#e6e6e6', dark: '#8c8c8c' },
  walnut: { name: 'Walnut', light: '#e8cfa5', dark: '#a9794d' },
};

const defaults: Settings = {
  themeMode: 'phone',
  language: 'phone',
  boardTheme: 'green',
  showLegal: true,
  coordinates: true,
  sounds: true,
  premoves: true,
  autoQueen: false,
  animation: 'fast',
  highlightLast: true,
  figurine: true,
  confirmResign: true,
};

const KEY = 'lb-chess:settings';

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...defaults, ...JSON.parse(raw) };
  } catch {
    /* storage unavailable */
  }
  return { ...defaults };
}

export const settings = reactive<Settings>(load());

watch(
  settings,
  (s) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch {
      /* storage unavailable */
    }
  },
  { deep: true },
);

export function animationMs(): number {
  return settings.animation === 'none' ? 0 : settings.animation === 'fast' ? 120 : 200;
}
