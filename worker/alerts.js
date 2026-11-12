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
  finals: { myTeams: true, lineup: false }, live: { myTeams: false }, upsets: { on: false }, quiet: { on: true, start: 23, end: 8 }, days: [0, 1, 2, 3, 4, 5, 6], spoilerFree: false };
const NATIONAL = ["ABC", "CBS", "NBC", "FOX", "ESPN", "ESPN2", "ESPNU", "ESPNEWS", "TNT", "TBS", "truTV", "FS1", "FS2", "CBSSN", "USA", "NBA TV", "NHL Network", "MLB Network", "NFL Network", "BTN", "SEC Network", "ACC Network", "CW", "Prime Video", "Peacock", "Netflix"];
const BIG_NET = ["ABC", "CBS", "NBC", "FOX", "ESPN", "TNT", "Prime Video", "Netflix"];
const COLLEGE = { ncaaf: 1, ncaam: 1, ncaaw: 1 };

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
function ctParts(t) {
  const f = new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", weekday: "short", hour12: false });
  const p = {}; for (const x of f.formatToParts(t)) p[x.type] = x.value;
  return { date: `${p.year}-${p.month}-${p.day}`, hour: Number(p.hour) % 24, wd: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p.weekday) };
}
function clock(t) { return new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", hour: "numeric", minute: "2-digit" }).format(t); }
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
async function sendPush(env, sub, msg) {
  const body = await encryptPush(sub, JSON.stringify(msg));
  const r = await fetch(sub.endpoint, { method: "POST", body, headers: { "Content-Encoding": "aes128gcm", "Content-Type": "application/octet-stream", TTL: "3600", Urgency: "high", Authorization: await vapidAuth(env, sub.endpoint) } });
  return r.status;
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
    if (!g || isNaN(t) || sent.reminders.includes(i) || ["in", "post"].includes((sc[i] || {}).state)) continue;
    if (t > now && t - now <= 3600000) {
      const orig = new Date(g.start), moved = Math.abs(orig - t) >= 60000;
      out.push(["reminders", i, "Starting soon", `${clock(t)}` + (moved ? ` (moved from ${clock(orig)})` : "") + `: ${matchup(g)}`]);
    }
  }
  if ((p.reminders || {}).lineup) for (const c of customs || []) {
    const m = /^(\d{1,2}):(\d{2})/.exec(String(c.time || "")); if (!m) continue;
    // custom items: "HH:MM" Central on the slate's day
    const cp = ctParts(now), off = new Date(now.toLocaleString("en-US", { timeZone: "America/Chicago" })) - new Date(now.toLocaleString("en-US", { timeZone: "UTC" }));
    const t = new Date(Date.parse(`${cp.date}T${m[1].padStart(2, "0")}:${m[2]}:00Z`) - off);
    const k = "c:" + c.id;
    if (!sent.reminders.includes(k) && t > now && t - now <= 3600000) out.push(["reminders", k, "Starting soon", `${clock(t)}: ${c.title || ""}` + (c.tv ? ` on ${c.tv}` : "")]);
  }
  if ((p.live || {}).myTeams && !spoil) for (const i of mine) {
    const s = sc[i] || {}, g = byid[i]; if (!g || s.state !== "in") continue;
    const body = `${g.awayShort} ${s.a}, ${g.homeShort} ${s.h} · ${s.detail || ""}`, last = Date.parse((sent.liveAt || {})[i] || "");
    if (sent.live[i] !== body && (isNaN(last) || now - last >= 55 * 60000)) out.push(["live", i, "Live", body]);
  }
  const b = p.brief || {}, hr = ctParts(now).hour, bh = Number(b.hour ?? 9);
  if (b.on && !sent.brief && hr >= bh && hr <= bh + 2) {
    const lines = [];
    if (b.lineup && slate.length) {
      const fs = slate.filter((i) => byid[i]).sort((x, y) => startOf(x) - startOf(y));
      if (fs.length) lines.push(`Tonight's slate: ${fs.length} game${fs.length !== 1 ? "s" : ""}, first at ${clock(startOf(fs[0]))} (${matchup(byid[fs[0]])})`);
    }
    if (b.myTeams) {
      const mt = mine.map((i) => byid[i]).filter(Boolean);
      lines.push(mt.length ? "Your teams: " + mt.map((g) => `${side(g, "away")} @ ${side(g, "home")} ${clock(startOf(g.id))}` + ((g.tv || []).length ? ` on ${g.tv[0]}` : "")).join(" · ") : "None of your teams play today");
    }
    if (b.topGames) { const tg = topGames(games, sc, new Set(slate), now); if (tg.length) lines.push("Also on: " + tg.map((g) => `${side(g, "away")} @ ${side(g, "home")} ${clock(startOf(g.id))} on ${g.tv[0]}`).join(" · ")); }
    out.push(["brief", "brief", "Today's games", lines.join("\n")]);
  }
  return out;
}

