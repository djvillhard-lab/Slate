// The morning email (3.55.0, redone in 3.62.0 to look like the slate page): each person who turns it on in Settings
// gets their own slate by email every morning, from DJ's Gmail.
//   1. Today's slate: the same cards as the slate page, in time groups: league line, the corner tag ("Your team",
//      "Heavyweights", "All NBA"), team logos, names and records, the time and channel, and the one-line preview.
//   2. Your teams yesterday: each of their final games with the score and Claude's recap.
//   3. Last night: the rest of yesterday's slate, final scores.
// It's drawn in the person's own theme and accent (the phone sends its colors when they save the setting).
// The tag and preview line come from the app's own code (worker/slate-kit.js, copied by scripts/email_kit.py).
//
// Sending: Gmail's mail server (smtp.gmail.com, port 465) over a Workers TCP socket, signed in with a Gmail app password.
// Set in Cloudflare (Workers > slate > Settings > Variables and Secrets), never in the repo:
//   GMAIL_USER          the Gmail address it sends from
//   GMAIL_APP_PASSWORD  a Google app password (needs 2-Step Verification on that account)
//
// Settings live in mail/schedule {people: {<id>: {on, time "07:00", tz, lines, name, look, email (encrypted), last, ...}}}.
// The data is readable with the app's public key, so the address is stored encrypted with a key only the server has
// (derived from SUPABASE_SECRET). The minute cron reads that one doc. 45 minutes before a person's time it asks Claude
// for recaps of their teams' games from yesterday (shared with the app, like a tapped recap; logged as "email" so they
// don't count toward anyone's 10 a day). At their time it sends, waiting up to 20 minutes for a recap still being
// written. "last" (their local date) and a 10-minute lease make a day go out once.

import { connect } from "cloudflare:sockets";
import { slateKit } from "./slate-kit.js";

const SB = "https://xpkzcdaawaqiqgwkkwst.supabase.co";
const APP = "https://slate.djvillhard.workers.dev";
const DOC = "mail/schedule";
const COLLEGE = { ncaaf: 1, ncaam: 1, ncaaw: 1 };
const RECAPS_A_DAY = 6;  // Claude recaps started for one person's morning email, at most
// Midnight, Slate's default look; a person's saved look replaces it
const MIDNIGHT = { bg: "#121821", card: "#1A2230", raise: "#232D3C", line: "#2B3647", hair: "#283243", ink: "#ECF1F7", muted: "#A0ACBD", dim: "#8794A8",
  head: "#CAD3DF", accent: "#45A85E", fill: "#3E9E5A", on: "#0C0C0C", live: "#FF5A5F", dark: true };
const FONT = "Archivo,-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
// condensed numerals (times, scores): Archivo's narrow width where the mail app loads it, a condensed system face otherwise
const NARROW = "Archivo,'Avenir Next Condensed','Arial Narrow','Roboto Condensed',-apple-system,Helvetica,Arial,sans-serif";

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


// ---------- the look ----------
const COLOR = /^(#[0-9a-f]{6}|rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(,\s*(0|1|0?\.\d+)\s*)?\))$/i;
// the colors the phone sent (Settings, on save), checked one by one; Midnight for anything missing
export function cleanLook(x) {
  const o = {}; if (!x || typeof x !== "object") return null;
  for (const k of Object.keys(MIDNIGHT)) if (k !== "dark" && typeof x[k] === "string" && COLOR.test(x[k].trim())) o[k] = x[k].trim();
  if (Object.keys(o).length < 6) return null;
  o.dark = x.dark !== false; return o;
}
function lum(h) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(h || "")); if (!m) return 0;
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const n = parseInt(m[1], 16); return 0.2126 * f(n >> 16 & 255) + 0.7152 * f(n >> 8 & 255) + 0.0722 * f(n & 255);
}
const hexOk = (h) => /^#[0-9a-f]{6}$/i.test(String(h || ""));
const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

// every color as plain #rrggbb (rgba blended onto the background), since mail apps handle hex best and bgcolor needs it
function hexOf(c, base) {
  c = String(c || "").trim(); if (hexOk(c)) return c.toUpperCase();
  const m = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/i.exec(c); if (!m) return null;
  const a = m[4] === undefined ? 1 : Math.max(0, Math.min(1, Number(m[4])));
  const b = base && hexOk(base) ? [1, 3, 5].map((i) => parseInt(base.slice(i, i + 2), 16)) : [0, 0, 0];
  return "#" + [m[1], m[2], m[3]].map((v, i) => Math.round(Math.min(255, Number(v)) * a + b[i] * (1 - a)).toString(16).padStart(2, "0")).join("").toUpperCase();
}
function solidLook(T) {
  const o = { dark: T.dark }; o.bg = hexOf(T.bg) || MIDNIGHT.bg;
  for (const k of Object.keys(MIDNIGHT)) if (k !== "dark" && k !== "bg") o[k] = hexOf(T[k], o.bg) || MIDNIGHT[k];
  return o;
}

