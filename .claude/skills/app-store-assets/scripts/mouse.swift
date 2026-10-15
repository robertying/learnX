import CoreGraphics
import Foundation
// usage: mouse press x y secs | mouse drag x1 y1 x2 y2 secs
let a = CommandLine.arguments
func post(_ t: CGEventType, _ x: Double, _ y: Double) {
  CGEvent(mouseEventSource: nil, mouseType: t, mouseCursorPosition: CGPoint(x: x, y: y), mouseButton: .left)!.post(tap: .cghidEventTap)
}
if a[1] == "press" {
  let x = Double(a[2])!, y = Double(a[3])!, s = Double(a[4])!
  post(.mouseMoved, x, y); usleep(100000); post(.leftMouseDown, x, y); usleep(UInt32(s * 1_000_000)); post(.leftMouseUp, x, y)
} else {
  let x1 = Double(a[2])!, y1 = Double(a[3])!, x2 = Double(a[4])!, y2 = Double(a[5])!, s = Double(a[6])!
  post(.mouseMoved, x1, y1); usleep(100000); post(.leftMouseDown, x1, y1)
  let n = 20
  for i in 1...n { let t = Double(i) / Double(n); post(.leftMouseDragged, x1 + (x2 - x1) * t, y1 + (y2 - y1) * t); usleep(UInt32(s * 1_000_000 / Double(n))) }
  post(.leftMouseUp, x2, y2)
}
