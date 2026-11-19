import SwiftUI
import Testing
import UIKit

@testable internal import ExpoWidgets

/// What patches/expo-widgets@58.0.29.patch adds to widget layouts on iOS: a `ViewThatFitsView` node (SwiftUI's
/// ViewThatFits) and the extension's locale in a layout's environment. Nodes are rendered by their type name, as a
/// widget's layout is, and compared as images with what they should show.
@MainActor
@Suite struct ExpoWidgetsPatchTests {
  private let size = CGSize(width: 200, height: 40)

  private func text(_ text: String) -> [String: Any] {
    ["type": "TextView", "props": ["text": text]]
  }

  private func image(_ node: [String: Any]) throws -> UIImage {
    let child = WidgetsViewRenderer(name: "Test", kind: .widget, node: node, entryIndex: nil, environmentString: nil)
      .render()
    let renderer = ImageRenderer(
      content: AnyView(child)
        .frame(width: size.width, height: size.height, alignment: .leading)
        .environment(\.locale, Locale(identifier: "en_US"))
    )
    renderer.scale = 2
    return try #require(renderer.uiImage)
  }

  private func same(_ node: [String: Any], _ expected: [String: Any]) throws -> Bool {
    try image(node).pngData() == image(expected).pngData()
  }

  @Test func viewThatFitsShowsTheFirstChildThatFits() throws {
    let node: [String: Any] = [
      "type": "ViewThatFitsView", "props": ["children": [text("Fits"), text("Second")]],
    ]
    #expect(try same(node, text("Fits")))
  }

  @Test func viewThatFitsFallsBackToAChildThatFits() throws {
    let long = text("A line far too long for the width it has")
    let node: [String: Any] = ["type": "ViewThatFitsView", "props": ["children": [long, text("Short")]]]
    #expect(try same(node, text("Short")))
  }

  @Test func environmentHasTheLocale() {
    var environment = EnvironmentValues()
    environment.locale = Locale(identifier: "zh-Hans_CN")
    // Foundation may canonicalize the identifier (iOS 27 gives "zh_CN"); the
    // layouts only look at the language prefix.
    let locale = getWidgetEnvironment(environment: environment)["locale"] as? String
    #expect(locale == environment.locale.identifier)
    #expect(locale?.hasPrefix("zh") == true)
  }
}
