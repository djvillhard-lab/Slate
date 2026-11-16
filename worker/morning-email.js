// The morning email (3.55.0): each person who turns it on in Settings gets their own slate by email every morning,
// from DJ's Gmail. Today's games (time, TV, the matchup, optionally the betting line) and last night's results.
//
// Sending: Gmail's mail server (smtp.gmail.com, port 465) over a Workers TCP socket, signed in with a Gmail app password.
// Set in Cloudflare (Workers > slate > Settings > Variables and Secrets), never in the repo:
//   GMAIL_USER          the Gmail address it sends from
//   GMAIL_APP_PASSWORD  a Google app password (needs 2-Step Verification on that account)
//
// Settings live in mail/schedule {people: {<id>: {on, time "07:00", tz, lines, name, email (encrypted), last, ...}}}.
// The data is readable with the app's public key, so the address is stored encrypted with a key only the server has
// (derived from SUPABASE_SECRET). The minute cron reads that one doc; a person is due once their local time reaches
// their time. "last" (their local date) is written before sending, with a 10-minute lease, so a day goes out once.
// What goes in it comes from alertsets/<date> (each person's slate and teams, written by the tick job), slates/<date>
// (records and colors), previews/<date> (the lines) and scores/<yesterday>.

import { connect } from "cloudflare:sockets";

const SB = "https://xpkzcdaawaqiqgwkkwst.supabase.co";
const APP = "https://slate.djvillhard.workers.dev";
const DOC = "mail/schedule";
const LG = { nfl: "NFL", ncaaf: "College Football", nba: "NBA", wnba: "WNBA", ncaam: "Men's College Hoops", ncaaw: "Women's College Hoops", nhl: "NHL", mlb: "MLB", mls: "MLS",
  epl: "Premier League", ucl: "Champions League", uel: "Europa League", laliga: "LaLiga", seriea: "Serie A", bundesliga: "Bundesliga", ligue1: "Ligue 1", facup: "FA Cup", intl: "International" };
const COLLEGE = { ncaaf: 1, ncaam: 1, ncaaw: 1 };
// Slate's Midnight look
const C = { bg: "#121821", card: "#1A2230", raise: "#232D3C", hair: "#283243", ink: "#ECF1F7", muted: "#A0ACBD", dim: "#8794A8", head: "#CAD3DF", accent: "#45A85E", fill: "#3E9E5A", on: "#0C0C0C" };
const FONT = "Archivo,-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
const NARROW = "'Archivo Narrow','Arial Narrow',Archivo,-apple-system,Helvetica,Arial,sans-serif";

// ---------- small helpers ----------
const sbH = (env) => ({ apikey: env.SUPABASE_SECRET, Authorization: "Bearer " + env.SUPABASE_SECRET });
async function getDocs(env, paths) {
  const q = paths.map((p) => encodeURIComponent(p)).join(",");
  const r = await fetch(`${SB}/rest/v1/docs?select=path,data&path=in.(${q})`, { headers: sbH(env) });
  const out = {}; if (!r.ok) return out;
  for (const x of await r.json()) out[x.path] = x.data;
  return out;
}
async function mergeDoc(env, path, data) {
  const r = await fetch(`${SB}/rest/v1/rpc/mirror_doc`, { method: "POST", headers: Object.assign({ "content-type": "application/json" }, sbH(env)), body: JSON.stringify({ p_path: path, p_data: data, p_merge: true }) });
  if (!r.ok) throw new Error("save failed " + r.status);
}
const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const okTz = (tz) => { try { new Intl.DateTimeFormat("en-US", { timeZone: tz }); return /^[A-Za-z_]+\/[A-Za-z_\/+-]+$/.test(tz); } catch { return false; } };
function local(t, tz) {
  const f = new Intl.DateTimeFormat("en-US", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });
  const p = {}; for (const x of f.formatToParts(t)) p[x.type] = x.value;
  return { date: `${p.year}-${p.month}-${p.day}`, min: (Number(p.hour) % 24) * 60 + Number(p.minute) };
}
const clock = (t, tz) => new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" }).format(new Date(t));
const dayName = (d, opt) => new Intl.DateTimeFormat("en-US", Object.assign({ timeZone: "UTC" }, opt)).format(new Date(d + "T12:00:00Z"));
const prevDay = (d) => new Date(Date.parse(d + "T12:00:00Z") - 864e5).toISOString().slice(0, 10);
const hm = (s) => { const m = /^(\d\d):(\d\d)$/.exec(String(s || "")); return m ? Number(m[1]) * 60 + Number(m[2]) : -1; };
const prefixOf = (id) => (id === "dj" ? "" : "u/" + id + "/");

