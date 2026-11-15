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
        Destination(title: "Slate", symbol: "wand.and.stars", target: "lineup"),
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
                    FloatButton(symbol: d.symbol, label: d.title, on: model.activeTarget == d.target) {
                        model.go(d.target)
                        withAnimation(.snappy) { model.stripOpen = false }
                    }
                }
            } else if !model.back.isEmpty {
                FloatButton(symbol: model.back == "fwd" ? "chevron.right" : "chevron.left", label: model.back == "fwd" ? "Today" : "Back", on: false, tint: .accentColor) {
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
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Image(systemName: symbol)
                .symbolVariant(on ? .fill : .none)
                .font(.system(size: size >= 40 ? 20 : 17, weight: .medium))
                .foregroundStyle(on ? Color.accentColor : (tint ?? Color.primary))
                .frame(width: size, height: size)
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(label)
        .accessibilityAddTraits(on ? .isSelected : [])
    }
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
