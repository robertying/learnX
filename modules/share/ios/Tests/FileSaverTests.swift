import Testing
import UIKit

@testable import LearnXShare

/// The save panel's answers, as UIKit sends them to its delegate.
@MainActor
@Suite struct FileSaverTests {
  let picker = UIDocumentPickerViewController(forExporting: [URL(fileURLWithPath: "/tmp/a.pdf")], asCopy: true)

  @Test func savesWhenALocationIsPicked() {
    var saved: [Bool] = []
    let saver = FileSaver()
    saver.save(URL(fileURLWithPath: "/tmp/a.pdf"), from: UIViewController()) { saved.append($0) }
    saver.documentPicker(picker, didPickDocumentsAt: [URL(fileURLWithPath: "/tmp/b/a.pdf")])
    // Answered once.
    saver.documentPickerWasCancelled(picker)
    #expect(saved == [true])
  }

  @Test func doesNotSaveWhenCancelled() {
    var saved: [Bool] = []
    let saver = FileSaver()
    saver.save(URL(fileURLWithPath: "/tmp/a.pdf"), from: UIViewController()) { saved.append($0) }
    saver.documentPickerWasCancelled(picker)
    #expect(saved == [false])
  }

  @Test func endsTheSaveAnotherOneTakesOver() {
    var first: [Bool] = []
    var second: [Bool] = []
    let saver = FileSaver()
    saver.save(URL(fileURLWithPath: "/tmp/a.pdf"), from: UIViewController()) { first.append($0) }
    saver.save(URL(fileURLWithPath: "/tmp/b.pdf"), from: UIViewController()) { second.append($0) }
    saver.documentPicker(picker, didPickDocumentsAt: [])
    #expect(first == [false])
    #expect(second == [true])
  }
}
