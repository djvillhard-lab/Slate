// Invite-only sign-up (3.55.0). DJ makes a one-time invite link in Settings; the person who opens it picks
// their own name and passcode, and lands in users/registry like someone added with the "Add a person" action.
//   POST /api/invite        {pass, action: "new" | "list" | "cancel" | "remove", note, k, id}   DJ's passcode only
//                           every answer carries the invites ("list") and the people with accounts ("people")
//   POST /api/invite-check  {code}                → {ok, note} or {error}
//   POST /api/signup        {code, name, pass}    → {ok, id, name} or {error}
// The docs table can be read by anyone with the page's public key, so nothing stored here can be used by itself:
// invite codes and new passcodes are kept only as HMAC-SHA256 keyed with the worker's SUPABASE_SECRET (a plain
// SHA-256 of a passcode someone chose could be guessed offline). If that secret is ever replaced, people who signed
// up by invite need a new invite; people added with the GitHub action (plain SHA-256) are not affected.
const DAYS = 7, MAX_OPEN = 20, MAX_TRIES = 8;
const ABC = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";  // no 0/O, 1/I/L

async function hmac(env, s) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode("slate-signup:" + (env.SUPABASE_SECRET || "")), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const b = await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(String(s)));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}
// the key a passcode chosen at sign-up is stored under in users/registry
export const passKey = async (env, pass) => "h2:" + (await hmac(env, "pass:" + pass));
const codeKey = (env, code) => hmac(env, "invite:" + String(code || "").toUpperCase().replace(/[^A-Z0-9]/g, ""));
const newCode = () => [...crypto.getRandomValues(new Uint8Array(12))].map((x) => ABC[x % ABC.length]).join("");
const expired = (v) => Date.now() - Date.parse(v.at || 0) > DAYS * 86400000;
const state = (v) => (v.used ? "used" : v.tries >= MAX_TRIES ? "locked" : expired(v) ? "expired" : "open");