// 3.67.3: mail apps' dark modes (Outlook's above all) repaint emails, turning Slate's dark theme a muddy gray, and they
// turn times and dates into blue links. This keeps the email in the phone's own colors: every inline color also gets a
// class that Outlook's dark mode ([data-ogsc] text, [data-ogsb] backgrounds) is told to leave alone, tables and cells
// get bgcolor, font shorthands are spelled out (Outlook drops "font:" and with it the weights), and times and dates get
// an invisible joiner so the phone doesn't see them as something to link.
function emailize(html) {
  const ids = new Map(), cls = (c) => { if (!ids.has(c)) ids.set(c, ids.size); return ids.get(c); };
  const out = html.replace(/<(\w+)((?:\s[^>]*?)?)\sstyle="([^"]*)"/g, (all, tag, attrs, st) => {
    st = st.replace(/(^|;)\s*font:\s*(\d{3})\s+(\d+)px(?:\/([\d.]+(?:px)?))?\s+([^;]+)/g, (m, pre, w, sz, lh, fam) =>
      `${pre}font-weight:${w};font-size:${sz}px;${lh ? `line-height:${lh};` : ""}font-family:${fam.trim()}`);
    const add = [], c = /(?:^|;)\s*color:\s*(#[0-9a-f]{6})/i.exec(st), b = /(?:^|;)\s*background:\s*(#[0-9a-f]{6})/i.exec(st);
    if (c) add.push("oc" + cls(c[1].toUpperCase()));
    if (b) { add.push("ob" + cls(b[1].toUpperCase())); st = st.replace(/(^|;)(\s*)background:\s*(#[0-9a-f]{6})/i, "$1$2background:$3;background-color:$3"); }
    let a = attrs;
    if (b && /^(table|td|body)$/i.test(tag) && !/\sbgcolor=/i.test(a)) a += ` bgcolor="${b[1]}"`;
    if (add.length) a = /\sclass="/.test(a) ? a.replace(/\sclass="/, ` class="${add.join(" ")} `) : a + ` class="${add.join(" ")}"`;
    return `<${tag}${a} style="${st}"`;
  });
  const rules = [];
  for (const [c, i] of ids) rules.push(`[data-ogsc] .oc${i}{color:${c}!important}`, `[data-ogsb] .ob${i}{background-color:${c}!important}`, `[data-ogsc] .ob${i}{background-color:${c}!important}`);
  // times ("1:45 pm", "6:00") and dates ("Nov 17") in the text, never inside tags or links' addresses
  const M = "Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec|January|February|March|April|June|July|August|September|October|November|December";
  const text = (t) => t.replace(/(\d{1,2}):(\d\d)/g, "$1&#8204;:&#8204;$2").replace(new RegExp(`\\b(${M})\\.?\\s(\\d{1,2})\\b`, "g"), "$1&#8204; &#8204;$2");
  const body = out.replace(/>([^<]+)</g, (m, t) => ">" + text(t) + "<");
  return body.replace("</style>", rules.join("") + "</style>");
}

