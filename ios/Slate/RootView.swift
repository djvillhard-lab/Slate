import SwiftUI

// The page fills the screen. On iPhone Duo, Slate's main destinations go in the system's control strip
// (Apple moves bottom toolbar items into the right-side bar there), and the page hides its own menu button.
// On a regular iPhone the page looks and works exactly like the Home Screen app.
struct RootView: View {
    @ObservedObject private var model = WebModel.shared

    var body: some View {
        NavigationStack {
            ZStack {
                Color.slateBackground(model.look).ignoresSafeArea()
                SlateWebView(model: model)
                    .ignoresSafeArea(.container, edges: model.strip ? [.top, .bottom, .leading] : .all)
                    .ignoresSafeArea(.keyboard)
                if let err = model.loadError {
                    OfflineView(message: err) { model.reload() }
                }
            }
            .toolbar(.hidden, for: .navigationBar)
            .toolbar {
                if model.strip {
                    ToolbarItemGroup(placement: .bottomBar) {
                        StripButton(title: "Slate", symbol: "wand.and.stars", target: "lineup", model: model)
                        StripButton(title: "All games", symbol: "list.bullet.rectangle", target: "games", model: model)
                        StripButton(title: "Box Office", symbol: "ticket", target: "moments", model: model)
                        StripButton(title: "Teams", symbol: "tshirt", target: "teams", model: model)
                        StripButton(title: "On TV", symbol: "tv", target: "tv", model: model)
                        StripButton(title: "Settings", symbol: "gearshape", target: "settings", model: model)
                    }
                }
            }
            .toolbar(model.strip ? .visible : .hidden, for: .bottomBar)
        }
        .preferredColorScheme(model.look == "light" ? .light : .dark)
        .onGeometryChange(for: CGSize.self) { $0.size } action: { _ in
            model.setStrip(DeviceShape.isWideScreen)
        }
        .onAppear { model.setStrip(DeviceShape.isWideScreen) }
    }
}

private struct StripButton: View {
    let title: String
    let symbol: String
    let target: String
    @ObservedObject var model: WebModel

    var body: some View {
        let on = model.activeTarget == target
        Button {
            model.go(target)
        } label: {
            Label(title, systemImage: symbol)
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
