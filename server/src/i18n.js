/** Server-side strings (phone notifications). Keep in sync with the UI locales: en + pt. */
const MESSAGES = {
  en: {
    title: 'Chess',
    challenge: '{name} challenged you ({tc})',
    rematch: '{name} wants a rematch',
    gameWhite: 'Game on! You play White vs {name}',
    gameBlack: 'Game on! You play Black vs {name}',
    seek: '{name} is looking for a game ({tc}). Tap to play',
    min: '{n} min',
    sec: '{n} sec',
  },
  pt: {
    title: 'Xadrez',
    challenge: '{name} te desafiou ({tc})',
    rematch: '{name} quer uma revanche',
    gameWhite: 'Partida iniciada! Você joga de Brancas contra {name}',
    gameBlack: 'Partida iniciada! Você joga de Pretas contra {name}',
    seek: '{name} está procurando partida ({tc}). Toque para jogar',
    min: '{n} min',
    sec: '{n} s',
  },
};

/** Maps any locale string ("pt-br", "pt", "en-US"...) to a supported one, or null. */
export function toLocale(value) {
  const v = String(value ?? '').toLowerCase();
  if (v.startsWith('pt')) return 'pt';
  if (v.startsWith('en')) return 'en';
  return null;
}

export function msg(locale, key, params = {}) {
  const text = (MESSAGES[locale] ?? MESSAGES.en)[key] ?? MESSAGES.en[key] ?? key;
  return text.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? ''));
}

export function tcText(locale, tc) {
  const base = tc.base < 60 ? msg(locale, 'sec', { n: tc.base }) : msg(locale, 'min', { n: tc.base / 60 });
  return tc.inc ? `${tc.base < 60 ? `${tc.base}s` : tc.base / 60} | ${tc.inc}` : base;
}
