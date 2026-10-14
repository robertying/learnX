import ExpoModulesCore
import UIKit

struct SidebarItem: Record, Equatable {
  @Field var key: String = ""
  @Field var title: String = ""
  @Field var systemImage: String = ""
  @Field var badge: Bool = false

  static func == (lhs: SidebarItem, rhs: SidebarItem) -> Bool {
    lhs.key == rhs.key && lhs.title == rhs.title && lhs.systemImage == rhs.systemImage && lhs.badge == rhs.badge
  }
}

public final class SidebarModule: Module {
  public func definition() -> ModuleDefinition {
    Name("Sidebar")

    View(SidebarView.self) {
      Events("onSelect")

      Prop("items") { (view: SidebarView, items: [SidebarItem]) in
        view.setItems(items)
      }

      Prop("selectedKey") { (view: SidebarView, key: String?) in
        view.setSelectedKey(key)
      }

      Prop("accentColor") { (view: SidebarView, color: UIColor?) in
        view.setAccentColor(color)
      }
    }
  }
}
