# Sherlock Research Canvas Preview Expansion Design

## Status

Approved for implementation on 2026-08-28. This document extends and, where
explicitly stated, supersedes
`2026-08-27-research-canvas-visual-components-design.md`. Existing contracts
for the shared Chat/Research composer, session-scoped canvas state, selection,
dragging, resizing, deletion, and capability-based local-file authorization
remain authoritative.

## Goals

- Make an HTML component behave like an isolated browser view: its authorized
  local project resources load, its controls work, and its normal web API
  requests can run.
- Replace PDF wheel-to-page stepping with continuous, freely scrollable pages.
- Preview the same user-facing file families advertised by the Files sidebar:
  images, PDF, Markdown, HTML, DOCX, XLSX, PPTX, and text/code.
- Let users rename a canvas component without renaming the source file and keep
  selected composer references in sync with the display name.
- Persist each conversation's selected model across app restarts and session
  switching.
- Keep every right-panel composer menu above the conversation flow so message
  cards cannot cover slash-command or model/permission popups.

## Non-goals and Regression Shields

- Do not change composer width, horizontal padding, portal ownership, bottom
  anchoring, loading animation, global sidebar, or right-panel width.
- Do not rename or mutate source files.
- Do not add legacy binary Office preview for `.doc`, `.xls`, or `.ppt`.
- Do not expose Node, Electron, preload bridges, arbitrary local paths, or
  top-level Sherlock navigation to embedded documents.
- Do not silently substitute a different model when a conversation's saved
  provider is genuinely unavailable.
- Do not publish, notarize, change version 0.7.3, or update public feeds.

## HTML Browser Component

The existing `sherlock-preview://` capability remains the only way a local HTML
document and its sibling files reach the renderer. A capability token is the
host part of a dedicated origin, so separate authorized roots do not share an
origin. Relative paths are resolved through the authorization's realpath-fenced
root; absolute filesystem paths and symlink escape remain rejected.

The iframe uses an isolated renderer with `contextIsolation`, Chromium sandbox,
and no preload or Node integration. It gains only the browser capabilities that
the content needs: scripts, same-origin access inside its capability root, and
forms. Popups, downloads, top-level navigation, Electron schemes, `file:`, and
unapproved local paths stay blocked.

The preview CSP allows:

- authorized same-origin CSS, classic/module JavaScript, JSON, images, fonts,
  media, source maps, and WebAssembly with correct MIME types;
- browser-governed `http:`, `https:`, `ws:`, and `wss:` connections and assets;
- inline styles required by ordinary exported HTML, while keeping application
  privileges unavailable.

Remote requests remain subject to normal Chromium CORS and mixed-content rules.
Network access does not grant filesystem access. External top-level links open
through the existing safe external-navigation path rather than replacing the
Sherlock window.

The canvas move/resize shield stays inactive during normal preview use and is
enabled only while the user pans or transforms the canvas. Pointer, keyboard,
form, scroll, and script interaction therefore work inside the component.

## Continuous PDF Viewer

PDF.js renders a vertical page stream inside the component body. The body owns
normal wheel and trackpad scrolling and uses `overscroll-behavior: contain` so
the same gesture does not move the Research canvas.

Pages near the viewport render to independent canvases; distant pages keep
aspect-ratio placeholders. Intersection-driven rendering, cancellation, pixel
limits, and document cleanup prevent large PDFs from retaining every bitmap.
Resizing changes the page width and schedules visible pages again. The title bar
shows filename and compact document/page progress, but no wheel threshold or
one-page stepping remains.

## File Preview Families

Lightweight previews remain native to the Research canvas bundle:

- image: PNG, JPEG, GIF, WebP, SVG, BMP, ICO, and AVIF;
- PDF: continuous PDF.js viewer;
- Markdown: read-only rendered Markdown with source-safe links;
- HTML: sandboxed browser component;
- text/code: bounded UTF-8 read-only viewer with filename-derived language and
  a binary/unavailable fallback.

