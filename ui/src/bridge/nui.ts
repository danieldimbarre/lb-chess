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

export function phoneNotify(title: string, content?: string) {
  const fn = (globalThis as any).sendNotification;
  if (typeof fn === 'function') fn({ title, content });
}

export async function phoneTheme(): Promise<'dark' | 'light'> {
  const fn = (globalThis as any).getSettings;
  if (typeof fn !== 'function') return 'dark';
  try {
    const settings = await fn();
    return settings?.display?.theme === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

export function onPhoneThemeChange(cb: (theme: 'dark' | 'light') => void) {
  const fn = (globalThis as any).onSettingsChange;
  if (typeof fn === 'function') fn((s: any) => cb(s?.display?.theme === 'light' ? 'light' : 'dark'));
}
