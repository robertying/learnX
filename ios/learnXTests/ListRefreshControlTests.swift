import Testing
import UIKit

@testable import learnX

/// The app has launched, so `keepRefreshControlAboveRows` has run.
@MainActor
@Suite struct ListRefreshControlTests {
  private func list() -> UICollectionView {
    UICollectionView(
      frame: CGRect(x: 0, y: 0, width: 320, height: 480),
      collectionViewLayout: UICollectionViewFlowLayout()
    )
  }

  @Test func drawsTheRefreshControlAboveRowsAddedBeforeIt() {
    let list = list()
    let row = UIView()
    list.addSubview(row)

    let control = UIRefreshControl()
    list.refreshControl = control
    #expect(list.refreshControl === control)
    // UIKit still puts it behind the row; its layer draws it above, and below
    // the scroll indicators.
    #expect(control.layer.zPosition == 1)
    #expect(row.layer.zPosition == 0)
  }

  @Test func clearsTheRefreshControl() {
    let list = list()
    list.refreshControl = UIRefreshControl()
    list.refreshControl = nil
    #expect(list.refreshControl == nil)
  }

  @Test func leavesAPlainScrollViewsRefreshControlAlone() {
    let scrollView = UIScrollView()
    let control = UIRefreshControl()
    scrollView.refreshControl = control
    #expect(scrollView.refreshControl === control)
    #expect(control.layer.zPosition == 0)
  }
}
