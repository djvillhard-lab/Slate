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
                        IslandTeam(abbr: a.awayAbbr, color: a.awayColor, alt: a.awayAlt, score: s.a, chipFirst: true, dim: SlateLook.lost(s, away: true), logo: a.awayLogo, ball: s.state == "in" && s.poss == "away")
                        IslandNote(text: s.ap, align: .leading)
                    }
                    .padding(.leading, 4)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    VStack(alignment: .trailing, spacing: 3) {
                        IslandTeam(abbr: a.homeAbbr, color: a.homeColor, alt: a.homeAlt, score: s.h, chipFirst: false, dim: SlateLook.lost(s, away: false), logo: a.homeLogo, ball: s.state == "in" && s.poss == "home")
                        IslandNote(text: s.hp, align: .trailing)
                    }
                    .padding(.trailing, 4)
                }
                DynamicIslandExpandedRegion(.center) {
                    VStack(spacing: 3) {
                        // 3.85.0: the same square-cornered clock tag as the Lock Screen card
                        ClockTag(text: SlateLook.clock(s), live: s.state == "in")
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
    var logo: String? = nil   // 3.67.0: the team's ESPN logo ("nba/bos.png"), when the app has saved it; else the chip

    @ViewBuilder
    var body: some View {
        if let img = SlateLogos.image(logo) {
            Image(uiImage: img)
                .resizable()
                .scaledToFit()
                .frame(width: width, height: height)
                .accessibilityLabel(Text(abbr))
        } else {
            chip
        }
    }

    private var chip: some View {
        let shape = RoundedRectangle(cornerRadius: radius, style: .continuous)
        return Text(abbr)
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
// 3.85.0 (DJ): the face-off card. Each team's logo big with its name under it, in a slanted panel of its color at
// its edge; the score big in the middle with the clock in a small live tag under it; then at most two lines:
// soccer's scorers under the side that scored, else the game's one standout and the slate's one-liner.
// Football adds a thin field bar (where the ball is, how far this drive has come) with the down beside it.
private struct LockCard: View {
    let a: SlateGameAttributes
    let s: SlateGameAttributes.ContentState

    var body: some View {
        let live = s.state == "in", pre = s.state == "pre"
        let ag = (s.ag ?? []).filter { !$0.isEmpty }, hg = (s.hg ?? []).filter { !$0.isEmpty }
        let goals = !pre && (!ag.isEmpty || !hg.isEmpty)
        let star: (String, String)? = [(a.awayAbbr, s.ap ?? ""), (a.homeAbbr, s.hp ?? ""), (s.ox ?? "", s.op ?? "")]
            .first { !$0.0.isEmpty && !$0.1.isEmpty }
        let pv = s.state == "post" ? "" : (s.pv ?? "")
        // the line under the standout: the slate's one-liner; alone, it's the note (two lines when there's room)
        let note = star == nil ? (pv.isEmpty ? (s.line ?? "") : pv) : ""
        let field = live && (s.poss == "away" || s.poss == "home") && s.yl != nil
        let down = live && (s.poss == "away" || s.poss == "home") ? BallLook.compact(s.sit ?? "") : ""
        ZStack(alignment: .top) {
            HStack(spacing: 0) {
                TeamPanel(color: a.awayColor, left: true)
                Spacer(minLength: 0)
                TeamPanel(color: a.homeColor, left: false)
            }
            VStack(spacing: 0) {
                HStack(spacing: 6) {
                    Text(a.league)
                        .font(SlateLook.semi(12))
                        .foregroundStyle(SlateLook.ink.opacity(0.85))
                    Spacer(minLength: 0)
                    if let tag = s.tag, !tag.isEmpty, s.state != "post" {
                        Text(tag)
                            .font(SlateLook.semi(12))
                            .foregroundStyle(SlateLook.ink)
                    }
                }
                .lineLimit(1)
                .frame(height: 16)

                HStack(spacing: 0) {
                    FaceTeam(name: a.away, abbr: a.awayAbbr, color: a.awayColor, alt: a.awayAlt, rank: a.awayRank, logo: a.awayLogo,
                             ball: live && s.poss == "away", dim: SlateLook.lost(s, away: true), left: true)
                    Spacer(minLength: 4)
                    VStack(spacing: 5) {
                        if pre {
                            Text(SlateLook.clock(s))
                                .font(SlateLook.num(26))
                                .lineLimit(1)
                                .minimumScaleFactor(0.6)
                            if let l = s.line, !l.isEmpty {
                                Text(l).font(SlateLook.semi(12)).foregroundStyle(SlateLook.muted).lineLimit(1)
                            }
                        } else {
                            HStack(spacing: 12) {
                                Text("\(s.a)").opacity(live && s.a < s.h ? 0.6 : 1)
                                Rectangle().fill(SlateLook.ink.opacity(0.25)).frame(width: 2, height: 22)
                                Text("\(s.h)").opacity(live && s.h < s.a ? 0.6 : 1)
                            }
                            .font(SlateLook.num(40))
                            .lineLimit(1)
                            .minimumScaleFactor(0.6)
                            ClockTag(text: SlateLook.clock(s), live: live)
                        }
                    }
                    .frame(maxWidth: .infinity)
                    Spacer(minLength: 4)
                    FaceTeam(name: a.home, abbr: a.homeAbbr, color: a.homeColor, alt: a.homeAlt, rank: a.homeRank, logo: a.homeLogo,
                             ball: live && s.poss == "home", dim: SlateLook.lost(s, away: false), left: false)
                }
                .frame(height: 76)

                if field || !down.isEmpty {
                    HStack(spacing: 8) {
                        if field {
                            FieldBar(away: a.awayColor, home: a.homeColor, ball: s.yl ?? 50, start: s.ds)
                        }
                        if !down.isEmpty {
                            Text(down)
                                .font(SlateLook.bold(12))
                                .lineLimit(1)
                                .minimumScaleFactor(0.8)
                                .fixedSize(horizontal: !field ? false : true, vertical: false)
                        }
                        if !field { Spacer(minLength: 0) }
                    }
                    .frame(height: 14)
                    .padding(.top, 2)
                }

                if goals {
                    HStack(alignment: .top, spacing: 12) {
                        VStack(alignment: .leading, spacing: 0) { ForEach(Array(ag.prefix(2).enumerated()), id: \.offset) { Text($0.element) } }
                            .frame(maxWidth: .infinity, alignment: .leading)
                        VStack(alignment: .trailing, spacing: 0) { ForEach(Array(hg.prefix(2).enumerated()), id: \.offset) { Text($0.element) } }
                            .frame(maxWidth: .infinity, alignment: .trailing)
                    }
                    .font(SlateLook.semi(13))
                    .foregroundStyle(live ? SlateLook.live : SlateLook.muted)
                    .lineLimit(1)
                    .minimumScaleFactor(0.75)
                    .padding(.horizontal, 6)
                    .padding(.top, 6)
                } else if star != nil || !note.isEmpty {
                    VStack(alignment: .leading, spacing: 2) {
                        if let st = star {
                            HStack(spacing: 7) {
                                Rectangle().fill(SlateLook.live).frame(width: 3, height: 13)
                                Text(st.0).font(SlateLook.bold(11)).foregroundStyle(SlateLook.muted)
                                Text(st.1)
                                    .font(SlateLook.semi(13))
                                    .foregroundStyle(live ? SlateLook.live : SlateLook.ink)
                                    .minimumScaleFactor(0.75)
                            }
                            .lineLimit(1)
                            if !pv.isEmpty {
                                Text(pv)
                                    .font(SlateLook.semi(12))
                                    .foregroundStyle(SlateLook.muted)
                                    .lineLimit(1)
                                    .minimumScaleFactor(0.85)
                            }
                        }
                        if !note.isEmpty {
                            Text(note)
                                .font(SlateLook.semi(13))
                                .foregroundStyle(live ? SlateLook.live : SlateLook.muted)
                                .lineLimit(field ? 1 : 2)
                                .minimumScaleFactor(0.85)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.top, 6)
                }
            }
            .padding(EdgeInsets(top: 10, leading: 14, bottom: 10, trailing: 14))
        }
        .foregroundStyle(SlateLook.ink)
    }
}

enum BallLook {
    // "1st & 10 at BAL 6" -> "1st & 10 · BAL 6" (3.75.1)
    static func compact(_ sit: String) -> String { sit.replacingOccurrences(of: " at ", with: " · ") }
}

// a team's slanted color panel at its edge of the card (3.85.0); its inner edge leans toward the middle
private struct SlantShape: Shape {
    let left: Bool
    func path(in r: CGRect) -> Path {
        var p = Path()
        if left {
            p.move(to: CGPoint(x: r.minX, y: r.minY)); p.addLine(to: CGPoint(x: r.maxX, y: r.minY))
            p.addLine(to: CGPoint(x: r.minX + r.width * 0.74, y: r.maxY)); p.addLine(to: CGPoint(x: r.minX, y: r.maxY))
        } else {
            p.move(to: CGPoint(x: r.minX, y: r.minY)); p.addLine(to: CGPoint(x: r.maxX, y: r.minY))
            p.addLine(to: CGPoint(x: r.maxX, y: r.maxY)); p.addLine(to: CGPoint(x: r.minX + r.width * 0.26, y: r.maxY))
        }
        p.closeSubpath()
        return p
    }
}

private struct TeamPanel: View {
    let color: String
    let left: Bool

    var body: some View {
        let c = Color(slateHex: color, fallback: SlateLook.raise)
        SlantShape(left: left)
            .fill(LinearGradient(colors: [c.opacity(0.62), c.opacity(0.3)], startPoint: left ? .leading : .trailing, endPoint: left ? .trailing : .leading))
            .frame(width: 132, height: 104)
    }
}

// a team on the face-off card: its logo (or chip) with the name under it, the football by the name when it has the ball
private struct FaceTeam: View {
    let name: String
    let abbr: String
    let color: String
    let alt: String?
    let rank: Int?
    let logo: String?
    let ball: Bool
    let dim: Bool
    let left: Bool

    var body: some View {
        let hasLogo = SlateLogos.image(logo) != nil
        VStack(spacing: 4) {
            Chip(abbr: abbr, color: color, alt: alt, width: hasLogo ? 40 : 44, height: hasLogo ? 40 : 26, size: 14, logo: logo)
                .frame(height: 40)
            HStack(spacing: 4) {
                if ball && !left { icon }
                if let rank { Text("\(rank)").font(SlateLook.bold(10)).foregroundStyle(SlateLook.ink.opacity(0.75)) }
                Text(name)
                    .font(SlateLook.bold(13))
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
                if ball && left { icon }
            }
            .shadow(color: .black.opacity(0.45), radius: 1, y: 1)
        }
        .frame(width: 92)
        .opacity(dim ? 0.5 : 1)
    }

    private var icon: some View {
        Image(systemName: "football.fill")
            .font(.system(size: 10))
            .foregroundStyle(SlateLook.ink)
            .accessibilityLabel("has the ball")
    }
}

// the clock under the score: a small square-cornered tag, red with a dot while live, plain after the final
struct ClockTag: View {
    let text: String
    let live: Bool
    var size: CGFloat = 13

    var body: some View {
        HStack(spacing: 5) {
            if live { Circle().fill(SlateLook.live).frame(width: 6, height: 6) }
            Text(text)
                .font(SlateLook.num(size))
                .foregroundStyle(live ? SlateLook.live : SlateLook.ink)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
        }
        .padding(.horizontal, 7)
        .frame(height: 20)
        .background(RoundedRectangle(cornerRadius: 4, style: .continuous).fill(live ? SlateLook.live.opacity(0.16) : SlateLook.raise))
    }
}

// football: the field from the away end zone (left) to the home one (right), the ball's spot, and this drive so far
private struct FieldBar: View {
    let away: String
    let home: String
    let ball: Int
    let start: Int?

    var body: some View {
        GeometryReader { g in
            let w = g.size.width, ez = w * 0.08, play = w - 2 * ez
            let x = { (yd: Int) -> CGFloat in ez + play * CGFloat(min(100, max(0, yd))) / 100 }
            ZStack(alignment: .leading) {
                RoundedRectangle(cornerRadius: 2).fill(SlateLook.ink.opacity(0.12)).frame(height: 4)
                Rectangle().fill(SlateLook.visible(away)).frame(width: ez, height: 4)
                Rectangle().fill(SlateLook.visible(home)).frame(width: ez, height: 4).offset(x: w - ez)
                if let st = start {
                    let lo = min(x(st), x(ball)), hi = max(x(st), x(ball))
                    Rectangle().fill(SlateLook.ink.opacity(0.45)).frame(width: max(0, hi - lo), height: 4).offset(x: lo)
                }
                Circle().fill(SlateLook.ink).frame(width: 10, height: 10)
                    .overlay(Circle().stroke(SlateLook.card, lineWidth: 2))
                    .offset(x: x(ball) - 5)
            }
            .frame(height: 10)
            .frame(maxHeight: .infinity)
        }
        .frame(height: 14)
        .accessibilityHidden(true)
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
        let lp = (live ? s.lp : nil).flatMap { $0.isEmpty ? nil : $0 }
        let pv = s.state == "post" ? nil : s.pv.flatMap { $0.isEmpty ? nil : $0 }
        // the last play, else the slate's preview line (3.58.0), else the slate's one-liner
        let main = lp ?? pv ?? s.line ?? ""
        let pvUnder = lp != nil && pv != nil
        // 3.85.0, soccer: each side's scorers under its own score, one line each
        let ag = (s.ag ?? []).joined(separator: ", "), hg = (s.hg ?? []).joined(separator: ", ")
        let goals = s.state != "pre" && (!ag.isEmpty || !hg.isEmpty)
        if goals {
            HStack(alignment: .top, spacing: 10) {
                Text(ag).frame(maxWidth: .infinity, alignment: .leading)
                Text(hg).frame(maxWidth: .infinity, alignment: .trailing)
            }
            .font(SlateLook.semi(12))
            .foregroundStyle(live ? SlateLook.live : SlateLook.muted)
            .lineLimit(1)
            .minimumScaleFactor(0.75)
            .padding(.horizontal, 4)
        } else {
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
                    .lineLimit(pvUnder ? 1 : 2)
                    .minimumScaleFactor(0.85)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
            if pvUnder, let t = pv {
                Text(t)
                    .font(SlateLook.semi(11))
                    .foregroundStyle(SlateLook.muted)
                    .lineLimit(1)
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
}

private struct IslandTeam: View {
    let abbr: String
    let color: String
    let alt: String?
    let score: Int
    let chipFirst: Bool
    let dim: Bool
    var logo: String? = nil
    var ball: Bool = false   // 3.75.1: football, this team has it: the icon on the score's inside edge, by the down

    var body: some View {
        HStack(spacing: 9) {
            if chipFirst { badge }
            if ball && !chipFirst { icon }
            Text("\(score)")
                .font(SlateLook.num(34))
                .foregroundStyle(SlateLook.ink)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
            if ball && chipFirst { icon }
            if !chipFirst { badge }
        }
        .opacity(dim ? 0.5 : 1)
    }

    // 3.85.0: the logo a little bigger, with a short bar of the team's color under it; the chip when there's no logo
    @ViewBuilder
    private var badge: some View {
        if SlateLogos.image(logo) != nil {
            VStack(spacing: 3) {
                Chip(abbr: abbr, color: color, alt: alt, width: 30, height: 30, logo: logo)
                RoundedRectangle(cornerRadius: 1).fill(SlateLook.visible(color)).frame(width: 22, height: 3)
            }
        } else {
            Chip(abbr: abbr, color: color, alt: alt, width: 40, height: 24, logo: logo)
        }
    }

    private var icon: some View {
        Image(systemName: "football.fill")
            .font(.system(size: 11))
            .foregroundStyle(SlateLook.ink)
            .accessibilityLabel("has the ball")
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
            MiniSide(abbr: a.awayAbbr, color: a.awayColor, alt: a.awayAlt, score: s.a, leading: true, showScore: s.state != "pre", logo: a.awayLogo)
        } else {
            MiniSide(abbr: a.homeAbbr, color: a.homeColor, alt: a.homeAlt, score: s.h, leading: false, showScore: s.state != "pre", logo: a.homeLogo)
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
    var logo: String? = nil

    var body: some View {
        VStack(spacing: 2) {
            if leading {
                Chip(abbr: abbr, color: color, alt: alt, width: 20, height: 13, size: 8, stripe: 1.5, radius: 2, logo: logo)
                if showScore { num }
            } else {
                if showScore { num }
                Chip(abbr: abbr, color: color, alt: alt, width: 20, height: 13, size: 8, stripe: 1.5, radius: 2, logo: logo)
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
                Chip(abbr: a.awayAbbr, color: a.awayColor, alt: a.awayAlt, width: SlateLogos.image(a.awayLogo) != nil ? 20 : 26, height: SlateLogos.image(a.awayLogo) != nil ? 20 : 16, size: 10, stripe: 2, radius: 3, logo: a.awayLogo)
                if s.state != "pre" { Text("\(s.a)").font(SlateLook.num(15)).foregroundStyle(.white) }
            } else {
                // before kickoff (3.33.1): the start time in place of 0-0
                if s.state == "pre" { Text(s.detail).font(SlateLook.num(12)).foregroundStyle(.white).lineLimit(1).minimumScaleFactor(0.6) }
                else { Text("\(s.h)").font(SlateLook.num(15)).foregroundStyle(.white) }
                Chip(abbr: a.homeAbbr, color: a.homeColor, alt: a.homeAlt, width: SlateLogos.image(a.homeLogo) != nil ? 20 : 26, height: SlateLogos.image(a.homeLogo) != nil ? 20 : 16, size: 10, stripe: 2, radius: 3, logo: a.homeLogo)
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
