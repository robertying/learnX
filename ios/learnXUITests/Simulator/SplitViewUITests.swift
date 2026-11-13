#if !targetEnvironment(macCatalyst)
import XCTest

/// The tabs' split views on an iPad. A tab bar controller hands the safe area of its bar, at the top, down to the
/// columns of a split view in a tab; `patches/react-native-screens@4.30.1.patch` makes it do so when the split view
/// joins a tab that is already showing, and `patches/react-native-bottom-tabs@1.5.0.patch` when the tab bar moves
/// into the sidebar and back. Without them, the columns' bars were left under the tab bar. The bottom-tabs patch also
/// keeps the choice between the tab bar and the sidebar across launches.
@MainActor
final class SplitViewUITests: SimulatorUITestCase {
  private let listTabs = ["tab-notices", "tab-assignments", "tab-files", "tab-courses"]

  override func setUp() async throws {
    try await super.setUp()
    guard UIDevice.current.userInterfaceIdiom == .pad else {
      throw XCTSkip("the tab bar and the sidebar are an iPad's")
    }
    XCUIDevice.shared.orientation = .portrait
    try showTabBar()
  }

  override func tearDown() async throws {
    // The next test, and the next run, start in portrait with the tab bar.
    XCUIDevice.shared.orientation = .portrait
    try? showTabBar()
    try await super.tearDown()
  }

  func testColumnBarsStayBelowTheTabBarAcrossTabs() throws {
    try skipIfCollapsed()
    for tab in listTabs {
      try open(tab: tab)
      let tabBarBottom = try tabBarBottom()
      try waitForColumnBars("below the tab bar in \(tab)") { $0 >= tabBarBottom }
    }
  }

  func testColumnBarsFollowTheTabBarIntoTheSidebarAndBack() throws {
    try skipIfCollapsed()
    try open(tab: "tab-notices")
    let tabBarBottom = try tabBarBottom()
    try waitForColumnBars("below the tab bar") { $0 >= tabBarBottom }

    try toggleSidebar()
    // The bar moved into the sidebar, so the columns' bars go up to the top of the screen.
    try waitForColumnBars("up with the sidebar") { $0 < tabBarBottom }

    try toggleSidebar()
    try waitForColumnBars("below the tab bar again") { $0 >= tabBarBottom }

    // And in a tab first shown since.
    try open(tab: "tab-files")
    try waitForColumnBars("below the tab bar in another tab") { $0 >= tabBarBottom }
  }

  func testSidebarChoiceSurvivesARelaunch() throws {
    try toggleSidebar()
    XCTAssertTrue(isSidebarShown())

    app.terminate()
    app.launch()
    try waitFor(idMatching: "tab-.*", timeout: 30)
    XCTAssertTrue(isSidebarShown(), "the sidebar was closed after a relaunch")

    try toggleSidebar()
    app.terminate()
    app.launch()
    try waitFor(idMatching: "tab-.*", timeout: 30)
    XCTAssertFalse(isSidebarShown(), "the sidebar was open after a relaunch")
  }

  /// patches/react-native-screens@4.30.1.patch adds `maxCollapsedWidth`: a window no wider than it (744 points,
  /// `constants/SplitSizes.ts`) keeps the split collapsed, so a notice opens over the list, as on an iPhone. An iPad
  /// mini in portrait is that wide; wider, the notice shows beside the list.
  func testNarrowWindowOpensANoticeOverTheList() throws {
    guard isNarrow() else {
      throw XCTSkip("the window is wider than maxCollapsedWidth in portrait; run on an iPad mini")
    }
    try open(tab: "tab-notices")
    let card = app.buttons.matching(identifier: "notice-card").firstMatch
    try wait(card, "a notice", 10).tap()
    try waitFor(id: "notice-detail")
    let listHidden = expectation(for: NSPredicate(format: "isHittable == false"), evaluatedWith: card)
    wait(for: [listHidden], timeout: 5)

    XCUIDevice.shared.orientation = .landscapeLeft
    let listShown = expectation(for: NSPredicate(format: "isHittable == true"), evaluatedWith: card)
    wait(for: [listShown], timeout: 5)
    // The list is back on screen with the notice still open. (Frames and hittability of the notice come relative
    // to its column here, so they can't be compared with the list's.)
    try waitFor(id: "notice-detail")
  }

  // MARK: - Steps

  /// Collapsed, a list's bar shares the tab bar's row, its title below it.
  private func skipIfCollapsed() throws {
    if isNarrow() {
      throw XCTSkip("the split is collapsed in a window this narrow")
    }
  }

  private func toggleSidebar() throws {
    let shown = isSidebarShown()
    // The system's toggle: "ToggleSideBar" in the tab bar, "ToggleSidebar" in the sidebar.
    try waitFor(idMatching: "ToggleSide[Bb]ar")
    let toggle = app.buttons.matching(NSPredicate(format: "identifier MATCHES %@", "ToggleSide[Bb]ar"))
      .allElementsBoundByIndex.first { $0.isHittable }
    try XCTUnwrap(toggle, "no sidebar toggle on screen").tap()
    let toggled = expectation(for: NSPredicate { _, _ in self.isSidebarShown() != shown }, evaluatedWith: nil)
    wait(for: [toggled], timeout: 5)
  }

  private func showTabBar() throws {
    if isSidebarShown() {
      try toggleSidebar()
    }
  }

  // MARK: - Queries

  /// At most maxCollapsedWidth (744 points, `constants/SplitSizes.ts`) wide.
  private func isNarrow() -> Bool {
    app.windows.firstMatch.frame.width <= 744
  }

  /// The sidebar lists the tabs as rows; the tab bar has them as buttons.
  private func isSidebarShown() -> Bool {
    app.cells.matching(identifier: "tab-notices").allElementsBoundByIndex.contains { $0.isHittable }
  }

  /// The bottom of the tab bar at the top of the screen.
  private func tabBarBottom() throws -> CGFloat {
    let tab = app.buttons.matching(identifier: "tab-notices").allElementsBoundByIndex.first { $0.isHittable }
    return try XCTUnwrap(tab, "no tab bar").frame.maxY
  }

  /// The tops of the bars of the selected tab's columns (the sidebar's own bar has no identifier).
  private func columnBarTops() -> [CGFloat] {
    app.navigationBars.allElementsBoundByIndex
      .filter { !$0.identifier.isEmpty && !$0.frame.isEmpty }
      .map(\.frame.minY)
  }

  /// Waits until every column bar's top passes `check`, and fails with where they are if they don't.
  private func waitForColumnBars(_ what: String, _ check: @escaping (CGFloat) -> Bool) throws {
    let placed = expectation(
      for: NSPredicate { _, _ in
        let tops = self.columnBarTops()
        return !tops.isEmpty && tops.allSatisfy(check)
      }, evaluatedWith: nil)
    let result = XCTWaiter().wait(for: [placed], timeout: 5)
    XCTAssertEqual(result, .completed, "column bars not \(what): tops at \(columnBarTops())")
  }
}
#endif
