import AppKit

guard CommandLine.arguments.count == 3 else {
  fatalError("Usage: render-dmg-background <asset-directory> <output.png>")
}
let source = URL(fileURLWithPath: CommandLine.arguments[1])
let destination = URL(fileURLWithPath: CommandLine.arguments[2])
let backgroundData = try Data(contentsOf: source.appendingPathComponent("install-bg.png"))
guard let background = NSImage(contentsOf: source.appendingPathComponent("install-bg.png")),
      let arrow = NSImage(contentsOf: source.appendingPathComponent("arrow.png")),
      let backgroundPixels = NSBitmapImageRep(data: backgroundData),
      let bitmap = NSBitmapImageRep(
        bitmapDataPlanes: nil, pixelsWide: 1080, pixelsHigh: 760,
        bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true,
        isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0
      ) else {
  fatalError("Unable to load DMG artwork or create the rendering context")
}

bitmap.size = NSSize(width: 540, height: 380)
guard let context = NSGraphicsContext(bitmapImageRep: bitmap) else {
  fatalError("Unable to create the DMG rendering context")
}
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = context
NSColor.white.setFill()
NSRect(x: 0, y: 0, width: 540, height: 380).fill()
let height = 540 * CGFloat(backgroundPixels.pixelsHigh) / CGFloat(backgroundPixels.pixelsWide)
background.draw(in: NSRect(x: 0, y: (380 - height) / 2, width: 540, height: height))
// AppKit uses a bottom-left origin; Finder's icon coordinates use a top-left origin.
arrow.draw(in: NSRect(x: 262, y: 380 - 150 - 14, width: 16, height: 28))
NSGraphicsContext.restoreGraphicsState()

guard let png = bitmap.representation(using: .png, properties: [:]) else {
  fatalError("Unable to encode DMG artwork")
}
try png.write(to: destination)
