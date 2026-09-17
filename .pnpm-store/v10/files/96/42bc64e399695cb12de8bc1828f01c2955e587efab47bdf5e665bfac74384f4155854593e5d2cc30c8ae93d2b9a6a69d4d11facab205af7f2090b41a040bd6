/**
 * Host icon extraction for resolved open-in-app applications, one strategy
 * per platform: macOS converts the resolved bundle's `.icns` to a 128px PNG
 * (`plutil` + `sips`); Windows extracts the resolved executable's associated
 * icon as a 32px PNG through a generated PowerShell script (the largest size
 * `ExtractAssociatedIcon` yields without a native addon); Linux follows the
 * spec's desktop entry `Icon=` key into the hicolor theme and pixmaps
 * directories (PNG or SVG, no subprocess). Every failure resolves null and
 * the icon route answers 404, which the browser renders as a generic glyph.
 */
import type { OpenInAppApp } from './catalog.ts';
import { type OpenInAppInternals, type OpenInAppResolvedLaunch } from './resolver.ts';
/** One extracted icon: raw bytes plus the media type the route serves. */
export interface OpenInAppIcon {
    readonly bytes: Buffer;
    readonly contentType: 'image/png' | 'image/svg+xml';
}
/**
 * Extract one resolved application's icon on this host.
 * @param app - catalog entry (its Linux spec names the desktop entry).
 * @param resolved - the entry's verified launch (its icon source on macOS/Windows).
 * @param timeoutMs - per-command deadline for extraction host commands.
 * @param internals - platform and runner hooks for deterministic tests.
 * @returns the icon bytes and media type, or null when this host serves none.
 */
export declare function extractAppIcon(app: OpenInAppApp, resolved: OpenInAppResolvedLaunch, timeoutMs: number, internals?: OpenInAppInternals): Promise<OpenInAppIcon | null>;
//# sourceMappingURL=icons.d.ts.map