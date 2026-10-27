# Browser annotations (optional plugin)

An opt-in browser beside a DSH conversation: search or enter a URL, browse in native right-sidebar tabs, select an element or drag a region, and write an anchored comment. Hold Space to interact with the page; release it to continue annotating.

Saved comments appear above the composer as an annotation chip. Its non-modal popover shows the selection screenshots and comments, with element details collapsed. Submission combines the composer draft, existing attachments, JPEG image blocks and matching element/comment metadata in one admission. A readable annotation card projects sent messages without changing the durable model payload. Missing screenshots block sending. Transport retries reuse the request ID; an explicit admission rejection permits a fresh packet after repairing attachments. Concurrent edits remain pending. Inline file/session references use their native owner codec and fail without consuming the draft when that owner is unavailable. Claimed slash commands remain with the native input flow.

This package is **not installed or enabled by default**, and does not add a second Agent runtime. Session chat/mail plugins, local profiles, screenshots and user records are outside this contribution.

## Build and test

From the repository root:

```sh
npm --prefix packages/dsh-page-review ci
npm --prefix packages/dsh-page-review run build
npm --prefix packages/dsh-page-review test
npm pack ./packages/dsh-page-review --dry-run
```

The package owns its pinned build/test dependencies and lockfile. `prepack` builds a self-contained CommonJS backend and the client registration wrapper. Private Puppeteer dependencies are bundled with `lib/THIRD_PARTY_LICENSES.txt`; React stays external and is supplied by the host. The extracted archive can launch its backend without installing development dependencies. `lib/`, installed dependencies, local backups and archives are generated and ignored; only `src/` is maintained. The dedicated CI workflow tests the optional distribution separately from the desktop application's default dependency closure.

## Try in a development profile

Use a separate profile with the composer marker provided by this PR. After building:

```sh
DSH_REVIEW_PROFILE=/path/to/test/harness/profiles/web \
  node packages/dsh-page-review/install-local.mjs
```

Restart the development Harness, then choose **+ → Browser** in the right sidebar. The host owns its sidebar keyboard shortcuts; the plugin does not override them. The generic new-tab chooser remains available. Native Markdown links use the conventional `browser` tab entry; the plugin does not install a document-wide link interceptor.

To unregister an unmigrated development link from that same test profile while keeping annotation data:

```sh
DSH_REVIEW_PROFILE=/path/to/test/harness/profiles/web \
  node packages/dsh-page-review/install-local.mjs --remove
```

The installer changes only this package's `link:` dependency, bundle selection and own symlink, backs up the profile manifest locally, and refuses an occupied link. Do not commit those backups. Once Desktop migrates the link to an immutable generation, use Desktop's plugin manager to update, disable or remove it; this development helper deliberately refuses replacing a managed generation link.

## Compatibility seam and review boundary

The incoming implementation was exercised in Desktop 0.12.0 / Harness 0.2.0-rc.2. Version 0.4.2 targets the repository's pinned Harness 0.2.1-rc.2. See the current-main validation record in [the validation record](../../docs/browser-annotations-validation.md) for observed desktop behavior and validation limits; validation of the incoming prototype is not a substitute for that record.

The only host patch addition is `data-dsh-composer-primary="send" | "stop"` on the existing primary button. It changes no slot, handler, permission or default rendering. `src/composer-compat.mjs` observes that marker and editor availability, rather than translated labels or generated class names. With pending annotations, the plugin presents its submit control at the send seat; while Stop is primary, its action stays visible and annotation submission is inline. Without the marker, submission is disabled. Native Enter interception is limited to an editable composer with pending annotations, plain input phase and available submission. This adapter is intentionally documented coupling, pending a native submission-extension API; remove it and the marker patch when that API exists.

The native sidebar tab/body/title, conversation accessory and chat-node slots are registered with Cordis effects. Chinese and English UI copy uses the Harness locale service, and CSS uses host semantic tokens. A disabled/uninstalled plugin leaves the native composer and ordinary message rendering intact.

**Document-preview UI is deliberately not registered here:** current main does not expose the legacy file-preview action/DOM contract used by the local PDF/Word/Markdown prototype. Its packet/location validation helpers remain tested, but this PR claims browser annotations only. File preview integration needs its own reviewed provider seam.

## Browser, data and limitations

Uses `puppeteer-core` and a locally installed Chrome/Edge/Chromium, without downloading another browser. The headless browser has a dedicated profile under `$DSH_HOME/page-review/browser-profile`; it does not borrow the system browser's logged-in profile. The screenshot-frame surface supports clicking, scrolling, text/keyboard input, search, back/forward and popup tabs. It has lower frame rate than a native browser; upload/download management, video and system authentication dialogs are outside the current scope.

Annotation metadata and JPEG captures persist under `$DSH_HOME/page-review/sessions/<session-id>/`. The model receives real image blocks plus URL, selection coordinates, selector/DOM/style evidence and the user's comment. Form values and sensitive attributes are stripped by the inspector, but a screenshot can still contain private visible page content: inspect the annotation popover before sending. All routes require loopback, same-origin requests, reject forwarded/cross-site requests and bound request bodies. Node/browser process access is privileged host code, not a renderer sandbox escape.

Limits: 12 tabs per session, 40 pending annotations, and at most 12 images / 12 MB per submission. A successful admission means DSH received the packet, not that the chosen model successfully processed its images. Windows/Linux desktop interaction remains a release-validation item; local macOS evidence is recorded separately.