// ---------- the cards, drawn like the slate page's ----------
function painter(T, kit, tz) {
  const time = (t) => new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" }).format(new Date(t));
  // the team chip: ESPN's logo (the theme's copy) when the game has one, the lettered team-color chip otherwise (badgeFor)
  const badge = (g, sd) => {
    const ab = kit.abbr(g, sd);
    const m = /\/i\/teamlogos\/([a-z0-9]+)\/500(?:-dark)?\/(?:scoreboard\/)?([\w-]+\.png)/i.exec(String(g[sd + "Logo"] || ""));
    if (m) return `<img src="https://a.espncdn.com/combiner/i?img=/i/teamlogos/${m[1].toLowerCase()}/${T.dark ? "500-dark" : "500"}/${m[2].toLowerCase()}&amp;w=96&amp;h=96" width="28" height="28" alt="${esc(ab)}" style="display:block;margin:0 auto;border:0;width:28px;height:28px;font:800 11px ${FONT};color:${T.muted}">`;
    let f = hexOk(g[sd + "Color"]) ? g[sd + "Color"] : T.raise, r = hexOk(g[sd + "Alt"]) ? g[sd + "Alt"] : "#ffffff";
    if (lum(f) > 0.72 && hexOk(g[sd + "Alt"]) && lum(r) < 0.72) { const x = f; f = r; r = x; }
    if (r.toLowerCase() === f.toLowerCase()) r = "#ffffff";
    const ink = lum(f) > 0.72 ? "#111111" : contrast(f, "#ffffff") < 4.5 && contrast(f, "#0C1117") > contrast(f, "#ffffff") ? "#0C1117" : "#ffffff";
    return `<span style="display:block;width:36px;height:20px;line-height:20px;margin:0 auto;text-align:center;border-radius:4px;background:${f};box-shadow:inset 0 -2px 0 ${r};color:${ink};font:800 ${ab.length > 3 ? 10 : 12}px ${NARROW};font-stretch:78%">${esc(ab)}</span>`;
  };
  const icon = (lg) => {
    const k = kit.SPORT[lg] || (kit.LEAGUES[lg] ? "soc" : null), d = k && kit.SPORT_PATH[k]; if (!d) return "";
    return `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:4px"><path d="${d}"/></svg>`;
  };
  const star = `<span style="color:${T.accent};font-size:11px">&nbsp;&#9733;</span>`;
  // one card: league line and corner tag, a row per team (chip, name, star, record, score), the side (time or Final, channel), then extra lines
  const card = (g, o) => {
    const over = !!o.sc, sc = o.sc || {}, url = `${APP}/?game=${encodeURIComponent(g.id)}`;
    const lgColor = over ? T.dim : T.muted, tag = o.tag ? `<td align="right" valign="top" style="padding:0"><span style="display:inline-block;padding:3px 8px 4px;border-radius:0 8px 0 8px;background:${T.raise};color:${over ? T.dim : T.muted};font:700 11px/13px ${FONT};white-space:nowrap">${o.tagStar ? `<span style="color:${T.accent}">&#9733;</span> ` : ""}${esc(o.tag)}</span></td>` : `<td></td>`;
    const lg = `<td style="padding:12px 0 0 12px;font:700 13px/17px ${FONT};color:${lgColor}">${icon(g.league)}${esc(kit.info(g).name)}${g.note ? `<span style="color:${T.dim}">&nbsp;&nbsp;${esc(g.note)}</span>` : ""}</td>`;
    const tv = (g.tv || []).filter(Boolean).slice(0, 2);
    const sides = kit.sideOrder(g);
    const rows = sides.map((sd, i) => {
      const mineS = over ? Number(sd === "away" ? sc.a : sc.h) : 0, oth = over ? Number(sd === "away" ? sc.h : sc.a) : 0, lose = over && mineS < oth;
      const nmColor = over ? (lose ? T.dim : T.head) : T.ink;
      const rk = g[sd + "Rank"] ? `<span style="font:800 13px ${NARROW};font-stretch:80%;color:${T.muted}">${esc(g[sd + "Rank"])}&nbsp;</span>` : "";
      const fav = o.favs && o.favs(g, sd) ? star : "";
      const rec = g[sd + "Record"] ? `<span style="font:400 13px ${FONT};color:${T.dim}">&nbsp;${esc(g[sd + "Record"])}</span>` : "";
      const score = over ? `<td width="30" align="right" style="padding:0 0 0 6px;font:800 22px/1 ${NARROW};font-stretch:66%;color:${lose ? T.dim : T.head}">${esc(sd === "away" ? sc.a : sc.h)}</td>` : "";
      const side = i === 0
        ? (over ? `<span style="font:800 15px ${NARROW};font-stretch:78%;color:${T.dim}">${esc(/OT|SO|\//.test(sc.detail || "") ? sc.detail : "Final")}</span>` : `<span style="font:700 13px ${FONT};color:${T.muted}">${esc(time(g.start))}</span>`)
        : (!over && tv[0] ? `<span style="font:800 13px ${FONT};font-stretch:92%;color:${T.head};white-space:nowrap"><span style="color:${T.accent};font-size:9px">&#9654;</span>&nbsp;${esc(tv[0])}</span>` : "");
      return `<tr><td width="40" style="padding:4px 12px 4px 0;vertical-align:middle">${badge(g, sd)}</td>`
        + `<td style="padding:4px 0;vertical-align:middle;font:700 16px/21px ${FONT};color:${nmColor}">${rk}${esc(kit.short(g, sd))}${fav}${rec}</td>${score}`
        + `<td align="right" style="padding:4px 0 4px 8px;vertical-align:middle;white-space:nowrap">${side}</td></tr>`;
    }).join("");
    const extra = (o.lines || []).filter(Boolean).join("");
    return `<tr><td style="padding:0 0 8px"><a href="${url}" style="text-decoration:none;color:${T.ink};display:block">`
      + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${T.card};border-radius:8px;border-collapse:separate">`
      + `<tr><td><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${lg}${tag}</tr></table></td></tr>`
      + `<tr><td style="padding:4px 12px ${extra ? 0 : 12}px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table></td></tr>`
      + (extra ? `<tr><td style="padding:0 12px 12px">${extra}</td></tr>` : "")
      + `</table></a></td></tr>`;
  };
  const preview = (t) => `<div style="margin-top:8px;font:500 13px/17px ${FONT};color:${T.muted}">${esc(t)}</div>`;
  const recap = (r) => `<div style="margin-top:10px"><div style="font:800 13px ${FONT};color:${T.muted};margin-bottom:4px">Recap</div><div style="font:400 15px/1.45 ${FONT};color:${T.ink}">${esc(r)}</div></div>`;
  const small = (t) => `<div style="margin-top:6px;font:700 13px ${FONT};color:${T.dim}">${esc(t)}</div>`;
  // the slate's time header: "6:00" in condensed numerals, "pm" small beside it
  const timeHead = (t) => {
    const s = time(t), m = /^(\d+:\d\d)\s*([AP]M)$/i.exec(s);
    return `<tr><td style="padding:16px 0 8px"><span style="font:800 22px/1 ${NARROW};font-stretch:66%;color:${T.ink}">${esc(m ? m[1] : s)}</span>${m ? `<span style="font:700 13px ${FONT};color:${T.muted}">&nbsp;${m[2].toLowerCase()}</span>` : ""}</td></tr>`;
  };
  const sec = (title, count) => `<tr><td style="padding:28px 0 4px;font:800 22px ${FONT};font-stretch:112%;color:${T.head};letter-spacing:-.01em">${esc(title)}${count ? `<span style="font:700 15px ${FONT};color:${T.dim}">&nbsp;&nbsp;${count}</span>` : ""}</td></tr>`;
  return { card, preview, recap, small, timeHead, sec, time };
}

