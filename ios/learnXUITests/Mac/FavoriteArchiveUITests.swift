#if targetEnvironment(macCatalyst)
import XCTest

/// `.maestro/05-favorite-archive.yaml`: favorite and archive a notice from its context menu (the Mac has no swipe
/// actions), and undo each.
@MainActor
final class FavoriteArchiveUITests: LearnXUITestCase {
  func testFavoritesAndArchivesANotice() throws {
    try open(tab: "tab-notices")

    try cardAction("notice-card", "MOCK_NOTICE", "T_favorite")
    try filter("T_fav")
    try waitFor(card: "notice-card", "MOCK_NOTICE")

    try cardAction("notice-card", "MOCK_NOTICE", "T_unfavorite")
    waitForAbsence(card: "notice-card", "MOCK_NOTICE")

    try filter("T_all")
    try cardAction("notice-card", "MOCK_NOTICE", "T_archive")
    waitForAbsence(card: "notice-card", "MOCK_NOTICE")
    try filter("T_archived")
    try waitFor(card: "notice-card", "MOCK_NOTICE")

    try cardAction("notice-card", "MOCK_NOTICE", "T_restore")
    try filter("T_all")
    try waitFor(card: "notice-card", "MOCK_NOTICE")
  }
}
#endif
