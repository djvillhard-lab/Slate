import ActivityKit
import SwiftUI
import WidgetKit

// The live scoreboard (3.23.0): up to four games you picked on the slate, in one live notification.
// 3.30.0, "Score line": on the Lock Screen and in the Dynamic Island held open, each game is one line in a 2×2 grid
// ("KC 14 – 3 ATL") with the clock under it (red while live), "Final", or before kickoff "KC at ATL" with the start
// time and channel; tapping a game opens its matchup. The Dynamic Island on its own shows your first pick, and once
// that's final your next pick that's live: chips and scores, or before kickoff both chips and a countdown.
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
                    BoardGrid(games: Array(s.games.prefix(4)), dark: true, gap: 5)
                        .padding(.horizontal, 2)
                }
            } compactLeading: {
                if let g = lead { BoardSide(g: g, leading: true) }
            } compactTrailing: {
                if let g = lead { BoardSide(g: g, leading: false) }
            } minimal: {
                if let g = lead {
                    if BoardLook.pre(g) { BoardKickoff(g: g, size: 10, width: 30) } else { MiniScore(a: g.a, h: g.h) }
                }
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

    // the game the Dynamic Island shows on its own (3.30.0): your first pick until it's final, then your next pick
    // that's live, else your next one still to start
    static func lead(_ s: SlateBoardAttributes.ContentState) -> SlateBoardGame? {
        guard let first = s.games.first else { return nil }
        if first.s != "post" { return first }
        return s.games.first(where: { $0.s == "in" }) ?? s.games.first(where: { $0.s != "post" }) ?? first
    }

    static func pre(_ g: SlateBoardGame) -> Bool { g.s != "in" && g.s != "post" }

    // under a game's score: the clock, "Final", or before kickoff the start time and channel ("12:00 PM · CBS")
    static func under(_ g: SlateBoardGame) -> String {
        if pre(g), let tv = g.tv, !tv.isEmpty, !g.d.isEmpty { return g.d + " · " + tv }
        return clock(g)
    }

    // kickoff, when the server says it's within the hour: what the Dynamic Island counts down to
    static func kickoff(_ g: SlateBoardGame) -> Date? {
        guard pre(g), g.c == true, let t = g.t, t > 0 else { return nil }
        return Date(timeIntervalSince1970: t)
    }

    static func spoken(_ g: SlateBoardGame) -> String {
        pre(g) ? "\(g.aa) at \(g.ha), \(under(g))" : "\(g.aa) \(g.a), \(g.ha) \(g.h), \(clock(g))"
    }
}

// Lock Screen (3.30.0, "Score line"): the games in a 2×2 grid, one line each. Tap a game for its matchup.
private struct BoardCard: View {
    let s: SlateBoardAttributes.ContentState

    var body: some View {
        BoardGrid(games: Array(s.games.prefix(4)), dark: false, gap: 6)
            .padding(EdgeInsets(top: 10, leading: 10, bottom: 10, trailing: 10))
            .foregroundStyle(SlateLook.ink)
    }
}

private struct BoardGrid: View {
    let games: [SlateBoardGame]
    let dark: Bool
    let gap: CGFloat

    var body: some View {
        let cols = [GridItem(.flexible(), spacing: gap), GridItem(.flexible(), spacing: gap)]
        LazyVGrid(columns: games.count == 1 ? [GridItem(.flexible())] : cols, spacing: gap) {
            ForEach(games, id: \.id) { g in
                Link(destination: SlateLook.gameURL(g.id)) { BoardLine(g: g, dark: dark, lines: !dark && games.count <= 2 ? 2 : 1) }
            }
        }
    }
}

// one game: "KC 14 – 3 ATL" (the loser dimmed once it's final), or "KC at ATL" before kickoff; under it the clock
// with a red dot while it's being played, "Final", or the start time and channel
private struct BoardLine: View {
    let g: SlateBoardGame
    let dark: Bool
    var lines: Int = 1

