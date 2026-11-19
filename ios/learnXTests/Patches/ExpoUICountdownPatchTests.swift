import SwiftUI
import Testing
import UIKit

@testable internal import ExpoWidgets

/// What patches/@expo__ui@58.0.29.patch adds to `Text` for widget layouts on iOS: `dateStyle: 'countdown'`, the time
/// left in days, hours and minutes without seconds, in equal-width digits. Inside a Text it's part of that text; on its
/// own it takes the width of the widest value it will show, as a widget lays it out only when it renders. Also, a part
/// of a joined Text takes an `accessibilityLabel`. Nodes are rendered as a widget's layout is and compared as images
/// with what they should show.
@MainActor
@Suite struct ExpoUICountdownPatchTests {
  private let size = CGSize(width: 240, height: 40)

  private func text(_ text: String, _ modifiers: [[String: Any]] = []) -> [String: Any] {
    ["type": "TextView", "props": ["text": text, "modifiers": modifiers]]
  }

  /// Text with equal-width digits, as a countdown draws them.
  private func digits(_ text: String, _ modifiers: [[String: Any]] = []) -> [String: Any] {
    self.text(text, [["$type": "monospacedDigit"]] + modifiers)
  }

  private func countdown(in seconds: TimeInterval, maxFieldCount: Int? = nil) -> [String: Any] {
    var props: [String: Any] = [
      "date": Date().addingTimeInterval(seconds).timeIntervalSince1970 * 1000,
      "dateStyle": "countdown",
    ]
    props["maxFieldCount"] = maxFieldCount
    return ["type": "TextView", "props": props]
  }

  private func joined(_ parts: [[String: Any]]) -> [String: Any] {
    ["type": "TextView", "props": ["children": parts]]
  }

  private func row(_ children: [[String: Any]]) -> [String: Any] {
    ["type": "HStackView", "props": ["spacing": 0, "children": children]]
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

  @Test func leavesOutSeconds() throws {
    guard #available(iOS 18, *) else { return }
    // The relative date style would say "42 min, 30 sec".
    #expect(try same(countdown(in: 42 * 60 + 30), digits("42 minutes")))
  }

  @Test func showsAtMostTwoFields() throws {
    guard #available(iOS 18, *) else { return }
    #expect(try same(countdown(in: ((2 * 24 + 20) * 60 + 5) * 60 + 30), digits("2 days, 20 hours")))
  }

  @Test func showsAsManyFieldsAsAsked() throws {
    guard #available(iOS 18, *) else { return }
    #expect(try same(countdown(in: ((2 * 24 + 20) * 60 + 5) * 60 + 30, maxFieldCount: 1), digits("2 days")))
  }

  @Test func isPartOfTheTextItIsIn() throws {
    guard #available(iOS 18, *) else { return }
    let node = joined([text("Starts in "), countdown(in: 42 * 60 + 30)])
    #expect(try same(node, joined([text("Starts in "), digits("42 minutes")])))
  }

  /// "1 hour" now, "59 minutes" a minute later: what follows it stays where "59 minutes" ends, and it's drawn in the
  /// font and on the baseline of the text before it.
  @Test func onItsOwnTakesTheWidthOfItsWidestValue() throws {
    guard #available(iOS 18, *) else { return }
    let node = row([text("Starts in "), countdown(in: 60 * 60 + 30, maxFieldCount: 1), text("|")])
    let reserved: [String: Any] = [
      "type": "ZStackView",
      "props": [
        "alignment": "leading",
        "children": [digits("59 minutes", [["$type": "hidden", "hidden": true]]), digits("1 hour")],
      ],
    ]
    #expect(try same(node, row([text("Starts in "), reserved, text("|")])))
  }

  @Test func partOfAJoinedTextTakesAnAccessibilityLabel() throws {
    let node = joined([text("Course"), text(" · Room", [["$type": "accessibilityLabel", "label": "Room"]])])
    // Not the debug build's "not supported for nested Text" warning.
    #expect(try same(node, text("Course · Room")))
  }
}
