import { botById, botMove, analyze } from './bots.ts';

type Req =
  | { id: number; type: 'move'; bot: string; fen: string; moves: string[] }
  | { id: number; type: 'analyze'; fen: string; moves: string[]; timeMs: number };

self.onmessage = (e: MessageEvent<Req>) => {
  const req = e.data;
  if (req.type === 'move') {
    const uci = botMove(botById(req.bot), req.fen, req.moves);
    self.postMessage({ id: req.id, type: 'move', uci });
  } else {
    const info = analyze(req.fen, req.moves, req.timeMs, (i, whiteToMove) => self.postMessage({ id: req.id, type: 'info', info: i, whiteToMove }));
    self.postMessage({ id: req.id, type: 'done', info });
  }
};
