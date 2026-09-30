import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Position, perft, Searcher, moveToUci, MATE } from '../src/engine/engine.ts';

const cases: [string, number, number][] = [
  ['rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 4, 197281],
  ['r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1', 3, 97862],
  ['8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1', 4, 43238],
  ['r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1', 3, 9467],
  ['rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8', 3, 62379],
  ['r4rk1/1pp1qppp/p1np1n2/2b1p1B1/2B1P1b1/P1NP1N2/1PP1QPPP/R4RK1 w - - 0 10', 3, 89890],
];

for (const [fen, depth, nodes] of cases) {
  test(`perft ${depth} ${fen.split(' ')[0]}`, () => {
    const pos = new Position(fen);
    assert.equal(perft(pos, depth), nodes);
    // make/unmake must restore the exact position hash
    const again = new Position(fen);
    assert.equal(pos.lo, again.lo);
    assert.equal(pos.hi, again.hi);
  });
}

test('finds mate in one', () => {
  const pos = new Position('6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1');
  const { move, info } = new Searcher().think(pos, { timeMs: 1500, maxDepth: 6 });
  assert.equal(moveToUci(move), 'a1a8');
  assert.equal(info?.mate, 1);
});

test('finds mate in two', () => {
  // Classic: 1.Qg7+?? no - use a known M2: back rank with queen + rook
  const pos = new Position('k7/8/1K6/8/8/8/8/7R w - - 0 1');
  const { info } = new Searcher().think(pos, { timeMs: 3000, maxDepth: 8 });
  assert.ok(info && info.score > MATE - 200, `expected mate score, got ${info?.score}`);
});

test('wins a hanging queen', () => {
  const pos = new Position('rnb1kbnr/pppp1ppp/8/4p1q1/3PP3/8/PPP2PPP/RNBQKBNR w KQkq - 1 3');
  const { move } = new Searcher().think(pos, { timeMs: 1500, maxDepth: 5 });
  assert.equal(moveToUci(move), 'c1g5');
});

test('reports nps', () => {
  const pos = new Position();
  const { info } = new Searcher().think(pos, { timeMs: 1000 });
  console.log(`startpos: depth ${info?.depth} nodes ${info?.nodes} in ${info?.timeMs}ms pv ${info?.pv.join(' ')}`);
  assert.ok(info && info.depth >= 4);
});
