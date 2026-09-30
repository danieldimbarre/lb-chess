import type { SearchInfo } from './engine.ts';

/**
 * Talks to the engine worker. If the game client refuses to spawn a Worker from
 * the NUI iframe, falls back to running the engine on the main thread.
 */
let worker: Worker | null = null;
let workerFailed = false;
let seq = 0;
const pending = new Map<number, (msg: any) => void>();

function getWorker(): Worker | null {
  if (worker || workerFailed) return worker;
  try {
    worker = new Worker(new URL('./engine.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e) => pending.get(e.data.id)?.(e.data);
    worker.onerror = () => {
      workerFailed = true;
      worker?.terminate();
      worker = null;
      // Fail whatever was in flight so callers retry on the main thread.
      for (const cb of pending.values()) cb({ type: 'error' });
      pending.clear();
    };
  } catch {
    workerFailed = true;
  }
  return worker;
}

async function mainThread() {
  // Let the UI paint (e.g. "thinking" dots) before blocking.
  await new Promise((r) => setTimeout(r, 30));
  return import('./bots.ts');
}

export async function requestBotMove(bot: string, fen: string, moves: string[]): Promise<string | null> {
  const w = getWorker();
  if (w) {
    const id = seq++;
    const res = await new Promise<any>((resolve) => {
      pending.set(id, resolve);
      w.postMessage({ id, type: 'move', bot, fen, moves });
    });
    pending.delete(id);
    if (res.type === 'move') return res.uci;
  }
  const m = await mainThread();
  return m.botMove(m.botById(bot), fen, moves);
}

export interface EvalInfo {
  /** Centipawns from White's point of view. */
  cp: number;
  /** Mate in N from White's point of view (negative = Black mates). */
  mate: number | null;
  depth: number;
  pv: string[];
}

function toWhite(info: SearchInfo, whiteToMove: boolean): EvalInfo {
  const sign = whiteToMove ? 1 : -1;
  return { cp: info.score * sign, mate: info.mate === null ? null : info.mate * sign, depth: info.depth, pv: info.pv };
}

let analysisId = -1;

/** Streams evaluation updates; a newer call cancels delivery of older ones. */
export async function requestAnalysis(fen: string, moves: string[], timeMs: number, onInfo: (e: EvalInfo) => void): Promise<void> {
  // A search can't be interrupted from outside; restart the worker when a new position comes in.
  if (worker && pending.has(analysisId)) {
    worker.terminate();
    worker = null;
    for (const cb of pending.values()) cb({ type: 'error' });
    pending.clear();
  }
  const w = getWorker();
  const id = seq++;
  analysisId = id;
  if (w) {
    await new Promise<void>((resolve) => {
      pending.set(id, (msg) => {
        if (msg.type === 'info') {
          if (analysisId === id) onInfo(toWhite(msg.info, msg.whiteToMove));
          return;
        }
        pending.delete(id);
        resolve();
      });
      w.postMessage({ id, type: 'analyze', fen, moves, timeMs });
    });
    return;
  }
  const m = await mainThread();
  if (analysisId !== id) return;
  m.analyze(fen, moves, Math.min(timeMs, 600), (i, white) => analysisId === id && onInfo(toWhite(i, white)));
}
