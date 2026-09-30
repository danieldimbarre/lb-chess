import { te } from '../i18n';
import { reactive } from 'vue';

export interface Toast {
  id: number;
  text: string;
  kind: 'info' | 'error' | 'success';
}

let seq = 0;
export const toasts = reactive<Toast[]>([]);

export function toast(text: string, kind: Toast['kind'] = 'info', ms = 2600) {
  const id = seq++;
  toasts.push({ id, text, kind });
  if (toasts.length > 3) toasts.shift();
  setTimeout(() => {
    const i = toasts.findIndex((t) => t.id === id);
    if (i >= 0) toasts.splice(i, 1);
  }, ms);
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // CEF iframes often block the async clipboard API; fall back to execCommand.
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    ta.remove();
    return ok;
  }
}

export function showError(error: string | undefined) {
  toast(te(error), 'error');
}
