// Phone alerts, every minute from the worker's cron: live scores straight from ESPN, sent as Web Push.
// Who follows what (each person's slate, teams and custom items, plus the day's games) comes from alertsets/<D>,
// written by the tick job. Settings: <prefix>prefs/notify, phones: <prefix>prefs/push, sent: <prefix>prefs/sent-<D>.
// The VAPID key is derived from SUPABASE_SECRET; its public half is in the app.

const SB = "https://xpkzcdaawaqiqgwkkwst.supabase.co";
const VAPID_PUBLIC = "BGOiSg4w33W5Lui867BMvNq2fDnRLjdoOADhr5Vx_C2gOaibYV8joMK8K6ibx9o8sZFByk_K107NupNiJNORWNY";
const PATHS = {
  nfl: ["football/nfl"], ncaaf: ["football/college-football&groups=80&limit=500", "football/college-football&groups=81&limit=500"],
  nba: ["basketball/nba"], wnba: ["basketball/wnba"], ncaam: ["basketball/mens-college-basketball&groups=50&limit=500"],
  ncaaw: ["basketball/womens-college-basketball&groups=50&limit=500"], nhl: ["hockey/nhl"], mlb: ["baseball/mlb"], mls: ["soccer/usa.1"],
  epl: ["soccer/eng.1"], ucl: ["soccer/uefa.champions"], uel: ["soccer/uefa.europa"], laliga: ["soccer/esp.1"], seriea: ["soccer/ita.1"],
  bundesliga: ["soccer/ger.1"], ligue1: ["soccer/fra.1"], facup: ["soccer/eng.fa"],
  intl: ["soccer/fifa.friendly", "soccer/uefa.nations", "soccer/concacaf.nations.league", "soccer/uefa.euroq", "soccer/fifa.worldq.uefa", "soccer/fifa.worldq.conmebol", "soccer/fifa.worldq.concacaf", "soccer/concacaf.gold", "soccer/conmebol.america", "soccer/fifa.world"],
};
const DEFAULTS = { enabled: true, brief: { on: true, hour: 9, myTeams: true, lineup: true, topGames: true }, reminders: { lineup: true, myTeams: true },
  finals: { myTeams: true, lineup: false }, live: { myTeams: false }, upsets: { on: false },
  close: { lineup: true, myTeams: true }, ot: { lineup: true, myTeams: true }, goals: { myTeams: false }, lead: 0,
  liveAct: { on: true, lineup: true, myTeams: false }, quiet: { on: true, start: 23, end: 8 }, days: [0, 1, 2, 3, 4, 5, 6], spoilerFree: false };
const LEAGUE_NAME = { nfl: "NFL", ncaaf: "College Football", nba: "NBA", wnba: "WNBA", ncaam: "Men's College Hoops", ncaaw: "Women's College Hoops", nhl: "NHL", mlb: "MLB", mls: "MLS",
  epl: "Premier League", ucl: "Champions League", uel: "Europa League", laliga: "LaLiga", seriea: "Serie A", bundesliga: "Bundesliga", ligue1: "Ligue 1", facup: "FA Cup", intl: "International" };
const NATIONAL = ["ABC", "CBS", "NBC", "FOX", "ESPN", "ESPN2", "ESPNU", "ESPNEWS", "TNT", "TBS", "truTV", "FS1", "FS2", "CBSSN", "USA", "NBA TV", "NHL Network", "MLB Network", "NFL Network", "BTN", "SEC Network", "ACC Network", "CW", "Prime Video", "Peacock", "Netflix"];
const BIG_NET = ["ABC", "CBS", "NBC", "FOX", "ESPN", "TNT", "Prime Video", "Netflix"];
const COLLEGE = { ncaaf: 1, ncaam: 1, ncaaw: 1 };
const SPORT = { nba: "bball", wnba: "bball", ncaam: "bball", ncaaw: "bball", nfl: "football", ncaaf: "football", nhl: "hockey", mlb: "baseball",
  mls: "soccer", epl: "soccer", ucl: "soccer", uel: "soccer", laliga: "soccer", seriea: "soccer", bundesliga: "soccer", ligue1: "soccer", facup: "soccer", intl: "soccer" };

// ---------- Supabase ----------
function sbHeaders(env) { return { apikey: env.SUPABASE_SECRET, Authorization: "Bearer " + env.SUPABASE_SECRET }; }
async function getDocs(env, paths) {
  const q = paths.map((p) => encodeURIComponent(p)).join(",");
  const r = await fetch(`${SB}/rest/v1/docs?select=path,data&path=in.(${q})`, { headers: sbHeaders(env) });
  const out = {}; if (!r.ok) return out;
  for (const x of await r.json()) out[x.path] = x.data;
  return out;
}
async function putDoc(env, path, data) {
  await fetch(`${SB}/rest/v1/rpc/mirror_doc`, { method: "POST", headers: Object.assign({ "Content-Type": "application/json" }, sbHeaders(env)), body: JSON.stringify({ p_path: path, p_data: data, p_merge: false }) });
}

// ---------- time (Central) ----------
function ctParts(t, tz) {
  const f = new Intl.DateTimeFormat("en-US", { timeZone: tz || "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", weekday: "short", hour12: false });
  const p = {}; for (const x of f.formatToParts(t)) p[x.type] = x.value;
  return { date: `${p.year}-${p.month}-${p.day}`, hour: Number(p.hour) % 24, wd: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p.weekday) };
}
// times in each person's own time zone (saved by their phone with their alert settings)
let TZ = "America/Chicago";
function clock(t) { return new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit" }).format(t); }
function etDay(t) { const f = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }); return f.format(t).replace(/-/g, ""); }

// ---------- base64url ----------
const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
function unb64u(s) { s = s.replace(/-/g, "+").replace(/_/g, "/"); s += "===".slice((s.length + 3) % 4); const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
const cat = (...a) => { const n = a.reduce((s, x) => s + x.length, 0), o = new Uint8Array(n); let i = 0; for (const x of a) { o.set(x, i); i += x.length; } return o; };
const enc = new TextEncoder();

// ---------- Web Push (RFC 8291 aes128gcm + VAPID) ----------
async function hmac(key, data) { const k = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]); return new Uint8Array(await crypto.subtle.sign("HMAC", k, data)); }
let VAPID_KEY = null;
async function vapidKey(env) {
  if (VAPID_KEY) return VAPID_KEY;
  const d = new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode("slate-vapid|" + env.SUPABASE_SECRET)));
  const pub = unb64u(VAPID_PUBLIC);
  VAPID_KEY = await crypto.subtle.importKey("jwk", { kty: "EC", crv: "P-256", d: b64u(d), x: b64u(pub.slice(1, 33)), y: b64u(pub.slice(33, 65)), ext: true }, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  return VAPID_KEY;
}
async function vapidAuth(env, endpoint) {
  const aud = new URL(endpoint).origin;
  const h = b64u(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const c = b64u(enc.encode(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: "https://slate.djvillhard.workers.dev" })));
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, await vapidKey(env), enc.encode(h + "." + c));
  return `vapid t=${h}.${c}.${b64u(sig)}, k=${VAPID_PUBLIC}`;
}
export async function encryptPush(sub, text) {
  const uaPub = unb64u(sub.keys.p256dh), auth = unb64u(sub.keys.auth);
  const as = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const asPub = new Uint8Array(await crypto.subtle.exportKey("raw", as.publicKey));
  const uaKey = await crypto.subtle.importKey("raw", uaPub, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, as.privateKey, 256));
  const prkKey = await hmac(auth, shared);
  const ikm = (await hmac(prkKey, cat(enc.encode("WebPush: info\0"), uaPub, asPub, new Uint8Array([1])))).slice(0, 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const prk = await hmac(salt, ikm);
  const cek = (await hmac(prk, cat(enc.encode("Content-Encoding: aes128gcm\0"), new Uint8Array([1])))).slice(0, 16);
  const nonce = (await hmac(prk, cat(enc.encode("Content-Encoding: nonce\0"), new Uint8Array([1])))).slice(0, 12);
  const key = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, key, cat(enc.encode(text), new Uint8Array([2]))));
  const rs = new Uint8Array([0, 0, 16, 0]);
  return cat(salt, rs, new Uint8Array([asPub.length]), asPub, ct);
}
export async function sendPush(env, sub, msg) {
  const body = await encryptPush(sub, JSON.stringify(msg));
  const r = await fetch(sub.endpoint, { method: "POST", body, headers: { "Content-Encoding": "aes128gcm", "Content-Type": "application/octet-stream", TTL: "3600", Urgency: "high", Authorization: await vapidAuth(env, sub.endpoint) } });
  return r.status;
}