// ---------- live scores from ESPN ----------
async function liveScores(games, want, now) {
  const leagues = {}, sc = {};
  for (const id of want) { const g = games[id]; if (!g || !g.ev || !PATHS[g.league]) continue; const t = new Date(g.start); if (t - now > 75 * 60000 || now - t > 8 * 3600000) continue; leagues[g.league] = 1; }
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
    if (st.state === "pre") { sc[id] = { state: "pre", start: e.date }; continue; }
    if (!cs.away || !cs.home) continue;
    sc[id] = { state: st.state, a: Number(cs.away.score), h: Number(cs.home.score), detail: st.shortDetail || "" };
  }
  return sc;
}

// ---------- the minute job ----------
export async function runAlerts(env) {
  if (!env.SUPABASE_SECRET) return;
  const now = new Date(), D = ctParts(new Date(now.getTime() - 4 * 3600000)).date, ct = ctParts(now);
  if (now.getUTCMinutes() % 10 === 0) await putDoc(env, "stats/cron", { at: now.toISOString() });  // heartbeat: shows the minute job is running
  const base = await getDocs(env, [`alertsets/${D}`]);
  const aset = base[`alertsets/${D}`]; if (!aset || !aset.people) return;
  const people = aset.people, games = aset.games || {};
  const paths = []; for (const w of people) paths.push(w.prefix + "prefs/notify", w.prefix + "prefs/push", `${w.prefix}prefs/sent-${D}`);
  const docs = await getDocs(env, paths);
  const active = people.filter((w) => (((docs[w.prefix + "prefs/push"] || {}).subs) || []).length);
  if (!active.length) return;
  // which games need a live score: everyone's slate and teams, plus college games for upset watch
  const want = new Set();
  for (const w of active) { (w.slate || []).forEach((i) => want.add(i)); (w.mine || []).forEach((i) => want.add(i)); if ((merged(docs[w.prefix + "prefs/notify"]).upsets || {}).on) for (const [i, g] of Object.entries(games)) if (COLLEGE[g.league] && (g.awayRank || g.homeRank)) want.add(i); }
  const sc = await liveScores(games, want, now);
  const list = Object.entries(games).map(([id, g]) => Object.assign({ id }, g)), byid = {}; for (const g of list) byid[g.id] = g;
  for (const w of active) {
    const pre = w.prefix, subs = docs[pre + "prefs/push"].subs, p = merged(docs[pre + "prefs/notify"]), s0 = docs[`${pre}prefs/sent-${D}`] || {};
    const sent = { date: D, brief: !!s0.brief, reminders: [...(s0.reminders || [])], finals: [...(s0.finals || [])], live: Object.assign({}, s0.live || {}), liveAt: Object.assign({}, s0.liveAt || {}), upsets: [...(s0.upsets || [])] };
    const before = JSON.stringify(sent);
    let msgs = [];
    if (p.enabled !== false) {
      const silent = !(p.days || DEFAULTS.days).includes(ct.wd) || inQuiet(p, ct.hour);
      for (const [kind, key, title, body] of dueAlerts(p, sent, list, byid, sc, w.slate || [], w.mine || [], w.customs || [], now)) {
        if (kind === "brief") sent.brief = true;
        else if (kind === "live") { sent.live[key] = body; sent.liveAt[key] = now.toISOString(); }
        else sent[kind].push(key);
        // iPhone adds "from Slate" under the title, so the alert itself is the title: two lines, not three
        if (!silent && body) msgs.push(kind === "brief" ? { title, body, tag: `${kind}-${key}` } : { title: body, body: "", tag: `${kind}-${key}` });
      }
    }
    msgs = msgs.slice(0, 8);
    const welcome = subs.some((s) => !s.welcomed);
    let keep = [], dirty = welcome;
    for (const s of subs) {
      let gone = false;
      const mine2 = s.welcomed ? msgs : [{ title: "Alerts are on for this phone.", body: "", tag: "welcome" }, ...msgs];
      for (const m of mine2) {
        try { const st = await sendPush(env, s, m); if (st === 404 || st === 410) { gone = true; dirty = true; break; } if (st >= 400) console.log("push", st); }
        catch (e) { console.log("push failed", String(e).slice(0, 120)); }
      }
      if (!gone) keep.push(Object.assign({}, s, { welcomed: true }));
    }
    if (dirty) await putDoc(env, pre + "prefs/push", { subs: keep });
    if (JSON.stringify(sent) !== before) await putDoc(env, `${pre}prefs/sent-${D}`, Object.assign(sent, { updatedAt: now.toISOString() }));
    if (msgs.length) console.log("alerts", pre || "dj", msgs.map((m) => m.body.slice(0, 60)));
  }
}
