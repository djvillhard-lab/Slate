import SwiftUI

// The page fills the screen. The app draws Slate's menu itself as one glass capsule (Back, the menu button, the pages):
// on the folded iPhone Duo centered in iOS's side column, elsewhere floating bottom right (3.31.0).
// On a regular iPhone the page looks and works exactly like the Home Screen app.
struct RootView: View {
    @ObservedObject private var model = WebModel.shared

    var body: some View {
        NavigationStack {
            ZStack {
                Color.slateBackground(model.look).ignoresSafeArea()
                // the page always runs edge to edge, under the strip too (like Sleeper); it keeps its buttons
                // clear of the strip using the width we pass in (setInset)
                SlateWebView(model: model)
                    .ignoresSafeArea(.container, edges: .all)
                    .ignoresSafeArea(.keyboard)
                if model.float || model.strip {
                    // one glass capsule: Back, the menu button, and the pages when it's open (3.31.0). With no side column
                    // (open and upright, or a regular iPhone) it floats bottom right; on the folded Duo the app draws it
                    // itself, centered in iOS's side column, so the pages always line up with the menu button
                    FloatMenu(model: model)
                        .padding(.trailing, model.strip ? max(2, (model.edgeInsets.trailing - 52) / 2) : 12 + model.edgeInsets.trailing)
                        .padding(.bottom, max(12, model.edgeInsets.bottom))
                        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomTrailing)
                        .ignoresSafeArea()
                }
                if let err = model.loadError {
                    OfflineView(message: err) { model.reload() }
                }
            }
            .toolbar(.hidden, for: .navigationBar)
            .toolbar(.hidden, for: .bottomBar)  // the app draws its own menu everywhere (3.31.0)
            .background {
                // how much room iOS's column takes on the right: the page keeps its buttons this far from the edge
                GeometryReader { proxy in
                    Color.clear
                        .onAppear { model.edgeInsets = proxy.safeAreaInsets; model.setStripInset(proxy.safeAreaInsets.trailing) }
                        .onChange(of: proxy.safeAreaInsets) { _, e in model.edgeInsets = e; model.setStripInset(e.trailing) }
                }
            }
        }
        .preferredColorScheme(model.look == "light" ? .light : .dark)
        .onGeometryChange(for: CGSize.self) { $0.size } action: { _ in
            model.refreshStrip()
            // after a turn or an unfold, once the page has its new size
            Task { @MainActor in try? await Task.sleep(for: .milliseconds(400)); model.sendFold() }
        }
        .onAppear { model.refreshStrip() }
    }
}

// Slate's pages, in the page's own menu order
private struct Destination: Identifiable {
    let title: String, symbol: String, target: String
    var id: String { target }
    static let all = [
        Destination(title: "Settings", symbol: "gearshape", target: "settings"),
        Destination(title: "News", symbol: "newspaper", target: "news"),
        Destination(title: "On TV", symbol: "tv", target: "tv"),
        Destination(title: "Teams", symbol: "tshirt", target: "teams"),
        Destination(title: "Box Office", symbol: "ticket", target: "moments"),
        Destination(title: "All games", symbol: "list.bullet.rectangle", target: "games"),
        Destination(title: "Slate", symbol: "slate.axe", target: "lineup"),
    ]
}

// The strip's menu, drawn by the app where iOS has no side column: one glass capsule at the bottom right holding
// Back (when needed) and the menu button; tapping the menu grows it into the page buttons, like the strip does.
private struct FloatMenu: View {
    @ObservedObject var model: WebModel

    var body: some View {
        VStack(spacing: 2) {
            if model.stripOpen {
                ForEach(Destination.all) { d in
                    FloatButton(symbol: d.symbol, label: d.title, on: model.activeTarget == d.target, look: model.look) {
                        model.go(d.target)
                        withAnimation(.snappy) { model.stripOpen = false }
                    }
                }
            } else if !model.back.isEmpty {
                FloatButton(symbol: model.back == "fwd" ? "chevron.right" : "chevron.left", label: model.back == "fwd" ? "Today" : "Back", on: false, tint: model.look == "light" ? Color.slatePaperAccent : Color.accentColor) {
                    model.goBack()
                }
            }
            FloatButton(symbol: model.stripOpen ? "xmark" : "line.3.horizontal", label: model.stripOpen ? "Close menu" : "Menu", on: false) {
                withAnimation(.snappy) { model.stripOpen.toggle() }
            }
        }
        .padding(4)
        .modifier(GlassCapsule())
        .animation(.snappy, value: model.stripOpen)
        .animation(.snappy, value: model.back)
    }
}

