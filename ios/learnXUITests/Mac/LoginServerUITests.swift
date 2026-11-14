#if targetEnvironment(macCatalyst)
import XCTest

/// The Mac's `.maestro/00-login-check.yaml`: the mock account never touches the network, so this logs in through the
/// real SSO login with an account that doesn't exist and waits for the server's wrong-password answer. It catches a
/// release build whose login can't reach or read id.tsinghua.edu.cn. The made-up username and fingerprint go in as
/// the test login's launch arguments (E2E builds only, `services/launchOptions.ts`), so the login never adds a device.
@MainActor
final class LoginServerUITests: LearnXUITestCase {
  private let nobody = "learnx-e2e-nobody"

  /// Launches with the test login instead of logging in with the mock account.
  override func setUp() async throws {
    continueAfterFailure = false
    app = XCUIApplication()
    app.launchArguments += [
      "-AppleLanguages", "(zh-Hans)", "-AppleLocale", "zh_CN",
      "-liveUsername", nobody, "-liveFingerprint", String(repeating: "0", count: 32),
    ]
    app.launch()
  }

  func testReachesTheLoginServer() throws {
    let started = element(idMatching: "welcome-continue|login-username|tab-notices")
    XCTAssertTrue(started.waitForExistence(timeout: 60), "the app didn't start")
    if element(id: "tab-notices").exists {
      let whatsNew = element(id: "whats-new-continue")
      if whatsNew.waitForExistence(timeout: 3) {
        whatsNew.click()
      }
      try logOut()
    }
    let welcome = element(id: "welcome-continue")
    if welcome.exists {
      welcome.click()
    }

    try type(nobody, into: waitFor(id: "login-username"))
    // The password field submits the login on return.
    try type("not-a-password\n", into: waitFor(id: "login-password"))
    // thu-learn-lib's FailReason.BAD_CREDENTIAL starts the failure toast, then what the server said.
    try waitFor(matching: "bad credential(.|\\n)*", timeout: 30)
  }
}
#endif
