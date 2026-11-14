import SwiftUI

// The page fills the screen. On iPhone Duo (while Settings > Phone is iPhone Duo), Slate's menu goes in the system's
// control strip as one button (Apple moves bottom toolbar items into the right-side bar there), and the page hides
// its own menu button. With Phone set to iPhone, the page shows its own menu, as on any iPhone.
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
                if let err = model.loadError {
                    OfflineView(message: err) { model.reload() }
                }
            }
            .toolbar(.hidden, for: .navigationBar)
            .toolbar {
                if model.strip {
                    // one button in the strip; tapping it opens Slate's pages above it
                    ToolbarItem(placement: .bottomBar) { SlateMenu(model: model) }
                }
            }
            .toolbar(model.strip ? .visible : .hidden, for: .bottomBar)
            .toolbarBackground(.hidden, for: .bottomBar)  // the buttons float over the page's own background
            .background {
                // how much room iOS's column takes on the right: the page keeps its buttons this far from the edge
                GeometryReader { proxy in
                    Color.clear
                        .onAppear { model.setStripInset(proxy.safeAreaInsets.trailing) }
                        .onChange(of: proxy.safeAreaInsets.trailing) { _, w in model.setStripInset(w) }
                }
            }
        }
        .preferredColorScheme(model.look == "light" ? .light : .dark)
        .onGeometryChange(for: CGSize.self) { $0.size } action: { _ in
            model.refreshStrip()
        }
        .onAppear { model.refreshStrip() }
    }
}

// The single menu button in iPhone Duo's strip. Tapping it opens Slate's pages as separate round buttons stacked
// just above it (drawn by the page, so they match its look); picking one, or tapping it again, closes them.
// It tells the page where it sits so the buttons line up over it.
private struct SlateMenu: View {
    @ObservedObject var model: WebModel

    var body: some View {
        Button {
            model.toggleMenu()
        } label: {
            Label(model.menuOpen ? "Close menu" : "Menu", systemImage: model.menuOpen ? "xmark" : "line.3.horizontal")
        }
        .onGeometryChange(for: CGRect.self) { $0.frame(in: .global) } action: { model.setMenuAnchor($0) }
        .accessibilityLabel(model.menuOpen ? "Close menu" : "Menu")
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
