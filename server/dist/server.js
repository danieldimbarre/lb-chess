// src/index.js
var resourceName = GetCurrentResourceName();
var config = JSON.parse(LoadResourceFile(resourceName, "config.json"));
var handlers = {
  ping: async () => ({ ok: true, serverTime: Date.now() }),
  bootstrap: async () => ({ ok: true, me: null, game: null, queue: null, challenges: { incoming: [], outgoing: [] }, serverTime: Date.now() })
};
var buckets = /* @__PURE__ */ new Map();
function allow(src) {
  const now = Date.now();
  let b = buckets.get(src);
  if (!b || now - b.start >= 1e3) {
    b = { start: now, count: 0 };
    buckets.set(src, b);
  }
  b.count++;
  return b.count <= config.maxRequestsPerSecond;
}
function passportOf(src) {
  try {
    const p = exports.vrp.Passport(src);
    return p ? Number(p) : null;
  } catch {
    return null;
  }
}
onNet("lb-chess:req", async (id, name, data) => {
  const src = source;
  const reply = (result) => emitNet("lb-chess:res", src, id, result);
  if (!allow(src)) return reply({ ok: false, error: "rate_limited" });
  const handler = Object.prototype.hasOwnProperty.call(handlers, name) ? handlers[name] : null;
  if (!handler) return reply({ ok: false, error: "unknown_request" });
  const passport = passportOf(src);
  if (!passport) return reply({ ok: false, error: "no_passport" });
  try {
    reply(await handler({ src, passport, data: data && typeof data === "object" ? data : {} }));
  } catch (err) {
    console.error(`[${resourceName}] ${name} failed:`, err);
    reply({ ok: false, error: "server_error" });
  }
});
on("playerDropped", () => buckets.delete(source));
