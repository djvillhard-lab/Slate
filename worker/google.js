// Sign in with Google (3.95.0). A Google account is tied to an existing Slate profile, so the profile keeps
// everything it has (teams, rules, favorites, alerts): nothing moves, the profile id stays the same.
//
// Google never runs inside the iPhone app (Google blocks sign-in in app web views), so every Google step happens in
// a browser tab or Safari, joined to the app by a one-time ticket:
//   POST /api/google/start   {kind: "link", pass} or {kind: "signin"}  → {t, s}   t goes in the browser link, s stays here
//   POST /api/google/peek    {t}                                        → {kind, name}   what the browser page shows
//   POST /api/google/finish  {t, token}    (the browser, after Google)  → {ok, kind, name} or {error}
//   POST /api/google/poll    {t, s}        (the app, every few seconds) → {wait} | {ok, ...} | {error}; the answer is given once
//   POST /api/google/status  {pass}                                     → {linked, email}
//   POST /api/google/unlink  {pass, p}     (p: "apple" for Apple)        → {ok}
//   POST /api/google/apple   {kind, pass?, token, nonce}  (the iPhone app's Sign in with Apple, 3.114.0) → like poll's answer
// Sign in with Apple (3.114.0) works the same way without a ticket: the app gets Apple's signed token itself, and the
// token is checked here against Apple's public keys (audience = the app's bundle id, nonce = the one the app made).
// "link" (Settings → Account, while logged in with the passcode): ties the Google account to that profile.
// "signin" (the log-in page): a Google account already tied to a profile gets a new device key for this phone. A device
// key works like a passcode (users/devices, HMAC only, never the key itself), so the rest of the app needs no change.
// The token is checked with Supabase Auth (Google is set up there); Slate keeps the Supabase user id and the email.
// DJ's own profile can be tied to Google but still logs in with its passcode: DJ's saves are checked in the database.
const SB = "https://xpkzcdaawaqiqgwkkwst.supabase.co";
const PUB = "sb_publishable_G7sLoJ7ihWxKivYsmkxRJw_CgomPngZ";
const TICKET_MIN = 15, MAX_OPEN = 40;
const hex = (n) => [...crypto.getRandomValues(new Uint8Array(n))].map((x) => x.toString(16).padStart(2, "0")).join("");
async function sha(s) { const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(s))); return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join(""); }

// the Google account behind a Supabase access token, or null
async function googleUser(token) {
  token = String(token || ""); if (token.length < 20 || token.length > 4000) return null;
  const r = await fetch(`${SB}/auth/v1/user`, { headers: { apikey: PUB, Authorization: "Bearer " + token } });
  if (!r.ok) return null;
  const u = await r.json();
  const g = (u.identities || []).find((i) => i.provider === "google");
  if (!u.id || !g) return null;
  return { uid: u.id, email: String(u.email || (g.identity_data || {}).email || "").slice(0, 120) };
}

// ---- Sign in with Apple: Apple's token, checked against Apple's keys ----
const APPLE_AUD = "com.djvillhard.slate";
let appleKeys = null, appleAt = 0;
const b64u = (s) => Uint8Array.from(atob(String(s).replace(/-/g, "+").replace(/_/g, "/") + "===".slice((String(s).length + 3) % 4)), (c) => c.charCodeAt(0));
async function appleUser(token, nonce) {
  try {
    const parts = String(token || "").split("."); if (parts.length !== 3 || token.length > 4000) return null;
    const dec = (x) => JSON.parse(new TextDecoder().decode(b64u(x)));
    const hdr = dec(parts[0]), c = dec(parts[1]);
    if (hdr.alg !== "RS256") return null;
    if (!appleKeys || Date.now() - appleAt > 3600000 || !appleKeys.some((k) => k.kid === hdr.kid)) {
      const r = await fetch("https://appleid.apple.com/auth/keys"); if (!r.ok) return null;
      appleKeys = (await r.json()).keys || []; appleAt = Date.now();
    }
    const jwk = appleKeys.find((k) => k.kid === hdr.kid); if (!jwk) return null;
    const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
    if (!(await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, b64u(parts[2]), new TextEncoder().encode(parts[0] + "." + parts[1])))) return null;
    if (c.iss !== "https://appleid.apple.com" || c.aud !== APPLE_AUD || !(c.exp * 1000 > Date.now()) || !c.sub) return null;
    if (!nonce || c.nonce !== (await sha(nonce))) return null;
    return { uid: "apple:" + c.sub, email: String(c.email || "").slice(0, 120), p: "apple" };
  } catch (e) { return null; }
}
const isApple = (k) => k.startsWith("apple:");

