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

// one game, as a small face-off tile (3.101.0, DJ: match the new live notifications): each team's logo on a slanted
// panel of its color at its side, the score in the middle with the clock in a small tag under it (red while live,
// plain after the final, the loser dimmed), or before kickoff the start time and channel
private struct BoardLine: View {
    let g: SlateBoardGame
    let dark: Bool
    var lines: Int = 1

    var body: some View {
        let pre = BoardLook.pre(g), fin = g.s == "post", live = g.s == "in"
        // 3.101.0 (DJ): the panels stay behind the logos, clear of the score; logos and scores as big as the tile allows
        let h: CGFloat = dark ? 58 : 64, side: CGFloat = dark ? 42 : 46, logo: CGFloat = dark ? 28 : 32
        let under = BoardLook.under(g), playing = live && !under.lowercased().contains("half")
        let bg = dark ? Color(slateHex: "#1C1C1E") : SlateLook.raise
        ZStack {
            // 3.101.0 (DJ): each team's color fills its half of the tile, and a dark band down the middle keeps the
            // score clear, the same as the big card's panels with the dark gap between them
            HStack(spacing: 0) {
                wash(SlateLook.panelHex(g.ac, g.ax), left: true)
                wash(SlateLook.panelHex(g.hc, g.hx), left: false)
            }
            BandShape(spread: 8).fill(bg).frame(width: dark ? 74 : 80)
            HStack(spacing: 0) {
                badge(abbr: g.aa, color: g.ac, alt: g.ax, logo: g.al, size: logo)
                    .frame(width: side)
                    .opacity(fin && g.a < g.h ? 0.5 : 1)
                VStack(spacing: 4) {
                    if pre {
                        Text(g.d)
                            .font(SlateLook.num(dark ? 17 : 20))
                            .lineLimit(1)
                            .minimumScaleFactor(0.6)
                        if let tv = g.tv, !tv.isEmpty {
                            Text(tv).font(SlateLook.semi(10)).foregroundStyle(SlateLook.muted).lineLimit(1)
                        }
                    } else {
                        HStack(spacing: 5) {
                            Text("\(g.a)").opacity(fin && g.a < g.h || live && g.a < g.h ? 0.6 : 1)
                            Rectangle().fill(SlateLook.ink.opacity(0.25)).frame(width: 2, height: dark ? 12 : 14)
                            Text("\(g.h)").opacity(fin && g.h < g.a || live && g.h < g.a ? 0.6 : 1)
                        }
                        .font(SlateLook.num(dark ? 24 : 27))
                        .lineLimit(1)
                        .minimumScaleFactor(0.6)
                        ClockTag(text: BoardLook.clock(g), live: playing, size: 11, height: 16, fill: dark ? Color.white.opacity(0.1) : SlateLook.card)
                    }
                }
                .frame(maxWidth: .infinity)
                badge(abbr: g.ha, color: g.hc, alt: g.hx, logo: g.hl, size: logo)
                    .frame(width: side)
                    .opacity(fin && g.h < g.a ? 0.5 : 1)
            }
        }
        .foregroundStyle(SlateLook.ink)
        .frame(maxWidth: .infinity)
        .frame(height: h)
        .background(bg)
        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(Text(BoardLook.spoken(g)))
    }

    private func wash(_ hex: String, left: Bool) -> some View {
        let c = Color(slateHex: hex, fallback: SlateLook.raise)
        return LinearGradient(colors: [c.opacity(0.62), c.opacity(0.35)], startPoint: left ? .leading : .trailing, endPoint: left ? .trailing : .leading)
    }

    // the team's logo, or its small chip when the app hasn't saved one
    @ViewBuilder
    private func badge(abbr: String, color: String, alt: String?, logo: String?, size: CGFloat) -> some View {
        if SlateLogos.image(logo) != nil {
            Chip(abbr: abbr, color: color, alt: alt, width: size, height: size, logo: logo)
        } else {
            Chip(abbr: abbr, color: color, alt: alt, width: 34, height: 18, size: 10, stripe: 2, radius: 3, logo: logo)
        }
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
                    Chip(abbr: g.aa, color: g.ac, alt: g.ax, width: SlateLogos.image(g.al) != nil ? 20 : 26, height: SlateLogos.image(g.al) != nil ? 20 : 16, size: 10, stripe: 2, radius: 3, logo: g.al)
                    Chip(abbr: g.ha, color: g.hc, alt: g.hx, width: SlateLogos.image(g.hl) != nil ? 20 : 26, height: SlateLogos.image(g.hl) != nil ? 20 : 16, size: 10, stripe: 2, radius: 3, logo: g.hl)
                }
            } else {
                BoardKickoff(g: g, size: 15, width: 46)
            }
        } else {
            HStack(spacing: 5) {
                if leading {
                    Chip(abbr: g.aa, color: g.ac, alt: g.ax, width: SlateLogos.image(g.al) != nil ? 20 : 26, height: SlateLogos.image(g.al) != nil ? 20 : 16, size: 10, stripe: 2, radius: 3, logo: g.al)
                    Text("\(g.a)").font(SlateLook.num(15)).foregroundStyle(.white)
                } else {
                    Text("\(g.h)").font(SlateLook.num(15)).foregroundStyle(.white)
                    Chip(abbr: g.ha, color: g.hc, alt: g.hx, width: SlateLogos.image(g.hl) != nil ? 20 : 26, height: SlateLogos.image(g.hl) != nil ? 20 : 16, size: 10, stripe: 2, radius: 3, logo: g.hl)
                }
            }
        }
    }
}
