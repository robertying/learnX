import CoreSpotlight
import ExpoModulesCore
import UniformTypeIdentifiers

struct SpotlightItem: Record {
  /// The item's id within its domain.
  @Field var id: String = ""
  @Field var title: String = ""
  @Field var details: String = ""
  @Field var keywords: [String] = []
  /// When it was published, in milliseconds since the epoch.
  @Field var date: Double?
  /// When it is due, in milliseconds since the epoch.
  @Field var dueDate: Double?

  func searchableItem(domain: String) -> CSSearchableItem {
    let attributes = CSSearchableItemAttributeSet(contentType: .text)
    attributes.title = title
    // Spotlight matches app content mainly on the display name.
    attributes.displayName = title
    attributes.contentDescription = details
    attributes.keywords = keywords
    attributes.contentCreationDate = date.map(Date.init(milliseconds:))
    attributes.dueDate = dueDate.map(Date.init(milliseconds:))
    let item = CSSearchableItem(
      uniqueIdentifier: SpotlightIdentifier(domain: domain, id: id).rawValue,
      domainIdentifier: domain,
      attributeSet: attributes
    )
    // Items expire after 30 days by default; these stay until the app removes them.
    item.expirationDate = Date.distantFuture
    return item
  }
}

struct UpcomingDeadlineRecord: Record {
  @Field var id: String = ""
  @Field var title: String = ""
  @Field var courseName: String = ""
  /// Milliseconds since the epoch.
  @Field var deadline: Double = 0

  var upcomingDeadline: UpcomingDeadline {
    UpcomingDeadline(id: id, title: title, courseName: courseName, deadline: Date(milliseconds: deadline))
  }
}

struct UpcomingClassRecord: Record {
  @Field var courseName: String = ""
  @Field var location: String = ""
  /// Milliseconds since the epoch.
  @Field var start: Double = 0
  @Field var end: Double = 0

  var upcomingClass: UpcomingClass {
    UpcomingClass(courseName: courseName, location: location, start: Date(milliseconds: start), end: Date(milliseconds: end))
  }
}

/// The parts of `CSSearchableIndex` the module uses, so tests can index into a fake.
protocol SearchableIndex {
  func beginBatch()
  func endBatch(withClientState clientState: Data) async throws
  func lastClientState() async throws -> Data?
  func deleteSearchableItems(withDomainIdentifiers domainIdentifiers: [String]) async throws
  func deleteSearchableItems(withIdentifiers identifiers: [String]) async throws
  func deleteAllSearchableItems() async throws
  func indexSearchableItems(_ items: [CSSearchableItem]) async throws
}

extension CSSearchableIndex: SearchableIndex {
  func lastClientState() async throws -> Data? {
    try await withCheckedThrowingContinuation { continuation in
      fetchLastClientState { state, error in
        if let error {
          continuation.resume(throwing: error)
        } else {
          continuation.resume(returning: state)
        }
      }
    }
  }
}

/// The app's items in a Spotlight index, one domain per type. Each change is a batch that ends by storing a state
/// string in the index itself, so the app can tell when the index no longer holds what it last wrote: iOS empties
/// it on a restore or a move to another device, when Show Content in Search is turned off, or when it rebuilds
/// Spotlight.
struct SpotlightIndex {
  let index: SearchableIndex
  /// The default index, which held the items before they were written in batches (it doesn't support them).
  var legacyIndex: SearchableIndex?

  /// The app's index on this device, or nil where it can't index.
  static var system: SpotlightIndex? {
    CSSearchableIndex.isIndexingAvailable()
      ? SpotlightIndex(index: CSSearchableIndex(name: "learnX"), legacyIndex: CSSearchableIndex.default())
      : nil
  }

  /// The state stored with the last change, or nil if there is none.
  func state() async throws -> String? {
    try await index.lastClientState().flatMap { String(data: $0, encoding: .utf8) }
  }

