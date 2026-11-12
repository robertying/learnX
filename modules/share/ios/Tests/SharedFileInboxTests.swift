import Foundation
import Testing
import UniformTypeIdentifiers

@testable import LearnXShare

/// An inbox in a temporary folder with a user defaults suite of its own.
func makeInbox(_ name: String = #function) throws -> SharedFileInbox {
  let suite = "io.robertying.learnx.tests.share.\(name)"
  UserDefaults().removePersistentDomain(forName: suite)
  let directory = FileManager.default.temporaryDirectory
    .appendingPathComponent("learnx-tests-\(UUID().uuidString)", isDirectory: true)
  return SharedFileInbox(defaults: try #require(UserDefaults(suiteName: suite)), directory: directory)
}

/// A provider that hands over `url` as a file of `type`, or fails with `error`.
func fileProvider(
  _ url: URL?,
  type: UTType,
  suggestedName: String? = nil,
  error: Error? = nil
) -> NSItemProvider {
  let provider = NSItemProvider()
  provider.suggestedName = suggestedName
  provider.registerFileRepresentation(forTypeIdentifier: type.identifier, visibility: .all) { completion in
    completion(url, false, error)
    return nil
  }
  return provider
}

func temporaryFile(named name: String, contents: String = "contents") throws -> URL {
  let folder = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString, isDirectory: true)
  try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
  let url = folder.appendingPathComponent(name)
  try Data(contents.utf8).write(to: url)
  return url
}

@Suite struct SharedFileInboxTests {
  @Test func savesTheFileForTheApp() async throws {
    let inbox = try makeInbox()
    let source = try temporaryFile(named: "tmp-123.pdf", contents: "%PDF")

    let saved = try await inbox.save(fileProvider(source, type: .pdf, suggestedName: "Report"), type: .pdf)

    #expect(saved.lastPathComponent == "Report.pdf")
    #expect(saved.deletingLastPathComponent().deletingLastPathComponent() == inbox.directory)
    #expect(try String(contentsOf: saved, encoding: .utf8) == "%PDF")
    #expect(
      inbox.take() == ["kind": "file", "uri": saved.absoluteString, "mimeType": "application/pdf"]
    )
    // Handed over once.
    #expect(inbox.take() == nil)
  }

  @Test func givesEachFileAFolderOfItsOwn() async throws {
    let inbox = try makeInbox()
    let source = try temporaryFile(named: "a.pdf")

    let first = try await inbox.save(fileProvider(source, type: .pdf, suggestedName: "Same"), type: .pdf)
    let second = try await inbox.save(fileProvider(source, type: .pdf, suggestedName: "Same"), type: .pdf)

    #expect(first.lastPathComponent == second.lastPathComponent)
    #expect(first != second)
  }

  @Test func recordsAGenericTypeForUnknownFiles() async throws {
    let inbox = try makeInbox()
    let source = try temporaryFile(named: "notes.learnx-unknown")

    try await inbox.save(fileProvider(source, type: .data), type: .data)

    #expect(inbox.take()?["mimeType"] == "application/octet-stream")
  }

  @Test func throwsWhenTheProviderFails() async throws {
    let inbox = try makeInbox()
    await #expect(throws: (any Error).self) {
      try await inbox.save(fileProvider(nil, type: .pdf, error: CocoaError(.fileNoSuchFile)), type: .pdf)
    }
    #expect(inbox.take() == nil)
  }

  @Test func throwsWhenTheProviderHasNoFile() async throws {
    let inbox = try makeInbox()
    await #expect(throws: (any Error).self) {
      try await inbox.save(fileProvider(nil, type: .pdf), type: .pdf)
    }
  }

  @Test func throwsWhenTheFileCannotBeCopied() async throws {
    let inbox = try makeInbox()
    let missing = FileManager.default.temporaryDirectory.appendingPathComponent("learnx-missing-\(UUID()).pdf")
    await #expect(throws: (any Error).self) {
      try await inbox.save(fileProvider(missing, type: .pdf), type: .pdf)
    }
  }

  @Test func throwsWhenTheFolderCannotBeMade() async throws {
    let blocker = try temporaryFile(named: "not-a-folder")
    let inbox = SharedFileInbox(defaults: try makeInbox().defaults, directory: blocker)
    await #expect(throws: (any Error).self) {
      try await inbox.save(fileProvider(blocker, type: .pdf), type: .pdf)
    }
  }

  @Test func takesNothingWithoutAFile() throws {
    let inbox = try makeInbox()
    #expect(inbox.take() == nil)
    inbox.defaults.set(["mimeType": "application/pdf"], forKey: SharedFileInbox.key)
    #expect(inbox.take() == nil)
  }

  @Test func defaultsTheMIMEType() throws {
    let inbox = try makeInbox()
    inbox.defaults.set(["uri": "file:///a"], forKey: SharedFileInbox.key)
    #expect(inbox.take() == ["kind": "file", "uri": "file:///a", "mimeType": "application/octet-stream"])
  }

  @Test func needsTheAppGroup() {
    // The test host has no app group entitlement.
    #expect(SharedFileInbox(appGroup: "group.io.robertying.learnx.tests") == nil)
  }

  @Test func readsTheAppGroupFromInfoPlist() {
    // The test host's Info.plist names no app group.
    #expect(Bundle.main.object(forInfoDictionaryKey: SharedFileInbox.appGroupKey) == nil)
    #expect(SharedFileInbox(bundle: .main) == nil)
  }
}