// ---------- the address, encrypted ----------
async function aesKey(env) {
  const raw = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("slate-email|" + env.SUPABASE_SECRET));
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}
const b64 = (u8) => { let s = ""; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
async function seal(env, text) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await aesKey(env), new TextEncoder().encode(text)));
  return "v1:" + b64(iv) + ":" + b64(ct);
}
async function unseal(env, s) {
  const m = /^v1:([^:]+):(.+)$/.exec(String(s || "")); if (!m) return "";
  try { return new TextDecoder().decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(m[1]) }, await aesKey(env), unb64(m[2]))); } catch { return ""; }
}

// ---------- sending through Gmail ----------
const b64utf8 = (s) => b64(new TextEncoder().encode(s));
const wrap76 = (s) => s.replace(/.{1,76}/g, "$&\r\n");
const hdr = (s) => (/^[\x20-\x7e]*$/.test(s) ? s : "=?UTF-8?B?" + b64utf8(s) + "?=");
export function mime(from, to, subject, text, html) {
  const bd = "slate-" + crypto.randomUUID(), id = crypto.randomUUID() + "@slate.djvillhard.workers.dev";
  return [
    `From: ${hdr("Slate")} <${from}>`, `To: <${to}>`, `Subject: ${hdr(subject)}`, `Date: ${new Date().toUTCString().replace("GMT", "+0000")}`,
    `Message-ID: <${id}>`, "MIME-Version: 1.0", `Content-Type: multipart/alternative; boundary="${bd}"`, "",
    `--${bd}`, "Content-Type: text/plain; charset=UTF-8", "Content-Transfer-Encoding: base64", "", wrap76(b64utf8(text)),
    `--${bd}`, "Content-Type: text/html; charset=UTF-8", "Content-Transfer-Encoding: base64", "", wrap76(b64utf8(html)),
    `--${bd}--`, "",
  ].join("\r\n");
}
export const gmailReady = (env) => !!(String(env.GMAIL_USER || "").trim() && String(env.GMAIL_APP_PASSWORD || "").trim());
export async function sendGmail(env, to, subject, text, html) {
  const user = String(env.GMAIL_USER || "").trim(), pass = String(env.GMAIL_APP_PASSWORD || "").replace(/\s+/g, "");
  if (!user || !pass) throw new Error("Gmail isn't connected yet");
  // SMTP_HOST / SMTP_PORT / SMTP_PLAIN only for a local test server; unset, it's Gmail over TLS
  const sock = connect({ hostname: env.SMTP_HOST || "smtp.gmail.com", port: Number(env.SMTP_PORT) || 465 }, { secureTransport: env.SMTP_PLAIN ? "off" : "on" });
  const w = sock.writable.getWriter(), r = sock.readable.getReader(), enc = new TextEncoder(), dec = new TextDecoder();
  let buf = "";
  const reply = async () => {
    for (;;) {
      const lines = buf.split("\r\n");
      for (let i = 0; i < lines.length - 1; i++) if (/^\d{3}( |$)/.test(lines[i])) { buf = lines.slice(i + 1).join("\r\n"); return { code: Number(lines[i].slice(0, 3)), text: lines.slice(0, i + 1).join(" ") }; }
      const { value, done } = await r.read(); if (done) throw new Error("Gmail closed the connection");
      buf += dec.decode(value, { stream: true });
    }
  };
  const say = async (line, want) => {
    if (line != null) await w.write(enc.encode(line + "\r\n"));
    const x = await reply();
    if (!want.includes(x.code)) throw new Error(x.code === 535 || x.code === 534 ? "Gmail didn't accept the app password" : "Gmail said: " + x.text.slice(0, 160));
    return x;
  };
  const talk = (async () => {
    await say(null, [220]);
    await say("EHLO slate.djvillhard.workers.dev", [250]);
    await say("AUTH PLAIN " + btoa("\0" + user + "\0" + pass), [235]);
    await say(`MAIL FROM:<${user}>`, [250]);
    await say(`RCPT TO:<${to}>`, [250, 251]);
    await say("DATA", [354]);
    const body = mime(user, to, subject, text, html).replace(/\r\n\./g, "\r\n..");
    await say(body + "\r\n.", [250]);
    try { await w.write(enc.encode("QUIT\r\n")); } catch {}
  })();
  let timer;
  try { await Promise.race([talk, new Promise((_, no) => { timer = setTimeout(() => no(new Error("Gmail took too long")), 25000); })]); }
  finally { clearTimeout(timer); try { await sock.close(); } catch {} }
}