export async function googleRoutes(req, env, url, h) {
  const { json, whoIs, getDoc, putDoc, passKey } = h;
  if (req.method !== "POST") return json({ error: "bad request" }, 400);
  if (!env.SUPABASE_SECRET) return json({ error: "not set up" }, 503);
  let p; try { p = await req.json(); } catch { return json({ error: "bad request" }, 400); }
  p = p || {};
  const op = url.pathname.slice("/api/google/".length);
  const now = Date.now();
  const loadT = async () => { const d = (await getDoc(env, "users/gtickets")) || {}; d.t = d.t || {}; Object.keys(d.t).forEach((k) => { if (now - Date.parse(d.t[k].at || 0) > TICKET_MIN * 60000) delete d.t[k]; }); return d; };
  const nameOf = async (id) => { const reg = ((await getDoc(env, "users/registry")) || {}).users || {}; const u = Object.values(reg).find((x) => x && x.id === id); return u ? u.name || u.id : id === "dj" ? "DJ" : id; };

  if (op === "status" || op === "unlink") {
    const me = await whoIs(env, p.pass);
    if (!me) return json({ error: "Wrong passcode" }, 403);
    const d = (await getDoc(env, "users/google")) || {}, links = d.links || {};
    const g = Object.keys(links).filter((k) => links[k].id === me.id && !isApple(k)), a = Object.keys(links).filter((k) => links[k].id === me.id && isApple(k));
    if (op === "status") return json({ linked: g.length > 0, email: g.length ? links[g[0]].email || "" : "", apple: a.length > 0, appleEmail: a.length ? links[a[0]].email || "" : "" });
    (p.p === "apple" ? a : g).forEach((k) => delete links[k]); d.links = links;
    const w = await putDoc(env, "users/google", d);
    return w.ok ? json({ ok: true }) : json({ error: "Couldn't save. Try again." }, 502);
  }

  if (op === "start") {
    const kind = p.kind === "link" ? "link" : "signin";
    let id = "";
    if (kind === "link") { const me = await whoIs(env, p.pass); if (!me) return json({ error: "Wrong passcode" }, 403); id = me.id; }
    const d = await loadT();
    if (Object.keys(d.t).length >= MAX_OPEN) return json({ error: "Too many people are signing in right now. Try again in a few minutes." }, 429);
    const t = hex(18), s = hex(18);
    d.t[await sha(t)] = { kind, id, s: await sha(s), at: new Date().toISOString() };
    const w = await putDoc(env, "users/gtickets", d);
    return w.ok ? json({ t, s }) : json({ error: "Couldn't start. Try again." }, 502);
  }

  // link: tie the account (g: {uid, email, p}) to profile id. signin: a device key for the profile it's tied to.
  async function tie(kind, id, g) {
    const name = g.p === "apple" ? "Apple ID" : "Google account", where = g.p === "apple" ? "Connect next to Sign in with Apple" : "Connect Google";
    const gd = (await getDoc(env, "users/google")) || {}, links = gd.links || {};
    if (kind === "link") {
      if (links[g.uid] && links[g.uid].id !== id) return { error: "That " + name + " is already connected to another Slate profile.", code: 409 };
      Object.keys(links).forEach((k) => { if (links[k].id === id && isApple(k) === isApple(g.uid)) delete links[k]; });  // one of each per profile
      links[g.uid] = { id, email: g.email, at: new Date().toISOString() }; gd.links = links;
      const w = await putDoc(env, "users/google", gd);
      if (!w.ok) return { error: "Couldn't save. Try again.", code: 502 };
      return { ok: true, kind: "link", p: g.p || "google", email: g.email };
    }
    const l = links[g.uid];
    if (!l) return { error: "This " + name + " isn't connected to Slate yet. Open Slate, log in with your passcode, then go to Settings → Account → " + where + ".", code: 404 };
    if (l.id === "dj") return { error: "DJ's profile still logs in with its passcode.", code: 403 };
    const reg = ((await getDoc(env, "users/registry")) || {}).users || {}, u = Object.values(reg).find((v) => v && v.id === l.id);
    if (!u) return { error: "That Slate profile isn't active any more. Ask DJ.", code: 403 };
    const key = "g1-" + hex(24), dv = (await getDoc(env, "users/devices")) || {}, keys = dv.keys || {};
    keys[await passKey(env, key)] = { id: l.id, via: g.p || "google", at: new Date().toISOString(), ua: String(req.headers.get("user-agent") || "").slice(0, 80) };
    dv.keys = keys;
    const w = await putDoc(env, "users/devices", dv);
    if (!w.ok) return { error: "Couldn't save. Try again.", code: 502 };
    l.last = new Date().toISOString(); await putDoc(env, "users/google", gd);
    return { ok: true, kind: "signin", pass: key, id: l.id, name: u.name || l.id, admin: u.admin === true };
  }

  if (op === "apple") {
    const kind = p.kind === "link" ? "link" : "signin";
    let id = "";
    if (kind === "link") { const me = await whoIs(env, p.pass); if (!me) return json({ error: "Wrong passcode" }, 403); id = me.id; }
    const a = await appleUser(p.token, p.nonce);
    if (!a) return json({ error: "Apple didn't confirm who you are. Try again." }, 403);
    const r = await tie(kind, id, a);
    return r.error ? json({ error: r.error }, r.code || 400) : json(r);
  }

  if (!/^[0-9a-f]{36}$/.test(String(p.t || ""))) return json({ error: "That link isn't right. Start again from Slate." }, 400);
  const d = await loadT(), tk = await sha(p.t), x = d.t[tk];
  if (!x) return json({ error: "That link ran out. Start again from Slate." }, 404);

  if (op === "peek") return json({ kind: x.kind, name: x.kind === "link" ? await nameOf(x.id) : "", done: !!x.res });

  if (op === "finish") {
    if (x.res) return json({ error: "This link was already used. Start again from Slate." }, 409);
    const g = await googleUser(p.token);
    if (!g) return json({ error: "Google didn't confirm who you are. Try again." }, 403);
    const r = await tie(x.kind, x.id, g);
    if (r.error) return json({ error: r.error }, r.code || 400);
    x.res = r; d.t[tk] = x; await putDoc(env, "users/gtickets", d);
    return json({ ok: true, kind: x.kind, name: x.kind === "link" ? await nameOf(x.id) : r.name, email: g.email });
  }

  if (op === "poll") {
    if (!x.s || x.s !== (await sha(p.s))) return json({ error: "That link isn't right. Start again." }, 403);
    if (!x.res) return json({ wait: true });
    delete d.t[tk]; await putDoc(env, "users/gtickets", d);  // the answer (and any device key) is handed over once
    return json(x.res);
  }
  return json({ error: "bad request" }, 400);
}