private struct FloatButton: View {
    let symbol: String
    let label: String
    let on: Bool
    var tint: Color? = nil
    var size: CGFloat = 44
    var look: String = "dark"
    let action: () -> Void

    var body: some View {
        // the page you're on: green on a soft green disc on the dark themes; on Sunday Paper white on a solid dark green disc,
        // because green on cream was too faint to see (build 40)
        let light = look == "light"
        Button(action: action) {
            Group {
                if symbol == "slate.axe" {
                    SlateAxeIcon(filled: true).frame(width: 26, height: 26)  // the head is always solid (build 42, DJ)
                } else {
                    Image(systemName: symbol)
                        .symbolVariant(on ? .fill : .none)
                        .font(.system(size: size >= 40 ? 20 : 17, weight: .medium))
                }
            }
            .foregroundStyle(on ? (light ? Color.white : Color.accentColor) : (tint ?? Color.primary))
            .frame(width: size, height: size)
            .background {
                if on { Circle().fill(light ? Color.slatePaperAccent : Color.accentColor.opacity(0.18)).padding(3) }
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(label)
        .accessibilityAddTraits(on ? .isSelected : [])
    }
}

// Slate's own menu icon (build 40): the Slate logo, a hammer with an axe blade on one side, tilted mid-swing, with a
// glint off the blade. The head is always solid, on every page. Drawn on a 24-point grid,
// the same shape as the web page's logo (src/body.html) and the Home Screen icon (icon.svg).
private struct SlateAxeIcon: View {
    let filled: Bool

    var body: some View {
        Canvas { ctx, size in
            let s = min(size.width, size.height) / 24
            // the grid, scaled to the icon and centered
            let fit = CGAffineTransform(translationX: -12, y: -12)
                .concatenating(CGAffineTransform(scaleX: s, y: s))
                .concatenating(CGAffineTransform(translationX: size.width / 2, y: size.height / 2))
            // the tool leans 35 degrees and sits a little left, leaving room for the glint
            let lean = CGAffineTransform(translationX: -12, y: -12)
                .concatenating(CGAffineTransform(rotationAngle: 35 * .pi / 180))
                .concatenating(CGAffineTransform(translationX: 12 - 1.8, y: 12 + 0.3))
                .concatenating(fit)
            // the head is drawn a little smaller, around the spot where the handle goes through it
            let small = CGAffineTransform(translationX: -11, y: -7.4)
                .concatenating(CGAffineTransform(scaleX: 0.88, y: 0.88))
                .concatenating(CGAffineTransform(translationX: 11, y: 7.4))
                .concatenating(lean)

            var handle = Path()
            handle.move(to: CGPoint(x: 11, y: 3.9))
            handle.addLine(to: CGPoint(x: 11, y: 21.3))
            var grip = Path()
            grip.move(to: CGPoint(x: 9.7, y: 18.3))
            grip.addLine(to: CGPoint(x: 12.3, y: 18.3))

            var head = Path()
            head.move(to: CGPoint(x: 6.8, y: 5.6))          // the hammer face, on the left
            head.addLine(to: CGPoint(x: 9.2, y: 5.6))
            head.addLine(to: CGPoint(x: 9.2, y: 6))
            head.addLine(to: CGPoint(x: 13, y: 6))
            head.addLine(to: CGPoint(x: 17.8, y: 4.3))       // the axe blade, on the right
            head.addQuadCurve(to: CGPoint(x: 17.8, y: 10.5), control: CGPoint(x: 19.5, y: 7.4))
            head.addLine(to: CGPoint(x: 13, y: 8.8))
            head.addLine(to: CGPoint(x: 9.2, y: 8.8))
            head.addLine(to: CGPoint(x: 9.2, y: 9.2))
            head.addLine(to: CGPoint(x: 6.8, y: 9.2))
            head.addQuadCurve(to: CGPoint(x: 6, y: 8.4), control: CGPoint(x: 6, y: 9.2))
            head.addLine(to: CGPoint(x: 6, y: 6.4))
            head.addQuadCurve(to: CGPoint(x: 6.8, y: 5.6), control: CGPoint(x: 6, y: 5.6))
            head.closeSubpath()

            // the handle is a lighter tone than the head; it shows above the head and through the outline
            var soft = ctx
            soft.opacity = 0.55
            soft.stroke(handle.applying(lean), with: .foreground, style: StrokeStyle(lineWidth: 2.2 * s, lineCap: .round))
            ctx.stroke(grip.applying(lean), with: .foreground, style: StrokeStyle(lineWidth: 1.7 * s, lineCap: .round))
            if filled { ctx.fill(head.applying(small), with: .foreground) }
            ctx.stroke(head.applying(small), with: .foreground, style: StrokeStyle(lineWidth: 2.1 * 0.88 * s, lineCap: .round, lineJoin: .round))

            // the glint: a four-point sparkle off the blade's tip and a smaller one beside it
            ctx.fill(Self.sparkle(x: 21, y: 6, arm: 2.4, waist: 0.62).applying(fit), with: .foreground)
            var faint = ctx
            faint.opacity = 0.8
            faint.fill(Self.sparkle(x: 17.3, y: 3.5, arm: 1.2, waist: 0.3).applying(fit), with: .foreground)
        }
        .accessibilityHidden(true)
    }

    // a four-point star centered on (x, y): `arm` to each tip, `waist` to each inner corner
    private static func sparkle(x: CGFloat, y: CGFloat, arm: CGFloat, waist: CGFloat) -> Path {
        var p = Path()
        p.move(to: CGPoint(x: x, y: y - arm))
        p.addLine(to: CGPoint(x: x + waist, y: y - waist))
        p.addLine(to: CGPoint(x: x + arm, y: y))
        p.addLine(to: CGPoint(x: x + waist, y: y + waist))
        p.addLine(to: CGPoint(x: x, y: y + arm))
        p.addLine(to: CGPoint(x: x - waist, y: y + waist))
        p.addLine(to: CGPoint(x: x - arm, y: y))
        p.addLine(to: CGPoint(x: x - waist, y: y - waist))
        p.closeSubpath()
        return p
    }
}

private extension Color {
    static let slatePaperAccent = Color(red: 0, green: 0x48 / 255, blue: 0x28 / 255)  // Sunday Paper's dark green, as on its Board button
}

// Apple's glass where the phone has it (iOS 26 and later), a frosted capsule before that
private struct GlassCapsule: ViewModifier {
    func body(content: Content) -> some View {
        if #available(iOS 26.0, *) {
            content.glassEffect(.regular.interactive(), in: .capsule)
        } else {
            content
                .background(.ultraThinMaterial, in: Capsule())
                .overlay(Capsule().strokeBorder(Color.white.opacity(0.12)))
                .shadow(color: .black.opacity(0.25), radius: 12, y: 6)
        }
    }
}

private struct OfflineView: View {
    let message: String
    let retry: () -> Void

    var body: some View {
        VStack(spacing: 14) {
            Image(systemName: "wifi.exclamationmark").font(.system(size: 34, weight: .semibold))
            Text("Can't reach Slate").font(.title3.weight(.bold))
            Text(message).font(.subheadline).foregroundStyle(.secondary).multilineTextAlignment(.center)
            Button("Try again", action: retry).buttonStyle(.borderedProminent)
        }
        .padding(28)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(.background)
    }
}

extension Color {
    // the page's own background colors, so there's no flash around the edges
    static func slateBackground(_ look: String) -> Color {
        switch look {
        case "light": return Color(red: 0xF2 / 255, green: 0xF4 / 255, blue: 0xF7 / 255)
        case "black": return .black
        default: return Color(red: 0x12 / 255, green: 0x18 / 255, blue: 0x21 / 255)
        }
    }
}
