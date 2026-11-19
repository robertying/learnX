#if targetEnvironment(macCatalyst)
import XCTest

/// `.maestro/10-errors.yaml`: the failures the `mockFailure`, `mockSessionExpiry` and `mockLoginFails` launch
/// arguments emulate (`services/launchOptions.ts`), each after a relaunch with the mock account logged in. A search
/// that finds nothing is in `SearchUITests`.
@MainActor
final class ErrorsUITests: LearnXUITestCase {
  /// The lists keep what they had and say they're offline, and a file that isn't on the Mac can't download (one no
  /// other test opens).
  func testOffline() throws {
    try launch(["mockFailure": "offline"])
    try waitFor(text: "T_syncStatusOffline", timeout: 30)
    try open(tab: "tab-files")
    try open(card: "file-card", "MOCK_IMAGE_FILE", detail: "file-detail")
    try waitFor(id: "file-error", timeout: 30)
    try waitFor(label: "T_tryAgain").click()
    try waitFor(id: "file-error", timeout: 30)
  }

  /// A server that answers with errors: the login fails after its retries, and the lists offer to log in again.
  func testServerError() throws {
    try launch(["mockFailure": "serverError"])
    try waitFor(text: "T_syncStatusLoginFailed", timeout: 30)
    try waitFor(id: "sync-status-relogin")
  }

  /// A server that doesn't answer: the login times out (the mock server's 20 s timeout) and counts as offline, then
  /// tries again on its own (`helpers/loginRetry`'s 30 s), reconnecting meanwhile. Both waits are scaled down to a
  /// fifth (`quickTimeout`).
  func testTimeout() throws {
    try launch(["mockFailure": "quickTimeout"])
    try waitFor(text: "T_syncStatusOffline", timeout: 15)
    try waitFor(text: "T_syncStatusReconnecting", timeout: 15)
  }

  /// A password changed on the website while the app is open: the session runs out after the launch login, and the
  /// next login is turned down.
  func testPasswordChangedWhileOpen() throws {
    try launch(["mockSessionExpiry": "passwordChanged"])
    try waitFor(id: "sync-status-relogin", timeout: 30)
    try waitFor(text: "T_syncStatusLoginFailed")
  }

  /// A saved login the server turns down: the launch login and the next one are rejected, the third goes through.
  func testRejectedLogin() throws {
    try launch(["mockLoginFails": "2"])
    try waitFor(id: "sync-status-relogin", timeout: 30).click()
    // Log In opens the login page with the saved account filled in; its login is rejected too, and the page stays,
    // saying why.
    try waitFor(id: "login-username")
    try waitFor(label: "T_retryLogin").click()
    try waitFor(matching: "bad credential(.|\\n)*", timeout: 30)
    XCTAssertTrue(element(id: "login-username").exists, "the login page closed")
    // Continue Offline goes back to the saved data, still offering to log in.
    try waitFor(label: "T_offlineMode").click()
    try waitFor(id: "sync-status-relogin").click()
    try waitFor(label: "T_retryLogin").click()
    try waitFor(id: "tab-notices", timeout: 30)
    waitForAbsence(id: "login-username")
    waitForAbsence(id: "sync-status-relogin")
  }
}
#endif
