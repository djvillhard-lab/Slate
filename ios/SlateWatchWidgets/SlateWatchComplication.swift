import SwiftUI
import WidgetKit

// 3.114.0 (DJ): a Slate complication for the watch face (and the Smart Stack): the game that's on, or the next one
// on your slate, from the copy the Watch app keeps (WatchTonight). Same rules as the iPhone's Lock Screen widgets:
// a score more than 20 minutes old just says Live, finals stay 30 minutes.
@main
struct SlateWatchWidgets: WidgetBundle {
    init() { WatchLook.registerFonts() }
    var body: some Widget { SlateComplication() }
}

struct SlateComplication: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "SlateWatch", provider: WatchProvider()) { e in
            ComplicationView(entry: e)
        }
        .configurationDisplayName("Slate")
        .description("The game that's on, or the next one on your slate.")
        .supportedFamilies([.accessoryCircular, .accessoryRectangular, .accessoryInline, .accessoryCorner])
    }
}

struct WatchEntry: TimelineEntry {
    let date: Date
    let data: WatchTonight?
}

struct WatchProvider: TimelineProvider {
    func placeholder(in context: Context) -> WatchEntry { WatchEntry(date: Date(), data: nil) }
    func getSnapshot(in context: Context, completion: @escaping (WatchEntry) -> Void) {
        completion(WatchEntry(date: Date(), data: WatchTonight.load()))
    }
    // every 15 minutes for six hours, plus each start time; the Watch app redraws it when scores change
    func getTimeline(in context: Context, completion: @escaping (Timeline<WatchEntry>) -> Void) {
        let data = WatchTonight.load(), now = Date()
        var dates = (0..<24).map { now.addingTimeInterval(Double($0) * 900) }
        for g in data?.games ?? [] { if let t = g.t, t > now.timeIntervalSince1970, t < now.timeIntervalSince1970 + 6 * 3600 { dates.append(Date(timeIntervalSince1970: t)) } }
        completion(Timeline(entries: Set(dates).sorted().map { WatchEntry(date: $0, data: data) }, policy: .atEnd))
    }
}

struct ComplicationView: View {
    @Environment(\.widgetFamily) private var family
    let entry: WatchEntry

    var body: some View {
        let list = WatchLook.next(entry.data, at: entry.date, count: 2)
        let g = list.first
        Group {
            switch family {
            case .accessoryInline:
                if let g {
                    let sc = WatchLook.showScore(g, entry.data, entry.date)
                    Text(sc ? "\(g.aa) \(g.a)–\(g.h) \(g.ha) · \(WatchLook.status(g, entry.data, entry.date))"
                            : "\(g.aa) at \(g.ha) · \(WatchLook.status(g, entry.data, entry.date))")
                } else {
                    Text("Slate: no more games")
                }
            case .accessoryCorner:
                SlateMark(size: 20)
                    .widgetLabel {
                        if let g { Text(line(g)) } else { Text("Slate") }
                    }
            case .accessoryRectangular:
                VStack(alignment: .leading, spacing: 1) {
                    HStack(spacing: 4) {
                        SlateMark(size: 12)
                        Text("TONIGHT").font(WatchLook.bold(10)).foregroundStyle(WatchLook.muted)
                    }
                    if list.isEmpty {
                        Text(entry.data == nil ? "Open Slate on your iPhone" : "No more games tonight").font(WatchLook.semi(12))
                    }
                    ForEach(list) { x in
                        HStack(spacing: 4) {
                            Text(line(x, withStatus: false)).font(WatchLook.bold(12))
                            Spacer(minLength: 2)
                            Text(WatchLook.status(x, entry.data, entry.date)).font(WatchLook.bold(11))
                                .foregroundStyle(x.s == "in" ? WatchLook.live : WatchLook.ink)
                        }
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            default:
                ZStack {
                    AccessoryWidgetBackground()
                    if let g {
                        let sc = WatchLook.showScore(g, entry.data, entry.date)
                        VStack(spacing: 0) {
                            SlateMark(size: 10)
                            Text(g.aa).font(WatchLook.bold(10)).lineLimit(1).minimumScaleFactor(0.6)
                            Text(sc ? "\(g.a)–\(g.h)" : "at \(g.ha)").font(sc ? WatchLook.num(14) : WatchLook.bold(9)).lineLimit(1).minimumScaleFactor(0.6)
                        }
                        .padding(3)
                    } else {
                        SlateMark(size: 20)
                    }
                }
            }
        }
        .containerBackground(.clear, for: .widget)
    }

    private func line(_ g: WatchGame, withStatus: Bool = true) -> String {
        let sc = WatchLook.showScore(g, entry.data, entry.date)
        let t = sc ? "\(g.aa) \(g.a)–\(g.h) \(g.ha)" : "\(g.aa) at \(g.ha)"
        return withStatus ? t + " " + WatchLook.status(g, entry.data, entry.date) : t
    }
}
