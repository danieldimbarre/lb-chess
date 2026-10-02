/* global GetCurrentResourceName, LoadResourceFile, GetResourceState, onNet, emitNet, on, source, setImmediate */
import { ChessService } from './core.js';
import { createMysqlDb } from './db.js';

const resourceName = GetCurrentResourceName();
const config = JSON.parse(LoadResourceFile(resourceName, 'config.json'));
const log = (...args) => console.log(`[${resourceName}]`, ...args);

/** passport -> source for players that used the app this session */
const sources = new Map();
/** source -> passport, needed on drop when vRP already forgot the player */
const passports = new Map();

function passportOf(src) {
  try {
    const p = globalThis.exports.vrp.Passport(src);
    return p ? Number(p) : null;
  } catch {
    return null;
  }
}

function sourceOf(passport) {
  try {
    const s = globalThis.exports.vrp.Source(passport);
    if (s) return Number(s);
  } catch {
    /* vrp unavailable */
  }
  return sources.get(passport) ?? null;
}

const service = new ChessService({
  db: createMysqlDb(),
  config,
  log,
  isOnline: (passport) => !!sourceOf(passport),
  push(passport, action, data) {
    const src = sourceOf(passport);
    if (src) emitNet('lb-chess:push', src, action, data);
  },
  notify(passport, title, content) {
    const src = sourceOf(passport);
    if (!src) return;
    try {
      if (GetResourceState('lb-phone') === 'started') globalThis.exports['lb-phone'].SendNotification(src, { app: config.identifier, title, content });
    } catch (err) {
      log('notification failed', err?.message ?? err);
    }
  },
});

const handlers = service.handlers();
let ready = false;

// Per-source window: at most maxRequestsPerSecond requests each second. Keys are always numbers.
const buckets = new Map();
/** 'allow' | 'limited' (reply once) | 'drop' (silently ignore, no reply amplification) */
function allow(src) {
  const now = Date.now();
  let b = buckets.get(src);
  if (!b || now - b.start >= 1000) {
    b = { start: now, count: 0 };
    buckets.set(src, b);
  }
  b.count++;
  if (b.count <= config.maxRequestsPerSecond) return 'allow';
  return b.count === config.maxRequestsPerSecond + 1 ? 'limited' : 'drop';
}

// Minimum spacing (ms) per passport for requests that hit the database.
const COOLDOWNS = {
  leaderboard: 1000,
  profile: 500,
  'game:pgn': 250,
  search: 250,
  checkName: 250,
  register: 1000,
  'challenge:send': 500,
};
const lastCall = new Map(); // `${passport}:${name}` (plus `:${sort}` for leaderboard) -> timestamp
const LEADERBOARD_SORTS = ['games', 'winrate', 'wins'];
function cooledDown(passport, name, data) {
  const ms = COOLDOWNS[name];
  if (!ms) return true;
  // Each ranking tab is its own request: switching tabs right after opening the screen must not be refused.
  const sort = name === 'leaderboard' ? (LEADERBOARD_SORTS.includes(data?.sort) ? data.sort : 'games') : null;
  const key = sort ? `${passport}:${name}:${sort}` : `${passport}:${name}`;
  const now = Date.now();
  const last = lastCall.get(key) ?? 0;
  if (now - last < ms) return false;
  lastCall.set(key, now);
  return true;
}
function forgetCooldowns(passport) {
  for (const name of Object.keys(COOLDOWNS)) lastCall.delete(`${passport}:${name}`);
  for (const sort of LEADERBOARD_SORTS) lastCall.delete(`${passport}:leaderboard:${sort}`);
}

onNet('lb-chess:req', async (id, name, data) => {
  const src = Number(source);
  const reply = (result) => emitNet('lb-chess:res', src, id, result);

  const verdict = allow(src);
  if (verdict === 'drop') return;
  if (verdict === 'limited') return reply({ ok: false, error: 'rate_limited' });
  if (typeof name !== 'string' || !Object.prototype.hasOwnProperty.call(handlers, name)) return reply({ ok: false, error: 'unknown_request' });
  if (!ready) return reply({ ok: false, error: 'not_ready' });

  const passport = passportOf(src);
  if (!passport) return reply({ ok: false, error: 'no_passport' });
  sources.set(passport, src);
  passports.set(src, passport);
  if (!cooledDown(passport, name, data)) return reply({ ok: false, error: 'rate_limited' });

  try {
    reply(await handlers[name]({ src, passport, data: data && typeof data === 'object' ? data : {} }));
  } catch (err) {
    log(`${name} failed:`, err);
    reply({ ok: false, error: 'server_error' });
  }
});

function dropped(passport, src) {
  // Always release per-source state, even for sources that never resolved a passport.
  buckets.delete(src);
  passports.delete(src);
  if (!passport) return;
  if (sources.get(passport) === src) sources.delete(passport);
  forgetCooldowns(passport);
  service.onDisconnect(passport);
}

// vRP fires Disconnect(Passport, source) before forgetting the player; playerDropped is the fallback.
// Both may fire for one drop: onDisconnect is idempotent.
on('Disconnect', (passport, src) => dropped(Number(passport), Number(src)));
on('playerDropped', () => {
  const src = Number(source);
  dropped(passports.get(src) ?? null, src);
});

let ticking = false;
setInterval(async () => {
  if (ticking || !ready) return;
  ticking = true;
  try {
    await service.tick();
  } catch (err) {
    log('tick failed', err);
  } finally {
    ticking = false;
  }
}, 250);

async function init() {
  try {
    await service.db.init();
    ready = true;
    log('database ready');
  } catch (err) {
    log('database init failed, retrying in 30s', err);
    setTimeout(init, 30_000);
  }
}
setImmediate(init);
