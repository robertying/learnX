import Testing
import UIKit

@testable import LearnXShare

/// The save panel's answers, as UIKit sends them to its delegate. The panel only takes files that exist.
@MainActor
@Suite struct FileSaverTests {
  let a: URL
  let b: URL
  let picker: UIDocumentPickerViewController

  init() throws {
    let folder = FileManager.default.temporaryDirectory
      .appendingPathComponent("learnx-tests-\(UUID().uuidString)", isDirectory: true)
    try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
    a = folder.appendingPathComponent("a.pdf")
    b = folder.appendingPathComponent("b.pdf")
    try Data().write(to: a)
    try Data().write(to: b)
    picker = UIDocumentPickerViewController(forExporting: [a], asCopy: true)
  }

  @Test func savesWhenALocationIsPicked() {
    var saved: [Bool] = []
    let saver = FileSaver()
    saver.save(a, from: UIViewController()) { saved.append($0) }
    saver.documentPicker(picker, didPickDocumentsAt: [URL(fileURLWithPath: "/tmp/b/a.pdf")])
    // Answered once.
    saver.documentPickerWasCancelled(picker)
    #expect(saved == [true])
  }

  @Test func doesNotSaveWhenCancelled() {
    var saved: [Bool] = []
    let saver = FileSaver()
    saver.save(a, from: UIViewController()) { saved.append($0) }
    saver.documentPickerWasCancelled(picker)
    #expect(saved == [false])
  }

  @Test func endsTheSaveAnotherOneTakesOver() {
    var first: [Bool] = []
    var second: [Bool] = []
    let saver = FileSaver()
    saver.save(a, from: UIViewController()) { first.append($0) }
    saver.save(b, from: UIViewController()) { second.append($0) }
    saver.documentPicker(picker, didPickDocumentsAt: [])
    #expect(first == [false])
    #expect(second == [true])
  }
}
