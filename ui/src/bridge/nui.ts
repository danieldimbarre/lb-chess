/**
 * Transport between the app iframe and the game.
 *
 * Inside LB Phone the app lives at https://cfx-nui-<resource>/ui/dist/index.html.
 * Requests go through the client Lua relay ("req" NUI callback) to the server,
 * pushes arrive as window messages `{ action, data }` sent with SendCustomAppMessage.
 * Outside the phone (vite dev) a local mock server answers instead.
 */
type PushHandler = (data: any) => void;

const host = location.hostname;
export const inPhone = host.startsWith('cfx-nui-');
export const resourceName = inPhone ? host.slice('cfx-nui-'.length) : 'lb-chess';

const pushHandlers = new Map<string, Set<PushHandler>>();

window.addEventListener('message', (event) => {
  const msg = event.data;
  if (!msg || typeof msg !== 'object' || typeof msg.action !== 'string') return;
  pushHandlers.get(msg.action)?.forEach((cb) => cb(msg.data));
});

export function onPush(action: string, cb: PushHandler): () => void {
  let set = pushHandlers.get(action);
  if (!set) pushHandlers.set(action, (set = new Set()));
  set.add(cb);
  return () => set!.delete(cb);
}

let mock: { request(name: string, data: unknown): Promise<any> } | null = null;

async function getMock() {
  // The mock (server core + simulated players) only exists in `vite dev`; production builds drop it.
  if (!import.meta.env.DEV) return { request: async () => ({ ok: false, error: 'network' }) };
  if (!mock) mock = (await import('./mock')).createMock((action, data) => window.postMessage({ action, data }, '*'));
  return mock;
}

export async function request<T = any>(name: string, data: Record<string, unknown> = {}): Promise<T> {
  if (!inPhone) return (await getMock()).request(name, data);

  try {
    const res = await fetch(`https://${resourceName}/req`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify({ name, data }),
    });
    return (await res.json()) as T;
  } catch {
    return { ok: false, error: 'network' } as T;
  }
}

/** Resolves once LB Phone injected its globals (components.js), or after a short timeout. */
export function componentsReady(): Promise<void> {
  if (!inPhone || (globalThis as any).componentsLoaded) return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => {
      window.removeEventListener('message', onMsg);
      resolve();
    };
    const onMsg = (e: MessageEvent) => e.data === 'componentsLoaded' && done();
    window.addEventListener('message', onMsg);
    setTimeout(done, 1500);
  });
}

/** LB Phone globals are capitalised (GetSettings, OnSettingsChange...); older builds used camelCase. */
function phoneFn(name: string): ((...args: any[]) => any) | null {
  const g = globalThis as any;
  const fn = g[name] ?? g[name[0].toLowerCase() + name.slice(1)];
  return typeof fn === 'function' ? fn : null;
}

export interface PhoneSettings {
  theme: 'dark' | 'light' | null;
  locale: string | null;
}

function pick(raw: any): PhoneSettings {
  const theme = raw?.display?.theme;
  return {
    theme: theme === 'light' || theme === 'dark' ? theme : null,
    locale: typeof raw?.locale === 'string' ? raw.locale : null,
  };
}

/** Phone theme and language. Outside the phone, falls back to the browser language. */
export async function phoneSettings(): Promise<PhoneSettings> {
  const fallback: PhoneSettings = { theme: null, locale: inPhone ? null : navigator.language };
  const fn = phoneFn('GetSettings');
  try {
    const raw = fn ? await fn() : (globalThis as any).settings;
    const s = pick(raw);
    // lb-phone also tags the app document with data-theme.
    const attr = document.documentElement.getAttribute('data-theme');
    return { theme: s.theme ?? (attr === 'light' || attr === 'dark' ? attr : null), locale: s.locale ?? fallback.locale };
  } catch {
    return fallback;
  }
}

/** Calls back whenever the player changes the phone's theme or language. */
export function onPhoneSettings(cb: (s: PhoneSettings) => void) {
  phoneFn('OnSettingsChange')?.((raw: any) => cb(pick(raw)));
  // Same event, in case the components helper isn't there.
  window.addEventListener('message', (e) => {
    if (e.data?.type === 'settingsUpdated') cb(pick(e.data.settings));
  });
  new MutationObserver(() => {
    const attr = document.documentElement.getAttribute('data-theme');
    if (attr === 'light' || attr === 'dark') cb({ theme: attr, locale: null });
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
}