// ---------- what goes in it ----------
function lum(h) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(h || "")); if (!m) return 0;
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const n = parseInt(m[1], 16); return 0.2126 * f(n >> 16 & 255) + 0.7152 * f(n >> 8 & 255) + 0.0722 * f(n & 255);
}
const hexOk = (h) => /^#[0-9a-f]{6}$/i.test(String(h || ""));
const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
// a team chip like the app's: the team color with its alternate color as a stripe, text that stays readable
// ESPN's team logo (the dark-theme copy, since the email is dark), when the game carries one; the lettered chip otherwise
function mark(g, sd) {
  const ab = g[sd + "Abbr"] || String(g[sd] || "").slice(0, 3).toUpperCase();
  const m = /^https:\/\/a\.espncdn\.com\/i\/teamlogos\/([a-z0-9]+)\/500(?:-dark)?\/(?:scoreboard\/)?([\w-]+\.png)$/i.exec(String(g[sd + "Logo"] || ""));
  if (!m) return chip(ab, g[sd + "Color"], g[sd + "Alt"]);
  const src = `https://a.espncdn.com/combiner/i?img=/i/teamlogos/${m[1].toLowerCase()}/500-dark/${m[2].toLowerCase()}&w=96&h=96`;
  return `<img src="${src}" width="30" height="30" alt="${esc(ab)}" style="display:block;margin:0 6px;border:0;font:800 12px ${FONT};color:${C.ink}">`;
}
function chip(abbr, fill, ring) {
  let f = hexOk(fill) ? fill : C.raise, r = hexOk(ring) ? ring : "#ffffff";
  if (lum(f) > 0.72 && hexOk(ring) && lum(ring) < 0.72) { f = ring; r = fill; }
  if (r.toLowerCase() === f.toLowerCase()) r = "#ffffff";
  const ink = lum(f) > 0.72 ? "#111111" : contrast(f, "#ffffff") < 4.5 && contrast(f, "#0C1117") > contrast(f, "#ffffff") ? "#0C1117" : "#ffffff";
  const t = String(abbr || "").slice(0, 4);
  return `<span style="display:inline-block;width:42px;height:22px;line-height:22px;text-align:center;border-radius:4px;background:${f};border-bottom:2px solid ${r};color:${ink};font:800 ${t.length > 3 ? 11 : 12}px ${FONT};letter-spacing:.02em">${esc(t)}</span>`;
}
const rank = (n) => (Number(n) > 0 && Number(n) <= 25 ? `<span style="color:${C.dim};font-weight:700;font-size:12px">${Number(n)}&nbsp;</span>` : "");

