import CoreGraphics
import CoreText
import Foundation
import ImageIO
import UniformTypeIdentifiers

let projectRoot = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
let sourceDirectory = projectRoot.appendingPathComponent("public/share")
let outputDirectory = projectRoot.appendingPathComponent("public/share_download")
let qrURL = projectRoot.appendingPathComponent("public/opc-coach-qr.png")

try FileManager.default.createDirectory(at: outputDirectory, withIntermediateDirectories: true)

func loadImage(_ url: URL) throws -> CGImage {
  guard let source = CGImageSourceCreateWithURL(url as CFURL, nil),
        let image = CGImageSourceCreateImageAtIndex(source, 0, nil) else {
    throw NSError(domain: "ShareDownload", code: 1, userInfo: [NSLocalizedDescriptionKey: "无法读取图片：\(url.path)"])
  }
  return image
}

func drawText(_ text: String, at point: CGPoint, context: CGContext) {
  let font = CTFontCreateWithName("PingFangSC-Medium" as CFString, 30, nil)
  let attributes: [CFString: Any] = [
    kCTFontAttributeName: font,
    kCTForegroundColorAttributeName: CGColor(red: 47 / 255, green: 42 / 255, blue: 42 / 255, alpha: 1),
  ]
  let attributedString = NSAttributedString(string: text, attributes: attributes as? [NSAttributedString.Key: Any])
  let line = CTLineCreateWithAttributedString(attributedString)
  context.textPosition = point
  CTLineDraw(line, context)
}

let qrImage = try loadImage(qrURL)

for number in 1...16 {
  let posterImage = try loadImage(sourceDirectory.appendingPathComponent("\(number).png"))
  let width = posterImage.width
  let height = posterImage.height
  let adjustedPositionNumbers: Set<Int> = [3, 7, 8, 10, 11, 12, 13, 14]
  var contentX = adjustedPositionNumbers.contains(number) ? 0.07 : 0.1
  var qrBottom = adjustedPositionNumbers.contains(number) ? 0.16 : 0.19
  var firstTextBaseline = adjustedPositionNumbers.contains(number) ? 0.125 : 0.155
  var secondTextBaseline = adjustedPositionNumbers.contains(number) ? 0.1 : 0.13
  if number == 12 {
    contentX = 0.04
    qrBottom = 0.12
    firstTextBaseline = 0.1
    secondTextBaseline = 0.075
  } else if number == 15 || number == 16 {
    contentX = 0.04
    qrBottom = 0.14
    firstTextBaseline = 0.105
    secondTextBaseline = 0.08
  }
  let colorSpace = CGColorSpaceCreateDeviceRGB()
  guard let context = CGContext(
    data: nil,
    width: width,
    height: height,
    bitsPerComponent: 8,
    bytesPerRow: 0,
    space: colorSpace,
    bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
  ) else {
    throw NSError(domain: "ShareDownload", code: 2, userInfo: [NSLocalizedDescriptionKey: "无法创建图片画布"])
  }

  context.draw(posterImage, in: CGRect(x: 0, y: 0, width: width, height: height))

  let qrWidth = CGFloat(width) * 0.2
  let qrHeight = qrWidth * CGFloat(qrImage.height) / CGFloat(qrImage.width)
  context.draw(qrImage, in: CGRect(x: CGFloat(width) * contentX, y: CGFloat(height) * qrBottom, width: qrWidth, height: qrHeight))

  drawText("测测你的BP“人格”：", at: CGPoint(x: CGFloat(width) * contentX, y: CGFloat(height) * firstTextBaseline), context: context)
  drawText("进群获取链接即可开测", at: CGPoint(x: CGFloat(width) * contentX, y: CGFloat(height) * secondTextBaseline), context: context)

  guard let renderedImage = context.makeImage() else {
    throw NSError(domain: "ShareDownload", code: 3, userInfo: [NSLocalizedDescriptionKey: "无法生成海报图片"])
  }
  let outputURL = outputDirectory.appendingPathComponent("\(number).png")
  guard let destination = CGImageDestinationCreateWithURL(outputURL as CFURL, UTType.png.identifier as CFString, 1, nil) else {
    throw NSError(domain: "ShareDownload", code: 4, userInfo: [NSLocalizedDescriptionKey: "无法创建输出文件"])
  }
  CGImageDestinationAddImage(destination, renderedImage, nil)
  guard CGImageDestinationFinalize(destination) else {
    throw NSError(domain: "ShareDownload", code: 5, userInfo: [NSLocalizedDescriptionKey: "无法保存输出文件"])
  }
}

print("已生成 16 张分享海报：\(outputDirectory.path)")