  /// Replaces the domain's items with these.
  func replaceItems(domain: String, items: [SpotlightItem], state: String) async throws {
    // Batches take only item writes and deletes by identifier.
    try await index.deleteSearchableItems(withDomainIdentifiers: [domain])
    try await batch(state: state) {
      if !items.isEmpty {
        try await index.indexSearchableItems(items.map { $0.searchableItem(domain: domain) })
      }
    }
  }

  /// Indexes new and changed items and removes the ones with `removedIds`, leaving the rest of the domain alone.
  func updateItems(domain: String, items: [SpotlightItem], removedIds: [String], state: String) async throws {
    try await batch(state: state) {
      if !removedIds.isEmpty {
        try await index.deleteSearchableItems(
          withIdentifiers: removedIds.map { SpotlightIdentifier(domain: domain, id: $0).rawValue }
        )
      }
      if !items.isEmpty {
        try await index.indexSearchableItems(items.map { $0.searchableItem(domain: domain) })
      }
    }
  }

  /// Removes everything the app indexed, also what older versions put in the default index.
  func removeAllItems(state: String) async throws {
    try await legacyIndex?.deleteAllSearchableItems()
    // Also resets the state.
    try await index.deleteAllSearchableItems()
    try await batch(state: state) {}
  }

  private func batch(state: String, _ changes: () async throws -> Void) async throws {
    index.beginBatch()
    try await changes()
    try await index.endBatch(withClientState: Data(state.utf8))
  }
}

/// Indexes the app's items in Spotlight, hands the item of a tapped search result to JS, and keeps the upcoming
/// deadlines and classes for the "Next Deadline" and "Next Class" App Intents.
public final class SpotlightModule: Module {
  public func definition() -> ModuleDefinition {
    Name("Spotlight")

    Events("onOpenItem")

    OnStartObserving(nil, startObserving)
    OnStopObserving(nil, Self.stopObserving)

    Function("takeOpenedItem", Self.takeOpenedItem)
    AsyncFunction("indexState") {
      try await Self.indexState()
    }
    AsyncFunction("replaceItems") { (domain: String, items: [SpotlightItem], state: String) in
      try await Self.replaceItems(domain: domain, items: items, state: state)
    }
    AsyncFunction("updateItems") { (domain: String, items: [SpotlightItem], removedIds: [String], state: String) in
      try await Self.updateItems(domain: domain, items: items, removedIds: removedIds, state: state)
    }
    AsyncFunction("removeAllItems") { (state: String) in
      try await Self.removeAllItems(state: state)
    }
    Function("setUpcomingDeadlines", Self.setUpcomingDeadlines)
    Function("setUpcomingClasses", Self.setUpcomingClasses)
  }

  func startObserving() {
    SpotlightTaps.shared.setListener { [weak self] identifier in
      self?.sendEvent("onOpenItem", identifier.payload)
    }
  }

  static func stopObserving() {
    SpotlightTaps.shared.setListener(nil)
  }

  /// The item of a search result tapped before JS listened, e.g. the one that launched the app.
  static func takeOpenedItem() -> [String: String]? {
    SpotlightTaps.shared.takePending()?.payload
  }

  static func indexState() async throws -> String? {
    try await SpotlightIndex.system?.state()
  }

  static func replaceItems(domain: String, items: [SpotlightItem], state: String) async throws {
    try await SpotlightIndex.system?.replaceItems(domain: domain, items: items, state: state)
  }

  static func updateItems(domain: String, items: [SpotlightItem], removedIds: [String], state: String) async throws {
    try await SpotlightIndex.system?.updateItems(domain: domain, items: items, removedIds: removedIds, state: state)
  }

  static func removeAllItems(state: String) async throws {
    try await SpotlightIndex.system?.removeAllItems(state: state)
  }

  static func setUpcomingDeadlines(_ deadlines: [UpcomingDeadlineRecord]) {
    UpcomingDeadlines.save(deadlines.map(\.upcomingDeadline))
  }

  static func setUpcomingClasses(_ classes: [UpcomingClassRecord]) {
    UpcomingClasses.save(classes.map(\.upcomingClass))
  }
}

extension Date {
  init(milliseconds: Double) {
    self.init(timeIntervalSince1970: milliseconds / 1000)
  }
}