@Suite struct SharedFileNameTests {
  let url = URL(fileURLWithPath: "/tmp/abc/download.bin")

  @Test(arguments: [
    // Suggested name without an extension: the type's.
    ("Report", UTType.pdf, "/tmp/Report-tmp.pdf", "Report.pdf"),
    // Suggested name with one: kept.
    ("Report.final.docx", UTType.pdf, "/tmp/x.pdf", "Report.final.docx"),
    // No suggested name: the file's own, with the type's extension.
    (nil, UTType.png, "/tmp/IMG_0001.HEIC", "IMG_0001.png"),
    // A type without an extension: the file's.
    (nil, UTType.data, "/tmp/notes.xyz", "notes.xyz"),
    // Neither has one.
    ("Notes", UTType.data, "/tmp/notes", "Notes"),
    // A suggested name can't climb out of the file's folder.
    ("../../Preferences/x.plist", UTType.data, "/tmp/x", "_.._Preferences_x.plist"),
    ("a/b:c", UTType.pdf, "/tmp/x", "a_b_c.pdf"),
    // Nothing left of it: the file's own name.
    ("..", UTType.pdf, "/tmp/IMG_1.pdf", "IMG_1.pdf"),
  ] as [(String?, UTType, String, String)])
  func namesTheFile(suggested: String?, type: UTType, path: String, expected: String) {
    #expect(SharedFileInbox.fileName(suggested: suggested, url: URL(fileURLWithPath: path), type: type) == expected)
  }
}

@Suite struct FirstFileTests {
  @Test func takesTheFirstAttachmentWithAFile() throws {
    let empty = NSExtensionItem()
    let nothing = NSExtensionItem()
    nothing.attachments = [NSItemProvider()]
    let file = NSExtensionItem()
    let pdf = fileProvider(nil, type: .pdf)
    file.attachments = [pdf, fileProvider(nil, type: .png)]

    let first = try #require(SharedFileInbox.firstFile(in: [empty, nothing, file]))

    #expect(first.provider === pdf)
    #expect(first.type == .pdf)
  }

  @Test func findsNothingWithoutFiles() {
    let item = NSExtensionItem()
    let provider = NSItemProvider()
    provider.registerDataRepresentation(forTypeIdentifier: "io.robertying.learnx.not-a-type", visibility: .all) { _ in
      nil
    }
    item.attachments = [provider]
    #expect(SharedFileInbox.firstFile(in: [item]) == nil)
    #expect(SharedFileInbox.firstFile(in: []) == nil)
  }
}
