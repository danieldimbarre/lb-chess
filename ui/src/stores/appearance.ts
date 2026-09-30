import { reactive, watch } from 'vue';
import { phoneSettings, onPhoneSettings } from '../bridge/nui';
import { locale, toLocale } from '../i18n';
import { settings } from './settings';

/** Latest values reported by the phone. */
const phone = reactive<{ theme: 'dark' | 'light'; locale: string | null }>({ theme: 'dark', locale: null });

function apply() {
  const theme = settings.themeMode === 'phone' ? phone.theme : settings.themeMode;
  // Our own attribute: lb-phone writes data-theme on this document too, and must not override a manual choice.
  document.documentElement.dataset.appTheme = theme;
  locale.value = settings.language === 'phone' ? toLocale(phone.locale) : settings.language;
  document.documentElement.lang = locale.value === 'pt' ? 'pt-BR' : 'en';
}

export async function initAppearance() {
  const s = await phoneSettings();
  if (s.theme) phone.theme = s.theme;
  phone.locale = s.locale;
  apply();
  onPhoneSettings((next) => {
    if (next.theme) phone.theme = next.theme;
    if (next.locale) phone.locale = next.locale;
    apply();
  });
  watch(() => [settings.themeMode, settings.language], apply);
}