// ---------- what goes in it ----------
const pool = async (items, n, fn) => { const out = new Array(items.length); let i = 0; await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (i < items.length) { const k = i++; try { out[k] = await fn(items[k]); } catch { out[k] = null; } } })); return out; };

// everything the email needs, for one person on their local date: today's slate, yesterday's teams and the rest of last night
async function gather(env, who, date) {
  const prefix = prefixOf(who.id), prev = prevDay(date);
  const base = await getDocs(env, [`alertsets/${date}`, `alertsets/${prev}`, `scores/${prev}`, `slates/${date}`, `slates/${prev}`, `previews/${date}`, `previews/${prev}`,
    `${prefix}mine/user-settings`, `${prefix}mine/user-lineup-${date}`, ...(who.id === "dj" ? ["prefs/pvlines"] : [])]);
  const aset = base[`alertsets/${date}`];
  if (!aset || !Array.isArray(aset.people)) return { wait: "today's slate isn't ready yet" };
  const me = aset.people.find((p) => p && p.prefix === prefix);
  if (!me) return { skip: "no slate for this person yet" };
  const sett = base[`${prefix}mine/user-settings`] || {};
  const pa = base[`alertsets/${prev}`] || {}, pme = (pa.people || []).find((p) => p && p.prefix === prefix) || {};
  // full game details (records, colors, logos) from the day documents; college games are in their own ones
  const games = aset.games || {}, pg = pa.games || {};
  const ids = (me.slate || []).filter((i) => games[i]), pids = [...new Set([...(pme.slate || []), ...(pme.mine || [])])].filter((i) => pg[i]);
  const need = [];
  for (const [d, list, gs] of [[date, ids, games], [prev, pids, pg]]) for (const l of new Set(list.map((i) => gs[i].league).filter((l) => COLLEGE[l]))) need.push(`slates/${d}-${l}`);
  const cdocs = need.length ? await getDocs(env, need) : {};
  const full = (d, id, slim) => {
    for (const p of [`slates/${d}`, `slates/${d}-${slim.league}`]) { const x = ((base[p] || cdocs[p] || {}).games || []).find((g) => g && g.id === id); if (x) return Object.assign({}, x, slim, { id }); }
    return Object.assign({ id }, slim);
  };
  return { date, prev, me, pme, sett, added: new Set(((base[`${prefix}mine/user-lineup-${date}`] || {}).added) || []), today: ids.map((i) => full(date, i, games[i])), yday: pids.map((i) => full(prev, i, pg[i])),
    scores: ((base[`scores/${prev}`] || {}).games) || {}, odds: ((base[`previews/${date}`] || {}).games) || {}, recaps: ((base[`previews/${prev}`] || {}).games) || {},
    pvlines: (base["prefs/pvlines"] || {}).date === date ? (base["prefs/pvlines"].lines || {}) : {} };
}
// team logos for games whose day document came out before logos were saved (the app does the same, 3.60.0):
// ESPN's team list per league, kept at the edge for a week; national teams come from the game's own summary
const LOGO_FEEDS = { nfl: "football/nfl", nba: "basketball/nba", wnba: "basketball/wnba", nhl: "hockey/nhl", mlb: "baseball/mlb",
  ncaaf: "football/college-football", ncaam: "basketball/mens-college-basketball", ncaaw: "basketball/womens-college-basketball",
  mls: "soccer/usa.1", epl: "soccer/eng.1", laliga: "soccer/esp.1", seriea: "soccer/ita.1", bundesliga: "soccer/ger.1", ligue1: "soccer/fra.1",
  ucl: "soccer/uefa.champions", uel: "soccer/uefa.europa" };
