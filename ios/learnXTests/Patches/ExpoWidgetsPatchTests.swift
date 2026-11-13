import SwiftUI
import Testing
import UIKit

@testable internal import ExpoWidgets

/// What patches/expo-widgets@58.0.27.patch adds to widget layouts on iOS: a `ViewThatFitsView` node (SwiftUI's
/// ViewThatFits) and a `CountdownView` node, the time left in days, hours and minutes without seconds, in equal-width digits. Nodes are
/// rendered by their type name, as a widget's layout is, and compared as images with what they should show.
@MainActor
@Suite struct ExpoWidgetsPatchTests {
  private let size = CGSize(width: 200, height: 40)

  private func text(_ text: String) -> [String: Any] {
    ["type": "TextView", "props": ["text": text]]
  }

  /// Text with equal-width digits, as a countdown draws them: the width it reserves for its value is measured that way,
  /// so the live value fills it.
  private func digits(_ text: String) -> [String: Any] {
    ["type": "TextView", "props": ["text": text, "modifiers": [["$type": "monospacedDigit"]]]]
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

  @Test func countdownLeavesOutSeconds() throws {
    guard #available(iOS 18, *) else { return }
    // The relative date style would say "42 min, 30 sec".
    let date = Date().addingTimeInterval(42 * 60 + 30)
    let node: [String: Any] = ["type": "CountdownView", "props": ["date": date.timeIntervalSince1970 * 1000]]
    #expect(try same(node, digits("42 minutes")))
  }

  @Test func countdownShowsAtMostTwoFields() throws {
    guard #available(iOS 18, *) else { return }
    let date = Date().addingTimeInterval(((2 * 24 + 20) * 60 + 5) * 60 + 30)
    let node: [String: Any] = ["type": "CountdownView", "props": ["date": date.timeIntervalSince1970 * 1000]]
    #expect(try same(node, digits("2 days, 20 hours")))
  }

  @Test func countdownShowsAsManyFieldsAsAsked() throws {
    guard #available(iOS 18, *) else { return }
    let date = Date().addingTimeInterval(((2 * 24 + 20) * 60 + 5) * 60 + 30)
    let node: [String: Any] = [
      "type": "CountdownView",
      "props": ["date": date.timeIntervalSince1970 * 1000, "maxFieldCount": 1],
    ]
    #expect(try same(node, digits("2 days")))
  }
}
