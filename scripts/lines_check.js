#!/usr/bin/env node
// Checks the game one-liners (3.113.2, DJ: "lots of errors in the one-liners"). Runs the app's own pvCompute, straight from
// src/app, on every upcoming game ESPN lists for the days given, and flags lines that are wrong or say nothing:
//   node scripts/lines_check.js                  today and tomorrow (US Eastern)
//   node scripts/lines_check.js 20261118 --all   one day, and print every line, not just the flagged ones
// Run it before shipping any change to 100-highlights.js or 105-pv-notes.js; it exits 1 when a line is flagged.
// Checks: a streak longer than the team's wins (or losses), "five of its last five", "100% chance", a second fact joined onto
// the wrong team ("X has lost four and is 5-0 at home" when the 5-0 belongs to the other side), a spread on the wrong team,
// a shorter version (for narrow screens) that ends on a fragment ("…Eastern Michigan, looks"), and lines that only restate a record.
const fs = require("fs"), path = require("path"), R = path.join(__dirname, "..", "src", "app") + path.sep;
const read = (f) => fs.readFileSync(R + f, "utf8");
function grab(file, name) {
  const s = read(file), i = s.indexOf("function " + name + "("); if (i < 0) throw new Error(name + " not found in " + file);
  for (let k = s.indexOf("{", i), d = 0; k < s.length; k++) { if (s[k] === "{") d++; else if (s[k] === "}" && !--d) return s.slice(i, k + 1); }
}
const vline = (file, name, opt) => { const m = new RegExp("var " + name + " = (.*);\\n").exec(read(file)); if (!m) { if (opt) return "var " + name + " = /$^/;"; throw new Error(name); } return "var " + name + " = " + m[1] + ";"; };
globalThis.window = globalThis; new Function(fs.readFileSync(path.join(__dirname, "../src/data/teams.js"), "utf8"))();
const app = new Function([vline("090-box-data.js", "BX_SPORT"), grab("080-claude.js", "l5Season"), grab("100-highlights.js", "pvCompute"), grab("100-highlights.js", "pvBlandHead"), grab("100-highlights.js", "pvAllHome"),
  vline("105-pv-notes.js", "PVN_BRK"), vline("105-pv-notes.js", "PVN_DANGLE", true), grab("105-pv-notes.js", "pvCuts"), grab("105-pv-notes.js", "pvStatAlts"),
  "return { pvCompute: pvCompute, pvStatAlts: pvStatAlts, l5Season: l5Season, pvBlandHead: pvBlandHead };"].join("\n"))();

const LG = { nba: "basketball/nba", nhl: "hockey/nhl", nfl: "football/nfl", ncaaf: "football/college-football", ncaam: "basketball/mens-college-basketball",
  ncaaw: "basketball/womens-college-basketball", epl: "soccer/eng.1", mls: "soccer/usa.1", ucl: "soccer/uefa.champions" };
const NW = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6 };
const etDay = (d) => new Date(d).toLocaleDateString("en-CA", { timeZone: "America/New_York" }).replace(/-/g, "");
const args = process.argv.slice(2), all = args.includes("--all"), missing = args.includes("--missing");
let days = args.filter((a) => /^\d{8}$/.test(a)); if (!days.length) days = [etDay(Date.now()), etDay(Date.now() + 864e5)];
const J = (u) => fetch(u).then((r) => r.json());

