# Sherlock Research Canvas Visual Components Design

## Status

Approved for implementation on 2026-08-27. This design extends
`2026-08-26-research-canvas-workspace-design.md`; that document remains the
authority for shared conversation ownership, file selection, composer tags,
session-scoped persistence, deletion, and right-panel layout.

## Goal

Make Research canvas nodes useful as directly readable research material:

- both the normal Chat composer and the Research right-panel composer gain
  eight pixels of vertical breathing room without changing width or placement;
- assistant messages added to the canvas display their complete structured
  content and choose an initial height from that content;
- canvas nodes can be resized from their corners and keep their size across
  view changes and application restarts;
- image, PDF, and HTML files render inside titled canvas components rather than
  remaining generic file chips;
- PDF and HTML interaction stays inside the component instead of panning the
  canvas;
- local file previews do not expose arbitrary filesystem access or Electron
  application privileges to canvas content.

## Non-goals

- This work does not change the Research right-panel width, the pinned
  Conversation tab, the composer horizontal layout, or the global sidebar.
- This work does not automatically place all chat messages on the canvas.
- This work does not turn the canvas into a general unrestricted web browser.
- This work does not add editing for image, PDF, or HTML file contents.
- This work does not change the public release version or publish an update.

## Composer Height

Chat and Research move the same resident composer between two portal hosts.
The height change therefore belongs to the shared InputBar styles:

- the textarea, mirror, and decoration backdrop receive `padding-bottom: 8px`;
- the hero mirror minimum height changes from 52 px to 60 px;
- width, max-width, horizontal padding, portal placement, bottom anchoring, and
  responsive rules are unchanged;
- the three text layers keep identical padding so the caret, text, and inline
  file tags remain aligned.

The existing composer height observer remains the source of the surrounding
layout's bottom inset. No separate Research height constant is introduced.

## Unified Visual Node Model

File nodes and assistant-artifact nodes gain compatible optional sizing data:

```ts
type ResearchCanvasNodeSize = {
  width?: number
  height?: number
  sizeMode?: 'auto' | 'manual'
  aspectRatio?: number
}
```

Existing stored nodes without these fields remain valid. Normalization derives
type-specific defaults and rejects non-finite, negative, or unreasonably large
values. The persisted fields remain JSON-safe and subject to the existing
session-scoped storage limits.

The canvas keeps `x` and `y` as the node center in world coordinates. Selection
geometry, marquee intersection, group movement, and drop placement use each
node's normalized width and height instead of the former fixed 220 x 64 box.

## Component Frame and Resize Interaction

Every rich node uses a shared frame:

1. a title bar displaying the filename or assistant-artifact title;
2. a content body appropriate to the node type;
3. four corner resize handles visible for the active selection;
4. the existing theme-aware selected, focused, and drag states.

Interaction priority becomes:

1. Space-drag pans the canvas;
2. a corner handle resizes its node;
3. the title bar or non-interactive card surface moves the selected node group;
4. a blank-canvas drag creates a marquee;
5. interactive preview content owns its click and wheel events.

Pointer deltas are divided by the current canvas scale. The opposite corner is
kept fixed while resizing. Width and height are clamped by node-type minimums
and a generous canvas maximum. The in-memory size updates while dragging and is
persisted once on pointer-up, cancellation, window blur, or component cleanup.

Image and PDF frames preserve their content aspect ratio. Assistant and HTML
frames resize freely in both axes. An iframe interaction shield appears while a
canvas move or resize is active so embedded content cannot steal the pointer.

## Assistant Message Components

The one-click `添加到画布` action remains explicit and message-id deduplicated.
The saved artifact preserves line breaks and the complete bounded message text;
it is no longer normalized into a single-line excerpt.

Initial behavior:

- default width is 360 px;
- `sizeMode: auto` renders the existing Markdown presentation and measures the
  complete body with `ResizeObserver`;
- the frame grows to the measured content height, so the entire response is
  visible on first placement;
- the measured width and height participate immediately in marquee selection.

The first user resize changes the node to `sizeMode: manual`. If the user makes
the component smaller than its content, only the body scrolls; the title bar
and handles remain visible and the complete text remains accessible.

## Image Components

Files identified as supported raster images or SVG render as:

- a fixed-height filename title bar;
- an image body using `object-fit: contain`;
- an initial width of 320 px and a height derived from the natural image ratio;
- aspect-ratio-preserving corner resizing, with the title bar added outside the
  image body's ratio calculation;
- a loading placeholder and a compact unavailable state for moved, deleted, or
  unreadable files.

The natural ratio is normalized into `aspectRatio` after a successful load so
the component retains its geometry across restarts without loading the whole
file just to lay out the canvas.

## PDF Components

PDF nodes initialize as a titled single-page frame. A pinned `pdfjs-dist`
dependency renders one page at a time to canvas so Sherlock controls the page
ratio and wheel behavior consistently rather than relying on Chromium's full
PDF toolbar.

- the first page supplies the initial content aspect ratio;
- the title bar includes a compact `current / total` page indicator;
- vertical wheel gestures inside the PDF body switch one page per threshold,
  with throttling to prevent trackpad bursts;
- the PDF handler stops propagation so the same wheel does not pan or zoom the
  Research canvas;
