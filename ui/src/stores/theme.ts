import { ref } from 'vue';
import { phoneTheme, onPhoneThemeChange } from '../bridge/nui';

export const theme = ref<'dark' | 'light'>('dark');

function apply(t: 'dark' | 'light') {
  theme.value = t;
  document.documentElement.dataset.theme = t;
}

export async function initTheme() {
  apply(await phoneTheme());
  onPhoneThemeChange(apply);
}
