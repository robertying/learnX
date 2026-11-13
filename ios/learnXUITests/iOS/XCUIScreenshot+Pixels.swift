#if !targetEnvironment(macCatalyst)
import UIKit
import XCTest

extension XCUIScreenshot {
  /// How many pixels in `rect` (in points) stand out from the lightest one by a quarter of the way to black or
  /// more: something drawn there, such as a spinner's spokes, rather than a plain background.
  func markedPixels(in rect: CGRect) -> Int {
    let pixels = luminances(in: rect)
    guard let lightest = pixels.max() else { return 0 }
    return pixels.filter { lightest - $0 > 0.25 }.count
  }

  /// The luminance (0 black to 1 white) of each pixel in `rect`, in points.
  func luminances(in rect: CGRect) -> [Double] {
    guard let cgImage = image.cgImage else { return [] }
    let scale = image.scale
    let crop = CGRect(x: rect.minX * scale, y: rect.minY * scale, width: rect.width * scale, height: rect.height * scale)
      .integral
    guard let cropped = cgImage.cropping(to: crop) else { return [] }
    let width = cropped.width
    let height = cropped.height
    var bytes = [UInt8](repeating: 0, count: width * height * 4)
    guard
      let context = CGContext(
        data: &bytes, width: width, height: height, bitsPerComponent: 8, bytesPerRow: width * 4,
        space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)
    else { return [] }
    context.draw(cropped, in: CGRect(x: 0, y: 0, width: width, height: height))
    return stride(from: 0, to: bytes.count, by: 4).map { i in
      (0.2126 * Double(bytes[i]) + 0.7152 * Double(bytes[i + 1]) + 0.0722 * Double(bytes[i + 2])) / 255
    }
  }
}
#endif
