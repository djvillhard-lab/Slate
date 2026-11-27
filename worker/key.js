// Slate's second key (code review, Nov 27, 2026).
// One key, SUPABASE_SECRET, used to do two jobs: open the database, and be the seed for everything else the server
// keeps safe (passcode and invite hashes, the scrambling of feedback, usage and email addresses, browser push signing,
// the worker's knock on itself). That meant the database key could never be replaced without breaking all of those.
// SLATE_KEY takes over the second job. It must hold EXACTLY the value SUPABASE_SECRET had on Nov 27, 2026; steps for
// DJ are in docs/security/second-key.md.
//
// The safety check: KEY_PRINT is a short fingerprint of the right value (it says nothing useful about the key itself).
// A SLATE_KEY that doesn't match it (a typo, a stray space) is ignored and SUPABASE_SECRET keeps doing the job, so a
// mistake while adding it can't log anyone out. POST /api/keycheck says which of the two is in use.
const KEY_PRINT = "b2be4c641a6a24ab";  // read from /api/keycheck on Nov 27, 2026, while SUPABASE_SECRET was still the only key
let good = null;  // null until checked; then whether SLATE_KEY is the right value

async function print(v) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("slate-keyprint|" + v));
  return [...new Uint8Array(b)].slice(0, 8).map((x) => x.toString(16).padStart(2, "0")).join("");
}
// run at the start of every request, timed run and workflow step, before anything asks for the key
export async function keyGuard(env) {
  if (good !== null || !env.SLATE_KEY) return;
  good = KEY_PRINT ? (await print(env.SLATE_KEY)) === KEY_PRINT : env.SLATE_KEY === env.SUPABASE_SECRET;
}
export const slateKey = (env) => (env.SLATE_KEY && good ? env.SLATE_KEY : env.SUPABASE_SECRET || "");
export async function keyCheck(env) {
  await keyGuard(env);
  return { second: !env.SLATE_KEY ? "not added yet" : good ? "added and right" : "added but it is not the right value, so it is being ignored", print: env.SUPABASE_SECRET ? await print(slateKey(env)) : "" };
}
