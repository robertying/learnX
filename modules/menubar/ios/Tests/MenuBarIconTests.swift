import CoreGraphics
import Testing

@testable import LearnXMenuBar

struct MenuBarIconTests {
  @Test func fitsTheOutlineCenteredInTheIcon() {
    let size = CGSize(width: 14, height: 16)
    let points = MenuBarIcon.outline(fitting: size)
    #expect(points.count == MenuBarIcon.outline.count)
    let xs = points.map(\.x)
    let ys = points.map(\.y)
    // Tall art: it fills the height and is centered across.
    #expect(abs(ys.min()! - 0.0174) < 0.001)
    #expect(abs(ys.max()! - 16) < 0.001)
    #expect(abs((xs.min()! + xs.max()!) / 2 - 7) < 0.1)
    #expect(xs.allSatisfy { $0 >= 0 && $0 <= 14 })
  }

  @Test func keepsTheArtsShape() {
    let points = MenuBarIcon.outline(fitting: MenuBarIcon.artSize)
    #expect(points == MenuBarIcon.outline)
  }
}