export async function signupRoutes(req, env, url, h) {
  const { json, whoIs, getDoc, putDoc } = h;
  if (req.method !== "POST") return json({ error: "bad request" }, 400);
  if (!env.SUPABASE_SECRET) return json({ error: "not set up" }, 503);
  let p; try { p = await req.json(); } catch { return json({ error: "bad request" }, 400); }
  p = p || {};
  const load = async () => { const d = (await getDoc(env, "users/invites")) || {}; d.list = d.list || {}; return d; };

  if (url.pathname === "/api/invite") {
    const me = await whoIs(env, p.pass);
    if (!me || me.id !== "dj") return json({ error: "Only DJ can invite people" }, 403);
    const d = await load();
    // tidy: used or dead invites drop off the list after 30 days
    Object.keys(d.list).forEach((k) => { if (Date.now() - Date.parse(d.list[k].at || 0) > 30 * 86400000) delete d.list[k]; });
    let code = "";
    if (p.action === "new") {
      if (Object.values(d.list).filter((v) => state(v) === "open").length >= MAX_OPEN) return json({ error: "Too many open invites. Cancel one first." }, 400);
      code = newCode();
      d.list[await codeKey(env, code)] = { at: new Date().toISOString(), note: String(p.note || "").trim().slice(0, 30) };
      await putDoc(env, "users/invites", d);
    } else if (p.action === "cancel") {
      const k = Object.keys(d.list).find((x) => x.slice(0, 10) === String(p.k || ""));
      if (k && !d.list[k].used) { delete d.list[k]; await putDoc(env, "users/invites", d); }
    }
    // the people with accounts (however they were added), with today's Claude summaries; "remove" takes one off
    const reg = (await getDoc(env, "users/registry")) || {}, users = reg.users || {};
    if (p.action === "remove") {
      const gone = Object.keys(users).filter((k) => users[k].id === String(p.id || "") && users[k].id !== "dj");
      if (gone.length) { gone.forEach((k) => delete users[k]); reg.users = users; await putDoc(env, "users/registry", reg); }
    }
    const day = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    const by = ((((await getDoc(env, "stats/usage")) || {}).days || {})[day] || {}).by || {};
    const seen = {}, people = [];
    Object.values(users).forEach((u) => { if (!u.id || seen[u.id]) return; seen[u.id] = 1; people.push({ id: u.id, name: u.name || u.id, at: u.at || "", via: u.via || "", today: Number(by[u.id]) || 0, cap: Math.min(Number(u.cap) || 10, 10) }); });
    const list = Object.keys(d.list).map((k) => ({ k: k.slice(0, 10), at: d.list[k].at, note: d.list[k].note || "", state: state(d.list[k]), name: d.list[k].name || "" }))
      .sort((a, b) => (a.at < b.at ? 1 : -1));
    return json({ ok: true, code, days: DAYS, list, people });
  }

  const d = await load(), ck = await codeKey(env, p.code), inv = d.list[ck];
  const st = inv ? state(inv) : "none";
  const why = { none: "That invite link isn't right. Ask DJ for a new one.", used: "That invite was already used. Ask DJ for a new one.", expired: "That invite ran out. Ask DJ for a new one.", locked: "That invite is locked. Ask DJ for a new one." };
  if (url.pathname === "/api/invite-check") return st === "open" ? json({ ok: true, note: inv.note || "" }) : json({ error: why[st] }, 403);

  if (url.pathname === "/api/signup") {
    if (st !== "open") return json({ error: why[st] }, 403);
    const name = String(p.name || "").replace(/\s+/g, " ").trim().slice(0, 20), pass = String(p.pass || "");
    if (name.length < 2) return json({ error: "Type your first name." }, 400);
    if (pass.length < 8 || pass.length > 100) return json({ error: "Your passcode needs at least 8 characters." }, 400);
    if (/^(.)\1+$/.test(pass) || /^(12345678|password|passcode)/i.test(pass)) return json({ error: "That passcode is too easy to guess. Pick another." }, 400);
    if (await whoIs(env, pass)) {
      // never say whose it is; a few misses and the invite locks, so an invite can't be used to guess passcodes
      inv.tries = (inv.tries || 0) + 1; await putDoc(env, "users/invites", d);
      return json({ error: "That passcode can't be used. Pick a different one." }, 400);
    }
    const reg = (await getDoc(env, "users/registry")) || {}, users = reg.users || {};
    const taken = new Set(Object.values(users).map((u) => u.id)); taken.add("dj");
    // their space is u/<id>/: letters only, never one that already holds someone's data
    let base = name.toLowerCase().replace(/[^a-z]/g, "").slice(0, 12); if (base.length < 2) base = "user";
    const used = async (id) => {
      const r = await fetch(`https://xpkzcdaawaqiqgwkkwst.supabase.co/rest/v1/docs?select=path&path=like.${encodeURIComponent("u/" + id + "/")}*&limit=1`, { headers: { apikey: env.SUPABASE_SECRET, Authorization: "Bearer " + env.SUPABASE_SECRET } });
      return !r.ok || (await r.json()).length > 0;
    };
    let id = "";
    for (const sfx of ["", "b", "c", "d", "e", "f", "g", "h", "j", "k"]) { const c = base + sfx; if (!taken.has(c) && !(await used(c))) { id = c; break; } }
    if (!id) return json({ error: "Couldn't set that name up. Try a different name." }, 400);
    users[await passKey(env, pass)] = { id, name, cap: 10, at: new Date().toISOString(), via: "invite" };
    reg.users = users;
    const w = await putDoc(env, "users/registry", reg);
    if (!w.ok) return json({ error: "Couldn't save. Try again." }, 502);
    inv.used = new Date().toISOString(); inv.name = name; inv.id = id;
    await putDoc(env, "users/invites", d);
    return json({ ok: true, id, name });
  }
  return json({ error: "bad request" }, 400);
}
