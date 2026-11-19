import SwiftUI
import WidgetKit

// The SlateLive extension holds the live notifications' look (one game, and the four-game scoreboard) and, from
// 3.112.0, the Tonight's slate home-screen widget. 3.112.0: this extension needs iOS 18 (the Apple Watch's Smart
// Stack); the app itself still runs on iOS 17.
@main
struct SlateLiveBundle: WidgetBundle {
    var body: some Widget {
        SlateLiveActivity()
        SlateBoardActivity()
        SlateTonightWidget()
        SlateLockWidget()   // 3.114.0: Lock Screen widgets
    }
}