const logoNorm = (n) => String(n || "").toLowerCase().replace(/\s*\((men's basketball|women's basketball|football)\)$/, "").replace(/[^a-z0-9]/g, "");
async function logoList(lg) {
  const url = `https://site.api.espn.com/apis/site/v2/sports/${LOGO_FEEDS[lg]}/teams?limit=1000`, cache = typeof caches !== "undefined" ? caches.default : null;
  const key = new Request("https://slate.cache/logos/" + lg);
  let j = null;
  const hit = cache ? await cache.match(key) : null;
  if (hit) j = await hit.json();
  else {
    const r = await fetch(url, { headers: { "user-agent": "slate-email" } }).catch(() => null); if (!r || !r.ok) return {};
    const raw = await r.json().catch(() => null), ts = raw && raw.sports && raw.sports[0] && raw.sports[0].leagues && raw.sports[0].leagues[0] && raw.sports[0].leagues[0].teams;
    j = {}; for (const x of ts || []) { const tm = x.team || {}, h = ((tm.logos || [])[0] || {}).href; if (h && tm.displayName) j[logoNorm(tm.displayName)] = h; }
    if (cache) await cache.put(key, new Response(JSON.stringify(j), { headers: { "cache-control": "max-age=604800" } }));
  }
  return j || {};
}
async function fillLogos(list) {
  const lgs = [...new Set(list.filter((g) => !g.awayLogo || !g.homeLogo).map((g) => g.league).filter((l) => LOGO_FEEDS[l]))];
  const maps = Object.fromEntries(await Promise.all(lgs.map(async (l) => [l, await logoList(l).catch(() => ({}))])));
  for (const g of list) for (const sd of ["away", "home"]) if (!g[sd + "Logo"]) { const h = (maps[g.league] || {})[logoNorm(g[sd])]; if (h) g[sd + "Logo"] = h; }
}
const finals = (d) => d.yday.filter((g) => { const s = d.scores[g.id]; return s && s.state === "post" && s.a != null && s.h != null; });
const favFinals = (d) => { const m = new Set(d.pme.mine || []); return finals(d).filter((g) => m.has(g.id)); };
const writingNow = (e) => e && e.writing && !e.writing.error && Date.now() - Date.parse(e.writing.at) < 12 * 60000;

// Claude's recaps of the person's teams' games from yesterday: started here when one is missing (the same shared recap a tap
// in the app writes). Returns how many are still being written.
export async function startRecaps(env, who, date) {
  const d = await gather(env, who, date); if (d.wait || d.skip || !env.SUMMARY) return 0;
  const kit = slateKit({}), todo = favFinals(d).filter((g) => !((d.recaps[g.id] || {}).recap || {}).text && !writingNow(d.recaps[g.id])).slice(0, RECAPS_A_DAY);
  await pool(todo, 3, async (g) => {
    const sum = g.ev ? await kit.rkFetch(kit.bxSummaryUrl(g.league, g.ev)) : null;
    const facts = sum ? kit.trimEspn(sum, g, "recap") : {}, at = new Date().toISOString();
    await mergeDoc(env, `previews/${d.prev}`, { games: { [g.id]: { writing: { at, kind: "recap" } } } });
    await env.SUMMARY.create({ params: { user: "email", kind: "recap", date: d.prev, id: g.id, key: null, at,
      game: JSON.stringify(kit.clGame(g)).slice(0, 6000), facts: JSON.stringify(facts).slice(0, 16000) } });
  });
  return todo.length + favFinals(d).filter((g) => writingNow(d.recaps[g.id])).length;
}

