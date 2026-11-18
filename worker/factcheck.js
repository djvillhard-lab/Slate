// The fact check (3.113.3, DJ: "I do want the server check"). Every Claude write-up is compared with ESPN's own facts
// (the ones sent with it: each team's record and this season's dated results) before it's saved. A sentence that
// contradicts them is dropped, and what was dropped is kept with the write-up (fc) so it can be reviewed.
// What it catches, from the Nov 18 accuracy review:
// - a result on the wrong date ("Orlando beat Boston 115-105 on Nov 17" for a Nov 16 game) or with the wrong score
// - a record that isn't the team's ("Boston is 11-2" on an 11-3 team)
// - a loss or win against a team that isn't on this season's schedule ("first loss, 67-61 to Iowa" was last March)
// - a streak the results don't show ("won five in a row" when it was six), or "unbeaten"/"winless" against the record
// It never adds or rewrites anything; it only leaves sentences out. Anything it can't check stays.

const MON = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11 };
const NUMW = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12 };
const num = (w) => (/^\d+$/.test(w) ? +w : NUMW[String(w).toLowerCase()] || 0);
const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// words people read; ids, names, urls and stat lines are left alone
const TEXT_KEYS = /^(summary|bullets|long|text|take|hunch|story|why|note|series|line_note)$/;
const ITEM_KEYS = /^(watch|sides|timeline|hits|latest|top|games)$/;

function parse(json) { try { return JSON.parse(json || "{}") || {}; } catch (e) { return {}; } }

// "Nov 16: L vs Orlando Magic (ORL) 115-105" -> { mon, day, res, home, opp, oppAbbr, a, b }
function parseResult(s) {
  const m = /^([A-Z][a-z]{2,3})\.? (\d{1,2}): ([WLT])? ?(vs|@)? ?(.*?) (\d{1,3})-(\d{1,3})(?: ?(OT|SO|\d?OT))?\s*$/.exec(String(s || "").trim());
  if (!m) return null;
  const opp = m[5].replace(/\s*\(([A-Z0-9&]{2,6})\)$/, ""), ab = (/\(([A-Z0-9&]{2,6})\)$/.exec(m[5]) || [])[1] || (/^[A-Z0-9&]{2,6}$/.test(m[5]) ? m[5] : "");
  return { mon: MON[m[1].toLowerCase()], day: +m[2], res: m[3] || "", home: m[4] === "vs", opp: /^[A-Z0-9&]{2,6}$/.test(opp) ? "" : opp, oppAbbr: ab, a: +m[6], b: +m[7] };
}

function recOf(s) { const r = String(s || "").split("-").map(Number); if (r.length < 2 || r.some(isNaN)) return null; return { raw: String(s), w: r[0], l: r.length === 3 ? r[1] + r[2] : r[1], parts: r }; }

// the teams this write-up is about, with every way the text may name them
function teamsOf(facts, game) {
  const out = [], add = (full, abbr, short, record, results) => {
    if (!full && !short) return; full = String(full || short);
    const words = full.split(" "), names = [full, short, abbr, words.length > 1 ? words.slice(0, -1).join(" ") : "", words.length > 1 ? words[words.length - 1] : ""]
      .filter((x) => x && x.length >= 3 && !/^(The|State|City|United|FC|Club)$/i.test(x));
    const t = out.find((x) => x.full === full || (abbr && x.abbr === abbr));
    if (t) { if (!t.rec && record) t.rec = recOf(record); if (!t.results.length && results) t.results = results; names.forEach((n) => t.names.indexOf(n) < 0 && t.names.push(n)); return t; }
    const n = { full, abbr: abbr || "", names: [...new Set(names)], rec: recOf(record), results: results || [] }; out.push(n); return n;
  };
  const l5 = {}; (facts.last5 || []).forEach((t) => { l5[t.team] = (t.newestFirst || []).map(parseResult).filter(Boolean); });
  (facts.teams || []).forEach((t) => { if (t && typeof t === "object") add(t.name, t.abbr, "", t.record, l5[t.abbr]); });
  if (game.away) add(game.away, game.awayAbbr, game.awayShort, game.awayRecord, l5[game.awayAbbr]);
  if (game.home) add(game.home, game.homeAbbr, game.homeShort, game.homeRecord, l5[game.homeAbbr]);
  // the News page: many games at once (records only)
  [].concat(facts.games || [], facts.slate || []).forEach((g) => { if (g && typeof g === "object" && g.away) { add(g.away, g.awayAbbr, g.awayShort, g.awayRecord); add(g.home, g.homeAbbr, g.homeShort, g.homeRecord); } });
  out.forEach((t) => { t.rx = new RegExp("(^|[^\\w])(" + t.names.map(esc).sort((a, b) => b.length - a.length).join("|") + ")(?![\\w])"); t.seasonAll = !!(t.rec && t.results.length && t.rec.w + t.rec.l <= t.results.length); });
  return out;
}

