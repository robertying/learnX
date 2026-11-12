import CoreSpotlight
import Testing

@testable import LearnXSpotlight

/// Records what the module asks of the index.
final class FakeIndex: SearchableIndex, @unchecked Sendable {
  enum Call: Equatable {
    case deleteDomains([String])
    case deleteIdentifiers([String])
    case deleteAll
    case index([String])
  }

  var calls: [Call] = []
  var indexedItems: [CSSearchableItem] = []
  /// Thrown by `indexSearchableItems`.
  var error: Error?

  func deleteSearchableItems(withDomainIdentifiers domainIdentifiers: [String]) async throws {
    calls.append(.deleteDomains(domainIdentifiers))
  }

  func deleteSearchableItems(withIdentifiers identifiers: [String]) async throws {
    calls.append(.deleteIdentifiers(identifiers))
  }

  func deleteAllSearchableItems() async throws {
    calls.append(.deleteAll)
  }

  func indexSearchableItems(_ items: [CSSearchableItem]) async throws {
    if let error {
      throw error
    }
    calls.append(.index(items.map(\.uniqueIdentifier)))
    indexedItems += items
  }
}

func spotlightItem(
  id: String,
  title: String = "Title",
  details: String = "Details",
  keywords: [String] = [],
  date: Double? = nil,
  dueDate: Double? = nil
) -> SpotlightItem {
  var item = SpotlightItem()
  item.id = id
  item.title = title
  item.details = details
  item.keywords = keywords
  item.date = date
  item.dueDate = dueDate
  return item
}

@Suite struct SpotlightItemTests {
  @Test func makesASearchableItemInItsDomain() {
    let item = spotlightItem(
      id: "42",
      title: "Homework 1",
      details: "Calculus",
      keywords: ["Calculus", "Homework"],
      date: 1_700_000_000_000,
      dueDate: 1_700_086_400_000
    ).searchableItem(domain: "assignment")

    #expect(item.uniqueIdentifier == "assignment:42")
    #expect(item.domainIdentifier == "assignment")
    #expect(item.expirationDate == .distantFuture)
    #expect(item.attributeSet.title == "Homework 1")
    #expect(item.attributeSet.displayName == "Homework 1")
    #expect(item.attributeSet.contentDescription == "Calculus")
    #expect(item.attributeSet.keywords == ["Calculus", "Homework"])
    #expect(item.attributeSet.contentCreationDate == Date(timeIntervalSince1970: 1_700_000_000))
    #expect(item.attributeSet.dueDate == Date(timeIntervalSince1970: 1_700_086_400))
  }

  @Test func digestChangesWithWhatTheResultShows() {
    let item = spotlightItem(id: "1")
    #expect(item.digest == spotlightItem(id: "1").digest)
    #expect(item.digest == spotlightItem(id: "2").digest)
    #expect(item.digest != spotlightItem(id: "1", title: "Other").digest)
    #expect(item.digest != spotlightItem(id: "1", keywords: ["a"]).digest)
    #expect(item.digest != spotlightItem(id: "1", dueDate: 1).digest)
    #expect(item.digest.count == 64)
  }

  @Test func leavesOutMissingDates() {
    let item = spotlightItem(id: "1").searchableItem(domain: "notice")
    #expect(item.attributeSet.contentCreationDate == nil)
    #expect(item.attributeSet.dueDate == nil)
  }
}

/// A record of what was indexed in a folder of its own.
func temporaryIndexedItems() -> IndexedItems {
  IndexedItems(directory: FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString))
}

func spotlightIndex(_ fake: FakeIndex, indexed: IndexedItems = temporaryIndexedItems()) -> SpotlightIndex {
  SpotlightIndex(index: fake, indexed: indexed)
}

@Suite struct SpotlightIndexTests {
  @Test func replacesADomain() async throws {
    let fake = FakeIndex()
    try await spotlightIndex(fake).replaceItems(
      domain: "notice",
      items: [spotlightItem(id: "1"), spotlightItem(id: "2")]
    )
    #expect(fake.calls == [.deleteDomains(["notice"]), .index(["notice:1", "notice:2"])])
  }