export async function buildEmail(env, who, nowT) {
  const tz = okTz(who.tz) ? who.tz : "America/Chicago", date = local(nowT || new Date(), tz).date;
  const d = await gather(env, who, date);
  if (d.wait) return { wait: true, why: d.wait };
  if (d.skip) return { skip: true, why: d.skip };
  const T = solidLook(Object.assign({}, MIDNIGHT, cleanLook(who.look) || {}));
  const mineT = Object.fromEntries((d.me.mine || []).map((i) => [i, 1])), mineY = Object.fromEntries((d.pme.mine || []).map((i) => [i, 1]));
  const kit = slateKit({ rules: d.sett.rules, mine: mineT }), kitY = slateKit({ rules: d.sett.rules, mine: mineY }), P = painter(T, kit, tz);
  // the star next to a name: that team is one of yours (from the day's team list; the side is the one whose name matches)
  const teams = (d.sett.teams || []).map((t) => String(t).toLowerCase());
  const favSide = (m) => (g, sd) => !!m[g.id] && teams.some((t) => { const n = String(g[sd] || "").toLowerCase(); return n === t || n.indexOf(t) === 0 || t.indexOf(n) === 0; });

  // 1. today's slate, in time order, with the slate's own tag and preview line
  const today = d.today.slice().sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
  const lines = await pool(today, 6, async (g) => {
    const sum = g.ev && kit.BX_SPORT[g.league] ? await kit.rkFetch(kit.bxSummaryUrl(g.league, g.ev)) : null;
    for (const c of ((((sum && sum.header || {}).competitions || [])[0] || {}).competitors) || []) { const sd = c.homeAway, h = ((c.team || {}).logos || [])[0] || {}; if ((sd === "away" || sd === "home") && !g[sd + "Logo"] && (h.href || (c.team || {}).logo)) g[sd + "Logo"] = h.href || c.team.logo; }
    if (d.pvlines[g.id]) return d.pvlines[g.id];  // the line DJ's phone is showing right now
    if (!sum) return "";
    const q = await kit.pvQB(g.league, sum).catch(() => []);
    return kit.pvCompute(g.league, sum, q) || "";
  });
  const tagOf = (k, g, added) => { const w = k.ruleHits(g).why; return w.length ? w[0] : added ? "Added" : ""; };
  const odds = (g) => { const o = (d.odds[g.id] || {}).odds; if (!who.lines || !o) return ""; return [o.spread || "", o.total ? "O/U " + o.total : ""].filter(Boolean).join(" · "); };
  // 2. yesterday's games for your teams, with Claude's recap; 3. the rest of last night's slate
  const fav = favFinals(d).sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
  const favIds = new Set(fav.map((g) => g.id));
  const rest = finals(d).filter((g) => !favIds.has(g.id) && (d.pme.slate || []).includes(g.id)).sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
  if (!today.length && !fav.length && !rest.length) return { skip: true, why: "no games and no results" };
  await fillLogos([...today, ...fav, ...rest]);
  const pending = fav.filter((g) => !((d.recaps[g.id] || {}).recap || {}).text && writingNow(d.recaps[g.id])).length;

  const name = String(who.name || "").trim(), wd = dayName(date, { weekday: "long" }), md = dayName(date, { month: "short", day: "numeric" });
  const top = today.find((g) => mineT[g.id]) || today[0];
  const pair = (g) => kit.short(g, kit.sideOrder(g)[0]) + kit.sep(g).replace(" @ ", " at ") + kit.short(g, kit.sideOrder(g)[1]);
  // "Today's Slate, Mon, Nov 17: Magic at Celtics and 7 more" (DJ, Nov 17)
  const subject = `Today's Slate, ${dayName(date, { weekday: "short" })}, ${md}: ` + (today.length ? `${pair(top)}${today.length > 1 ? ` and ${today.length - 1} more` : ""}` : "no games, plus last night's results");
  const lead = today.length ? `${today.length} game${today.length === 1 ? "" : "s"} on your slate today, the first at ${P.time(today[0].start)}.` : "No games on your slate today.";

  let h = "", prevT = "";
  if (today.length) {
    h += P.sec("Today's slate", today.length);
    today.forEach((g, i) => {
      const t = P.time(g.start); if (t !== prevT) { h += P.timeHead(g.start); prevT = t; }
      h += P.card(g, { tag: tagOf(kit, g, d.added.has(g.id)), tagStar: !!mineT[g.id], favs: favSide(mineT), lines: [lines[i] ? P.preview(lines[i]) : "", odds(g) ? P.small(odds(g)) : ""] });
    });
  }
  if (fav.length) {
    h += P.sec("Your teams yesterday", "");
    for (const g of fav) {
      const r = ((d.recaps[g.id] || {}).recap || {}).text;
      h += P.card(g, { sc: d.scores[g.id], tag: "Your team", tagStar: true, favs: favSide(mineY), lines: [r ? P.recap(r) : ""] });
    }
  }
  if (rest.length) {
    h += P.sec("Last night", rest.length);
    for (const g of rest) h += P.card(g, { sc: d.scores[g.id], tag: tagOf(kitY, g, false), favs: favSide(mineY) });
  }
  const pre = today.length ? today.slice(0, 3).map((g) => `${pair(g)} ${P.time(g.start)}`).join(" · ") : fav.concat(rest).slice(0, 3).map((g) => `${kit.short(g, "away")} ${d.scores[g.id].a}, ${kit.short(g, "home")} ${d.scores[g.id].h}`).join(" · ");
  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="${T.dark ? "dark" : "light"} only"><meta name="supported-color-schemes" content="${T.dark ? "dark" : "light"} only">
<meta name="format-detection" content="telephone=no,date=no,address=no,email=no,url=no"><meta name="x-apple-disable-message-reformatting"><title>${esc(subject)}</title>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..900&amp;display=swap" rel="stylesheet">
<style>:root{color-scheme:${T.dark ? "dark" : "light"} only;supported-color-schemes:${T.dark ? "dark" : "light"} only}body{margin:0;padding:0;background:${T.bg}}a{color:${T.accent}}
a[x-apple-data-detectors],u+#body a,#MessageViewBody a[href^="x-"]{color:inherit!important;text-decoration:none!important;font-size:inherit!important;font-family:inherit!important;font-weight:inherit!important;line-height:inherit!important}
@media (prefers-color-scheme:dark){body,.slate-bg{background:${T.bg}!important}}</style></head>
<body id="body" class="slate-bg" style="margin:0;padding:0;background:${T.bg};-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${T.bg}">${esc(pre)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${T.bg}"><tr><td align="center" style="padding:16px 12px 32px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;font-family:${FONT};color:${T.ink}">
<tr><td style="padding:4px 0 0;font:800 28px/1.1 ${FONT};font-stretch:112%;color:${T.ink};letter-spacing:-.01em">${esc(wd)}, ${esc(md)}</td></tr>
<tr><td style="padding:8px 0 0;font:700 15px/1.4 ${FONT};color:${T.muted}">${name ? "Good morning, " + esc(name) + ". " : ""}${esc(lead)}</td></tr>
${h}
<tr><td style="padding:20px 0 0"><a href="${APP}" style="display:block;background:${T.fill};color:${T.on};text-decoration:none;border-radius:8px;padding:14px 16px;font:800 16px ${FONT};text-align:center">Open Slate</a></td></tr>
<tr><td style="padding:16px 0 0;font:700 13px/1.5 ${FONT};color:${T.dim}">${who.lines ? "Lines are DraftKings', from ESPN. " : ""}${fav.length ? "Recaps by Claude. " : ""}Sent from DJ's Gmail by Slate. Change the time or turn it off in Slate: Settings &gt; Morning email.</td></tr>
</table></td></tr></table></body></html>`;

  // plain text, for mail apps that don't show the designed version
  const tx = [`${name ? "Good morning, " + name + ". " : ""}${lead}`, ""];
  if (today.length) {
    tx.push("TODAY'S SLATE");
    today.forEach((g, i) => tx.push(`${P.time(g.start)}  ${pair(g)}${(g.tv || [])[0] ? "  " + g.tv[0] : ""}`, ...(lines[i] ? ["        " + lines[i]] : []), `        ${APP}/?game=${encodeURIComponent(g.id)}`));
    tx.push("");
  }
  const res = (g) => { const s = d.scores[g.id]; return `${kit.short(g, "away")} ${s.a}, ${kit.short(g, "home")} ${s.h} (${s.detail || "Final"})`; };
  if (fav.length) { tx.push("YOUR TEAMS YESTERDAY"); for (const g of fav) { tx.push(res(g)); const r = ((d.recaps[g.id] || {}).recap || {}).text; if (r) tx.push(r); tx.push(""); } }
  if (rest.length) { tx.push("LAST NIGHT"); for (const g of rest) tx.push(res(g)); tx.push(""); }
  tx.push(`Open Slate: ${APP}`, "", "Sent from DJ's Gmail by Slate. Change the time or turn it off in Slate: Settings > Morning email.");
  return { date, subject, text: tx.join("\n"), html: emailize(html), games: today.length, results: fav.length + rest.length, pending };
}

// ---------- the minute job ----------
async function sendNow(env, p, out) {
  const to = await unseal(env, p.email); if (!to) throw new Error("the saved address can't be read; enter it again in Settings");
  await sendGmail(env, to, out.subject, out.text, out.html);
}
export async function runMorningEmail(env) {
  if (!env.SUPABASE_SECRET || !gmailReady(env)) return;
  const now = new Date(), doc = (await getDocs(env, [DOC]))[DOC] || {}, people = doc.people || {};
  for (const [id, p] of Object.entries(people)) {
    if (!p || !p.email) continue;
    const tz = okTz(p.tz) ? p.tz : "America/Chicago", lt = local(now, tz), at = hm(p.time);
    const testAge = p.testAt ? (now - Date.parse(p.testAt)) / 60000 : -1, testDue = testAge >= 0 && testAge < 15;
    const daily = p.on && at >= 0 && p.last !== lt.date && lt.min >= at - 45 && lt.min <= at + 240;
    if (!testDue && !daily) continue;
    if (p.sending && now - Date.parse(p.sending) < 10 * 60000) continue;  // another run is on it
    // 45 minutes ahead (or right after "Send one now", or on turning it on late): have Claude write the missing recaps, once a day
    if (p.prepDay !== lt.date) {
      await mergeDoc(env, DOC, { people: { [id]: { prepDay: lt.date } } });
      try { await startRecaps(env, Object.assign({ id }, p), lt.date); } catch (e) { console.log("morning email recaps", id, String(e)); }
      continue;
    }
    if (!testDue && lt.min < at) continue;
    await mergeDoc(env, DOC, { people: { [id]: { sending: now.toISOString() } } });
    let patch;
    try {
      // a recap still being written: wait for it, 20 minutes at most (5 for a test)
      const out = await buildEmail(env, Object.assign({ id }, p), now);
      if (out.pending && (testDue ? testAge < 5 : lt.min < at + 20)) patch = { note: "waiting for Claude's recaps" };
      else if (testDue) {
        if (out.wait || out.skip) patch = { testAt: "", note: "test not sent: " + out.why };
        else { await sendNow(env, p, out); patch = { testAt: "", note: `test sent: ${out.games} games, ${out.results} results`, err: "" }; }
      } else if (out.wait) patch = lt.min > at + 180 ? { last: lt.date, note: out.why } : { note: out.why };
      else if (out.skip) patch = { last: lt.date, note: "skipped: " + out.why };
      else { await sendNow(env, p, out); patch = { last: lt.date, sentAt: now.toISOString(), note: `sent: ${out.games} games, ${out.results} results`, err: "" }; }
    } catch (e) {
      // try again on the next minutes, three times a day at most
      const fails = (p.failDay === lt.date ? Number(p.fails) || 0 : 0) + 1;
      patch = { failDay: lt.date, fails, err: String(e && e.message || e).slice(0, 200) };
      if (fails >= 3) { if (testDue) patch.testAt = ""; else patch.last = lt.date; }
      console.log("morning email", id, patch.err);
    }
    await mergeDoc(env, DOC, { people: { [id]: Object.assign({ sending: "" }, patch) } });
  }
}

// ---------- Settings: POST /api/morning-email {pass, action: "get" | "save" | "test" | "preview", ...} ----------
const EMAIL = /^[^\s@<>()"',;:]{1,64}@[A-Za-z0-9.-]{1,180}\.[A-Za-z]{2,24}$/;
export async function morningApi(env, me, p) {
  // DJ's Family list (3.67.2): everyone else's morning email, to turn it on for them
  if (p.action === "family") {
    if (me.id !== "dj") return { error: "Only DJ can see this." };
    const docs = await getDocs(env, ["users/registry", DOC]), reg = (docs["users/registry"] || {}).users || {}, ppl = ((docs[DOC] || {}).people) || {};
    const list = Object.values(reg).filter((u) => u && u.id && u.id !== "dj" && u.id !== "tester").sort((a, b) => String(a.name || a.id).localeCompare(String(b.name || b.id)));
    const out = [];
    for (const u of list) { const x = ppl[u.id] || {}; out.push({ id: u.id, name: u.name || u.id, on: !!x.on, time: x.time || "06:00", email: await unseal(env, x.email), tz: x.tz || "" }); }
    return { ok: true, people: out };
  }
  // DJ can set it up for someone else in the family ({for: "<their id>"}); they see it and change it in their own Settings
  if (p.for !== undefined && p.for !== me.id) {
    if (me.id !== "dj") return { error: "Only DJ can set this up for someone else." };
    if (!["get", "save"].includes(p.action)) return { error: "bad request" };
    const reg = (await getDocs(env, ["users/registry"]))["users/registry"] || {}, u = Object.values(reg.users || {}).find((x) => x && x.id === String(p.for));
    if (!u) return { error: "No one with that id." };
    me = { id: u.id, name: u.name || u.id }; delete p.look;  // their email is drawn in their own look, once they save from their phone
  }
  const doc = (await getDocs(env, [DOC]))[DOC] || {}, cur = (doc.people || {})[me.id] || {};
  const view = async (x) => ({ on: !!x.on, time: x.time || "07:00", tz: x.tz || "", lines: !!x.lines, email: await unseal(env, x.email), last: x.last || "",
    sentAt: x.sentAt || "", err: x.err || "", note: x.note || "", ready: gmailReady(env), testing: !!(x.testAt && Date.now() - Date.parse(x.testAt) < 15 * 60000) });
  if (p.action === "get") return { ok: true, prefs: await view(cur) };
  if (p.action === "save") {
    const patch = { name: me.name || me.id };
    if (typeof p.on === "boolean") patch.on = p.on;
    if (typeof p.lines === "boolean") patch.lines = p.lines;
    if (p.look) { const lk = cleanLook(p.look); if (lk) patch.look = lk; }
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
  if (p.action === "preview") {
    const out = await buildEmail(env, Object.assign({ id: me.id }, cur, { name: me.name, look: p.look || cur.look, lines: typeof p.lines === "boolean" ? p.lines : !!cur.lines }), new Date());
    if (out.wait || out.skip) return { error: out.why };
    return { ok: true, subject: out.subject, html: out.html, text: out.text, pending: out.pending };
  }
  if (p.action === "test") {
    // queued for the minute job, which first has Claude write any missing recaps (a minute or two), then sends
    if (!gmailReady(env)) return { error: "Sending isn't set up yet. DJ needs to connect his Gmail." };
    if (!cur.email) return { error: "Add your email address first." };
    const day = local(new Date(), "America/Chicago").date, n = cur.testDay === day ? Number(cur.tests) || 0 : 0;
    if (n >= 5) return { error: "That's five test emails today. Try again tomorrow." };
    const patch = { testDay: day, tests: n + 1, testAt: new Date().toISOString() };
    if (p.look) { const lk = cleanLook(p.look); if (lk) patch.look = lk; }
    await mergeDoc(env, DOC, { people: { [me.id]: patch } });
    return { ok: true, queued: true };
  }
  return { error: "bad request" };
}
