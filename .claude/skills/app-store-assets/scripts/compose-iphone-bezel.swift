import AppKit
import ImageIO
// usage: compose-iphone-bezel <screenshot.png> <PhoneComposite.pdf> <icon.png> <out.png> <W> <H> header|search [tile]
// env SHOT2=<screenshot.png>: add a second, staggered phone (bleeds off the top, shows the bottom half of the screen).
// header = [icon] [phone 1 (bleeds off the bottom)] [phone 2 (bleeds off the top)], the group centred horizontally. search = the two phones only.
// The icon is drawn as is (full-bleed regular app icon); pass "tile" to put the glyph icon on a white tile instead.
// Bezel: DeviceKit PhoneComposite.pdf (phone11 = iPhone 18 Pro, phone12 = 18 Pro Max), 17 pt ring around a 3x screenshot.
let a = CommandLine.arguments
let shot = NSImage(contentsOfFile: a[1])!, icon = NSImage(contentsOfFile: a[3])!
let shot2: NSImage? = ProcessInfo.processInfo.environment["SHOT2"].flatMap { NSImage(contentsOfFile: $0) }
let pdf = CGPDFDocument(URL(fileURLWithPath: a[2]) as CFURL)!.page(at: 1)!
let W = Int(a[5])!, H = Int(a[6])!, mode = a[7]
let tileIcon = a.count > 8 && a[8] == "tile"
let box = pdf.getBoxRect(.mediaBox)
let sw = shot.size.width, sh = shot.size.height
let ring = (box.width - sw / 3) / 2
let k = sw / (box.width - 2 * ring)
let devW = box.width * k, devH = box.height * k

let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: W, pixelsHigh: H, bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
NSGraphicsContext.saveGraphicsState()
let g = NSGraphicsContext(bitmapImageRep: rep)!
NSGraphicsContext.current = g
let ctx = g.cgContext
let w = CGFloat(W), h = CGFloat(H)
// same light purple-to-blue gradient as the App Store Mac originals
NSGradient(starting: NSColor(red: 0.60, green: 0.31, blue: 0.79, alpha: 1), ending: NSColor(red: 0.29, green: 0.52, blue: 0.80, alpha: 1))!.draw(in: NSRect(x: 0, y: 0, width: w, height: h), angle: -35)

let two = shot2 != nil
let targetH = two ? (mode == "header" ? h * 1.45 : h * 1.35) : (mode == "header" ? h * 1.30 : h * 1.06)
let scale = targetH / devH
let dw = devW * scale, dh = devH * scale
let phoneGap = h * 0.03
let iconSize = h * 0.42, iconGap = h * 0.12
let phonesW = two ? dw * 2 + phoneGap : dw
let groupW = (mode == "header" ? iconSize + iconGap : 0) + phonesW
let groupX = (w - groupW) / 2
let phonesX = groupX + (mode == "header" ? iconSize + iconGap : 0)

func drawDevice(_ img: NSImage, x: CGFloat, y: CGFloat) {   // x, y = bottom-left in CG coordinates
  ctx.saveGState()
  ctx.setShadow(offset: CGSize(width: 0, height: -24), blur: 70, color: NSColor(white: 0, alpha: 0.4).cgColor)
  let rr = 80.0 * k * scale
  ctx.setFillColor(NSColor.black.cgColor)
  ctx.addPath(CGPath(roundedRect: CGRect(x: x, y: y, width: dw, height: dh), cornerWidth: rr, cornerHeight: rr, transform: nil)); ctx.fillPath()
  ctx.restoreGState()
  ctx.saveGState()
  ctx.translateBy(x: x, y: y); ctx.scaleBy(x: dw / box.width, y: dh / box.height)
  ctx.drawPDFPage(pdf)
  ctx.restoreGState()
  let sRect = CGRect(x: x + ring * k * scale, y: y + ring * k * scale, width: img.size.width * scale, height: img.size.height * scale)
  ctx.saveGState()
  let sr = 62.0 * k * scale
  ctx.addPath(CGPath(roundedRect: sRect, cornerWidth: sr, cornerHeight: sr, transform: nil)); ctx.clip()
  img.draw(in: sRect)
  ctx.restoreGState()
}

// phone 1: top near the top edge, bleeding off the bottom
let topMargin = mode == "header" ? h * 0.10 : h * 0.07
drawDevice(shot, x: phonesX, y: h - topMargin - dh)
// phone 2: bottom near the bottom edge, bleeding off the top, so it shows the lower part of the screen
if let s2 = shot2 { drawDevice(s2, x: phonesX + dw + phoneGap, y: h * 0.07) }

if mode == "header" {
  let isz = iconSize, ix = groupX, iy = h * 0.5 - isz / 2
  ctx.saveGState()
  ctx.setShadow(offset: CGSize(width: 0, height: -12), blur: 40, color: NSColor(white: 0, alpha: 0.3).cgColor)
  if tileIcon { NSColor.white.setFill(); NSBezierPath(roundedRect: NSRect(x: ix, y: iy, width: isz, height: isz), xRadius: isz * 0.225, yRadius: isz * 0.225).fill() }
  icon.draw(in: NSRect(x: ix, y: iy, width: isz, height: isz))
  ctx.restoreGState()
}
NSGraphicsContext.restoreGraphicsState()
let out = CGContext(data: nil, width: W, height: H, bitsPerComponent: 8, bytesPerRow: 0, space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue)!
out.draw(rep.cgImage!, in: CGRect(x: 0, y: 0, width: W, height: H))
let dst = CGImageDestinationCreateWithURL(URL(fileURLWithPath: a[4]) as CFURL, "public.png" as CFString, 1, nil)!
CGImageDestinationAddImage(dst, out.makeImage()!, nil)
CGImageDestinationFinalize(dst)
