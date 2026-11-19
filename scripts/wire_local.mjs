// Prints what the worker's /api/wire would answer for one league, so scripts/shots.py can show a worker change
// before it's deployed:  node scripts/wire_local.mjs nfl
globalThis.caches = { default: { match: async () => null, put: async () => {} } };
const { wireRoute } = await import("../worker/wire.js");
const json = (o, status = 200) => new Response(JSON.stringify(o), { status });
const r = await wireRoute(null, new URL("https://local/api/wire?lg=" + (process.argv[2] || "nfl")), { json });
process.stdout.write(await r.text());