export async function buildEmail(env, who, nowT) {
  const tz = okTz(who.tz) ? who.tz : "America/Chicago", prefix = prefixOf(who.id);
  const date = local(nowT || new Date(), tz).date, prev = prevDay(date);
  const base = await getDocs(env, [`alertsets/${date}`, `alertsets/${prev}`, `scores/${prev}`, `slates/${date}`, `previews/${date}`]);
  const aset = base[`alertsets/${date}`];
  if (!aset || !Array.isArray(aset.people)) return { wait: true, why: "today's slate isn't ready yet" };
  const me = aset.people.find((p) => p && p.prefix === prefix);
  if (!me) return { skip: true, why: "no slate for this person yet" };
  const games = aset.games || {}, mine = new Set(me.mine || []);
  const ids = [...new Set([...(me.slate || []), ...(me.mine || [])])].filter((i) => games[i]);
  // records, standings and colors from the day's games (college games are in their own documents)
  const more = {}, need = [...new Set(ids.map((i) => games[i].league).filter((l) => COLLEGE[l]))].map((l) => `slates/${date}-${l}`);
  const cdocs = need.length ? await getDocs(env, need) : {};
  for (const d of [base[`slates/${date}`], ...Object.values(cdocs)]) for (const g of (d && d.games) || []) if (g && g.id) more[g.id] = g;
  const odds = ((base[`previews/${date}`] || {}).games) || {};
  const today = ids.map((id) => Object.assign({ id, mine: mine.has(id) }, more[id] || {}, games[id]))
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start) || (b.mine ? 1 : 0) - (a.mine ? 1 : 0));
  // last night: their slate and teams that day, with the final score
  const pa = base[`alertsets/${prev}`] || {}, pme = (pa.people || []).find((p) => p && p.prefix === prefix) || {}, pg = pa.games || {}, sc = ((base[`scores/${prev}`] || {}).games) || {};
  const pmine = new Set(pme.mine || []), pmore = {};
  for (const g of (((await getDocs(env, [`slates/${prev}`]))[`slates/${prev}`] || {}).games) || []) if (g && g.id) pmore[g.id] = g;
  const results = [...new Set([...(pme.slate || []), ...(pme.mine || [])])]
    .filter((i) => pg[i] && sc[i] && sc[i].state === "post" && sc[i].a != null && sc[i].h != null)
    .map((id) => Object.assign({ id, mine: pmine.has(id), s: sc[id] }, pmore[id] || {}, pg[id]))
    .sort((a, b) => (b.mine ? 1 : 0) - (a.mine ? 1 : 0) || Date.parse(a.start) - Date.parse(b.start)).slice(0, 12);
  if (!today.length && !results.length) return { skip: true, why: "no games and no results" };

  const lineOf = (g) => {
    const o = (odds[g.id] || {}).odds; if (!who.lines || !o) return "";
    const p = [o.spread ? String(o.spread) : "", o.total ? "O/U " + o.total : ""].filter(Boolean); return p.join(" · ");
  };
  const name = String(who.name || "").trim(), wd = dayName(date, { weekday: "long" }), md = dayName(date, { month: "short", day: "numeric" });
  const top = today.find((g) => g.mine) || today[0];
  const nm = (g, sd) => g[sd + "Short"] || g[sd] || "";
  const subject = today.length
    ? `${wd}: ${nm(top, "away")} at ${nm(top, "home")}${today.length > 1 ? ` and ${today.length - 1} more` : ""} on your slate`
    : `${wd}: no games on your slate, plus last night's results`;
  const lead = today.length
    ? `${today.length} game${today.length === 1 ? "" : "s"} on your slate today, the first at ${clock(today[0].start, tz)}.`
    : "No games on your slate today.";

  // ---- plain text ----
  const tx = [`${name ? "Good morning, " + name + ". " : ""}${lead}`, ""];
  if (today.length) {
    tx.push("TODAY");
    for (const g of today) {
      const ln = lineOf(g);
      tx.push(`${clock(g.start, tz)}  ${g.away} at ${g.home}${g.mine ? "  (your team)" : ""}`);
      tx.push(`        ${[LG[g.league] || "", (g.tv || [])[0] || ""].filter(Boolean).join(" · ")}${ln ? " · " + ln : ""}`);
      tx.push(`        ${APP}/?game=${encodeURIComponent(g.id)}`);
    }
    tx.push("");
  }
  if (results.length) {
    tx.push("LAST NIGHT");
    for (const g of results) tx.push(`${nm(g, "away")} ${g.s.a}, ${nm(g, "home")} ${g.s.h} (${g.s.detail || "Final"})`);
    tx.push("");
  }
  tx.push(`Open Slate: ${APP}`, "", "Sent from DJ's Gmail by Slate. Change the time or turn it off in Slate: Settings > Morning email.");

  // ---- html ----
  const row = (inner, first) => `<tr><td style="padding:12px 16px;border-top:${first ? "0" : "1px solid " + C.hair}">${inner}</td></tr>`;
  const team = (g, sd, extra) => {
    const rec = g[sd + "Record"] ? `<span style="color:${C.muted};font-weight:700;font-size:13px">&nbsp;&nbsp;${esc(g[sd + "Record"])}</span>` : "";
    return `<tr><td width="50" style="padding:3px 8px 3px 0;vertical-align:middle">${mark(g, sd)}</td>`
      + `<td style="padding:3px 0;vertical-align:middle;font:800 16px ${FONT};color:${C.ink}">${rank(g[sd + "Rank"])}${esc(g[sd] || "")}${rec}</td>${extra || ""}</tr>`;
  };
  const sec = (title, count) => `<tr><td style="padding:24px 16px 8px;font:800 22px ${FONT};color:${C.head};letter-spacing:-.01em">${title}${count ? `<span style="font-size:15px;color:${C.dim};font-weight:700">&nbsp;&nbsp;${count}</span>` : ""}</td></tr>`;
  let h = "";
  if (today.length) {
    h += sec("Today", today.length);
    h += `<tr><td style="padding:0 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.card};border-radius:8px">`;
    today.forEach((g, i) => {
      const meta = [LG[g.league] || "", (g.tv || [])[0] || ""].filter(Boolean).map(esc).join(" · "), ln = lineOf(g), url = `${APP}/?game=${encodeURIComponent(g.id)}`;
      const tag = g.mine ? `<span style="display:inline-block;margin-left:8px;padding:0 6px;border-radius:4px;background:${C.fill};color:${C.on};font:800 11px/18px ${FONT}">Your team</span>` : "";
      h += row(`<a href="${url}" style="text-decoration:none;color:${C.ink};display:block">`
        + `<div style="font:800 15px ${NARROW};color:${C.ink};margin-bottom:6px">${esc(clock(g.start, tz))}<span style="font:700 13px ${FONT};color:${C.muted}">&nbsp;&nbsp;${meta}</span>${tag}</div>`
        + `<table role="presentation" cellpadding="0" cellspacing="0" width="100%">${team(g, "away")}${team(g, "home")}</table>`
        + (ln ? `<div style="margin-top:6px;font:700 13px ${FONT};color:${C.dim}">${esc(ln)}</div>` : "")
        + `</a>`, i === 0);
    });
    h += `</table></td></tr>`;
  }
  if (results.length) {
    h += sec("Last night", "");
    h += `<tr><td><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.card};border-radius:8px">`;
    results.forEach((g, i) => {
      const aw = g.s.a > g.s.h, hw = g.s.h > g.s.a;
      const score = (v, win) => `<td align="right" style="padding:3px 0;vertical-align:middle;font:800 20px ${NARROW};color:${win ? C.ink : C.muted};width:44px">${esc(v)}</td>`;
      h += row(`<div style="font:700 13px ${FONT};color:${C.muted};margin-bottom:6px">${esc(g.s.detail || "Final")}<span style="color:${C.dim}">&nbsp;&nbsp;${esc(LG[g.league] || "")}</span>${g.mine ? `<span style="display:inline-block;margin-left:8px;padding:0 6px;border-radius:4px;background:${C.fill};color:${C.on};font:800 11px/18px ${FONT}">Your team</span>` : ""}</div>`
        + `<table role="presentation" cellpadding="0" cellspacing="0" width="100%">${team(g, "away", score(g.s.a, aw))}${team(g, "home", score(g.s.h, hw))}</table>`, i === 0);
    });
    h += `</table></td></tr>`;
  }
  const pre = today.length ? today.slice(0, 3).map((g) => `${nm(g, "away")} at ${nm(g, "home")} ${clock(g.start, tz)}`).join(" · ") : results.slice(0, 3).map((g) => `${nm(g, "away")} ${g.s.a}, ${nm(g, "home")} ${g.s.h}`).join(" · ");
  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark light"><meta name="supported-color-schemes" content="dark light"><title>${esc(subject)}</title>
