# Sherlock Cloudflare Updates Specification

## Goal

Ship the current Sherlock development source as a production desktop application
and let installed copies discover, download, and install future releases from a
small update control in the lower-right corner of the left sidebar.

The release must not depend on Apple Developer ID, Apple notarization, or the
Mac App Store.

## Product Behavior

- Keep the production identity `io.dsh.desktop`, product name `Sherlock`, and
  historical `dsh-desktop` user-data directory so an update preserves existing
  workspaces, sessions, settings, credentials, and installed plugins.
- Keep `Sherlock Dev` isolated under its existing development application ID and
  user-data directory.
- Check for a new stable version shortly after startup, every six hours while
  running, after resume when the interval has elapsed, and through the existing
  manual menu command.
- Show no sidebar update control while the app is current, while a background
  check is idle, or after a transient check failure.
- When a newer version is available, mount a blue circular button at the right
  side of `[data-dsh-sidebar-footer]`. Its initial icon is a download arrow.
- Clicking the available button starts the download. While downloading, keep the
  control visible and render determinate progress. When ready, change the action
  to restart and install, with a compact confirmation surface before quitting.
- Keep error details user-readable and retryable without blocking normal app use.
- Do not bundle any development user data, local workspaces, conversations, API
  credentials, or private plugin profiles into the production artifact. Only
  source-controlled application code and declared bundled resources are shipped.

## Update Architecture

- Continue using `electron-updater` with its generic provider and the existing
  Electron/Squirrel.Mac installation path.
- Configure `autoDownload = false`. Automatic checks only discover a release;
  the visible sidebar button is the user's explicit download action.
- Add an `updates:download` IPC handler and represent download/install phases in
  the existing shared `UpdateStatus` state machine.
- Move the update presentation from the current global lower-right notification
  card into a sidebar control plus a compact anchored status/confirmation panel.
- Treat the preload as an adapter to the embedded Harness DOM. Pure decisions
  about visibility, labels, icons, and actions remain testable outside Electron.

## Non-Apple Signing

Electron's macOS updater requires the running and replacement applications to be
code-signed. To satisfy that requirement without Apple services, production
builds use one long-lived self-signed Sherlock code-signing identity.

- The certificate public identity may be inspected in built artifacts; its
  private key must never enter the repository, logs, release assets, or app.
- Store the encrypted signing material only in the release environment's secret
  store and import it into a temporary keychain for packaging.
- Sign every production macOS build with the same identity so Squirrel.Mac can
  validate the replacement against the installed application's designated
  requirement.
- Verify the app and every nested executable with `codesign --verify --deep
  --strict`. Do not claim Gatekeeper or notarization approval.
- Because the identity is not rooted in Apple's trust chain, the initial install
  documentation must tell the user to right-click Sherlock and choose Open once.
  Subsequent in-app updates use the same application identity and signature.

## Cloudflare Distribution

- Use a private Cloudflare R2 bucket as the primary release store and serve it
  through the existing `dshdesktop.com` Cloudflare zone.
- Store immutable artifacts under `releases/v<version>/`.
- Expose the active updater payloads under `updates/latest/`, including
  `latest-mac.yml`, ZIP payloads, and blockmaps.
- Expose the human installer through a stable `/download/` route.
- Upload and verify all immutable binaries before promoting the `latest`
  metadata. A failed upload must leave the prior release active.
- Serve metadata with revalidation/no-cache behavior and immutable binaries with
  long-lived cache headers. Support byte ranges and correct content types.
- Keep the GitHub Release and current ModelScope mirror as recovery copies, but
  installed applications use Cloudflare as their primary provider.
- The first Sherlock-branded production release is `0.6.0`, because the public
  update feed currently advertises `0.5.0` and updaters reject lower versions.

## Release Workflow

1. Capture the current development source in a release commit while excluding
   generated artifacts, screenshots, temporary browser state, and private data.
2. Run focused updater, release-contract, branding, bundled-resource, typecheck,
   build, and packaged-runtime checks. Do not run the full unit-test suite.
3. Build production artifacts with the production identity and self-signed
   release certificate.
4. Verify bundle structure, nested signatures, artifact hashes, and update
   metadata before upload.
5. Upload versioned artifacts to R2, verify them from the public Cloudflare URL,
   and only then promote the `latest` metadata and stable download route.
6. Launch the installed production app and verify the actual sidebar state.
7. Exercise an update from an older signed fixture to `0.6.0`: detect, show the
   button, download, restart/install, confirm the displayed version, and confirm
   the fixture's user data remains present.

## Failure Handling

- Network or metadata failure: leave the button hidden for automatic checks;
  show a retryable message only after an explicit manual check/action.
- Hash, signature, or ZIP validation failure: abort installation, retain the
  running version, and show an error. Never replace the app with an unverified
  payload.
- Cloudflare promotion failure: retain the previous `latest` manifest.
- Non-writable installation location or Squirrel replacement failure: preserve
  the downloaded DMG and offer to open it for manual replacement.
- Missing release or Cloudflare credentials: finish and verify all local work,
  then stop only at the external authentication gate without requesting or
  printing secret material.

## Verification Boundary

Completion requires evidence from the source, focused automated tests, the
production package, public Cloudflare responses, and the installed user-visible
update path. A successful build or HTTP 200 alone is insufficient.
