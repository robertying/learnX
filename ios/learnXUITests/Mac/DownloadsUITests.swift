#if targetEnvironment(macCatalyst)
import XCTest

/// `.maestro/09-downloads.yaml`: a file downloads and previews, Settings › Downloads lists its course, Export asks
/// where (cancelled here), and Delete removes each course's files. The mock file downloads from its real URL, so the
/// Mac needs the network.
@MainActor
final class DownloadsUITests: LearnXUITestCase {
  func testDownloadsAFileThenDeletesIt() throws {
    try open(tab: "tab-files")
    try open(card: "file-card", "MOCK_FILE", detail: "file-detail")
    waitForAbsence(id: "file-loading", timeout: 60)
    XCTAssertFalse(element(idMatching: "file-error|file-preview-failed").exists, "the file didn't preview")

    try openSetting("settings-downloads", page: "downloads")
    try waitFor(idMatching: "downloads-course-.*")
    try waitFor(id: "downloads-export").click()
    // The folder picker is the system's open panel, a sheet on the window.
    let panel = try waitFor(id: "open-panel")
    panel.buttons["CancelButton"].click()
    waitForAbsence(panel, "the folder picker")

    // Each course's files (other tests download some too).
    var course = element(idMatching: "downloads-course-.*")
    while course.exists {
      let id = course.identifier
      course.click()
      try alertButton("T_deleteEllipsis").click()
      try alertButton("T_delete").click()
      waitForAbsence(id: id)
      course = element(idMatching: "downloads-course-.*")
    }
  }
}
#endif
