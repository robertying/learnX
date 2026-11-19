#if targetEnvironment(macCatalyst)
import XCTest

/// `.maestro/03-details.yaml`: a notice, an assignment (with its attachment) and a file open beside their lists. The
/// files download from their real URLs, so the Mac needs the network.
@MainActor
final class DetailsUITests: LearnXUITestCase {
  func testOpensANoticeAnAssignmentAndAFile() throws {
    try open(tab: "tab-notices")
    try open(card: "notice-card", "MOCK_NOTICE", detail: "notice-detail")

    try open(tab: "tab-assignments")
    try open(card: "assignment-card", "MOCK_ASSIGNMENT", detail: "assignment-detail")
    try waitFor(text: "MOCK_ASSIGNMENT_ATTACHMENT")

    // The screen shows right away; the file itself downloads in the background.
    try open(tab: "tab-files")
    try open(card: "file-card", "MOCK_FILE", detail: "file-detail")
  }

  /// As in Mail, Tab moves into the list and Return opens the row that has the focus (`ContextMenuView` in
  /// `modules/menus`).
  func testOpensACardFromTheKeyboard() throws {
    try open(tab: "tab-notices")
    try waitFor(card: "notice-card", "MOCK_NOTICE")
    let focusedCard = element(
      NSPredicate(format: "identifier == %@ AND hasKeyboardFocus == true", "notice-card"))
    for _ in 0..<4 where !focusedCard.exists {
      app.typeKey(.tab, modifierFlags: [])
    }
    XCTAssertTrue(focusedCard.waitForExistence(timeout: 2), "Tab didn't move into the list\n\(app.debugDescription)")
    app.typeKey(.return, modifierFlags: [])
    try waitFor(id: "notice-detail")
  }

  /// A PowerPoint file, which the Mac's web view can't show, previews through Quick Look (`modules/quicklook`).
  func testPreviewsAnOfficeFileWithQuickLook() throws {
    try open(tab: "tab-files")
    try open(card: "file-card", "MOCK_OTHER_FILE", detail: "file-detail")
    try waitFor(id: "quick-look", timeout: 60)
  }
}
#endif
