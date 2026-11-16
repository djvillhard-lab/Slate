import ActivityKit
import SwiftUI
import UIKit
import WidgetKit

// Live scores on the Lock Screen and in the Dynamic Island (redesign, 3.20.0):
// - Lock Screen, a scorebug: the slate's team chips (second-color stripe), big narrow scores, the live clock in red,
//   a football by whoever has the ball, the down and distance, the slate's red one-liner, and a Watch button on the
//   right (the channel's app, through Slate). After the final the loser dims and the note gets the whole width (3.23.0).
// - Dynamic Island, expanded: the same scorebug around the camera (chips and big scores either side, the clock and
//   down under it, the one-liner and a Matchup button on the right). One game live: both chips with their scores
//   ("Chips"). Where iOS gives the island less width (the iPhone Duo's side column), mini chips (3.25.3); sharing the
//   island with another live notification, just the score.
// Tapping any of it opens that game's matchup in Slate.
struct SlateLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: SlateGameAttributes.self) { context in
            LockCard(a: context.attributes, s: context.state)
                .activityBackgroundTint(SlateLook.card)
                .activitySystemActionForegroundColor(SlateLook.ink)
                .widgetURL(SlateLook.gameURL(context.attributes.gameId))
        } dynamicIsland: { context in
            let a = context.attributes, s = context.state
            return DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    // each team's standout so far sits under its score (3.38.0)
                    VStack(alignment: .leading, spacing: 3) {
                        IslandTeam(abbr: a.awayAbbr, color: a.awayColor, alt: a.awayAlt, score: s.a, chipFirst: true, dim: SlateLook.lost(s, away: true))
                        IslandNote(text: s.ap, align: .leading)
                    }
                    .padding(.leading, 4)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    VStack(alignment: .trailing, spacing: 3) {
                        IslandTeam(abbr: a.homeAbbr, color: a.homeColor, alt: a.homeAlt, score: s.h, chipFirst: false, dim: SlateLook.lost(s, away: false))
                        IslandNote(text: s.hp, align: .trailing)
                    }
                    .padding(.trailing, 4)
                }
                DynamicIslandExpandedRegion(.center) {
                    VStack(spacing: 3) {
                        HStack(spacing: 6) {
                            if s.state == "in" { Circle().fill(SlateLook.live).frame(width: 6, height: 6) }
                            Text(SlateLook.clock(s))
                                .font(SlateLook.num(14))
                                .foregroundStyle(s.state == "in" ? SlateLook.live : SlateLook.ink)
                                .lineLimit(1)
                        }
                        if s.state == "in", let sit = s.sit, !sit.isEmpty {
                            Text(sit)
                                .font(SlateLook.semi(12))
                                .foregroundStyle(SlateLook.muted)
                                .lineLimit(1)
                                .minimumScaleFactor(0.8)
                        }
                    }
                }
                DynamicIslandExpandedRegion(.bottom) {
                    IslandBottom(s: s)
                }
            } compactLeading: {
                CompactSide(a: a, s: s, leading: true)
            } compactTrailing: {
                CompactSide(a: a, s: s, leading: false)
            } minimal: {
                MiniScore(a: s.a, h: s.h)
            }
            .widgetURL(SlateLook.gameURL(a.gameId))
        }
    }
}

// Slate's own look: the navy theme's colors (index.html) and Archivo, cut into three fonts bundled with this
// extension (SlateArchivo-*.ttf, listed under UIAppFonts in SlateLive-Info.plist). Archivo: © The Archivo Project
// Authors, SIL Open Font License 1.1. A font that fails to load falls back to the system font at the same size.
enum SlateLook {
    static let card = Color(slateHex: "#1A2230")
    static let raise = Color(slateHex: "#232D3C")
    static let ink = Color(slateHex: "#ECF1F7")
    static let muted = Color(slateHex: "#A0ACBD")
    static let live = Color(slateHex: "#FF5B4E")
    static let button = Color(slateHex: "#1F2733")

    static func semi(_ size: CGFloat) -> Font { .custom("SlateArchivo-SemiBold", fixedSize: size) }
    static func bold(_ size: CGFloat) -> Font { .custom("SlateArchivo-Bold", fixedSize: size) }
    static func num(_ size: CGFloat) -> Font { .custom("SlateArchivo-CondensedExtraBold", fixedSize: size).monospacedDigit() }

