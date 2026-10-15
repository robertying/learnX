import AppKit
// fixhandle in.png out.jpg : paints out the Android large-screen app handle (top centre) with the adjacent header colour
let a = CommandLine.arguments
let rep = NSBitmapImageRep(data: try! Data(contentsOf: URL(fileURLWithPath: a[1])))!
let w = rep.pixelsWide
for y in 0..<110 {
  var c = [Int](repeating: 0, count: 4)
  rep.getPixel(&c, atX: 1120, y: y)
  for x in 1150..<1410 { rep.setPixel(&c, atX: x, y: y) }
}
// no alpha: re-render opaque JPEG
let jpg = rep.representation(using: .jpeg, properties: [.compressionFactor: 1.0])!
try! jpg.write(to: URL(fileURLWithPath: a[2]))
