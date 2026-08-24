# Sherlock Brand Migration Specification

## Goal

Present the desktop client consistently as **Sherlock**, with no user-visible
DeepSeek or DSH product branding.

## Requirements

- Rename production and development application display names to `Sherlock`
  and `Sherlock Dev`.
- Rename installer and update artifact filenames from the DSH brand to the
  Sherlock brand.
- Replace legacy brand copy in startup, update, recovery, model onboarding,
  preset transfer, directory/workspace errors, mobile companion pages, and the
  optional plugin-market UI.
- Brand the embedded web document title and manifest as Sherlock.
- Do not present DeepSeek as a Sherlock-owned model provider in first-run UI.
- Preserve external `@deepseek-ai/*` package names, DSH protocol keys, preset
  MIME/format identifiers, plugin package IDs, update endpoints, bundle ID, and
  existing `dsh-desktop` user-data directories where changing them would break
  upstream compatibility, updates, plugins, or existing user data.
- Add a focused regression test that distinguishes user-visible branding from
  the retained compatibility layer.
- Build the development macOS app, launch it, and verify the rendered client.

## Verification Boundary

Run only brand-focused tests plus typecheck/build/package-and-launch checks; do
not run the full unit-test suite.