  @Test func replacingWithNothingOnlyClears() async throws {
    let fake = FakeIndex()
    try await spotlightIndex(fake).replaceItems(domain: "notice", items: [])
    #expect(fake.calls == [.deleteDomains(["notice"])])
  }

  @Test func updatesChangedAndRemovedItems() async throws {
    let fake = FakeIndex()
    try await spotlightIndex(fake).updateItems(
      domain: "assignment",
      items: [spotlightItem(id: "3")],
      removedIds: ["1", "2"]
    )
    #expect(fake.calls == [.deleteIdentifiers(["assignment:1", "assignment:2"]), .index(["assignment:3"])])
  }

  @Test func updatingWithNothingDoesNothing() async throws {
    let fake = FakeIndex()
    try await spotlightIndex(fake).updateItems(domain: "assignment", items: [], removedIds: [])
    #expect(fake.calls.isEmpty)
  }

  @Test func removesEverything() async throws {
    let fake = FakeIndex()
    let indexed = temporaryIndexedItems()
    try indexed.save(["1": "a"], domain: "notice")
    try await spotlightIndex(fake, indexed: indexed).removeAllItems()
    #expect(fake.calls == [.deleteAll])
    #expect(indexed.load(domain: "notice") == nil)
  }

  @Test func syncReplacesADomainItHasNoRecordOf() async throws {
    let fake = FakeIndex()
    let indexed = temporaryIndexedItems()
    try await spotlightIndex(fake, indexed: indexed).syncItems(
      domain: "notice",
      items: [spotlightItem(id: "1"), spotlightItem(id: "2")]
    )
    #expect(fake.calls == [.deleteDomains(["notice"]), .index(["notice:1", "notice:2"])])
    #expect(indexed.load(domain: "notice")?.keys.sorted() == ["1", "2"])
  }

  @Test func syncAfterARelaunchSendsOnlyWhatChangedOrWent() async throws {
    let indexed = temporaryIndexedItems()
    try await spotlightIndex(FakeIndex(), indexed: indexed).syncItems(
      domain: "notice",
      items: [spotlightItem(id: "1"), spotlightItem(id: "2"), spotlightItem(id: "3")]
    )

    // A new index value, as after a relaunch; the record is on disk.
    let fake = FakeIndex()
    try await spotlightIndex(fake, indexed: indexed).syncItems(
      domain: "notice",
      items: [spotlightItem(id: "1"), spotlightItem(id: "2", title: "Renamed"), spotlightItem(id: "4")]
    )
    #expect(fake.calls == [.deleteIdentifiers(["notice:3"]), .index(["notice:2", "notice:4"])])
    #expect(indexed.load(domain: "notice")?.keys.sorted() == ["1", "2", "4"])
  }

  @Test func syncWithNothingChangedDoesNothing() async throws {
    let indexed = temporaryIndexedItems()
    let items = [spotlightItem(id: "1")]
    try await spotlightIndex(FakeIndex(), indexed: indexed).syncItems(domain: "notice", items: items)
    let fake = FakeIndex()
    try await spotlightIndex(fake, indexed: indexed).syncItems(domain: "notice", items: items)
    #expect(fake.calls.isEmpty)
  }

  @Test func syncForgetsTheDomainWhenIndexingFails() async throws {
    let indexed = temporaryIndexedItems()
    try indexed.save(["1": "a"], domain: "notice")
    let fake = FakeIndex()
    fake.error = CocoaError(.fileWriteUnknown)
    await #expect(throws: CocoaError.self) {
      try await spotlightIndex(fake, indexed: indexed).syncItems(domain: "notice", items: [spotlightItem(id: "2")])
    }
    #expect(indexed.load(domain: "notice") == nil)
  }

  @Test func usesTheDevicesIndex() {
    // The simulator can index.
    #expect(SpotlightIndex.system?.index is CSSearchableIndex)
  }
}