// 3.113.5 (DJ: "the Heat's depth beyond Giannis"): a line that puts a player on the wrong team. teams: [{ key, names }],
// players: { name: team key } (names that both rosters share are left out). Only phrases that say whose player it is count:
// "the Heat's Giannis", "Heat star Giannis", "the Heat's depth beyond Giannis", "the Heat without Giannis", "Giannis leads the Heat",
// "Giannis and the Heat". "Giannis faces the Heat" is fine. Returns "Giannis plays for MIL" or ""
export function wrongTeamLine(s, teams, players) {
  s = String(s || "").replace(/[‘’]/g, "'");
  var esc = function (x) { return String(x).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }, ROLE = "star|guard|forward|center|centre|big man|wing|rookie|veteran|quarterback|QB|receiver|running back|tight end|linebacker|goalkeeper|keeper|striker|winger|midfielder|defender|pitcher|ace|captain|scorer|sharpshooter|point guard|playmaker";
  var names = Object.keys(players).sort(function (a, b) { return b.length - a.length; });
  for (var i = 0; i < names.length; i++) {
    var P = names[i], own = players[P]; if (!new RegExp("(^|[^\\w])" + esc(P) + "(?![\\w])").test(s)) continue;
    for (var j = 0; j < teams.length; j++) { var t = teams[j]; if (t.key === own) continue;
      var N = "(?:" + t.names.map(esc).join("|") + ")", p = esc(P), w = "(?![\\w])";
      var rx = [N + "'s? (?:[\\w-]+ ){0,5}?(?:beyond|behind|besides|other than|around|without|apart from|alongside|next to|led by|anchored by|built around) " + p + w,
        N + "'s? (?:(?:" + ROLE + ") )?" + p + w, N + " (?:" + ROLE + ") " + p + w,
        N + " (?:will be |are |is |could be |may be )?(?:without|missing) " + p + w,
        p + " (?:leads|carries|paces|powers|anchors|headlines|and) (?:the )?" + N + w, p + "'s? " + N + w, p + " (?:of|for) (?:the )?" + N + w];
      if (rx.some(function (r) { return new RegExp("(^|[^\\w])" + r).test(s); })) return P + " plays for " + own;
    }
  }
  return "";
}

// the players the facts list for each team (leaders "Points: Giannis Antetokounmpo 31.2", injuries "Name (Out)"): { name: team abbr }
function playersOf(facts, T) {
  const map = {}, dup = {}, put = (n, k) => { n = String(n || "").trim(); if (!k || n.length < 4) return; if (map[n] && map[n] !== k) dup[n] = 1; map[n] = k; };
  const name = (n, k) => { n = String(n || "").replace(/\s+(Jr\.?|Sr\.?|II|III|IV)$/, "").trim(); if (!n) return; put(n, k); const w = n.split(" "); if (w.length > 1) { put(w[w.length - 1], k); put(w[0], k); } };
  (facts.leaders || []).forEach((t) => (t && t.cats || []).forEach((c) => name(String(c).replace(/^[^:]*:\s*/, "").replace(/\s+[-\d.,%]+$/, ""), t.team)));
  (facts.injuries || []).forEach((t) => (t && t.out || []).forEach((x) => name(String(x).replace(/\s*\([^)]*\)\s*$/, ""), t.team)));
  Object.keys(dup).forEach((n) => delete map[n]);
  const tn = T.flatMap((t) => t.names.join(" ").toLowerCase().split(/\s+/));
  Object.keys(map).forEach((n) => { if (tn.indexOf(n.toLowerCase()) >= 0 || !T.some((t) => t.abbr === map[n])) delete map[n]; });
  return map;
}

