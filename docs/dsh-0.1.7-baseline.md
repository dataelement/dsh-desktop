# DSH 0.1.7 baseline for Desktop refactoring

This branch starts from `main` at `69705b2311` and pins the latest published
0.1.7 build, `0.1.7-rc.1`. npm has no plain `0.1.7` release at the time this
baseline was created. A later final release needs its own dependency and patch
review; this baseline does not assume that rc.1 and final are identical.

## Scope

- Keep `main`'s Desktop composition and business features. Do not merge the
  `v0.10.0` branch, its Workbench package, or its first-run onboarding package.
- Update the pinned Harness and Cordis dependency closure and the local PPT
  archive peer ranges. Preserve the reviewed PPT archives and integrity pins.
- Reapply the 0.1.7 compatibility patches needed by the existing Desktop
  composition. Remove Workbench-only frame, switcher, session icon slots, and
  dependencies from the copied patches.
- Convert legacy user preset directories into 0.1.7 Profile entries before
  normal-profile launch. Back up both the legacy tree and the existing Profile
  patch before writing; keep the original directories and make repeated runs
  preserve edits to migrated entries.
- Route Harness Plugin Manager package mutations through Desktop's immutable
  generation backend. Keep the existing market installer service separate.

The `v0.10.0` upgrade commit `18985b0c57` and patch audit `618c886d30` are
compatibility references. This branch owns its own dependency lockfile and
patches; future changes should be reviewed against the pinned packages here.

## Validation boundary

The clean-install gate is `npm ci`, including the full `postinstall` patch
replay. Source gates are `npm test`, `npm run typecheck`, `npm run build`, and
`git diff --check`. The preset migration test also launches a real Harness
subprocess with an isolated temporary Profile and reads its authenticated
registry and client script.

These checks do not prove an installed macOS or Windows application. Before
promoting this baseline, verify the packaged app with a separate test Profile:
normal and Safe Mode startup, client registration and UI mounting, local and
market plugin loading, legacy preset import after restart, and upgrade/rollback.
Windows junction and installer behavior need a Windows run.
