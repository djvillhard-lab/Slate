// Send feedback (Settings → Send feedback): people's bug reports and ideas, kept private.
//
// POST /api/feedback        {pass, kind: "bug"|"idea"|"other", text, page, ctx, shot?}  → saves one item
// POST /api/feedback/inbox  {key, all?}           → the items not reported yet (all: the last 100), decrypted
// POST /api/feedback/mark   {key, ids: [...]}     → marks those items reported, so the next report skips them
// POST /api/feedback/shot   {key, id}             → that item's screenshot, as a data URL
// POST /api/feedback/done   {key, id, done, note?, version?, by?} → marks an item addressed (done: false = open again)
//
// Storage: the existing Supabase docs table, so there's no new table to set up. Every document there can be read
// with the app's public key, so each item is encrypted (AES-GCM, with a key made from the worker's SUPABASE_SECRET)
// before it is saved. Only the time it was sent and whether it was reported are in the clear.
//   feedback/i/<id>  {at, reported, enc: {iv, ct}}        the item (who, kind, text, page, app version, device)
//   feedback/s/<id>  {enc: {iv, ct}}                      its screenshot, if one was attached
// Reading takes the reader key (a random key held only in DJ's Claude project), checked against this hash, or DJ's
// own passcode.
const READER_HASH = "c67723111b4760fef693da748e542a933145f2ee29eae1dfe5fb551e478b0c58";
const SB = "https://xpkzcdaawaqiqgwkkwst.supabase.co";
const KINDS = ["bug", "idea", "other"];

const b64 = (u8) => { let s = ""; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
async function cryptoKey(env) {
  const raw = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("slate-feedback|" + env.SUPABASE_SECRET));
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}
async function seal(env, obj) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await cryptoKey(env), new TextEncoder().encode(JSON.stringify(obj)));
  return { iv: b64(iv), ct: b64(new Uint8Array(ct)) };
}
async function open(env, enc) {
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(enc.iv) }, await cryptoKey(env), unb64(enc.ct));
  return JSON.parse(new TextDecoder().decode(pt));
}
async function sha(s) { const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(s || ""))); return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join(""); }
const clip = (v, n) => String(v == null ? "" : v).slice(0, n);

async function rows(env, prefix, extra) {
  const r = await fetch(`${SB}/rest/v1/docs?select=path,data&path=like.${encodeURIComponent(prefix)}*&order=path.desc&limit=100${extra || ""}`,
    { headers: { apikey: env.SUPABASE_SECRET, Authorization: "Bearer " + env.SUPABASE_SECRET } });
  return r.ok ? r.json() : [];
}

