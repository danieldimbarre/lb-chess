import { onPush, request } from '../bridge/nui';
import { session } from './session';
import { current, reset } from './router';
import { playSound } from '../chess/sounds';
import { toast, showError } from '../lib/toast';
import { watch } from 'vue';
import { locale, t } from '../i18n';
import type { Bootstrap, Challenge, GameSnapshot, Lobby, MoveRecord, Profile, Seek, TimeControl } from '../types';

let installed = false;

function syncTime(serverTime?: number) {
  if (typeof serverTime === 'number') session.offset = serverTime - Date.now();
}

/** Routes a finished bootstrap to the right first screen. */
export function applyBootstrap(b: Bootstrap) {
  syncTime(b.serverTime);
  session.me = b.me;
  session.game = b.game;
  session.queue = b.queue;
  session.incoming = b.challenges.incoming;
  session.outgoing = b.challenges.outgoing;
  if (b.lobby) session.lobby = b.lobby;
  session.ready = true;
}

export async function bootstrap(): Promise<boolean> {
  const b = await request<Bootstrap>('bootstrap', { locale: locale.value });
  if (!b?.ok) return false;
  applyBootstrap(b);
  return true;
}

export function installPushHandlers() {
  if (installed) return;
  installed = true;

  // The server writes phone notifications in the player's language.
  watch(locale, (l) => request('locale', { locale: l }));

  onPush('game:start', (snap: GameSnapshot) => {
    syncTime(snap.serverTime);
    session.game = snap;
    session.queue = null;
    session.outgoing = [];
    session.incoming = [];
    playSound('start');
    reset('online', {}, 'forward');
  });

  onPush('game:move', (d: { id: string; move: MoveRecord; ply: number; clocks: { w: number; b: number }; turnStartedAt: number; serverTime: number; firstMoveDeadline: number | null }) => {
    const g = session.game;
    if (!g || g.id !== d.id) return;
    syncTime(d.serverTime);
    if (d.ply === g.moves.length + 1) g.moves.push(d.move);
    g.clocks = d.clocks;
    g.turnStartedAt = d.turnStartedAt;
    g.serverTime = d.serverTime;
    g.firstMoveDeadline = d.firstMoveDeadline;
    g.drawOffer = null;
  });

  onPush('game:end', (d: { id: string; result?: GameSnapshot['result']; reason: GameSnapshot['reason']; clocks: { w: number; b: number }; me: Profile | null }) => {
    if (d.me) session.me = d.me;
    const g = session.game;
    if (!g || g.id !== d.id) return;
    g.status = 'ended';
    g.result = d.result;
    g.reason = d.reason;
    g.clocks = d.clocks;
    g.firstMoveDeadline = null;
    g.drawOffer = null;
    playSound('end');
  });

  onPush('game:draw', (d: { id: string; offer: 'w' | 'b' | null; declined?: boolean }) => {
    const g = session.game;
    if (!g || g.id !== d.id) return;
    g.drawOffer = d.offer;
    if (d.offer && d.offer !== g.myColor) playSound('notify');
    if (d.declined && !d.offer) toast(t('game.drawDeclined'));
  });

  onPush('game:opponent', (d: { id: string; connected: boolean; deadline: number | null }) => {
    const g = session.game;
    if (!g || g.id !== d.id) return;
    const opp = g.myColor === 'w' ? g.black : g.white;
    opp.connected = d.connected;
    g.disconnectDeadline = d.deadline;
  });

  onPush('game:rematch', (d: { id: string; rematch: GameSnapshot['rematch'] }) => {
    const g = session.game;
    if (g && g.id === d.id) g.rematch = d.rematch;
  });

  onPush('queue:status', (d: { queue: { tc: TimeControl; since: number } | null }) => {
    session.queue = d.queue;
  });

  onPush('lobby', (d: Lobby) => {
    const seen = new Set(session.lobby.seeks.map(seekId));
    session.lobby = d;
    // While waiting, a new player showing up in another time control is worth a sound.
    if (session.queue && d.seeks.some((s) => s.username !== session.me?.username && !seen.has(seekId(s)))) playSound('notify');
  });

  onPush('challenge:incoming', (c: Challenge) => {
    syncTime(c.serverTime);
    session.incoming = [...session.incoming.filter((x) => x.id !== c.id), c];
    if (!c.rematchOf) playSound('notify');
  });

  onPush('challenge:outgoing', (c: Challenge) => {
    session.outgoing = [...session.outgoing.filter((x) => x.id !== c.id), c];
  });

  onPush('challenge:update', (d: { id: string; status: 'accepted' | 'declined' | 'expired' | 'cancelled'; by?: string }) => {
    const mine = session.outgoing.find((c) => c.id === d.id);
    session.incoming = session.incoming.filter((c) => c.id !== d.id);
    session.outgoing = session.outgoing.filter((c) => c.id !== d.id);
    if (mine && d.status === 'declined') toast(t('challenge.declined', { name: mine.to.username }));
    if (mine && d.status === 'expired') toast(t('challenge.expired', { name: mine.to.username }));
  });
}

const seekId = (s: Seek) => `${s.username}:${s.tc.base}+${s.tc.inc}`;

// Actions ---------------------------------------------------------------------------------

export async function joinQueue(tc: TimeControl) {
  const res = await request('queue:join', { tc });
  if (!res?.ok) return showError(res?.error);
  if (!res.matched) {
    session.queue = res.queue;
    session.notified = res.notified ?? 0;
    if (current().name !== 'searching') reset('searching', {}, 'forward');
  }
}

export async function leaveQueue() {
  session.queue = null;
  await request('queue:leave');
}

export async function acceptChallenge(c: Challenge) {
  session.incoming = session.incoming.filter((x) => x.id !== c.id);
  const res = await request('challenge:accept', { id: c.id });
  if (!res?.ok) showError(res?.error);
}

export async function declineChallenge(c: Challenge) {
  session.incoming = session.incoming.filter((x) => x.id !== c.id);
  await request('challenge:decline', { id: c.id });
}

export async function cancelChallenge(c: Challenge) {
  session.outgoing = session.outgoing.filter((x) => x.id !== c.id);
  await request('challenge:cancel', { id: c.id });
}
