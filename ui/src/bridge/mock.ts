/** Dev-only stand-in for the FiveM server. Replaced by the shared server core in a later phase. */
export function createMock(_push: (action: string, data: unknown) => void) {
  return {
    async request(name: string, _data: unknown): Promise<any> {
      await new Promise((r) => setTimeout(r, 120));
      switch (name) {
        case 'ping':
          return { ok: true, serverTime: Date.now() };
        case 'bootstrap':
          return { ok: true, me: null, game: null, queue: null, challenges: { incoming: [], outgoing: [] }, serverTime: Date.now() };
        default:
          return { ok: false, error: 'unknown_request' };
      }
    },
  };
}