Office previews reuse the installed Better Sidebar Office plugin engines rather
than duplicating their large dependencies:

- DOCX through `docx-preview`;
- XLSX through SheetJS and Univer;
- PPTX through the existing PPT renderer.

The Office plugin exposes a narrow shared preview adapter that accepts a
capability URL, media kind, mount target, and abort signal. It never accepts an
absolute renderer-supplied path. OOXML inputs are checked as ZIP containers and
bounded by source size, entry count, and expanded-size limits. Viewers mount
only near the canvas viewport and dispose their runtime on unmount.

Unsupported or malformed content keeps the titled component with a compact
unavailable state; it never removes the node or changes the source file.

## Component Display Names

File nodes gain optional `displayName`; the immutable `name` remains the source
basename. Artifact nodes continue to use their title. Normalization trims the
display name, applies a bounded length, rejects control characters, and removes
the override when the value equals the source name or is empty.

Right-clicking the title bar offers `修改名称` and the existing canvas-only
delete command. Rename uses an inline title editor with Enter to save, Escape to
cancel, and blur to save. It persists through the existing session-scoped
Research workspace state.

Composer references use `displayName ?? name`. Reference reconciliation updates
the label, clipboard text, and outgoing reference metadata of an already
inserted occurrence with the same canvas node id while preserving its position,
selection state, and surrounding typed text. Renaming never adds a duplicate
tag and never renames the source file.

## Durable Conversation Model Selection

The current host keeps an explicit selection only in a process-local map, so a
restart can fall through to a historical request or to a disabled base default.
Add a durable, bounded session-selection store in the Host model-routing layer.

Resolution order becomes:

1. live selection made in the current Host process;
2. durable selection for this conversation/session;
3. the latest actual request header for the conversation;
4. a configured and currently routable user default.

`selectModel` writes the session selection durably before reporting success.
Selections are isolated by session and provider/model/reasoning tuple. A global
default change must not overwrite an existing session selection. If the saved
provider is no longer registered, the model directory remains explicitly
blocked and guides the user to configure or choose a model; Sherlock must not
guess or silently switch providers. The disabled DeepSeek base default is not
treated as a valid fallback.

The formal and development app identities continue using their separate data
roots; this change guarantees persistence within one identity and does not
merge those roots.

## Right-panel Composer Overlay Stacking

The shared composer continues moving as one resident DOM subtree between Chat
and Research. In the Research right panel, its overlay anchor and sticky seat
must form a stacking layer above the message viewport. Slash-command,
model/reasoning, access-mode, and other composer menus therefore paint above
message bubbles and message action tooltips.

The fix belongs to the Research host stacking and clipping boundary, not to an
individual menu's size or copy. The menu remains constrained to the right-panel
width and scrollable at its existing maximum height. The change must not move
the composer, change its width/height, cover the tab bar, or allow the message
flow to paint over the input while no menu is open.

## Focused Verification

Automated coverage must prove:

- HTML local CSS/JS/module/JSON/font/media loading, remote fetch, form/control
  interaction, iframe pointer ownership, origin isolation, traversal and IPC
  rejection;
- continuous multi-page PDF scrolling, visible-page rendering, cancellation,
  resizing, cleanup, and canvas-wheel isolation;
- image/Markdown/text and DOCX/XLSX/PPTX routing, lifecycle, OOXML limits, and
  unsupported fallbacks;
- rename persistence and exact in-place composer reference reconciliation;
- per-session model selection across simulated Host restart, independent
  sessions, last-request fallback, unavailable-provider behavior, and invalid
  default rejection;
- right-panel slash-command and model/access menus covering message cards at
  narrow and normal widths without clipping or changing composer geometry;
- unchanged composer width/position, shared DOM ownership, loading animation,
  global sidebar, and existing drag/select/delete behavior.

Final acceptance follows `docs/sherlock-local-test-runbook.md` with
`./script/build_and_run.sh --verify`, package verification, and interaction in
the real Sherlock window. The app remains open for user testing.
