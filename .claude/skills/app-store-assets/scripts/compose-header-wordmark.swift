import AppKit
import ImageIO
// usage: compose-header-wordmark <out.png> [W H] [text] [tagline]   (default 3840 1646 "learnX", no tagline)
// Fonts: the system font (SF Pro; falls back to PingFang SC for Chinese): "learn" light + "X" semibold, tagline regular.
// Header artwork: the app name as a centred wordmark on the light store gradient (no icon: the store shows the app icon next to the header).
let a = CommandLine.arguments
let W = a.count > 3 ? Int(a[2])! : 3840, H = a.count > 3 ? Int(a[3])! : 1646
let text = a.count > 4 ? a[4] : "learnX"
let tagline = a.count > 5 ? a[5] : ""
let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: W, pixelsHigh: H, bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
let w = CGFloat(W), h = CGFloat(H)
NSGradient(starting: NSColor(red: 0.60, green: 0.31, blue: 0.79, alpha: 1), ending: NSColor(red: 0.29, green: 0.52, blue: 0.80, alpha: 1))!.draw(in: NSRect(x: 0, y: 0, width: w, height: h), angle: -35)
let size = h * 0.32
let thin = NSFont.systemFont(ofSize: size, weight: .light), heavy = NSFont.systemFont(ofSize: size, weight: .semibold)
let s = NSMutableAttributedString(string: text, attributes: [.font: thin, .foregroundColor: NSColor.white])
if text.hasSuffix("X") { s.addAttributes([.font: heavy], range: NSRange(location: text.count - 1, length: 1)) }
let sh = NSShadow(); sh.shadowColor = NSColor(white: 0, alpha: 0.25); sh.shadowBlurRadius = 40; sh.shadowOffset = NSSize(width: 0, height: -10); sh.set()
let tw = s.size().width, th = s.size().height
let tagAttr = NSAttributedString(string: tagline, attributes: [.font: NSFont.systemFont(ofSize: h * 0.085, weight: .regular), .foregroundColor: NSColor(white: 1, alpha: 0.92), .kern: h * 0.012])
let gap = tagline.isEmpty ? 0 : h * 0.07
let tagH = tagline.isEmpty ? 0 : tagAttr.size().height
let blockH = th + gap + tagH
let top = (h + blockH) / 2   // CG coordinates: y grows upwards
s.draw(at: NSPoint(x: (w - tw) / 2, y: top - th))
if !tagline.isEmpty { tagAttr.draw(at: NSPoint(x: (w - tagAttr.size().width) / 2, y: top - th - gap - tagH)) }
NSGraphicsContext.restoreGraphicsState()
let out = CGContext(data: nil, width: W, height: H, bitsPerComponent: 8, bytesPerRow: 0, space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue)!
out.draw(rep.cgImage!, in: CGRect(x: 0, y: 0, width: W, height: H))
let dst = CGImageDestinationCreateWithURL(URL(fileURLWithPath: a[1]) as CFURL, "public.png" as CFString, 1, nil)!
CGImageDestinationAddImage(dst, out.makeImage()!, nil)
CGImageDestinationFinalize(dst)
