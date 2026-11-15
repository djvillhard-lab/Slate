import ActivityKit
import SwiftUI
import WidgetKit

// The live scoreboard (3.23.0): up to four games you picked on the slate, in one live notification.
// Lock Screen: one row per game (both chips and scores, then the clock, "Final" or the start time); tapping a row opens
// that game's matchup. Dynamic Island: held open, the same rows; otherwise the game that last scored, as "Chips"
// (or its split ring where iOS gives the island less width, like the iPhone Duo's side column).
struct SlateBoardActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: SlateBoardAttributes.self) { context in
            BoardCard(s: context.state)
                .activityBackgroundTint(SlateLook.card)
                .activitySystemActionForegroundColor(SlateLook.ink)
                .widgetURL(SlateLook.slateURL)
        } dynamicIsland: { context in
            let s = context.state, lead = BoardLook.lead(s)
            return DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Text("Your slate")
                        .font(SlateLook.bold(13))
                        .foregroundStyle(SlateLook.muted)
                        .padding(.leading, 6)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text(BoardLook.summary(s))
                        .font(SlateLook.num(13))
                        .foregroundStyle(BoardLook.anyLive(s) ? SlateLook.live : SlateLook.muted)
                        .padding(.trailing, 6)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    VStack(spacing: 5) {
                        ForEach(Array(s.games.prefix(4)), id: \.id) { g in
                            Link(destination: SlateLook.gameURL(g.id)) { BoardRow(g: g) }
                        }
                    }
                    .padding(.horizontal, 4)
                }
            } compactLeading: {
                if let g = lead { BoardSide(g: g, leading: true) }
            } compactTrailing: {
                if let g = lead { BoardSide(g: g, leading: false) }
            } minimal: {
                if let g = lead { SplitRing(away: SlateLook.visible(g.ac), home: SlateLook.visible(g.hc), a: g.a, h: g.h) }
            }
            .widgetURL(SlateLook.slateURL)
        }
    }
}

enum BoardLook {
    // ESPN's "8:42 - 3rd" reads "3rd 8:42"; the start time and finals stay as they are
    static func clock(_ g: SlateBoardGame) -> String {
        if g.s == "post" { return g.d.isEmpty ? "Final" : g.d }
        if g.s != "in" { return g.d }
        let parts = g.d.components(separatedBy: " - ")
        return parts.count == 2 ? parts[1] + " " + parts[0] : g.d
    }

    static func anyLive(_ s: SlateBoardAttributes.ContentState) -> Bool { s.games.contains { $0.s == "in" } }

    // "2 live", "Final" once they're all over, "" before any start
    static func summary(_ s: SlateBoardAttributes.ContentState) -> String {
        let n = s.games.filter { $0.s == "in" }.count
        if n > 0 { return "\(n) live" }
        return !s.games.isEmpty && s.games.allSatisfy({ $0.s == "post" }) ? "Final" : ""
    }

    // the game the Dynamic Island shows on its own: the one that last scored, else the first one live, else the first
    static func lead(_ s: SlateBoardAttributes.ContentState) -> SlateBoardGame? {
        if let i = s.lead, s.games.indices.contains(i) { return s.games[i] }
        return s.games.first(where: { $0.s == "in" }) ?? s.games.first
    }
}

// Lock Screen: a header, then up to four rows
private struct BoardCard: View {
    let s: SlateBoardAttributes.ContentState

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 8) {
                Text("Your slate")
                    .font(SlateLook.semi(12))
                    .foregroundStyle(SlateLook.muted)
                Spacer(minLength: 0)
                Text(BoardLook.summary(s))
                    .font(SlateLook.num(13))
                    .foregroundStyle(BoardLook.anyLive(s) ? SlateLook.live : SlateLook.muted)
            }
            .frame(height: 16)
            ForEach(Array(s.games.prefix(4)), id: \.id) { g in
                Link(destination: SlateLook.gameURL(g.id)) { BoardRow(g: g) }
            }
        }
        .padding(EdgeInsets(top: 12, leading: 16, bottom: 12, trailing: 14))
        .foregroundStyle(SlateLook.ink)
    }
}

// one game: away chip and score, home score and chip, then the clock (red while live), "Final" or the start time
private struct BoardRow: View {
    let g: SlateBoardGame

    var body: some View {
        let pre = g.s != "in" && g.s != "post", fin = g.s == "post"
        HStack(spacing: 8) {
            Chip(abbr: g.aa, color: g.ac, alt: g.ax, width: 36, height: 20, size: 11, stripe: 2, radius: 3)
            Text(pre ? "" : "\(g.a)")
                .font(SlateLook.num(20))
                .frame(width: 30, alignment: .trailing)
                .opacity(fin && g.a < g.h ? 0.5 : 1)
            Text(pre ? "at" : "–")
                .font(SlateLook.semi(12))
                .foregroundStyle(SlateLook.muted)
            Text(pre ? "" : "\(g.h)")
                .font(SlateLook.num(20))
                .frame(width: 30, alignment: .leading)
                .opacity(fin && g.h < g.a ? 0.5 : 1)
            Chip(abbr: g.ha, color: g.hc, alt: g.hx, width: 36, height: 20, size: 11, stripe: 2, radius: 3)
            Spacer(minLength: 6)
            Text(BoardLook.clock(g))
                .font(SlateLook.num(14))
                .foregroundStyle(g.s == "in" ? SlateLook.live : fin ? SlateLook.ink : SlateLook.muted)
                .lineLimit(1)
        }
        .frame(height: 22)
    }
}

// the Dynamic Island with one game showing: its chips and scores beside the camera, or its split ring where narrow
private struct BoardSide: View {
    let g: SlateBoardGame
    let leading: Bool

    var body: some View {
        if #available(iOS 27.0, *) {
            BoardNarrowAwareSide(g: g, leading: leading)
        } else {
            BoardChips(g: g, leading: leading)
        }
    }
}

@available(iOS 27.0, *)
private struct BoardNarrowAwareSide: View {
    @Environment(\.isDynamicIslandLimitedInWidth) private var narrow
    let g: SlateBoardGame
    let leading: Bool

    var body: some View {
        if !narrow {
            BoardChips(g: g, leading: leading)
        } else if leading {
            SplitRing(away: SlateLook.visible(g.ac), home: SlateLook.visible(g.hc), a: g.a, h: g.h)
        } else {
            EmptyView()
        }
    }
}

private struct BoardChips: View {
    let g: SlateBoardGame
    let leading: Bool

    var body: some View {
        HStack(spacing: 5) {
            if leading {
                Chip(abbr: g.aa, color: g.ac, alt: g.ax, width: 26, height: 16, size: 10, stripe: 2, radius: 3)
                Text("\(g.a)").font(SlateLook.num(15)).foregroundStyle(.white)
            } else {
                Text("\(g.h)").font(SlateLook.num(15)).foregroundStyle(.white)
                Chip(abbr: g.ha, color: g.hc, alt: g.hx, width: 26, height: 16, size: 10, stripe: 2, radius: 3)
            }
        }
    }
}
