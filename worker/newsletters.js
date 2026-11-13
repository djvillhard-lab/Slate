// The Athletic's newsletters: most editions are also posted on its site and show up in its public RSS feeds.
// Runs from the Worker's every-minute cron (GitHub's schedule is too irregular for this). Each newsletter is only
// looked for on the weekdays it comes out (learned from its last six weeks of editions); on those days, from 3 a.m.
// Central every 30 minutes until today's edition is found, then not again until its next day. Once a week every
// newsletter gets one full look, to catch a changed schedule.
const NEWSLETTERS = {
  pulse: [["news", "nfl", "college-sports", "nba", "mlb"], /-the-pulse\/$|The Pulse(?: Newsletter|, The Athletic)/],
  bounce: [["nba"], /-the-bounce\/$|^The Bounce:/],
  windup: [["mlb"], /-the-windup\/$|Welcome to The Windup/],
  moneycall: [["college-football", "news", "nfl", "nba", "college-sports"], /-moneycall\/$|free sports business newsletter/],
  peak: [["news", "nhl", "nfl", "nba", "tennis", "golf", "olympics", "mlb", "college-sports"], /-peak\/$/],
  primetire: [["formula-1"], /prime-tire|Prime Tire/],
  fulltime: [["nwsl"], /-full-time\/$|Welcome to Full Time/],
  nooffseason: [["wnba", "womens-college-basketball"], /-no-offseason\/$|Welcome to No Offseason/],
};
const ct = (t) => {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23", weekday: "short" }).formatToParts(t).map((x) => [x.type, x.value]));
  return { day: `${p.year}-${p.month}-${p.day}`, hour: Number(p.hour), wd: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(p.weekday) };
};
const unesc = (s) => String(s || "").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&#(\d+);/g, (m, n) => String.fromCharCode(Number(n)));
async function rss(slug) {
  try {
    const r = await fetch(`https://www.nytimes.com/athletic/rss/${slug}/`, { headers: { "User-Agent": "Mozilla/5.0 (slate)" } });
    if (!r.ok) return [];
    const x = await r.text(), out = [];
    for (const m of x.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
      const tag = (n) => { const t = new RegExp(`<${n}>([\\s\\S]*?)</${n}>`).exec(m[1]); return t ? unesc(t[1]).trim() : ""; };
      const title = tag("title"), url = tag("link"), at = Date.parse(tag("pubDate")) || 0, desc = tag("description").replace(/<[^>]+>/g, "").slice(0, 240);
      if (title && url.startsWith("https")) out.push({ title, url, at, desc });
    }
    return out;
  } catch { return []; }
}
export async function runNewsletters(env, getDoc, putDoc) {
  const now = Date.now(), c = ct(new Date(now));
  if (c.hour < 3 || c.hour >= 21) return;
  const have = (await getDoc(env, "news/newsletters")) || {};
  const at = Date.parse(have.updatedAt || "") || 0;
  if (have.day === c.day && now - at < 29 * 60000) return;
  const found = have.day === c.day ? { ...(have.found || {}) } : {};
  const sched = { ...(have.sched || {}) }, schedAt = Date.parse(have.schedAt || "") || 0, refresh = now - schedAt > 7 * 86400000;
  const todo = Object.keys(NEWSLETTERS).filter((k) => found[k] !== c.day && (refresh || !sched[k] || sched[k].includes(c.wd)));
  if (!todo.length) { if (have.day !== c.day) await putDoc(env, "news/newsletters", { ...have, day: c.day, found: {}, updatedAt: new Date(now).toISOString() }); return; }
  const feeds = {}, items = { ...(have.items || {}) };
  for (const key of todo) {
    const [slugs, rx] = NEWSLETTERS[key], seen = new Set(), out = [];
    for (const slug of slugs) {
      if (!feeds[slug]) feeds[slug] = await rss(slug);
      for (const it of feeds[slug]) {
        if (seen.has(it.url) || !(rx.test(it.url) || rx.test(it.title) || rx.test(it.desc))) continue;
        seen.add(it.url); out.push({ title: it.title.replace(/^The Bounce:\s*/, ""), url: it.url, at: it.at });
      }
    }
    out.sort((a, b) => b.at - a.at);
    if (!out.length) continue;
    const days = [...new Set(out.filter((x) => x.at && now - x.at < 42 * 86400000).map((x) => ct(new Date(x.at)).wd))].sort();
    if (days.length) sched[key] = days;
    items[key] = out.slice(0, 3).map((x) => ({ title: x.title, url: x.url, at: x.at ? new Date(x.at).toISOString().replace(/\.\d+Z$/, "Z") : "" }));
    if (out[0].at && ct(new Date(out[0].at)).day === c.day) found[key] = c.day;
  }
  // keep any newsletter this job doesn't handle (the email-only ones arrive by another route)
  await putDoc(env, "news/newsletters", { ...have, updatedAt: new Date(now).toISOString(), day: c.day, found, items, sched, schedAt: refresh ? new Date(now).toISOString() : have.schedAt });
}
