import CoreSpotlight
import Testing

@testable import LearnXSpotlight

/// Records what the module asks of the index.
final class FakeIndex: SearchableIndex, @unchecked Sendable {
  enum Call: Equatable {
    case begin
    case end(String)
    case deleteDomains([String])
    case deleteIdentifiers([String])
    case deleteAll
    case index([String])
  }

  var calls: [Call] = []
  var indexedItems: [CSSearchableItem] = []
  var clientState: Data?

  func beginBatch() {
    calls.append(.begin)
  }

  func endBatch(withClientState clientState: Data) async throws {
    calls.append(.end(String(decoding: clientState, as: UTF8.self)))
    self.clientState = clientState
  }

  func lastClientState() async throws -> Data? {
    clientState
  }

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

  @Test func leavesOutMissingDates() {
    let item = spotlightItem(id: "1").searchableItem(domain: "notice")
    #expect(item.attributeSet.contentCreationDate == nil)
    #expect(item.attributeSet.dueDate == nil)
  }
}

@Suite struct SpotlightIndexTests {
  @Test func replacesADomainInABatch() async throws {
    let fake = FakeIndex()
    try await SpotlightIndex(index: fake).replaceItems(
      domain: "notice",
      items: [spotlightItem(id: "1"), spotlightItem(id: "2")],
      state: "a1"
    )
    #expect(fake.calls == [.deleteDomains(["notice"]), .begin, .index(["notice:1", "notice:2"]), .end("a1")])
  }

  @Test func replacingWithNothingOnlyClears() async throws {
    let fake = FakeIndex()
    try await SpotlightIndex(index: fake).replaceItems(domain: "notice", items: [], state: "a1")
    #expect(fake.calls == [.deleteDomains(["notice"]), .begin, .end("a1")])
  }

  @Test func updatesChangedAndRemovedItems() async throws {
    let fake = FakeIndex()
    try await SpotlightIndex(index: fake).updateItems(
      domain: "assignment",
      items: [spotlightItem(id: "3")],
      removedIds: ["1", "2"],
      state: "b2"
    )
    #expect(
      fake.calls == [
        .begin, .deleteIdentifiers(["assignment:1", "assignment:2"]), .index(["assignment:3"]), .end("b2"),
      ]
    )
  }

  @Test func updatingWithNothingOnlyStoresTheState() async throws {
    let fake = FakeIndex()
    try await SpotlightIndex(index: fake).updateItems(domain: "assignment", items: [], removedIds: [], state: "b2")
    #expect(fake.calls == [.begin, .end("b2")])
  }

  @Test func removesEverythingAlsoFromTheLegacyIndex() async throws {
    let fake = FakeIndex()
    let legacy = FakeIndex()
    try await SpotlightIndex(index: fake, legacyIndex: legacy).removeAllItems(state: "c3")
    #expect(legacy.calls == [.deleteAll])
    #expect(fake.calls == [.deleteAll, .begin, .end("c3")])
  }

  @Test func readsTheStoredState() async throws {
    let fake = FakeIndex()
    let index = SpotlightIndex(index: fake)
    #expect(try await index.state() == nil)
    try await index.replaceItems(domain: "file", items: [], state: "d4")
    #expect(try await index.state() == "d4")
  }

  @Test func usesANamedIndexOnTheDevice() throws {
    // The simulator can index.
    let system = try #require(SpotlightIndex.system)
    #expect(system.index is CSSearchableIndex)
    #expect(system.legacyIndex is CSSearchableIndex)
  }
}