// one sentence: the reason to leave it out, or ""
function judge(s, T, kind) {
  const named = T.filter((t) => t.rx.test(s)), one = named.length === 1 ? named[0] : null;
  // 0. a player put on the other team ("the Heat's depth beyond Giannis")
  if (T.players && Object.keys(T.players).length) { const w = wrongTeamLine(s, T.filter((t) => t.abbr).map((t) => ({ key: t.abbr, names: t.names })), T.players); if (w) return "player: " + w; }
  // 1. a dated result: the score must be on that date (any team's list), and a team's game on that date must have that score
  const MS = "Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sept?|Oct|Nov|Dec", dm = [...s.matchAll(new RegExp("\\b(" + MS + ")\\.? (\\d{1,2})\\b", "g"))], sm = [...s.matchAll(/\b(\d{1,3})-(\d{1,3})\b/g)];
  // each score with its date: "98-93 on Nov 12", "Nov 10: … 123-101", or the sentence's only date
  for (const m of sm) {
    const end = m.index + m[0].length, after = dm.find((d) => d.index >= end && d.index - end <= 30 && !/[.;]/.test(s.slice(end, d.index)) && !sm.some((o) => o.index > end && o.index < d.index)),
      before = [...dm].reverse().find((d) => d.index < m.index && m.index - d.index <= 60 && !/[.;]/.test(s.slice(d.index, m.index)) && !sm.some((o) => o.index > d.index && o.index < m.index));
    const d = after || before || (dm.length === 1 && sm.length === 1 ? dm[0] : null); if (!d) continue;
    const mon = MON[d[1].toLowerCase()], day = +d[2], x = +m[1], y = +m[2], on = [], off = [];
    T.forEach((t) => t.results.forEach((r) => { if (r.a === x && r.b === y || r.a === y && r.b === x) (r.mon === mon && r.day === day ? on : off).push(r); }));
    if (!on.length && off.length) return "date: " + m[0] + " was on " + ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][off[0].mon] + " " + off[0].day;
  }
  // 2. a record next to a team's name: "Boston is 11-3", "Boston (11-3)", "the 4-5 Ravens"
  for (const t of T) {
    if (!t.rec) continue;
    const N = "(?:" + t.names.map(esc).join("|") + ")";
    const rx = [new RegExp("(?:^|[^\\w])" + N + "(?:'s?)? (?:is|are|sits at|stands at|now|improved to|improves to|moved to|moves to|fell to|falls to|dropped to|drops to|went to|goes to|at) (\\d{1,2}-\\d{1,2}(?:-\\d{1,2})?)(?![\\d-])"),
      new RegExp("(?:^|[^\\w])" + N + " \\((\\d{1,2}-\\d{1,2}(?:-\\d{1,2})?)(?:,[^)]*)?\\)"), new RegExp("\\b[Tt]he (\\d{1,2}-\\d{1,2}(?:-\\d{1,2})?) " + N + "(?![\\w])")];
    if (/\b(would|could|can|might|if|unless|with a (win|loss)|a (win|loss) (would|puts|makes))\b/i.test(s)) break;   // "a loss would leave Baltimore at 4-6"
    for (const r of rx) { const m = r.exec(s); if (!m) continue; const said = recOf(m[1]); if (!said) continue;
      const ok = [t.rec.raw].concat(kind === "recap" ? [[t.rec.w - 1, t.rec.l].join("-"), [t.rec.w, t.rec.l - 1].join("-")] : []);
      if (said.parts.length === t.rec.parts.length ? said.raw !== t.rec.raw && ok.indexOf(said.raw) < 0 : !(said.w === t.rec.w && said.l === t.rec.l) && !(kind === "recap" && (said.w === t.rec.w - 1 && said.l === t.rec.l || said.w === t.rec.w && said.l === t.rec.l - 1))) return "record: " + t.full + " is " + t.rec.raw + ", not " + m[1]; }
  }
  // the team a streak is about: the one named just before it ("The Celtics have won five in a row, ... the Magic ...")
  const subj = (re) => { const m = re.exec(s); if (!m) return null; const pre = s.slice(0, m.index); let best = null, at = -1;
    T.forEach((t) => t.names.forEach((n) => { const i = pre.lastIndexOf(n); if (i > at && /^[^\w]?/.test(pre.slice(i + n.length))) { at = i; best = t; } })); return best && pre.length - at < 60 ? best : null; };
  const STR = /\b(won|lost|winning|losing)\s+(?:their |its |his |her )?(?:last )?(\w+)\s+(?:straight|in a row|consecutive|games? in a row)\b|\b(\w+)-game (win(?:ning)?|los(?:ing|s)) (?:streak|skid|run)\b/i;
  const sub = subj(STR) || one;
  if (sub && sub !== one) return streakCheck(s, sub, kind);
  // 3. a win or loss against a team that isn't on this season's schedule ("Both lost to UConn"), when the results cover the whole season
  const scope = named.length ? named : /\bboth\b/i.test(s) ? T.slice(0, 2) : [];
  if (scope.length && scope.every((t) => t.seasonAll && t.results.some((r) => r.opp)) && kind !== "recap") {
    const LM = /\b(?:loss|losses|lost|fell|falling|defeat|defeated|beat|beating|win over|wins over|victory over|won (?:at|against|over)|routed|upset)\s+(?:\d{1,3}-\d{1,3} )?(?:to |at |against |over |by |in )?(?:the |a |an )?(?:No\. \d+ )?([A-Z][A-Za-z.&'-]+(?: [A-Z][A-Za-z.&'-]+){0,2})/g;
    for (const lm of s.matchAll(LM)) { const ws = lm[1].replace(/[.,;:!?'-]+$/, "").split(" ").filter((w) => !/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sept?|Oct|Nov|Dec)\.?,?$/.test(w)).map((w) => w.replace(/[.,;:!?'-]+$/, ""));
      if (!ws.length) continue; const cand = ws.slice(0, 2).join(" ");   // two words, so "Illinois State" isn't taken for "Northern Illinois"
      const known = cand.length < 3 || scope.some((t) => t.results.some((r) => (r.opp && r.opp.indexOf(cand) >= 0) || r.oppAbbr === cand.toUpperCase())) || T.some((t) => t.names.some((n) => n.indexOf(cand) >= 0)) || /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|January|February|March|April|May|June|July|August|September|October|November|December|Game|No|The|Division|Big|SEC|ACC|NCAA|NBA|NFL|NHL|Both|Each|They|It)$/.test(ws[0]);
      if (!known) return "opponent: " + scope.map((t) => t.full).join(" and ") + " haven't played " + cand + " this season"; }
  }
  if (!one) return "";
  const sc = streakCheck(s, one, kind); if (sc) return sc;
  return "";
}

