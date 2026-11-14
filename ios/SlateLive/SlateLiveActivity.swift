import ActivityKit
import SwiftUI
import WidgetKit

struct SlateLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: SlateGameAttributes.self) { context in
            LockScreenScore(attrs: context.attributes, st: context.state)
                .activityBackgroundTint(Color(red: 0.07, green: 0.09, blue: 0.13))
                .activitySystemActionForegroundColor(.white)
        } dynamicIsland: { context in
            let a = context.attributes, s = context.state
            return DynamicIsland {
                DynamicIslandExpandedRegion(.leading) { TeamScore(abbr: a.awayAbbr, color: a.awayColor, score: s.a, leading: true) }
                DynamicIslandExpandedRegion(.trailing) { TeamScore(abbr: a.homeAbbr, color: a.homeColor, score: s.h, leading: false) }
                DynamicIslandExpandedRegion(.center) {
                    Text(s.detail).font(.caption.weight(.bold)).foregroundStyle(s.state == "in" ? .red : .secondary)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    if let line = s.line, !line.isEmpty { Text(line).font(.caption).lineLimit(1).foregroundStyle(.secondary) }
                }
            } compactLeading: {
                Text("\(a.awayAbbr) \(s.a)").font(.caption2.weight(.heavy)).monospacedDigit()
            } compactTrailing: {
                Text("\(s.h) \(a.homeAbbr)").font(.caption2.weight(.heavy)).monospacedDigit()
            } minimal: {
                Text("\(s.a)-\(s.h)").font(.caption2.weight(.heavy)).monospacedDigit()
            }
            .widgetURL(URL(string: "https://slate.djvillhard.workers.dev/"))
        }
    }
}

private struct TeamScore: View {
    let abbr: String, color: String, score: Int, leading: Bool
    var body: some View {
        HStack(spacing: 6) {
            if !leading { Text("\(score)").font(.title2.weight(.heavy)).monospacedDigit() }
            Text(abbr).font(.caption.weight(.heavy)).padding(.horizontal, 6).padding(.vertical, 2)
                .background(RoundedRectangle(cornerRadius: 4).fill(Color(slateHex: color, fallback: .gray)))
                .foregroundStyle(.white)
            if leading { Text("\(score)").font(.title2.weight(.heavy)).monospacedDigit() }
        }
    }
}

private struct LockScreenScore: View {
    let attrs: SlateGameAttributes, st: SlateGameAttributes.ContentState
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(attrs.league).font(.caption.weight(.bold)).foregroundStyle(.secondary)
                Spacer()
                Text(st.detail).font(.caption.weight(.heavy)).foregroundStyle(st.state == "in" ? .red : .secondary)
            }
            row(attrs.away, attrs.awayAbbr, attrs.awayColor, st.a, st.a > st.h || st.state != "post")
            row(attrs.home, attrs.homeAbbr, attrs.homeColor, st.h, st.h > st.a || st.state != "post")
            if let line = st.line, !line.isEmpty {
                Text(line).font(.caption).foregroundStyle(.secondary).lineLimit(1)
            }
        }
        .padding(14)
        .foregroundStyle(.white)
    }

    private func row(_ name: String, _ abbr: String, _ color: String, _ score: Int, _ bright: Bool) -> some View {
        HStack(spacing: 8) {
            Text(abbr).font(.caption.weight(.heavy)).frame(width: 44, height: 20)
                .background(RoundedRectangle(cornerRadius: 4).fill(Color(slateHex: color, fallback: .gray)))
            Text(name).font(.subheadline.weight(.bold)).lineLimit(1)
            Spacer()
            Text("\(score)").font(.title3.weight(.heavy)).monospacedDigit()
        }
        .opacity(bright ? 1 : 0.6)
    }
}
