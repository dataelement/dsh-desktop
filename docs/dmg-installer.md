# macOS DMG artwork

The DMG uses a 540 × 380 background with one arrow, no installation caption, and the existing application icon. Finder draws the application and Applications shortcut; their icon size is 85 and their centers are (154, 150) and (386, 150). The arrow is 16 × 28 at (270, 150). Finder may display its own shortcut badge.

## Source and generation

- `build/dmg/install-bg.png`: supplied background, scaled proportionally to width 540 and vertically centered within the existing canvas. The source file remains intact; the canvas clips the small vertical overflow.
- `build/dmg/arrow.png`: supplied arrow, rendered once into the background.
- `scripts/render-dmg-background.swift`: AppKit renderer for the 1080 × 760 Retina representation.
- `scripts/prepare-dmg-background.cjs`: generates 540 × 380 (72 DPI) and 1080 × 760 (144 DPI) representations and combines them into `.build/dmg/background.tiff`.

The macOS `beforePack` hook prepares the artwork for release and development packaging, including direct electron-builder invocations in CI. It uses Node and the macOS build tools (`swiftc`, `sips`, `tiffutil`); no extra package dependency is required. Other platforms skip generation. Failures stop packaging rather than using stale artwork.

For artwork inspection alone, run `node scripts/prepare-dmg-background.cjs` on macOS. Normal builds continue to use the existing `npm run package:mac:arm64` or `npm run package:mac:x64` commands. A `--prepackaged` build skips the pack phase, so run the preparation command first in that case.

## Verification

Mount the generated DMG in Finder and check the canvas size, one arrow, icon positions, absence of the caption, and the Applications link. Eject previous test volumes first to avoid resolving a background alias against an older mounted copy. Check a drag installation in a disposable test environment before release.

Local design HTML, test DMGs and temporary tools are excluded from Git. The accepted visual baseline is the Finder v5 preview; custom HTML logo artwork and CSS shadows are not part of this change. Application UI, icon assets, signing, notarization, publishing and compression settings remain unchanged.