// 4. streaks and unbeaten/winless, against the record and the dated results (previews and breakdowns: a recap's game moves them)
function streakCheck(s, one, kind) {
  if (one.rec) {
    const st = /\b(won|lost|winning|losing)\s+(?:their |its |his |her )?(?:last )?(\w+)\s+(?:straight|in a row|consecutive|games? in a row)\b/i.exec(s) || /\b(\w+)-game (win(?:ning)?|los(?:ing|s)) (?:streak|skid|run)\b/i.exec(s);
    if (st) { const isWin = /^win|^won/i.test(st[1]) || /^win/i.test(st[2] || ""), n = num(/\d|^[a-z]+$/i.test(st[1]) && !/won|lost|winning|losing/i.test(st[1]) ? st[1] : st[2]);
      if (n >= 2 && !/\b(ended|snapped|broke|stopped|halted|over)\b/i.test(s)) {
        if (n > (isWin ? one.rec.w : one.rec.l)) return "streak: " + one.full + " has only " + (isWin ? one.rec.w : one.rec.l) + (isWin ? " wins" : " losses");
        const rs = one.results; if (kind !== "recap" && rs.length && /\b(won|lost|winning|losing)\b/i.test(st[0])) { let k = 0; while (k < rs.length && rs[k].res === rs[0].res) k++;
          const cur = rs[0].res === "W" ? "W" : rs[0].res === "L" ? "L" : "";
          if (cur && (cur === "W") === isWin && (k < rs.length ? n !== k : n < k)) return "streak: " + one.full + "'s run is " + k + (k === rs.length ? "+" : "");
          if (cur && (cur === "W") !== isWin && k >= 1 && !/\b(had|before|earlier|previous)\b/i.test(s)) return "streak: " + one.full + "'s last game was a " + (cur === "W" ? "win" : "loss"); } }
    }
    if (kind !== "recap" && /\b(unbeaten|undefeated|perfect start|yet to lose)\b/i.test(s) && one.rec.l > 0 && !/\b(no longer|first loss|lost|ended|snapped)\b/i.test(s)) return "record: " + one.full + " has lost (" + one.rec.raw + ")";
    if (kind !== "recap" && /\b(winless|yet to win|still looking for (a|its|their) first win)\b/i.test(s) && one.rec.w > 0 && !/\b(no longer|first win|ended)\b/i.test(s)) return "record: " + one.full + " has won (" + one.rec.raw + ")";
  }
  return "";
}

