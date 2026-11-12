import Foundation
import Testing

@testable import LearnXSpotlight

@Suite struct IndexedItemsTests {
  @Test func savesAndLoadsEachDomain() throws {
    let indexed = temporaryIndexedItems()
    #expect(indexed.load(domain: "notice") == nil)

    try indexed.save(["1": "a"], domain: "notice")
    try indexed.save(["2": "b"], domain: "file")
    #expect(indexed.load(domain: "notice") == ["1": "a"])
    #expect(indexed.load(domain: "file") == ["2": "b"])

    indexed.remove(domain: "notice")
    #expect(indexed.load(domain: "notice") == nil)
    #expect(indexed.load(domain: "file") == ["2": "b"])

    indexed.removeAll()
    #expect(indexed.load(domain: "file") == nil)
  }

  @Test func forgetsAnUnreadableRecord() throws {
    let indexed = temporaryIndexedItems()
    try FileManager.default.createDirectory(at: indexed.directory, withIntermediateDirectories: true)
    try Data("not json".utf8).write(to: indexed.directory.appendingPathComponent("notice.json"))
    #expect(indexed.load(domain: "notice") == nil)
  }

  @Test func keepsTheRecordInApplicationSupport() throws {
    let standard = try #require(IndexedItems.standard)
    #expect(standard.directory.lastPathComponent == "LearnXSpotlight")
    #expect(standard.directory.deletingLastPathComponent().lastPathComponent == "Application Support")
  }
}