    private static let home = "https://slate.djvillhard.workers.dev/"
    private static func enc(_ s: String) -> String { s.addingPercentEncoding(withAllowedCharacters: .alphanumerics) ?? "" }

    // the slate itself (the live scoreboard's tap)
    static var slateURL: URL { URL(string: home)! }

    // Links the app hands to the page (WebModel.openLink): open this game's matchup …
    static func gameURL(_ id: String) -> URL {
        URL(string: home + "#game=" + enc(id)) ?? URL(string: home)!
    }

    // … or watch it: the channel's app, the way the slate's channel buttons do (a choice when there are two)
    static func watchURL(_ channel: String, _ id: String) -> URL {
        URL(string: home + "#watch=" + enc(channel) + "&gid=" + enc(id)) ?? URL(string: home)!
    }

    // ESPN's "8:42 - 3rd" reads "3rd 8:42", like the slate; "Halftime", "67'" and finals stay as they are
    static func clock(_ s: SlateGameAttributes.ContentState) -> String {
        if s.state == "post" { return s.detail.isEmpty ? "Final" : s.detail }
        let parts = s.detail.components(separatedBy: " - ")
        return parts.count == 2 ? parts[1] + " " + parts[0] : s.detail
    }

    // after the final, the losing side dims
    static func lost(_ s: SlateGameAttributes.ContentState, away: Bool) -> Bool {
        s.state == "post" && (away ? s.a < s.h : s.h < s.a)
    }

    // A team color that still shows on the Dynamic Island's black: dark ones (navy, maroon) get brighter, same hue.
    // text on a team chip: white, or dark on a light team color (England's white), so the letters always show
    static func onChip(_ hex: String) -> Color {
        let h = hex.hasPrefix("#") ? String(hex.dropFirst()) : hex
        guard h.count == 6, let v = UInt32(h, radix: 16) else { return .white }
        let r = Double((v >> 16) & 0xFF), g = Double((v >> 8) & 0xFF), b = Double(v & 0xFF)
        return (0.299 * r + 0.587 * g + 0.114 * b) > 170 ? Color(red: 0x11 / 255, green: 0x18 / 255, blue: 0x20 / 255) : .white
    }
    static func visible(_ hex: String) -> Color {
        let base = UIColor(Color(slateHex: hex, fallback: .gray))
        var h: CGFloat = 0, s: CGFloat = 0, b: CGFloat = 0, al: CGFloat = 0
        guard base.getHue(&h, saturation: &s, brightness: &b, alpha: &al) else { return Color(slateHex: hex, fallback: .gray) }
        var bright = b
        while bright < 1, luminance(UIColor(hue: h, saturation: s, brightness: bright, alpha: 1)) < 0.11 {
            bright = min(1, bright + 0.05)
        }
        return Color(UIColor(hue: h, saturation: s, brightness: bright, alpha: 1))
    }

    private static func luminance(_ c: UIColor) -> CGFloat {
        var r: CGFloat = 0, g: CGFloat = 0, b: CGFloat = 0, a: CGFloat = 0
        c.getRed(&r, green: &g, blue: &b, alpha: &a)
        func lin(_ v: CGFloat) -> CGFloat { v <= 0.03928 ? v / 12.92 : pow((v + 0.055) / 1.055, 2.4) }
        return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
    }
}

// The slate's team chip: the team color, its second color as a stripe along the bottom, a faint edge so dark
// colors (Notre Dame's navy) still read on the navy card.
struct Chip: View {
    let abbr: String
    let color: String
    let alt: String?
    var width: CGFloat = 42
    var height: CGFloat = 24
    var size: CGFloat = 13
    var stripe: CGFloat = 3
    var radius: CGFloat = 4

    var body: some View {
        let shape = RoundedRectangle(cornerRadius: radius, style: .continuous)
        Text(abbr)
            .font(SlateLook.num(size))
            .foregroundStyle(SlateLook.onChip(color))
            .lineLimit(1)
            .minimumScaleFactor(0.6)
            .padding(.horizontal, 2)
            .padding(.bottom, max(0, stripe - 1))
            .frame(width: width, height: height)
            .background {
                shape.fill(Color(slateHex: color, fallback: .gray))
                    .overlay(alignment: .bottom) {
                        Rectangle().fill(Color(slateHex: alt ?? "", fallback: .clear)).frame(height: stripe)
                    }
                    .clipShape(shape)
            }
            .overlay { shape.strokeBorder(Color.white.opacity(0.16), lineWidth: 1) }
    }
}

