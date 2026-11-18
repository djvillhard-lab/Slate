import SwiftUI
import WidgetKit

// 3.112.0, the Tonight's slate widget (home screen, small and medium; 3.113.0 adds large, up to eight): the next three games on today's slate that
// haven't finished, each with its start time and channel, or the score and clock while it's on. It reads the slate
// the app saved the last time Slate was open (SlateTonight). A score older than 20 minutes isn't shown (the game just
// says Live), and a game that started more than four hours ago counts as over. Tap a game (medium) for its matchup.
struct SlateTonightWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "SlateTonight", provider: TonightProvider()) { entry in
            TonightView(entry: entry)
        }
        .configurationDisplayName("Tonight's slate")
        .description("The next games on your slate, with times and channels.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

struct TonightEntry: TimelineEntry {
    let date: Date
    let data: SlateTonight?
}

struct TonightProvider: TimelineProvider {
    func placeholder(in context: Context) -> TonightEntry { TonightEntry(date: Date(), data: nil) }

    func getSnapshot(in context: Context, completion: @escaping (TonightEntry) -> Void) {
        completion(TonightEntry(date: Date(), data: SlateTonight.load()))
    }

    // a fresh look every 15 minutes for the next six hours, so games move from "7:30 PM" to Live to gone as the
    // evening goes, even with Slate closed; Slate redraws it whenever the slate changes
    func getTimeline(in context: Context, completion: @escaping (Timeline<TonightEntry>) -> Void) {
        let data = SlateTonight.load(), now = Date()
        var dates = (0..<24).map { now.addingTimeInterval(Double($0) * 900) }
        for g in data?.games ?? [] { if let t = g.t, t > now.timeIntervalSince1970, t < now.timeIntervalSince1970 + 6 * 3600 { dates.append(Date(timeIntervalSince1970: t)) } }
        let entries = Set(dates).sorted().map { TonightEntry(date: $0, data: data) }
        completion(Timeline(entries: entries, policy: .atEnd))
    }
}

enum TonightLook {
    // the next games at this moment: live ones (and finals from the last 30 minutes, 3.113.0) first, then by start
    // time; older finals and long-started games left out
    static func next(_ d: SlateTonight?, at now: Date, count: Int = 3) -> [SlateBoardGame] {
        guard let d, now.timeIntervalSince1970 - d.at < 20 * 3600 else { return [] }
        let n = now.timeIntervalSince1970
        let left = d.games.filter { g in
            if g.s == "post" { return recentFinal(g, now) }
            if let t = g.t, t > 0, n - t > 4 * 3600 { return false }
            return true
        }
        return left.sorted { p, q in
            let lp = started(p, now), lq = started(q, now)
            if lp != lq { return lp }
            return (p.t ?? 0) < (q.t ?? 0)
        }.prefix(count).map { $0 }
    }

    // DJ (3.113.0): a finished game stays 30 minutes after it ends, like the live notifications
    static func recentFinal(_ g: SlateBoardGame, _ now: Date) -> Bool {
        guard g.s == "post", let e = g.e, e > 0 else { return false }
        return now.timeIntervalSince1970 - e < 30 * 60
    }

    static func started(_ g: SlateBoardGame, _ now: Date) -> Bool {
        g.s == "in" || (g.t.map { $0 > 0 && $0 <= now.timeIntervalSince1970 } ?? false)
    }

    // the score is shown only while it's recent; otherwise just "Live"
    static func fresh(_ d: SlateTonight?, _ now: Date) -> Bool {
        guard let d else { return false }
        return now.timeIntervalSince1970 - d.at < 20 * 60
    }

    // a game for the large size's tile: the score while it's recent; a game that has started without a recent score
    // shows "Live" and its channel in place of the start time (never a stale or made-up score)
    static func tile(_ g: SlateBoardGame, now: Date, fresh: Bool) -> SlateBoardGame {
        var t = g
        if g.s == "post" || (g.s == "in" && fresh) { return t }
        if started(g, now) { t.s = "pre"; t.d = "Live"; return t }
        if g.s == "pre" { t.d = time(g) }
        return t
    }

    static func time(_ g: SlateBoardGame) -> String {
        guard let t = g.t, t > 0 else { return g.d }
        return Date(timeIntervalSince1970: t).formatted(date: .omitted, time: .shortened)
    }
}

struct TonightView: View {
    @Environment(\.widgetFamily) private var family
    let entry: TonightEntry

    var body: some View {
        let large = family == .systemLarge
        // 3.113.0 (DJ): the large size fits up to eight games
        let list = TonightLook.next(entry.data, at: entry.date, count: large ? 8 : 3)
        let fresh = TonightLook.fresh(entry.data, entry.date)
        let small = family == .systemSmall
        let left = large ? TonightLook.next(entry.data, at: entry.date, count: 99).filter { $0.s != "post" }.count : 0
        VStack(alignment: .leading, spacing: small ? 6 : 7) {
            HStack(spacing: 5) {
                SlateMark(size: 15)   // 3.113.0 (DJ): the Slate axe-hammer by the title
                Text("TONIGHT'S SLATE")
                    .font(SlateLook.bold(11))
                    .foregroundStyle(SlateLook.muted)
                    .lineLimit(1)
                Spacer(minLength: 4)
                if large && left > 0 {
                    Text(left == 1 ? "1 game left" : "\(left) games left")
                        .font(SlateLook.semi(11))
                        .foregroundStyle(SlateLook.muted)
                        .lineLimit(1)
                }
            }
            if list.isEmpty {
                Spacer(minLength: 0)
                Text(entry.data == nil ? "Open Slate to load tonight's games." : "No more games on tonight's slate.")
                    .font(SlateLook.semi(13))
                    .foregroundStyle(SlateLook.ink)
                    .lineLimit(3)
                Spacer(minLength: 0)
            } else if large {
                // 3.113.0 (DJ): the large size in the live notifications' new look, 8 games in 2 columns of 4: each team
                // a slanted pill of its color with its logo and score, the clock or start time under them
                // DJ: no empty space under it, so the four rows share the widget's whole height (an empty slot stays
                // blank when fewer than eight games are left)
                VStack(spacing: 10) {
                    ForEach(0..<4, id: \.self) { r in
                        HStack(spacing: 10) {
                            ForEach(0..<2, id: \.self) { c in
                                let i = r * 2 + c
                                if i < list.count {
                                    Link(destination: SlateLook.gameURL(list[i].id)) { TonightTile(g: TonightLook.tile(list[i], now: entry.date, fresh: fresh), fill: true) }
                                } else {
                                    Color.clear
                                }
                            }
                        }
                        .frame(maxHeight: .infinity)
                    }
                }
                .frame(maxHeight: .infinity)
            } else {
                ForEach(list, id: \.id) { g in
                    if small {
                        TonightSmallRow(g: g, now: entry.date, fresh: fresh)
                    } else {
                        Link(destination: SlateLook.gameURL(g.id)) { TonightRow(g: g, now: entry.date, fresh: fresh) }
                    }
                }
                Spacer(minLength: 0)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .foregroundStyle(SlateLook.ink)
        .containerBackground(SlateLook.card, for: .widget)
        .widgetURL(small ? SlateLook.slateURL : nil)
    }
}

// medium: away logo and abbreviation, the score (or "at"), home; on the right the time and channel, or the clock
private struct TonightRow: View {
    let g: SlateBoardGame
    let now: Date
    let fresh: Bool

    var body: some View {
        let on = TonightLook.started(g, now), score = g.s == "post" || (on && fresh && g.s == "in")
        HStack(spacing: 6) {
            Rectangle().fill(SlateLook.visible(SlateLook.panelHex(g.ac, g.ax))).frame(width: 3, height: 26)
            Chip(abbr: g.aa, color: g.ac, alt: g.ax, width: 22, height: 22, size: 9, stripe: 2, radius: 3, logo: g.al)
            Text(score ? "\(g.aa) \(g.a)" : g.aa).font(SlateLook.bold(14)).lineLimit(1)
            Text(score ? "–" : "at").font(SlateLook.semi(12)).foregroundStyle(SlateLook.muted)
            Text(score ? "\(g.h) \(g.ha)" : g.ha).font(SlateLook.bold(14)).lineLimit(1)
            Chip(abbr: g.ha, color: g.hc, alt: g.hx, width: 22, height: 22, size: 9, stripe: 2, radius: 3, logo: g.hl)
            Spacer(minLength: 4)
            TonightStatus(g: g, on: on, score: score)
        }
        .minimumScaleFactor(0.8)
        .frame(height: 28)
    }
}

// small: both logos, then the time (or Live) and the channel under it
private struct TonightSmallRow: View {
    let g: SlateBoardGame
    let now: Date
    let fresh: Bool

    var body: some View {
        let on = TonightLook.started(g, now), score = g.s == "post" || (on && fresh && g.s == "in")
        HStack(spacing: 4) {
            Chip(abbr: g.aa, color: g.ac, alt: g.ax, width: 20, height: 20, size: 8, stripe: 2, radius: 3, logo: g.al)
            if score { Text("\(g.a)–\(g.h)").font(SlateLook.num(15)).lineLimit(1) }
            Chip(abbr: g.ha, color: g.hc, alt: g.hx, width: 20, height: 20, size: 8, stripe: 2, radius: 3, logo: g.hl)
            Spacer(minLength: 2)
            TonightStatus(g: g, on: on, score: false, compact: true)
        }
        .frame(height: 30)
    }
}

private struct TonightStatus: View {
    let g: SlateBoardGame
    let on: Bool
    let score: Bool
    var compact = false

    var body: some View {
        VStack(alignment: .trailing, spacing: 0) {
            if on {
                ClockTag(text: g.s == "post" ? "Final" : score ? BoardLook.clock(g) : "Live", live: g.s != "post", size: compact ? 11 : 12, height: compact ? 16 : 18)
            } else {
                Text(TonightLook.time(g))
                    .font(SlateLook.num(compact ? 14 : 16))
                    .lineLimit(1)
            }
            if let tv = g.tv, !tv.isEmpty, g.s != "post" {
                Text(tv)
                    .font(SlateLook.semi(compact ? 10 : 11))
                    .foregroundStyle(SlateLook.muted)
                    .lineLimit(1)
            }
        }
        .minimumScaleFactor(0.7)
    }
}

// 3.113.0: the pills' inner edges lean the same way by the same 10 points everywhere, so the gap between a game's
// two pills is an even slanted stripe and every tile's slant lines up with the others (DJ: the slants should match)
struct LeanShape: Shape {
    let left: Bool
    var lean: CGFloat = 10
    func path(in r: CGRect) -> Path {
        var p = Path()
        if left {
            p.move(to: CGPoint(x: r.minX, y: r.minY)); p.addLine(to: CGPoint(x: r.maxX, y: r.minY))
            p.addLine(to: CGPoint(x: r.maxX - lean, y: r.maxY)); p.addLine(to: CGPoint(x: r.minX, y: r.maxY))
        } else {
            p.move(to: CGPoint(x: r.minX + lean, y: r.minY)); p.addLine(to: CGPoint(x: r.maxX, y: r.minY))
            p.addLine(to: CGPoint(x: r.maxX, y: r.maxY)); p.addLine(to: CGPoint(x: r.minX, y: r.maxY))
        }
        p.closeSubpath()
        return p
    }
}

// one game on the large widget and (3.113.0, DJ) the Board live notification, in the live notifications' look: away and home pills side by side (logo and score,
// the score toward the middle; before the start, the team's abbreviation), and under them the clock tag (red while
// it's on), "Final", or the start time and channel
struct TonightTile: View {
    let g: SlateBoardGame
    var dark = false   // the Dynamic Island: a little smaller, on black
    var pillHeight: CGFloat? = nil   // 3.113.0: the Board's Lock Screen, under its header
    var fill = false   // 3.113.0: the large widget, where the pills grow to fill the row

    var body: some View {
        let pre = BoardLook.pre(g), live = g.s == "in", fin = g.s == "post"
        VStack(spacing: 5) {
            HStack(spacing: 3) {
                pill(abbr: g.aa, color: g.ac, alt: g.ax, logo: g.al, score: pre ? nil : g.a, other: g.h, left: true, fin: fin, live: live)
                pill(abbr: g.ha, color: g.hc, alt: g.hx, logo: g.hl, score: pre ? nil : g.h, other: g.a, left: false, fin: fin, live: live)
            }
            .frame(minHeight: fill ? 42 : nil, idealHeight: fill ? 42 : nil, maxHeight: fill ? .infinity : nil)
            .frame(height: fill ? nil : pillHeight ?? (dark ? 38 : 42))
            if pre && g.d != "Live" {
                Text([g.d, g.tv ?? ""].filter { !$0.isEmpty }.joined(separator: " · "))
                    .font(SlateLook.semi(11))
                    .foregroundStyle(SlateLook.muted)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
                    .frame(height: 16)
            } else {
                HStack(spacing: 5) {
                    ClockTag(text: pre ? "Live" : BoardLook.clock(g), live: live || pre, size: 11, height: 16, fill: dark ? Color.white.opacity(0.1) : SlateLook.raise)
                    if pre, let tv = g.tv, !tv.isEmpty {
                        Text(tv).font(SlateLook.semi(11)).foregroundStyle(SlateLook.muted).lineLimit(1)
                    }
                }
            }
        }
        .foregroundStyle(SlateLook.ink)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(Text(BoardLook.spoken(g)))
    }

    private func pill(abbr: String, color: String, alt: String?, logo: String?, score: Int?, other: Int, left: Bool, fin: Bool, live: Bool) -> some View {
        let c = Color(slateHex: SlateLook.panelHex(color, alt), fallback: SlateLook.raise)
        let behind = score.map { $0 < other } ?? false
        return HStack(spacing: 5) {
            if left { badge(abbr: abbr, color: color, alt: alt, logo: logo) }
            if let score {
                Text("\(score)")
                    .font(SlateLook.num(dark ? 24 : 26))
                    .opacity(live && behind ? 0.6 : 1)
                    .lineLimit(1)
                    .minimumScaleFactor(0.6)
            } else {
                Text(abbr).font(SlateLook.bold(12)).lineLimit(1).minimumScaleFactor(0.6)
            }
            if !left { badge(abbr: abbr, color: color, alt: alt, logo: logo) }
        }
        .padding(left ? EdgeInsets(top: 0, leading: 6, bottom: 0, trailing: 12) : EdgeInsets(top: 0, leading: 12, bottom: 0, trailing: 6))
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: left ? .leading : .trailing)
        .background(
            LeanShape(left: left)
                .fill(LinearGradient(colors: [c.opacity(0.62), c.opacity(0.3)], startPoint: left ? .leading : .trailing, endPoint: left ? .trailing : .leading))
        )
        .clipShape(RoundedRectangle(cornerRadius: 6, style: .continuous))
        .opacity(fin && behind ? 0.6 : 1)
    }

    @ViewBuilder
    private func badge(abbr: String, color: String, alt: String?, logo: String?) -> some View {
        if SlateLogos.image(logo) != nil {
            Chip(abbr: abbr, color: color, alt: alt, width: 26, height: 26, logo: logo)
        } else {
            Chip(abbr: abbr, color: color, alt: alt, width: 26, height: 16, size: 8, stripe: 2, radius: 3, logo: logo)
        }
    }
}