- page rendering is cancelled and restarted when the visible page or component
  size changes;
- only visible or near-visible PDF nodes keep an active renderer.

The component remains proportionally resizable. Missing, malformed, encrypted,
or unsupported PDFs show a local error state without affecting the canvas.

## HTML Components

HTML nodes render in a titled sandboxed iframe. The frame is freely resizable
and internally scrollable. Its initial size is 480 x 360 px.

The iframe may execute scripts only after the following application hardening is
in place:

- preload bridges and sidebar update controls are exposed only when
  `process.isMainFrame` is true;
- every privileged IPC used by those bridges validates that its sender is the
  main frame of a trusted application window;
- frame navigation is checked with `will-frame-navigate` as well as existing
  main-frame navigation controls;
- the iframe omits `allow-same-origin`, forms, popups, downloads, and top-level
  navigation permissions;
- the preview response sets a strict CSP that blocks network connections,
  embedding, forms, base-URL replacement, and access outside the preview
  capability.

If the hardening gate cannot be proven by focused tests, scripts remain disabled
with `script-src 'none'`; static HTML rendering is never blocked on unsafe
script execution.

## Local Preview Capability

The main process registers a standard, secure, fetch-compatible read-only
`sherlock-preview://` protocol before application ready. It is intentionally not
added to the set of trusted top-level application URLs.

Preview URLs contain a random opaque capability token, never an absolute path.
The main process issues a token only while admitting a real Finder `File` or a
workspace-fenced Sherlock sidebar file to the active Research canvas session.
It stores durable authorization metadata in a main-process-owned preview
registry, separate from the renderer-writable canvas JSON. Restart recovery
reissues ephemeral tokens from that registry, never from a renderer-supplied
absolute path.

For every request the preview service:

- resolves both the allowed root and requested target with `realpath`;
- rejects traversal and symlink escape;
- confirms the target is a regular file;
- applies a supported MIME allowlist and `X-Content-Type-Options: nosniff`;
- supports byte ranges for PDF and other streamed media;
- confines HTML relative assets to the token's real directory;
- applies the HTML sandbox CSP to the root document and local subresources;
- returns 403/404 for invalid, expired, missing, or unauthorized targets.

The preload API exposes two narrow admission paths: one accepts a real `File`
and resolves it internally with `webUtils.getPathForFile`; the other accepts a
sidebar file identity that the main process resolves within the active session
workspace. It does not expose `read(path)`, arbitrary file contents, or
permanent tokens. Removing a node or its session revokes associated preview
capabilities.

## Wheel and Pointer Ownership

The existing canvas wheel handler continues to pan the background and to zoom on
Command-wheel. It ignores wheel events owned by marked preview-scroll regions.
PDF page switching, assistant-body scrolling, and HTML iframe scrolling do not
move the canvas. Space-pan remains available by activating the iframe shield
before the pointer operation begins.

## Performance and Lifecycle

- Rich media mounts only for nodes intersecting an expanded viewport margin;
  offscreen nodes keep a lightweight titled placeholder.
- Object URLs, PDF render tasks, iframe loads, and protocol tokens are released
  when a node is removed, a session changes, or the workspace unmounts.
- File bytes are never copied into Research canvas JSON.
- Preview loading never blocks pointer movement, marquee selection, or canvas
  persistence.

## Failure Behavior

- Generic and unsupported files keep the existing compact file card.
- A missing preview source keeps the node, title, selection, resize, and delete
  behavior, while its body shows an unavailable message.
- Preview errors do not remove composer attachments or mutate the source file.
- Old sessions with invalid size fields fall back to defaults and are repaired
  on the next successful persistence write.

## Focused Verification

Automated tests must cover:

- the shared composer gains exactly eight vertical pixels without a width or
  portal-ownership change;
- old and new node shapes normalize safely and persist their sizes;
- marquee geometry uses actual node dimensions at non-1.0 zoom;
- resize math, min/max clamping, opposite-corner anchoring, persistence, and
  image/PDF aspect locks;
- full assistant Markdown and line breaks survive add, reload, auto height, and
  manual resizing;
- image natural ratio and title rendering;
- PDF page ratio, page count, wheel threshold, cancellation, and canvas-wheel
  isolation;
- HTML iframe sandbox and CSP, main-frame-only preload exposure, privileged IPC
  sender checks, navigation blocking, traversal, and symlink escape;
- capability expiry, missing files, MIME rejection, range responses, and node
  deletion;
- existing Finder and right-panel drag sources, selection/tag ordering, keyboard
  and context-menu deletion, view switching, and session persistence.

Final validation follows `docs/sherlock-local-test-runbook.md` via
`./script/build_and_run.sh --verify`. The real locally built Sherlock window must
remain open and be exercised at desktop and narrow right-panel widths with:

1. a tagged single-line and multiline composer in Chat and Research;
2. a long assistant response added to the canvas and resized;
3. Finder and right-panel image drops with proportional resize;
4. a multi-page PDF changed by wheel without canvas movement;
5. a local HTML file scrolled and interacted with inside the sandbox;
6. selection, multi-move, deletion, session switching, and application restart.

No full test suite, version bump, notarization, upload, source push, or public
update-feed change belongs to this local development task.