// Lock Screen: the scorebug, one per game
private struct LockCard: View {
    let a: SlateGameAttributes
    let s: SlateGameAttributes.ContentState

    var body: some View {
        let live = s.state == "in"
        let hasSit = live && !(s.sit ?? "").isEmpty
        // 3.39.1: each team's standout on its own line when ESPN has them ("SF  B. Purdy 22/28, 389 YDS, 3 TD"),
        // else the slate's one-liner as before
        let stars: [(String, String)] = [(a.awayAbbr, s.ap ?? ""), (a.homeAbbr, s.hp ?? ""), (s.ox ?? "", s.op ?? "")].filter { !$0.0.isEmpty && !$0.1.isEmpty }
        let note = stars.isEmpty ? (s.line ?? "") : ""
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 8) {
                Text(a.league)
                    .font(SlateLook.semi(12))
                    .foregroundStyle(SlateLook.muted)
                    .lineLimit(1)
                Spacer(minLength: 0)
                HStack(spacing: 6) {
                    if live { Circle().fill(SlateLook.live).frame(width: 6, height: 6) }
                    Text(SlateLook.clock(s))
                        .font(SlateLook.num(14))
                        .foregroundStyle(live ? SlateLook.live : SlateLook.ink)
                        .lineLimit(1)
                }
            }
            .frame(height: 16)
            .padding(.bottom, 6)

            VStack(spacing: 4) {
                ScoreRow(abbr: a.awayAbbr, name: a.away, color: a.awayColor, alt: a.awayAlt, rank: a.awayRank, score: s.a,
                         ball: live && s.poss == "away", dim: SlateLook.lost(s, away: true))
                ScoreRow(abbr: a.homeAbbr, name: a.home, color: a.homeColor, alt: a.homeAlt, rank: a.homeRank, score: s.h,
                         ball: live && s.poss == "home", dim: SlateLook.lost(s, away: false))
            }

            // the bottom of the card, full width (3.25.1, no Watch button): for live football who has the ball, the down
            // and the yard line ("MIN ball · 3rd & 4 at GB 35"), then the slate's one-liner across the whole card
            if hasSit || !note.isEmpty || !stars.isEmpty {
                VStack(alignment: .leading, spacing: 3) {
                    if hasSit {
                        HStack(spacing: 5) {
                            Image(systemName: "football.fill")
                                .font(.system(size: 10))
                                .foregroundStyle(SlateLook.muted)
                            Text(s.sit ?? "")
                                .font(SlateLook.bold(13))
                                .foregroundStyle(SlateLook.ink)
                                .lineLimit(1)
                                .minimumScaleFactor(0.85)
                        }
                    }
                    ForEach(Array(stars.enumerated()), id: \.offset) { _, st in
                        HStack(spacing: 6) {
                            Text(st.0)
                                .font(SlateLook.bold(11))
                                .foregroundStyle(SlateLook.muted)
                                .frame(width: 34, alignment: .leading)
                            Text(st.1)
                                .font(SlateLook.semi(13))
                                .foregroundStyle(live ? SlateLook.live : SlateLook.ink)
                                .lineLimit(1)
                                .minimumScaleFactor(0.75)
                        }
                    }
                    // red while the game is on, plain after; two lines when there's room
                    if !note.isEmpty {
                        Text(note)
                            .font(SlateLook.semi(13))
                            .foregroundStyle(live ? SlateLook.live : SlateLook.muted)
                            .lineLimit(hasSit ? 1 : 2)
                            .minimumScaleFactor(0.85)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.top, 8)
            }
        }
        .padding(EdgeInsets(top: 10, leading: 16, bottom: 10, trailing: 14))
        .foregroundStyle(SlateLook.ink)
    }
}

private struct ScoreRow: View {
    let abbr: String
    let name: String
    let color: String
    let alt: String?
    let rank: Int?
    let score: Int
    let ball: Bool
    let dim: Bool

