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
    attributes.contentDescription = details
    attributes.keywords = keywords
    attributes.contentCreationDate = date.map(Date.init(milliseconds:))
    attributes.dueDate = dueDate.map(Date.init(milliseconds:))
    return CSSearchableItem(
      uniqueIdentifier: SpotlightIdentifier(domain: domain, id: id).rawValue,
      domainIdentifier: domain,
      attributeSet: attributes
    )
  }
}

struct UpcomingDeadlineRecord: Record {
  @Field var id: String = ""
  @Field var title: String = ""
  @Field var courseName: String = ""
  /// Milliseconds since the epoch.
  @Field var deadline: Double = 0
}

struct UpcomingClassRecord: Record {
  @Field var courseName: String = ""
  @Field var location: String = ""
  /// Milliseconds since the epoch.
  @Field var start: Double = 0
  @Field var end: Double = 0
}

/// Indexes the app's items in Spotlight, hands the item of a tapped search result to JS, and keeps the upcoming
/// deadlines and classes for the "Next Deadline" and "Next Class" App Intents.
public final class SpotlightModule: Module {
  public func definition() -> ModuleDefinition {
    Name("Spotlight")

    Events("onOpenItem")

    OnStartObserving {
      SpotlightTaps.shared.setListener { [weak self] identifier in
        self?.sendEvent("onOpenItem", ["domain": identifier.domain, "id": identifier.id])
      }
    }

    OnStopObserving {
      SpotlightTaps.shared.setListener(nil)
    }

    /// The item of a search result tapped before JS listened, e.g. the one that launched the app.
    Function("takeOpenedItem") { () -> [String: String]? in
      guard let identifier = SpotlightTaps.shared.takePending() else {
        return nil
      }
      return ["domain": identifier.domain, "id": identifier.id]
    }

    /// Replaces the domain's items with these.
    AsyncFunction("replaceItems") { (domain: String, items: [SpotlightItem]) async throws in
      guard CSSearchableIndex.isIndexingAvailable() else {
        return
      }
      let index = CSSearchableIndex.default()
      try await index.deleteSearchableItems(withDomainIdentifiers: [domain])
      if !items.isEmpty {
        try await index.indexSearchableItems(items.map { $0.searchableItem(domain: domain) })
      }
    }

    AsyncFunction("removeAllItems") { () async throws in
      guard CSSearchableIndex.isIndexingAvailable() else {
        return
      }
      try await CSSearchableIndex.default().deleteAllSearchableItems()
    }

    Function("setUpcomingDeadlines") { (deadlines: [UpcomingDeadlineRecord]) in
      UpcomingDeadlines.save(
        deadlines.map {
          UpcomingDeadline(
            id: $0.id,
            title: $0.title,
            courseName: $0.courseName,
            deadline: Date(milliseconds: $0.deadline)
          )
        }
      )
    }

    Function("setUpcomingClasses") { (classes: [UpcomingClassRecord]) in
      UpcomingClasses.save(
        classes.map {
          UpcomingClass(
            courseName: $0.courseName,
            location: $0.location,
            start: Date(milliseconds: $0.start),
            end: Date(milliseconds: $0.end)
          )
        }
      )
    }
  }
}

extension Date {
  init(milliseconds: Double) {
    self.init(timeIntervalSince1970: milliseconds / 1000)
  }
}
