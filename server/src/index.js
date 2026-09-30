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

// Per-source window: at most maxRequestsPerSecond requests each second.
const buckets = new Map();
function allow(src) {
  const now = Date.now();
  let b = buckets.get(src);
  if (!b || now - b.start >= 1000) {
    b = { start: now, count: 0 };
    buckets.set(src, b);
  }
  b.count++;
  return b.count <= config.maxRequestsPerSecond;
}

onNet('lb-chess:req', async (id, name, data) => {
  const src = source;
  const reply = (result) => emitNet('lb-chess:res', src, id, result);

  if (!allow(src)) return reply({ ok: false, error: 'rate_limited' });
  if (typeof name !== 'string' || !Object.prototype.hasOwnProperty.call(handlers, name)) return reply({ ok: false, error: 'unknown_request' });

  const passport = passportOf(src);
  if (!passport) return reply({ ok: false, error: 'no_passport' });
  sources.set(passport, src);
  passports.set(src, passport);

  try {
    reply(await handlers[name]({ src, passport, data: data && typeof data === 'object' ? data : {} }));
  } catch (err) {
    log(`${name} failed:`, err);
    reply({ ok: false, error: 'server_error' });
  }
});

function dropped(passport, src) {
  if (!passport) return;
  if (sources.get(passport) === src) sources.delete(passport);
  passports.delete(src);
  buckets.delete(src);
  service.onDisconnect(passport);
}

// vRP fires Disconnect(Passport, source) before forgetting the player; playerDropped is the fallback.
on('Disconnect', (passport, src) => dropped(Number(passport), Number(src)));
on('playerDropped', () => {
  const src = Number(source);
  dropped(passports.get(src), src);
});

let ticking = false;
setInterval(async () => {
  if (ticking) return;
  ticking = true;
  try {
    await service.tick();
  } catch (err) {
    log('tick failed', err);
  } finally {
    ticking = false;
  }
}, 250);

setImmediate(async () => {
  try {
    await service.db.init();
    log('database ready');
  } catch (err) {
    log('database init failed', err);
  }
});
