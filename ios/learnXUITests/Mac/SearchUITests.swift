#if targetEnvironment(macCatalyst)
import XCTest

/// `.maestro/06-search.yaml`: search, its tabs per kind, the filter menu's archived items, and opening a result; and
/// (`.maestro/10-errors.yaml`) a search that finds nothing.
@MainActor
final class SearchUITests: LearnXUITestCase {
  func testSearchesAndOpensAResult() throws {
    try open(tab: "tab-notices")
    try search(value("MOCK_SEARCH_TERM"))
    try waitFor(card: "notice-card", "MOCK_SEARCH_NOTICE")
    try waitFor(card: "assignment-card", "MOCK_SEARCH_ASSIGNMENT")

    // A tab per kind shows only that kind.
    try scope("T_assignments")
    waitForAbsence(card: "notice-card", "MOCK_SEARCH_NOTICE")
    try waitFor(card: "assignment-card", "MOCK_SEARCH_ASSIGNMENT")
    try scope("T_files")
    waitForAbsence(card: "assignment-card", "MOCK_SEARCH_ASSIGNMENT")
    try waitFor(id: "file-card")
    try scope("T_all")
    try waitFor(card: "notice-card", "MOCK_SEARCH_NOTICE")

    // The filter menu leaves archived items out and takes them back.
    try filter("T_archived")
    try waitFor(card: "notice-card", "MOCK_SEARCH_NOTICE")
    try filter("T_archived")

    try open(card: "notice-card", "MOCK_SEARCH_NOTICE", detail: "notice-detail")
  }

  /// patches/react-native-screens@4.30.1.patch: the search field's clear button empties the field without
  /// telling the search bar's delegate, so the results stayed filtered.
  func testClearingTheSearchShowsEverythingAgain() throws {
    try open(tab: "tab-notices")
    try search(value("MOCK_SEARCH_TERM"))
    try waitFor(card: "assignment-card", "MOCK_SEARCH_ASSIGNMENT")

    let clear = try searchField().buttons.firstMatch
    XCTAssertTrue(clear.waitForExistence(timeout: 5), "no clear button in the search field")
    clear.click()
    waitForAbsence(card: "assignment-card", "MOCK_SEARCH_ASSIGNMENT")
    try close()
  }

  func testFindsNothing() throws {
    try open(tab: "tab-notices")
    try search("zzzqqq")
    try waitFor(text: "T_noResults")
    try waitFor(text: "T_noResultsDescription")
    try close()
    waitForAbsence(id: "search-tabs")
  }

  /// Picks a tab (a segment of Search's picker) by the value `name`.
  private func scope(_ name: String) throws {
    let tabs = try waitFor(id: "search-tabs")
    let tab = tabs.descendants(matching: .any).matching(predicate(name, "==", ["label", "title"])).firstMatch
    try wait(tab, "search tab \(name)", 5).click()
  }
}
#endif
