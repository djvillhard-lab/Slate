import ActivityKit
import SwiftUI
import WidgetKit

// The live scoreboard (3.23.0): up to four games you picked on the slate, in one live notification.
// Lock Screen: the four games in a 2×2 grid (both chips and scores, the clock, "Final" or the start time, and for live
// football who has the ball and the down); tapping a square opens that game's matchup. Dynamic Island: held open, the same rows; otherwise the game that last scored, as "Chips"
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

    // "3rd & 4 at ILL 35" fits a square as "3rd & 4 · ILL 35"
    static func down(_ dd: String) -> String { dd.replacingOccurrences(of: " at ", with: " · ") }
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

// Lock Screen (3.25.0): the four games in a 2×2 grid, each in its own square: both team chips (the app's colors)
// with their scores, then the clock (red while live), "Final" or the start time; a live football game also shows
// who has the ball and the down and yardage line. Tap a square for that game's matchup.
private struct BoardCard: View {
    let s: SlateBoardAttributes.ContentState

    var body: some View {
        let games = Array(s.games.prefix(4))
        let cols = [GridItem(.flexible(), spacing: 6), GridItem(.flexible(), spacing: 6)]
        LazyVGrid(columns: games.count == 1 ? [GridItem(.flexible())] : cols, spacing: 6) {
            ForEach(games, id: \.id) { g in
                Link(destination: SlateLook.gameURL(g.id)) { BoardSquare(g: g) }
            }
        }
        .padding(EdgeInsets(top: 10, leading: 10, bottom: 10, trailing: 10))
        .foregroundStyle(SlateLook.ink)
    }
}

private struct BoardSquare: View {
    let g: SlateBoardGame

    var body: some View {
        let pre = g.s != "in" && g.s != "post", fin = g.s == "post", live = g.s == "in"
        VStack(alignment: .leading, spacing: 2) {
            BoardTeam(abbr: g.aa, color: g.ac, alt: g.ax, score: pre ? nil : g.a, ball: live && g.p == "away", dim: fin && g.a < g.h)
            BoardTeam(abbr: g.ha, color: g.hc, alt: g.hx, score: pre ? nil : g.h, ball: live && g.p == "home", dim: fin && g.h < g.a)
            Text(BoardLook.clock(g))
                .font(SlateLook.num(13))
                .foregroundStyle(live ? SlateLook.live : fin ? SlateLook.ink : SlateLook.muted)
                .lineLimit(1)
                .padding(.top, 1)
            // football: the down and the yardage line, while ESPN reports one
            if live, let dd = g.dd, !dd.isEmpty {
                Text(BoardLook.down(dd))
                    .font(SlateLook.semi(11))
                    .foregroundStyle(SlateLook.muted)
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
            }
        }
        .padding(EdgeInsets(top: 6, leading: 8, bottom: 6, trailing: 8))
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(SlateLook.raise, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
    }
}

// one team in a square: its chip, the football when it has the ball, its score at the right
private struct BoardTeam: View {
    let abbr: String, color: String, alt: String?
    let score: Int?
    let ball: Bool
    let dim: Bool

    var body: some View {
        HStack(spacing: 5) {
            Chip(abbr: abbr, color: color, alt: alt, width: 38, height: 19, size: 11, stripe: 2, radius: 3)
            if ball {
                Image(systemName: "football.fill")
                    .font(.system(size: 9))
                    .foregroundStyle(SlateLook.muted)
                    .accessibilityLabel("has the ball")
            }
            Spacer(minLength: 2)
            if let score {
                Text("\(score)").font(SlateLook.num(19)).lineLimit(1)
            }
        }
        .frame(height: 20)
        .opacity(dim ? 0.5 : 1)
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
