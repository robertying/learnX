import UIKit

/// Asks where to save a copy of a file: the save panel on Mac, where the app may only write to places people pick.
@MainActor
final class FileSaver: NSObject, UIDocumentPickerDelegate {
  private var completion: ((Bool) -> Void)?

  /// Saves a copy of the file at `url`, under its own name, where people pick. `completion` gets whether it was saved
  /// (false when they cancel, or when another save takes over).
  func save(_ url: URL, from presenter: UIViewController, completion: @escaping (Bool) -> Void) {
    finish(false)
    self.completion = completion
    let picker = UIDocumentPickerViewController(forExporting: [url], asCopy: true)
    picker.delegate = self
    presenter.present(picker, animated: true)
  }

  func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
    finish(true)
  }

  func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) {
    finish(false)
  }

  func finish(_ saved: Bool) {
    let completion = completion
    self.completion = nil
    completion?(saved)
  }
}
