import AppKit
import ImageIO
// usage: compose-android-feature <shot1.png> <shot2.png> <icon.png> <out.png> [W=1024] [H=500]
// Google Play feature graphic: icon on the left, two phones (rounded dark bezel, no device art) on the right,
// phone 1 bleeds off the bottom, phone 2 off the top. Same light purple-to-blue gradient as the store assets.
// Rendered at 4x, downscaled, written without alpha (Play rejects transparency).
let a = CommandLine.arguments
let shot1 = NSImage(contentsOfFile: a[1])!, shot2 = NSImage(contentsOfFile: a[2])!, icon = NSImage(contentsOfFile: a[3])!
let W = a.count > 5 ? Int(a[5])! : 1024, H = a.count > 6 ? Int(a[6])! : 500
let S = 4, RW = W * S, RH = H * S
let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: RW, pixelsHigh: RH, bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
NSGraphicsContext.saveGraphicsState()
let g = NSGraphicsContext(bitmapImageRep: rep)!
NSGraphicsContext.current = g
let ctx = g.cgContext
let w = CGFloat(RW), h = CGFloat(RH)
NSGradient(starting: NSColor(red: 0.60, green: 0.31, blue: 0.79, alpha: 1), ending: NSColor(red: 0.29, green: 0.52, blue: 0.80, alpha: 1))!.draw(in: NSRect(x: 0, y: 0, width: w, height: h), angle: -35)

let aspect = shot1.size.width / shot1.size.height
let devH = h * 1.05, ring = h * 0.016
let screenH = devH - 2 * ring, screenW = screenH * aspect
let devW = screenW + 2 * ring
let gap = w * 0.025, iconSize = h * 0.36, iconGap = w * 0.05
let groupW = iconSize + iconGap + devW * 2 + gap
var x = (w - groupW) / 2

func drawDevice(_ img: NSImage, x: CGFloat, y: CGFloat) {
  let rr = devW * 0.12
  ctx.saveGState()
  ctx.setShadow(offset: CGSize(width: 0, height: -h * 0.02), blur: h * 0.06, color: NSColor(white: 0, alpha: 0.4).cgColor)
  ctx.setFillColor(NSColor(white: 0.07, alpha: 1).cgColor)
  ctx.addPath(CGPath(roundedRect: CGRect(x: x, y: y, width: devW, height: devH), cornerWidth: rr, cornerHeight: rr, transform: nil)); ctx.fillPath()
  ctx.restoreGState()
  let r = CGRect(x: x + ring, y: y + ring, width: screenW, height: screenH)
  ctx.saveGState()
  ctx.addPath(CGPath(roundedRect: r, cornerWidth: rr - ring, cornerHeight: rr - ring, transform: nil)); ctx.clip()
  img.draw(in: r)
  ctx.restoreGState()
}

// icon
let iy = h / 2 - iconSize / 2
ctx.saveGState()
ctx.setShadow(offset: CGSize(width: 0, height: -h * 0.015), blur: h * 0.05, color: NSColor(white: 0, alpha: 0.3).cgColor)
icon.draw(in: NSRect(x: x, y: iy, width: iconSize, height: iconSize))
ctx.restoreGState()
x += iconSize + iconGap
drawDevice(shot1, x: x, y: h * 0.88 - devH)             // top near the top edge, bleeds off the bottom
drawDevice(shot2, x: x + devW + gap, y: h * 0.12)      // bottom near the bottom edge, bleeds off the top
NSGraphicsContext.restoreGraphicsState()
let out = CGContext(data: nil, width: W, height: H, bitsPerComponent: 8, bytesPerRow: 0, space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue)!
out.interpolationQuality = .high
out.draw(rep.cgImage!, in: CGRect(x: 0, y: 0, width: W, height: H))
let dst = CGImageDestinationCreateWithURL(URL(fileURLWithPath: a[4]) as CFURL, "public.png" as CFString, 1, nil)!
CGImageDestinationAddImage(dst, out.makeImage()!, nil)
CGImageDestinationFinalize(dst)