function check(lg, sum, line, alts) {
  const out = [], comp = sum.header.competitions[0], T = comp.competitors.map((c) => {
    const tm = c.team || {}, rs = String(((c.record || []).find((r) => r.type === "total") || {}).summary || ""), rec = rs ? rs.split("-").map(Number) : [NaN, NaN];   // no record (MLS playoffs): unknown, not 0-0
    return { names: [tm.nickname, tm.shortDisplayName, tm.location, tm.name].filter(Boolean), abbr: tm.abbreviation, w: rec[0], l: rec.length === 3 ? (/^soccer/.test(LG[lg]) ? rec[2] : rec[1] + rec[2]) : rec[1], gp: rec.reduce((a, b) => a + b, 0) || 0 };
  });
  const who = (frag) => T.filter((t) => t.names.some((n) => frag.indexOf(n + " ") >= 0 || frag.indexOf(n + "'") >= 0));
  if (/100% chance/.test(line)) out.push("100% chance");
  // any home or road record has to fit inside that team's whole record (DJ, Nov 20: "SIU Edwardsville is 4-0 at home")
  line.split(/; /).forEach((cl) => { const t = who(cl + " "); const re = /(\d+)-(\d+) (at home|on the road)/g; let m;
    while ((m = re.exec(cl))) { if (t.length === 1 && (+m[1] > t[0].w || +m[2] > t[0].l)) out.push("home/road record bigger than " + t[0].abbr + "'s record"); } });
  // only restates the matchup, ranks included ("No. 8 Houston faces No. 11 Kansas", DJ Nov 19)
  if (app.pvBlandHead(line, [].concat.apply([], comp.competitors.map((c) => { const tm = c.team || {}; return [tm.displayName, tm.shortDisplayName, tm.nickname, tm.location, tm.name, tm.abbreviation]; })).filter(Boolean))) out.push("only restates the matchup");
  if (/\b(\w+) of (its|their) last \1\b/.test(line)) out.push("\"N of its last N\"");
  // each clause: a streak can't be longer than the record allows
  line.split(/; /).forEach((cl) => {
    const m = /(won|lost) (one|two|three|four|five|six)( straight| in a row)/.exec(cl), t = who(cl);
    if (m && t.length === 1) { const n = NW[m[2]], t0 = t[0]; if (m[1] === "won" ? t0.w < n : t0.l < n) out.push("streak longer than the record (" + t0.abbr + ")");
      if (m[1] === "won" ? t0.l === 0 && t0.w === n : t0.w === 0 && t0.l === n) out.push("streak only restates the record (" + t0.abbr + ")"); }
    // "X has lost four and is 5-0 at home": the joined record must fit the team the clause is about
    const j = / and (?:is |are )?(\d+)-(\d+) (at home|on the road)/.exec(cl); if (j && t.length === 1) { const t0 = t[0]; if (+j[1] > t0.w || +j[2] > t0.l) out.push("joined record doesn't fit " + t0.abbr); }
  });
  const sp = /^(.*?) (?:is|are) (?:only )?an? ([\d.]+)-point favorites?/.exec(line) || /(\S+(?: \S+)?) (?:is|are) (?:only )?([\d.]+)-point favorites/.exec(line);
  const pk = (sum.pickcenter || [])[0], dm = pk && /^([A-Z&]{2,6})\s+-([\d.]+)$/.exec(String(pk.details || "").trim());
  if (sp && dm) { const t = who(sp[1] + " "); if (t.length === 1 && t[0].abbr !== dm[1]) out.push("favorite is " + dm[1] + ", line names " + t[0].abbr); }
  alts.forEach((a) => { if (a !== line && /(, \S+( \S+)?|\b(takes?|visits?|faces?|hosts?|plays?|leads?|meets?|looks?|is|are|has|have))$/i.test(a)) out.push("short version ends on a fragment: \"" + a + "\""); });
  return out;
}

(async () => {
  let n = 0, bad = 0, nl = 0;
  for (const lg of Object.keys(LG)) for (const d of days) {
    let sb; try { sb = await J(`https://site.api.espn.com/apis/site/v2/sports/${LG[lg]}/scoreboard?dates=${d}&limit=400${/ncaa[mw]/.test(lg) ? "&groups=50" : ""}`); } catch (e) { continue; }
    for (const e of (sb.events || []).filter((e) => e.status.type.state === "pre")) {
      let sum; try { sum = await J(`https://site.api.espn.com/apis/site/v2/sports/${LG[lg]}/summary?event=${e.id}`); } catch (x) { continue; }
      let line = null, alts = [];
      try { line = app.pvCompute(lg, sum, [], null); if (line) alts = app.pvStatAlts({ text: line, f: app.pvCompute.f }); } catch (x) { line = "ERROR " + x.message; }
      if (!line || app.pvCompute.fb || (app.pvBlandHead && app.pvBlandHead(line, []))) { nl++; if (missing) console.log("○ " + lg + " " + e.shortName + ": no line" + (line ? " (" + line + ")" : "")); continue; }
      n++; const probs = /^ERROR/.test(line) ? ["crashed"] : check(lg, sum, line, alts);
      if (probs.length) bad++;
      if (probs.length || all) console.log((probs.length ? "✗ " : "  ") + lg + " " + e.shortName + ": " + line + (probs.length ? "\n    " + probs.join("\n    ") : ""));
    }
  }
  console.log(`\n${n} lines checked, ${bad} flagged, ${nl} games with no line`);
  process.exit(bad ? 1 : 0);
})();
