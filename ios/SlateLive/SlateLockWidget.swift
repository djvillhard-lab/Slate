import SwiftUI
import WidgetKit

// 3.120.0 (DJ): Slate on the Lock Screen. Three shapes, all from the same saved slate as the Tonight's slate widget
// (TonightProvider, TonightLook): a line over the clock (the game that's on, or the next one), a rectangle with
// the next two games, and a round one with the next game. iOS draws Lock Screen widgets in one color over the
// wallpaper, so they show team abbreviations, not logos. Same rules as the home-screen widget: a score more than 20
// minutes old just says Live, and finals stay 30 minutes.
struct SlateLockWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "SlateLock", provider: TonightProvider()) { entry in
            LockView(entry: entry)
        }
        .configurationDisplayName("Slate")
        .description("The game that's on, or the next one on your slate.")
        .supportedFamilies([.accessoryInline, .accessoryRectangular, .accessoryCircular])
    }
}

enum LockLook {
    // "DUKE 58–54 UNC", or "BAL at PIT" before the start (and while the score is too old to show)
    static func teams(_ g: SlateBoardGame, score: Bool) -> String {
        score ? "\(g.aa) \(g.a)–\(g.h) \(g.ha)" : "\(g.aa) at \(g.ha)"
    }
    static func showScore(_ g: SlateBoardGame, now: Date, fresh: Bool) -> Bool {
        g.s == "post" || (g.s == "in" && fresh)
    }
    // the clock while it's on, "Final", "Live" for a started game without a recent score, or the start time
    // games on now beyond the ones shown ("+2 live")
    static func moreLive(_ d: SlateTonight?, now: Date, shown: Int) -> Int {
        max(0, TonightLook.next(d, at: now, count: 99).filter { $0.s != "post" && TonightLook.started($0, now) }.count - shown)
    }
    static func status(_ g: SlateBoardGame, now: Date, fresh: Bool) -> String {
        if g.s == "post" { return "Final" }
        if g.s == "in" && fresh { return BoardLook.clock(g) }
        if TonightLook.started(g, now) { return "Live" }
        return TonightLook.time(g)
    }
}

struct LockView: View {
    @Environment(\.widgetFamily) private var family
    let entry: TonightEntry

    var body: some View {
        let list = TonightLook.next(entry.data, at: entry.date, count: 2)
        let fresh = TonightLook.fresh(entry.data, entry.date)
        Group {
            switch family {
            case .accessoryInline:
                if let g = list.first {
                    let on = LockLook.showScore(g, now: entry.date, fresh: fresh) || TonightLook.started(g, entry.date)
                    let more = LockLook.moreLive(entry.data, now: entry.date, shown: g.s != "post" && TonightLook.started(g, entry.date) ? 1 : 0)
                    Text(on ? "\(LockLook.teams(g, score: LockLook.showScore(g, now: entry.date, fresh: fresh))) · \(LockLook.status(g, now: entry.date, fresh: fresh))\(more > 0 ? " · +\(more)" : "")"
                            : "Next: \(LockLook.teams(g, score: false)) \(LockLook.status(g, now: entry.date, fresh: fresh))")
                } else {
                    Text(entry.data == nil ? "Open Slate to load tonight" : "No more games tonight")
                }
            case .accessoryCircular:
                ZStack {
                    AccessoryWidgetBackground()
                    if let g = list.first {
                        let score = LockLook.showScore(g, now: entry.date, fresh: fresh)
                        let more = LockLook.moreLive(entry.data, now: entry.date, shown: g.s != "post" && TonightLook.started(g, entry.date) ? 1 : 0)
                        VStack(spacing: 0) {
                            // several on at once: "+2" (more live) where the mark goes
                            if more > 0 { Text("+\(more)").font(SlateLook.bold(9)).frame(height: 11).widgetAccentable() }
                            else { SlateMark(color: .primary, size: 11).widgetAccentable() }
                            Text(g.aa).font(SlateLook.bold(11)).lineLimit(1).minimumScaleFactor(0.6)
                            if score {
                                Text("\(g.a)–\(g.h)").font(SlateLook.num(15)).lineLimit(1).minimumScaleFactor(0.6)
                            } else {
                                Text("at \(g.ha)").font(SlateLook.bold(9)).opacity(0.75).lineLimit(1).minimumScaleFactor(0.6)
                            }
                            Text(LockLook.status(g, now: entry.date, fresh: fresh).replacingOccurrences(of: " PM", with: "").replacingOccurrences(of: " AM", with: ""))
                                .font(score ? SlateLook.bold(9) : SlateLook.num(14))
                                .opacity(score ? 0.75 : 1)
                                .lineLimit(1)
                                .minimumScaleFactor(0.6)
                        }
                        .padding(4)
                    } else {
                        SlateMark(color: .primary, size: 22).widgetAccentable()
                    }
                }
            default:
                VStack(alignment: .leading, spacing: 1) {
                    HStack(spacing: 4) {
                        SlateMark(color: .primary, size: 12).widgetAccentable()
                        Text("TONIGHT").font(SlateLook.bold(10)).opacity(0.8)
                        Spacer(minLength: 2)
                        let left = TonightLook.next(entry.data, at: entry.date, count: 99).filter { $0.s != "post" }.count
                        let more = LockLook.moreLive(entry.data, now: entry.date, shown: list.filter { $0.s != "post" && TonightLook.started($0, entry.date) }.count)
                        if more > 0 { Text("+\(more) live").font(SlateLook.bold(10)).widgetAccentable() }
                        else if left > 0 { Text("\(left) left").font(SlateLook.semi(10)).opacity(0.7) }
                    }
                    .frame(height: 14)
                    if list.isEmpty {
                        Text(entry.data == nil ? "Open Slate to load tonight's games." : "No more games on tonight's slate.")
                            .font(SlateLook.semi(12))
                            .lineLimit(2)
                    }
                    ForEach(list, id: \.id) { g in
                        let score = LockLook.showScore(g, now: entry.date, fresh: fresh)
                        HStack(spacing: 4) {
                            Text(g.aa).font(SlateLook.bold(11))
                            if score { Text("\(g.a)").font(SlateLook.num(14)) }
                            Text(score ? "–" : "at").font(SlateLook.semi(10)).opacity(0.6)
                            if score { Text("\(g.h)").font(SlateLook.num(14)) }
                            Text(g.ha).font(SlateLook.bold(11))
                            Spacer(minLength: 2)
                            Text(LockLook.status(g, now: entry.date, fresh: fresh)).font(SlateLook.bold(10))
                        }
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                        .frame(height: 18)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .containerBackground(.clear, for: .widget)
        .widgetURL(SlateLook.slateURL)
    }
}
