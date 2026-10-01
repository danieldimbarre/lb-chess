import { botById, botMove, analyzeSteps } from './bots.ts';
import { runAsync } from './engine.ts';

type Req =
  | { id: number; type: 'move'; bot: string; fen: string; moves: string[] }
  | { id: number; type: 'analyze'; fen: string; moves: string[]; timeMs: number };

/**
 * The worker lives for the whole session (no terminate/re-spawn per position).
 * Analysis yields between search depths; any newer message bumps `current`, which makes
 * the running analysis stop at its next step instead of killing the worker.
 */
let current = 0;

self.onmessage = async (e: MessageEvent<Req>) => {
  const req = e.data;
  const token = ++current;
  if (req.type === 'move') {
    // Bot moves are short and must not be interrupted: run to completion.
    const uci = botMove(botById(req.bot), req.fen, req.moves);
    self.postMessage({ id: req.id, type: 'move', uci });
    return;
  }
  const info = await runAsync(
    analyzeSteps(req.fen, req.moves, req.timeMs, (i, whiteToMove) => token === current && self.postMessage({ id: req.id, type: 'info', info: i, whiteToMove })),
    () => token !== current,
  );
  self.postMessage({ id: req.id, type: 'done', info: info ?? null });
};
