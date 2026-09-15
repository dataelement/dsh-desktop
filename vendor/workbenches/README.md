# Reviewed local workbench artifacts

These tarballs are the built, locally reviewed adapters of the two internal dataelement workbenches. `catalog.json` records their package version, checksum and source commit. The source commits currently exist on local `feat/workbench-original-adapter` branches; they have not been pushed to dataelement and are not public releases.

Desktop installs the artifacts through root file dependencies and exposes their descriptors in the local workbench market. Add/Open remains a user action. The entire provider must be retested and its checksum and lockfile updated when replacing an artifact. Validate the unpacked package with `node scripts/check-workbench-package.mjs <directory>` before inclusion. Do not use an unbuilt source tree in place of the reviewed tarball.

- ming-life: MIT; original author liqingb0220-stack; local profile storage and native draft bridge.
- dsh-site-selection: MIT code; see packaged DATA-LICENSE.md for bundled geographic data; sample commercial data includes synthetic entries as identified in the UI and source.

The current 1.2.0 adapters start from fresh upstream source checkouts and preserve business-triggered workspace/session creation. Older 1.1.x tarballs are retained only as local historical artifacts; catalog.json and root dependencies select the active version.

The catalog also includes dsh-media-workbench@0.12.1, adapted from the local content-operations project. Its custom four-window dock and explicit scoped-session workflow are retained, while its custom frame is contained within the Desktop main-content boundary. Runtime business data and browser login profiles are excluded from the tarball.
