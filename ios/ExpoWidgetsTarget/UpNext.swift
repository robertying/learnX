import WidgetKit
import SwiftUI
internal import ExpoWidgets

struct UpNext: Widget {
  let name: String = "UpNext"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: name, provider: WidgetsTimelineProvider(name: name)) { entry in
      WidgetsEntryView(entry: entry)
    }
    .configurationDisplayName("Next Up")
    .description("Your current or next class, and the ones after it.")
    .supportedFamilies([.systemSmall, .systemMedium, .systemLarge, .accessoryRectangular])
  }
}
