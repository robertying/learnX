import UIKit

/// learnX's share extension. It shows nothing: it copies the first shared file into the app group, leaves its
/// location for the app (`SharedFileInbox` in modules/share), and opens learnX, which offers the file as an
/// attachment to the next assignment submission. Only files activate it (Info.plist), not plain text.
///
/// Opening the app needs `UIApplication.shared`, which an extension isn't meant to reach; the class is marked
/// unavailable to extensions so it compiles, and the call works at run time.
/// It is the extension's principal class (Info.plist), so it has no storyboard.
@available(iOSApplicationExtension, unavailable)
final class ShareViewController: UIViewController {
  override func viewDidLoad() {
    super.viewDidLoad()
    Task {
      await saveSharedFile()
      openApp()
    }
  }

  /// Copies the file and records it (`SharedFileInbox`, in modules/share). On any failure the app still opens, with
  /// nothing new to attach.
  private func saveSharedFile() async {
    guard let inbox = SharedFileInbox(bundle: .main),
      let shared = SharedFileInbox.firstFile(in: extensionContext?.inputItems as? [NSExtensionItem] ?? [])
    else {
      return
    }
    do {
      try await inbox.save(shared.provider, type: shared.type)
    } catch {
      NSLog("learnX share extension: couldn't copy the shared file: \(error)")
    }
  }

  private func openApp() {
    guard let url = URL(string: "learnx://") else {
      return
    }
    UIApplication.shared.open(url) { [weak self] _ in
      self?.extensionContext?.completeRequest(returningItems: nil)
    }
  }
}
