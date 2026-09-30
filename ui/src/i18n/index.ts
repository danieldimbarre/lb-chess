import { ref } from 'vue';
import en from './en';
import pt from './pt';

export type Locale = 'en' | 'pt';

const dictionaries: Record<Locale, unknown> = { en, pt };

/** Active UI language; resolved from the phone (or the in-app override) by stores/appearance. */
export const locale = ref<Locale>('en');

/** Maps an LB Phone / browser locale ("pt-br", "pt-PT", "en-US"...) to a supported one. */
export function toLocale(value: string | undefined | null): Locale {
  return String(value ?? '')
    .toLowerCase()
    .startsWith('pt')
    ? 'pt'
    : 'en';
}

function lookup(dict: unknown, key: string): string | undefined {
  let node: unknown = dict;
  for (const part of key.split('.')) {
    if (!node || typeof node !== 'object') return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === 'string' ? node : undefined;
}

type Params = Record<string, string | number>;

const fill = (text: string, params?: Params) => (params ? text.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? '')) : text);

/**
 * Translates a dotted key. Falls back to English, then to the key itself.
 * Messages written as "one|other" pick the form from `params.n`.
 */
export function t(key: string, params?: Params): string {
  const text = lookup(dictionaries[locale.value], key) ?? lookup(en, key) ?? key;
  if (text.includes('|') && params && typeof params.n === 'number') {
    const [one, other] = text.split('|');
    return fill(params.n === 1 ? one : other, params);
  }
  return fill(text, params);
}

/** Translated server error code. */
export function te(code: string | undefined): string {
  const key = `errors.${code ?? 'unknown'}`;
  const text = t(key);
  return text === key ? t('errors.unknown') : text;
}