    var body: some View {
        HStack(spacing: 10) {
            Chip(abbr: abbr, color: color, alt: alt)
            HStack(spacing: 7) {
                HStack(spacing: 4) {
                    if let rank {
                        Text("\(rank)").font(SlateLook.bold(11)).foregroundStyle(SlateLook.muted)
                    }
                    Text(name).font(SlateLook.bold(17)).lineLimit(1)
                }
                if ball {
                    Image(systemName: "football.fill")
                        .font(.system(size: 10))
                        .foregroundStyle(SlateLook.muted)
                        .accessibilityLabel("has the ball")
                }
            }
            Spacer(minLength: 6)
            // 3.39.1: smaller, closer to the team name's size (it was 32)
            Text("\(score)")
                .font(SlateLook.num(24))
                .lineLimit(1)
                .frame(minWidth: 36, alignment: .trailing)
        }
        .frame(height: 26)
        .opacity(dim ? 0.5 : 1)
    }
}

private struct Pill: View {
    let text: String
    let icon: String
    let iconFirst: Bool
    var fill: Color = SlateLook.raise

    var body: some View {
        HStack(spacing: 7) {
            if iconFirst { Image(systemName: icon).font(.system(size: 11, weight: .bold)) }
            Text(text).font(SlateLook.num(15)).lineLimit(1)
            if !iconFirst { Image(systemName: icon).font(.system(size: 11, weight: .bold)) }
        }
        .foregroundStyle(SlateLook.ink)
        .padding(.horizontal, 14)
        .frame(height: 44)
        .background(Capsule().fill(fill))
    }
}

// Dynamic Island, expanded: each team's chip and big score beside the camera (home mirrored: score, then chip)
// a standout's line under a team's score in the expanded island: small, up to two lines, left out when ESPN has none
private struct IslandNote: View {
    let text: String?
    let align: HorizontalAlignment

    var body: some View {
        if let t = text, !t.isEmpty {
            Text(t)
                .font(SlateLook.semi(11))
                .foregroundStyle(SlateLook.muted)
                .multilineTextAlignment(align == .leading ? .leading : .trailing)
                .lineLimit(2)
                .minimumScaleFactor(0.8)
                .frame(maxWidth: 150, alignment: align == .leading ? .leading : .trailing)
        }
    }
}

// The expanded island's bottom (3.38.0): both teams' lines facing each other, then the last play (or the slate's one-liner
// on a build or game without one), then ESPN's win probability. Each row is left out when ESPN doesn't send it.
private struct IslandBottom: View {
    let s: SlateGameAttributes.ContentState

