import SwiftUI
import WidgetKit

// The SlateLive extension only holds the live notifications' look (one game, and the four-game scoreboard); nothing runs here on its own.
@main
struct SlateLiveBundle: WidgetBundle {
    var body: some Widget {
        SlateLiveActivity()
        SlateBoardActivity()
    }
}
