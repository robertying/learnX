import WidgetKit
import SwiftUI
internal import ExpoWidgets

struct UpNext: Widget {
  let name: String = "UpNext"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: name, provider: WidgetsTimelineProvider(name: name)) { entry in
      WidgetsEntryView(entry: entry)
    }
    .configurationDisplayName("Up Next")
    .description("Your class on now or next, and the ones after it.")
    .supportedFamilies([.systemSmall, .systemMedium, .systemLarge, .accessoryRectangular])
  }
}
