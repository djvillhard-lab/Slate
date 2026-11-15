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
                    // the strip shows Back (when needed) above one menu button; tapping the menu opens Slate's pages as strip buttons right above it
                    // (top to bottom: On TV, Teams, Box Office, All games, Slate). Picking one closes them again.
                    ToolbarItemGroup(placement: .bottomBar) {
                        if model.stripOpen {
                            ForEach(Destination.all) { d in
                                StripButton(dest: d, model: model)
                            }
                        } else if !model.back.isEmpty {
                            // Back, right above the menu button, only when the page has somewhere to go back to
                            // (pointing right on a past day's slate: forward to today). Hidden while the menu is open.
                            Button {
                                model.goBack()
                            } label: {
                                Label(model.back == "fwd" ? "Today" : "Back", systemImage: model.back == "fwd" ? "chevron.right" : "chevron.left")
                            }
                            .tint(Color.accentColor)
                        }
                        Button {
                            withAnimation(.snappy) { model.stripOpen.toggle() }
                        } label: {
                            Label(model.stripOpen ? "Close menu" : "Menu", systemImage: model.stripOpen ? "xmark" : "line.3.horizontal")
                        }
                    }
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
        Destination(title: "On TV", symbol: "tv", target: "tv"),
        Destination(title: "Teams", symbol: "tshirt", target: "teams"),
        Destination(title: "Box Office", symbol: "ticket", target: "moments"),
        Destination(title: "All games", symbol: "list.bullet.rectangle", target: "games"),
        Destination(title: "Slate", symbol: "wand.and.stars", target: "lineup"),
    ]
}

// One page button in the open strip menu; the open page is lit
private struct StripButton: View {
    let dest: Destination
    @ObservedObject var model: WebModel

    var body: some View {
        let on = model.activeTarget == dest.target
        Button {
            model.go(dest.target)
            withAnimation(.snappy) { model.stripOpen = false }
        } label: {
            Label(dest.title, systemImage: dest.symbol)
                .symbolVariant(on ? .fill : .none)
        }
        .tint(on ? Color.accentColor : Color.primary)
        .accessibilityAddTraits(on ? .isSelected : [])
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
