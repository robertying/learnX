import AppKit
import ImageIO
let a = CommandLine.arguments
let win = NSImage(contentsOfFile: a[1])!, icon = NSImage(contentsOfFile: a[2])!
let W = Int(a[4])!, H = Int(a[5])!, kind = a[6]
let rawIcon = a.count > 7 && a[7] == "raw"
let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: W, pixelsHigh: H, bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
let w = CGFloat(W), h = CGFloat(H)
let full = NSRect(x: 0, y: 0, width: w, height: h)
if kind == "screenshot" { NSColor.black.setFill(); full.fill() }
// every kind uses the same light gradient as the App Store originals
else { let store = true; NSGradient(starting: store ? NSColor(red: 0.60, green: 0.31, blue: 0.79, alpha: 1) : NSColor(red: 0.43, green: 0.16, blue: 0.70, alpha: 1), ending: store ? NSColor(red: 0.29, green: 0.52, blue: 0.80, alpha: 1) : NSColor(red: 0.13, green: 0.31, blue: 0.69, alpha: 1))!.draw(in: full, angle: -35) }
let ar = win.size.width / win.size.height
var ww: CGFloat, wh: CGFloat, wx: CGFloat, wy: CGFloat
switch kind {
case "screenshot": ww = w * 0.90; wh = ww / ar; wx = (w - ww) / 2; wy = (h - wh) / 2
case "store": ww = w * 0.715; wh = ww / ar; wx = (w - ww) / 2; wy = (h - wh) / 2
case "universal": let safeH = min(h, w * 9 / 21); wh = safeH * 0.92; ww = wh * ar; wx = (w - ww) / 2; wy = (h - wh) / 2   // 16:9 source for header + search crops, no icon
case "header": wh = h * 0.80; ww = wh * ar; let isz0 = h * 0.42, gap0 = h * 0.12; wx = (w - (isz0 + gap0 + ww)) / 2 + isz0 + gap0; wy = (h - wh) / 2
default: ww = w * 0.84; wh = ww / ar; wx = (w - ww) / 2; wy = (h - wh) / 2
}
NSGraphicsContext.current!.saveGraphicsState()
let sh = NSShadow(); sh.shadowColor = NSColor(white: 0, alpha: kind == "screenshot" ? 0 : 0.4); sh.shadowBlurRadius = 70; sh.shadowOffset = NSSize(width: 0, height: -24); sh.set()
win.draw(in: NSRect(x: wx, y: wy, width: ww, height: wh))
NSGraphicsContext.current!.restoreGraphicsState()
if kind == "header" {
  let isz = h * 0.42, ix = wx - h * 0.12 - isz, iy = h * 0.5 - isz / 2
  NSGraphicsContext.current!.saveGraphicsState()
  let s2 = NSShadow(); s2.shadowColor = NSColor(white: 0, alpha: 0.3); s2.shadowBlurRadius = 40; s2.shadowOffset = NSSize(width: 0, height: -12); s2.set()
  if !rawIcon { NSColor.white.setFill(); NSBezierPath(roundedRect: NSRect(x: ix, y: iy, width: isz, height: isz), xRadius: isz*0.225, yRadius: isz*0.225).fill() }
  icon.draw(in: NSRect(x: ix, y: iy, width: isz, height: isz))
  NSGraphicsContext.current!.restoreGraphicsState()
}
NSGraphicsContext.restoreGraphicsState()
let cg = rep.cgImage!
let ctx = CGContext(data: nil, width: W, height: H, bitsPerComponent: 8, bytesPerRow: 0, space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue)!
ctx.draw(cg, in: CGRect(x: 0, y: 0, width: W, height: H))
let out = CGImageDestinationCreateWithURL(URL(fileURLWithPath: a[3]) as CFURL, "public.png" as CFString, 1, nil)!
CGImageDestinationAddImage(out, ctx.makeImage()!, nil)
CGImageDestinationFinalize(out)
