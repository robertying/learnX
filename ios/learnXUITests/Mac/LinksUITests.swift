#if targetEnvironment(macCatalyst)
import XCTest

/// `.maestro/11-links.yaml`: the `learnx://` links that notifications and Spotlight results open
/// (`helpers/openTarget`, `hooks/useLinkTaps`), sent to the running app. The ids are mock items' (checked by
/// `scripts/__tests__/e2eLinks.test.ts`).
@MainActor
final class LinksUITests: LearnXUITestCase {
  func testOpensItemsFromLinks() throws {
    for (link, id) in [
      ("learnx://notice/26ef84e76d60efc1016d000000000001", "notice-detail"),
      ("learnx://assignment/26ef84e76db3f55b016d000000000001", "assignment-detail"),
      ("learnx://file/2016310501_KJ_173100010b5f1dcc2-f77a-4cca-be0f-95808af85d82", "file-detail"),
      ("learnx://today", "today"),
    ] {
      try openInWorkspace(XCTUnwrap(URL(string: link)))
      try waitFor(id: id)
    }
  }

  /// Opens `url` as a click on a link elsewhere does, through AppKit's NSWorkspace (which a Mac Catalyst test can
  /// only reach at run time). Launch Services gives it to the learnX the tests just built. Neither
  /// XCUIApplication.open(_:) nor UIApplication.open(_:) delivers it on Mac Catalyst.
  private func openInWorkspace(_ url: URL) throws {
    let workspace = try XCTUnwrap(NSClassFromString("NSWorkspace") as? NSObject.Type)
      .perform(NSSelectorFromString("sharedWorkspace")).takeUnretainedValue()
    // Returns a BOOL, not an object: leave it unread.
    _ = workspace.perform(NSSelectorFromString("openURL:"), with: url)
  }
}
#endif
