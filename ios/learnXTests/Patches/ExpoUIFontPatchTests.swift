internal import ExpoModulesCore
@testable internal import ExpoUI
import SwiftUI
import Testing

/// What patches/@expo__ui@58.0.28.patch changes in the `font` modifier: on Mac the system font (a text style or a size)
/// is made from UIKit's, which draws its weights as React Native's text does (SwiftUI's own medium looks like UIKit's
/// semibold there). iPhone and iPad keep SwiftUI's system font, and other designs stay SwiftUI's everywhere.
@MainActor
@Suite struct ExpoUIFontPatchTests {
  private func font(_ params: [String: Any]) throws -> Font {
    try FontModifier(from: params, appContext: AppContext()).resolveFont()
  }

  @Test func systemFontAtASizeIsUIKitsOnMacOnly() throws {
    let medium = try font(["size": 17, "weight": "medium"])
    #if targetEnvironment(macCatalyst)
      #expect(medium == Font(UIFont.systemFont(ofSize: 17, weight: .medium) as CTFont))
    #else
      #expect(medium == .system(size: 17, weight: .medium))
    #endif
  }

  @Test func textStyleInAWeightIsUIKitsOnMacOnly() throws {
    let body = try font(["textStyle": "body", "weight": "medium"])
    #if targetEnvironment(macCatalyst)
      let size = UIFont.preferredFont(forTextStyle: .body).pointSize
      #expect(body == Font(UIFont.systemFont(ofSize: size, weight: .medium) as CTFont))
      #expect(try font(["textStyle": "footnote"]) == Font(UIFont.preferredFont(forTextStyle: .footnote) as CTFont))
    #else
      #expect(body == .system(.body, design: .default).weight(.medium))
    #endif
  }

  @Test func otherDesignsStaySwiftUIs() throws {
    #expect(try font(["size": 17, "design": "rounded"]) == .system(size: 17, weight: .regular, design: .rounded))
  }
}
