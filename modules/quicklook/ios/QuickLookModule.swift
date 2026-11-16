import ExpoModulesCore
import QuickLook
import UIKit

/// Quick Look's preview of a downloaded file, for the documents a web view can't draw everywhere: Office and iWork
/// files, which iOS's web view converts but the Mac's shows as raw bytes.
public final class QuickLookModule: Module {
  public func definition() -> ModuleDefinition {
    Name("LearnXQuickLook")

    View(QuickLookView.self) {
      Prop("uri") { (view: QuickLookView, uri: String) in
        view.setURI(uri)
      }
    }
  }
}

/// A `QLPreviewController` showing one local file, as a child of the view controller the view is in, so that it gets
/// its appearance calls and the Mac's toolbar and keyboard handling.
final class QuickLookView: ExpoView {
  let controller = QLPreviewController()
  private(set) var url: URL?

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    controller.dataSource = self
    controller.view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    controller.view.frame = bounds
    addSubview(controller.view)
  }

  /// A `file:` URI; anything else shows nothing.
  func setURI(_ uri: String) {
    let newURL = URL(string: uri).flatMap { $0.isFileURL ? $0 : nil }
    guard newURL != url else {
      return
    }
    url = newURL
    controller.reloadData()
  }

  override func didMoveToWindow() {
    super.didMoveToWindow()
    if window != nil {
      guard controller.parent == nil, let parent = enclosingViewController else {
        return
      }
      parent.addChild(controller)
      controller.didMove(toParent: parent)
    } else if controller.parent != nil {
      controller.willMove(toParent: nil)
      controller.removeFromParent()
    }
  }

  /// The nearest view controller up the responder chain: the screen this view is in.
  private var enclosingViewController: UIViewController? {
    var responder = next
    while let current = responder {
      if let viewController = current as? UIViewController {
        return viewController
      }
      responder = current.next
    }
    return nil
  }
}

extension QuickLookView: @preconcurrency QLPreviewControllerDataSource {
  func numberOfPreviewItems(in controller: QLPreviewController) -> Int {
    url == nil ? 0 : 1
  }

  func previewController(_ controller: QLPreviewController, previewItemAt index: Int) -> any QLPreviewItem {
    // Only asked for when there is one.
    url! as NSURL
  }
}