    var body: some View {
        let live = s.state == "in"
        let main = (live ? s.lp : nil).flatMap { $0.isEmpty ? nil : $0 } ?? s.line ?? ""
        VStack(alignment: .leading, spacing: 4) {
            if (s.at ?? "") != "" || (s.ht ?? "") != "" {
                HStack(spacing: 8) {
                    Text(s.at ?? "").frame(maxWidth: .infinity, alignment: .leading)
                    Text(s.ht ?? "").frame(maxWidth: .infinity, alignment: .trailing)
                }
                .font(SlateLook.num(11))
                .foregroundStyle(SlateLook.ink)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
            }
            if !main.isEmpty {
                Text(main)
                    .font(SlateLook.semi(13))
                    .foregroundStyle(live ? SlateLook.live : SlateLook.muted)
                    .lineLimit(2)
                    .minimumScaleFactor(0.85)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
            if live, let w = s.wp, !w.isEmpty {
                Text(w)
                    .font(SlateLook.semi(11))
                    .foregroundStyle(SlateLook.muted)
                    .lineLimit(1)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .padding(.horizontal, 4)
    }
}

private struct IslandTeam: View {
    let abbr: String
    let color: String
    let alt: String?
    let score: Int
    let chipFirst: Bool
    let dim: Bool

    var body: some View {
        HStack(spacing: 9) {
            if chipFirst { Chip(abbr: abbr, color: color, alt: alt, width: 40, height: 24) }
            Text("\(score)")
                .font(SlateLook.num(34))
                .foregroundStyle(SlateLook.ink)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
            if !chipFirst { Chip(abbr: abbr, color: color, alt: alt, width: 40, height: 24) }
        }
        .opacity(dim ? 0.5 : 1)
    }
}

// Dynamic Island, one game live ("Chips"): the away chip and score left of the camera, the home score and chip right of it.
// Where iOS gives the island less width (iPhone Duo's side column, iPhone in landscape, iPhone 18 Pro with two or more
// live), Apple asks for a view that fits a 28 pt circle on the leading side and an empty trailing side, which iOS hides:
// there it shows the split ring, the same as the minimal view.
private struct CompactSide: View {
    let a: SlateGameAttributes
    let s: SlateGameAttributes.ContentState
    let leading: Bool

    var body: some View {
        if #available(iOS 27.0, *) {
            NarrowAwareSide(a: a, s: s, leading: leading)
        } else {
            ChipsSide(a: a, s: s, leading: leading)
        }
    }
}

@available(iOS 27.0, *)
private struct NarrowAwareSide: View {
    @Environment(\.isDynamicIslandLimitedInWidth) private var narrow
    let a: SlateGameAttributes
    let s: SlateGameAttributes.ContentState
    let leading: Bool

    var body: some View {
        if !narrow {
            ChipsSide(a: a, s: s, leading: leading)
        } else if leading {
            MiniSide(abbr: a.awayAbbr, color: a.awayColor, alt: a.awayAlt, score: s.a, leading: true, showScore: s.state != "pre")
        } else {
            MiniSide(abbr: a.homeAbbr, color: a.homeColor, alt: a.homeAlt, score: s.h, leading: false, showScore: s.state != "pre")
        }
    }
}

// Where iOS gives the Dynamic Island less width (the folded iPhone Duo's side column, where the Island is a tall
// pill): 3.33.1, the small team chip with its score stacked under it (away on top) or over it (home below), so
// both scores sit by the camera and nothing is cut off at the pill's edges. Before kickoff (showScore false), just the chip.
struct MiniSide: View {
    let abbr: String
    let color: String
    let alt: String?
    let score: Int
    let leading: Bool
    var showScore: Bool = true

    var body: some View {
        VStack(spacing: 2) {
            if leading {
                Chip(abbr: abbr, color: color, alt: alt, width: 20, height: 13, size: 8, stripe: 1.5, radius: 2)
                if showScore { num }
            } else {
                if showScore { num }
                Chip(abbr: abbr, color: color, alt: alt, width: 20, height: 13, size: 8, stripe: 1.5, radius: 2)
            }
        }
        .frame(maxWidth: 22)
    }

    private var num: some View {
        Text("\(score)").font(SlateLook.num(12)).foregroundStyle(.white).lineLimit(1).minimumScaleFactor(0.6)
    }
}

// the smallest spot (another live notification shares the island): just the score, "7–10"
struct MiniScore: View {
    let a: Int
    let h: Int

    var body: some View {
        Text("\(a)–\(h)")
            .font(SlateLook.num(11))
            .foregroundStyle(.white)
            .lineLimit(1)
            .minimumScaleFactor(0.6)
    }
}

private struct ChipsSide: View {
    let a: SlateGameAttributes
    let s: SlateGameAttributes.ContentState
    let leading: Bool

    var body: some View {
        HStack(spacing: 5) {
            if leading {
                Chip(abbr: a.awayAbbr, color: a.awayColor, alt: a.awayAlt, width: 26, height: 16, size: 10, stripe: 2, radius: 3)
                if s.state != "pre" { Text("\(s.a)").font(SlateLook.num(15)).foregroundStyle(.white) }
            } else {
                // before kickoff (3.33.1): the start time in place of 0-0
                if s.state == "pre" { Text(s.detail).font(SlateLook.num(12)).foregroundStyle(.white).lineLimit(1).minimumScaleFactor(0.6) }
                else { Text("\(s.h)").font(SlateLook.num(15)).foregroundStyle(.white) }
                Chip(abbr: a.homeAbbr, color: a.homeColor, alt: a.homeAlt, width: 26, height: 16, size: 10, stripe: 2, radius: 3)
            }
        }
    }
}

// Dynamic Island, minimal (another game is live too): both scores in a ring, away's color on the left half, home's on the right
struct SplitRing: View {
    let away: Color
    let home: Color
    let a: Int
    let h: Int

    var body: some View {
        ZStack {
            Circle().trim(from: 0.5, to: 1).stroke(away, lineWidth: 2).rotationEffect(.degrees(-90))
            Circle().trim(from: 0, to: 0.5).stroke(home, lineWidth: 2).rotationEffect(.degrees(-90))
            HStack(spacing: 2) {
                Text("\(a)")
                Text("\(h)")
            }
            .font(SlateLook.num(10))
            .foregroundStyle(.white)
            .lineLimit(1)
            .minimumScaleFactor(0.6)
            .padding(.horizontal, 4)
        }
        .padding(1)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(a) to \(h)")
    }
}
