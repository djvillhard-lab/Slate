import SwiftUI
import WidgetKit

// The SlateLive extension only holds the live notification's look; nothing runs here on its own.
@main
struct SlateLiveBundle: WidgetBundle {
    var body: some Widget {
        SlateLiveActivity()
    }
}
