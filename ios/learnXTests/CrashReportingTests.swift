internal import LearnXCrashlytics
import Testing

@testable import learnX

/// The tests run inside the app, so it has started Firebase already.
@MainActor
@Suite struct CrashReportingTests {
  @Test func handsTheModuleCrashlytics() {
    #expect(CrashlyticsModule.reporter is CrashlyticsReporter)
  }

  @Test func makesTheJSFramesTheStack() {
    let exception = CrashlyticsReporter.exception(
      name: "TypeError",
      reason: "undefined is not a function",
      frames: [
        CrashFrame(symbol: "render", file: "index.bundle:10:4", line: 10),
        CrashFrame(symbol: "<global>", file: "index.bundle:1:0", line: 1),
      ]
    )
    #expect(exception.stackTrace.count == 2)
  }
}