const sentences = (t) => String(t).match(/[^.!?]+(?:[.!?]+(?=\s|$)|$)(?:\s+|$)|[^.!?]*[.!?]+(?=\S)/g) || [String(t)];

export function factCheck(kind, ans, factsJson, gameJson) {
  const dropped = [];
  const facts = parse(factsJson), game = parse(gameJson), T = teamsOf(facts, game);
  T.players = playersOf(facts, T);
  if (!T.length || !ans || typeof ans !== "object") return { ans, dropped };
  const clean = (str, where) => {
    // a sentence ending in "No." or a decimal is split back together
    const parts = []; sentences(str).forEach((x) => { if (parts.length && (/\b(No|vs|St|Jr|Mt|Ft)\.\s*$/.test(parts[parts.length - 1]) || /\d\.$/.test(parts[parts.length - 1]) && /^\d/.test(x))) parts[parts.length - 1] += x; else parts.push(x); });
    const keep = parts.filter((x) => { const why = judge(x.trim(), T, kind); if (why) dropped.push({ where, said: x.trim().slice(0, 300), why }); return !why; });
    return keep.join("").trim();
  };
  const walk = (v, key, where) => {
    if (typeof v === "string") return TEXT_KEYS.test(key) ? clean(v, where) : v;
    if (Array.isArray(v)) {
      const out = v.map((x, i) => walk(x, key, where + "[" + i + "]"));
      if (TEXT_KEYS.test(key)) return out.filter((x) => typeof x !== "string" || x);
      // a timeline entry or a hit whose only sentence was wrong goes too
      if (ITEM_KEYS.test(key)) return out.filter((x, i) => !(x && typeof x === "object" && "text" in x && !x.text && v[i].text));
      return out;
    }
    if (v && typeof v === "object") {
      const o = {};
      for (const [k, x] of Object.entries(v)) {
        // a timeline's date belongs to its line: check them together
        if (k === "text" && typeof x === "string" && typeof v.when === "string") { const why = judge(v.when + ": " + x, T, kind); if (why) { dropped.push({ where: where + ".text", said: (v.when + ": " + x).slice(0, 300), why }); o[k] = ""; continue; } }
        o[k] = k === "text" && typeof x === "string" ? clean(x, where + "." + k) : walk(x, k, where + "." + k);
      }
      return o;
    }
    return v;
  };
  let out = walk(ans, "", "");
  // never save an empty summary or recap: if every sentence went, keep what was written (rare) and say so
  ["summary", "text"].forEach((k) => { if (typeof ans[k] === "string" && ans[k] && !out[k]) { out[k] = ans[k]; dropped.push({ where: k, said: "", why: "kept: every sentence was flagged" }); } });
  return { ans: out, dropped };
}
