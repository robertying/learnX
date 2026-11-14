@testable import ExpoModulesCore
import Testing
import UIKit

@testable import Sidebar

func sidebarItem(_ key: String, title: String? = nil, badge: Bool = false, testID: String = "") -> SidebarItem {
  var item = SidebarItem()
  item.key = key
  item.title = title ?? key.capitalized
  item.systemImage = "tray"
  item.badge = badge
  item.testID = testID
  return item
}

/// A sidebar on screen, so its list makes cells.
@MainActor
func makeSidebar() -> (SidebarView, UIWindow) {
  let window = UIWindow(frame: CGRect(x: 0, y: 0, width: 320, height: 640))
  let view = SidebarView(appContext: nil)
  view.frame = window.bounds
  window.addSubview(view)
  window.isHidden = false
  return (view, window)
}

@MainActor
extension SidebarView {
  var list: UICollectionView {
    subviews.compactMap { $0 as? UICollectionView }.first!
  }

  func cell(_ row: Int) -> UICollectionViewListCell? {
    list.layoutIfNeeded()
    return list.cellForItem(at: IndexPath(item: row, section: 0)) as? UICollectionViewListCell
  }

  var selectedRows: [Int] {
    (list.indexPathsForSelectedItems ?? []).map(\.item).sorted()
  }
}

@MainActor
@Suite struct SidebarViewTests {
  @Test func definesItsView() {
    _ = SidebarModule(appContext: AppContext()).definition()
  }

  @Test func takesItsPropsFromJS() throws {
    let appContext = AppContext()
    let definition = SidebarModule(appContext: appContext).definition()
    let props = try #require(definition.views.values.first).propsDict()
    let (view, window) = makeSidebar()
    defer { window.isHidden = true }

    let items: [[String: Any]] = [
      ["key": "a", "title": "A", "systemImage": "tray", "badge": false, "testID": "tab-a"],
      ["key": "b", "title": "B", "systemImage": "tray", "badge": true, "testID": "tab-b"],
    ]
    try #require(props["items"]).set(value: items, onView: view, appContext: appContext)
    try #require(props["selectedKey"]).set(value: "b", onView: view, appContext: appContext)
    try #require(props["accentColor"]).set(value: "red", onView: view, appContext: appContext)

    #expect(view.list.numberOfItems(inSection: 0) == 2)
    #expect(view.selectedRows == [1])
    #expect(view.list.tintColor != nil)
  }

  @Test func comparesItems() {
    #expect(sidebarItem("a") == sidebarItem("a"))
    #expect(sidebarItem("a") != sidebarItem("a", badge: true))
    #expect(sidebarItem("a") != sidebarItem("a", title: "Other"))
    #expect(sidebarItem("a") != sidebarItem("b"))
    #expect(sidebarItem("a") != sidebarItem("a", testID: "tab-a"))
  }

  @Test func showsTheItems() throws {
    let (view, window) = makeSidebar()
    defer { window.isHidden = true }
    view.setItems([sidebarItem("today", testID: "tab-today"), sidebarItem("notices", badge: true)])

    let today = try #require(view.cell(0))
    let content = try #require(today.contentConfiguration as? UIListContentConfiguration)
    #expect(content.text == "Today")
    #expect(content.image != nil)
    #expect(today.accessories.isEmpty)
    #expect(today.accessibilityIdentifier == "tab-today")

    let notices = try #require(view.cell(1))
    #expect(notices.accessories.count == 1)
    #expect(notices.accessibilityIdentifier == nil)
  }

  @Test func updatesChangedItems() throws {
    let (view, window) = makeSidebar()
    defer { window.isHidden = true }
    view.setItems([sidebarItem("notices", badge: true), sidebarItem("files")])
    _ = view.cell(0)

    view.setItems([sidebarItem("notices"), sidebarItem("files"), sidebarItem("courses")])

    #expect(try #require(view.cell(0)).accessories.isEmpty)
    #expect(view.list.numberOfItems(inSection: 0) == 3)
  }

  @Test func selectsTheSelectedKey() throws {
    let (view, window) = makeSidebar()
    defer { window.isHidden = true }
    view.setItems([sidebarItem("today"), sidebarItem("notices", badge: true)])

    view.setSelectedKey("notices")
    #expect(view.selectedRows == [1])
    // The badge turns white over the selection.
    let notices = try #require(view.cell(1))
    notices.isSelected = true
    notices.updateConfiguration(using: notices.configurationState)

    // Selecting it again changes nothing.
    view.setSelectedKey("notices")
    #expect(view.selectedRows == [1])

    view.setSelectedKey("today")
    #expect(view.selectedRows == [0])

    view.setSelectedKey("missing")
    #expect(view.selectedRows.isEmpty)

    view.setSelectedKey("today")
    view.setSelectedKey(nil)
    #expect(view.selectedRows.isEmpty)
  }

  @Test func reportsTaps() {
    let (view, window) = makeSidebar()
    defer { window.isHidden = true }
    view.setItems([sidebarItem("today"), sidebarItem("files")])
    var selected: [String] = []
    view.onSelect.onEventSent = { selected.append($0["key"] as? String ?? "?") }

    view.collectionView(view.list, didSelectItemAt: IndexPath(item: 1, section: 0))
    // A row the list doesn't have (not expected from UIKit) is ignored.
    view.collectionView(view.list, didSelectItemAt: IndexPath(item: 5, section: 0))

    #expect(selected == ["files"])
  }

  @Test func tintsTheSelection() {
    let view = SidebarView(appContext: nil)
    view.setAccentColor(.systemPurple)
    #expect(view.list.tintColor == .systemPurple)
  }
}
