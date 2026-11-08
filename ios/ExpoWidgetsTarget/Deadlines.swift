import WidgetKit
import SwiftUI
internal import ExpoWidgets

struct Deadlines: Widget {
  let name: String = "Deadlines"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: name, provider: WidgetsTimelineProvider(name: name)) { entry in
      WidgetsEntryView(entry: entry)
    }
    .configurationDisplayName("Deadlines")
    .description("Your upcoming assignment deadlines.")
    .supportedFamilies([.systemSmall, .systemMedium, .systemLarge, .accessoryRectangular])
  }
}
