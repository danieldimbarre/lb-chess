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

export const errorText: Record<string, string> = {
  timeout: 'Server did not respond. Try again.',
  network: 'Connection problem.',
  rate_limited: 'Slow down a little.',
  no_passport: 'Character not loaded yet.',
  no_profile: 'Create your username first.',
  username_taken: 'That username is already taken.',
  username_invalid: 'Use 3-16 letters, numbers or _',
  already_registered: 'You already have a username.',
  in_game: 'You are already in a game.',
  not_found: 'Player not found.',
  offline: 'That player is offline.',
  self: 'You cannot challenge yourself.',
  busy: 'That player is busy in a game.',
  already_challenged: 'You already challenged this player.',
  expired: 'The challenge expired.',
  invalid_tc: 'Invalid time control.',
  illegal: 'Illegal move.',
  not_your_turn: 'Not your turn.',
  game_over: 'The game is over.',
  cannot_abort: 'Too late to abort.',
  server_error: 'Something went wrong.',
};

export function showError(error: string | undefined) {
  toast(errorText[error ?? ''] ?? 'Something went wrong.', 'error');
}
