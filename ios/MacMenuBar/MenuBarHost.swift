import AppKit

/// learnX's item in the Mac's menu bar, the Dock icon and the launch event, for `MenuBar` (modules/menubar), which
/// Mac Catalyst has no API for. This bundle's principal class; the Mac app loads it from its PlugIns.
@objc(LXMenuBarHost)
final class MenuBarHost: NSObject, MenuBarHosting {
  /// The icon's height in points; menu bar icons are about 16 to 18 points.
  private static let iconHeight: CGFloat = 16

  private var statusItem: NSStatusItem?
  private var onOpen: (() -> Void)?
  private var onCheck: (() -> Void)?

  var launchedAsLoginItem: Bool {
    // The open-application event that launched the app says whether it was opened as a login item.
    guard let event = NSAppleEventManager.shared().currentAppleEvent, event.eventID == kAEOpenApplication else {
      return false
    }
    return event.paramDescriptor(forKeyword: keyAEPropData)?.enumCodeValue == keyAELaunchedAsLogInItem
  }

  func showStatusItem(
    openTitle: String,
    checkTitle: String,
    quitTitle: String,
    onOpen: @escaping () -> Void,
    onCheck: @escaping () -> Void
  ) {
    self.onOpen = onOpen
    self.onCheck = onCheck
    let item = statusItem ?? NSStatusBar.system.statusItem(withLength: NSStatusItem.squareLength)
    statusItem = item
    item.button?.image = Self.icon()
    item.button?.setAccessibilityLabel("learnX")

    let menu = NSMenu()
    menu.addItem(Self.item(openTitle, action: #selector(open), target: self))
    menu.addItem(Self.item(checkTitle, action: #selector(check), target: self))
    menu.addItem(.separator())
    menu.addItem(Self.item(quitTitle, action: #selector(NSApplication.terminate(_:)), target: NSApp))
    item.menu = menu
  }

  func setShowsInDock(_ shows: Bool) {
    NSApp.setActivationPolicy(shows ? .regular : .accessory)
  }

  func activate() {
    NSApp.activate()
  }

  @objc private func open() {
    onOpen?()
  }

  @objc private func check() {
    onCheck?()
  }

  private static func item(_ title: String, action: Selector, target: AnyObject) -> NSMenuItem {
    let item = NSMenuItem(title: title, action: action, keyEquivalent: "")
    item.target = target
    return item
  }

  /// The X of the app icon as a template image, which macOS tints for the menu bar.
  private static func icon() -> NSImage {
    let size = NSSize(
      width: (iconHeight * MenuBarIcon.artSize.width / MenuBarIcon.artSize.height).rounded(.up),
      height: iconHeight
    )
    let image = NSImage(size: size, flipped: true) { rect in
      let points = MenuBarIcon.outline(fitting: rect.size)
      guard let first = points.first else {
        return false
      }
      let path = NSBezierPath()
      path.move(to: first)
      points.dropFirst().forEach { path.line(to: $0) }
      path.close()
      NSColor.black.setFill()
      path.fill()
      return true
    }
    image.isTemplate = true
    return image
  }
}
