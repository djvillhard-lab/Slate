import SwiftUI

// 3.120.0: the Watch app's screens. TonightList: the slate, live first, two pills per game. GameView: one game big.
struct TonightList: View {
    @EnvironmentObject var store: WatchStore

    var body: some View {
        let list = WatchLook.next(store.data, at: store.now, count: 12)
        ScrollView {
            VStack(spacing: 9) {
                if list.isEmpty {
                    Text(store.data == nil ? "Open Slate on your iPhone to load tonight's games." : "No more games on tonight's slate.")
                        .font(WatchLook.semi(13))
                        .foregroundStyle(WatchLook.muted)
                        .multilineTextAlignment(.center)
                        .padding(.top, 20)
                }
                ForEach(list) { g in
                    NavigationLink(value: g.id) { WatchTile(g: g, data: store.data, now: store.now) }
                        .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, 2)
        }
        .navigationDestination(for: String.self) { id in GameView(id: id) }
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                HStack(spacing: 4) {
                    SlateMark(size: 13)
                    Text("Tonight").font(WatchLook.bold(15))
                }
            }
        }
    }
}

// two slanted team-color pills (logo and score, or the abbreviation before the start), the clock or time under them
struct WatchTile: View {
    let g: WatchGame
    let data: WatchTonight?
    let now: Date
    var big = false

    var body: some View {
        let score = WatchLook.showScore(g, data, now), live = g.s == "in" && score
        VStack(spacing: 3) {
            HStack(spacing: 2) {
                pill(abbr: g.aa, color: g.ac, logo: g.al, score: score ? g.a : nil, other: g.h, left: true)
                pill(abbr: g.ha, color: g.hc, logo: g.hl, score: score ? g.h : nil, other: g.a, left: false)
            }
            .frame(height: big ? 46 : 34)
            let st = WatchLook.status(g, data, now)
            if live || st == "Live" {
                HStack(spacing: 3) {
                    Circle().fill(WatchLook.liveDot).frame(width: 4, height: 4)
                    Text(st).font(WatchLook.num(big ? 12 : 11)).foregroundStyle(WatchLook.live)
                }
                .padding(.horizontal, 5)
                .frame(height: big ? 16 : 14)
                .background(RoundedRectangle(cornerRadius: 3).fill(WatchLook.liveDot.opacity(0.18)))
            } else if g.s == "post" {
                Text(st).font(WatchLook.num(11))
                    .padding(.horizontal, 5).frame(height: 14)
                    .background(RoundedRectangle(cornerRadius: 3).fill(WatchLook.raise))
            } else {
                Text([st, g.tv ?? ""].filter { !$0.isEmpty }.joined(separator: " · "))
                    .font(WatchLook.semi(11)).foregroundStyle(WatchLook.muted).lineLimit(1)
            }
        }
    }

    private func pill(abbr: String, color: String, logo: String?, score: Int?, other: Int, left: Bool) -> some View {
        let c = Color(watchHex: color, fallback: WatchLook.raise)
        let behind = score.map { $0 < other } ?? false
        return HStack(spacing: 4) {
            if left { badge(logo) }
            if let score {
                Text("\(score)").font(WatchLook.num(big ? 28 : 20)).opacity(behind ? 0.6 : 1).lineLimit(1).minimumScaleFactor(0.6)
            } else {
                Text(abbr).font(WatchLook.bold(10)).lineLimit(1).minimumScaleFactor(0.6)
            }
            if !left { badge(logo) }
        }
        .padding(left ? EdgeInsets(top: 0, leading: 5, bottom: 0, trailing: 9) : EdgeInsets(top: 0, leading: 9, bottom: 0, trailing: 5))
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: left ? .leading : .trailing)
        .background(WatchLean(left: left).fill(LinearGradient(colors: [c.opacity(0.62), c.opacity(0.3)], startPoint: left ? .leading : .trailing, endPoint: left ? .trailing : .leading)))
        .clipShape(RoundedRectangle(cornerRadius: 5, style: .continuous))
    }

    @ViewBuilder private func badge(_ logo: String?) -> some View {
        let s: CGFloat = big ? 26 : 20
        if let u = WatchLook.logoURL(logo) {
            AsyncImage(url: u) { im in im.resizable().scaledToFit() } placeholder: { Color.clear }
                .frame(width: s, height: s)
        }
    }
}

// the pills' inner edges lean the same 7 points, so the slants line up (the live notifications use 10)
struct WatchLean: Shape {
    let left: Bool
    func path(in r: CGRect) -> Path {
        var p = Path(), k: CGFloat = 7
        if left {
            p.move(to: CGPoint(x: r.minX, y: r.minY)); p.addLine(to: CGPoint(x: r.maxX, y: r.minY))
            p.addLine(to: CGPoint(x: r.maxX - k, y: r.maxY)); p.addLine(to: CGPoint(x: r.minX, y: r.maxY))
        } else {
            p.move(to: CGPoint(x: r.minX + k, y: r.minY)); p.addLine(to: CGPoint(x: r.maxX, y: r.minY))
            p.addLine(to: CGPoint(x: r.maxX, y: r.maxY)); p.addLine(to: CGPoint(x: r.minX, y: r.maxY))
        }
        p.closeSubpath()
        return p
    }
}

struct GameView: View {
    @EnvironmentObject var store: WatchStore
    let id: String

    var body: some View {
        ScrollView {
            if let g = store.data?.games.first(where: { $0.id == id }) {
                VStack(alignment: .leading, spacing: 7) {
                    HStack(spacing: 4) {
                        SlateMark(size: 12)
                        Text(g.lg ?? "").font(WatchLook.bold(11)).foregroundStyle(WatchLook.muted)
                    }
                    WatchTile(g: g, data: store.data, now: store.now, big: true)
                    if let st = g.st, !st.isEmpty, g.s != "pre" {
                        HStack(spacing: 5) {
                            Rectangle().fill(WatchLook.liveDot).frame(width: 2, height: 11)
                            Text(st).font(WatchLook.semi(11)).foregroundStyle(g.s == "in" ? WatchLook.live : WatchLook.ink).lineLimit(2)
                        }
                    }
                    if let b = g.bl, !b.isEmpty {
                        (Text("YOUR BET  ").font(WatchLook.bold(9)).foregroundStyle(WatchLook.muted) + Text(b).font(WatchLook.semi(11)))
                    }
                    if let ln = g.ln, !ln.isEmpty {
                        Text(ln).font(WatchLook.semi(10)).foregroundStyle(WatchLook.muted)
                    }
                }
            } else {
                Text("This game is no longer on tonight's slate.").font(WatchLook.semi(12)).foregroundStyle(WatchLook.muted)
            }
        }
    }
}