import { TEST_IDS } from "./usage.js";
import { sendPush, sendApns } from "./alerts.js";
// 3.x (DJ, Nov 17): a push to DJ's phones the moment feedback arrives, from his own notification list (prefs/push).
// Only DJ's devices: other people's lists live under u/<id>/ and are never read here.
const KIND_WORD = { bug: "Problem", idea: "Idea", other: "Feedback" };
async function tellDJ(env, item) {
  try {
    const row = (await rows(env, "prefs/push")).find((x) => x.path === "prefs/push");
    const subs = (row && row.data && row.data.subs) || [];
    const t = item.text.replace(/\s+/g, " "), body = (t.length > 140 ? t.slice(0, 137) + "…" : t);
    const msg = { title: "New feedback from " + item.name + " · " + (KIND_WORD[item.kind] || "Feedback"), body, tag: "feedback-" + item.id, thread: "feedback" };
    await Promise.all(subs.map((sub) => (sub.apns ? sendApns : sendPush)(env, sub, msg).catch(() => 0)));
  } catch (e) { /* the hourly check in DJ's Claude project still reports it */ }
}
export async function feedbackRoute(req, env, url, h) {
  const { rpc, whoIs, json } = h;
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  if (!env.SUPABASE_SECRET) return json({ error: "Feedback isn't set up yet (missing keys in Cloudflare)." }, 503);
  let p; try { p = await req.json(); } catch { return json({ error: "bad request" }, 400); }
  const put = (path, data) => rpc(env, "mirror_doc", { p_path: path, p_data: data, p_merge: false });

  if (url.pathname === "/api/feedback") {
    const me = await whoIs(env, p && p.pass);
    if (!me) return json({ error: "Sign in with your passcode to send feedback." }, 403);
    if (TEST_IDS.includes(me.id)) return json({ ok: true, id: "test", test: true });   // the test account: accepted, never stored
    const text = clip(p.text, 4000).trim();
    if (!text) return json({ error: "Write something first." }, 400);
    const at = new Date().toISOString();
    const id = at.replace(/[-:.TZ]/g, "").slice(0, 14) + "-" + me.id.replace(/[^a-z0-9]/gi, "").slice(0, 12) + "-" + Math.random().toString(36).slice(2, 6);
    let shot = typeof p.shot === "string" && /^data:image\/(jpeg|png|webp);base64,/.test(p.shot) ? p.shot : "";
    if (shot.length > 700000) shot = "";  // the app shrinks screenshots well under this
    const c = p.ctx && typeof p.ctx === "object" ? p.ctx : {};
    const item = {
      id, at, who: me.id, name: me.name, kind: KINDS.includes(p.kind) ? p.kind : "other", text,
      page: clip(p.page, 80), detail: clip(p.detail, 160),
      version: clip(c.version, 20), app: clip(c.app, 30), device: clip(c.device, 60), screen: clip(c.screen, 40), look: clip(c.look, 30),
      ua: clip(req.headers.get("user-agent"), 160), shot: !!shot,
    };
    if (shot) { const r = await put("feedback/s/" + id, { enc: await seal(env, { shot }) }); if (!r.ok) item.shot = false; }
    const r = await put("feedback/i/" + id, { at, reported: null, enc: await seal(env, item) });
    if (!r.ok) return json({ error: "Couldn't save it. Try again." }, 502);
    await tellDJ(env, item);
    return json({ ok: true, id });
  }

  // reading: the reader key or DJ's passcode
  const reader = (p.key && (await sha(p.key)) === READER_HASH) || (p.pass && (await whoIs(env, p.pass) || {}).admin === true);
  if (!reader) return json({ error: "Not allowed" }, 403);

  if (url.pathname === "/api/feedback/inbox") {
    const list = await rows(env, "feedback/i/", p.all ? "" : "&data->>reported=is.null");
    const items = [];
    for (const row of list) {
      try { items.push(Object.assign(await open(env, row.data.enc), { reported: row.data.reported || null, done: row.data.done || null })); }
      catch (e) { items.push({ id: row.path.slice(11), at: row.data.at, error: "couldn't decrypt" }); }
    }
    items.sort((a, b) => String(a.at).localeCompare(String(b.at)));
    return json({ ok: true, items });
  }
  if (url.pathname === "/api/feedback/mark") {
    const ids = Array.isArray(p.ids) ? p.ids.slice(0, 200).map((x) => clip(x, 60)) : [], now = new Date().toISOString(), done = [];
    for (const id of ids) {
      const r = await rpc(env, "mirror_doc", { p_path: "feedback/i/" + id, p_data: { reported: now }, p_merge: true });
      if (r.ok) done.push(id);
    }
    return json({ ok: true, marked: done });
  }
  // addressed or open again: {id, done: true|false, note?, version?, by?}. Kept in the clear beside "reported" (no feedback text in it).
  if (url.pathname === "/api/feedback/done") {
    const id = clip(p.id, 60); if (!/^[0-9]{14}-[a-z0-9]+-[a-z0-9]+$/i.test(id)) return json({ error: "bad id" }, 400);
    const have = await rows(env, "feedback/i/" + id);
    if (!have.find((x) => x.path === "feedback/i/" + id)) return json({ error: "No such item" }, 404);
    const done = p.done === false ? null : { at: new Date().toISOString(), note: clip(p.note, 140), version: clip(p.version, 20).replace(/[^0-9.]/g, ""), by: p.by === "claude" ? "claude" : "dj" };
    const r = await rpc(env, "mirror_doc", { p_path: "feedback/i/" + id, p_data: { done }, p_merge: true });
    return r.ok ? json({ ok: true, id, done }) : json({ error: "Couldn't save it. Try again." }, 502);
  }
  if (url.pathname === "/api/feedback/shot") {
    const list = await rows(env, "feedback/s/" + clip(p.id, 60));
    const row = list.find((x) => x.path === "feedback/s/" + p.id);
    if (!row) return json({ error: "No screenshot" }, 404);
    return json({ ok: true, shot: (await open(env, row.data.enc)).shot });
  }
  return json({ error: "not found" }, 404);
}