<style>:root{color-scheme:dark light;supported-color-schemes:dark light}body{margin:0;padding:0;background:${C.bg}}a{color:${C.accent}}</style></head>
<body style="margin:0;padding:0;background:${C.bg};-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${C.bg}">${esc(pre)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg}"><tr><td align="center" style="padding:16px 12px 32px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;font-family:${FONT};color:${C.ink}">
<tr><td style="padding:8px 16px 0;font:800 13px ${FONT};color:${C.accent};letter-spacing:.04em">SLATE</td></tr>
<tr><td style="padding:4px 16px 0;font:800 28px ${FONT};color:${C.ink};letter-spacing:-.01em">${esc(wd)}, ${esc(md)}</td></tr>
<tr><td style="padding:8px 16px 0;font:700 16px/1.4 ${FONT};color:${C.muted}">${name ? "Good morning, " + esc(name) + ". " : ""}${esc(lead)}</td></tr>
${h}
<tr><td style="padding:24px 16px 0"><a href="${APP}" style="display:block;background:${C.fill};color:${C.on};text-decoration:none;border-radius:8px;padding:14px 16px;font:800 16px ${FONT};text-align:center">Open Slate</a></td></tr>
<tr><td style="padding:16px 16px 0;font:700 13px/1.5 ${FONT};color:${C.dim}">${who.lines ? "Lines are DraftKings', from ESPN. " : ""}Sent from DJ's Gmail by Slate. Change the time or turn it off in Slate: Settings &gt; Morning email.</td></tr>
</table></td></tr></table></body></html>`;
  return { date, subject, text: tx.join("\n"), html, games: today.length, results: results.length };
}

// ---------- the minute job ----------
export async function runMorningEmail(env) {
  if (!env.SUPABASE_SECRET || !gmailReady(env)) return;
  const now = new Date(), doc = (await getDocs(env, [DOC]))[DOC] || {}, people = doc.people || {};
  for (const [id, p] of Object.entries(people)) {
    if (!p || !p.on || !p.email) continue;
    const tz = okTz(p.tz) ? p.tz : "America/Chicago", lt = local(now, tz), at = hm(p.time);
    if (at < 0 || p.last === lt.date || lt.min < at || lt.min > at + 240) continue;  // due from their time until four hours after it
    if (p.sending && now - Date.parse(p.sending) < 10 * 60000) continue;           // another run is on it
    await mergeDoc(env, DOC, { people: { [id]: { sending: now.toISOString() } } });
    let patch;
    try {
      const out = await buildEmail(env, Object.assign({ id }, p), now);
      if (out.wait) patch = lt.min > at + 180 ? { last: lt.date, note: out.why } : { note: out.why };
      else if (out.skip) patch = { last: lt.date, note: "skipped: " + out.why };
      else {
        const to = await unseal(env, p.email); if (!to) throw new Error("the saved address can't be read; enter it again in Settings");
        await sendGmail(env, to, out.subject, out.text, out.html);
        patch = { last: lt.date, sentAt: now.toISOString(), note: `sent: ${out.games} games, ${out.results} results`, err: "" };
      }
    } catch (e) {
      // try again on the next minutes, three times a day at most
      const fails = (p.failDay === lt.date ? Number(p.fails) || 0 : 0) + 1;
      patch = { failDay: lt.date, fails, err: String(e && e.message || e).slice(0, 200) };
      if (fails >= 3) patch.last = lt.date;
      console.log("morning email", id, patch.err);
    }
    await mergeDoc(env, DOC, { people: { [id]: Object.assign({ sending: "" }, patch) } });
  }
}

// ---------- Settings: POST /api/morning-email {pass, action: "get" | "save" | "test" | "preview", ...} ----------
const EMAIL = /^[^\s@<>()"',;:]{1,64}@[A-Za-z0-9.-]{1,180}\.[A-Za-z]{2,24}$/;
export async function morningApi(env, me, p) {
  const doc = (await getDocs(env, [DOC]))[DOC] || {}, cur = (doc.people || {})[me.id] || {};
  const view = async (x) => ({ on: !!x.on, time: x.time || "07:00", tz: x.tz || "", lines: !!x.lines, email: await unseal(env, x.email), last: x.last || "",
    sentAt: x.sentAt || "", err: x.err || "", note: x.note || "", ready: gmailReady(env) });
  if (p.action === "get") return { ok: true, prefs: await view(cur) };
  if (p.action === "save") {
    const patch = { name: me.name || me.id };
    if (typeof p.on === "boolean") patch.on = p.on;
    if (typeof p.lines === "boolean") patch.lines = p.lines;
    if (p.time !== undefined) { const m = hm(p.time); if (m < 4 * 60 || m > 12 * 60 || m % 15) return { error: "Pick a time between 4 AM and noon." }; patch.time = String(p.time); }
    if (p.tz !== undefined) { if (!okTz(String(p.tz))) return { error: "Unknown time zone" }; patch.tz = String(p.tz); }
    if (p.email !== undefined) {
      const e = String(p.email || "").trim();
      if (e && !EMAIL.test(e)) return { error: "That email address doesn't look right." };
      patch.email = e ? await seal(env, e) : "";
      if (!e) patch.on = false;
    }
    if (patch.on && !(patch.email !== undefined ? patch.email : cur.email)) return { error: "Add your email address first." };
    // changing the time to later today, after today's went out, doesn't send a second one: "last" stays
    await mergeDoc(env, DOC, { people: { [me.id]: patch } });
    return { ok: true, prefs: await view(Object.assign({}, cur, patch)) };
  }
  if (p.action === "test" || p.action === "preview") {
    const out = await buildEmail(env, Object.assign({ id: me.id }, cur, { name: me.name, lines: typeof p.lines === "boolean" ? p.lines : !!cur.lines }), new Date());
    if (out.wait || out.skip) return { error: out.wait ? "Today's slate isn't ready yet. Try again in a few minutes." : "Nothing to send today: no games on your slate and no results from last night." };
    if (p.action === "preview") return { ok: true, subject: out.subject, html: out.html, text: out.text };
    if (!gmailReady(env)) return { error: "Sending isn't set up yet. DJ needs to connect his Gmail." };
    const to = await unseal(env, cur.email); if (!to) return { error: "Add your email address first." };
    // a few test sends a day, so a stuck button can't flood an inbox
    const day = local(new Date(), "America/Chicago").date, n = cur.testDay === day ? Number(cur.tests) || 0 : 0;
    if (n >= 5) return { error: "That's five test emails today. Try again tomorrow." };
    await mergeDoc(env, DOC, { people: { [me.id]: { testDay: day, tests: n + 1 } } });
    try { await sendGmail(env, to, out.subject, out.text, out.html); } catch (e) { return { error: "Couldn't send: " + String(e && e.message || e) }; }
    return { ok: true, sent: true };
  }
  return { error: "bad request" };
}