// ---------- Apple push (the Slate iPhone app) ----------
// Set in Cloudflare (Workers > slate > Settings > Variables and Secrets), never in the repo:
//   APNS_KEY     the .p8 key file's text (-----BEGIN PRIVATE KEY----- ...)
//   APNS_KEY_ID  the key's 10-character ID     APNS_TEAM_ID  the developer team ID
// Until they exist, app subscriptions simply wait (web push keeps working).
let APNS = null;
async function apnsCreds(env) {
  if (APNS && Date.now() - APNS.at < 10 * 60000) return APNS.key ? APNS : null;
  const pem = String(env.APNS_KEY || ""), kid = String(env.APNS_KEY_ID || "").trim(), team = String(env.APNS_TEAM_ID || "").trim();
  if (!pem || !kid || !team) { APNS = { at: Date.now(), key: null }; return null; }
  const b64 = pem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const der = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", der, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  APNS = { at: Date.now(), key, kid, team, topic: String(env.APNS_TOPIC || "com.djvillhard.slate"), jwt: "", jwtAt: 0 };
  return APNS;
}
async function apnsJwt(a) {
  if (a.jwt && Date.now() - a.jwtAt < 40 * 60000) return a.jwt;  // Apple wants a fresh token at most every 20-60 minutes
  const h = b64u(enc.encode(JSON.stringify({ alg: "ES256", kid: a.kid })));
  const c = b64u(enc.encode(JSON.stringify({ iss: a.team, iat: Math.floor(Date.now() / 1000) })));
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, a.key, enc.encode(h + "." + c));
  a.jwt = `${h}.${c}.${b64u(sig)}`; a.jwtAt = Date.now();
  return a.jwt;
}
export async function apnsReady(env) { return !!(await apnsCreds(env)); }
// one APNs request; 410 means the token is gone
async function apnsPost(env, token, envName, extra, payload) {
  const a = await apnsCreds(env); if (!a) return 0;
  const host = envName === "sandbox" ? "https://api.sandbox.push.apple.com" : "https://api.push.apple.com";
  const headers = Object.assign({ authorization: "bearer " + (await apnsJwt(a)), "content-type": "application/json" }, extra(a.topic));
  const r = await fetch(`${host}/3/device/${encodeURIComponent(token)}`, { method: "POST", headers, body: JSON.stringify(payload) });
  if (r.status === 200) return 200;
  let reason = ""; try { reason = (await r.json()).reason || ""; } catch (e) {}
  console.log("apns", r.status, reason);
  if (r.status === 410 || reason === "BadDeviceToken" || reason === "Unregistered" || reason === "DeviceTokenNotForTopic") return 410;
  return r.status;
}
// ---------- broadcast channels (3.28.0): one APNs channel per game; every live notification for it listens there ----------
// Channel management lives on its own host and port; production 2196, sandbox 2195.
export async function bcRequest(env, envName, method, path, body, hdrs) {
  const a = await apnsCreds(env); if (!a) return { status: 0 };
  const host = envName === "sandbox" ? "https://api-manage-broadcast.sandbox.push.apple.com:2195" : "https://api-manage-broadcast.push.apple.com:2196";
  const headers = Object.assign({ authorization: "bearer " + (await apnsJwt(a)), "content-type": "application/json" }, hdrs || {});
  try {
    const r = await fetch(`${host}/1/apps/${a.topic}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
    let text = ""; try { text = await r.text(); } catch (e) {}
    return { status: r.status, channel: r.headers.get("apns-channel-id") || "", text: text.slice(0, 300) };
  } catch (e) { return { status: -1, text: String(e).slice(0, 300) }; }
}
// The game → channel record, shared by every account: bc/channels = { games: { [id]: { production, sandbox, at, k, end } } }
let BC_OFF = 0;  // the broadcast capability isn't on (yet): don't ask again for 10 minutes
export async function bcChannel(env, doc, id, envName) {
  doc.games = doc.games || {};
  const g = doc.games[id] = doc.games[id] || {};
  if (g[envName]) return g[envName];
  if (BC_OFF && Date.now() - BC_OFF < 10 * 60000) return "";
  const r = await bcRequest(env, envName, "POST", "/channels", { "message-storage-policy": 1, "push-type": "LiveActivity" });
  if ((r.status === 201 || r.status === 200) && r.channel) { g[envName] = r.channel; g.at = new Date().toISOString(); doc.dirty = true; return r.channel; }
  if (/BroadcastFeatureNotEnabled/.test(r.text || "")) BC_OFF = Date.now();
  console.log("bc channel", r.status, r.text);
  return "";
}
async function bcSend(env, envName, channel, event, body, prio) {
  const a = await apnsCreds(env); if (!a) return 0;
  const host = envName === "sandbox" ? "https://api.sandbox.push.apple.com" : "https://api.push.apple.com";
  const r = await fetch(`${host}/4/broadcasts/apps/${a.topic}`, { method: "POST",
    headers: { authorization: "bearer " + (await apnsJwt(a)), "content-type": "application/json", "apns-channel-id": channel, "apns-push-type": "liveactivity", "apns-priority": String(prio),
      "apns-expiration": String(Math.floor(Date.now() / 1000) + 4 * 3600) },  // required for broadcasts (without it APNs answers BadExpirationDate)
    body: JSON.stringify({ aps: Object.assign({ timestamp: Math.floor(Date.now() / 1000), event }, body) }) });
  let t = ""; if (r.status !== 200) { try { t = await r.text(); } catch (e) {} console.log("bc send", r.status, t.slice(0, 200)); }
  BC_LAST = { status: r.status, text: t.slice(0, 300), id: r.headers.get("apns-id") || "" };
  return r.status;
}
let BC_LAST = null;
export async function bcTest(env, channel, state) { BC_LAST = null; await bcSend(env, "production", channel, "update", { "content-state": state, "stale-date": Math.floor(Date.now() / 1000) + 600 }, 5); return BC_LAST; }
export async function bcLoad(env) { const d = (await getDocs(env, ["bc/channels"]))["bc/channels"] || {}; d.games = d.games || {}; return d; }
export async function bcSave(env, doc) {
  const cut = Date.now() - 2 * 864e5, games = {};
  for (const [i, g] of Object.entries(doc.games || {})) if (Date.parse(g.at || 0) > cut) games[i] = g;
  await putDoc(env, "bc/channels", { games, updatedAt: new Date().toISOString() });
}
// a game's channel is shared by everyone following it: keep the line someone's phone shared, if the next person has none
function bcPick(had, st) { let o = had && had.pv && !st.pv ? Object.assign({}, st, { pv: had.pv, line: had.line }) : st; if (had && had.tag && !o.tag) o = Object.assign({}, o, { tag: had.tag }); return o; }
let BC = null;  // this run's channel record, and the games whose channel needs this minute's score

// same return shape as sendPush: an HTTP status, with 410 meaning "this phone's token is gone, drop it"
// 3.32.0: each alert carries Apple's interruption level (msg.level: "active" lights the screen and plays the sound,
// "passive" goes quietly to the list; never Time Sensitive or Critical) and stacks with its game in Notification Center
// (msg.thread, "game-<id>"); without them it's Active, stacked under Slate
export async function sendApns(env, sub, msg) {
  const title = String(msg.title || "").trim(), passive = msg.level === "passive";
  const aps = { alert: title ? { title, body: msg.body } : { body: msg.body }, "interruption-level": passive ? "passive" : "active", "thread-id": String(msg.thread || "slate").slice(0, 64) };
  if (!passive) aps.sound = "default";
  const payload = { aps, tag: msg.tag || "", game: msg.game || "" };
  return apnsPost(env, sub.apns, sub.env, (topic) => Object.assign({ "apns-topic": topic, "apns-push-type": "alert", "apns-priority": "10", "apns-expiration": String(Math.floor(Date.now() / 1000) + 3600) }, msg.tag ? { "apns-collapse-id": String(msg.tag).slice(0, 64) } : {}), payload);
}

// ---------- live notifications (Live Activities in the iPhone app) ----------
// The app reports a "start" token (lets Slate start a live notification) and one token per running game
// (to update and end it) to <prefix>prefs/liveacts. Each game's state lives in sent-<D>.la[id] = {k, n, end}.
// 3.68.0 (DJ): the live notification's header, "Slate • CBB", with short league codes
const LA_CODE = { nfl: "NFL", ncaaf: "CFB", nba: "NBA", wnba: "WNBA", ncaam: "CBB", ncaaw: "WCBB", nhl: "NHL", mlb: "MLB", mls: "MLS",
  epl: "EPL", ucl: "UCL", uel: "UEL", laliga: "LaLiga", seriea: "Serie A", bundesliga: "Bundesliga", ligue1: "Ligue 1", facup: "FA Cup", intl: "Intl" };
function laAttrs(id, g, s) {
  const at = { gameId: id, league: `Slate • ${LA_CODE[g.league] || String(g.league || "").toUpperCase()}`, away: g.awayShort || g.away || "", home: g.homeShort || g.home || "",
    awayAbbr: s.aa || g.awayAbbr || (g.awayShort || g.away || "").slice(0, 3).toUpperCase(), homeAbbr: s.ha || g.homeAbbr || (g.homeShort || g.home || "").slice(0, 3).toUpperCase(), awayColor: s.ac || g.awayColor || "", homeColor: s.hc || g.homeColor || "",
    // 3.20.0, the scorebug design: each chip's second-color stripe, college ranks, and the channel for the Watch button (all optional in the app)
    awayAlt: s.ax || g.awayAlt || "", homeAlt: s.hx || g.homeAlt || "", channel: String((g.tv || [])[0] || "") };
  for (const side of ["away", "home"]) { const r = Number(g[side + "Rank"]); if (COLLEGE[g.league] && Number.isInteger(r) && r > 0 && r < 26) at[side + "Rank"] = r; }  // a whole number, or the app can't read the notification
  // 3.67.0: ESPN's logo for each team ("nba/bos.png"); the app draws it in place of the chip once it has saved it
  const al = s.al || logoSeg(g.awayLogo), hl = s.hl || logoSeg(g.homeLogo); if (al) at.awayLogo = al; if (hl) at.homeLogo = hl;
  return at;
}
// "https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/bos.png" -> "nba/bos.png" (the same name the page uses)
function logoSeg(href) { const m = /\/i\/teamlogos\/([a-z0-9]+)\/500(?:-dark)?\/(?:scoreboard\/)?([\w-]+\.png)/i.exec(String(href || "")); return m ? `${m[1]}/${m[2]}`.toLowerCase() : ""; }
// each person's preview lines for today, shared by their phone from the slate (prefs/pvlines, 3.58.0): game id → line
let PVL = {}, LVL = {}, TGL = {};
// 3.66.3: a one-liner made to fit a live notification instead of being cut mid-word: the first part of a two-part line
// ("Warriors are without Curry; Pelicans have lost five in a row" -> "Warriors are without Curry"), else whole words
// and "…". Soccer scorers drop the away side's first names already, so they fit two lines.
function fitLine(t, n) {
  t = String(t || "").replace(/\s+/g, " ").trim(); if (t.length <= n) return t;
  // 3.71.3: "and" starting a second clause counts as two parts too ("Chargers are without WR McConkey and have lost five")
  const first = t.split(/;\s+|\s+·\s+(?=[A-Z]{2,4} )|,?\s+and\s+(?=(?:have|has|are|is|were|was|won|lost|lead|leads|trail|trails)\b)/)[0];
  if (first.length <= n && first.length >= 12 && !/ · /.test(t)) return first;
  const cut = t.slice(0, n - 1), sp = cut.lastIndexOf(" ");
  return (sp > n * 0.6 ? cut.slice(0, sp) : cut).replace(/[,;:·\s]+$/, "") + "…";
}
// 3.66.3: a standout made short enough for one line: last name and the first three numbers
// ("V. Wembanyama 26 PTS, 10 REB, 6 AST, 5 BLK" -> "Wembanyama 26 PTS 10 REB 6 AST")
function standout(ath, val) {
  const nm = String(ath.shortName || ath.displayName || "").replace(/^[A-Z]\.\s+/, "").trim();
  const v = String(val || "").split(/,\s*/).filter(Boolean).slice(0, 3).join(" ");
  return `${nm} ${v}`.replace(/\s+/g, " ").trim().slice(0, 34);
}
function laState(s, id) {
  const x = (s.ld || []).slice().sort((a, b) => b.v - a.v)[0];
  const st = { a: s.a || 0, h: s.h || 0, detail: s.state === "post" ? (s.detail || "Final") : (s.detail || ""), state: s.state };
  if (x && x.n && x.d) st.line = `${x.n} ${x.d}`.slice(0, 60);
  // football, while the ball is live: who has it and the down ("2nd & 7 at BC 34"), straight from ESPN; left out when ESPN has none
  if (s.state === "in" && (s.po === "away" || s.po === "home")) st.poss = s.po;
  // "MIN ball · 3rd & 4 at GB 35" (3.25.1: who has it, in words too, beside the football icon)
  // 3.71.3 (DJ): just the down and the spot ("1st & 10 at BAL 6"): the football icon by the team name already says who has it
  if (s.state === "in" && s.dd) { const who = s.po === "away" ? s.aa : s.po === "home" ? s.ha : ""; st.sit = (s.po ? String(s.dd) : (who ? who + " ball · " : "") + String(s.dd)).slice(0, 44); }
  // the expanded island's extra lines (3.38.0; builds before it ignore them)
  if (s.state === "in" || s.state === "post") for (const k of ["ap", "hp", "ox", "op", "at", "ht", "lp", "wp"]) if (s[k]) st[k] = s[k];
  // the slate's preview line for the game, while it's on (after the final it's old news)
  if (s.state === "in" && id && PVL[id]) st.pv = String(PVL[id]).slice(0, 140);
  // 3.61.1: the slate's red live one-liner, the line the slate card shows while the game is on: in place of the preview
  // line for new builds, and as the one-liner older builds show. 3.64.0: the last one shared stays until a newer one
  // comes, so the notification never falls back to the preview line while the card shows a live one
  if (s.state === "in" && id && LVL[id]) { st.pv = String(LVL[id]).slice(0, 140); st.line = st.pv.slice(0, 60); }
  // 3.64.0, soccer with a goal: the scorers and minutes instead (live notifications only, not the slate card)
  if (s.state === "in" && s.gl) { st.pv = String(s.gl).slice(0, 140); st.line = st.pv.slice(0, 60); }
  // 3.85.0: the same scorers split by side for the face-off card (it shows these instead of the line above)
  if (s.state !== "pre" && s.gl) { if ((s.ag || []).length) st.ag = s.ag.map((x) => String(x).slice(0, 40)); if ((s.hg || []).length) st.hg = s.hg.map((x) => String(x).slice(0, 40)); }
  // 3.85.0, football: the ball's spot and the drive's start for the field bar
  if (st.poss && Number.isFinite(s.yl)) { st.yl = s.yl; if (Number.isFinite(s.ds)) st.ds = s.ds; }
  // 3.68.0 (DJ): the line is a second thing to know about the game, never the standout's own numbers again. A line
  // about that player gives way to ESPN's win chance, then the two teams' shooting, then the slate's preview line
  if (s.state === "in" && s.tn) {
    const last = String(s.tn).split(" ").slice(-1)[0], about = (t) => !!t && last.length >= 3 && String(t).includes(last);
    if (!st.pv || about(st.pv)) {
      const fg = (t) => (/FG (\d+)%/.exec(t || "") || [])[1];
      const shoot = fg(s.at) && fg(s.ht) ? `Shooting: ${s.aa} ${fg(s.at)}% · ${s.ha} ${fg(s.ht)}%` : "";
      const alt = [s.wp, shoot, id && PVL[id]].find((t) => t && !about(t));
      if (alt) st.pv = String(alt); else delete st.pv;
    }
  }
  // 3.68.0: the slate card's tag for the header ("Slate • CBB  Upset watch"); app builds before 44 ignore it
  if (s.state === "in" && id && TGL[id]) st.tag = String(TGL[id]).slice(0, 24);
  // 3.75.1: the Dynamic Island shows win chance on a line of its own; leave it off when the one-liner is there, so the
  // island has two lines under the scores (the last play and the one-liner)
  if (st.pv && st.wp) delete st.wp;
  // 3.66.3: sized to fit. Under the two standouts the Lock Screen has one line (about 44 letters); alone it has two
  if (st.pv) { st.pv = fitLine(st.pv, st.ap || st.hp || st.op ? 44 : 80); st.line = fitLine(st.pv, 60); }
  return st;
}
// before kickoff: 0-0, the start time where the clock goes, the channel on the line under it (current app builds show both)
function preState(g, kick, id) {
  const tv = String((g.tv || [])[0] || ""), st = { a: 0, h: 0, detail: Date.now() >= kick ? "Starting" : clock(new Date(kick)), state: "pre" };
  if (tv) st.line = `On ${tv}`.slice(0, 60);
  // the slate's preview line (3.58.0): its own field for new builds, and the one-liner for older ones
  if (id && PVL[id]) { st.pv = fitLine(PVL[id], 80); st.line = fitLine(st.pv, 60); }
  if (id && TGL[id]) st.tag = String(TGL[id]).slice(0, 24);
  return st;
}
async function sendLive(env, tok, event, body, prio) {
  const aps = Object.assign({ timestamp: Math.floor(Date.now() / 1000), event }, body);
  return apnsPost(env, tok.token, tok.env, (topic) => ({ "apns-topic": topic + ".push-type.liveactivity", "apns-push-type": "liveactivity", "apns-priority": String(prio) }), { aps });
}
// returns true when liveacts (tokens) changed
async function runLive(env, p, sent, la, ids, games, sc, silent) {
  const cfg = p.liveAct || {}; let gone = false;
  // each game's own switch, from its tray on the slate (3.21.0): 1 = on even where the rules leave it out, 0 = off even where they'd include it
  const per = cfg.games && typeof cfg.games === "object" ? cfg.games : {};
  const want = new Set(); if (cfg.lineup) ids.slate.forEach((i) => want.add(i)); if (cfg.myTeams) ids.mine.forEach((i) => want.add(i));
  for (const [i, v] of Object.entries(per)) { if (v === 1) want.add(i); else if (v === 0) want.delete(i); }
  const running = Object.values(sent.la).filter((x) => !x.end).length;
  let started = 0;
  for (const id of new Set(Object.keys(sent.la).concat([...want]))) {  // each game once a minute
    const g = games[id], s = sc[id]; if (!g || !s) continue;
    let cur = sent.la[id];
    // before kickoff (3.32.0): a new one starts 10 minutes early, showing 0-0 with the start time and channel
    const kick = Date.parse(s.start || g.start) || 0, soon = s.state === "pre" && kick > 0 && Date.now() >= kick - 10 * 60000 && Date.now() - kick <= 60 * 60000;
    if (s.state === "pre" && !cur && !soon) continue;
    const st = s.state === "pre" ? preState(g, kick, id) : laState(s, id), key = `${st.a}-${st.h}-${st.detail}-${st.sit || ""}-${st.lp || ""}-${st.ap || ""}-${st.hp || ""}-${st.pv || ""}-${st.tag || ""}`;
    let tok = (la.acts || {})[id];
    // switched off on the slate while it's showing (live, or a final still on the Lock Screen): off right away
    if (cur && !cur.off && per[id] === 0) {
      cur.end = 1; cur.off = 1; cur.offAt = Date.now();
      if (tok) await sendLive(env, tok, "end", { "content-state": st, "dismissal-date": Math.floor(Date.now() / 1000) }, 10);
      continue;
    }
    // switched back on: start it over (its old token belonged to the one that ended). After the final, only when asked by name.
    // (a token newer than the switch-off belongs to the one the app just started itself: keep it)
    if (cur && cur.end && cur.off && want.has(id) && (s.state === "in" || (s.state === "post" && per[id] === 1))) { delete sent.la[id]; if (la.acts && la.acts[id] && !(Date.parse(la.acts[id].at) > (cur.offAt || 0))) { delete la.acts[id]; gone = true; } cur = undefined; }
    // started by the app the moment you switched it on (3.23.2): take it over and keep it current, instead of starting a second one
    tok = (la.acts || {})[id];
    if (!cur && tok && Date.now() - Date.parse(tok.at) < 3 * 3600000 && want.has(id)) cur = sent.la[id] = tok.ch ? { k: "", n: 1, app: 1, ch: 1 } : { k: "", n: 1, app: 1 };
    if (tok && tok.ch && cur && !cur.ch && !cur.end) cur.ch = 1;
    if (tok && tok.ch) tok = null;  // listening on the game's channel: no token of its own
    if (!cur) {
      // a new one: only for a game that's live now, while alerts are on and not held back. A game switched on by name
      // on the slate starts even with the rules off or during quiet hours: that tap asked for it.
      // A finished game starts only when asked by name (3.22.0): its final score, kept on the Lock Screen like any final.
      const asked = per[id] === 1, fin = s.state === "post";
      if (!want.has(id) || !(s.state === "in" || soon || (fin && asked)) || !(cfg.on || asked) || (silent && !asked) || !(la.start || []).length || running + started >= 4) continue;
      const at = laAttrs(id, g, s), body = { "attributes-type": "SlateGameAttributes", attributes: at, "content-state": st,
        alert: { title: `${at.away} @ ${at.home}`, body: soon ? (kick > Date.now() ? `Starts at ${clock(new Date(kick))}` : "Starting now") + (at.channel ? ` on ${at.channel}` : "")
          : `${fin ? "Final" : "Live now"}: ${at.awayAbbr} ${st.a}, ${at.homeAbbr} ${st.h}` } };
      // started listening on the game's broadcast channel (3.28.0) when there is one: its updates then reach it whether
      // or not the phone ever hands back a token
      let ch = false;
      for (const t of la.start) {
        const c = BC ? await bcChannel(env, BC.doc, id, t.env) : "";
        const r = await sendLive(env, t, "start", c ? Object.assign({ "input-push-channel": c }, body) : body, 10);
        if (c && r === 200) ch = true;
        if (r === 410) { t.gone = true; gone = true; }
      }
      sent.la[id] = ch ? { k: key, n: 1, ch: 1 } : { k: key, n: 1 }; started++;
      if (ch && BC) BC.want[id] = bcPick(BC.want[id], st);
      continue;
    }
    if (cur.end) continue;
    // on the game's channel: the score goes out once for everyone after this loop; the final ends it there too
    if (cur.ch) { if (BC) BC.want[id] = bcPick(BC.want[id], st); if (s.state === "post") cur.end = 1; else cur.k = key; continue; }
    if (s.state === "post") {
      // one started for a finished game has no token for a moment: wait a few minutes for it, so it can be ended properly
      if (!tok && (cur.w || 0) < 5) { cur.w = (cur.w || 0) + 1; continue; }
      cur.end = 1;
      if (tok) await sendLive(env, tok, "end", { "content-state": st, "dismissal-date": Math.floor(Date.now() / 1000) + 4 * 3600 }, 10);  // 4 hours: the longest iOS keeps an ended one (you can swipe it away sooner)
      continue;
    }
    if (!tok || cur.k === key) continue;
    const scored = !cur.k.startsWith(`${st.a}-${st.h}-`);
    const r = await sendLive(env, tok, "update", { "content-state": st, "stale-date": Math.floor(Date.now() / 1000) + 10 * 60 }, scored ? 10 : 5);
    if (r === 410) { delete la.acts[id]; gone = true; cur.end = 1; (p.__off = p.__off || []).push(id); } else cur.k = key;  // gone from the phone (swiped away): its switch goes off
  }
  if (gone) la.start = (la.start || []).filter((t) => !t.gone);
  return gone;
}

// ---------- the live scoreboard (3.23.0): up to four games picked on the slate, in one live notification ----------
// Its settings: prefs/notify liveAct.board = { on, ids: [game ids, start order], at: when it was last switched on or changed }.
// Its state for the day: sent-<D>.board = { k, t (started), lead, sc (scores), end, off, w }.
function boardGame(id, g, s) {
  s = s || {};
  const at = laAttrs(id, g, s), st = s.state === "in" || s.state === "post" ? s.state : "pre";
  const kick = Date.parse(s.start || g.start) || 0;
  // past the start time but not under way yet (tip-off comes a few minutes after the listed time): "Starting", not a time already gone
  const d = st === "pre" ? (kick > 0 && Date.now() >= kick ? "Starting" : clock(new Date(s.start || g.start))) : st === "post" ? (s.detail || "Final") : (s.detail || "");
  return { id, aa: at.awayAbbr, ha: at.homeAbbr, ac: at.awayColor, hc: at.homeColor, ax: at.awayAlt, hx: at.homeAlt,
    ...(at.awayLogo ? { al: at.awayLogo } : {}), ...(at.homeLogo ? { hl: at.homeLogo } : {}),
    a: st === "pre" ? 0 : (s.a || 0), h: st === "pre" ? 0 : (s.h || 0), d: String(d).slice(0, 24), s: st,
    // live football (3.25.0): who has the ball and the down and yardage line, when ESPN reports them
    ...(st === "in" && (s.po === "away" || s.po === "home") ? { p: s.po } : {}), ...(st === "in" && s.dd ? { dd: String(s.dd).slice(0, 32) } : {}),
    // 3.30.0, before kickoff: the start (seconds), the channel, and c once it's within the hour (the Dynamic Island counts down)
    ...(st === "pre" && kick > 0 ? { t: Math.floor(kick / 1000) } : {}), ...(st === "pre" && at.channel ? { tv: String(at.channel).slice(0, 16) } : {}),
    ...(st === "pre" && kick > 0 && kick - Date.now() <= 3600000 ? { c: true } : {}) };
  // no one-liner (ln) on the Board: DJ wants those only on single-game live notifications (3.65.8; the app still
  // reads ln if it's ever sent again)
}
async function runBoard(env, p, sent, la, games, sc) {
  const b = (p.liveAct || {}).board || {}; let gone = false;
  const ids = (Array.isArray(b.ids) ? b.ids : []).map(String).filter((i) => games[i]).slice(0, 4);
  const now = Date.now(), at = Number(b.at) || 0, list = ids.map((i) => boardGame(i, games[i], sc[i]));
  let cur = sent.board, tok = la.board && la.board.token ? la.board : null;
  // switched off, or nothing picked for today: take it down now
  if (!b.on || !list.length) {
    if (cur && !cur.off) {
      if (!tok && !cur.end && (cur.w || 0) < 5) { cur.w = (cur.w || 0) + 1; return gone; }  // just started: wait a minute or two for its token
      cur.end = 1; cur.off = 1;
      if (tok) await sendLive(env, tok, "end", { "content-state": { games: list }, "dismissal-date": Math.floor(now / 1000) }, 10);
    }
    return gone;
  }
  // switched on again, or the picks changed, after the last one ended: a fresh one
  // (a token from after the switch-on belongs to the one the app just started itself: keep it)
  const fresh = tok && Date.parse(tok.at) >= at - 60000;
  if (cur && cur.end && at > (cur.t || 0)) { cur = sent.board = null; if (la.board && !fresh) { delete la.board; gone = true; tok = null; } }
  const key = list.map((x) => `${x.id}:${x.a}-${x.h}-${x.d}-${x.p || ""}-${x.dd || ""}${x.c ? "-c" : ""}-${x.aa}${x.ac}${x.ha}${x.hc}${x.ln ? "~" + x.ln : ""}`).join("|"), scores = {};
  for (const x of list) scores[x.id] = `${x.a}-${x.h}`;
  // the game the Dynamic Island shows on its own: the one that last scored, else the first one live
  let lead = cur && cur.lead ? list.findIndex((x) => x.id === cur.lead) : -1;
  if (cur && cur.sc) list.forEach((x, i) => { if (cur.sc[x.id] && cur.sc[x.id] !== scores[x.id]) lead = i; });
  if (lead < 0) lead = Math.max(0, list.findIndex((x) => x.s === "in"));
  const state = { games: list, lead }, live = list.some((x) => x.s === "in"), done = list.every((x) => x.s === "post");
  const soon = list.some((x) => x.s === "pre" && Date.parse((sc[x.id] || {}).start || games[x.id].start) - now <= 15 * 60000);
  // started by the app the moment you tapped Show on Lock Screen (3.23.2): take it over and keep it current
  if (!cur && fresh) cur = sent.board = { k: "", t: now, lead: list[lead].id, sc: scores, app: 1 };
  if (!cur) {
    // it starts 15 minutes before the first pick (a live notification only lasts 8 hours), or right away once one is on
    if (!(live || soon || done) || !(la.startBoard || []).length) return gone;
    const body = { "attributes-type": "SlateBoardAttributes", attributes: { title: "Your slate" }, "content-state": state,
      alert: { title: "Your slate", body: list.map((x) => x.s === "pre" ? `${x.aa} @ ${x.ha} ${x.d}` : `${x.aa} ${x.a}, ${x.ha} ${x.h}`).join(" · ") } };
    for (const t of la.startBoard) { const r = await sendLive(env, t, "start", body, 10); if (r === 410) { t.gone = true; gone = true; } }
    if (gone) la.startBoard = la.startBoard.filter((t) => !t.gone);
    sent.board = { k: key, t: now, lead: list[lead].id, sc: scores };
    return gone;
  }
  if (cur.end) return gone;
  if (done) {
    // all four over: ended with the finals showing (up to 4 hours); a new one waits a few minutes for its token
    if (!tok && (cur.w || 0) < 5) { cur.w = (cur.w || 0) + 1; return gone; }
    cur.end = 1;
    if (tok) await sendLive(env, tok, "end", { "content-state": state, "dismissal-date": Math.floor(now / 1000) + 4 * 3600 }, 10);
    return gone;
  }
  if (!tok || cur.k === key) return gone;
  const scored = list.some((x) => cur.sc && cur.sc[x.id] && cur.sc[x.id] !== scores[x.id]);
  const r = await sendLive(env, tok, "update", { "content-state": state, "stale-date": Math.floor(now / 1000) + 10 * 60 }, scored ? 10 : 5);
  if (r === 410) { delete la.board; gone = true; cur.end = 1; } else { cur.k = key; cur.sc = scores; cur.lead = list[lead].id; }
  return gone;
}

// ---------- alert rules (same as the old hourly run) ----------
function merged(p) {
  const out = JSON.parse(JSON.stringify(DEFAULTS));
  for (const [k, v] of Object.entries(p || {})) { if (v && typeof v === "object" && !Array.isArray(v) && out[k] && typeof out[k] === "object") Object.assign(out[k], v); else out[k] = v; }
  return out;
}
function side(g, s) { const r = g[s + "Rank"]; return (r && COLLEGE[g.league] ? `No. ${r} ` : "") + (g[s + "Short"] || g[s] || ""); }
function matchup(g) { const tv = g.tv || []; return `${side(g, "away")} @ ${side(g, "home")}` + (tv.length ? ` on ${tv[0]}` : ""); }
function inQuiet(p, hr) { const q = p.quiet || {}; if (!q.on) return false; const a = Number(q.start ?? 23), b = Number(q.end ?? 8); return a < b ? (hr >= a && hr < b) : a > b ? (hr >= a || hr < b) : false; }
function lateTrailing(g, s) {
  const det = String(s.detail || ""), lg = g.league, a = Number(s.a), h = Number(s.h);
  if (isNaN(a) || isNaN(h)) return null;
  let late, need;
  if (lg === "ncaaf") { late = /\b(3rd|4th|OT)\b/.test(det); need = 8; }
  else if (lg === "ncaaw") { late = /\b(3rd|4th|Q3|Q4|OT)\b/.test(det); need = 7; }
  else { late = /\b(2nd|OT)\b/.test(det); need = 7; }
  if (!late) return null;
  const ra = g.awayRank || 99, rh = g.homeRank || 99;
  if (a < h && ra < rh && h - a >= need) return ["away", "home"];
  if (h < a && rh < ra && a - h >= need) return ["home", "away"];
  return null;
}
function topGames(games, sc, skip, now) {
  const score = (g) => {
    const tv = g.tv || []; if (!tv.some((t) => NATIONAL.includes(t))) return -1;
    let s = 0; const ra = g.awayRank, rh = g.homeRank;
    if (ra && rh) s += 10 + (50 - ra - rh) / 10; else if (ra || rh) s += 4;
    if (tv.some((t) => BIG_NET.includes(t))) s += 3;
    if (["nfl", "nba", "epl", "ucl"].includes(g.league)) s += 2;
    const t = new Date((sc[g.id] || {}).start || g.start); const hr = ctParts(t).hour; if (hr >= 18 && hr <= 21) s += 2;
    return s;
  };
  return games.filter((g) => !skip.has(g.id) && new Date(g.start) > now).map((g) => [score(g), g]).filter((x) => x[0] > 0).sort((a, b) => b[0] - a[0]).slice(0, 3).map((x) => x[1]);
}
function dueAlerts(p, sent, games, byid, sc, slate, mine, customs, now) {
  const spoil = !!p.spoilerFree, out = [];
  const startOf = (i) => { const s = sc[i] || {}; return new Date(s.state === "pre" && s.start ? s.start : (byid[i] || {}).start); };
  const fin = new Set([...((p.finals || {}).lineup ? slate : []), ...((p.finals || {}).myTeams ? mine : [])]);
  for (const i of [...fin].sort()) {
    const s = sc[i] || {}, g = byid[i];
    if (!g || s.state !== "post" || sent.finals.includes(i)) continue;
    const a = Number(s.a), h = Number(s.h); if (isNaN(a) || isNaN(h)) continue;
    let body;
    if (spoil) body = `${g.awayShort || g.away} @ ${g.homeShort || g.home} has ended`;
    else if (a === h) body = `Final: ${side(g, "away")} ${a}, ${side(g, "home")} ${h} (tied)`;
    else { const [w, l] = a > h ? ["away", "home"] : ["home", "away"]; body = `Final: ${side(g, w)} ${Math.max(a, h)}, ${side(g, l)} ${Math.min(a, h)}`; }
    out.push(["finals", i, "Final", body]);
  }
  if ((p.upsets || {}).on) for (const g of games) {
    const s = sc[g.id] || {};
    if (!COLLEGE[g.league] || s.state !== "in" || sent.upsets.includes(g.id)) continue;
    const tr = lateTrailing(g, s); if (!tr) continue;
    const [lo, hi] = tr, a = Number(s.a), h = Number(s.h);
    out.push(["upsets", g.id, "Upset watch", spoil ? `No. ${g[lo + "Rank"]} ${g[lo + "Short"]} trailing ${side(g, hi)} late`
      : `No. ${g[lo + "Rank"]} ${g[lo + "Short"]} trails ${side(g, hi)} ${Math.max(a, h)}-${Math.min(a, h)} · ${s.detail || ""}`]);
  }
  const rem = new Set([...((p.reminders || {}).lineup ? slate : []), ...((p.reminders || {}).myTeams ? mine : [])]);
  for (const i of [...rem].sort((x, y) => startOf(x) - startOf(y))) {
    const g = byid[i], t = startOf(i);
    if (!g || isNaN(t) || sent.reminders.includes(i) || (sc[i] || {}).state === "post") continue;
    // right at the start time (the cron runs every minute); a game that already started within the last 10 minutes still counts
    const lead = Math.max(0, Math.min(60, Number(p.lead) || 0)) * 60000, at = new Date(t.getTime() - lead);
    if (now >= at && now - at <= 10 * 60000) {
      const orig = new Date(g.start), moved = Math.abs(orig - t) >= 60000;
      const head = lead ? `In ${Math.round(lead / 60000)} min (${clock(t)})` : "Starting now";
      // with the slate's preview line under it (3.58.0)
      const pvl = !spoil && PVL[i] ? `\n${String(PVL[i]).slice(0, 140)}` : "";
      out.push(["reminders", i, head, head + (moved ? ` (moved from ${clock(orig)})` : "") + `: ${matchup(g)}` + pvl]);
    }
  }
  if ((p.reminders || {}).lineup) for (const c of customs || []) {
    const m = /^(\d{1,2}):(\d{2})/.exec(String(c.time || "")); if (!m) continue;
    // custom items: "HH:MM" Central on the slate's day
    const cp = ctParts(now), off = new Date(now.toLocaleString("en-US", { timeZone: "America/Chicago" })) - new Date(now.toLocaleString("en-US", { timeZone: "UTC" }));
    const t = new Date(Date.parse(`${cp.date}T${m[1].padStart(2, "0")}:${m[2]}:00Z`) - off);
    const k = "c:" + c.id;
    if (!sent.reminders.includes(k) && now >= t && now - t <= 10 * 60000) out.push(["reminders", k, "Starting now", `Starting now: ${c.title || ""}` + (c.tv ? ` on ${c.tv}` : "")]);
  }
  // during games: close finishes, overtime, your team scoring, someone having a huge night
  const pick = (o) => new Set([...((o || {}).lineup ? slate : []), ...((o || {}).myTeams ? mine : [])]);
  const closeSet = pick(p.close), otSet = pick(p.ot), goalSet = (p.goals || {}).myTeams ? new Set(mine) : new Set();
  for (const k of ["close", "ot", "goals"]) sent[k] = sent[k] || [];
  for (const i of new Set([...closeSet, ...otSet, ...goalSet])) {
    const s = sc[i] || {}, g = byid[i]; if (!g || s.state !== "in") continue;
    const a = Number(s.a), h = Number(s.h); if (isNaN(a) || isNaN(h)) continue;
    const m = Math.abs(a - h), det = String(s.detail || ""), sport = SPORT[g.league] || "", per = s.p || 0, ck = s.ck || 0, ot = /\b(OT|SO|ET)\b|extra time|shootout/i.test(det);
    const score = spoil ? `${g.awayShort || g.away} @ ${g.homeShort || g.home}` : `${side(g, "away")} ${a}, ${side(g, "home")} ${h} · ${det}`;
    if (otSet.has(i) && ot && !sent.ot.includes(i)) { out.push(["ot", i, "Overtime", `Overtime: ${score}`]); sent.ot.push(i); continue; }
    if (closeSet.has(i) && !ot && !sent.close.includes(i)) {
      const min = parseInt(det, 10) || 0, inn = /(Top|Bot|Mid|End) (\d+)/i.exec(det);
      // the final 8 minutes (basketball and football, hockey's 3rd), from the 75th minute in soccer, the 7th inning on in baseball
      const late = sport === "bball" ? ((COLLEGE[g.league] && g.league !== "ncaaw" ? per > 2 || (per === 2 && ck > 0 && ck <= 480) : per > 4 || (per === 4 && ck > 0 && ck <= 480)))
        : sport === "football" ? per > 4 || (per === 4 && ck <= 480) : sport === "hockey" ? per > 3 || (per === 3 && ck <= 480) :  // the final 8 minutes (or overtime), like Worth a look
        sport === "soccer" ? per >= 2 && min >= 75 : sport === "baseball" ? !!inn && Number(inn[2]) >= 7 : false;
      const tight = sport === "bball" ? m <= 5 : sport === "football" ? m <= 8 : sport === "baseball" ? m <= 2 : m <= 1;
      if (late && tight) out.push(["close", i, "Close finish", `Close finish: ${score}`]);
    }
    if (goalSet.has(i) && !spoil && (sport === "hockey" || sport === "soccer")) {
      const tot = a + h, key = i + ":" + tot, prevMax = Math.max(-1, ...sent.goals.filter((x) => x.startsWith(i + ":")).map((x) => Number(x.split(":")[1])));
      if (tot > 0 && tot > prevMax && prevMax >= 0) out.push(["goals", key, "Goal", `Goal! ${score}`]);
      else if (prevMax < 0) sent.goals.push(key);  // first look at this game: remember the score, don't alert for goals already in
    }
  }
  if ((p.live || {}).myTeams && !spoil) for (const i of mine) {
    const s = sc[i] || {}, g = byid[i]; if (!g || s.state !== "in" || out.some((x) => x[0] === "reminders" && x[1] === i)) continue;  // the start alert already covers this minute
    const body = `${g.awayShort} ${s.a}, ${g.homeShort} ${s.h} · ${s.detail || ""}`, last = Date.parse((sent.liveAt || {})[i] || "");
    if (sent.live[i] !== body && (isNaN(last) || now - last >= 55 * 60000)) out.push(["live", i, "Live", body]);
  }
  const b = p.brief || {}, hr = ctParts(now, TZ).hour, bh = Number(b.hour ?? 9);
  if (b.on && !sent.brief && hr >= bh && hr <= bh + 2) {
    // "Sat 11/14: 6 games", then one line per game in start order: "11 AM - Davidson @ Dayton"
    const ids0 = (b.lineup && slate.length ? slate : b.myTeams ? mine : []).filter((i) => byid[i]);
    const fs = [...new Set(ids0)].sort((x, y) => startOf(x) - startOf(y));
    const dp = ctParts(now, TZ), wd = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short" }).format(now);
    const hm = (t) => clock(t).replace(/:00(\s)/, "$1");
    const lines = [`${wd} ${Number(dp.date.slice(5, 7))}/${Number(dp.date.slice(8, 10))}: ${fs.length} game${fs.length !== 1 ? "s" : ""}`];
    for (const i of fs) lines.push(`${hm(startOf(i))} - ${side(byid[i], "away")} @ ${side(byid[i], "home")}`);
    if (fs.length) out.push(["brief", "brief", "Today's games", lines.join("\n")]);
    else sent.brief = true;
  }
  return out;
}

// Apple's interruption level for each kind of alert (3.32.0, docs/NOTIFICATIONS-PLAN.md): Passive for things to read
// later (the morning brief, the hourly score, a final the live notification already shows), Active for the rest.
// Nothing is Time Sensitive, so no alert breaks through a Focus.
function alertLevel(p, sent, kind, id) {
  if (kind === "brief" || kind === "live") return "passive";
  if (kind === "finals") {
    const lv = p.liveAct || {}, cur = (sent.la || {})[id], bd = lv.board || {};
    const single = cur && !cur.off && ((lv.games || {})[id] !== 0);
    const board = bd.on && Array.isArray(bd.ids) && bd.ids.map(String).includes(id) && sent.board && !sent.board.off;
    if (single || board) return "passive";
  }
  return "active";
}

// ---------- live scores from ESPN ----------
const hex = (c) => /^[0-9a-f]{6}$/i.test(String(c || "")) ? "#" + c : "";
// early: the scoreboard's picks, looked up all day (3.33.1) so a later game shows its real abbreviations and colors from the start
// 3.64.0, soccer: once there's a goal, the live notification's one-liner is just the scorers with their minutes, away
// side first like the score ("NED Gakpo 23' · GER Wirtz 12', 40' pen, Ferguson 51' OG"), from ESPN's goal list.
// An own goal counts for the other side; shootout kicks are left out.
function goalLine(c, cs) {
  const side = {}; for (const k of ["away", "home"]) side[String(((cs[k] || {}).team || {}).id || "")] = k;
  const by = { away: [], home: [] };
  for (const d of c.details || []) {
    if (!d || !d.scoringPlay || d.shootout) continue;
    const a = (d.athletesInvolved || [])[0] || {}, nm = String(a.shortName || a.displayName || "").split(" ").slice(-1)[0];
    let k = side[String((d.team || {}).id || "")];
    if (d.ownGoal && a.team && side[String(a.team.id)]) k = side[String(a.team.id)] === "away" ? "home" : "away";
    if (!k || !nm) continue;
    const min = String((d.clock || {}).displayValue || "").trim() + (d.ownGoal ? " OG" : d.penaltyKick ? " pen" : "");
    const L = by[k], hit = L.find((x) => x.nm === nm); if (hit) hit.m.push(min); else L.push({ nm, m: [min] });
  }
  const one = (k) => by[k].length ? `${((cs[k] || {}).team || {}).abbreviation || ""} ${by[k].map((x) => `${x.nm} ${x.m.join(", ")}`).join(", ")}`.trim() : "";
  const line = [one("away"), one("home")].filter(Boolean).join(" · ");
  // 3.85.0: the face-off card puts each side's scorers under that side, one scorer a line, two lines at most
  // ("Højlund 11', 52'"; a third scorer and on share the second line)
  const list = (k) => { const L = by[k].map((x) => `${x.nm} ${x.m.join(", ")}`); return L.length > 2 ? [L[0], L.slice(1).join(", ")] : L; };
  return { line, ag: list("away"), hg: list("home") };
}
// 3.85.0, football: a spot ("BAL 35", "midfield") on the face-off card's field bar, 0 = away's goal line, 100 = home's
function fieldSpot(text, aa, ha) {
  const t = String(text || "").trim();
  if (/(^|\s)(midfield|50)$/i.test(t)) return 50;
  const m = /([A-Z][A-Za-z0-9&]{0,5})\s+(\d{1,2})$/.exec(t); if (!m) return null;
  const n = Number(m[2]); if (!(n >= 0 && n <= 50)) return null;
  return m[1] === ha ? 100 - n : m[1] === aa ? n : null;
}
async function liveScores(games, want, now, early) {
  const leagues = {}, sc = {};
  for (const id of want) { const g = games[id]; if (!g || !g.ev || !PATHS[g.league]) continue; const t = new Date(g.start); if (t - now > (early && early.has(id) ? 14 * 3600000 : 75 * 60000) || now - t > 8 * 3600000) continue; leagues[g.league] = 1; }
  const days = [etDay(new Date(now.getTime() - 6 * 3600000)), etDay(now)].filter((d, i, a) => a.indexOf(d) === i);
  const reqs = [];
  for (const lg of Object.keys(leagues)) for (const p of PATHS[lg]) for (const d of days) {
    const [path, ...extra] = p.split("&");
    reqs.push(fetch(`https://site.api.espn.com/apis/site/v2/sports/${path}/scoreboard?dates=${d}` + (extra.length ? "&" + extra.join("&") : ""), { cf: { cacheTtl: 5 } }).then((r) => r.ok ? r.json() : null).catch(() => null));
  }
  const byEv = {};
  for (const j of await Promise.all(reqs)) for (const e of (j && j.events) || []) byEv[e.id] = e;
  for (const id of want) {
    const g = games[id]; const e = g && byEv[g.ev]; if (!e) continue;
    const c = (e.competitions || [])[0] || {}, st = ((c.status || e.status || {}).type) || {}, cs = {};
    for (const x of c.competitors || []) cs[x.homeAway] = x;
    // before the start too (3.33.1): ESPN's abbreviations and team colors, so a live notification or the scoreboard
    // shows DAL and BOS in their colors from the first minute instead of gray MAV and CEL
    const look = (x) => x ? { abbr: (x.team || {}).abbreviation || "", c: hex((x.team || {}).color), alt: hex((x.team || {}).alternateColor), lg: logoSeg((x.team || {}).logo) } : { abbr: "", c: "", alt: "", lg: "" };
    const la0 = look(cs.away), lh0 = look(cs.home);
    if (st.state === "pre") { sc[id] = { state: "pre", start: e.date, aa: la0.abbr, ha: lh0.abbr, ac: la0.c, hc: lh0.c, ax: la0.alt, hx: lh0.alt, al: la0.lg, hl: lh0.lg }; continue; }
    if (!cs.away || !cs.home) continue;
    const ld = [];
    const tAb = {}; for (const x of c.competitors || []) tAb[String((x.team || {}).id)] = (x.team || {}).abbreviation || "";
    const take = (L) => { const x = (L.leaders || [])[0]; if (x && x.athlete) ld.push({ c: L.name, n: x.athlete.displayName || x.athlete.shortName || "", d: String(x.displayValue || ""), v: Number(x.value) || 0, t: tAb[String((x.team || (x.athlete || {}).team || {}).id || "")] || "" }); };
    (c.leaders || []).forEach(take); for (const x of c.competitors || []) (x.leaders || []).forEach((L) => { if (/^(points|goals)$/.test(L.name)) take(L); });
    sc[id] = { state: st.state, a: Number(cs.away.score), h: Number(cs.home.score), detail: st.shortDetail || "", p: Number((c.status || {}).period) || 0, ck: Number((c.status || {}).clock) || 0, ld,
      aa: (cs.away.team || {}).abbreviation || "", ha: (cs.home.team || {}).abbreviation || "", ac: hex((cs.away.team || {}).color), hc: hex((cs.home.team || {}).color),
      ax: hex((cs.away.team || {}).alternateColor), hx: hex((cs.home.team || {}).alternateColor), al: la0.lg, hl: lh0.lg };
    // football: ESPN's down and distance, and which side has the ball (its team id matched to away or home)
    const sit = c.situation || {}, pid = String(sit.possession || "");
    let dd = sit.downDistanceText || (sit.shortDownDistanceText && sit.possessionText ? `${sit.shortDownDistanceText} at ${sit.possessionText}` : "");
    if (!dd && Number(sit.down) > 0 && Number(sit.distance) > 0 && Number(sit.yardLine) > 0 && Number(sit.yardLine) < 100) {
      // between plays ESPN sometimes drops the text: work it out (yardLine counts from the home team's goal line)
      const y = Number(sit.yardLine), spot = y === 50 ? "midfield" : y < 50 ? `${sc[id].ha} ${y}` : `${sc[id].aa} ${100 - y}`;
      dd = `${["", "1st", "2nd", "3rd", "4th"][Number(sit.down)] || ""} & ${sit.distance} at ${spot}`;
    }
    if (dd) sc[id].dd = String(dd);
    if (pid) sc[id].po = pid === String((cs.away.team || {}).id) ? "away" : pid === String((cs.home.team || {}).id) ? "home" : "";
    if (st.state === "in" || st.state === "post") Object.assign(sc[id], islandStats(g, c, cs, sit, st.state === "post"));
    if (SPORT[g.league] === "soccer") { const gl = goalLine(c, cs); if (gl.line) Object.assign(sc[id], { gl: gl.line, ag: gl.ag, hg: gl.hg }); }
    if (dd && sc[id].po) {
      const yl = fieldSpot(String(dd).split(" at ").pop(), sc[id].aa, sc[id].ha); if (yl != null) sc[id].yl = yl;
      const dr = (sit.lastPlay || {}).drive, ds = dr && dr.start ? fieldSpot(dr.start.text, sc[id].aa, sc[id].ha) : null;
      if (yl != null && ds != null) sc[id].ds = ds;
    }
  }
  return sc;
}

// ---------- follow right away ----------
// The app posts a person's slate and team games the moment they change, so the minute job follows an added game on its
// next run instead of waiting for the 10-minute tick job to rebuild alertsets. Only today's games that alertsets already
// knows are taken, and games are only added here (a phone still loading part of the day can't drop any): a removed game
// goes at the tick job's next rebuild, which works from the same saved slate and teams and replaces this patch.
export async function followNow(env, prefix, p) {
  const D = ctParts(new Date(Date.now() - 4 * 3600000)).date;
  if (p.date !== D) return { ok: false, why: "not today" };
  const path = `alertsets/${D}`, aset = (await getDocs(env, [path]))[path];
  if (!aset || !Array.isArray(aset.people)) return { ok: false, why: "not ready" };
  const games = aset.games || {}, ids = (x) => [...new Set((Array.isArray(x) ? x : []).map(String).filter((i) => games[i]))].slice(0, 200);
  const customs = (Array.isArray(p.customs) ? p.customs : []).slice(0, 30).filter((c) => c && typeof c === "object")
    .map((c) => ({ id: String(c.id || "").slice(0, 60), title: String(c.title || "").slice(0, 120), time: String(c.time || "").slice(0, 5), tv: String(c.tv || "").slice(0, 40) }));
  let w = aset.people.find((x) => x && x.prefix === prefix);
  if (!w) { w = { prefix, slate: [], mine: [], customs: [] }; aset.people.push(w); }
  const before = JSON.stringify(w);
  w.slate = ids([...(w.slate || []), ...ids(p.slate)]);
  w.mine = ids([...(w.mine || []), ...ids(p.mine)]);
  if (Array.isArray(p.customs)) w.customs = customs;
  if (JSON.stringify(w) === before) return { ok: true, changed: false };
  aset.updatedAt = new Date().toISOString();
  await putDoc(env, path, aset);
  return { ok: true, changed: true };
}

// The expanded Dynamic Island's extra lines (3.38.0), only while the game is on and only what ESPN's scoreboard sends
// (before tip-off its numbers are season averages, so nothing is taken then): each team's standout, a team line,
// the last play and ESPN's win probability. Sports ESPN gives none of these for get nothing new.
function islandStats(g, c, cs, sit, fin) {
  const sport = SPORT[g.league], out = {}, rate = {}, names = {}, cut = (x, n) => String(x || "").replace(/\s+/g, " ").trim().slice(0, n);
  const stat = (x, k) => { const f = (x.statistics || []).find((y) => y.name === k); return f ? String(f.displayValue || "") : ""; };
  for (const [sd, k] of [["away", "a"], ["home", "h"]]) {
    const x = cs[sd]; if (!x) continue;
    if (sport === "bball") {
      // ESPN's own pick for the team's best game so far, with the full line: "V. Wembanyama 26 PTS, 10 REB, 6 AST, 5 BLK"
      const r = ((x.leaders || []).find((L) => L.name === "rating") || {}).leaders, top = r && r[0];
      if (top && top.athlete && top.displayValue) { out[k + "p"] = standout(top.athlete, top.displayValue); rate[k] = Number(top.value) || 0; names[k] = top.athlete; }
      const fg = stat(x, "fieldGoalPct"), tm = stat(x, "threePointFieldGoalsMade"), ta = stat(x, "threePointFieldGoalsAttempted"), rb = stat(x, "rebounds");
      const parts = [fg ? `FG ${Math.round(Number(fg))}%` : "", tm && ta ? `3PT ${tm}/${ta}` : "", rb ? `REB ${rb}` : ""].filter(Boolean);
      if (parts.length) out[k + "t"] = parts.join(" · ");
    }
    if (sport === "football") {
      // 3.75.1 (DJ): no timeouts line; it read like a stat and crowded the Dynamic Island
    }
  }
  // 3.68.0 (DJ): one standout for the whole game, not one per team. Basketball: the higher of the two teams' ESPN
  // in-game ratings. Football: of ESPN's game leaders (passing, rushing, receiving), the one with the most yards.
  if (sport === "football") {
    const side = {}; for (const [sd, k] of [["away", "a"], ["home", "h"]]) side[String(((cs[sd] || {}).team || {}).id || "")] = k;
    let best = null, by = -1;
    for (const L of c.leaders || []) {
      const top = (L.leaders || [])[0]; if (!top || !top.athlete || !side[String((top.team || {}).id || "")]) continue;
      const y = Number((/(\d+) YDS/.exec(top.displayValue || "") || [])[1]) || 0; if (y > by) { by = y; best = top; }
    }
    if (best) { const k = side[String((best.team || {}).id || "")]; out[k + "p"] = standout(best.athlete, best.displayValue); names[k] = best.athlete; rate[k] = 1; }
  }
  if (out.ap && out.hp) { if ((rate.a || 0) >= (rate.h || 0)) delete out.hp; else delete out.ap; }
  const tk = out.ap ? "a" : out.hp ? "h" : ""; if (tk && names[tk]) out.tn = String(names[tk].displayName || names[tk].shortName || "");
  if (fin) return { ap: out.ap, hp: out.hp, tn: out.tn };  // after the final: the game's standout stays on the Lock Screen (3.39.1)
  const lp = sit.lastPlay || {};
  // 3.75.1: not a timeout, quarter break or two-minute warning ("Timeout #1 by BLT at 05:49."): those say nothing about the game
  if ((sport === "bball" || sport === "football") && lp.text && !/^(timeout|end of|end (quarter|half|game)|two[- ]minute warning|official timeout)/i.test(String(lp.text).trim())) out.lp = cut(lp.text, 90);
  // decision 10 (docs/NOTIFICATIONS-PLAN.md): ESPN's win probability, labeled as ESPN's, for football and basketball
  const pr = lp.probability || {}, aw = Number(pr.awayWinPercentage), hw = Number(pr.homeWinPercentage);
  if ((sport === "bball" || sport === "football") && aw >= 0 && hw >= 0 && aw + hw > 0) {
    const [ab, pct] = aw >= hw ? [(cs.away.team || {}).abbreviation, aw] : [(cs.home.team || {}).abbreviation, hw];
    if (ab) out.wp = `ESPN win chance: ${ab} ${Math.round(pct * 100)}%`;
  }
  return out;
}

// ---------- the minute job ----------
export async function runAlerts(env) {
  if (!env.SUPABASE_SECRET) return;
  const now = new Date(), D = ctParts(new Date(now.getTime() - 4 * 3600000)).date, ct = ctParts(now);
  if (now.getUTCMinutes() % 10 === 0) await putDoc(env, "stats/cron", { at: now.toISOString() });  // heartbeat: shows the minute job is running
  const base = await getDocs(env, [`alertsets/${D}`]);
  const aset = base[`alertsets/${D}`]; if (!aset || !aset.people) return;
  const people = aset.people, games = aset.games || {};
  const paths = []; for (const w of people) paths.push(w.prefix + "prefs/notify", w.prefix + "prefs/push", `${w.prefix}prefs/sent-${D}`, w.prefix + "prefs/liveacts", w.prefix + "prefs/pvlines");
  const docs = await getDocs(env, paths);
  const hasLive = (w) => { const l = docs[w.prefix + "prefs/liveacts"] || {}; return (l.start || []).length || Object.keys(l.acts || {}).length || (l.startBoard || []).length || !!l.board; };
  const active = people.filter((w) => (((docs[w.prefix + "prefs/push"] || {}).subs) || []).length || hasLive(w));
  if (!active.length) return;
  // which games need a live score: everyone's slate and teams, plus college games for upset watch
  const want = new Set(), early = new Set();
  for (const w of active) { (w.slate || []).forEach((i) => want.add(i)); (w.mine || []).forEach((i) => want.add(i)); if ((merged(docs[w.prefix + "prefs/notify"]).upsets || {}).on) for (const [i, g] of Object.entries(games)) if (COLLEGE[g.league] && (g.awayRank || g.homeRank)) want.add(i);
    const pw = merged(docs[w.prefix + "prefs/notify"]), bd = (pw.liveAct || {}).board || {};
    for (const [i, v] of Object.entries(((pw.liveAct || {}).games) || {})) if (v === 1 && games[i]) want.add(i);  // games switched on by name get live scores too
    for (const [i, v] of Object.entries(((pw.alerts || {}).games) || {})) if (v === 1 && games[i]) want.add(i);
    if (bd.on && Array.isArray(bd.ids)) for (const i of bd.ids) if (games[String(i)]) { want.add(String(i)); early.add(String(i)); } }
  const sc = await liveScores(games, want, now, early);
  const list = Object.entries(games).map(([id, g]) => Object.assign({ id }, g)), byid = {}; for (const g of list) byid[g.id] = g;
  BC = (await apnsReady(env)) ? { doc: await bcLoad(env), want: {} } : null;
  for (const w of active) {
    const pre = w.prefix, subs = (docs[pre + "prefs/push"] || {}).subs || [], p = merged(docs[pre + "prefs/notify"]), s0 = docs[`${pre}prefs/sent-${D}`] || {};
    TZ = typeof p.tz === "string" && /^[A-Za-z_]+\/[A-Za-z_\/-]+$/.test(p.tz) ? p.tz : "America/Chicago";
    { const pvd = docs[pre + "prefs/pvlines"] || {}; PVL = pvd.date === D && pvd.lines && typeof pvd.lines === "object" ? pvd.lines : {};
      LVL = pvd.date === D && pvd.live && typeof pvd.live === "object" ? pvd.live : {};
      TGL = pvd.date === D && pvd.tags && typeof pvd.tags === "object" ? pvd.tags : {}; }
    const lt = ctParts(now, TZ);
    const sent = { date: D, brief: !!s0.brief, reminders: [...(s0.reminders || [])], finals: [...(s0.finals || [])], live: Object.assign({}, s0.live || {}), liveAt: Object.assign({}, s0.liveAt || {}), upsets: [...(s0.upsets || [])],
      close: [...(s0.close || [])], ot: [...(s0.ot || [])], goals: [...(s0.goals || [])], la: JSON.parse(JSON.stringify(s0.la || {})),
      board: s0.board ? JSON.parse(JSON.stringify(s0.board)) : null };
    const before = JSON.stringify(sent);
    let msgs = [];
    if (p.enabled !== false) {
      const silent = !(p.days || DEFAULTS.days).includes(lt.wd) || inQuiet(p, lt.hour);
      // a game's alerts switched off on the slate (its card's bell, or Game alerts in its tray): marked sent but not pushed;
      // switched on for a game off the slate: it gets the slate's alerts
      const ag = ((p.alerts || {}).games) || {}, offGames = new Set(Object.keys(ag).filter((i) => ag[i] === 0));
      const slateA = [...new Set([...(w.slate || []), ...Object.keys(ag).filter((i) => ag[i] === 1 && byid[i])])];
      for (const [kind, key, title, body] of dueAlerts(p, sent, list, byid, sc, slateA, w.mine || [], w.customs || [], now)) {
        if (kind === "brief") sent.brief = true;
        else if (kind === "live") { sent.live[key] = body; sent.liveAt[key] = now.toISOString(); }
        else if (kind !== "ot") sent[kind].push(key);
        const gid = String(key).startsWith("c:") ? String(key) : String(key).split(":")[0];
        const muted = kind !== "brief" && offGames.has(gid);
        // a blank title: iPhone then shows "from Slate" on top and the alert under it (two lines)
        if (!silent && body && !muted) msgs.push({ title: " ", body, tag: `${kind}-${key}`, level: alertLevel(p, sent, kind, gid), thread: kind === "brief" ? "brief" : "game-" + gid,
          // game: the alert's game id, so a tap opens its matchup (custom items and the brief have none)
          game: kind !== "brief" && byid[gid] ? gid : "" });
      }
    }
    msgs = msgs.slice(0, 8);
    const la = docs[pre + "prefs/liveacts"];
    if (la && hasLive(w) && await apnsReady(env)) {
      const held = p.enabled === false || !(p.days || DEFAULTS.days).includes(lt.wd) || inQuiet(p, lt.hour);
      try {
        let changed = await runLive(env, p, sent, la, { slate: w.slate || [], mine: w.mine || [] }, games, sc, held);
        if (await runBoard(env, p, sent, la, games, sc)) changed = true;
        if (changed) await putDoc(env, pre + "prefs/liveacts", la);
        if ((p.__off || []).length) {  // live notifications swiped away: switch them off on the slate too (3.27.0)
          const nd = docs[pre + "prefs/notify"] || {}, lv = nd.liveAct = nd.liveAct && typeof nd.liveAct === "object" ? nd.liveAct : {};
          lv.games = lv.games && typeof lv.games === "object" ? lv.games : {};
          for (const i of p.__off) lv.games[i] = 0;
          nd.updatedAt = new Date().toISOString();
          await putDoc(env, pre + "prefs/notify", nd);
        }
      }
      catch (e) { console.log("live failed", String(e).slice(0, 120)); }
    }
    const appReady = subs.some((s) => s.apns) ? await apnsReady(env) : false;
    const welcome = subs.some((s) => !s.welcomed && (!s.apns || appReady));
    let keep = [], dirty = welcome;
    for (const s of subs) {
      if (s.apns && !appReady) { keep.push(s); continue; }  // the app's push key isn't set up yet: hold this phone until it is
      let gone = false;
      const mine2 = s.welcomed ? msgs : [{ title: " ", body: "Alerts are on for this phone.", tag: "welcome", level: "active", thread: "slate" }, ...msgs];
      for (const m of mine2) {
        try { const st = s.apns ? await sendApns(env, s, m) : await sendPush(env, s, m); if (st === 404 || st === 410) { gone = true; dirty = true; break; } if (st >= 400) console.log("push", st); }
        catch (e) { console.log("push failed", String(e).slice(0, 120)); }
      }
      if (!gone) keep.push(Object.assign({}, s, { welcomed: true }));
    }
    if (dirty) await putDoc(env, pre + "prefs/push", { subs: keep });
    if (JSON.stringify(sent) !== before) await putDoc(env, `${pre}prefs/sent-${D}`, Object.assign(sent, { updatedAt: now.toISOString() }));
    if (msgs.length) console.log("alerts", pre || "dj", msgs.map((m) => m.body.slice(0, 60)));
  }
  // the game channels: this minute's score once per game, for every live notification listening (3.28.0)
  if (BC) {
    for (const [id, st] of Object.entries(BC.want)) {
      const g = BC.doc.games[id]; if (!g) continue;
      const key = `${st.a}-${st.h}-${st.detail}-${st.sit || ""}-${st.line || ""}-${st.lp || ""}-${st.ap || ""}-${st.hp || ""}-${st.pv || ""}-${st.tag || ""}`;
      if (g.end || g.k === key) continue;
      const fin = st.state === "post", scored = !String(g.k || "").startsWith(`${st.a}-${st.h}-`);
      for (const envName of ["production", "sandbox"]) {
        if (!g[envName]) continue;
        await bcSend(env, envName, g[envName], fin ? "end" : "update",
          fin ? { "content-state": st, "dismissal-date": Math.floor(Date.now() / 1000) + 4 * 3600 } : { "content-state": st, "stale-date": Math.floor(Date.now() / 1000) + 10 * 60 }, fin || scored ? 10 : 5);
      }
      g.k = key; if (fin) g.end = 1; BC.doc.dirty = true;
    }
    if (BC.doc.dirty) await bcSave(env, BC.doc);
  }
}
