# Bundled editable PPT templates

This workflow adds a reusable built-in PPT template as an editable PPTD project. It preserves page structure, local assets and declarative image slots. The runtime copies the selected project into the active workspace through the existing policy and mutation audit before content is changed.

## Project contract

Create one directory at `packages/ppt-runtime/core/lib/bundled-template-projects/dsh-<name>/` containing:

- `template.json`: stable catalog identity, display metadata, palette and one to three local JPEG preview paths.
- `deck.pptd`: PPTD v2 manifest. `template.id` and `template.name` match `template.json`.
- `pages/*.page`: editable pages referenced by `deck.pptd` in display order.
- `assets/*` or `media/*`: local project assets and their provenance record.
- `previews/*.jpg`: reviewed 16:9 gallery images rendered from the current project.

Pages that can use generated or supplied images carry `dsh.template-images/v1` JSON in `notes`. Every slot binds an image element to its content sources, subject, composition, aspect ratio, reuse group and optional native masks. Host policy, provider selection and credentials remain outside the template.

## Add and verify

1. Validate the source project with `node packages/ppt-runtime/core/lib/bin.js check <project-directory> --json`.
2. Inspect the cover, a dense content page and a data or closing page. Save one to three reviewed JPEGs under `previews/` and list them in `template.json`.
3. Run `npm run ppt:bundled-projects`. The generator derives `slideCount` and `pageIndex`, validates paths and file limits, embeds previews and writes the SHA-256 allowlist to `manifest.json`.
4. Run `node scripts/build-ppt-runtime.mjs --reuse-previews`. Refresh the two package integrity fields in `package-lock.json` from `packages/ppt-runtime/artifacts.json`.
5. Extract the built core archive and run `DSH_PPT_RUNTIME_ROOT=<extracted-runtime> node scripts/verify-bundled-ppt-template.mjs`. Run the focused image-contract and personal-template regression tests.

Automated checks establish source validity, packaged catalog visibility, editable copying, image-contract bindings, workspace confinement and audit records. A real Desktop session with its configured image provider and a PowerPoint/WPS open-edit-save-reopen pass remain separate acceptance gates.