    var body: some View {
        let pre = BoardLook.pre(g), fin = g.s == "post", live = g.s == "in"
        let under = BoardLook.under(g), playing = live && !under.lowercased().contains("half")
        VStack(spacing: 3) {
            HStack(spacing: 6) {
                Chip(abbr: g.aa, color: g.ac, alt: g.ax, width: 34, height: 18, size: 10, stripe: 2, radius: 3)
                    .opacity(fin && g.a < g.h ? 0.5 : 1)
                if pre {
                    Text("at").font(SlateLook.semi(11)).foregroundStyle(SlateLook.muted)
                } else {
                    Text("\(g.a)").font(SlateLook.num(21)).opacity(fin && g.a < g.h ? 0.5 : 1)
                    Text("–").font(SlateLook.semi(11)).foregroundStyle(SlateLook.muted)
                    Text("\(g.h)").font(SlateLook.num(21)).opacity(fin && g.h < g.a ? 0.5 : 1)
                }
                Chip(abbr: g.ha, color: g.hc, alt: g.hx, width: 34, height: 18, size: 10, stripe: 2, radius: 3)
                    .opacity(fin && g.h < g.a ? 0.5 : 1)
            }
            .lineLimit(1)
            .frame(height: 22)
            HStack(spacing: 4) {
                if playing { Circle().fill(SlateLook.live).frame(width: 5, height: 5) }
                Text(under)
                    .font(SlateLook.num(11))
                    .foregroundStyle(live ? SlateLook.live : fin ? SlateLook.ink : SlateLook.muted)
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
            }
            // 3.64.0: the slate card's one-liner, small and quiet (two lines on the Lock Screen when there's one row of games)
            if let ln = g.ln, !ln.isEmpty, !fin {
                Text(ln)
                    .font(SlateLook.semi(10))
                    .foregroundStyle(SlateLook.muted)
                    .multilineTextAlignment(.center)
                    .lineLimit(lines)
                    .minimumScaleFactor(0.9)
                    .padding(.top, 1)
            }
        }
        .foregroundStyle(SlateLook.ink)
        .padding(EdgeInsets(top: 7, leading: 6, bottom: 6, trailing: 6))
        .frame(maxWidth: .infinity)
        .background(dark ? Color.white.opacity(0.09) : SlateLook.raise, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(Text(BoardLook.spoken(g) + ((g.ln ?? "").isEmpty || fin ? "" : ". " + (g.ln ?? ""))))
    }
}

// before kickoff, in the Dynamic Island: a countdown to the start once it's within the hour (it ticks on the phone,
// no update needed); earlier than that, the start time
private struct BoardKickoff: View {
    let g: SlateBoardGame
    let size: CGFloat
    let width: CGFloat

    var body: some View {
        if let k = BoardLook.kickoff(g) {
            let now = Date()
            Text(timerInterval: min(now, k)...k, countsDown: true)
                .font(SlateLook.num(size))
                .foregroundStyle(.white)
                .multilineTextAlignment(.center)
                .lineLimit(1)
                .minimumScaleFactor(0.6)
                .frame(width: width)
                .accessibilityLabel(Text("Starts at \(g.d)"))
        } else {
            Text(g.d.replacingOccurrences(of: " PM", with: "").replacingOccurrences(of: " AM", with: ""))
                .font(SlateLook.num(size))
                .foregroundStyle(.white)
                .lineLimit(1)
                .minimumScaleFactor(0.6)
                .frame(maxWidth: width)
                .accessibilityLabel(Text("Starts at \(g.d)"))
        }
    }
}

// before kickoff where the island is narrow (iPhone Duo's side column): the countdown inside a ring in the two teams' colors
private struct BoardKickoffRing: View {
    let g: SlateBoardGame

    var body: some View {
        ZStack {
            Circle().trim(from: 0.5, to: 1).stroke(SlateLook.visible(g.ac), lineWidth: 2).rotationEffect(.degrees(-90))
            Circle().trim(from: 0, to: 0.5).stroke(SlateLook.visible(g.hc), lineWidth: 2).rotationEffect(.degrees(-90))
            BoardKickoff(g: g, size: 9, width: 22)
        }
        .padding(1)
        .frame(width: 28, height: 28)
    }
}

// the Dynamic Island with one game showing: its chips and scores beside the camera, or mini chips where narrow; before kickoff, a countdown
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
        } else if BoardLook.pre(g) {
            // leading side only; iOS hides the empty trailing side
            if leading { BoardKickoffRing(g: g) }
        } else if leading {
            MiniSide(abbr: g.aa, color: g.ac, alt: g.ax, score: g.a, leading: true)
        } else {
            MiniSide(abbr: g.ha, color: g.hc, alt: g.hx, score: g.h, leading: false)
        }
    }
}

private struct BoardChips: View {
    let g: SlateBoardGame
    let leading: Bool

    var body: some View {
        if BoardLook.pre(g) {
            // before kickoff: both chips left of the camera, the countdown (or start time) right of it
            if leading {
                HStack(spacing: 3) {
                    Chip(abbr: g.aa, color: g.ac, alt: g.ax, width: 26, height: 16, size: 10, stripe: 2, radius: 3)
                    Chip(abbr: g.ha, color: g.hc, alt: g.hx, width: 26, height: 16, size: 10, stripe: 2, radius: 3)
                }
            } else {
                BoardKickoff(g: g, size: 15, width: 46)
            }
        } else {
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
}
