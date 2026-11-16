import BackgroundTasks
import Foundation
import Testing

@testable internal import ExpoBackgroundTask

/// What patches/expo-background-task@58.0.13.patch changes: the sync is submitted as a background app refresh task,
/// which iOS runs through the day, not a processing task, which it runs only when the device is idle.
@Suite(.serialized) struct ExpoBackgroundTaskPatchTests {
  /// Records the requests the scheduler submits instead of handing them to the system.
  private final class RecordingScheduler: BackgroundTaskScheduling, @unchecked Sendable {
    private let lock = NSLock()
    private var submitted: [BGTaskRequest] = []

    var requests: [BGTaskRequest] {
      lock.withLock { submitted }
    }

    func cancel(taskRequestWithIdentifier identifier: String) {
      lock.withLock { submitted.removeAll { $0.identifier == identifier } }
    }

    func submit(_ request: BGTaskRequest) throws {
      lock.withLock { submitted.append(request) }
    }

    func pendingTaskRequests() async -> [BGTaskRequest] {
      requests
    }
  }

  @Test func submitsAnAppRefreshRequest() async throws {
    let scheduler = RecordingScheduler()
    await BackgroundTaskScheduler.resetForTesting(registeredTaskCount: 1)
    await BackgroundTaskScheduler.setSchedulerForTesting(scheduler)
    // The app delegate only registers the handler on a device, so the scheduler is let through here.
    BackgroundTaskScheduler.bgTaskSchedulerDidFinishRegister()

    let before = Date()
    var failure: (any Error)?
    do {
      try await BackgroundTaskScheduler.tryScheduleWorker()
    } catch {
      failure = error
    }
    // Back to the system scheduler and no registered tasks, as the app starts.
    await BackgroundTaskScheduler.resetForTesting()
    if let failure { throw failure }

    #expect(scheduler.requests.count == 1)
    let request = try #require(scheduler.requests.first)
    #expect(request is BGAppRefreshTaskRequest)
    #expect(!(request is BGProcessingTaskRequest))
    // The identifier listed in Info.plist's BGTaskSchedulerPermittedIdentifiers.
    #expect(request.identifier == "com.expo.modules.backgroundtask.processing")
    // Not before the 12-hour default interval, as nothing set another.
    let earliest = try #require(request.earliestBeginDate)
    #expect(earliest.timeIntervalSince(before) >= 12 * 60 * 60 - 1)
  }

  @Test func infoPlistAllowsBackgroundFetch() throws {
    let info = try #require(Bundle.main.infoDictionary)
    let modes = try #require(info["UIBackgroundModes"] as? [String])
    #expect(modes.contains("fetch"))
    let identifiers = try #require(info["BGTaskSchedulerPermittedIdentifiers"] as? [String])
    #expect(identifiers.contains("com.expo.modules.backgroundtask.processing"))
  }
}
