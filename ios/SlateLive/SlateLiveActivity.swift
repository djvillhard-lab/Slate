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
    // 3.112.0: also on the Apple Watch's Smart Stack (the small size, WatchCard)
    var body: some WidgetConfiguration { Self.config().supplementalActivityFamilies([.small]) }

    static func config() -> ActivityConfiguration<SlateGameAttributes> {
        ActivityConfiguration(for: SlateGameAttributes.self) { context in
            GameLock(a: context.attributes, s: context.state)
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
                        // 3.85.0: the same square-cornered clock tag as the Lock Screen card; 3.113.0 (DJ): the Slate mark beside it
                        HStack(spacing: 4) {
                            SlateMark(size: 13)
                            ClockTag(text: SlateLook.clock(s), live: s.state == "in")
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

// the Lock Screen card, or on the Watch (the small size) the WatchCard
private struct GameLock: View {
    let a: SlateGameAttributes
    let s: SlateGameAttributes.ContentState

    var body: some View {
        if #available(iOS 18.0, *) {
            FamilyLock(a: a, s: s)
        } else {
            LockCard(a: a, s: s)
        }
    }
}

@available(iOS 18.0, *)
private struct FamilyLock: View {
    @Environment(\.activityFamily) private var family
    let a: SlateGameAttributes
    let s: SlateGameAttributes.ContentState

    var body: some View {
        switch family {
        case .small: WatchCard(a: a, s: s)
        default: LockCard(a: a, s: s)
        }
    }
}

// 3.112.0, the Apple Watch Smart Stack: both logos and scores with the clock between them, and under them your bet
// (with how it's doing) or the league
private struct WatchCard: View {
    let a: SlateGameAttributes
    let s: SlateGameAttributes.ContentState

    var body: some View {
        let pre = s.state == "pre", live = s.state == "in"
        VStack(spacing: 4) {
            HStack(spacing: 5) {
                Chip(abbr: a.awayAbbr, color: a.awayColor, alt: a.awayAlt, width: 22, height: 22, size: 9, stripe: 2, radius: 3, logo: a.awayLogo)
                if !pre { Text("\(s.a)").font(SlateLook.num(24)).foregroundStyle(SlateLook.lost(s, away: true) ? SlateLook.muted : SlateLook.ink) }
                Spacer(minLength: 2)
                Text(SlateLook.clock(s))
                    .font(SlateLook.num(13))
                    .foregroundStyle(live ? SlateLook.live : SlateLook.muted)
                    .lineLimit(1)
                    .minimumScaleFactor(0.6)
                Spacer(minLength: 2)
                if !pre { Text("\(s.h)").font(SlateLook.num(24)).foregroundStyle(SlateLook.lost(s, away: false) ? SlateLook.muted : SlateLook.ink) }
                Chip(abbr: a.homeAbbr, color: a.homeColor, alt: a.homeAlt, width: 22, height: 22, size: 9, stripe: 2, radius: 3, logo: a.homeLogo)
            }
            if let b = a.bet {
                let say = BetLook.say(b, s)
                HStack(spacing: 4) {
                    SlateMark(size: 12)
                    Text(say.isEmpty ? b.l : "\(b.l) · \(say)")
                        .font(SlateLook.semi(12))
                        .foregroundStyle(SlateLook.ink)
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                }
            } else {
                HStack(spacing: 4) {
                    SlateMark(size: 12)
                    Text(SlateLook.leagueOnly(a.league))
                        .font(SlateLook.semi(12))
                        .foregroundStyle(SlateLook.muted)
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                }
            }
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 6)
        .foregroundStyle(SlateLook.ink)
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
    // "Slate • CBB" -> "CBB": the mark stands in for the word (3.113.0)
    static func leagueOnly(_ l: String) -> String {
        l.hasPrefix("Slate • ") ? String(l.dropFirst("Slate • ".count)) : l
    }
    static let accent = Color(slateHex: "#45A85E")   // 3.113.0: the app's green (--accent), for the Slate mark
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
    // 3.101.0: the color a team's panel uses: its own, unless that's a gray or near-black (Vegas's steel gray, which
    // vanishes on the navy card) and its second color is more colorful
    static func panelHex(_ hex: String, _ alt: String?) -> String {
        func hsb(_ h: String) -> (CGFloat, CGFloat)? {
            var s: CGFloat = 0, b: CGFloat = 0, x: CGFloat = 0, a: CGFloat = 0
            let s0 = h.hasPrefix("#") ? String(h.dropFirst()) : h
            guard s0.count == 6, UInt32(s0, radix: 16) != nil,
                  UIColor(Color(slateHex: h, fallback: .gray)).getHue(&x, saturation: &s, brightness: &b, alpha: &a) else { return nil }
            return (s, b)
        }
        guard let p = hsb(hex) else { return alt ?? hex }
        if p.0 < 0.35 && p.1 < 0.4, let alt, let q = hsb(alt), q.0 > p.0 + 0.2, q.1 > 0.25 { return alt }
        return hex
    }
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
    // 3.128.0: iOS's clear and tinted Home Screen styles flatten every solid color to one tint, so a solid chip with
    // letters on it would be a blank block. There the logo keeps its own colors and the chip is a see-through tile.
    @Environment(\.widgetRenderingMode) var mode

    @ViewBuilder
    var body: some View {
        if let img = SlateLogos.image(logo) {
            Image(uiImage: img)
                .resizable()
                .widgetAccentedRenderingMode(.fullColor)
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
            .foregroundStyle(mode == .fullColor ? SlateLook.onChip(color) : Color.white)
            .lineLimit(1)
            .minimumScaleFactor(0.6)
            .padding(.horizontal, 2)
            .padding(.bottom, max(0, stripe - 1))
            .frame(width: width, height: height)
            .background {
                shape.fill(mode == .fullColor ? Color(slateHex: color, fallback: .gray) : Color.white.opacity(0.16))
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
        // 3.101.0 (DJ liked the Dynamic Island's look best): each team in a slanted pill of its color holding its
        // logo and its score, the name under it; between them the clock, then the league (or football's down) and
        // the slate's tag; under it all at most two lines, as before
        VStack(spacing: 0) {
            // 3.113.0 (DJ): the Slate axe-hammer in the top-left corner with the league, like the Board and the widget
            HStack(spacing: 4) {
                SlateMark(size: 12)
                Text(SlateLook.leagueOnly(a.league).uppercased())
                    .font(SlateLook.bold(10))
                    .foregroundStyle(SlateLook.muted)
                    .lineLimit(1)
                Spacer(minLength: 0)
            }
            .frame(height: 12)
            .padding(.bottom, 4)
            HStack(alignment: .top, spacing: 8) {
                PillSide(name: a.away, abbr: a.awayAbbr, color: a.awayColor, alt: a.awayAlt, rank: a.awayRank, logo: a.awayLogo,
                         score: pre ? nil : s.a, ball: live && s.poss == "away", dim: SlateLook.lost(s, away: true), trail: live && s.a < s.h, left: true)
                VStack(spacing: 4) {
                    if pre {
                        Text(SlateLook.clock(s))
                            .font(SlateLook.num(22))
                            .lineLimit(1)
                            .minimumScaleFactor(0.6)
                            .frame(height: 22)
                    } else {
                        ClockTag(text: SlateLook.clock(s), live: live)
                    }
                    // the league moved up beside the axe-hammer (3.113.0); football's down stays here. 3.120.2 (DJ): before the
                    // start the center is just the start (or "Starting") and the channel; the one-liner shows once, below
                    if !down.isEmpty {
                        Text(down)
                            .font(SlateLook.semi(12))
                            .foregroundStyle(SlateLook.ink)
                            .lineLimit(1)
                            .minimumScaleFactor(0.75)
                    }
                    let ch = (a.channel ?? "").trimmingCharacters(in: .whitespaces)
                    if pre && !ch.isEmpty {
                        Text(ch)
                            .font(SlateLook.semi(12))
                            .foregroundStyle(SlateLook.ink)
                            .lineLimit(1)
                            .minimumScaleFactor(0.75)
                    } else if let tag = s.tag, !tag.isEmpty, s.state != "post" {
                        Text(tag)
                            .font(SlateLook.semi(12))
                            .foregroundStyle(SlateLook.ink)
                            .lineLimit(1)
                            .minimumScaleFactor(0.75)
                    }
                }
                .frame(width: 104)
                .padding(.top, 4)
                PillSide(name: a.home, abbr: a.homeAbbr, color: a.homeColor, alt: a.homeAlt, rank: a.homeRank, logo: a.homeLogo,
                         score: pre ? nil : s.h, ball: live && s.poss == "home", dim: SlateLook.lost(s, away: false), trail: live && s.h < s.a, left: false)
            }


                if field {
                    FieldBar(away: SlateLook.panelHex(a.awayColor, a.awayAlt), home: SlateLook.panelHex(a.homeColor, a.homeAlt), ball: s.yl ?? 50, start: s.ds)
                        .padding(.top, 6)
                        .padding(.horizontal, 2)
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
                    if let b = a.bet { BetLine(bet: b, s: s).padding(.horizontal, 6).padding(.top, 2) }
                } else if star != nil || !note.isEmpty || a.bet != nil {
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
                            // 3.112.0: your bet takes the second line, in place of the slate's one-liner
                            if let b = a.bet {
                                BetLine(bet: b, s: s)
                            } else if !pv.isEmpty {
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
                                .lineLimit(field || a.bet != nil ? 1 : 2)
                                .minimumScaleFactor(0.85)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                        if star == nil, let b = a.bet { BetLine(bet: b, s: s) }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.top, 6)
                }
        }
        .padding(EdgeInsets(top: 8, leading: 14, bottom: 12, trailing: 14))
        .foregroundStyle(SlateLook.ink)
    }
}

// 3.112.0: your bet on the live card, "YOUR BET  DUKE -3.5 · covering by 2.5", worked out from the score the same
// way My bets does it (a prop shows just its label: the card has no player stats to check it against)
struct BetLine: View {
    let bet: SlateBet
    let s: SlateGameAttributes.ContentState

    var body: some View {
        let say = BetLook.say(bet, s)
        HStack(spacing: 7) {
            Text("YOUR BET").font(SlateLook.bold(11)).foregroundStyle(SlateLook.muted)
            Text(bet.l).font(SlateLook.semi(13)).foregroundStyle(SlateLook.ink)
            if !say.isEmpty {
                Text(say)
                    .font(SlateLook.semi(13))
                    .foregroundStyle(s.state == "in" ? SlateLook.live : SlateLook.ink)
            }
        }
        .lineLimit(1)
        .minimumScaleFactor(0.75)
        .accessibilityElement(children: .combine)
    }
}

enum BetLook {
    static func num(_ n: Double) -> String {
        let r = (n * 10).rounded() / 10
        return r == r.rounded() ? String(Int(r)) : String(r)
    }
    // "covering by 2.5", "short by 1", "up 4", "needs 6 more", "✓ Won", "✗ Lost", "Push"; "" before it starts
    static func say(_ b: SlateBet, _ s: SlateGameAttributes.ContentState) -> String {
        let live = s.state == "in", fin = s.state == "post"
        guard live || fin, b.k != "prop" else { return "" }
        let a = Double(s.a), h = Double(s.h)
        let mine = b.sd == "home" ? h - a : a - h
        switch b.k {
        case "spread":
            guard let ln = b.ln else { return "" }
            let m = mine + ln
            if fin { return m > 0 ? "✓ Won" : m < 0 ? "✗ Lost" : "Push" }
            return m > 0 ? "covering by \(num(m))" : m < 0 ? "short by \(num(-m))" : "right on the line"
        case "ml":
            if b.sd == "draw" {
                if fin { return a == h ? "✓ Won" : "✗ Lost" }
                return a == h ? "tied" : "not tied"
            }
            if fin { return mine > 0 ? "✓ Won" : mine < 0 || b.d3 == true ? "✗ Lost" : "Push" }
            return mine > 0 ? "up \(num(mine))" : mine < 0 ? "down \(num(-mine))" : "tied"
        case "total":
            guard let ln = b.ln else { return "" }
            let t = a + h, over = b.ou != "under"
            if t > ln { return over ? "✓ Won" : "✗ Lost" }
            if fin { return t < ln ? (over ? "✗ Lost" : "✓ Won") : "Push" }
            if over { return "\(num(t)) so far, needs \(num((ln - t).rounded(.down) + 1)) more" }
            let room = (ln - t).rounded(.up) - 1
            return room > 0 ? "\(num(t)) so far, room for \(num(room)) more" : "\(num(t)) so far, right at the line"
        default:
            return ""
        }
    }
}

enum BallLook {
    // "1st & 10 at BAL 6" -> "1st & 10 · BAL 6" (3.75.1)
    static func compact(_ sit: String) -> String { sit.replacingOccurrences(of: " at ", with: " · ") }
}

// a team's slanted color panel at its edge of the card (3.85.0). 3.120.1 (DJ: the slants should match): both inner
// edges lean the same way, like the widget's and the Board's pills (LeanShape), instead of mirroring each other
struct SlantShape: Shape {
    let left: Bool
    var inset: CGFloat? = nil   // 3.101.0: how far the inner edge leans in at the bottom, in points (else a quarter of the width)
    func path(in r: CGRect) -> Path {
        var p = Path()
        let d = inset ?? r.width * 0.26
        if left {
            p.move(to: CGPoint(x: r.minX, y: r.minY)); p.addLine(to: CGPoint(x: r.maxX, y: r.minY))
            p.addLine(to: CGPoint(x: r.maxX - d, y: r.maxY)); p.addLine(to: CGPoint(x: r.minX, y: r.maxY))
        } else {
            p.move(to: CGPoint(x: r.minX + d, y: r.minY)); p.addLine(to: CGPoint(x: r.maxX, y: r.minY))
            p.addLine(to: CGPoint(x: r.maxX, y: r.maxY)); p.addLine(to: CGPoint(x: r.minX, y: r.maxY))
        }
        p.closeSubpath()
        return p
    }
}

// 3.101.0 (DJ): a third of the card wide, whatever the screen (the unfolded Duo's card is much wider), leaning in
// only 16 points so the team's name sits inside it; a gray or near-black team color gives way to its second color
struct TeamPanel: View {
    let color: String
    var alt: String? = nil
    let left: Bool
    var height: CGFloat = 104

    var body: some View {
        let c = Color(slateHex: SlateLook.panelHex(color, alt), fallback: SlateLook.raise)
        SlantShape(left: left, inset: 16)
            .fill(LinearGradient(colors: [c.opacity(0.62), c.opacity(0.3)], startPoint: left ? .leading : .trailing, endPoint: left ? .trailing : .leading))
            .frame(maxWidth: .infinity)
            .frame(height: height)
    }
}

// 3.101.0 (DJ): a team's color filling a whole area with the slanted inner edge (the Dynamic Island's team halves),
// bright at the outside edge and fading toward the middle; left: true for the away side
struct TeamWash: View {
    let color: String
    let left: Bool

    var body: some View {
        let c = Color(slateHex: color, fallback: SlateLook.raise)
        SlantShape(left: left, inset: 12)   // 3.120.1: a fixed lean, so every card's slants line up
            .fill(LinearGradient(colors: [c.opacity(0.62), c.opacity(0.3)], startPoint: left ? .leading : .trailing, endPoint: left ? .trailing : .leading))
    }
}

// 3.101.0: the dark band behind a Board tile's score, a little wider at the bottom like the gap between the card's panels
struct BandShape: Shape {
    var spread: CGFloat = 8
    func path(in r: CGRect) -> Path {
        var p = Path()
        p.move(to: CGPoint(x: r.minX + spread, y: r.minY)); p.addLine(to: CGPoint(x: r.maxX - spread, y: r.minY))
        p.addLine(to: CGPoint(x: r.maxX, y: r.maxY)); p.addLine(to: CGPoint(x: r.minX, y: r.maxY))
        p.closeSubpath()
        return p
    }
}

// a team on the face-off card: its logo (or chip) with the name under it, the football by the name when it has the ball
// 3.101.0: one team on the Lock Screen card: a slanted pill of its color with its logo and big score (the score on
// the inside, toward the clock), the football by the score when it has the ball, the team's name under the pill
private struct PillSide: View {
    let name: String
    let abbr: String
    let color: String
    let alt: String?
    let rank: Int?
    let logo: String?
    let score: Int?
    let ball: Bool
    let dim: Bool
    let trail: Bool
    let left: Bool

    var body: some View {
        let hasLogo = SlateLogos.image(logo) != nil
        VStack(alignment: left ? .leading : .trailing, spacing: 5) {
            HStack(spacing: 8) {
                if !left {
                    scoreView
                    if ball { icon }
                }
                Chip(abbr: abbr, color: color, alt: alt, width: hasLogo ? 32 : 40, height: hasLogo ? 32 : 24, size: 13, logo: logo)
                if left {
                    if ball { icon }
                    scoreView
                }
            }
            .padding(.leading, left ? 10 : 20)
            .padding(.trailing, left ? 20 : 10)
            .frame(maxWidth: .infinity, alignment: left ? .leading : .trailing)
            .frame(height: 48)
            .background(TeamWash(color: SlateLook.panelHex(color, alt), left: left).clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous)))
            HStack(spacing: 4) {
                if let rank { Text("\(rank)").font(SlateLook.bold(10)).foregroundStyle(SlateLook.muted) }
                Text(name)
                    .font(SlateLook.bold(13))
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
            }
            .padding(.horizontal, 4)
        }
        .frame(maxWidth: .infinity)
        .opacity(dim ? 0.5 : 1)
    }

    @ViewBuilder
    private var scoreView: some View {
        if let score {
            Text("\(score)")
                .font(SlateLook.num(34))
                .opacity(trail ? 0.6 : 1)
                .lineLimit(1)
                .minimumScaleFactor(0.6)
        }
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
    var height: CGFloat = 20
    var fill: Color = SlateLook.raise   // the tag's color after the final
    @Environment(\.widgetRenderingMode) var mode   // 3.128.0: see-through in the clear and tinted styles

    var body: some View {
        HStack(spacing: 5) {
            if live { Circle().fill(SlateLook.live).frame(width: 6, height: 6) }
            Text(text)
                .font(SlateLook.num(size))
                .foregroundStyle(live ? SlateLook.live : SlateLook.ink)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
        }
        .padding(.horizontal, height < 20 ? 5 : 7)
        .frame(height: height)
        .background(RoundedRectangle(cornerRadius: 4, style: .continuous).fill(live ? SlateLook.live.opacity(0.16) : (mode == .fullColor ? fill : Color.white.opacity(0.14))))
        .widgetAccentable(live)
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
        // 3.101.0 (DJ): the team's color behind its whole side, logo and score, with the slant toward the camera
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .background(TeamWash(color: SlateLook.panelHex(color, alt), left: chipFirst).clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous)))
        .opacity(dim ? 0.5 : 1)
    }

    // the logo a little bigger (3.85.0); the chip when there's no logo
    @ViewBuilder
    private var badge: some View {
        if SlateLogos.image(logo) != nil {
            Chip(abbr: abbr, color: color, alt: alt, width: 30, height: 30, logo: logo)
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
                // 3.113.0 (DJ): before the start, with no score to show yet, the Slate mark leads the island
                if s.state == "pre" { SlateMark(size: 14) }
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
